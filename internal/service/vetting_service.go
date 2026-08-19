package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/domain/vetting"
	"ykay-virtual/internal/repository"
	"ykay-virtual/internal/storage"

	"github.com/google/uuid"
)

// VettingService — staged tutor vetting pipeline + competency assessment
// engine (Tuteria parity: identity check, credentials, interview, decision;
// leapfrog: attributable vetting_events, private-bucket documents with signed
// URLs and server-side authz, real quiz engine with 70% pass threshold and
// 12-month competency expiry).
//
// Every status transition is audited (AuditVettingStatusChange) and recorded
// as a vetting_event. Object-level authorization (owner / admin) is enforced
// here in the service layer, never in the UI.

type VettingService struct {
	uows        repository.UnitOfWorkFactory
	storage     storage.Storage
	audit       identity.AuditService
	subjects    subjectReader
	invalidator searchInvalidator
	clock       func() time.Time
}

type subjectReader interface {
	GetByID(ctx context.Context, id uuid.UUID) (*academics.Subject, error)
}

type searchInvalidator interface {
	InvalidateSearch(ctx context.Context) error
}

func NewVettingService(uows repository.UnitOfWorkFactory, store storage.Storage,
	audit identity.AuditService, subjects subjectReader, inv searchInvalidator) *VettingService {
	return &VettingService{
		uows:        uows,
		storage:     store,
		audit:       audit,
		subjects:    subjects,
		invalidator: inv,
		clock:       time.Now,
	}
}

var slugCleaner = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(name string) string {
	return strings.Trim(slugCleaner.ReplaceAllString(strings.ToLower(name), "-"), "-")
}

// --- Profile lifecycle (tutor-facing) ---

type CreateProfileInput struct {
	DisplayName     string
	Headline        *string
	Bio             *string
	YearsExperience int
	HourlyRateMin   *float64
	HourlyRateMax   *float64
	Currency        string
	Timezone        string
	AcceptsOnline   bool
	AcceptsInPerson bool
}

func (s *VettingService) CreateProfile(ctx context.Context, actorUserID uuid.UUID, in CreateProfileInput) (*tutor.TutorProfile, error) {
	if strings.TrimSpace(in.DisplayName) == "" {
		return nil, fmt.Errorf("%w: display_name is required", domain.ErrInvalidInput)
	}
	if in.YearsExperience < 0 || in.YearsExperience > 60 {
		return nil, fmt.Errorf("%w: years_experience out of range", domain.ErrInvalidInput)
	}
	if in.Currency == "" {
		in.Currency = "NGN"
	}
	if in.Timezone == "" {
		in.Timezone = "Africa/Lagos"
	}

	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()

	if _, err := uow.Vetting().GetProfileByUserID(ctx, actorUserID); err == nil {
		return nil, fmt.Errorf("%w: tutor profile already exists for this user", domain.ErrConflict)
	} else if !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}

	base := slugify(in.DisplayName)
	profile := &tutor.TutorProfile{
		UserID:          actorUserID,
		Slug:            fmt.Sprintf("%s-%s", base, uuid.NewString()[:4]),
		DisplayName:     strings.TrimSpace(in.DisplayName),
		Headline:        in.Headline,
		Bio:             in.Bio,
		YearsExperience: in.YearsExperience,
		HourlyRateMin:   in.HourlyRateMin,
		HourlyRateMax:   in.HourlyRateMax,
		Currency:        in.Currency,
		Status:          tutor.TutorStatusDraft,
		Timezone:        in.Timezone,
		AcceptsOnline:   in.AcceptsOnline,
		AcceptsInPerson: in.AcceptsInPerson,
	}
	if err := uow.Vetting().CreateProfile(ctx, profile); err != nil {
		return nil, err
	}
	stage := vetting.StageAccount
	if err := uow.Vetting().CreateEvent(ctx, &vetting.VettingEvent{
		TutorProfileID: profile.ID,
		Stage:          stage,
		ToStatus:       string(tutor.TutorStatusDraft),
		ActorUserID:    &actorUserID,
		Notes:          strPtrOrNil("Tutor profile created"),
	}); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &actorUserID, identity.AuditVettingStatusChange, "tutor_profile",
		&profile.ID, nil, map[string]any{"action": "created", "slug": profile.Slug, "status": tutor.TutorStatusDraft},
		nil, nil)
	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	return profile, nil
}

