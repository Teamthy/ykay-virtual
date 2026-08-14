package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/content"
	"ykay-virtual/internal/domain/tutor"

	"github.com/google/uuid"
)

// ContentService — blog catalogue (SSG+ISR, cached), redirect map (301s for
// renamed slugs — fixes Tuteria's soft-404 sitemap bug) and the
// related-content graph (tutor↔subject↔programme↔blog internal linking).

const (
	blogListCacheTTL = 300 * time.Second
	blogSlugCacheTTL = 600 * time.Second
)

type ContentService struct {
	blog         content.BlogPostRepository
	redirects    content.RedirectRepository
	tutors       tutor.TutorRepository
	programmes   academics.ProgrammeRepository
	testimonials content.TestimonialRepository
	cache        cache.Cache
	now          func() time.Time
}

func NewContentService(blog content.BlogPostRepository, redirects content.RedirectRepository,
	tutors tutor.TutorRepository, programmes academics.ProgrammeRepository,
	c cache.Cache) *ContentService {
	return &ContentService{
		blog: blog, redirects: redirects, tutors: tutors, programmes: programmes,
		cache: c, now: time.Now,
	}
}

// BlogPostDTO — post + tags for rendering (Article JSON-LD, related links).
type BlogPostDTO struct {
	content.BlogPost
	SubjectSlugs []string `json:"subject_slugs"`
	ExamSlugs    []string `json:"exam_slugs"`
}

func (s *ContentService) ListPosts(ctx context.Context, p content.BlogListParams) ([]BlogPostDTO, int64, error) {
	if s.blog == nil {
		return []BlogPostDTO{}, 0, nil
	}
	cacheKey := cache.CacheKey("blog", "list", searchParamsKey(struct {
		Subject  string
		Exam     string
		Page     int
		PageSize int
	}{p.Subject, p.Exam, p.Page, p.PageSize}))
	if cached, err := s.cache.Get(ctx, cacheKey); err == nil && cached != "" {
		var dto []BlogPostDTO
		if json.Unmarshal([]byte(cached), &dto) == nil {
			return dto, int64(len(dto)), nil
		}
	}

	posts, total, err := s.blog.ListPublished(ctx, p)
	if err != nil {
		return nil, 0, err
	}
	ids := make([]uuid.UUID, 0, len(posts))
	for _, b := range posts {
		ids = append(ids, b.ID)
	}
	tags, err := s.blog.TagsForPosts(ctx, ids)
	if err != nil {
		return nil, 0, err
	}
	out := make([]BlogPostDTO, 0, len(posts))
	for _, b := range posts {
		t := tags[b.ID]
		out = append(out, BlogPostDTO{BlogPost: b, SubjectSlugs: t.SubjectSlugs, ExamSlugs: t.ExamSlugs})
	}
	if b, err := json.Marshal(out); err == nil {
		_ = s.cache.Set(ctx, cacheKey, string(b), blogListCacheTTL)
	}
	return out, total, nil
}

func (s *ContentService) GetPostBySlug(ctx context.Context, slug string) (*BlogPostDTO, error) {
	if s.blog == nil {
		return nil, nil
	}
	cacheKey := cache.CacheKey("blog", "slug", slug)
	if cached, err := s.cache.Get(ctx, cacheKey); err == nil && cached != "" {
		var dto BlogPostDTO
		if json.Unmarshal([]byte(cached), &dto) == nil {
			return &dto, nil
		}
	}
	post, err := s.blog.GetPublishedBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	tags, err := s.blog.TagsForPosts(ctx, []uuid.UUID{post.ID})
	if err != nil {
		return nil, err
	}
	t := tags[post.ID]
	dto := &BlogPostDTO{BlogPost: *post, SubjectSlugs: t.SubjectSlugs, ExamSlugs: t.ExamSlugs}
	if b, err := json.Marshal(dto); err == nil {
		_ = s.cache.Set(ctx, cacheKey, string(b), blogSlugCacheTTL)
	}
	return dto, nil
}

// ResolveRedirect — 301 map lookup for renamed slugs.
func (s *ContentService) ResolveRedirect(ctx context.Context, fromSlug string) (*content.RedirectMap, error) {
	if s.redirects == nil {
		return nil, nil
	}
	return s.redirects.Lookup(ctx, fromSlug)
}

