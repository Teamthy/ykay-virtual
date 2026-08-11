package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/domain/referral"
	"ykay-virtual/internal/domain/review"

	"github.com/google/uuid"
)

// Growth repos — reviews, referrals, institutions (Phase 10).

// scanReviewRow — shared review row scanner (15 columns).
func scanReviewRow(row interface{ Scan(...any) error }) (*review.Review, error) {
	var rv review.Review
	var bookingID, cohortID, moderatedBy uuidNull
	var title, comment sql.NullString
	var moderatedAt sql.NullTime
	if err := row.Scan(&rv.ID, &bookingID, &cohortID, &rv.ReviewerUserID, &rv.TutorProfileID, &rv.Rating,
		&title, &comment, &rv.Status, &rv.IsPublic, &rv.ConsentGiven, &moderatedBy, &moderatedAt,
		&rv.CreatedAt, &rv.UpdatedAt); err != nil {
		return nil, err
	}
	if bookingID.Valid {
		rv.BookingID = &bookingID.UUID
	}
	if cohortID.Valid {
		rv.CohortEnrollmentID = &cohortID.UUID
	}
	if moderatedBy.Valid {
		rv.ModeratedBy = &moderatedBy.UUID
	}
	if title.Valid {
		rv.Title = &title.String
	}
	if comment.Valid {
		rv.Comment = &comment.String
	}
	if moderatedAt.Valid {
		rv.ModeratedAt = &moderatedAt.Time
	}
	return &rv, nil
}

// --- Reviews (extends ReviewRepo in admin_repos.go) ---

func (r *ReviewRepo) Create(ctx context.Context, rv *review.Review) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO reviews (booking_id, cohort_enrollment_id, reviewer_user_id, tutor_profile_id,
			rating, title, comment, status, is_public, consent_given)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, created_at, updated_at`,
		rv.BookingID, rv.CohortEnrollmentID, rv.ReviewerUserID, rv.TutorProfileID,
		rv.Rating, rv.Title, rv.Comment, rv.Status, rv.IsPublic, rv.ConsentGiven,
	).Scan(&rv.ID, &rv.CreatedAt, &rv.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create review: %w", err)
	}
	return nil
}

func (r *ReviewRepo) ListPublishedByTutor(ctx context.Context, tutorProfileID uuid.UUID, limit int) ([]review.Review, error) {
	if limit < 1 || limit > 50 {
		limit = 20
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, booking_id, cohort_enrollment_id, reviewer_user_id, tutor_profile_id, rating,
			title, comment, status, is_public, consent_given, moderated_by, moderated_at, created_at, updated_at
		FROM reviews
		WHERE tutor_profile_id = $1 AND status = 'PUBLISHED' AND is_public = TRUE AND consent_given = TRUE
		ORDER BY created_at DESC LIMIT $2`, tutorProfileID, limit)
	if err != nil {
		return nil, fmt.Errorf("list published reviews: %w", err)
	}
	defer rows.Close()
	out := []review.Review{}
	for rows.Next() {
		rv, err := scanReviewRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *rv)
	}
	return out, rows.Err()
}

func (r *ReviewRepo) ExistsForReviewer(ctx context.Context, reviewerUserID, tutorProfileID uuid.UUID) (bool, error) {
	var one int
	err := r.db.QueryRowContext(ctx, `
		SELECT 1 FROM reviews WHERE reviewer_user_id = $1 AND tutor_profile_id = $2 LIMIT 1`,
		reviewerUserID, tutorProfileID).Scan(&one)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("check review exists: %w", err)
	}
	return true, nil
}

func (r *ReviewRepo) RecomputeTutorRating(ctx context.Context, tutorProfileID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE tutor_profiles t SET
			rating_avg = COALESCE((
				SELECT AVG(rating)::numeric(3,2) FROM reviews
				WHERE tutor_profile_id = $1 AND status = 'PUBLISHED'
				  AND is_public = TRUE AND consent_given = TRUE
			), 0),
			rating_count = (
				SELECT COUNT(*) FROM reviews
				WHERE tutor_profile_id = $1 AND status = 'PUBLISHED'
				  AND is_public = TRUE AND consent_given = TRUE
			),
			updated_at = NOW()
		WHERE t.id = $1`, tutorProfileID)
	if err != nil {
		return fmt.Errorf("recompute tutor rating: %w", err)
	}
	return nil
}

var _ review.ReviewRepository = (*ReviewRepo)(nil)

// --- Referrals ---

type ReferralRepo struct{ db TxQuerier }

func NewReferralRepo(db TxQuerier) *ReferralRepo { return &ReferralRepo{db: db} }

func (r *ReferralRepo) CreateCode(ctx context.Context, userID uuid.UUID, code string) (*referral.ReferralCode, error) {
	var rc referral.ReferralCode
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO referral_codes (user_id, code) VALUES ($1,$2)
		ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
		RETURNING id, user_id, code, is_active, created_at`, userID, code).
		Scan(&rc.ID, &rc.UserID, &rc.Code, &rc.IsActive, &rc.CreatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			// code collision — retry with a fresh code (service handles).
			return nil, domain.ErrAlreadyExists
		}
		return nil, fmt.Errorf("create referral code: %w", err)
	}
	return &rc, nil
}

