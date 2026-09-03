package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"ykay-virtual/internal/domain/practice"

	"github.com/google/uuid"
)

// PracticeExamRepo — postgres persistence for CBT practice exams.
type PracticeExamRepo struct{ db TxQuerier }

func NewPracticeExamRepo(db TxQuerier) *PracticeExamRepo { return &PracticeExamRepo{db: db} }

const practiceExamColumns = `id, tutor_id, subject, title, description, duration_minutes, passing_score, cohort_id, status, premium, created_at, updated_at`
const practiceQuestionColumns = `id, exam_id, position, text, options, correct_index, explanation`
const practiceAttemptColumns = `id, exam_id, student_id, started_at, expires_at, submitted_at, answers, score, passed`

func scanExam(row interface{ Scan(...any) error }) (*practice.Exam, error) {
	var e practice.Exam
	var cohortID uuidNull
	if err := row.Scan(&e.ID, &e.TutorID, &e.Subject, &e.Title, &e.Description,
		&e.DurationMinutes, &e.PassingScore, &cohortID, &e.Status, &e.Premium, &e.CreatedAt, &e.UpdatedAt); err != nil {
		return nil, err
	}
	if cohortID.Valid {
		e.CohortID = &cohortID.UUID
	}
	e.Questions = []practice.Question{}
	return &e, nil
}

func (r *PracticeExamRepo) CreateExam(ctx context.Context, e *practice.Exam) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	now := time.Now().UTC()
	e.CreatedAt, e.UpdatedAt = now, now
	var cohortID any
	if e.CohortID != nil {
		cohortID = *e.CohortID
	}
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO practice_exams (id, tutor_id, subject, title, description, duration_minutes, passing_score, cohort_id, status, premium, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
		e.ID, e.TutorID, e.Subject, e.Title, e.Description, e.DurationMinutes, e.PassingScore,
		cohortID, e.Status, e.Premium, now, now).Scan(&e.ID)
	if err != nil {
		return fmt.Errorf("create practice exam: %w", err)
	}
	for i := range e.Questions {
		q := &e.Questions[i]
		if q.ID == uuid.Nil {
			q.ID = uuid.New()
		}
		q.ExamID = e.ID
		opts, _ := json.Marshal(q.Options)
		if _, err := r.db.ExecContext(ctx, `
			INSERT INTO practice_questions (id, exam_id, position, text, options, correct_index, explanation)
			VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			q.ID, q.ExamID, q.Position, q.Text, opts, q.CorrectIndex, q.Explanation); err != nil {
			return fmt.Errorf("create practice question: %w", err)
		}
	}
	return nil
}

func (r *PracticeExamRepo) UpdateExam(ctx context.Context, e *practice.Exam) error {
	now := time.Now().UTC()
	var cohortID any
	if e.CohortID != nil {
		cohortID = *e.CohortID
	}
	res, err := r.db.ExecContext(ctx, `
		UPDATE practice_exams SET subject=$2, title=$3, description=$4, duration_minutes=$5,
		passing_score=$6, cohort_id=$7, status=$8, premium=$9, updated_at=$10 WHERE id=$1`,
		e.ID, e.Subject, e.Title, e.Description, e.DurationMinutes, e.PassingScore,
		cohortID, e.Status, e.Premium, now)
	if err != nil {
		return fmt.Errorf("update practice exam: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return practice.ErrNotFound
	}
	// Replace questions wholesale (simple, consistent with the builder UX).
	if _, err := r.db.ExecContext(ctx, `DELETE FROM practice_questions WHERE exam_id=$1`, e.ID); err != nil {
		return fmt.Errorf("clear practice questions: %w", err)
	}
	for i := range e.Questions {
		q := &e.Questions[i]
		if q.ID == uuid.Nil {
			q.ID = uuid.New()
		}
		q.ExamID = e.ID
		opts, _ := json.Marshal(q.Options)
		if _, err := r.db.ExecContext(ctx, `
			INSERT INTO practice_questions (id, exam_id, position, text, options, correct_index, explanation)
			VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			q.ID, q.ExamID, q.Position, q.Text, opts, q.CorrectIndex, q.Explanation); err != nil {
			return fmt.Errorf("update practice question: %w", err)
		}
	}
	e.UpdatedAt = now
	return nil
}

func (r *PracticeExamRepo) DeleteExam(ctx context.Context, id uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM practice_exams WHERE id=$1`, id)
	if err != nil {
		return fmt.Errorf("delete practice exam: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return practice.ErrNotFound
	}
	return nil
}

func (r *PracticeExamRepo) loadQuestions(ctx context.Context, examID uuid.UUID) ([]practice.Question, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+practiceQuestionColumns+` FROM practice_questions WHERE exam_id=$1 ORDER BY position`, examID)
	if err != nil {
		return nil, fmt.Errorf("list practice questions: %w", err)
	}
	defer rows.Close()
	out := []practice.Question{}
	for rows.Next() {
		var q practice.Question
		var raw []byte
		if err := rows.Scan(&q.ID, &q.ExamID, &q.Position, &q.Text, &raw, &q.CorrectIndex, &q.Explanation); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(raw, &q.Options); err != nil {
			return nil, fmt.Errorf("decode practice question options: %w", err)
		}
		out = append(out, q)
	}
	return out, rows.Err()
}

func (r *PracticeExamRepo) GetExam(ctx context.Context, id uuid.UUID) (*practice.Exam, error) {
	e, err := scanExam(r.db.QueryRowContext(ctx, `SELECT `+practiceExamColumns+` FROM practice_exams WHERE id=$1`, id))
	if err != nil {
		if isNoRows(err) {
			return nil, practice.ErrNotFound
		}
		return nil, err
	}
	qs, err := r.loadQuestions(ctx, id)
	if err != nil {
		return nil, err
	}
	e.Questions = qs
	return e, nil
}

func (r *PracticeExamRepo) list(ctx context.Context, where string, args ...any) ([]practice.Exam, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT `+practiceExamColumns+` FROM practice_exams `+where+` ORDER BY created_at DESC`, args...)
	if err != nil {
		return nil, fmt.Errorf("list practice exams: %w", err)
	}
	defer rows.Close()
	out := []practice.Exam{}
	for rows.Next() {
		e, err := scanExam(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *e)
	}
	return out, rows.Err()
}

