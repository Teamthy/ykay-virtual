package service

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/admissions"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/notification"
	"ykay-virtual/internal/repository"

	"github.com/google/uuid"
)

// AdmissionsService — virtual-school admissions applications: apply, supporting
// documents, admin review/offer, parent accept (which auto-creates a payable
// order + enrolment), and status-change notifications.
type AdmissionsService struct {
	uows repository.UnitOfWorkFactory
	// learnersForParent resolves the learner profiles a parent is linked to
	// (ownership gate).
	learnersForParent func(ctx context.Context, parentUserID uuid.UUID) ([]identity.StudentProfile, error)
	// users resolves the parent's email for notifications.
	users   identity.UserRepository
	mail    notification.EmailSender
	siteURL string
	now     func() time.Time
}

func NewAdmissionsService(uows repository.UnitOfWorkFactory) *AdmissionsService {
	return &AdmissionsService{uows: uows, now: time.Now}
}

// WithOwnership wires the resolver used to verify a parent owns a learner.
func (s *AdmissionsService) WithOwnership(
	learnersForParent func(ctx context.Context, parentUserID uuid.UUID) ([]identity.StudentProfile, error),
) *AdmissionsService {
	s.learnersForParent = learnersForParent
	return s
}

// WithNotifications wires user + email resolution for status-change emails.
func (s *AdmissionsService) WithNotifications(users identity.UserRepository, mail notification.EmailSender, siteURL string) *AdmissionsService {
	s.users = users
	s.mail = mail
	s.siteURL = siteURL
	return s
}

// ApplicationInput — fields for a new application.
type ApplicationInput struct {
	InstitutionID    *uuid.UUID
	ProgrammeID      *uuid.UUID
	CohortID         *uuid.UUID
	StudentProfileID uuid.UUID
	ApplicantName    string
	CurrentLevel     string
	PreferredTerm    string
	Notes            string
}

// Apply creates a PENDING admissions application on behalf of the parent.
func (s *AdmissionsService) Apply(ctx context.Context, parentUserID uuid.UUID, in ApplicationInput) (*admissions.Application, error) {
	if in.StudentProfileID == uuid.Nil {
		return nil, fmt.Errorf("%w: learner is required", domain.ErrInvalidInput)
	}
	// Ownership: parent must be linked to the learner (unless the learner is
	// the parent themselves — handled by the resolver returning it).
	if s.learnersForParent != nil {
		owned := false
		if learners, err := s.learnersForParent(ctx, parentUserID); err == nil {
			for _, l := range learners {
				if l.ID == in.StudentProfileID {
					owned = true
					break
				}
			}
		}
		if !owned {
			return nil, domain.ErrForbidden
		}
	}

	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()

	a := &admissions.Application{
		InstitutionID:    in.InstitutionID,
		ProgrammeID:      in.ProgrammeID,
		CohortID:         in.CohortID,
		ParentUserID:     parentUserID,
		StudentProfileID: in.StudentProfileID,
		ApplicantName:    in.ApplicantName,
		CurrentLevel:     strPtrOrNil(in.CurrentLevel),
		PreferredTerm:    strPtrOrNil(in.PreferredTerm),
		Notes:            strPtrOrNil(in.Notes),
		Status:           admissions.StatusPending,
	}
	if err := uow.Admissions().Create(ctx, a); err != nil {
		return nil, err
	}
	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	return a, nil
}

// ListMine returns a family's applications.
func (s *AdmissionsService) ListMine(ctx context.Context, parentUserID uuid.UUID) ([]admissions.Application, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	return uow.Admissions().ListByParent(ctx, parentUserID, 50)
}

// requireOwnership — the application must belong to the parent (or be an admin
// action). Returns the application.
func (s *AdmissionsService) requireOwnership(ctx context.Context, uow repository.UnitOfWork, parentUserID, appID uuid.UUID) (*admissions.Application, error) {
	a, err := uow.Admissions().GetByID(ctx, appID)
	if err != nil {
		return nil, err
	}
	if a.ParentUserID != parentUserID {
		return nil, domain.ErrForbidden
	}
	return a, nil
}

