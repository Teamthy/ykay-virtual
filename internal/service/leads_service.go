package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/mail"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/leads"

	"github.com/google/uuid"
)

// LeadService — conversion follow-up funnel. Browsing visitors who don't
// enroll (callback requests, exit-intent captures, enrollments that stop
// before payment) become leads; the ops team is pinged on WhatsApp so they
// can follow up while intent is hot.
type LeadService struct {
	repo     leads.Repository
	notifier *NotifierService
	users    identity.UserRepository
	audit    identity.AuditService
	now      func() time.Time
}

// dedupeWindow — repeat captures for the same person+intent+source inside
// this window reuse the existing NEW lead instead of spamming the channel.
const dedupeWindow = 24 * time.Hour

// conversionWindow — an enrollment-started lead is still attributable to a
// later payment within this window.
const conversionWindow = 30 * 24 * time.Hour

func NewLeadService(repo leads.Repository, notifier *NotifierService, users identity.UserRepository, audit identity.AuditService) *LeadService {
	return &LeadService{repo: repo, notifier: notifier, users: users, audit: audit, now: time.Now}
}

// CaptureLeadInput — public lead form (name + phone required; email optional).
type CaptureLeadInput struct {
	Name        string     `json:"name"`
	Email       string     `json:"email"`
	Phone       string     `json:"phone"`
	Source      string     `json:"source"`
	Intent      string     `json:"intent"`
	Message     *string    `json:"message,omitempty"`
	CohortID    *uuid.UUID `json:"cohort_id,omitempty"`
	ProgrammeID *uuid.UUID `json:"programme_id,omitempty"`
	UserID      *uuid.UUID `json:"-"`
}

// Capture validates, dedupes and stores a lead, then WhatsApps the admin
// number. It never returns 4xx on duplicate-ish input: repeat submissions
// simply reuse the existing NEW lead (anti-spam + idempotent UX).
func (s *LeadService) Capture(ctx context.Context, in CaptureLeadInput) (*leads.Lead, error) {
	if s.repo == nil {
		return nil, errors.New("lead store unavailable")
	}
	in.Name = strings.TrimSpace(in.Name)
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	in.Phone = strings.TrimSpace(in.Phone)
	if in.Name == "" || len(in.Name) > 255 {
		return nil, fmt.Errorf("%w: name is required (max 255 chars)", domain.ErrInvalidInput)
	}
	if in.Phone == "" || len(in.Phone) > 40 {
		return nil, fmt.Errorf("%w: a valid phone number is required so we can reach you", domain.ErrInvalidInput)
	}
	if in.Email != "" {
		if _, err := mail.ParseAddress(in.Email); err != nil || len(in.Email) > 255 {
			return nil, fmt.Errorf("%w: email address is not valid", domain.ErrInvalidInput)
		}
	}
	if in.Intent == "" {
		in.Intent = leads.IntentCallbackRequest
	}
	switch in.Intent {
	case leads.IntentCallbackRequest, leads.IntentGeneralInterest:
	default:
		in.Intent = leads.IntentGeneralInterest
	}
	if strings.TrimSpace(in.Source) == "" {
		in.Source = "website"
	}
	if len(in.Source) > 255 {
		in.Source = in.Source[:255]
	}

	// Dedupe: same person, same intent + source within the window → reuse.
	var emailPtr, phonePtr *string
	if in.Email != "" {
		emailPtr = &in.Email
	}
	if in.Phone != "" {
		phonePtr = &in.Phone
	}
	existing, err := s.repo.FindRecentOpen(ctx, in.Intent, in.Source, in.UserID, in.CohortID, emailPtr, phonePtr, s.now().UTC().Add(-dedupeWindow))
	if err == nil && existing != nil {
		return existing, nil
	}

	l := &leads.Lead{
		Name:        in.Name,
		Phone:       strOrNil(in.Phone),
		Email:       strOrNil(in.Email),
		Source:      in.Source,
		Intent:      in.Intent,
		Message:     trimMsg(in.Message),
		CohortID:    in.CohortID,
		ProgrammeID: in.ProgrammeID,
		UserID:      in.UserID,
		Status:      leads.StatusNew,
	}
	if err := s.repo.Create(ctx, l); err != nil {
		return nil, err
	}

	s.notifyAdmin(l, "lead captured")
	return l, nil
}

// CaptureEnrollmentStarted — called after a cohort booking is created (order
// PENDING): if the parent never pays, the ops team gets a lead to chase.
// Idempotent per (user, cohort, source) thanks to the dedupe window.
func (s *LeadService) CaptureEnrollmentStarted(ctx context.Context, userID, cohortID uuid.UUID, cohortTitle, source string) {
	if s.repo == nil {
		return
	}
	if source == "" {
		source = "cohort-enrollment"
	}
	since := s.now().UTC().Add(-dedupeWindow)
	if _, err := s.repo.FindRecentOpen(ctx, leads.IntentEnrollmentStarted, source, &userID, &cohortID, nil, nil, since); err == nil {
		return // already captured this session
	}

	var name, email, phone string
	if s.users != nil {
		if u, err := s.users.FindByID(ctx, userID); err == nil && u != nil {
			name = strings.TrimSpace(u.FirstName + " " + u.LastName)
			email = u.Email
			if u.Phone != nil {
				phone = *u.Phone
			}
		}
	}
	if name == "" {
		name = "Enrolling parent"
	}
	l := &leads.Lead{
		Name:     name,
		Email:    strOrNil(email),
		Phone:    strOrNil(phone),
		Source:   source,
		Intent:   leads.IntentEnrollmentStarted,
		CohortID: &cohortID,
		UserID:   &userID,
		Status:   leads.StatusNew,
		Message:  strOrNil("Started enrollment but has not completed payment. Cohort: " + cohortTitle),
	}
	if err := s.repo.Create(ctx, l); err != nil {
		slog.Error("capture enrollment-started lead failed", "user_id", userID, "error", err)
		return
	}
	s.notifyAdmin(l, "enrollment started (payment not completed)")
}