func (s *VettingService) GetMyProfile(ctx context.Context, actorUserID uuid.UUID) (*tutor.TutorProfile, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	return uow.Vetting().GetProfileByUserID(ctx, actorUserID)
}

// AddSubject — adds a subject to the tutor's teaching scope (DRAFT/SUBMITTED only).
func (s *VettingService) AddSubject(ctx context.Context, actorUserID uuid.UUID, profileID, subjectID uuid.UUID) error {
	if s.subjects == nil {
		return errors.New("subject catalogue unavailable")
	}
	if _, err := s.subjects.GetByID(ctx, subjectID); err != nil {
		return err
	}
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return err
	}
	defer uow.Rollback()

	profile, err := s.uowProfile(ctx, uow, profileID)
	if err != nil {
		return err
	}
	if profile.UserID != actorUserID {
		return domain.ErrForbidden
	}
	if profile.Status != tutor.TutorStatusDraft && profile.Status != tutor.TutorStatusSubmitted {
		return fmt.Errorf("%w: teaching scope locked once under review", domain.ErrConflict)
	}
	if err := uow.TutorSubjects().AddForTutor(ctx, profileID, subjectID); err != nil {
		return err
	}
	return uow.Commit(ctx)
}

func (s *VettingService) ListMySubjects(ctx context.Context, actorUserID uuid.UUID, profileID uuid.UUID) ([]tutor.TutorSubjectEntry, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	profile, err := s.uowProfile(ctx, uow, profileID)
	if err != nil {
		return nil, err
	}
	if profile.UserID != actorUserID {
		return nil, domain.ErrForbidden
	}
	return uow.TutorSubjects().ListByTutor(ctx, profileID)
}

// --- Workflow transitions ---

// SubmitForReview — DRAFT → SUBMITTED. Requires a complete profile
// (bio, experience, rates), ≥1 subject and ≥1 uploaded document.
func (s *VettingService) SubmitForReview(ctx context.Context, actorUserID, profileID uuid.UUID) error {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return err
	}
	defer uow.Rollback()

	profile, err := s.uowProfile(ctx, uow, profileID)
	if err != nil {
		return err
	}
	if profile.UserID != actorUserID {
		return domain.ErrForbidden
	}
	if !profile.CanTransitionTo(tutor.TutorStatusSubmitted) {
		return fmt.Errorf("%w: cannot submit from %s", domain.ErrConflict, profile.Status)
	}
	if profile.Bio == nil || *profile.Bio == "" {
		return fmt.Errorf("%w: bio is required before submission", domain.ErrInvalidInput)
	}
	if profile.YearsExperience < 1 {
		return fmt.Errorf("%w: years_experience must be at least 1", domain.ErrInvalidInput)
	}
	if profile.HourlyRateMin == nil || *profile.HourlyRateMin <= 0 {
		return fmt.Errorf("%w: hourly_rate_min must be set", domain.ErrInvalidInput)
	}
	subjects, err := uow.TutorSubjects().ListByTutor(ctx, profileID)
	if err != nil {
		return err
	}
	if len(subjects) == 0 {
		return fmt.Errorf("%w: add at least one subject before submission", domain.ErrInvalidInput)
	}
	docs, err := uow.Vetting().ListDocuments(ctx, profileID)
	if err != nil {
		return err
	}
	if len(docs) == 0 {
		return fmt.Errorf("%w: upload at least one identity document before submission", domain.ErrInvalidInput)
	}

	from := string(profile.Status)
	if err := uow.Vetting().UpdateStatus(ctx, profileID, string(tutor.TutorStatusSubmitted)); err != nil {
		return err
	}
	if err := s.recordTransition(ctx, uow, profileID, from, string(tutor.TutorStatusSubmitted),
		&actorUserID, "Tutor submitted profile for review", vetting.StageProfessional); err != nil {
		return err
	}
	return uow.Commit(ctx)
}