// AddDocument — a parent attaches a supporting document to their application.
func (s *AdmissionsService) AddDocument(ctx context.Context, parentUserID, appID uuid.UUID, name, url, mimeType string, sizeBytes int64) (*admissions.Document, error) {
	name = strings.TrimSpace(name)
	url = strings.TrimSpace(url)
	if name == "" {
		return nil, fmt.Errorf("%w: document name is required", domain.ErrInvalidInput)
	}
	if url == "" {
		return nil, fmt.Errorf("%w: document url is required", domain.ErrInvalidInput)
	}
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	if _, err := s.requireOwnership(ctx, uow, parentUserID, appID); err != nil {
		return nil, err
	}
	var mime *string
	if mimeType != "" {
		mime = &mimeType
	}
	var size *int64
	if sizeBytes > 0 {
		size = &sizeBytes
	}
	d := &admissions.Document{
		ApplicationID: appID,
		Name:          name,
		URL:           url,
		MimeType:      mime,
		SizeBytes:     size,
		UploadedBy:    &parentUserID,
	}
	if err := uow.Admissions().AddDocument(ctx, d); err != nil {
		return nil, err
	}
	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	return d, nil
}

// ListMyDocuments — a parent lists their application's documents.
func (s *AdmissionsService) ListMyDocuments(ctx context.Context, parentUserID, appID uuid.UUID) ([]admissions.Document, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	if _, err := s.requireOwnership(ctx, uow, parentUserID, appID); err != nil {
		return nil, err
	}
	return uow.Admissions().ListDocuments(ctx, appID)
}

// RemoveMyDocument — a parent removes one of their application's documents.
func (s *AdmissionsService) RemoveMyDocument(ctx context.Context, parentUserID, appID, docID uuid.UUID) error {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return err
	}
	defer uow.Rollback()
	if _, err := s.requireOwnership(ctx, uow, parentUserID, appID); err != nil {
		return err
	}
	d, err := uow.Admissions().GetDocument(ctx, docID)
	if err != nil {
		return err
	}
	if d.ApplicationID != appID {
		return domain.ErrForbidden
	}
	if err := uow.Admissions().RemoveDocument(ctx, docID); err != nil {
		return err
	}
	return uow.Commit(ctx)
}

// ListDocuments — admin reads an application's documents.
func (s *AdmissionsService) ListDocuments(ctx context.Context, appID uuid.UUID) ([]admissions.Document, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	if _, err := uow.Admissions().GetByID(ctx, appID); err != nil {
		return nil, err
	}
	return uow.Admissions().ListDocuments(ctx, appID)
}

// SetStatus advances an application (admin). Validation of transitions is
// kept light; admins can review/offer/accept/reject. When moving to OFFERED,
// an offer fee/currency/message may be attached.
func (s *AdmissionsService) SetStatus(ctx context.Context, adminID, appID uuid.UUID, status admissions.Status, offer *OfferInput) (*admissions.Application, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	a, err := uow.Admissions().GetByID(ctx, appID)
	if err != nil {
		return nil, err
	}
	switch status {
	case admissions.StatusPending, admissions.StatusReviewing, admissions.StatusOffered,
		admissions.StatusAccepted, admissions.StatusRejected, admissions.StatusWithdrawn:
	default:
		return nil, fmt.Errorf("%w: invalid admissions status", domain.ErrInvalidInput)
	}
	// Once accepted or rejected, the application is final.
	if a.Status == admissions.StatusAccepted || a.Status == admissions.StatusRejected {
		return nil, fmt.Errorf("%w: application is already final", domain.ErrConflict)
	}
	if status == admissions.StatusOffered && offer != nil && offer.Fee != nil {
		if *offer.Fee < 0 {
			return nil, fmt.Errorf("%w: offer fee cannot be negative", domain.ErrInvalidInput)
		}
		currency := "NGN"
		if offer.Currency != nil && strings.TrimSpace(*offer.Currency) != "" {
			currency = strings.ToUpper(strings.TrimSpace(*offer.Currency))
		}
		if err := uow.Admissions().SetOffer(ctx, appID, offer.Fee, &currency, offer.Message); err != nil {
			return nil, err
		}
	}
	if err := uow.Admissions().UpdateStatus(ctx, appID, status, &adminID); err != nil {
		return nil, err
	}
	a.Status = status
	a.ReviewedBy = &adminID
	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	// Refresh for offer fields + notify (best-effort, never fails the flow).
	updated, _ := uow.Admissions().GetByID(ctx, appID)
	s.notifyStatus(ctx, updated)
	return updated, nil
}

