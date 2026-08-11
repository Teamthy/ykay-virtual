package memory

import (
	"context"
	"sort"
	"strings"
	"sync"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/content"

	"github.com/google/uuid"
)

// In-memory blog + redirect stores (tests / dev fallback).

type BlogMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*content.BlogPost
	tags map[uuid.UUID]content.PostTags
}

func NewBlogMemory() *BlogMemory {
	return &BlogMemory{rows: map[uuid.UUID]*content.BlogPost{}, tags: map[uuid.UUID]content.PostTags{}}
}

func (m *BlogMemory) Seed(p *content.BlogPost, tags content.PostTags) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	p.Status = content.StatusPublished
	m.rows[p.ID] = p
	m.tags[p.ID] = tags
}

func (m *BlogMemory) ListPublished(_ context.Context, params content.BlogListParams) ([]content.BlogPost, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []content.BlogPost
	for _, p := range m.rows {
		if p.Status != content.StatusPublished {
			continue
		}
		if params.Subject != "" {
			tags := m.tags[p.ID]
			if !containsStr(tags.SubjectSlugs, params.Subject) {
				continue
			}
		}
		if params.Exam != "" {
			tags := m.tags[p.ID]
			if !containsStr(tags.ExamSlugs, params.Exam) {
				continue
			}
		}
		out = append(out, *p)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].PublishedAt.After(*out[j].PublishedAt)
	})
	total := int64(len(out))
	start := (params.Page - 1) * params.PageSize
	if start < 0 {
		start = 0
	}
	end := start + params.PageSize
	if params.PageSize < 1 {
		end = start + 20
	}
	if start > len(out) {
		start = len(out)
	}
	if end > len(out) {
		end = len(out)
	}
	return out[start:end], total, nil
}

func (m *BlogMemory) GetPublishedBySlug(_ context.Context, slug string) (*content.BlogPost, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, p := range m.rows {
		if p.Slug == slug && p.Status == content.StatusPublished {
			cp := *p
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *BlogMemory) TagsForPosts(_ context.Context, postIDs []uuid.UUID) (map[uuid.UUID]content.PostTags, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := map[uuid.UUID]content.PostTags{}
	for _, id := range postIDs {
		if t, ok := m.tags[id]; ok {
			out[id] = t
		}
	}
	return out, nil
}

func (m *BlogMemory) RelatedBySlugs(_ context.Context, subjectSlugs, examSlugs []string, limit int) ([]content.BlogPost, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []content.BlogPost
	for _, p := range m.rows {
		if p.Status != content.StatusPublished {
			continue
		}
		tags := m.tags[p.ID]
		matched := false
		for _, s := range subjectSlugs {
			if containsStr(tags.SubjectSlugs, s) {
				matched = true
				break
			}
		}
		if !matched {
			for _, e := range examSlugs {
				if containsStr(tags.ExamSlugs, e) {
					matched = true
					break
				}
			}
		}
		if matched {
			out = append(out, *p)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].PublishedAt.After(*out[j].PublishedAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

var _ content.BlogPostRepository = (*BlogMemory)(nil)

func containsStr(hay []string, needle string) bool {
	for _, h := range hay {
		if strings.EqualFold(h, needle) {
			return true
		}
	}
	return false
}

// --- Redirects ---

type RedirectMemory struct {
	mu   sync.RWMutex
	rows map[string]*content.RedirectMap
}

func NewRedirectMemory() *RedirectMemory {
	return &RedirectMemory{rows: map[string]*content.RedirectMap{}}
}

func (m *RedirectMemory) Seed(from, to string, redirectType string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.rows[from] = &content.RedirectMap{ID: uuid.New(), FromSlug: from, ToSlug: to, Type: redirectType}
}

func (m *RedirectMemory) Lookup(_ context.Context, fromSlug string) (*content.RedirectMap, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if r, ok := m.rows[fromSlug]; ok {
		cp := *r
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *RedirectMemory) Create(_ context.Context, fromSlug, toSlug, redirectType string, _ *uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.rows[fromSlug] = &content.RedirectMap{ID: uuid.New(), FromSlug: fromSlug, ToSlug: toSlug, Type: redirectType}
	return nil
}

func (m *RedirectMemory) List(_ context.Context, limit int) ([]content.RedirectMap, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []content.RedirectMap{}
	for _, r := range m.rows {
		out = append(out, *r)
	}
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

var _ content.RedirectRepository = (*RedirectMemory)(nil)
