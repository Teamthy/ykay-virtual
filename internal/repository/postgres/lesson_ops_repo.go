package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"

	"github.com/google/uuid"
)

// Teaching-ops repos — cohort catalogue, cohort lessons, attendance, lesson
// notes, resources, assignments (MVP teaching operations).

func (r *CohortRepo) ListPublished(ctx context.Context, params booking.CohortListParams) ([]booking.Cohort, int64, error) {
	status := params.Status
	if status == "" {
		status = "PUBLISHED"
	}
	var conds []string
	var args []any
	conds = append(conds, fmt.Sprintf("status = $%d", len(args)+1))
	args = append(args, status)
	if params.ProgrammeID != nil {
		conds = append(conds, fmt.Sprintf("programme_id = $%d", len(args)+1))
		args = append(args, *params.ProgrammeID)
	}
	where := " WHERE " + strings.Join(conds, " AND ")

	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM cohorts"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count cohorts: %w", err)
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
		"SELECT "+cohortColumns+" FROM cohorts"+where+" ORDER BY start_date ASC LIMIT $"+fmt.Sprint(len(args)+1)+" OFFSET $"+fmt.Sprint(len(args)+2),
		append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list cohorts: %w", err)
	}
	defer rows.Close()
	out := []booking.Cohort{}
	for rows.Next() {
		c, err := scanCohort(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *c)
	}
	return out, total, rows.Err()
}

