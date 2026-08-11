package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/domain/vetting"

	"github.com/google/uuid"
)

// VettingRepo — persistence for the vetting pipeline + assessment engine.

type VettingRepo struct{ db TxQuerier }

func NewVettingRepo(db TxQuerier) *VettingRepo { return &VettingRepo{db: db} }

// --- Tutor profile reads/writes ---

func (r *VettingRepo) GetProfileByID(ctx context.Context, profileID uuid.UUID) (*tutor.TutorProfile, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+tutorColumns+" FROM tutor_profiles t WHERE t.id = $1", profileID)
	return scanTutor(row)
}

func (r *VettingRepo) GetProfileByUserID(ctx context.Context, userID uuid.UUID) (*tutor.TutorProfile, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+tutorColumns+" FROM tutor_profiles t WHERE t.user_id = $1", userID)
	return scanTutor(row)
}

func (r *VettingRepo) CreateProfile(ctx context.Context, p *tutor.TutorProfile) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO tutor_profiles
			(user_id, slug, display_name, headline, bio, years_experience,
			 hourly_rate_min, hourly_rate_max, currency, status, timezone,
			 accepts_online, accepts_in_person)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		ON CONFLICT (slug) DO NOTHING`,
		p.UserID, p.Slug, p.DisplayName, p.Headline, p.Bio, p.YearsExperience,
		p.HourlyRateMin, p.HourlyRateMax, p.Currency, p.Status, p.Timezone,
		p.AcceptsOnline, p.AcceptsInPerson)
	if err != nil {
		return fmt.Errorf("create tutor profile: %w", err)
	}
	row := r.db.QueryRowContext(ctx, "SELECT "+tutorColumns+" FROM tutor_profiles t WHERE t.slug = $1", p.Slug)
	created, err := scanTutor(row)
	if err != nil {
		return fmt.Errorf("reload tutor profile: %w", err)
	}
	*p = *created
	return nil
}

func (r *VettingRepo) SetPublic(ctx context.Context, profileID uuid.UUID, isPublic bool) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE tutor_profiles SET is_public = $1, updated_at = NOW() WHERE id = $2", isPublic, profileID)
	if err != nil {
		return fmt.Errorf("set tutor public: %w", err)
	}
	return nil
}

func (r *VettingRepo) UpdateStatus(ctx context.Context, profileID uuid.UUID, status string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE tutor_profiles SET status = $1, updated_at = NOW() WHERE id = $2", status, profileID)
	if err != nil {
		return fmt.Errorf("update tutor status: %w", err)
	}
	return nil
}

func (r *VettingRepo) MarkApproved(ctx context.Context, profileID, approvedBy uuid.UUID, rankingScore float64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE tutor_profiles
		SET status = 'APPROVED', is_public = TRUE, verified_at = NOW(),
		    approved_at = NOW(), approved_by = $1, ranking_score = $2, updated_at = NOW()
		WHERE id = $3`, approvedBy, rankingScore, profileID)
	if err != nil {
		return fmt.Errorf("mark tutor approved: %w", err)
	}
	return nil
}

func (r *VettingRepo) SetRankingScore(ctx context.Context, profileID uuid.UUID, score float64) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE tutor_profiles SET ranking_score = $1, updated_at = NOW() WHERE id = $2", score, profileID)
	if err != nil {
		return fmt.Errorf("set ranking score: %w", err)
	}
	return nil
}

func (r *VettingRepo) ListByStatus(ctx context.Context, status string, limit, offset int) ([]tutor.TutorProfile, int64, error) {
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	where := ""
	args := []any{}
	if status != "" {
		where = " WHERE t.status = $1"
		args = append(args, status)
	}

	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM tutor_profiles t"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count vetting queue: %w", err)
	}

	rows, err := r.db.QueryContext(ctx,
		"SELECT "+tutorColumns+" FROM tutor_profiles t"+where+" ORDER BY t.updated_at DESC LIMIT $"+fmt.Sprint(len(args)+1)+" OFFSET $"+fmt.Sprint(len(args)+2),
		append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list vetting queue: %w", err)
	}
	defer rows.Close()

	out := []tutor.TutorProfile{}
	for rows.Next() {
		t, err := scanTutor(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *t)
	}
	return out, total, rows.Err()
}

