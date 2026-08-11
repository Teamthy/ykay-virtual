package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/content"

	"github.com/google/uuid"
)

// BlogRepo + RedirectRepo — content engine persistence (000010_content,
// 000009_review_referral redirect_map).

type BlogRepo struct{ db TxQuerier }

func NewBlogRepo(db TxQuerier) *BlogRepo { return &BlogRepo{db: db} }

const blogColumns = `p.id, p.title, p.slug, p.excerpt, p.content, p.cover_image_key,
	p.author_user_id, p.status, p.seo_title, p.seo_description, p.canonical_url,
	p.published_at, p.scheduled_at, p.view_count, p.created_at, p.updated_at`

func scanBlogPost(row interface{ Scan(...any) error }) (*content.BlogPost, error) {
	var b content.BlogPost
	var excerpt, cover, seoTitle, seoDesc, canonical sql.NullString
	var author uuidNull
	var publishedAt, scheduledAt sql.NullTime
	if err := row.Scan(&b.ID, &b.Title, &b.Slug, &excerpt, &b.Content, &cover,
		&author, &b.Status, &seoTitle, &seoDesc, &canonical,
		&publishedAt, &scheduledAt, &b.ViewCount, &b.CreatedAt, &b.UpdatedAt); err != nil {
		return nil, err
	}
	if excerpt.Valid {
		b.Excerpt = &excerpt.String
	}
	if cover.Valid {
		b.CoverImageKey = &cover.String
	}
	if author.Valid {
		b.AuthorUserID = &author.UUID
	}
	if seoTitle.Valid {
		b.SeoTitle = &seoTitle.String
	}
	if seoDesc.Valid {
		b.SeoDescription = &seoDesc.String
	}
	if canonical.Valid {
		b.CanonicalURL = &canonical.String
	}
	if publishedAt.Valid {
		b.PublishedAt = &publishedAt.Time
	}
	if scheduledAt.Valid {
		b.ScheduledAt = &scheduledAt.Time
	}
	return &b, nil
}

var blogSortWhitelist = map[string]string{
	"newest":  "p.published_at DESC",
	"-newest": "p.published_at ASC",
	"views":   "p.view_count DESC",
}