func (r *LessonRepo) ListByCohort(ctx context.Context, cohortID uuid.UUID, limit int) ([]booking.Lesson, error) {
	if limit < 1 || limit > 100 {
		limit = 60
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT l.id, l.cohort_id, l.private_package_id, l.tutor_profile_id, l.title, l.description,
			l.start_at, l.end_at, l.timezone, l.meeting_url, l.meeting_provider, l.location_id,
			l.status, l.created_by, l.created_at, l.updated_at
		FROM lessons l
		WHERE l.cohort_id = $1 ORDER BY l.start_at ASC LIMIT $2`, cohortID, limit)
	if err != nil {
		return nil, fmt.Errorf("list lessons by cohort: %w", err)
	}
	defer rows.Close()
	out := []booking.Lesson{}
	for rows.Next() {
		l, err := scanLessonRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *l)
	}
	return out, rows.Err()
}

func (r *LessonRepo) GetByID(ctx context.Context, id uuid.UUID) (*booking.Lesson, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT l.id, l.cohort_id, l.private_package_id, l.tutor_profile_id, l.title, l.description,
			l.start_at, l.end_at, l.timezone, l.meeting_url, l.meeting_provider, l.location_id,
			l.status, l.created_by, l.created_at, l.updated_at
		FROM lessons l WHERE l.id = $1`, id)
	l, err := scanLessonRow(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return l, nil
}

var _ booking.LessonRepository = (*LessonRepo)(nil)

// --- Attendance ---

type AttendanceRepo struct{ db TxQuerier }

func NewAttendanceRepo(db TxQuerier) *AttendanceRepo { return &AttendanceRepo{db: db} }

func (r *AttendanceRepo) Upsert(ctx context.Context, lessonID, studentProfileID uuid.UUID, status string, markedBy uuid.UUID, note *string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO attendance (lesson_id, student_profile_id, status, marked_by, note, marked_at)
		VALUES ($1,$2,$3,$4,$5,NOW())
		ON CONFLICT (lesson_id, student_profile_id)
		DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by,
			note = EXCLUDED.note, marked_at = NOW()`,
		lessonID, studentProfileID, status, markedBy, note)
	if err != nil {
		return fmt.Errorf("upsert attendance: %w", err)
	}
	return nil
}

func (r *AttendanceRepo) ListByLesson(ctx context.Context, lessonID uuid.UUID) ([]booking.Attendance, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, lesson_id, student_profile_id, status, marked_by, note, marked_at
		FROM attendance WHERE lesson_id = $1 ORDER BY marked_at`, lessonID)
	if err != nil {
		return nil, fmt.Errorf("list attendance: %w", err)
	}
	defer rows.Close()
	out := []booking.Attendance{}
	for rows.Next() {
		var a booking.Attendance
		var note sql.NullString
		if err := rows.Scan(&a.ID, &a.LessonID, &a.StudentProfileID, &a.Status, &a.MarkedBy, &note, &a.MarkedAt); err != nil {
			return nil, err
		}
		if note.Valid {
			a.Note = &note.String
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

var _ booking.AttendanceRepository = (*AttendanceRepo)(nil)

// --- Lesson notes ---

type LessonNoteRepo struct{ db TxQuerier }

func NewLessonNoteRepo(db TxQuerier) *LessonNoteRepo { return &LessonNoteRepo{db: db} }

func (r *LessonNoteRepo) Create(ctx context.Context, n *booking.LessonNote) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO lesson_notes (lesson_id, tutor_profile_id, student_profile_id, content, homework, is_visible_to_parent)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at`,
		n.LessonID, n.TutorProfileID, n.StudentProfileID, n.Content, n.Homework, n.IsVisibleToParent,
	).Scan(&n.ID, &n.CreatedAt)
	if err != nil {
		return fmt.Errorf("create lesson note: %w", err)
	}
	return nil
}

func (r *LessonNoteRepo) ListByLesson(ctx context.Context, lessonID uuid.UUID) ([]booking.LessonNote, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, lesson_id, tutor_profile_id, student_profile_id, content, homework, is_visible_to_parent, created_at
		FROM lesson_notes WHERE lesson_id = $1 ORDER BY created_at DESC`, lessonID)
	if err != nil {
		return nil, fmt.Errorf("list lesson notes: %w", err)
	}
	defer rows.Close()
	out := []booking.LessonNote{}
	for rows.Next() {
		var n booking.LessonNote
		var studentID uuidNull
		var homework sql.NullString
		if err := rows.Scan(&n.ID, &n.LessonID, &n.TutorProfileID, &studentID, &n.Content, &homework, &n.IsVisibleToParent, &n.CreatedAt); err != nil {
			return nil, err
		}
		if studentID.Valid {
			n.StudentProfileID = &studentID.UUID
		}
		if homework.Valid {
			n.Homework = &homework.String
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

var _ booking.LessonNoteRepository = (*LessonNoteRepo)(nil)

// --- Resources (read) ---

type ResourceRepo struct{ db TxQuerier }

func NewResourceRepo(db TxQuerier) *ResourceRepo { return &ResourceRepo{db: db} }

func (r *ResourceRepo) ListByCohort(ctx context.Context, cohortID uuid.UUID) ([]booking.Resource, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, programme_id, cohort_id, lesson_id, title, description, file_url, is_public, created_at
		FROM resources WHERE cohort_id = $1 ORDER BY created_at DESC`, cohortID)
	if err != nil {
		return nil, fmt.Errorf("list resources: %w", err)
	}
	defer rows.Close()
	out := []booking.Resource{}
	for rows.Next() {
		var res booking.Resource
		var programmeID, lessonID uuidNull
		var desc, fileURL sql.NullString
		if err := rows.Scan(&res.ID, &programmeID, &res.CohortID, &lessonID, &res.Title, &desc, &fileURL, &res.IsPublic, &res.CreatedAt); err != nil {
			return nil, err
		}
		if programmeID.Valid {
			res.ProgrammeID = &programmeID.UUID
		}
		if lessonID.Valid {
			res.LessonID = &lessonID.UUID
		}
		if desc.Valid {
			res.Description = &desc.String
		}
		if fileURL.Valid {
			res.FileURL = &fileURL.String
		}
		out = append(out, res)
	}
	return out, rows.Err()
}

var _ booking.ResourceRepository = (*ResourceRepo)(nil)

// --- Assignments (read) ---

type AssignmentRepo struct{ db TxQuerier }

func NewAssignmentRepo(db TxQuerier) *AssignmentRepo { return &AssignmentRepo{db: db} }

func (r *AssignmentRepo) ListByCohort(ctx context.Context, cohortID uuid.UUID) ([]booking.Assignment, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, cohort_id, lesson_id, title, instructions, due_at, max_score, created_at
		FROM assignments WHERE cohort_id = $1 ORDER BY due_at ASC NULLS LAST`, cohortID)
	if err != nil {
		return nil, fmt.Errorf("list assignments: %w", err)
	}
	defer rows.Close()
	out := []booking.Assignment{}
	for rows.Next() {
		var a booking.Assignment
		var lessonID uuidNull
		var instructions sql.NullString
		var dueAt sql.NullTime
		var maxScore sql.NullFloat64
		if err := rows.Scan(&a.ID, &a.CohortID, &lessonID, &a.Title, &instructions, &dueAt, &maxScore, &a.CreatedAt); err != nil {
			return nil, err
		}
		if lessonID.Valid {
			a.LessonID = &lessonID.UUID
		}
		if instructions.Valid {
			a.Instructions = &instructions.String
		}
		if dueAt.Valid {
			a.DueAt = &dueAt.Time
		}
		if maxScore.Valid {
			a.MaxScore = &maxScore.Float64
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

var _ booking.AssignmentRepository = (*AssignmentRepo)(nil)

var _ = errors.Is
var _ = domain.ErrNotFound