func (r *VettingRepo) ListApprovedProfiles(ctx context.Context, limit int) ([]uuid.UUID, error) {
	if limit < 1 {
		limit = 500
	}
	rows, err := r.db.QueryContext(ctx,
		"SELECT id FROM tutor_profiles WHERE status = 'APPROVED' ORDER BY id LIMIT $1", limit)
	if err != nil {
		return nil, fmt.Errorf("list approved tutors: %w", err)
	}
	defer rows.Close()
	out := []uuid.UUID{}
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

// --- Documents ---

func (r *VettingRepo) CreateDocument(ctx context.Context, d *vetting.VettingDocument) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO tutor_documents (tutor_profile_id, type, file_key, file_name, file_size, mime_type)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at`,
		d.TutorProfileID, d.Type, d.FileKey, d.FileName, d.FileSize, d.MimeType,
	).Scan(&d.ID, &d.CreatedAt)
	if err != nil {
		return fmt.Errorf("create document: %w", err)
	}
	return nil
}

const documentColumns = `id, tutor_profile_id, type, file_key, file_name, file_size, mime_type,
	status, reviewed_by, reviewed_at, rejection_reason, created_at`

func scanDocument(row interface{ Scan(...any) error }) (*vetting.VettingDocument, error) {
	var d vetting.VettingDocument
	var fileSize sql.NullInt64
	var mime, rejection sql.NullString
	var reviewedBy uuidNull
	var reviewedAt sql.NullTime
	if err := row.Scan(&d.ID, &d.TutorProfileID, &d.Type, &d.FileKey, &d.FileName, &fileSize,
		&mime, &d.Status, &reviewedBy, &reviewedAt, &rejection, &d.CreatedAt); err != nil {
		return nil, err
	}
	if fileSize.Valid {
		fs := int(fileSize.Int64)
		d.FileSize = &fs
	}
	if mime.Valid {
		d.MimeType = &mime.String
	}
	if reviewedBy.Valid {
		d.ReviewedBy = &reviewedBy.UUID
	}
	if reviewedAt.Valid {
		d.ReviewedAt = &reviewedAt.Time
	}
	if rejection.Valid {
		d.RejectionReason = &rejection.String
	}
	return &d, nil
}

func (r *VettingRepo) GetDocument(ctx context.Context, id uuid.UUID) (*vetting.VettingDocument, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+documentColumns+" FROM tutor_documents WHERE id = $1", id)
	d, err := scanDocument(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return d, nil
}

func (r *VettingRepo) ListDocuments(ctx context.Context, profileID uuid.UUID) ([]vetting.VettingDocument, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT "+documentColumns+" FROM tutor_documents WHERE tutor_profile_id = $1 ORDER BY created_at", profileID)
	if err != nil {
		return nil, fmt.Errorf("list documents: %w", err)
	}
	defer rows.Close()
	out := []vetting.VettingDocument{}
	for rows.Next() {
		d, err := scanDocument(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *d)
	}
	return out, rows.Err()
}

func (r *VettingRepo) UpdateDocumentReview(ctx context.Context, id uuid.UUID, status vetting.DocumentStatus,
	reviewedBy uuid.UUID, reason *string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE tutor_documents
		SET status = $1, reviewed_by = $2, reviewed_at = NOW(), rejection_reason = $3
		WHERE id = $4`, status, reviewedBy, reason, id)
	if err != nil {
		return fmt.Errorf("update document review: %w", err)
	}
	return nil
}

// --- Events ---

