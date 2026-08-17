package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/referral"
	"ykay-virtual/internal/domain/review"
	"ykay-virtual/internal/domain/tutor"

	"github.com/google/uuid"
)

// ReferralApplier — records a new user's referral at registration (Phase 10).
// Satisfied by *ReferralService (Apply returns (*Referral, error)).
type ReferralApplier interface {
	Apply(ctx context.Context, referredUserID uuid.UUID, code string) (*referral.Referral, error)
}

// GrowthService — reviews (consent-gated, booking-scoped), the referral
// programme (code → apply → qualify on first paid order → wallet reward) and
// B2B institution accounts. Phase 10.

// ReferralRewardAmount — wallet credit the referrer earns per qualified referral.
const ReferralRewardAmount = 2000.0

// --- Reviews ---

type ReviewService struct {
	reviews review.ReviewRepository
	tutors  tutor.TutorRepository
	audit   identity.AuditService
	now     func() time.Time
}

func NewReviewService(reviews review.ReviewRepository, tutors tutor.TutorRepository,
	audit identity.AuditService) *ReviewService {
	return &ReviewService{reviews: reviews, tutors: tutors, audit: audit, now: time.Now}
}

type CreateReviewInput struct {
	ReviewerUserID uuid.UUID
	TutorProfileID uuid.UUID
	BookingID      *uuid.UUID
	Rating         int
	Title          *string
	Comment        *string
	ConsentGiven   bool
}

// Create — parent reviews a tutor after tuition. Consent is REQUIRED at
// creation (without it the review can never be published). The review starts
// PENDING; admin moderation publishes it (recomputing the tutor's rating).
func (s *ReviewService) Create(ctx context.Context, in CreateReviewInput) (*review.Review, error) {
	if in.Rating < 1 || in.Rating > 5 {
		return nil, fmt.Errorf("%w: rating must be between 1 and 5", domain.ErrInvalidInput)
	}
	if !in.ConsentGiven {
		return nil, fmt.Errorf("%w: consent is required to submit a review", domain.ErrInvalidInput)
	}
	if s.reviews == nil {
		return nil, errors.New("review store unavailable")
	}
	if s.tutors != nil {
		if _, err := s.tutors.GetByID(ctx, in.TutorProfileID); err != nil {
			return nil, fmt.Errorf("%w: tutor not found", domain.ErrNotFound)
		}
	}
	if in.ReviewerUserID == in.TutorProfileID {
		return nil, fmt.Errorf("%w: you cannot review yourself", domain.ErrInvalidInput)
	}
	exists, err := s.reviews.ExistsForReviewer(ctx, in.ReviewerUserID, in.TutorProfileID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("%w: you have already reviewed this tutor", domain.ErrConflict)
	}

	rv := &review.Review{
		BookingID:      in.BookingID,
		ReviewerUserID: in.ReviewerUserID,
		TutorProfileID: in.TutorProfileID,
		Rating:         in.Rating,
		Title:          in.Title,
		Comment:        in.Comment,
		Status:         review.ReviewPending,
		IsPublic:       false, // becomes public only after moderation
		ConsentGiven:   true,
	}
	if err := s.reviews.Create(ctx, rv); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &in.ReviewerUserID, identity.AuditCreate, "review",
		&rv.ID, nil, map[string]any{"tutor": in.TutorProfileID.String(), "rating": in.Rating,
			"consent": true, "status": review.ReviewPending}, nil, nil)
	return rv, nil
}

// ListPublishedByTutor — public, consent-gated, published reviews only.
func (s *ReviewService) ListPublishedByTutor(ctx context.Context, tutorProfileID uuid.UUID, limit int) ([]review.Review, error) {
	if s.reviews == nil {
		return []review.Review{}, nil
	}
	return s.reviews.ListPublishedByTutor(ctx, tutorProfileID, limit)
}

// Moderate — admin publishes/hides/flags; publishing recomputes the tutor's
// rating (rating_avg + rating_count from consented published reviews).
func (s *ReviewService) Moderate(ctx context.Context, adminID uuid.UUID, reviewID uuid.UUID, status review.ReviewStatus) error {
	rv, err := s.reviews.GetByID(ctx, reviewID)
	if err != nil {
		return err
	}
	if status == review.ReviewPublished && !rv.ConsentGiven {
		return fmt.Errorf("%w: cannot publish a review without reviewer consent", domain.ErrConflict)
	}
	if err := s.reviews.UpdateStatus(ctx, reviewID, status, &adminID); err != nil {
		return err
	}
	if status == review.ReviewPublished {
		if err := s.reviews.RecomputeTutorRating(ctx, rv.TutorProfileID); err != nil {
			return err
		}
	}
	return nil
}

