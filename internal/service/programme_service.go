package service

import (
	"context"
	"encoding/json"
	"time"

	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/tutor"

	"github.com/google/uuid"
)

// ProgrammeService — catalogue list with Redis cache (180s TTL).
const (
	programmeCacheTTL    = 180 * time.Second
	programmeCachePrefix = "programme"
)

// EnrichedProgrammeRepo — the enriched list/detail queries (postgres impl).
type EnrichedProgrammeRepo interface {
	academics.ProgrammeRepository
	ListWithMeta(ctx context.Context, p academics.ProgrammeListParams) ([]academics.ProgrammeDetail, int64, error)
	GetDetailBySlug(ctx context.Context, slug string) (*academics.ProgrammeDetail, error)
}

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

// ListWithMeta — enriched list (names, subjects, next start) for the hub.
func (s *ProgrammeService) ListWithMeta(ctx context.Context, p academics.ProgrammeListParams) ([]academics.ProgrammeDetail, int64, error) {
	enriched, ok := s.repo.(EnrichedProgrammeRepo)
	if !ok || enriched == nil {
		return []academics.ProgrammeDetail{}, 0, nil
	}
	cacheKey := cache.CacheKey(programmeCachePrefix, "list-meta", searchParamsKey(struct {
		Search      string
		SubjectSlug string
		Curriculum  string
		Exam        string
		Format      string
		Level       string
		Page        int
		PageSize    int
		Sort        string
	}{p.Search, p.SubjectSlug, p.Curriculum, p.Exam, p.Format, p.Level, p.Page, p.PageSize, p.Sort}))
	if cached, err := s.cache.Get(ctx, cacheKey); err == nil && cached != "" {
		var data []academics.ProgrammeDetail
		if json.Unmarshal([]byte(cached), &data) == nil {
			return data, int64(len(data)), nil
		}
	}
	list, total, err := enriched.ListWithMeta(ctx, p)
	if err != nil {
		return nil, 0, err
	}
	if b, err := json.Marshal(list); err == nil {
		_ = s.cache.Set(ctx, cacheKey, string(b), programmeCacheTTL)
	}
	return list, total, nil
}

// GetDetailBySlug — enriched single programme (tabs page).
func (s *ProgrammeService) GetDetailBySlug(ctx context.Context, slug string) (*academics.ProgrammeDetail, error) {
	enriched, ok := s.repo.(EnrichedProgrammeRepo)
	if !ok || enriched == nil {
		return nil, nil
	}
	return enriched.GetDetailBySlug(ctx, slug)
}

// TutorsForProgramme — approved tutors for a programme's subjects.
func (s *ProgrammeService) TutorsForProgramme(ctx context.Context, programmeID uuid.UUID, limit int) ([]tutor.TutorSearchResult, error) {
	repo, ok := s.repo.(interface {
		TutorsForProgrammeSubjects(ctx context.Context, programmeID uuid.UUID, limit int) ([]tutor.TutorSearchResult, error)
	})
	if !ok || repo == nil {
		return []tutor.TutorSearchResult{}, nil
	}
	return repo.TutorsForProgrammeSubjects(ctx, programmeID, limit)
}