func (r *VettingRepo) CreateEvent(ctx context.Context, e *vetting.VettingEvent) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO vetting_events (tutor_profile_id, stage, from_status, to_status, actor_user_id, notes, metadata)
		VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at`,
		e.TutorProfileID, e.Stage, e.FromStatus, e.ToStatus, e.ActorUserID, e.Notes, e.Metadata,
	).Scan(&e.ID, &e.CreatedAt)
	if err != nil {
		return fmt.Errorf("create vetting event: %w", err)
	}
	return nil
}

func (r *VettingRepo) ListEvents(ctx context.Context, profileID uuid.UUID, limit int) ([]vetting.VettingEvent, error) {
	if limit < 1 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, tutor_profile_id, stage, from_status, to_status, actor_user_id, notes, metadata, created_at
		FROM vetting_events WHERE tutor_profile_id = $1 ORDER BY created_at DESC LIMIT $2`, profileID, limit)
	if err != nil {
		return nil, fmt.Errorf("list vetting events: %w", err)
	}
	defer rows.Close()
	out := []vetting.VettingEvent{}
	for rows.Next() {
		var e vetting.VettingEvent
		var fromStatus, notes, metadata sql.NullString
		var actor uuidNull
		if err := rows.Scan(&e.ID, &e.TutorProfileID, &e.Stage, &fromStatus, &e.ToStatus, &actor,
			&notes, &metadata, &e.CreatedAt); err != nil {
			return nil, err
		}
		if fromStatus.Valid {
			e.FromStatus = &fromStatus.String
		}
		if actor.Valid {
			e.ActorUserID = &actor.UUID
		}
		if notes.Valid {
			e.Notes = &notes.String
		}
		if metadata.Valid {
			e.Metadata = &metadata.String
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// --- Competency assessment ---

func (r *VettingRepo) CreateAttempt(ctx context.Context, a *vetting.AssessmentAttempt) error {
	var createdAt time.Time
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO assessment_attempts (tutor_profile_id, subject_id, status, expires_at)
		VALUES ($1,$2,$3,$4) RETURNING id, started_at, created_at`,
		a.TutorProfileID, a.SubjectID, a.Status, a.ExpiresAt,
	).Scan(&a.ID, &a.StartedAt, &createdAt)
	if err != nil {
		return fmt.Errorf("create attempt: %w", err)
	}
	_ = createdAt
	return nil
}

const attemptColumns = `id, tutor_profile_id, subject_id, status, score, max_score, passed,
	started_at, completed_at, expires_at`

func scanAttempt(row interface{ Scan(...any) error }) (*vetting.AssessmentAttempt, error) {
	var a vetting.AssessmentAttempt
	var score, maxScore sql.NullFloat64
	var passed sql.NullBool
	var completedAt sql.NullTime
	if err := row.Scan(&a.ID, &a.TutorProfileID, &a.SubjectID, &a.Status, &score, &maxScore,
		&passed, &a.StartedAt, &completedAt, &a.ExpiresAt); err != nil {
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

func (r *VettingRepo) GetAttempt(ctx context.Context, id uuid.UUID) (*vetting.AssessmentAttempt, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+attemptColumns+" FROM assessment_attempts WHERE id = $1", id)
	a, err := scanAttempt(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return a, nil
}

func (r *VettingRepo) GetActiveAttempt(ctx context.Context, profileID, subjectID uuid.UUID) (*vetting.AssessmentAttempt, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT `+attemptColumns+` FROM assessment_attempts
		WHERE tutor_profile_id = $1 AND subject_id = $2 AND status = 'IN_PROGRESS'
		ORDER BY started_at DESC LIMIT 1`, profileID, subjectID)
	a, err := scanAttempt(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return a, nil
}

const questionColumns = `id, subject_id, question, options, correct_index, explanation, difficulty, is_active`

func scanQuestion(row interface{ Scan(...any) error }) (*vetting.AssessmentQuestion, error) {
	var q vetting.AssessmentQuestion
	var optionsRaw []byte
	var explanation sql.NullString
	if err := row.Scan(&q.ID, &q.SubjectID, &q.Question, &optionsRaw, &q.CorrectIndex,
		&explanation, &q.Difficulty, &q.IsActive); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(optionsRaw, &q.Options); err != nil {
		return nil, fmt.Errorf("parse question options: %w", err)
	}
	if explanation.Valid {
		q.Explanation = &explanation.String
	}
	return &q, nil
}

func (r *VettingRepo) ListQuestionsForSubject(ctx context.Context, subjectID uuid.UUID, limit int) ([]vetting.AssessmentQuestion, error) {
	if limit < 1 {
		limit = vetting.QuestionsPerAttempt
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+questionColumns+` FROM assessment_questions
		WHERE subject_id = $1 AND is_active = TRUE ORDER BY difficulty, random() LIMIT $2`, subjectID, limit)
	if err != nil {
		return nil, fmt.Errorf("list questions: %w", err)
	}
	defer rows.Close()
	out := []vetting.AssessmentQuestion{}
	for rows.Next() {
		q, err := scanQuestion(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *q)
	}
	return out, rows.Err()
}

func (r *VettingRepo) GetQuestion(ctx context.Context, id uuid.UUID) (*vetting.AssessmentQuestion, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+questionColumns+" FROM assessment_questions WHERE id = $1", id)
	q, err := scanQuestion(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return q, nil
}

func (r *VettingRepo) SaveAnswer(ctx context.Context, a *vetting.AssessmentAnswer) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO assessment_answers (attempt_id, question_id, chosen_index, is_correct, answered_at)
		VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		a.AttemptID, a.QuestionID, a.ChosenIndex, a.IsCorrect, time.Now().UTC(),
	).Scan(&a.ID)
	if err != nil {
		return fmt.Errorf("save answer: %w", err)
	}
	return nil
}

