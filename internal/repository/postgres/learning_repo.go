package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/learning"

	"github.com/google/uuid"
)

// Learning repos — assessments, grading, progress reports (Phase 11c).

// --- Assessments ---

type AssessmentRepo struct{ db TxQuerier }

func NewAssessmentRepo(db TxQuerier) *AssessmentRepo { return &AssessmentRepo{db: db} }

func (r *AssessmentRepo) CreateAssessment(ctx context.Context, a *learning.LearnerAssessment) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO learner_assessments (cohort_id, lesson_id, tutor_profile_id, title, instructions,
			pass_threshold, due_at, status, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, created_at, updated_at`,
		a.CohortID, a.LessonID, a.TutorProfileID, a.Title, a.Instructions,
		a.PassThreshold, a.DueAt, a.Status, a.CreatedBy,
	).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create assessment: %w", err)
	}
	return nil
}

func (r *AssessmentRepo) AddQuestion(ctx context.Context, q *learning.AssessmentQuestion) error {
	options, err := json.Marshal(q.Options)
	if err != nil {
		return fmt.Errorf("marshal options: %w", err)
	}
	err = r.db.QueryRowContext(ctx, `
		INSERT INTO learner_assessment_questions (assessment_id, question, options, correct_index, explanation, sort_order)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		q.AssessmentID, q.Question, options, q.CorrectIndex, q.Explanation, q.SortOrder,
	).Scan(&q.ID)
	if err != nil {
		return fmt.Errorf("add question: %w", err)
	}
	return nil
}

const assessmentColumns = `id, cohort_id, lesson_id, tutor_profile_id, title, instructions,
	pass_threshold, due_at, status, created_by, created_at, updated_at`

func scanAssessment(row interface{ Scan(...any) error }) (*learning.LearnerAssessment, error) {
	var a learning.LearnerAssessment
	var cohortID, lessonID, createdBy uuidNull
	var instructions sql.NullString
	var dueAt sql.NullTime
	if err := row.Scan(&a.ID, &cohortID, &lessonID, &a.TutorProfileID, &a.Title, &instructions,
		&a.PassThreshold, &dueAt, &a.Status, &createdBy, &a.CreatedAt, &a.UpdatedAt); err != nil {
		return nil, err
	}
	if cohortID.Valid {
		a.CohortID = &cohortID.UUID
	}
	if lessonID.Valid {
		a.LessonID = &lessonID.UUID
	}
	if createdBy.Valid {
		a.CreatedBy = &createdBy.UUID
	}
	if instructions.Valid {
		a.Instructions = &instructions.String
	}
	if dueAt.Valid {
		a.DueAt = &dueAt.Time
	}
	return &a, nil
}

func (r *AssessmentRepo) GetAssessment(ctx context.Context, id uuid.UUID) (*learning.LearnerAssessment, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+assessmentColumns+" FROM learner_assessments WHERE id = $1", id)
	a, err := scanAssessment(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return a, nil
}

func (r *AssessmentRepo) ListByCohort(ctx context.Context, cohortID uuid.UUID, status string, limit int) ([]learning.LearnerAssessment, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	query := "SELECT " + assessmentColumns + " FROM learner_assessments WHERE cohort_id = $1"
	args := []any{cohortID}
	if status != "" {
		query += " AND status = $2"
		args = append(args, status)
	}
	query += " ORDER BY created_at DESC LIMIT $" + fmt.Sprint(len(args)+1)
	args = append(args, limit)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list assessments: %w", err)
	}
	defer rows.Close()
	out := []learning.LearnerAssessment{}
	for rows.Next() {
		a, err := scanAssessment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *a)
	}
	return out, rows.Err()
}