// ReviewDocument — admin reviews a vetting document. Rejection requires a reason.
func (s *VettingService) ReviewDocument(ctx context.Context, adminID, documentID uuid.UUID, approve bool, reason string) error {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return err
	}
	defer uow.Rollback()

	doc, err := uow.Vetting().GetDocument(ctx, documentID)
	if err != nil {
		return err
	}
	if doc.Status != vetting.DocStatusPending {
		return fmt.Errorf("%w: document already reviewed (%s)", domain.ErrConflict, doc.Status)
	}
	status := vetting.DocStatusApproved
	if !approve {
		status = vetting.DocStatusRejected
		if strings.TrimSpace(reason) == "" {
			return fmt.Errorf("%w: rejection requires a reason", domain.ErrInvalidInput)
		}
	}
	var reasonPtr *string
	if reason != "" {
		reasonPtr = &reason
	}
	if err := uow.Vetting().UpdateDocumentReview(ctx, documentID, status, adminID, reasonPtr); err != nil {
		return err
	}
	notes := "Document approved: " + string(doc.Type)
	if !approve {
		notes = "Document rejected: " + reason
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditVettingStatusChange, "tutor_document",
		&documentID, map[string]any{"status": vetting.DocStatusPending}, map[string]any{"status": status, "reason": reason},
		nil, nil)
	if err := uow.Vetting().CreateEvent(ctx, &vetting.VettingEvent{
		TutorProfileID: doc.TutorProfileID,
		Stage:          vetting.StageEvidence,
		ToStatus:       string(status), // must be a valid tutor_status enum value
		ActorUserID:    &adminID,
		Notes:          strPtrOrNil(notes),
	}); err != nil {
		return err
	}
	return uow.Commit(ctx)
}

// StartReview — SUBMITTED → UNDER_REVIEW (admin).
func (s *VettingService) StartReview(ctx context.Context, adminID, profileID uuid.UUID) error {
	return s.transition(ctx, adminID, profileID, tutor.TutorStatusUnderReview, "Review started", vetting.StageScreening)
}

// MoveToInterview — UNDER_REVIEW → INTERVIEW (admin).
func (s *VettingService) MoveToInterview(ctx context.Context, adminID, profileID uuid.UUID) error {
	return s.transition(ctx, adminID, profileID, tutor.TutorStatusInterview, "Moved to interview", vetting.StageScreening)
}

// MoveToVerification — INTERVIEW → VERIFICATION (admin). Requires an
// approved government ID (identity check parity with Tuteria /trust).
func (s *VettingService) MoveToVerification(ctx context.Context, adminID, profileID uuid.UUID) error {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return err
	}
	defer uow.Rollback()
	profile, err := s.uowProfile(ctx, uow, profileID)
	if err != nil {
		return err
	}
	if !profile.CanTransitionTo(tutor.TutorStatusVerification) {
		return fmt.Errorf("%w: cannot move to verification from %s", domain.ErrConflict, profile.Status)
	}
	docs, err := uow.Vetting().ListDocuments(ctx, profileID)
	if err != nil {
		return err
	}
	hasApprovedID := false
	for _, d := range docs {
		if d.Type == vetting.DocGovtID && d.Status == vetting.DocStatusApproved {
			hasApprovedID = true
		}
	}
	if !hasApprovedID {
		return fmt.Errorf("%w: an approved government ID is required before verification", domain.ErrConflict)
	}
	from := string(profile.Status)
	if err := uow.Vetting().UpdateStatus(ctx, profileID, string(tutor.TutorStatusVerification)); err != nil {
		return err
	}
	if err := s.recordTransition(ctx, uow, profileID, from, string(tutor.TutorStatusVerification),
		&adminID, "Identity verified — moved to final verification", vetting.StageDecision); err != nil {
		return err
	}
	return uow.Commit(ctx)
}