func (r *BlogRepo) ListPublished(ctx context.Context, params content.BlogListParams) ([]content.BlogPost, int64, error) {
	var conds []string
	var args []any
	conds = append(conds, "p.status = 'PUBLISHED'")
	if params.Subject != "" {
		conds = append(conds, fmt.Sprintf(`EXISTS (SELECT 1 FROM blog_post_subjects bps
			JOIN subjects s ON s.id = bps.subject_id WHERE bps.blog_post_id = p.id AND s.slug = $%d)`, len(args)+1))
		args = append(args, params.Subject)
	}
	if params.Exam != "" {
		conds = append(conds, fmt.Sprintf(`EXISTS (SELECT 1 FROM blog_post_exams bpe
			JOIN exams e ON e.id = bpe.exam_id WHERE bpe.blog_post_id = p.id AND e.slug = $%d)`, len(args)+1))
		args = append(args, params.Exam)
	}
	where := " WHERE " + strings.Join(conds, " AND ")

	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM blog_posts p"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count posts: %w", err)
	}

	order := blogSortWhitelist[params.Sort]
	if order == "" {
		order = "p.published_at DESC"
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

func (r *BlogRepo) GetPublishedBySlug(ctx context.Context, slug string) (*content.BlogPost, error) {
	row := r.db.QueryRowContext(ctx,
		"SELECT "+blogColumns+" FROM blog_posts p WHERE p.slug = $1 AND p.status = 'PUBLISHED'", slug)
	b, err := scanBlogPost(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return b, nil
}

func (r *BlogRepo) TagsForPosts(ctx context.Context, postIDs []uuid.UUID) (map[uuid.UUID]content.PostTags, error) {
	out := map[uuid.UUID]content.PostTags{}
	if len(postIDs) == 0 {
		return out, nil
	}
	ids := make([]string, 0, len(postIDs))
	for _, id := range postIDs {
		ids = append(ids, "'"+id.String()+"'")
	}
	in := strings.Join(ids, ",")

	rows, err := r.db.QueryContext(ctx, `
		SELECT bps.blog_post_id, s.slug FROM blog_post_subjects bps
		JOIN subjects s ON s.id = bps.subject_id
		WHERE bps.blog_post_id IN (`+in+`)`)
	if err != nil {
		return nil, fmt.Errorf("tags subjects: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var postID uuid.UUID
		var slug string
		if err := rows.Scan(&postID, &slug); err != nil {
			return nil, err
		}
		t := out[postID]
		t.SubjectSlugs = append(t.SubjectSlugs, slug)
		out[postID] = t
	}
	rows2, err := r.db.QueryContext(ctx, `
		SELECT bpe.blog_post_id, e.slug FROM blog_post_exams bpe
		JOIN exams e ON e.id = bpe.exam_id
		WHERE bpe.blog_post_id IN (`+in+`)`)
	if err != nil {
		return nil, fmt.Errorf("tags exams: %w", err)
	}
	defer rows2.Close()
	for rows2.Next() {
		var postID uuid.UUID
		var slug string
		if err := rows2.Scan(&postID, &slug); err != nil {
			return nil, err
		}
		t := out[postID]
		t.ExamSlugs = append(t.ExamSlugs, slug)
		out[postID] = t
	}
	return out, rows2.Err()
}

func (r *BlogRepo) RelatedBySlugs(ctx context.Context, subjectSlugs, examSlugs []string, limit int) ([]content.BlogPost, error) {
	if limit < 1 || limit > 20 {
		limit = 6
	}
	var conds []string
	var args []any
	if len(subjectSlugs) > 0 {
		conds = append(conds, fmt.Sprintf(`EXISTS (SELECT 1 FROM blog_post_subjects bps
			JOIN subjects s ON s.id = bps.subject_id
			WHERE bps.blog_post_id = p.id AND s.slug = ANY($%d))`, len(args)+1))
		args = append(args, toAnyArray(subjectSlugs))
	}
	if len(examSlugs) > 0 {
		conds = append(conds, fmt.Sprintf(`EXISTS (SELECT 1 FROM blog_post_exams bpe
			JOIN exams e ON e.id = bpe.exam_id
			WHERE bpe.blog_post_id = p.id AND e.slug = ANY($%d))`, len(args)+1))
		args = append(args, toAnyArray(examSlugs))
	}
	where := " WHERE p.status = 'PUBLISHED'"
	if len(conds) > 0 {
		where += " AND (" + strings.Join(conds, " OR ") + ")"
	}
	rows, err := r.db.QueryContext(ctx,
		"SELECT "+blogColumns+" FROM blog_posts p"+where+" ORDER BY p.published_at DESC LIMIT $"+fmt.Sprint(len(args)+1),
		append(args, limit)...)
	if err != nil {
		return nil, fmt.Errorf("related posts: %w", err)
	}
	defer rows.Close()
	out := []content.BlogPost{}
	for rows.Next() {
		b, err := scanBlogPost(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *b)
	}
	return out, rows.Err()
}

func toAnyArray(ss []string) []any {
	out := make([]any, len(ss))
	for i, s := range ss {
		out[i] = s
	}
	return out
}

var _ content.BlogPostRepository = (*BlogRepo)(nil)

// --- Redirects ---

type RedirectRepo struct{ db TxQuerier }

func NewRedirectRepo(db TxQuerier) *RedirectRepo { return &RedirectRepo{db: db} }

func (r *RedirectRepo) Lookup(ctx context.Context, fromSlug string) (*content.RedirectMap, error) {
	var rm content.RedirectMap
	var createdBy uuidNull
	err := r.db.QueryRowContext(ctx, `
		SELECT id, from_slug, to_slug, type, created_at, created_by
		FROM redirect_map WHERE from_slug = $1`, fromSlug).
		Scan(&rm.ID, &rm.FromSlug, &rm.ToSlug, &rm.Type, &rm.CreatedAt, &createdBy)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if createdBy.Valid {
		rm.CreatedBy = &createdBy.UUID
	}
	return &rm, nil
}

func (r *RedirectRepo) Create(ctx context.Context, fromSlug, toSlug, redirectType string, createdBy *uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO redirect_map (from_slug, to_slug, type, created_by)
		VALUES ($1,$2,$3,$4) ON CONFLICT (from_slug) DO UPDATE SET to_slug = $2, type = $3, created_by = $4`,
		fromSlug, toSlug, redirectType, createdBy)
	if err != nil {
		return fmt.Errorf("create redirect: %w", err)
	}
	return nil
}

func (r *RedirectRepo) List(ctx context.Context, limit int) ([]content.RedirectMap, error) {
	if limit < 1 || limit > 1000 {
		limit = 500
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, from_slug, to_slug, type, created_at, created_by
		FROM redirect_map ORDER BY created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("list redirects: %w", err)
	}
	defer rows.Close()
	out := []content.RedirectMap{}
	for rows.Next() {
		var rm content.RedirectMap
		var createdBy uuidNull
		if err := rows.Scan(&rm.ID, &rm.FromSlug, &rm.ToSlug, &rm.Type, &rm.CreatedAt, &createdBy); err != nil {
			return nil, err
		}
		if createdBy.Valid {
			rm.CreatedBy = &createdBy.UUID
		}
		out = append(out, rm)
	}
	return out, rows.Err()
}

var _ content.RedirectRepository = (*RedirectRepo)(nil)
