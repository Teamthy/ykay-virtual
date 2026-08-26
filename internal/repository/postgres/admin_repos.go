package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/content"
	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/domain/review"

	"github.com/google/uuid"
)

// Admin read/write repos for the operations console (Phase 11).

// --- Blog admin ---

type AdminBlogRepo struct{ db TxQuerier }

func NewAdminBlogRepo(db TxQuerier) *AdminBlogRepo { return &AdminBlogRepo{db: db} }

func (r *AdminBlogRepo) Create(ctx context.Context, p *content.BlogPost) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_key, author_user_id,
			status, seo_title, seo_description, canonical_url, scheduled_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING id, created_at, updated_at`,
		p.Title, p.Slug, p.Excerpt, p.Content, p.CoverImageKey, p.AuthorUserID,
		p.Status, p.SeoTitle, p.SeoDescription, p.CanonicalURL, p.ScheduledAt,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("%w: slug already exists", domain.ErrAlreadyExists)
		}
		return fmt.Errorf("create blog post: %w", err)
	}
	return nil
}

func (r *AdminBlogRepo) Update(ctx context.Context, p *content.BlogPost) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE blog_posts SET title=$1, slug=$2, excerpt=$3, content=$4, cover_image_key=$5,
			seo_title=$6, seo_description=$7, canonical_url=$8, status=$9, scheduled_at=$10,
			published_at=CASE WHEN $9='PUBLISHED' AND published_at IS NULL THEN NOW() ELSE published_at END,
			updated_at=NOW()
		WHERE id=$11`,
		p.Title, p.Slug, p.Excerpt, p.Content, p.CoverImageKey,
		p.SeoTitle, p.SeoDescription, p.CanonicalURL, p.Status, p.ScheduledAt, p.ID)
	if err != nil {
		return fmt.Errorf("update blog post: %w", err)
	}
	return nil
}

