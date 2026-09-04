package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"ykay-virtual/internal/domain/cbt"

	"github.com/google/uuid"
)

// CBTPostgres — practice-bank storage (migration 000072). Random papers draw
// with ORDER BY random() so every student gets a fresh subset.
type CBTPostgres struct {
	db TxQuerier
}

func NewCBTRepo(db TxQuerier) *CBTPostgres { return &CBTPostgres{db: db} }

func (r *CBTPostgres) ListSubjects(ctx context.Context) ([]cbt.Subject, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT s.id, s.slug, s.name, s.class_level, s.department,
		       COUNT(q.id) FILTER (WHERE q.status = 'published')
		FROM cbt_subjects s
		LEFT JOIN cbt_questions q ON q.subject_id = s.id
		GROUP BY s.id
		ORDER BY s.name`)
	if err != nil {
		return nil, fmt.Errorf("cbt list subjects: %w", err)
	}
	defer rows.Close()
	out := []cbt.Subject{}
	for rows.Next() {
		var s cbt.Subject
		if err := rows.Scan(&s.ID, &s.Slug, &s.Name, &s.ClassLevel, &s.Department, &s.QuestionCount); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *CBTPostgres) UpsertSubject(ctx context.Context, s *cbt.Subject) error {
	return r.db.QueryRowContext(ctx, `
		INSERT INTO cbt_subjects (slug, name, class_level, department)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name,
			class_level = EXCLUDED.class_level, department = EXCLUDED.department
		RETURNING id`, s.Slug, s.Name, s.ClassLevel, s.Department).Scan(&s.ID)
}

const questionCols = `q.id, q.subject_id, s.slug, q.topic, q.difficulty, q.stem,
	q.options, q.correct_index, q.explanation, q.source, q.status`

func scanCBTQuestion(scanner interface {
	Scan(dest ...any) error
}) (cbt.Question, error) {
	var q cbt.Question
	var opts []byte
	if err := scanner.Scan(&q.ID, &q.SubjectID, &q.SubjectSlug, &q.Topic, &q.Difficulty, &q.Stem,
		&opts, &q.CorrectIndex, &q.Explanation, &q.Source, &q.Status); err != nil {
		return q, err
	}
	if err := json.Unmarshal(opts, &q.Options); err != nil {
		return q, fmt.Errorf("cbt options json: %w", err)
	}
	return q, nil
}

func (r *CBTPostgres) RandomQuestions(ctx context.Context, subjectSlug string, n int) ([]cbt.Question, error) {
	rows, err := r.db.QueryContext(ctx, fmt.Sprintf(`
		SELECT %s FROM cbt_questions q
		JOIN cbt_subjects s ON s.id = q.subject_id
		WHERE s.slug = $1 AND q.status = 'published'
		ORDER BY random() LIMIT %d`, questionCols, n), subjectSlug)
	if err != nil {
		return nil, fmt.Errorf("cbt random: %w", err)
	}
	defer rows.Close()
	out := []cbt.Question{}
	for rows.Next() {
		q, err := scanCBTQuestion(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, q)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(out) == 0 {
		return nil, cbt.ErrNotFound
	}
	return out, nil
}

func (r *CBTPostgres) GetByIDs(ctx context.Context, ids []uuid.UUID) ([]cbt.Question, error) {
	out := make([]cbt.Question, 0, len(ids))
	for _, id := range ids {
		q, err := scanCBTQuestion(r.db.QueryRowContext(ctx, fmt.Sprintf(`
			SELECT %s FROM cbt_questions q
			JOIN cbt_subjects s ON s.id = q.subject_id
			WHERE q.id = $1 AND q.status = 'published'`, questionCols), id))
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				continue // stale id in a submission → skip, grade the rest
			}
			return nil, err
		}
		out = append(out, q)
	}
	return out, nil
}

func (r *CBTPostgres) CreateQuestion(ctx context.Context, q *cbt.Question, skipDuplicate bool) (bool, error) {
	opts, err := json.Marshal(q.Options)
	if err != nil {
		return false, err
	}
	res, err := r.db.ExecContext(ctx, `
		INSERT INTO cbt_questions (subject_id, topic, difficulty, stem, options, correct_index, explanation, source, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		q.SubjectID, q.Topic, q.Difficulty, strings.TrimSpace(q.Stem), opts, q.CorrectIndex,
		q.Explanation, q.Source, q.Status)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") { // UNIQUE(subject_id, stem)
			if skipDuplicate {
				return false, nil
			}
			return false, cbt.ErrDuplicateStem
		}
		return false, fmt.Errorf("cbt create: %w", err)
	}
	affected, _ := res.RowsAffected()
	return affected > 0, nil
}

func (r *CBTPostgres) ListQuestions(ctx context.Context, subjectSlug string, limit, offset int) ([]cbt.Question, int, error) {
	where := ""
	args := []any{}
	if subjectSlug != "" {
		where = " WHERE s.slug = $1"
		args = append(args, subjectSlug)
	}
	var total int
	if err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(q.id) FROM cbt_questions q
		JOIN cbt_subjects s ON s.id = q.subject_id`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.QueryContext(ctx, fmt.Sprintf(`
		SELECT %s FROM cbt_questions q
		JOIN cbt_subjects s ON s.id = q.subject_id%s
		ORDER BY q.created_at LIMIT %d OFFSET %d`, questionCols, where, limit, offset), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []cbt.Question{}
	for rows.Next() {
		q, err := scanCBTQuestion(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, q)
	}
	return out, total, rows.Err()
}

func (r *CBTPostgres) SetStatus(ctx context.Context, id uuid.UUID, status string) error {
	res, err := r.db.ExecContext(ctx, `UPDATE cbt_questions SET status = $2 WHERE id = $1`, id, status)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return cbt.ErrNotFound
	}
	return nil
}

func (r *CBTPostgres) DeleteQuestion(ctx context.Context, id uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM cbt_questions WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return cbt.ErrNotFound
	}
	return nil
}

func (r *CBTPostgres) CountPublished(ctx context.Context) (int, error) {
	var n int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM cbt_questions WHERE status = 'published'`).Scan(&n)
	return n, err
}

var _ cbt.Repository = (*CBTPostgres)(nil)