// --- Referrals ---

type ReferralService struct {
	referrals referral.ReferralRepository
	wallets   payment.WalletRepository
	audit     identity.AuditService
	users     identity.UserRepository
	now       func() time.Time
}

// WithUsers wires the user repository used to resolve a referrer's first
// name for the public invite-landing lookup.
func (s *ReferralService) WithUsers(u identity.UserRepository) *ReferralService {
	s.users = u
	return s
}

// ReferralLookup — minimal public info about a referral code (for the
// /r/{code} landing page). Deliberately minimal: never the user id/email.
type ReferralLookup struct {
	Valid        bool    `json:"valid"`
	ReferrerName string  `json:"referrer_name,omitempty"`
	Reward       float64 `json:"reward"`
	Currency     string  `json:"currency"`
}

// LookupCode resolves a code for a public invite landing page. It never
// errors for unknown codes (valid=false instead) so the page can render an
// "invalid invite" state rather than a 404.
func (s *ReferralService) LookupCode(ctx context.Context, code string) (ReferralLookup, error) {
	out := ReferralLookup{Valid: false, Reward: ReferralRewardAmount, Currency: "NGN"}
	if s.referrals == nil {
		return out, nil
	}
	rc, err := s.referrals.GetCode(ctx, strings.TrimSpace(strings.ToUpper(code)))
	if err != nil || !rc.IsActive {
		return out, nil
	}
	out.Valid = true
	if s.users != nil {
		if u, err := s.users.FindByID(ctx, rc.UserID); err == nil {
			name := strings.TrimSpace(u.FirstName)
			if name == "" {
				if at := strings.IndexByte(u.Email, '@'); at > 0 {
					name = u.Email[:at]
				}
			}
			out.ReferrerName = name
		}
	}
	return out, nil
}

func NewReferralService(refs referral.ReferralRepository, wallets payment.WalletRepository,
	audit identity.AuditService) *ReferralService {
	return &ReferralService{referrals: refs, wallets: wallets, audit: audit, now: time.Now}
}

// GetOrCreateCode — the user's shareable code (created on first request).
func (s *ReferralService) GetOrCreateCode(ctx context.Context, userID uuid.UUID) (*referral.ReferralCode, error) {
	if s.referrals == nil {
		return nil, errors.New("referral store unavailable")
	}
	if rc, err := s.referrals.GetCodeByUserID(ctx, userID); err == nil {
		return rc, nil
	}
	// generate a unique code with retries
	for attempt := 0; attempt < 5; attempt++ {
		code := generateReferralCode()
		rc, err := s.referrals.CreateCode(ctx, userID, code)
		if err == nil {
			return rc, nil
		}
		if !errors.Is(err, domain.ErrAlreadyExists) {
			return nil, err
		}
	}
	return nil, errors.New("could not generate a unique referral code")
}

// Apply — a new user signs up with a referrer's code. Creates the PENDING
// referral; idempotent per referred user (UNIQUE referred_user_id).
func (s *ReferralService) Apply(ctx context.Context, referredUserID uuid.UUID, code string) (*referral.Referral, error) {
	if strings.TrimSpace(code) == "" {
		return nil, fmt.Errorf("%w: referral code is required", domain.ErrInvalidInput)
	}
	rc, err := s.referrals.GetCode(ctx, strings.TrimSpace(strings.ToUpper(code)))
	if err != nil {
		return nil, fmt.Errorf("%w: invalid referral code", domain.ErrNotFound)
	}
	if rc.UserID == referredUserID {
		return nil, fmt.Errorf("%w: you cannot use your own referral code", domain.ErrInvalidInput)
	}
	ref := &referral.Referral{
		ReferrerUserID: rc.UserID,
		ReferredUserID: referredUserID,
		ReferralCodeID: rc.ID,
		RewardAmount:   ReferralRewardAmount,
		Status:         "PENDING",
	}
	if err := s.referrals.Create(ctx, ref); err != nil {
		if errors.Is(err, domain.ErrAlreadyExists) {
			return nil, fmt.Errorf("%w: this account was already referred", domain.ErrConflict)
		}
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &referredUserID, identity.AuditCreate, "referral",
		&ref.ID, nil, map[string]any{"referrer": rc.UserID.String(), "code": rc.Code}, nil, nil)
	return ref, nil
}

