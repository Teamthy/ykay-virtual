package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/mastery"
)

// MasteryRepo — postgres implementation of mastery.Repository (migration 000074).
type MasteryRepo struct{ db TxQuerier }

func NewMasteryRepo(db TxQuerier) *MasteryRepo { return &MasteryRepo{db: db} }

// RecordResult appends the graded outcome and recomputes the mastery cell in a
// single atomic statement (CTE): no read-modify-write race.
func (r *MasteryRepo) RecordResult(ctx context.Context, sp uuid.UUID, subject, topic string, correct bool) error {
	_, err := r.db.ExecContext(ctx, `
		WITH ins AS (
			INSERT INTO learning_topic_results (student_profile_id, subject, topic, correct, source)
			VALUES ($1,$2,$3,$4,'cbt')
		),
		agg AS (
			SELECT COUNT(*)::int AS attempts,
			       COALESCE(SUM(CASE WHEN correct THEN 1 ELSE 0 END),0)::int AS correct
			FROM learning_topic_results
			WHERE student_profile_id=$1 AND subject=$2 AND topic=$3
		)
		INSERT INTO topic_mastery (student_profile_id, subject, topic, attempts, correct, mastery, updated_at)
		SELECT $1,$2,$3, attempts, correct,
		       COALESCE(ROUND(100.0*correct/NULLIF(attempts,0)),0)::int, NOW()
		FROM agg
		ON CONFLICT (student_profile_id, subject, topic) DO UPDATE SET
			attempts = EXCLUDED.attempts,
			correct = EXCLUDED.correct,
			mastery = EXCLUDED.mastery,
			updated_at = NOW()`,
		sp, subject, topic, correct)
	if err != nil {
		return fmt.Errorf("record topic result: %w", err)
	}
	return nil
}

func (r *MasteryRepo) Mastery(ctx context.Context, sp uuid.UUID, subject string) ([]mastery.TopicMastery, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT subject, topic, attempts, correct, mastery
		FROM topic_mastery
		WHERE student_profile_id=$1 AND ($2='' OR subject=$2)
		ORDER BY subject, mastery ASC`, sp, subject)
	if err != nil {
		return nil, fmt.Errorf("mastery query: %w", err)
	}
	defer rows.Close()
	out := []mastery.TopicMastery{}
	for rows.Next() {
		var c mastery.TopicMastery
		if err := rows.Scan(&c.Subject, &c.Topic, &c.Attempts, &c.Correct, &c.Mastery); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *MasteryRepo) WeakTopics(ctx context.Context, sp uuid.UUID, subject string, below int) ([]mastery.TopicMastery, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT subject, topic, attempts, correct, mastery
		FROM topic_mastery
		WHERE student_profile_id=$1 AND ($2='' OR subject=$2) AND mastery < $3
		ORDER BY mastery ASC`, sp, subject, below)
	if err != nil {
		return nil, fmt.Errorf("weak topics query: %w", err)
	}
	defer rows.Close()
	out := []mastery.TopicMastery{}
	for rows.Next() {
		var c mastery.TopicMastery
		if err := rows.Scan(&c.Subject, &c.Topic, &c.Attempts, &c.Correct, &c.Mastery); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

var _ mastery.Repository = (*MasteryRepo)(nil)