func (r *PracticeExamRepo) ListByTutor(ctx context.Context, tutorID uuid.UUID) ([]practice.Exam, error) {
	return r.list(ctx, `WHERE tutor_id=$1`, tutorID)
}

func (r *PracticeExamRepo) ListActive(ctx context.Context) ([]practice.Exam, error) {
	return r.list(ctx, `WHERE status='ACTIVE'`)
}

func scanPracticeAttempt(row interface{ Scan(...any) error }) (*practice.Attempt, error) {
	var a practice.Attempt
	var submittedAt sql.NullTime
	var answersRaw, scoreRaw sql.NullString
	var passedRaw sql.NullBool
	if err := row.Scan(&a.ID, &a.ExamID, &a.StudentID, &a.StartedAt, &a.ExpiresAt,
		&submittedAt, &answersRaw, &scoreRaw, &passedRaw); err != nil {
		return nil, err
	}
	if submittedAt.Valid {
		a.SubmittedAt = &submittedAt.Time
	}
	if answersRaw.Valid {
		if err := json.Unmarshal([]byte(answersRaw.String), &a.Answers); err != nil {
			return nil, fmt.Errorf("decode practice attempt answers: %w", err)
		}
	}
	if scoreRaw.Valid {
		var s int
		if _, err := fmt.Sscanf(scoreRaw.String, "%d", &s); err == nil {
			a.Score = &s
		}
	}
	if passedRaw.Valid {
		p := passedRaw.Bool
		a.Passed = &p
	}
	return &a, nil
}

func (r *PracticeExamRepo) CreateAttempt(ctx context.Context, a *practice.Attempt) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO practice_attempts (id, exam_id, student_id, started_at, expires_at)
		VALUES ($1,$2,$3,$4,$5)`,
		a.ID, a.ExamID, a.StudentID, a.StartedAt, a.ExpiresAt)
	if err != nil {
		return fmt.Errorf("create practice attempt: %w", err)
	}
	return nil
}

func (r *PracticeExamRepo) UpdateAttempt(ctx context.Context, a *practice.Attempt) error {
	answersRaw, err := json.Marshal(a.Answers)
	if err != nil {
		return fmt.Errorf("encode practice attempt answers: %w", err)
	}
	var submittedAt, score, passed any
	if a.SubmittedAt != nil {
		submittedAt = *a.SubmittedAt
	}
	if a.Score != nil {
		score = *a.Score
	}
	if a.Passed != nil {
		passed = *a.Passed
	}
	if _, err := r.db.ExecContext(ctx, `
		UPDATE practice_attempts SET submitted_at=$2, answers=$3, score=$4, passed=$5 WHERE id=$1`,
		a.ID, submittedAt, answersRaw, score, passed); err != nil {
		return fmt.Errorf("update practice attempt: %w", err)
	}
	return nil
}

func (r *PracticeExamRepo) GetAttempt(ctx context.Context, id uuid.UUID) (*practice.Attempt, error) {
	a, err := scanPracticeAttempt(r.db.QueryRowContext(ctx, `SELECT `+practiceAttemptColumns+` FROM practice_attempts WHERE id=$1`, id))
	if err != nil {
		if isNoRows(err) {
			return nil, practice.ErrAttemptNotFound
		}
		return nil, err
	}
	return a, nil
}

func (r *PracticeExamRepo) GetOpenAttempt(ctx context.Context, studentID, examID uuid.UUID) (*practice.Attempt, error) {
	a, err := scanPracticeAttempt(r.db.QueryRowContext(ctx, `SELECT `+practiceAttemptColumns+` FROM practice_attempts WHERE student_id=$1 AND exam_id=$2 AND submitted_at IS NULL ORDER BY started_at DESC LIMIT 1`, studentID, examID))
	if err != nil {
		if isNoRows(err) {
			return nil, practice.ErrAttemptNotFound
		}
		return nil, err
	}
	return a, nil
}

func (r *PracticeExamRepo) ListAttemptsByStudent(ctx context.Context, studentID uuid.UUID, limit int) ([]practice.Attempt, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+practiceAttemptColumns+` FROM practice_attempts WHERE student_id=$1 ORDER BY started_at DESC LIMIT $2`,
		studentID, limit)
	if err != nil {
		return nil, fmt.Errorf("list student practice attempts: %w", err)
	}
	defer rows.Close()
	out := []practice.Attempt{}
	for rows.Next() {
		a, err := scanPracticeAttempt(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *a)
	}
	return out, rows.Err()
}

func (r *PracticeExamRepo) ListAttemptsByExam(ctx context.Context, examID uuid.UUID, limit int) ([]practice.Attempt, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+practiceAttemptColumns+` FROM practice_attempts WHERE exam_id=$1 ORDER BY started_at DESC LIMIT $2`,
		examID, limit)
	if err != nil {
		return nil, fmt.Errorf("list exam practice attempts: %w", err)
	}
	defer rows.Close()
	out := []practice.Attempt{}
	for rows.Next() {
		a, err := scanPracticeAttempt(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *a)
	}
	return out, rows.Err()
}