// RelatedContent — the internal-linking graph for a subject page:
// approved tutors, published programmes, published blog posts.
type RelatedContent struct {
	Tutors     []tutor.TutorSearchResult `json:"tutors"`
	Programmes []academics.Programme     `json:"programmes"`
	Posts      []BlogPostDTO             `json:"posts"`
}

func (s *ContentService) RelatedContent(ctx context.Context, subjectSlug string) (*RelatedContent, error) {
	out := &RelatedContent{Tutors: []tutor.TutorSearchResult{}, Programmes: []academics.Programme{}, Posts: []BlogPostDTO{}}
	if subjectSlug == "" {
		return out, nil
	}
	cacheKey := cache.CacheKey("related", subjectSlug)
	if cached, err := s.cache.Get(ctx, cacheKey); err == nil && cached != "" {
		var rc RelatedContent
		if json.Unmarshal([]byte(cached), &rc) == nil {
			return &rc, nil
		}
	}

	if s.tutors != nil {
		if tutors, _, err := s.tutors.Search(ctx, tutor.TutorSearchParams{
			SubjectSlug: subjectSlug, Page: 1, PageSize: 6,
		}); err == nil {
			out.Tutors = tutors
		}
	}
	if s.programmes != nil {
		if programmes, _, err := s.programmes.List(ctx, academics.ProgrammeListParams{
			SubjectSlug: subjectSlug, Page: 1, PageSize: 6,
		}); err == nil {
			out.Programmes = programmes
		}
	}
	if s.blog != nil {
		if posts, err := s.blog.RelatedBySlugs(ctx, []string{subjectSlug}, nil, 6); err == nil {
			ids := make([]uuid.UUID, 0, len(posts))
			for _, b := range posts {
				ids = append(ids, b.ID)
			}
			tags, _ := s.blog.TagsForPosts(ctx, ids)
			for _, b := range posts {
				t := tags[b.ID]
				out.Posts = append(out.Posts, BlogPostDTO{BlogPost: b, SubjectSlugs: t.SubjectSlugs, ExamSlugs: t.ExamSlugs})
			}
		}
	}
	if b, err := json.Marshal(out); err == nil {
		_ = s.cache.Set(ctx, cacheKey, string(b), 300*time.Second)
	}
	return out, nil
}

// AddRedirect — admin helper (Phase 11 console); upserts the map.
func (s *ContentService) AddRedirect(ctx context.Context, fromSlug, toSlug string, redirectType string, createdBy *uuid.UUID) error {
	if fromSlug == "" || toSlug == "" {
		return fmt.Errorf("from_slug and to_slug are required")
	}
	if redirectType == "" {
		redirectType = "301"
	}
	if s.redirects == nil {
		return nil
	}
	return s.redirects.Create(ctx, fromSlug, toSlug, redirectType, createdBy)
}

// --- Testimonials (admin-managed, consent-gated) ---

// ListTestimonials — public, consent-given + is_public only (featured first).
func (s *ContentService) ListTestimonials(ctx context.Context, featuredOnly bool, limit int) ([]content.Testimonial, error) {
	if s.testimonials == nil {
		return []content.Testimonial{}, nil
	}
	return s.testimonials.ListPublic(ctx, featuredOnly, limit)
}

// CreateTestimonial — admin-managed (consent flag required to ever be public).
func (s *ContentService) CreateTestimonial(ctx context.Context, adminID uuid.UUID, t *content.Testimonial) (*content.Testimonial, error) {
	if strings.TrimSpace(t.AuthorName) == "" || strings.TrimSpace(t.Body) == "" {
		return nil, fmt.Errorf("%w: author_name and body are required", domain.ErrInvalidInput)
	}
	// G5.3 workflow: a testimonial may be CREATED as a draft without consent
	// on file (e.g. importing a submitted quote), but it can never go PUBLIC
	// without consent — enforced here at create time and again by
	// AdminService.SetTestimonialPublic at approval time.
	if t.IsPublic && !t.ConsentGiven {
		return nil, fmt.Errorf("%w: cannot publish without consent", domain.ErrConflict)
	}
	if s.testimonials == nil {
		return nil, errors.New("testimonial store unavailable")
	}
	if err := s.testimonials.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

// WithTestimonials wires the consent-gated testimonial repository.
func (s *ContentService) WithTestimonials(t content.TestimonialRepository) *ContentService {
	s.testimonials = t
	return s
}
