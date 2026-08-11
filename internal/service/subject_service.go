package service

import (
	"context"
	"encoding/json"
	"time"

	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/domain/academics"
)

// SubjectService — catalogue list with Redis cache (180s TTL).
const (
	subjectCacheTTL    = 180 * time.Second
	subjectCachePrefix = "subject"
)

type SubjectService struct {
	repo  academics.SubjectRepository
	cache cache.Cache
}

func NewSubjectService(repo academics.SubjectRepository, c cache.Cache) *SubjectService {
	return &SubjectService{repo: repo, cache: c}
}

func (s *SubjectService) List(ctx context.Context, p academics.SubjectListParams) ([]academics.Subject, int64, error) {
	if s.repo == nil {
		return []academics.Subject{}, 0, nil
	}
	cacheKey := cache.CacheKey(subjectCachePrefix, "list", searchParamsKey(struct {
		Search   string
		Category string
		Page     int
		PageSize int
		Sort     string
	}{p.Search, p.Category, p.Page, p.PageSize, p.Sort}))

	if cached, err := s.cache.Get(ctx, cacheKey); err == nil && cached != "" {
		var data []academics.Subject
		if json.Unmarshal([]byte(cached), &data) == nil {
			return data, int64(len(data)), nil
		}
	}
	subjects, total, err := s.repo.List(ctx, p)
	if err != nil {
		return nil, 0, err
	}
	if b, err := json.Marshal(subjects); err == nil {
		_ = s.cache.Set(ctx, cacheKey, string(b), subjectCacheTTL)
	}
	return subjects, total, nil
}

func (s *SubjectService) GetBySlug(ctx context.Context, slug string) (*academics.Subject, error) {
	if s.repo == nil {
		return nil, nil
	}
	cacheKey := cache.CacheKey(subjectCachePrefix, "slug", slug)
	if cached, err := s.cache.Get(ctx, cacheKey); err == nil && cached != "" {
		var sub academics.Subject
		if json.Unmarshal([]byte(cached), &sub) == nil {
			return &sub, nil
		}
	}
	sub, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if b, err := json.Marshal(sub); err == nil {
		_ = s.cache.Set(ctx, cacheKey, string(b), subjectCacheTTL)
	}
	return sub, nil
}

// Invalidate clears the subject list cache after catalogue writes (admin CMS).
func (s *SubjectService) Invalidate(ctx context.Context) error {
	if rc, ok := s.cache.(*cache.RedisCache); ok {
		return rc.DelPrefix(ctx, cache.CacheKey(subjectCachePrefix)+"*")
	}
	return s.cache.Del(ctx, cache.CacheKey(subjectCachePrefix, "*"))
}
