package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/library"
)

// LibraryRepo — postgres implementation of library.Repository (migration
// 000064). Catalogue browse + admin curation over lessons×recorded_library.
type LibraryRepo struct{ db TxQuerier }

func NewLibraryRepo(db TxQuerier) *LibraryRepo { return &LibraryRepo{db: db} }

const libraryItemColumns = `
	l.id, l.title, l.description, l.video_url, l.transcript,
	l.start_at, l.end_at, l.status,
	rl.visible, rl.featured, rl.thumbnail_url, rl.duration_seconds, rl.sort_order,
	l.cohort_id, c.title, c.slug,
	p.id, p.title, p.slug,
	cur.name, lvl.name`

// scanLibraryItem scans one row produced by libraryItemColumns plus the primary
// subject-name aggregation in the final position.
func scanLibraryItem(row interface{ Scan(...any) error }) (*library.Item, error) {
	var it library.Item
	var cohortID, progID uuidNull
	var desc, videoURL, transcript, thumb, cohortTitle, cohortSlug sql.NullString
	var progTitle, progSlug, curName, lvlName sql.NullString
	var duration sql.NullInt64
	var subjects string
	if err := row.Scan(&it.LessonID, &it.Title, &desc, &videoURL, &transcript,
		&it.StartAt, &it.EndAt, &it.Status,
		&it.Visible, &it.Featured, &thumb, &duration, &it.SortOrder,
		&cohortID, &cohortTitle, &cohortSlug,
		&progID, &progTitle, &progSlug,
		&curName, &lvlName, &subjects); err != nil {
		return nil, err
	}
	it.VideoURL = nullableString(videoURL)
	it.Transcript = nullableString(transcript)
	it.Description = nullableString(desc)
	it.ThumbnailURL = nullableString(thumb)
	if duration.Valid {
		d := int(duration.Int64)
		it.DurationSeconds = &d
	}
	if cohortID.Valid {
		it.CohortID = &cohortID.UUID
	}
	it.CohortTitle = nullableString(cohortTitle)
	it.CohortSlug = nullableString(cohortSlug)
	if progID.Valid {
		it.ProgrammeID = &progID.UUID
	}
	it.ProgrammeTitle = nullableString(progTitle)
	it.ProgrammeSlug = nullableString(progSlug)
	it.CurriculumName = nullableString(curName)
	it.LevelName = nullableString(lvlName)
	if strings.TrimSpace(subjects) != "" {
		for _, s := range strings.Split(subjects, ",") {
			if s = strings.TrimSpace(s); s != "" {
				it.Subjects = append(it.Subjects, s)
			}
		}
	}
	return &it, nil
}

func nullableString(n sql.NullString) *string {
	if !n.Valid {
		return nil
	}
	v := n.String
	return &v
}

// addLibraryContext is the shared FROM/JOIN + WHERE skeleton for catalogue reads.
// The `primaryOnly` parameter controls whether only PUBLISHED cohorts/programmes
// are surfaced (public browse = yes, admin = no).
func (r *LibraryRepo) itemSelect(primaryOnly bool) string {
	base := `
		FROM lessons l
		JOIN recorded_library rl ON rl.lesson_id = l.id
		LEFT JOIN cohorts c ON c.id = l.cohort_id
		LEFT JOIN programmes p ON p.id = c.programme_id
		LEFT JOIN curricula cur ON cur.id = p.curriculum_id
		LEFT JOIN levels lvl ON lvl.id = p.level_id
		WHERE l.video_url IS NOT NULL AND l.status <> 'CANCELLED'`
	if primaryOnly {
		base += ` AND rl.visible = TRUE`
	}
	return base
}

func (r *LibraryRepo) subjectsSubquery() string {
	return ` COALESCE((
			SELECT string_agg(s.name, ',' ORDER BY s.name)
			FROM programme_subjects ps
			JOIN subjects s ON s.id = ps.subject_id
			WHERE ps.programme_id = p.id AND ps.is_primary = TRUE
		), '')`
}

// Catalogue — public, visible-only browse.
func (r *LibraryRepo) Catalogue(ctx context.Context, f library.Filter) ([]library.Item, int64, error) {
	if f.PageSize < 1 || f.PageSize > 100 {
		f.PageSize = 24
	}
	if f.Page < 1 {
		f.Page = 1
	}
	where, args := []string{}, []any{}
	if f.FeaturedOnly {
		where = append(where, "rl.featured = TRUE")
	}
	if f.ProgrammeID != nil {
		args = append(args, *f.ProgrammeID)
		where = append(where, fmt.Sprintf("p.id = $%d", len(args)))
	}
	if f.LevelID != nil {
		args = append(args, *f.LevelID)
		where = append(where, fmt.Sprintf("p.level_id = $%d", len(args)))
	}
	if f.CurriculumID != nil {
		args = append(args, *f.CurriculumID)
		where = append(where, fmt.Sprintf("p.curriculum_id = $%d", len(args)))
	}
	if f.SubjectID != nil {
		args = append(args, *f.SubjectID)
		where = append(where, fmt.Sprintf("p.id IN (SELECT programme_id FROM programme_subjects WHERE subject_id = $%d)", len(args)))
	}
	if s := strings.TrimSpace(f.Search); s != "" {
		args = append(args, "%"+strings.ToLower(s)+"%")
		where = append(where, fmt.Sprintf("(LOWER(l.title) LIKE $%d OR LOWER(c.title) LIKE $%d)", len(args), len(args)))
	}
	from := r.itemSelect(true)
	from += r.subjectsSubquery()
	whereSQL := ""
	if len(where) > 0 {
		whereSQL = " AND " + strings.Join(where, " AND ")
	}

	// Count
	var total int64
	countQ := "SELECT COUNT(*) " + from + whereSQL
	if err := r.db.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count library catalogue: %w", err)
	}

	// Page
	orderBy := "ORDER BY rl.featured DESC, rl.sort_order ASC, l.start_at DESC"
	offset := (f.Page - 1) * f.PageSize
	args = append(args, f.PageSize, offset)
	q := "SELECT " + libraryItemColumns + from + whereSQL + " " + orderBy + " LIMIT $" +
		fmt.Sprint(len(args)-1) + " OFFSET $" + fmt.Sprint(len(args))
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query library catalogue: %w", err)
	}
	defer rows.Close()
	out := []library.Item{}
	for rows.Next() {
		it, err := scanLibraryItem(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *it)
	}
	return out, total, rows.Err()
}