// Approve — VERIFICATION → APPROVED (admin). Requires an unexpired passed
// competency assessment; publishes the profile and computes the initial
// ranking score; invalidates the marketplace search cache.
func (s *VettingService) Approve(ctx context.Context, adminID, profileID uuid.UUID) error {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return err
	}
	defer uow.Rollback()

	profile, err := s.uowProfile(ctx, uow, profileID)
	if err != nil {
		return err
	}
	if !profile.CanTransitionTo(tutor.TutorStatusApproved) {
		return fmt.Errorf("%w: cannot approve from %s", domain.ErrConflict, profile.Status)
	}
	passed, err := uow.Vetting().PassedCompetencyExists(ctx, profileID, s.clock().UTC())
	if err != nil {
		return err
	}
	if !passed {
		return fmt.Errorf("%w: tutor has not passed a competency assessment (or it expired)", domain.ErrConflict)
	}

	ranking := computeRankingScore(*profile)
	if err := uow.Vetting().MarkApproved(ctx, profileID, adminID, ranking); err != nil {
		return err
	}
	from := string(profile.Status)
	if err := s.recordTransition(ctx, uow, profileID, from, string(tutor.TutorStatusApproved),
		&adminID, fmt.Sprintf("Approved — ranking score %.1f", ranking), vetting.StageActivation); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditVettingStatusChange, "tutor_profile",
		&profileID, map[string]any{"status": from}, map[string]any{
			"status": tutor.TutorStatusApproved, "is_public": true, "ranking_score": ranking,
		}, nil, nil)
	if err := uow.Commit(ctx); err != nil {
		return err
	}
	if s.invalidator != nil {
		_ = s.invalidator.InvalidateSearch(ctx)
	}
	return nil
}

// SetPublic — admin toggles whether an APPROVED tutor is visible on the
// public marketplace. This is the direct "fix is_public=true" action: a tutor
// only appears in /tutors search when status=APPROVED AND is_public=true.
// Only approved tutors can be shown; suspending hides them again.
func (s *VettingService) SetPublic(ctx context.Context, adminID, profileID uuid.UUID, isPublic bool) error {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return err
	}
	defer uow.Rollback()

	profile, err := s.uowProfile(ctx, uow, profileID)
	if err != nil {
		return err
	}
	if profile.Status != tutor.TutorStatusApproved {
		return fmt.Errorf("%w: only approved tutors can be shown publicly (current status %s)",
			domain.ErrConflict, profile.Status)
	}
	if err := uow.Vetting().SetPublic(ctx, profileID, isPublic); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditVettingStatusChange, "tutor_profile",
		&profileID, map[string]any{"is_public": !isPublic}, map[string]any{"is_public": isPublic}, nil, nil)
	if err := uow.Commit(ctx); err != nil {
		return err
	}
	if s.invalidator != nil {
		_ = s.invalidator.InvalidateSearch(ctx)
	}
	return nil
}

// Reject — any review state → REJECTED (admin). Reason required.
func (s *VettingService) Reject(ctx context.Context, adminID, profileID uuid.UUID, reason string) error {
	if strings.TrimSpace(reason) == "" {
		return fmt.Errorf("%w: rejection requires a reason", domain.ErrInvalidInput)
	}
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return err
	}
	defer uow.Rollback()
	profile, err := s.uowProfile(ctx, uow, profileID)
	if err != nil {
		return err
	}
	if !profile.CanTransitionTo(tutor.TutorStatusRejected) {
		return fmt.Errorf("%w: cannot reject from %s", domain.ErrConflict, profile.Status)
	}
	from := string(profile.Status)
	if err := uow.Vetting().UpdateStatus(ctx, profileID, string(tutor.TutorStatusRejected)); err != nil {
		return err
	}
	if err := s.recordTransition(ctx, uow, profileID, from, string(tutor.TutorStatusRejected),
		&adminID, "Rejected: "+reason, vetting.StageDecision); err != nil {
		return err
	}
	return uow.Commit(ctx)
}