func (r *ReferralRepo) GetCodeByUserID(ctx context.Context, userID uuid.UUID) (*referral.ReferralCode, error) {
	var rc referral.ReferralCode
	err := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, code, is_active, created_at FROM referral_codes WHERE user_id = $1`, userID).
		Scan(&rc.ID, &rc.UserID, &rc.Code, &rc.IsActive, &rc.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &rc, nil
}

func (r *ReferralRepo) GetCode(ctx context.Context, code string) (*referral.ReferralCode, error) {
	var rc referral.ReferralCode
	err := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, code, is_active, created_at FROM referral_codes WHERE code = $1`, code).
		Scan(&rc.ID, &rc.UserID, &rc.Code, &rc.IsActive, &rc.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &rc, nil
}

func (r *ReferralRepo) Create(ctx context.Context, ref *referral.Referral) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO referrals (referrer_user_id, referred_user_id, referral_code_id, reward_amount, status)
		VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
		ref.ReferrerUserID, ref.ReferredUserID, ref.ReferralCodeID, ref.RewardAmount, ref.Status,
	).Scan(&ref.ID, &ref.CreatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("%w: user already has a referral", domain.ErrAlreadyExists)
		}
		return fmt.Errorf("create referral: %w", err)
	}
	return nil
}

func (r *ReferralRepo) GetByReferredUser(ctx context.Context, referredUserID uuid.UUID) (*referral.Referral, error) {
	var ref referral.Referral
	var orderID uuidNull
	var qualifiedAt, rewardedAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, referrer_user_id, referred_user_id, referral_code_id, order_id,
			reward_amount, status, qualified_at, rewarded_at, created_at
		FROM referrals WHERE referred_user_id = $1`, referredUserID).
		Scan(&ref.ID, &ref.ReferrerUserID, &ref.ReferredUserID, &ref.ReferralCodeID, &orderID,
			&ref.RewardAmount, &ref.Status, &qualifiedAt, &rewardedAt, &ref.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if orderID.Valid {
		ref.OrderID = &orderID.UUID
	}
	if qualifiedAt.Valid {
		ref.QualifiedAt = &qualifiedAt.Time
	}
	if rewardedAt.Valid {
		ref.RewardedAt = &rewardedAt.Time
	}
	return &ref, nil
}

func (r *ReferralRepo) Qualify(ctx context.Context, referralID, orderID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE referrals SET status = 'QUALIFIED', order_id = $2, qualified_at = NOW()
		WHERE id = $1 AND status = 'PENDING'`, referralID, orderID)
	if err != nil {
		return fmt.Errorf("qualify referral: %w", err)
	}
	return nil
}

func (r *ReferralRepo) MarkRewarded(ctx context.Context, referralID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE referrals SET status = 'REWARDED', rewarded_at = NOW()
		WHERE id = $1`, referralID)
	if err != nil {
		return fmt.Errorf("mark referral rewarded: %w", err)
	}
	return nil
}

func (r *ReferralRepo) ListByReferrer(ctx context.Context, referrerUserID uuid.UUID, limit int) ([]referral.Referral, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, referrer_user_id, referred_user_id, referral_code_id, order_id,
			reward_amount, status, qualified_at, rewarded_at, created_at
		FROM referrals WHERE referrer_user_id = $1 ORDER BY created_at DESC LIMIT $2`, referrerUserID, limit)
	if err != nil {
		return nil, fmt.Errorf("list referrals: %w", err)
	}
	defer rows.Close()
	out := []referral.Referral{}
	for rows.Next() {
		var ref referral.Referral
		var orderID uuidNull
		var qualifiedAt, rewardedAt sql.NullTime
		if err := rows.Scan(&ref.ID, &ref.ReferrerUserID, &ref.ReferredUserID, &ref.ReferralCodeID, &orderID,
			&ref.RewardAmount, &ref.Status, &qualifiedAt, &rewardedAt, &ref.CreatedAt); err != nil {
			return nil, err
		}
		if orderID.Valid {
			ref.OrderID = &orderID.UUID
		}
		if qualifiedAt.Valid {
			ref.QualifiedAt = &qualifiedAt.Time
		}
		if rewardedAt.Valid {
			ref.RewardedAt = &rewardedAt.Time
		}
		out = append(out, ref)
	}
	return out, rows.Err()
}