// MarkConvertedForCohort — after a successful payment, flip any open
// enrollment-started lead for this user+cohort to CONVERTED so the funnel
// numbers close the loop. Best-effort: never fails the payment path.
func (s *LeadService) MarkConvertedForCohort(ctx context.Context, userID, cohortID uuid.UUID) {
	if s.repo == nil {
		return
	}
	l, err := s.repo.FindRecentOpen(ctx, leads.IntentEnrollmentStarted, "cohort-enrollment", &userID, &cohortID, nil, nil, s.now().UTC().Add(-conversionWindow))
	if err != nil || l == nil {
		return
	}
	if err := s.repo.UpdateStatus(ctx, l.ID, leads.StatusConverted, s.now().UTC()); err != nil {
		slog.Error("mark lead converted failed", "lead_id", l.ID, "error", err)
		return
	}
	s.notifyAdmin(l, "lead converted (payment confirmed)")
}

// List — admin view with optional status filter + pagination.
func (s *LeadService) List(ctx context.Context, status string, page, pageSize int) ([]leads.Lead, int64, error) {
	if s.repo == nil {
		return []leads.Lead{}, 0, nil
	}
	if status != "" && !leads.ValidStatus(status) {
		return nil, 0, fmt.Errorf("%w: status must be NEW, CONTACTED, CONVERTED or CLOSED", domain.ErrInvalidInput)
	}
	return s.repo.List(ctx, status, page, pageSize)
}

// Counts — per-status counts for the admin console header.
func (s *LeadService) Counts(ctx context.Context) (map[string]int64, error) {
	out := map[string]int64{}
	if s.repo == nil {
		return out, nil
	}
	for _, st := range []string{leads.StatusNew, leads.StatusContacted, leads.StatusConverted, leads.StatusClosed} {
		n, err := s.repo.CountByStatus(ctx, st)
		if err != nil {
			return nil, err
		}
		out[st] = n
	}
	return out, nil
}

// UpdateStatus — admin advances the follow-up lifecycle (audited).
func (s *LeadService) UpdateStatus(ctx context.Context, adminID, leadID uuid.UUID, status string) (*leads.Lead, error) {
	if s.repo == nil {
		return nil, errors.New("lead store unavailable")
	}
	if !leads.ValidStatus(status) {
		return nil, fmt.Errorf("%w: status must be NEW, CONTACTED, CONVERTED or CLOSED", domain.ErrInvalidInput)
	}
	existing, err := s.repo.GetByID(ctx, leadID)
	if err != nil {
		return nil, err
	}
	if err := s.repo.UpdateStatus(ctx, leadID, status, s.now().UTC()); err != nil {
		return nil, err
	}
	updated, err := s.repo.GetByID(ctx, leadID)
	if err != nil {
		return nil, err
	}
	if s.audit != nil {
		_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditUpdate, "lead",
			&leadID, map[string]any{"status": existing.Status}, map[string]any{"status": status}, nil, nil)
	}
	return updated, nil
}

// notifyAdmin WhatsApps the ops number with the lead's contact details.
// Fire-and-forget: notification failure must never fail the capture.
func (s *LeadService) notifyAdmin(l *leads.Lead, subject string) {
	if s.notifier == nil || WhatsAppAdminNumber() == "" {
		return
	}
	phone := ""
	if l.Phone != nil {
		phone = *l.Phone
	}
	email := ""
	if l.Email != nil {
		email = *l.Email
	}
	body := "Name: " + l.Name + "\nPhone: " + phone
	if email != "" {
		body += "\nEmail: " + email
	}
	body += "\nSource: " + l.Source + "\nIntent: " + l.Intent
	if l.Message != nil && strings.TrimSpace(*l.Message) != "" {
		body += "\nNote: " + strings.TrimSpace(*l.Message)
	}
	if l.CohortID != nil {
		body += "\nCohort: " + l.CohortID.String()
	}
	go func(body string) {
		nctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := s.notifier.NotifyAdmin(nctx, "NUVORA: "+subject, body); err != nil {
			slog.Error("whatsapp lead notify failed", "lead_id", l.ID, "error", err)
		}
	}(body)
}

func strOrNil(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

func trimMsg(m *string) *string {
	if m == nil {
		return nil
	}
	t := strings.TrimSpace(*m)
	if len(t) > 1000 {
		t = t[:1000]
	}
	return strOrNil(t)
}