// Hold — pause the application at any review state (admin).
func (s *VettingService) Hold(ctx context.Context, adminID, profileID uuid.UUID, reason string) error {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return err
	}
	defer uow.Rollback()
	profile, err := s.uowProfile(ctx, uow, profileID)
	if err != nil {
		return err
	}
	if !profile.CanTransitionTo(tutor.TutorStatusHold) {
		return fmt.Errorf("%w: cannot hold from %s", domain.ErrConflict, profile.Status)
	}
	from := string(profile.Status)
	if err := uow.Vetting().UpdateStatus(ctx, profileID, string(tutor.TutorStatusHold)); err != nil {
		return err
	}
	notes := "Application on hold"
	if reason != "" {
		notes = "Application on hold: " + reason
	}
	if err := s.recordTransition(ctx, uow, profileID, from, string(tutor.TutorStatusHold),
		&adminID, notes, vetting.StageDecision); err != nil {
		return err
	}
	return uow.Commit(ctx)
}

// Suspend — APPROVED → SUSPENDED (admin); hides the profile from search.
func (s *VettingService) Suspend(ctx context.Context, adminID, profileID uuid.UUID, reason string) error {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return err
	}
	defer uow.Rollback()
	profile, err := s.uowProfile(ctx, uow, profileID)
	if err != nil {
		return err
	}
	if !profile.CanTransitionTo(tutor.TutorStatusSuspended) {
		return fmt.Errorf("%w: cannot suspend from %s", domain.ErrConflict, profile.Status)
	}
	from := string(profile.Status)
	if err := uow.Vetting().UpdateStatus(ctx, profileID, string(tutor.TutorStatusSuspended)); err != nil {
		return err
	}
	if err := uow.Vetting().SetPublic(ctx, profileID, false); err != nil {
		return err
	}
	notes := "Suspended"
	if reason != "" {
		notes = "Suspended: " + reason
	}
	if err := s.recordTransition(ctx, uow, profileID, from, string(tutor.TutorStatusSuspended),
		&adminID, notes, vetting.StageDecision); err != nil {
		return err
	}
	if err := uow.Commit(ctx); err != nil {
		return err
	}
	if s.invalidator != nil {
		_ = s.invalidator.InvalidateSearch(ctx)
	}
	return nil
}

func (s *VettingService) transition(ctx context.Context, actorID, profileID uuid.UUID,
	to tutor.TutorStatus, notes string, stage vetting.VettingStage) error {

	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return err
	}
	defer uow.Rollback()
	profile, err := s.uowProfile(ctx, uow, profileID)
	if err != nil {
		return err
	}
	if !profile.CanTransitionTo(to) {
		return fmt.Errorf("%w: cannot move from %s to %s", domain.ErrConflict, profile.Status, to)
	}
	from := string(profile.Status)
	if err := uow.Vetting().UpdateStatus(ctx, profileID, string(to)); err != nil {
		return err
	}
	if err := s.recordTransition(ctx, uow, profileID, from, string(to), &actorID, notes, stage); err != nil {
		return err
	}
	return uow.Commit(ctx)
}