// QualifyOnOrderPaid — called by the payment service when an order becomes
// PAID. If the payer was referred, marks the referral QUALIFIED and credits
// the referrer's wallet (idempotent: only PENDING referrals qualify).
func (s *ReferralService) QualifyOnOrderPaid(ctx context.Context, userID, orderID uuid.UUID) error {
	if s.referrals == nil || s.wallets == nil {
		return nil
	}
	ref, err := s.referrals.GetByReferredUser(ctx, userID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil // not a referred user — nothing to do
		}
		return err
	}
	if ref.Status != "PENDING" {
		return nil // already qualified/rewarded — idempotent
	}
	if err := s.referrals.Qualify(ctx, ref.ID, orderID); err != nil {
		return err
	}
	// Wallet reward for the referrer.
	if _, err := s.wallets.GetOrCreate(ctx, ref.ReferrerUserID, "NGN"); err != nil {
		return err
	}
	if err := s.wallets.Credit(ctx, ref.ReferrerUserID, ref.RewardAmount); err != nil {
		return err
	}
	rw := &referral.Reward{
		ReferralID: ref.ID,
		UserID:     ref.ReferrerUserID,
		Amount:     ref.RewardAmount,
		Currency:   "NGN",
		Status:     "REWARDED",
	}
	if err := s.referrals.CreateReward(ctx, rw); err != nil {
		return err
	}
	if err := s.referrals.MarkRewarded(ctx, ref.ID); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &ref.ReferrerUserID, identity.AuditPayout, "referral_reward",
		&rw.ID, nil, map[string]any{"amount": rw.Amount, "currency": rw.Currency,
			"referred_user": userID.String(), "order_id": orderID.String()}, nil, nil)
	return nil
}

// ListMine — the user's sent referrals with statuses.
func (s *ReferralService) ListMine(ctx context.Context, userID uuid.UUID, limit int) ([]referral.Referral, error) {
	if s.referrals == nil {
		return []referral.Referral{}, nil
	}
	return s.referrals.ListByReferrer(ctx, userID, limit)
}

func generateReferralCode() string {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no confusing chars
	b := make([]byte, 8)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		if err != nil {
			b[i] = 'X'
			continue
		}
		b[i] = alphabet[n.Int64()]
	}
	return string(b)
}

// --- Institutions (B2B) ---

type InstitutionService struct {
	institutions institution.InstitutionRepository
	audit        identity.AuditService
	now          func() time.Time
}

func NewInstitutionService(inst institution.InstitutionRepository, audit identity.AuditService) *InstitutionService {
	return &InstitutionService{institutions: inst, audit: audit, now: time.Now}
}

type CreateInstitutionInput struct {
	Name        string
	Type        institution.InstitutionType
	Email       *string
	Phone       *string
	Website     *string
	Description *string
	OwnerUserID *uuid.UUID
}

// Create — public B2B lead → institution account (+ OWNER membership when a
// signed-in user submitted the form).
func (s *InstitutionService) Create(ctx context.Context, in CreateInstitutionInput) (*institution.Institution, error) {
	if strings.TrimSpace(in.Name) == "" {
		return nil, fmt.Errorf("%w: institution name is required", domain.ErrInvalidInput)
	}
	if in.Type == "" {
		in.Type = institution.TypeSchool
	}
	if s.institutions == nil {
		return nil, errors.New("institution store unavailable")
	}
	inst := &institution.Institution{
		Name:        strings.TrimSpace(in.Name),
		Slug:        slugify(in.Name),
		Type:        in.Type,
		Email:       in.Email,
		Phone:       in.Phone,
		Website:     in.Website,
		Description: in.Description,
		IsActive:    true,
	}
	if err := s.institutions.Create(ctx, inst); err != nil {
		return nil, err
	}
	if in.OwnerUserID != nil {
		if err := s.institutions.AddMembership(ctx, &institution.Membership{
			InstitutionID: inst.ID,
			UserID:        *in.OwnerUserID,
			Role:          institution.RoleOwner,
		}); err != nil {
			return nil, err
		}
	}
	_ = s.audit.LogStateChange(ctx, in.OwnerUserID, identity.AuditCreate, "institution",
		&inst.ID, nil, map[string]any{"name": inst.Name, "type": inst.Type, "slug": inst.Slug}, nil, nil)
	return inst, nil
}