// Featured — visible + featured (homepage rail).
func (r *LibraryRepo) Featured(ctx context.Context, limit int) ([]library.Item, error) {
	if limit < 1 || limit > 100 {
		limit = 8
	}
	q := "SELECT " + libraryItemColumns + r.subjectsSubquery() + r.itemSelect(true) +
		" AND rl.featured = TRUE ORDER BY rl.sort_order ASC, l.start_at DESC LIMIT $1"
	rows, err := r.db.QueryContext(ctx, q, limit)
	if err != nil {
		return nil, fmt.Errorf("query featured library: %w", err)
	}
	defer rows.Close()
	out := []library.Item{}
	for rows.Next() {
		it, err := scanLibraryItem(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *it)
	}
	return out, rows.Err()
}

// GetByLessonID — one item regardless of visibility (detail page).
func (r *LibraryRepo) GetByLessonID(ctx context.Context, lessonID uuid.UUID) (*library.Item, error) {
	q := "SELECT " + libraryItemColumns + r.subjectsSubquery() +
		r.itemSelect(false) + " AND l.id = $1"
	row := r.db.QueryRowContext(ctx, q, lessonID)
	it, err := scanLibraryItem(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return it, nil
}

// ListAdmin — every recorded lesson (video_url set) with its library meta,
// including non-visible rows, so the admin manager can curate.
func (r *LibraryRepo) ListAdmin(ctx context.Context, search string, page, pageSize int) ([]library.Item, int64, error) {
	if pageSize < 1 || pageSize > 100 {
		pageSize = 24
	}
	if page < 1 {
		page = 1
	}
	where := ""
	args := []any{}
	if s := strings.TrimSpace(search); s != "" {
		args = append(args, "%"+strings.ToLower(s)+"%")
		where = " AND (LOWER(l.title) LIKE $1 OR LOWER(c.title) LIKE $1)"
	}
	from := r.itemSelect(false) + r.subjectsSubquery()

	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) "+from+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count admin library: %w", err)
	}
	offset := (page - 1) * pageSize
	args = append(args, pageSize, offset)
	q := "SELECT " + libraryItemColumns + from + where +
		" ORDER BY rl.visible DESC, rl.sort_order ASC, l.start_at DESC LIMIT $" +
		fmt.Sprint(len(args)-1) + " OFFSET $" + fmt.Sprint(len(args))
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query admin library: %w", err)
	}
	defer rows.Close()
	out := []library.Item{}
	for rows.Next() {
		it, err := scanLibraryItem(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *it)
	}
	return out, total, rows.Err()
}

// UpdateMeta — upsert the library row for a lesson. Read-then-merge so a
// partial update never clobbers the fields the caller did not set.
func (r *LibraryRepo) UpdateMeta(ctx context.Context, lessonID uuid.UUID, in library.UpdateMetaInput) error {
	existing := &library.LibraryMeta{}
	var curThumb sql.NullString
	var curDur sql.NullInt64
	err := r.db.QueryRowContext(ctx,
		`SELECT visible, featured, thumbnail_url, duration_seconds, sort_order
		 FROM recorded_library WHERE lesson_id = $1`, lessonID).
		Scan(&existing.Visible, &existing.Featured, &curThumb, &curDur, &existing.SortOrder)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("read library meta: %w", err)
	}
	if curThumb.Valid {
		v := curThumb.String
		existing.ThumbnailURL = &v
	}
	if curDur.Valid {
		d := int(curDur.Int64)
		existing.DurationSeconds = &d
	}

	if in.Visible != nil {
		existing.Visible = *in.Visible
	}
	if in.Featured != nil {
		existing.Featured = *in.Featured
	}
	if in.ThumbnailURL != nil {
		existing.ThumbnailURL = in.ThumbnailURL
	}
	if in.DurationSeconds != nil {
		d := *in.DurationSeconds
		existing.DurationSeconds = &d
	}
	if in.SortOrder != nil {
		existing.SortOrder = *in.SortOrder
	}

	thumb := sql.NullString{Valid: existing.ThumbnailURL != nil}
	if existing.ThumbnailURL != nil {
		thumb.String = *existing.ThumbnailURL
	}
	dur := sql.NullInt64{Valid: existing.DurationSeconds != nil}
	if existing.DurationSeconds != nil {
		dur.Int64 = int64(*existing.DurationSeconds)
	}

	_, err = r.db.ExecContext(ctx, `
		INSERT INTO recorded_library (lesson_id, visible, featured, thumbnail_url, duration_seconds, sort_order, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (lesson_id) DO UPDATE SET
			visible = $2, featured = $3, thumbnail_url = $4, duration_seconds = $5,
			sort_order = $6, updated_at = NOW()`,
		lessonID, existing.Visible, existing.Featured, thumb, dur, existing.SortOrder)
	if err != nil {
		return fmt.Errorf("upsert library meta: %w", err)
	}
	return nil
}