func (s *VettingService) recordTransition(ctx context.Context, uow repository.UnitOfWork,
	profileID uuid.UUID, from, to string, actor *uuid.UUID, notes string, stage vetting.VettingStage) error {
	fromPtr := strPtrOrNil(from)

	_ = s.audit.LogStateChange(ctx, actor, identity.AuditVettingStatusChange, "tutor_profile",
		&profileID, map[string]any{"status": from}, map[string]any{"status": to, "notes": notes}, nil, nil)
	return uow.Vetting().CreateEvent(ctx, &vetting.VettingEvent{
		TutorProfileID: profileID,
		Stage:          stage,
		FromStatus:     fromPtr,
		ToStatus:       to,
		ActorUserID:    actor,
		Notes:          strPtrOrNil(notes),
	})
}

// --- Documents (PRIVATE bucket, signed URLs, server authz) ---

type DocumentUploadResult struct {
	Document  vetting.VettingDocument `json:"document"`
	UploadURL string                  `json:"upload_url"`
}

func (s *VettingService) RequestDocumentUpload(ctx context.Context, actorUserID, profileID uuid.UUID,
	docType vetting.DocumentType, fileName, mimeType string, size *int) (*DocumentUploadResult, error) {

	if strings.TrimSpace(fileName) == "" {
		return nil, fmt.Errorf("%w: file_name is required", domain.ErrInvalidInput)
	}
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	profile, err := s.uowProfile(ctx, uow, profileID)
	if err != nil {
		return nil, err
	}
	if profile.UserID != actorUserID {
		return nil, domain.ErrForbidden
	}

	key := fmt.Sprintf("vetting/%s/%s-%s", profileID, uuid.NewString()[:8], sanitizeFileName(fileName))
	doc := &vetting.VettingDocument{
		TutorProfileID: profileID,
		Type:           docType,
		FileKey:        key,
		FileName:       fileName,
		FileSize:       size,
		MimeType:       strPtrOrNil(mimeType),
	}
	if err := uow.Vetting().CreateDocument(ctx, doc); err != nil {
		return nil, err
	}
	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}

	// Signed PUT URL: 15 minutes to upload, PRIVATE bucket only.
	uploadURL, err := s.storage.GeneratePresignedURL(ctx, storage.BucketPrivate, key, 15*time.Minute)
	if err != nil {
		return nil, fmt.Errorf("generate upload url: %w", err)
	}
	return &DocumentUploadResult{Document: *doc, UploadURL: uploadURL}, nil
}

// GetDocumentSignedURL — server-side authz BEFORE issuing a signed GET URL:
// owner or admin only. The file_key itself is never exposed.
func (s *VettingService) GetDocumentSignedURL(ctx context.Context, actorUserID uuid.UUID,
	documentID uuid.UUID, isAdmin bool) (string, error) {

	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer uow.Rollback()
	doc, err := uow.Vetting().GetDocument(ctx, documentID)
	if err != nil {
		return "", err
	}
	profile, err := uow.Vetting().GetProfileByID(ctx, doc.TutorProfileID)
	if err != nil {
		return "", err
	}
	if !isAdmin && profile.UserID != actorUserID {
		return "", domain.ErrForbidden
	}
	return s.storage.GeneratePresignedURL(ctx, storage.BucketPrivate, doc.FileKey, 5*time.Minute)
}

// --- Admin queue ---

func (s *VettingService) ListQueue(ctx context.Context, status string, page, pageSize int) ([]tutor.TutorProfile, int64, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, 0, err
	}
	defer uow.Rollback()
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return uow.Vetting().ListByStatus(ctx, status, pageSize, (page-1)*pageSize)
}

// GetProfileDetail — full vetting dossier for the admin console:
// profile, documents (metadata only), subjects, competency results, events.
type ProfileDetail struct {
	Profile    tutor.TutorProfile             `json:"profile"`
	Documents  []vetting.VettingDocument      `json:"documents"`
	Subjects   []tutor.TutorSubjectEntry      `json:"subjects"`
	Competency []vetting.CompetencyAssessment `json:"competency"`
	Events     []vetting.VettingEvent         `json:"events"`
}