func (r *AdminBlogRepo) SetStatus(ctx context.Context, id uuid.UUID, status content.ContentStatus) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE blog_posts SET status=$1,
			published_at=CASE WHEN $1='PUBLISHED' AND published_at IS NULL THEN NOW() ELSE published_at END,
			updated_at=NOW()
		WHERE id=$2`, status, id)
	if err != nil {
		return fmt.Errorf("set blog status: %w", err)
	}
	return nil
}

func (r *AdminBlogRepo) GetByID(ctx context.Context, id uuid.UUID) (*content.BlogPost, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+blogColumns+" FROM blog_posts p WHERE p.id = $1", id)
	b, err := scanBlogPost(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return b, nil
}

var adminBlogSortWhitelist = map[string]string{
	"newest":  "p.created_at DESC",
	"updated": "p.updated_at DESC",
	"title":   "p.title ASC",
}

func (r *AdminBlogRepo) ListAll(ctx context.Context, params content.BlogListAllParams) ([]content.BlogPost, int64, error) {
	var conds []string
	var args []any
	if params.Status != "" {
		conds = append(conds, fmt.Sprintf("p.status = $%d", len(args)+1))
		args = append(args, params.Status)
	}
	if params.Search != "" {
		conds = append(conds, fmt.Sprintf("(p.title ILIKE $%d OR p.slug ILIKE $%d)", len(args)+1, len(args)+1))
		args = append(args, "%"+params.Search+"%")
	}
	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM blog_posts p"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count posts: %w", err)
	}
	order := adminBlogSortWhitelist[params.Sort]
	if order == "" {
		order = "p.created_at DESC"
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
	rows, err := r.db.QueryContext(ctx,
		"SELECT "+blogColumns+" FROM blog_posts p"+where+" ORDER BY "+order+
			" LIMIT $"+fmt.Sprint(len(args)+1)+" OFFSET $"+fmt.Sprint(len(args)+2),
		append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list posts: %w", err)
	}
	defer rows.Close()
	out := []content.BlogPost{}
	for rows.Next() {
		b, err := scanBlogPost(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *b)
	}
	return out, total, rows.Err()
}

func (r *AdminBlogRepo) SetTags(ctx context.Context, postID uuid.UUID, subjectIDs, examIDs []uuid.UUID) error {
	if _, err := r.db.ExecContext(ctx, "DELETE FROM blog_post_subjects WHERE blog_post_id = $1", postID); err != nil {
		return fmt.Errorf("clear subject tags: %w", err)
	}
	if _, err := r.db.ExecContext(ctx, "DELETE FROM blog_post_exams WHERE blog_post_id = $1", postID); err != nil {
		return fmt.Errorf("clear exam tags: %w", err)
	}
	for _, sid := range subjectIDs {
		if _, err := r.db.ExecContext(ctx,
			"INSERT INTO blog_post_subjects (blog_post_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
			postID, sid); err != nil {
			return fmt.Errorf("tag subject: %w", err)
		}
	}
	for _, eid := range examIDs {
		if _, err := r.db.ExecContext(ctx,
			"INSERT INTO blog_post_exams (blog_post_id, exam_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
			postID, eid); err != nil {
			return fmt.Errorf("tag exam: %w", err)
		}
	}
	return nil
}

func (r *AdminBlogRepo) GetTags(ctx context.Context, postID uuid.UUID) (content.PostTags, error) {
	return r.tagsForOne(ctx, postID)
}

func (r *AdminBlogRepo) tagsForOne(ctx context.Context, postID uuid.UUID) (content.PostTags, error) {
	var out content.PostTags
	rows, err := r.db.QueryContext(ctx, `
		SELECT s.slug FROM blog_post_subjects bps JOIN subjects s ON s.id = bps.subject_id
		WHERE bps.blog_post_id = $1`, postID)
	if err != nil {
		return out, err
	}
	defer rows.Close()
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			return out, err
		}
		out.SubjectSlugs = append(out.SubjectSlugs, slug)
	}
	rows2, err := r.db.QueryContext(ctx, `
		SELECT e.slug FROM blog_post_exams bpe JOIN exams e ON e.id = bpe.exam_id
		WHERE bpe.blog_post_id = $1`, postID)
	if err != nil {
		return out, err
	}
	defer rows2.Close()
	for rows2.Next() {
		var slug string
		if err := rows2.Scan(&slug); err != nil {
			return out, err
		}
		out.ExamSlugs = append(out.ExamSlugs, slug)
	}
	return out, rows2.Err()
}

var _ content.AdminBlogRepository = (*AdminBlogRepo)(nil)

// --- Institutions ---

type InstitutionRepo struct{ db TxQuerier }

func NewInstitutionRepo(db TxQuerier) *InstitutionRepo { return &InstitutionRepo{db: db} }

const institutionColumns = `id, name, slug, type, email, phone, website, location_id, logo_url,
	description, verified_at, is_active, created_at, updated_at`

func scanInstitution(row interface{ Scan(...any) error }) (*institution.Institution, error) {
	var i institution.Institution
	var email, phone, website, logo, desc sql.NullString
	var locID uuidNull
	var verifiedAt sql.NullTime
	if err := row.Scan(&i.ID, &i.Name, &i.Slug, &i.Type, &email, &phone, &website, &locID, &logo,
		&desc, &verifiedAt, &i.IsActive, &i.CreatedAt, &i.UpdatedAt); err != nil {
		return nil, err
	}
	if email.Valid {
		i.Email = &email.String
	}
	if phone.Valid {
		i.Phone = &phone.String
	}
	if website.Valid {
		i.Website = &website.String
	}
	if locID.Valid {
		i.LocationID = &locID.UUID
	}
	if logo.Valid {
		i.LogoURL = &logo.String
	}
	if desc.Valid {
		i.Description = &desc.String
	}
	if verifiedAt.Valid {
		i.VerifiedAt = &verifiedAt.Time
	}
	return &i, nil
}

func (r *InstitutionRepo) List(ctx context.Context, params institution.InstitutionListParams) ([]institution.Institution, int64, error) {
	var conds []string
	var args []any
	if params.Search != "" {
		conds = append(conds, fmt.Sprintf("(name ILIKE $%d OR slug ILIKE $%d)", len(args)+1, len(args)+1))
		args = append(args, "%"+params.Search+"%")
	}
	if params.Type != "" {
		conds = append(conds, fmt.Sprintf("type = $%d", len(args)+1))
		args = append(args, params.Type)
	}
	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM institutions"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count institutions: %w", err)
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
	order := "created_at DESC"
	if params.Sort == "name" {
		order = "name ASC"
	}
	rows, err := r.db.QueryContext(ctx,
		"SELECT "+institutionColumns+" FROM institutions"+where+" ORDER BY "+order+
			" LIMIT $"+fmt.Sprint(len(args)+1)+" OFFSET $"+fmt.Sprint(len(args)+2),
		append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list institutions: %w", err)
	}
	defer rows.Close()
	out := []institution.Institution{}
	for rows.Next() {
		i, err := scanInstitution(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *i)
	}
	return out, total, rows.Err()
}

func (r *InstitutionRepo) GetByID(ctx context.Context, id uuid.UUID) (*institution.Institution, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+institutionColumns+" FROM institutions WHERE id = $1", id)
	i, err := scanInstitution(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return i, nil
}

func (r *InstitutionRepo) GetBySlug(ctx context.Context, slug string) (*institution.Institution, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+institutionColumns+" FROM institutions WHERE slug = $1", slug)
	i, err := scanInstitution(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return i, nil
}

func (r *InstitutionRepo) Update(ctx context.Context, i *institution.Institution) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE institutions SET name = $1, type = $2, email = $3, phone = $4, website = $5,
			logo_url = $6, description = $7, updated_at = NOW()
		WHERE id = $8`,
		i.Name, i.Type, i.Email, i.Phone, i.Website, i.LogoURL, i.Description, i.ID)
	if err != nil {
		return fmt.Errorf("update institution: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *InstitutionRepo) SetActive(ctx context.Context, id uuid.UUID, active bool) error {
	res, err := r.db.ExecContext(ctx, `UPDATE institutions SET is_active = $2, updated_at = NOW() WHERE id = $1`, id, active)
	if err != nil {
		return fmt.Errorf("set institution active: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *InstitutionRepo) SetVerified(ctx context.Context, id uuid.UUID, verifiedAt *time.Time) error {
	res, err := r.db.ExecContext(ctx, `UPDATE institutions SET verified_at = $2, updated_at = NOW() WHERE id = $1`, id, verifiedAt)
	if err != nil {
		return fmt.Errorf("set institution verified: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// --- Memberships ---

func (r *InstitutionRepo) GetMembership(ctx context.Context, institutionID, userID uuid.UUID) (*institution.Membership, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, institution_id, user_id, role, invited_by, joined_at, created_at
		FROM institution_memberships WHERE institution_id = $1 AND user_id = $2`,
		institutionID, userID)
	m, err := scanMembership(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return m, nil
}

func (r *InstitutionRepo) ListMemberships(ctx context.Context, institutionID uuid.UUID) ([]institution.Membership, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, institution_id, user_id, role, invited_by, joined_at, created_at
		FROM institution_memberships WHERE institution_id = $1 ORDER BY created_at ASC`, institutionID)
	if err != nil {
		return nil, fmt.Errorf("list institution memberships: %w", err)
	}
	defer rows.Close()
	out := []institution.Membership{}
	for rows.Next() {
		m, err := scanMembership(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *m)
	}
	return out, rows.Err()
}

func (r *InstitutionRepo) ListMembershipsByUser(ctx context.Context, userID uuid.UUID) ([]institution.Membership, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, institution_id, user_id, role, invited_by, joined_at, created_at
		FROM institution_memberships WHERE user_id = $1 ORDER BY created_at ASC`, userID)
	if err != nil {
		return nil, fmt.Errorf("list user institution memberships: %w", err)
	}
	defer rows.Close()
	out := []institution.Membership{}
	for rows.Next() {
		m, err := scanMembership(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *m)
	}
	return out, rows.Err()
}

func (r *InstitutionRepo) SetMembershipRole(ctx context.Context, institutionID, userID uuid.UUID, role institution.MembershipRole) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE institution_memberships SET role = $3 WHERE institution_id = $1 AND user_id = $2`,
		institutionID, userID, role)
	if err != nil {
		return fmt.Errorf("set membership role: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *InstitutionRepo) RemoveMembership(ctx context.Context, institutionID, userID uuid.UUID) error {
	res, err := r.db.ExecContext(ctx,
		`DELETE FROM institution_memberships WHERE institution_id = $1 AND user_id = $2`, institutionID, userID)
	if err != nil {
		return fmt.Errorf("remove membership: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func scanMembership(row interface{ Scan(...any) error }) (*institution.Membership, error) {
	var m institution.Membership
	var invitedBy uuidNull
	var joinedAt sql.NullTime
	if err := row.Scan(&m.ID, &m.InstitutionID, &m.UserID, &m.Role, &invitedBy, &joinedAt, &m.CreatedAt); err != nil {
		return nil, err
	}
	if invitedBy.Valid {
		m.InvitedBy = &invitedBy.UUID
	}
	if joinedAt.Valid {
		t := joinedAt.Time
		m.JoinedAt = &t
	}
	return &m, nil
}

// --- Linked students ---

func (r *InstitutionRepo) ListStudents(ctx context.Context, institutionID uuid.UUID) ([]institution.InstitutionStudent, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, institution_id, student_profile_id, enrollment_ref, created_at
		FROM institution_students WHERE institution_id = $1 ORDER BY created_at ASC`, institutionID)
	if err != nil {
		return nil, fmt.Errorf("list institution students: %w", err)
	}
	defer rows.Close()
	out := []institution.InstitutionStudent{}
	for rows.Next() {
		s := institution.InstitutionStudent{}
		var ref sql.NullString
		if err := rows.Scan(&s.ID, &s.InstitutionID, &s.StudentProfileID, &ref, &s.CreatedAt); err != nil {
			return nil, err
		}
		if ref.Valid {
			s.EnrollmentRef = &ref.String
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *InstitutionRepo) AddStudent(ctx context.Context, s *institution.InstitutionStudent) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO institution_students (institution_id, student_profile_id, enrollment_ref)
		VALUES ($1,$2,$3) ON CONFLICT (institution_id, student_profile_id) DO NOTHING
		RETURNING id, created_at`,
		s.InstitutionID, s.StudentProfileID, s.EnrollmentRef).Scan(&s.ID, &s.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.ErrAlreadyExists // already linked
		}
		return fmt.Errorf("add institution student: %w", err)
	}
	return nil
}

func (r *InstitutionRepo) RemoveStudent(ctx context.Context, institutionID, studentProfileID uuid.UUID) error {
	res, err := r.db.ExecContext(ctx,
		`DELETE FROM institution_students WHERE institution_id = $1 AND student_profile_id = $2`,
		institutionID, studentProfileID)
	if err != nil {
		return fmt.Errorf("remove institution student: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

var _ institution.InstitutionRepository = (*InstitutionRepo)(nil)

// --- Reviews ---

type ReviewRepo struct{ db TxQuerier }

func NewReviewRepo(db TxQuerier) *ReviewRepo { return &ReviewRepo{db: db} }

func (r *ReviewRepo) List(ctx context.Context, params review.ReviewListParams) ([]review.Review, int64, error) {
	var conds []string
	var args []any
	if params.Status != "" {
		conds = append(conds, fmt.Sprintf("status = $%d", len(args)+1))
		args = append(args, params.Status)
	}
	if params.TutorID != nil {
		conds = append(conds, fmt.Sprintf("tutor_profile_id = $%d", len(args)+1))
		args = append(args, *params.TutorID)
	}
	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM reviews"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count reviews: %w", err)
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
		SELECT id, booking_id, cohort_enrollment_id, reviewer_user_id, tutor_profile_id, rating,
			title, comment, status, is_public, consent_given, moderated_by, moderated_at, created_at, updated_at
		FROM reviews`+where+` ORDER BY created_at DESC LIMIT $`+fmt.Sprint(len(args)+1)+` OFFSET $`+fmt.Sprint(len(args)+2),
		append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list reviews: %w", err)
	}
	defer rows.Close()
	out := []review.Review{}
	for rows.Next() {
		var rv review.Review
		var bookingID, cohortID, moderatedBy uuidNull
		var title, comment sql.NullString
		var moderatedAt sql.NullTime
		if err := rows.Scan(&rv.ID, &bookingID, &cohortID, &rv.ReviewerUserID, &rv.TutorProfileID, &rv.Rating,
			&title, &comment, &rv.Status, &rv.IsPublic, &rv.ConsentGiven, &moderatedBy, &moderatedAt,
			&rv.CreatedAt, &rv.UpdatedAt); err != nil {
			return nil, 0, err
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
		out = append(out, rv)
	}
	return out, total, rows.Err()
}

func (r *ReviewRepo) GetByID(ctx context.Context, id uuid.UUID) (*review.Review, error) {
	var rv review.Review
	var bookingID, cohortID, moderatedBy uuidNull
	var title, comment sql.NullString
	var moderatedAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, booking_id, cohort_enrollment_id, reviewer_user_id, tutor_profile_id, rating,
			title, comment, status, is_public, consent_given, moderated_by, moderated_at, created_at, updated_at
		FROM reviews WHERE id = $1`, id).
		Scan(&rv.ID, &bookingID, &cohortID, &rv.ReviewerUserID, &rv.TutorProfileID, &rv.Rating,
			&title, &comment, &rv.Status, &rv.IsPublic, &rv.ConsentGiven, &moderatedBy, &moderatedAt,
			&rv.CreatedAt, &rv.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
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

func (r *ReviewRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status review.ReviewStatus, moderatedBy *uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE reviews SET status = $1, moderated_by = $2, moderated_at = NOW(),
			is_public = CASE WHEN $1='PUBLISHED' THEN TRUE ELSE is_public END,
			updated_at = NOW()
		WHERE id = $3`, status, moderatedBy, id)
	if err != nil {
		return fmt.Errorf("update review status: %w", err)
	}
	return nil
}

func (r *ReviewRepo) CountByStatus(ctx context.Context, status review.ReviewStatus) (int64, error) {
	var n int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM reviews WHERE status = $1", status).Scan(&n); err != nil {
		return 0, fmt.Errorf("count reviews: %w", err)
	}
	return n, nil
}

var _ review.ReviewRepository = (*ReviewRepo)(nil)

var _ = time.Now
