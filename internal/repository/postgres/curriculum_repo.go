package postgres

import (
	"context"
	"fmt"

	"ykay-virtual/internal/domain/academics"

	"github.com/google/uuid"
)

// CurriculumRepo — read side for curricula + levels (learner onboarding
// "current level" dropdowns).
type CurriculumRepo struct{ db TxQuerier }

func NewCurriculumRepo(db TxQuerier) *CurriculumRepo { return &CurriculumRepo{db: db} }

func (r *CurriculumRepo) ListActive(ctx context.Context) ([]academics.Curriculum, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, slug, is_active, created_at
		FROM curricula WHERE is_active ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("list curricula: %w", err)
	}
	defer rows.Close()
	out := []academics.Curriculum{}
	for rows.Next() {
		var c academics.Curriculum
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.IsActive, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan curriculum: %w", err)
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *CurriculumRepo) ListLevelsByCurriculum(ctx context.Context, curriculumID uuid.UUID) ([]academics.Level, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, curriculum_id, name, slug, order_index
		FROM levels WHERE curriculum_id = $1 ORDER BY order_index, name`, curriculumID)
	if err != nil {
		return nil, fmt.Errorf("list levels: %w", err)
	}
	defer rows.Close()
	out := []academics.Level{}
	for rows.Next() {
		var l academics.Level
		if err := rows.Scan(&l.ID, &l.CurriculumID, &l.Name, &l.Slug, &l.SortOrder); err != nil {
			return nil, fmt.Errorf("scan level: %w", err)
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

var _ academics.CurriculumRepository = (*CurriculumRepo)(nil)