// OfferInput — optional fee/currency/message attached when offering.
type OfferInput struct {
	Fee      *float64
	Currency *string
	Message  *string
}

// Accept — the parent accepts an OFFERED application. Auto-enrols the learner
// and wires a payable PENDING order for the offer fee (auto-enrol fee wiring).
// When the application references a cohort, a PENDING cohort enrollment is
// created and the seat reserved; the order's COHORT item lets the existing
// payment→webhook→confirm path settle it. When no cohort, a plain ADMISSION
// order is created (paid through the standard initiate→webhook flow).
func (s *AdmissionsService) Accept(ctx context.Context, parentUserID, appID uuid.UUID) (*AdmissionsAcceptResult, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()

	a, err := s.requireOwnership(ctx, uow, parentUserID, appID)
	if err != nil {
		return nil, err
	}
	if a.Status != admissions.StatusOffered {
		return nil, fmt.Errorf("%w: only an offered application can be accepted", domain.ErrConflict)
	}

	// Create the payable order (auto-enrol fee wiring).
	order := &payment.Order{
		ParentUserID: parentUserID,
		StudentID:    &a.StudentProfileID,
		Status:       payment.OrderPending,
		Currency:     "NGN",
	}
	if a.OfferCurrency != nil && strings.TrimSpace(*a.OfferCurrency) != "" {
		order.Currency = strings.ToUpper(strings.TrimSpace(*a.OfferCurrency))
	}
	if a.OfferFee != nil {
		order.Subtotal = *a.OfferFee
	} else {
		order.Subtotal = 0
	}
	order.TotalAmount = order.Subtotal
	if err := uow.Orders().Create(ctx, order); err != nil {
		return nil, err
	}

	// Order item: COHORT when a cohort is attached (so payment confirms the
	// enrollment), else ADMISSION.
	itemType := "ADMISSION"
	if a.CohortID != nil {
		itemType = "COHORT"
	}
	desc := "Admissions acceptance"
	if a.ApplicantName != "" {
		desc = "Admissions: " + a.ApplicantName
	}
	if err := uow.Orders().CreateItem(ctx, &payment.OrderItem{
		OrderID:     order.ID,
		ItemType:    itemType,
		ReferenceID: derefUUID(a.CohortID),
		Description: &desc,
		Quantity:    1,
		UnitPrice:   order.Subtotal,
		TotalPrice:  order.Subtotal,
	}); err != nil {
		return nil, err
	}

	// Cohort auto-enrol: PENDING enrollment + seat reservation, so the payment
	// confirm path (confirmEnrollment) can flip it to CONFIRMED on success.
	if a.CohortID != nil {
		if _, err := uow.Cohorts().GetByID(ctx, *a.CohortID); err != nil {
			if err != domain.ErrNotFound {
				return nil, err
			}
		}
		enrollment := &booking.CohortEnrollment{
			CohortID:         *a.CohortID,
			StudentProfileID: a.StudentProfileID,
			ParentUserID:     parentUserID,
			OrderID:          &order.ID,
			Status:           booking.EnrollmentPending,
		}
		if err := uow.Enrollments().Create(ctx, enrollment); err != nil {
			return nil, err
		}
		if err := uow.Cohorts().IncrementEnrolledCount(ctx, *a.CohortID, 1); err != nil {
			return nil, err
		}
	}

	if err := uow.Admissions().UpdateStatus(ctx, appID, admissions.StatusAccepted, nil); err != nil {
		return nil, err
	}
	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}

	a.Status = admissions.StatusAccepted
	s.notifyStatus(ctx, a)

	return &AdmissionsAcceptResult{Order: order, Application: a}, nil
}