func (r *AssessmentRepo) GetQuestions(ctx context.Context, assessmentID uuid.UUID) ([]learning.AssessmentQuestion, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, assessment_id, question, options, correct_index, explanation, sort_order
		FROM learner_assessment_questions WHERE assessment_id = $1 ORDER BY sort_order, id`, assessmentID)
	if err != nil {
		return nil, fmt.Errorf("list questions: %w", err)
	}
	defer rows.Close()
	out := []learning.AssessmentQuestion{}
	for rows.Next() {
		q, err := scanAssessmentQuestion(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *q)
	}
	return out, rows.Err()
}

func scanAssessmentQuestion(row interface{ Scan(...any) error }) (*learning.AssessmentQuestion, error) {
	var q learning.AssessmentQuestion
	var optionsRaw []byte
	var explanation sql.NullString
	if err := row.Scan(&q.ID, &q.AssessmentID, &q.Question, &optionsRaw, &q.CorrectIndex, &explanation, &q.SortOrder); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(optionsRaw, &q.Options); err != nil {
		return nil, fmt.Errorf("parse options: %w", err)
	}
	if explanation.Valid {
		q.Explanation = &explanation.String
	}
	return &q, nil
}

func (r *AssessmentRepo) SetStatus(ctx context.Context, id uuid.UUID, status learning.AssessmentStatus) error {
	_, err := r.db.ExecContext(ctx, "UPDATE learner_assessments SET status = $1, updated_at = NOW() WHERE id = $2", status, id)
	if err != nil {
		return fmt.Errorf("set assessment status: %w", err)
	}
	return nil
}

func (r *AssessmentRepo) CreateAttempt(ctx context.Context, a *learning.LearnerAttempt) error {
	var createdAt time.Time
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO learner_assessment_attempts (assessment_id, student_profile_id, tutor_profile_id, status, expires_at)
		VALUES ($1,$2,$3,$4,$5) RETURNING id, started_at, created_at`,
		a.AssessmentID, a.StudentProfileID, a.TutorProfileID, a.Status, a.ExpiresAt,
	).Scan(&a.ID, &a.StartedAt, &createdAt)
	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("%w: attempt already exists for this assessment", domain.ErrAlreadyExists)
		}
		return fmt.Errorf("create attempt: %w", err)
	}
	_ = createdAt
	return nil
}

const learnerAttemptColumns = `id, assessment_id, student_profile_id, tutor_profile_id, status,
	score, max_score, passed, started_at, completed_at, expires_at`

func scanLearnerAttempt(row interface{ Scan(...any) error }) (*learning.LearnerAttempt, error) {
	var a learning.LearnerAttempt
	var score, maxScore sql.NullFloat64
	var passed sql.NullBool
	var completedAt sql.NullTime
	if err := row.Scan(&a.ID, &a.AssessmentID, &a.StudentProfileID, &a.TutorProfileID, &a.Status,
		&score, &maxScore, &passed, &a.StartedAt, &completedAt, &a.ExpiresAt); err != nil {
		return nil, err
	}
	if score.Valid {
		a.Score = &score.Float64
	}
	if maxScore.Valid {
		a.MaxScore = &maxScore.Float64
	}
	if passed.Valid {
		a.Passed = &passed.Bool
	}
	if completedAt.Valid {
		a.CompletedAt = &completedAt.Time
	}
	return &a, nil
}

func (r *AssessmentRepo) GetAttempt(ctx context.Context, id uuid.UUID) (*learning.LearnerAttempt, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+learnerAttemptColumns+" FROM learner_assessment_attempts WHERE id = $1", id)
	a, err := scanLearnerAttempt(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return a, nil
}

func (r *AssessmentRepo) GetAttemptForStudent(ctx context.Context, assessmentID, studentProfileID uuid.UUID) (*learning.LearnerAttempt, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT `+learnerAttemptColumns+` FROM learner_assessment_attempts
		WHERE assessment_id = $1 AND student_profile_id = $2`, assessmentID, studentProfileID)
	a, err := scanLearnerAttempt(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return a, nil
}

func (r *AssessmentRepo) CompleteAttempt(ctx context.Context, id uuid.UUID, score, maxScore float64, passed bool) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE learner_assessment_attempts SET status = 'COMPLETED', score = $1, max_score = $2,
			passed = $3, completed_at = NOW() WHERE id = $4`, score, maxScore, passed, id)
	if err != nil {
		return fmt.Errorf("complete attempt: %w", err)
	}
	return nil
}

var _ learning.AssessmentRepository = (*AssessmentRepo)(nil)

// --- Grading ---

type GradingRepo struct{ db TxQuerier }

func NewGradingRepo(db TxQuerier) *GradingRepo { return &GradingRepo{db: db} }

func (r *GradingRepo) ListSubmissionsByAssignment(ctx context.Context, assignmentID uuid.UUID) ([]learning.GradedSubmission, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, assignment_id, student_profile_id, content, score, feedback, submitted_at, graded_at
		FROM submissions WHERE assignment_id = $1 ORDER BY submitted_at`, assignmentID)
	if err != nil {
		return nil, fmt.Errorf("list submissions by assignment: %w", err)
	}
	defer rows.Close()
	out := []learning.GradedSubmission{}
	for rows.Next() {
		var s learning.GradedSubmission
		var content, feedback sql.NullString
		var score sql.NullFloat64
		var gradedAt sql.NullTime
		if err := rows.Scan(&s.ID, &s.AssignmentID, &s.StudentProfileID, &content, &score, &feedback, &s.SubmittedAt, &gradedAt); err != nil {
			return nil, err
		}
		if content.Valid {
			s.Content = &content.String
		}
		if feedback.Valid {
			s.Feedback = &feedback.String
		}
		if score.Valid {
			s.Score = &score.Float64
		}
		if gradedAt.Valid {
			s.GradedAt = &gradedAt.Time
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *GradingRepo) Grade(ctx context.Context, submissionID uuid.UUID, score *float64, feedback *string, gradedBy uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE submissions SET score = $1, feedback = $2, graded_at = NOW(), graded_by = $3
		WHERE id = $4`, score, feedback, gradedBy, submissionID)
	if err != nil {
		return fmt.Errorf("grade submission: %w", err)
	}
	return nil
}

