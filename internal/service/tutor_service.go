package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/tutor"
)

// TutorService — marketplace search with Redis caching (120s TTL) and
// invalidate-on-write, per AGENTS.md caching rules. Falls back to mock data
// when no repository is wired (dev mode) so the frontend can run standalone.

const (
	tutorSearchCacheTTL = 120 * time.Second
	tutorSlugCacheTTL   = 300 * time.Second
	tutorCachePrefix    = "tutor"
)

type TutorService struct {
	repo  tutor.TutorRepository
	cache cache.Cache
	mock  []tutor.TutorSearchResult
}

func NewTutorService(repo tutor.TutorRepository, c cache.Cache) *TutorService {
	return &TutorService{repo: repo, cache: c, mock: mockTutors()}
}

func (s *TutorService) Search(ctx context.Context, params tutor.TutorSearchParams) ([]tutor.TutorSearchResult, int64, error) {
	if s.repo == nil {
		return s.mockSearch(params)
	}
	cacheKey := cache.CacheKey(tutorCachePrefix, "search", searchParamsKey(params))

	if cached, err := s.cache.Get(ctx, cacheKey); err == nil && cached != "" {
		var data []tutor.TutorSearchResult
		if json.Unmarshal([]byte(cached), &data) == nil {
			return data, int64(len(data)), nil
		}
	}

	results, total, err := s.repo.Search(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	if b, err := json.Marshal(results); err == nil {
		_ = s.cache.Set(ctx, cacheKey, string(b), tutorSearchCacheTTL)
	}
	return results, total, nil
}

func (s *TutorService) GetBySlug(ctx context.Context, slug string) (*tutor.TutorProfile, error) {
	if s.repo == nil {
		for _, m := range s.mock {
			if m.Profile.Slug == slug {
				cp := m.Profile
				return &cp, nil
			}
		}
		return nil, domain.ErrNotFound
	}
	cacheKey := cache.CacheKey(tutorCachePrefix, "slug", slug)
	if cached, err := s.cache.Get(ctx, cacheKey); err == nil && cached != "" {
		var t tutor.TutorProfile
		if json.Unmarshal([]byte(cached), &t) == nil {
			return &t, nil
		}
	}
	t, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if b, err := json.Marshal(t); err == nil {
		_ = s.cache.Set(ctx, cacheKey, string(b), tutorSlugCacheTTL)
	}
	return t, nil
}

// InvalidateSearchCache clears tutor:search:* — call after any write that
// affects tutor search visibility (vetting approval, rate change, pause).
func (s *TutorService) InvalidateSearchCache(ctx context.Context) error {
	if rc, ok := s.cache.(*cache.RedisCache); ok {
		return rc.DelPrefix(ctx, cache.CacheKey(tutorCachePrefix, "search")+"*")
	}
	return s.cache.Del(ctx, cache.CacheKey(tutorCachePrefix, "search", "*"))
}

func searchParamsKey(v any) string {
	b, _ := json.Marshal(v)
	return fmt.Sprintf("v1-%x", b)
}

func containsStr(hay []string, needle string) bool {
	for _, h := range hay {
		if h == needle {
			return true
		}
	}
	return false
}

func mustUUID(s string) uuid.UUID {
	id, err := uuid.Parse(s)
	if err != nil {
		panic(err)
	}
	return id
}

// mockTutors — dev-only seed mirroring the marketing pages' tutors
// (chinasa, oluwatobi). Never shipped to production (repo always wired there).
func mockTutors() []tutor.TutorSearchResult {
	lagos := "Lekki, Lagos"
	chinasa := tutor.TutorProfile{
		ID: mustUUID("00000000-0000-0000-0000-000000000101"), Slug: "chinasa",
		DisplayName: "Chinasa", Status: tutor.TutorStatusApproved, IsPublic: true,
		RatingAvg: 4.87, RatingCount: 28, RankingScore: 98.5,
		AcceptsOnline: true, AcceptsInPerson: true,
	}
	oluwatobi := tutor.TutorProfile{
		ID: mustUUID("00000000-0000-0000-0000-000000000102"), Slug: "oluwatobi",
		DisplayName: "Oluwatobi", Status: tutor.TutorStatusApproved, IsPublic: true,
		RatingAvg: 4.6, RatingCount: 20, RankingScore: 95.2,
		AcceptsOnline: true, AcceptsInPerson: true,
	}
	return []tutor.TutorSearchResult{
		{Profile: chinasa, Subjects: []string{"Mathematics", "English"}, SubjectSlugs: []string{"mathematics", "english"}, LocationLabel: &lagos},
		{Profile: oluwatobi, Subjects: []string{"Mathematics", "Physics"}, SubjectSlugs: []string{"mathematics", "physics"}, LocationLabel: &lagos},
	}
}

func (s *TutorService) mockSearch(p tutor.TutorSearchParams) ([]tutor.TutorSearchResult, int64, error) {
	var out []tutor.TutorSearchResult
	for _, m := range s.mock {
		if p.SubjectSlug != "" && !containsStr(m.SubjectSlugs, p.SubjectSlug) {
			continue
		}
		out = append(out, m)
	}
	return out, int64(len(out)), nil
}
