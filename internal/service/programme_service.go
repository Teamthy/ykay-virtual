package service

import (
	"context"
	"encoding/json"
	"time"

	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/domain/academics"
)

// ProgrammeService — catalogue list with Redis cache (180s TTL).
const (
	programmeCacheTTL    = 180 * time.Second
	programmeCachePrefix = "programme"
)

type ProgrammeService struct {
	repo  academics.ProgrammeRepository
	cache cache.Cache
}

func NewProgrammeService(repo academics.ProgrammeRepository, c cache.Cache) *ProgrammeService {
	return &ProgrammeService{repo: repo, cache: c}
}

func (s *ProgrammeService) List(ctx context.Context, p academics.ProgrammeListParams) ([]academics.Programme, int64, error) {
	if s.repo == nil {
		return []academics.Programme{}, 0, nil
	}
	cacheKey := cache.CacheKey(programmeCachePrefix, "list", searchParamsKey(struct {
		Search     string
		Curriculum string
		Exam       string
		Format     string
		Featured   *bool
		Page       int
		PageSize   int
		Sort       string
	}{p.Search, p.Curriculum, p.Exam, p.Format, p.Featured, p.Page, p.PageSize, p.Sort}))

	if cached, err := s.cache.Get(ctx, cacheKey); err == nil && cached != "" {
		var data []academics.Programme
		if json.Unmarshal([]byte(cached), &data) == nil {
			return data, int64(len(data)), nil
		}
	}
	programmes, total, err := s.repo.List(ctx, p)
	if err != nil {
		return nil, 0, err
	}
	if b, err := json.Marshal(programmes); err == nil {
		_ = s.cache.Set(ctx, cacheKey, string(b), programmeCacheTTL)
	}
	return programmes, total, nil
}

func (s *ProgrammeService) GetBySlug(ctx context.Context, slug string) (*academics.Programme, error) {
	if s.repo == nil {
		return nil, nil
	}
	cacheKey := cache.CacheKey(programmeCachePrefix, "slug", slug)
	if cached, err := s.cache.Get(ctx, cacheKey); err == nil && cached != "" {
		var pr academics.Programme
		if json.Unmarshal([]byte(cached), &pr) == nil {
			return &pr, nil
		}
	}
	pr, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if b, err := json.Marshal(pr); err == nil {
		_ = s.cache.Set(ctx, cacheKey, string(b), programmeCacheTTL)
	}
	return pr, nil
}

// Invalidate clears programme caches after admin catalogue writes.
func (s *ProgrammeService) Invalidate(ctx context.Context) error {
	if rc, ok := s.cache.(*cache.RedisCache); ok {
		return rc.DelPrefix(ctx, cache.CacheKey(programmeCachePrefix)+"*")
	}
	return s.cache.Del(ctx, cache.CacheKey(programmeCachePrefix, "*"))
}
