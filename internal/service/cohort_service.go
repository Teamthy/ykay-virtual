package service

import (
	"context"
	"encoding/json"
	"time"

	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/domain/booking"

	"github.com/google/uuid"
)

// CohortService — read side for cohorts (checkout page, cohort detail).
// Cached 300s like the rest of the public catalogue.
const (
	cohortCacheTTL    = 300 * time.Second
	cohortCachePrefix = "cohort"
)

type CohortService struct {
	repo  booking.CohortRepository
	cache cache.Cache
}

func NewCohortService(repo booking.CohortRepository, c cache.Cache) *CohortService {
	return &CohortService{repo: repo, cache: c}
}

func (s *CohortService) GetByID(ctx context.Context, id uuid.UUID) (*booking.Cohort, error) {
	cacheKey := cache.CacheKey(cohortCachePrefix, "id", id.String())
	if cached, err := s.cache.Get(ctx, cacheKey); err == nil && cached != "" {
		var c booking.Cohort
		if json.Unmarshal([]byte(cached), &c) == nil {
			return &c, nil
		}
	}
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if b, err := json.Marshal(c); err == nil {
		_ = s.cache.Set(ctx, cacheKey, string(b), cohortCacheTTL)
	}
	return c, nil
}

// Invalidate clears cohort caches after cohort writes (admin console).
func (s *CohortService) Invalidate(ctx context.Context) error {
	if rc, ok := s.cache.(*cache.RedisCache); ok {
		return rc.DelPrefix(ctx, cache.CacheKey(cohortCachePrefix)+"*")
	}
	return s.cache.Del(ctx, cache.CacheKey(cohortCachePrefix, "*"))
}

// ListPublished — public cohort catalogue (newest starts first).
func (s *CohortService) ListPublished(ctx context.Context, params booking.CohortListParams) ([]booking.Cohort, int64, error) {
	if s.repo == nil {
		return []booking.Cohort{}, 0, nil
	}
	cacheKey := cache.CacheKey(cohortCachePrefix, "list", searchParamsKey(struct {
		ProgrammeID *uuid.UUID
		Page        int
		PageSize    int
	}{params.ProgrammeID, params.Page, params.PageSize}))
	if cached, err := s.cache.Get(ctx, cacheKey); err == nil && cached != "" {
		var data []booking.Cohort
		if json.Unmarshal([]byte(cached), &data) == nil {
			return data, int64(len(data)), nil
		}
	}
	cohorts, total, err := s.repo.ListPublished(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	if b, err := json.Marshal(cohorts); err == nil {
		_ = s.cache.Set(ctx, cacheKey, string(b), cohortCacheTTL)
	}
	return cohorts, total, nil
}