// AdmissionsAcceptResult — the outcome of accepting an offer.
type AdmissionsAcceptResult struct {
	Order       *payment.Order          `json:"order"`
	Application *admissions.Application `json:"application"`
}

// ListQueue returns the admin admissions queue.
func (s *AdmissionsService) ListQueue(ctx context.Context, status string, page, pageSize int) ([]admissions.Application, int64, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, 0, err
	}
	defer uow.Rollback()
	return uow.Admissions().ListAll(ctx, status, page, pageSize)
}

func derefUUID(u *uuid.UUID) uuid.UUID {
	if u == nil {
		return uuid.Nil
	}
	return *u
}

// notifyStatus — best-effort email to the parent when an application advances.
// Never fails the caller's flow.
func (s *AdmissionsService) notifyStatus(ctx context.Context, a *admissions.Application) {
	if a == nil || s.mail == nil || s.users == nil {
		return
	}
	user, err := s.users.FindByID(ctx, a.ParentUserID)
	if err != nil || user == nil || strings.TrimSpace(user.Email) == "" {
		return
	}
	base := strings.TrimRight(s.siteURL, "/")
	if base == "" {
		base = "https://virtual.ykaycollege.com"
	}
	link := base + "/account/admissions"

	var subject, body string
	switch a.Status {
	case admissions.StatusOffered:
		subject = "Your admissions application has been offered — " + a.ApplicantName
		body = notification.BrandEmail(
			`<h1 style="margin:0 0 12px;font-size:20px;color:#013920;">Admissions offer</h1>` +
				`<p style="margin:0 0 16px;">Great news — we're pleased to offer a place for ` + esc(a.ApplicantName) + `.</p>` +
				offerLine(a) +
				`<p style="margin:0 0 20px;">Sign in to accept your offer and complete the enrolment.</p>` +
				`<p><a href="` + link + `" style="display:inline-block;background:#70F250;color:#013920;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;">View your application</a></p>`)
	case admissions.StatusAccepted:
		subject = "Admissions accepted — " + a.ApplicantName
		body = notification.BrandEmail(
			`<h1 style="margin:0 0 12px;font-size:20px;color:#013920;">Application accepted</h1>` +
				`<p style="margin:0 0 16px;">` + esc(a.ApplicantName) + `'s application has been accepted. If an offer fee is due, you can complete payment from your account.</p>` +
				`<p><a href="` + link + `" style="display:inline-block;background:#70F250;color:#013920;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;">View your application</a></p>`)
	case admissions.StatusRejected:
		subject = "Update on your admissions application"
		body = notification.BrandEmail(
			`<h1 style="margin:0 0 12px;font-size:20px;color:#013920;">Application status</h1>` +
				`<p style="margin:0 0 16px;">Thank you for applying. We're sorry to let you know that we're unable to offer a place at this time. You're welcome to apply again in a future intake.</p>` +
				`<p><a href="` + link + `" style="display:inline-block;background:#70F250;color:#013920;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;">View your application</a></p>`)
	default:
		return
	}
	if err := s.mail.Send(ctx, user.Email, subject, body); err != nil {
		slog.Error("admissions status email failed", "app_id", a.ID, "error", err)
	}
}

func offerLine(a *admissions.Application) string {
	if a.OfferFee == nil || *a.OfferFee <= 0 {
		return `<p style="margin:0 0 20px;">Sign in to accept your offer and complete the enrolment.</p>`
	}
	cur := "NGN"
	if a.OfferCurrency != nil && *a.OfferCurrency != "" {
		cur = *a.OfferCurrency
	}
	fee := fmt.Sprintf("%.2f %s", *a.OfferFee, cur)
	msg := ""
	if a.OfferMessage != nil && strings.TrimSpace(*a.OfferMessage) != "" {
		msg = `<p style="margin:0 0 20px;">` + esc(*a.OfferMessage) + `</p>`
	}
	return `<p style="margin:0 0 8px;"><strong>Offer fee:</strong> ` + fee + `</p>` + msg
}

func esc(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	return s
}
