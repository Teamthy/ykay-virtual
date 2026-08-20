package service

import (
	"context"
	"encoding/json"
	"time"

	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/domain/academics"
)

// CurriculumService — curricula + levels for learner "current level"
// dropdowns (Nigerian + British curricula). Cached 300s like the catalogue.
const (
	curriculumCacheTTL    = 300 * time.Second
	curriculumCachePrefix = "curriculum"
)

type CurriculumService struct {
	repo  academics.CurriculumRepository
	cache cache.Cache
}

func NewCurriculumService(repo academics.CurriculumRepository, c cache.Cache) *CurriculumService {
	return &CurriculumService{repo: repo, cache: c}
}

// ListWithLevels returns every active curriculum with its ordered levels.
func (s *CurriculumService) ListWithLevels(ctx context.Context) ([]academics.CurriculumWithLevels, error) {
	if s.repo == nil {
		return []academics.CurriculumWithLevels{}, nil
	}
	cacheKey := cache.CacheKey(curriculumCachePrefix, "list")
	if s.cache != nil {
		if cached, err := s.cache.Get(ctx, cacheKey); err == nil && cached != "" {
			var data []academics.CurriculumWithLevels
			if json.Unmarshal([]byte(cached), &data) == nil {
				return data, nil
			}
		}
	}
	curricula, err := s.repo.ListActive(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]academics.CurriculumWithLevels, 0, len(curricula))
	for _, c := range curricula {
		levels, err := s.repo.ListLevelsByCurriculum(ctx, c.ID)
		if err != nil {
			return nil, err
		}
		if levels == nil {
			levels = []academics.Level{}
		}
		out = append(out, academics.CurriculumWithLevels{Curriculum: c, Levels: levels})
	}
	if b, err := json.Marshal(out); err == nil && s.cache != nil {
		_ = s.cache.Set(ctx, cacheKey, string(b), curriculumCacheTTL)
	}
	return out, nil
}