func (r *ReferralRepo) CreateReward(ctx context.Context, rw *referral.Reward) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO referral_rewards (referral_id, user_id, amount, currency, status)
		VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
		rw.ReferralID, rw.UserID, rw.Amount, rw.Currency, rw.Status,
	).Scan(&rw.ID, &rw.CreatedAt)
	if err != nil {
		return fmt.Errorf("create referral reward: %w", err)
	}
	return nil
}

func (r *ReferralRepo) GetRewardByReferral(ctx context.Context, referralID uuid.UUID) (*referral.Reward, error) {
	var rw referral.Reward
	var processedAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, referral_id, user_id, amount, currency, status, processed_at, created_at
		FROM referral_rewards WHERE referral_id = $1`, referralID).
		Scan(&rw.ID, &rw.ReferralID, &rw.UserID, &rw.Amount, &rw.Currency, &rw.Status, &processedAt, &rw.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if processedAt.Valid {
		rw.ProcessedAt = &processedAt.Time
	}
	return &rw, nil
}

func (r *ReferralRepo) List(ctx context.Context, params referral.ReferralListParams) ([]referral.Referral, int64, error) {
	where := ""
	args := []any{}
	if params.Status != "" {
		where = " WHERE status = $1"
		args = append(args, params.Status)
	}
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM referrals"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count referrals: %w", err)
	}
	limit := params.PageSize
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	offset := (params.Page - 1) * limit
	if offset < 0 {
		offset = 0
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, referrer_user_id, referred_user_id, referral_code_id, order_id,
			reward_amount, status, qualified_at, rewarded_at, created_at
		FROM referrals`+where+` ORDER BY created_at DESC LIMIT $`+fmt.Sprint(len(args)+1)+` OFFSET $`+fmt.Sprint(len(args)+2),
		append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list referrals: %w", err)
	}
	defer rows.Close()
	out := []referral.Referral{}
	for rows.Next() {
		var ref referral.Referral
		var orderID uuidNull
		var qualifiedAt, rewardedAt sql.NullTime
		if err := rows.Scan(&ref.ID, &ref.ReferrerUserID, &ref.ReferredUserID, &ref.ReferralCodeID, &orderID,
			&ref.RewardAmount, &ref.Status, &qualifiedAt, &rewardedAt, &ref.CreatedAt); err != nil {
			return nil, 0, err
		}
		if orderID.Valid {
			ref.OrderID = &orderID.UUID
		}
		if qualifiedAt.Valid {
			ref.QualifiedAt = &qualifiedAt.Time
		}
		if rewardedAt.Valid {
			ref.RewardedAt = &rewardedAt.Time
		}
		out = append(out, ref)
	}
	return out, total, rows.Err()
}

func (r *ReferralRepo) Count(ctx context.Context) (int64, error) {
	var n int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM referrals").Scan(&n); err != nil {
		return 0, fmt.Errorf("count referrals: %w", err)
	}
	return n, nil
}

var _ referral.ReferralRepository = (*ReferralRepo)(nil)

// --- Institutions (extends InstitutionRepo in admin_repos.go) ---

func (r *InstitutionRepo) Create(ctx context.Context, i *institution.Institution) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO institutions (name, slug, type, email, phone, website, description, is_active)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, created_at, updated_at`,
		i.Name, i.Slug, i.Type, i.Email, i.Phone, i.Website, i.Description, i.IsActive,
	).Scan(&i.ID, &i.CreatedAt, &i.UpdatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("%w: institution slug already exists", domain.ErrAlreadyExists)
		}
		return fmt.Errorf("create institution: %w", err)
	}
	return nil
}

func (r *InstitutionRepo) AddMembership(ctx context.Context, m *institution.Membership) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO institution_memberships (institution_id, user_id, role, invited_by, joined_at)
		VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT (institution_id, user_id) DO NOTHING RETURNING id, created_at`,
		m.InstitutionID, m.UserID, m.Role, m.InvitedBy,
	).Scan(&m.ID, &m.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil // already a member
		}
		return fmt.Errorf("add institution membership: %w", err)
	}
	return nil
}

var _ institution.InstitutionRepository = (*InstitutionRepo)(nil)

var _ = time.Now