func (r *VettingRepo) CompleteAttempt(ctx context.Context, id uuid.UUID, score, maxScore float64, passed bool) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE assessment_attempts
		SET status = 'COMPLETED', score = $1, max_score = $2, passed = $3, completed_at = NOW()
		WHERE id = $4`, score, maxScore, passed, id)
	if err != nil {
		return fmt.Errorf("complete attempt: %w", err)
	}
	return nil
}

func (r *VettingRepo) CreateCompetencyResult(ctx context.Context, c *vetting.CompetencyAssessment) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO competency_assessments (tutor_profile_id, subject_id, score, max_score, passed, expires_at)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, attempted_at`,
		c.TutorProfileID, c.SubjectID, c.Score, c.MaxScore, c.Passed, c.ExpiresAt,
	).Scan(&c.ID, &c.AttemptedAt)
	if err != nil {
		return fmt.Errorf("create competency result: %w", err)
	}
	return nil
}

func (r *VettingRepo) ListCompetencyResults(ctx context.Context, profileID uuid.UUID, limit int) ([]vetting.CompetencyAssessment, error) {
	if limit < 1 {
		limit = 20
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, tutor_profile_id, subject_id, score, max_score, passed, attempted_at, expires_at
		FROM competency_assessments WHERE tutor_profile_id = $1 ORDER BY attempted_at DESC LIMIT $2`, profileID, limit)
	if err != nil {
		return nil, fmt.Errorf("list competency results: %w", err)
	}
	defer rows.Close()
	out := []vetting.CompetencyAssessment{}
	for rows.Next() {
		var c vetting.CompetencyAssessment
		var subjectID uuidNull
		var expiresAt sql.NullTime
		if err := rows.Scan(&c.ID, &c.TutorProfileID, &subjectID, &c.Score, &c.MaxScore,
			&c.Passed, &c.AttemptedAt, &expiresAt); err != nil {
			return nil, err
		}
		if subjectID.Valid {
			c.SubjectID = &subjectID.UUID
		}
		if expiresAt.Valid {
			c.ExpiresAt = &expiresAt.Time
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *VettingRepo) PassedCompetencyExists(ctx context.Context, profileID uuid.UUID, now time.Time) (bool, error) {
	var one int
	err := r.db.QueryRowContext(ctx, `
		SELECT 1 FROM competency_assessments
		WHERE tutor_profile_id = $1 AND passed = TRUE AND (expires_at IS NULL OR expires_at > $2)
		LIMIT 1`, profileID, now).Scan(&one)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("check passed competency: %w", err)
	}
	return true, nil
}

var _ vetting.VettingRepository = (*VettingRepo)(nil)

// --- Tutor subjects ---

type TutorSubjectRepo struct{ db TxQuerier }

func NewTutorSubjectRepo(db TxQuerier) *TutorSubjectRepo { return &TutorSubjectRepo{db: db} }

func (r *TutorSubjectRepo) ListByTutor(ctx context.Context, profileID uuid.UUID) ([]tutor.TutorSubjectEntry, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT ts.subject_id, s.name, s.slug, ts.is_approved
		FROM tutor_subjects ts JOIN subjects s ON s.id = ts.subject_id
		WHERE ts.tutor_profile_id = $1 ORDER BY s.name`, profileID)
	if err != nil {
		return nil, fmt.Errorf("list tutor subjects: %w", err)
	}
	defer rows.Close()
	out := []tutor.TutorSubjectEntry{}
	for rows.Next() {
		var e tutor.TutorSubjectEntry
		if err := rows.Scan(&e.SubjectID, &e.Name, &e.Slug, &e.Approved); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *TutorSubjectRepo) AddForTutor(ctx context.Context, profileID, subjectID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO tutor_subjects (tutor_profile_id, subject_id, is_approved)
		VALUES ($1,$2,FALSE) ON CONFLICT (tutor_profile_id, subject_id) DO NOTHING`,
		profileID, subjectID)
	if err != nil {
		return fmt.Errorf("add tutor subject: %w", err)
	}
	return nil
}

var _ tutor.TutorSubjectRepository = (*TutorSubjectRepo)(nil)