var _ learning.GradingRepository = (*GradingRepo)(nil)

// --- Progress reports ---

type ProgressReportRepo struct{ db TxQuerier }

func NewProgressReportRepo(db TxQuerier) *ProgressReportRepo { return &ProgressReportRepo{db: db} }

func (r *ProgressReportRepo) Create(ctx context.Context, p *learning.ProgressReport) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO progress_reports (student_profile_id, tutor_profile_id, cohort_id, period_start, period_end,
			strengths, weaknesses, recommendations, overall_rating)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, created_at`,
		p.StudentProfileID, p.TutorProfileID, p.CohortID, p.PeriodStart, p.PeriodEnd,
		p.Strengths, p.Weaknesses, p.Recommendations, p.OverallRating,
	).Scan(&p.ID, &p.CreatedAt)
	if err != nil {
		return fmt.Errorf("create progress report: %w", err)
	}
	return nil
}

func scanProgressReport(row interface{ Scan(...any) error }) (*learning.ProgressReport, error) {
	var p learning.ProgressReport
	var cohortID uuidNull
	var strengths, weaknesses, recommendations sql.NullString
	var rating sql.NullInt64
	if err := row.Scan(&p.ID, &p.StudentProfileID, &p.TutorProfileID, &cohortID,
		&p.PeriodStart, &p.PeriodEnd, &strengths, &weaknesses, &recommendations, &rating, &p.CreatedAt); err != nil {
		return nil, err
	}
	if cohortID.Valid {
		p.CohortID = &cohortID.UUID
	}
	if strengths.Valid {
		p.Strengths = &strengths.String
	}
	if weaknesses.Valid {
		p.Weaknesses = &weaknesses.String
	}
	if recommendations.Valid {
		p.Recommendations = &recommendations.String
	}
	if rating.Valid {
		r := int(rating.Int64)
		p.OverallRating = &r
	}
	return &p, nil
}

func (r *ProgressReportRepo) ListByStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]learning.ProgressReport, error) {
	if limit < 1 || limit > 100 {
		limit = 20
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, student_profile_id, tutor_profile_id, cohort_id, period_start, period_end,
			strengths, weaknesses, recommendations, overall_rating, created_at
		FROM progress_reports WHERE student_profile_id = $1 ORDER BY period_start DESC LIMIT $2`,
		studentProfileID, limit)
	if err != nil {
		return nil, fmt.Errorf("list progress reports: %w", err)
	}
	defer rows.Close()
	out := []learning.ProgressReport{}
	for rows.Next() {
		p, err := scanProgressReport(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *p)
	}
	return out, rows.Err()
}

func (r *ProgressReportRepo) ListByTutor(ctx context.Context, tutorProfileID uuid.UUID, limit int) ([]learning.ProgressReport, error) {
	if limit < 1 || limit > 100 {
		limit = 20
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, student_profile_id, tutor_profile_id, cohort_id, period_start, period_end,
			strengths, weaknesses, recommendations, overall_rating, created_at
		FROM progress_reports WHERE tutor_profile_id = $1 ORDER BY period_start DESC LIMIT $2`,
		tutorProfileID, limit)
	if err != nil {
		return nil, fmt.Errorf("list tutor reports: %w", err)
	}
	defer rows.Close()
	out := []learning.ProgressReport{}
	for rows.Next() {
		p, err := scanProgressReport(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *p)
	}
	return out, rows.Err()
}

var _ learning.ProgressReportRepository = (*ProgressReportRepo)(nil)

// ExpireStaleAttempts — worker cron: IN_PROGRESS with expires_at < before → EXPIRED.
func (r *AssessmentRepo) ExpireStaleAttempts(ctx context.Context, before time.Time) (int64, error) {
	res, err := r.db.ExecContext(ctx, `
		UPDATE learner_assessment_attempts
		SET status = 'EXPIRED', completed_at = NOW()
		WHERE status = 'IN_PROGRESS' AND expires_at < $1`, before)
	if err != nil {
		return 0, fmt.Errorf("expire stale attempts: %w", err)
	}
	n, _ := res.RowsAffected()
	return n, nil
}