func (s *VettingService) GetProfileDetail(ctx context.Context, profileID uuid.UUID) (*ProfileDetail, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	profile, err := s.uowProfile(ctx, uow, profileID)
	if err != nil {
		return nil, err
	}
	docs, err := uow.Vetting().ListDocuments(ctx, profileID)
	if err != nil {
		return nil, err
	}
	subjects, err := uow.TutorSubjects().ListByTutor(ctx, profileID)
	if err != nil {
		return nil, err
	}
	competency, err := uow.Vetting().ListCompetencyResults(ctx, profileID, 10)
	if err != nil {
		return nil, err
	}
	events, err := uow.Vetting().ListEvents(ctx, profileID, 50)
	if err != nil {
		return nil, err
	}
	return &ProfileDetail{
		Profile:    *profile,
		Documents:  docs,
		Subjects:   subjects,
		Competency: competency,
		Events:     events,
	}, nil
}

// --- Helpers ---

func (s *VettingService) uowProfile(ctx context.Context, uow repository.UnitOfWork,
	profileID uuid.UUID) (*tutor.TutorProfile, error) {
	return uow.Vetting().GetProfileByID(ctx, profileID)
}

func strPtrOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func sanitizeFileName(name string) string {
	re := regexp.MustCompile(`[^a-zA-Z0-9._-]+`)
	return re.ReplaceAllString(name, "-")
}

// computeRankingScore — deterministic initial ranking for newly approved
// tutors; the nightly cron recomputes as tutors accumulate hours/reviews.
func computeRankingScore(t tutor.TutorProfile) float64 {
	score := float64(t.YearsExperience)*2 +
		t.RatingAvg*15 +
		float64(t.TotalHoursTaught)*0.4 +
		float64(t.TotalStudents)*0.5
	if score > 100 {
		return 100
	}
	if score < 0 {
		return 0
	}
	return score
}

// RecomputeAllRankings — nightly cron (AGENTS.md compute_tutor_ranking_score):
// recalculates the ranking score for every approved tutor from accumulated
// hours, ratings, students and experience; then refreshes the search cache.
func (s *VettingService) RecomputeAllRankings(ctx context.Context) (int, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return 0, err
	}
	ids, err := uow.Vetting().ListApprovedProfiles(ctx, 500)
	uow.Rollback()
	if err != nil {
		return 0, err
	}

	updated := 0
	for _, id := range ids {
		uow, err := s.uows.Begin(ctx)
		if err != nil {
			continue
		}
		profile, err := uow.Vetting().GetProfileByID(ctx, id)
		if err != nil {
			uow.Rollback()
			continue
		}
		if err := uow.Vetting().SetRankingScore(ctx, id, computeRankingScore(*profile)); err != nil {
			uow.Rollback()
			continue
		}
		if err := uow.Commit(ctx); err == nil {
			updated++
		}
	}
	if s.invalidator != nil {
		_ = s.invalidator.InvalidateSearch(ctx)
	}
	return updated, nil
}

// SubjectReaderAdapter — GetByID over the catalogue repo; with a nil repo
// (dev in-memory mode) any subject id is accepted so the vetting flow is
// exercisable without Postgres.
type SubjectReaderAdapter struct {
	Repo academics.SubjectRepository
}

func (a SubjectReaderAdapter) GetByID(ctx context.Context, id uuid.UUID) (*academics.Subject, error) {
	if a.Repo == nil {
		return &academics.Subject{ID: id, Name: "subject", Slug: "subject", Category: "Academic"}, nil
	}
	return a.Repo.GetByID(ctx, id)
}

// SearchInvalidatorAdapter — adapts any InvalidateSearch func.
type SearchInvalidatorAdapter struct {
	Fn func(ctx context.Context) error
}

func (a SearchInvalidatorAdapter) InvalidateSearch(ctx context.Context) error {
	if a.Fn == nil {
		return nil
	}
	return a.Fn(ctx)
}
