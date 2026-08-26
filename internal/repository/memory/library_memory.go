package memory

import (
	"context"
	"sort"
	"strings"
	"sync"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/library"
)

// LibraryMemory — in-memory library.Repository for tests + dev.
type LibraryMemory struct {
	mu    sync.RWMutex
	items []library.Item
}

func NewLibraryMemory() *LibraryMemory {
	return &LibraryMemory{items: []library.Item{}}
}

// Seed inserts items directly (tests).
func (m *LibraryMemory) Seed(items ...library.Item) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.items = append(m.items, items...)
}

func (m *LibraryMemory) find(lessonID uuid.UUID) (int, *library.Item) {
	for i := range m.items {
		if m.items[i].LessonID == lessonID {
			return i, &m.items[i]
		}
	}
	return -1, nil
}

func (m *LibraryMemory) match(it *library.Item, f library.Filter) bool {
	if f.FeaturedOnly && !it.Featured {
		return false
	}
	if f.ProgrammeID != nil && (it.ProgrammeID == nil || *it.ProgrammeID != *f.ProgrammeID) {
		return false
	}
	if f.LevelID != nil && (it.LevelName == nil || !strings.EqualFold(*it.LevelName, f.LevelID.String())) {
		// Memory impl uses a placeholder: match by a synthetic subject/level via
		// tags is not modelled; level filter is a no-op unless we add tags.
		_ = f.LevelID
	}
	if s := strings.TrimSpace(f.Search); s != "" {
		if !strings.Contains(strings.ToLower(it.Title), strings.ToLower(s)) {
			return false
		}
	}
	return true
}

func (m *LibraryMemory) Catalogue(_ context.Context, f library.Filter) ([]library.Item, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if f.PageSize < 1 || f.PageSize > 100 {
		f.PageSize = 24
	}
	if f.Page < 1 {
		f.Page = 1
	}
	vis := []library.Item{}
	for i := range m.items {
		if m.items[i].Visible && m.match(&m.items[i], f) {
			vis = append(vis, m.items[i])
		}
	}
	sort.SliceStable(vis, func(a, b int) bool {
		if vis[a].Featured != vis[b].Featured {
			return vis[a].Featured
		}
		if vis[a].SortOrder != vis[b].SortOrder {
			return vis[a].SortOrder < vis[b].SortOrder
		}
		return vis[a].StartAt.After(vis[b].StartAt)
	})
	total := int64(len(vis))
	lo := (f.Page - 1) * f.PageSize
	if lo > len(vis) {
		lo = len(vis)
	}
	hi := lo + f.PageSize
	if hi > len(vis) {
		hi = len(vis)
	}
	return vis[lo:hi], total, nil
}

func (m *LibraryMemory) Featured(_ context.Context, limit int) ([]library.Item, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if limit < 1 || limit > 100 {
		limit = 8
	}
	out := []library.Item{}
	for i := range m.items {
		if m.items[i].Visible && m.items[i].Featured {
			out = append(out, m.items[i])
			if len(out) >= limit {
				break
			}
		}
	}
	return out, nil
}

func (m *LibraryMemory) GetByLessonID(_ context.Context, lessonID uuid.UUID) (*library.Item, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	_, it := m.find(lessonID)
	if it == nil {
		return nil, domain.ErrNotFound
	}
	c := *it
	return &c, nil
}

func (m *LibraryMemory) ListAdmin(_ context.Context, search string, page, pageSize int) ([]library.Item, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if pageSize < 1 || pageSize > 100 {
		pageSize = 24
	}
	if page < 1 {
		page = 1
	}
	all := []library.Item{}
	for i := range m.items {
		if m.items[i].VideoURL == nil {
			continue
		}
		if s := strings.TrimSpace(search); s != "" && !strings.Contains(strings.ToLower(m.items[i].Title), strings.ToLower(s)) {
			continue
		}
		all = append(all, m.items[i])
	}
	total := int64(len(all))
	lo := (page - 1) * pageSize
	if lo > len(all) {
		lo = len(all)
	}
	hi := lo + pageSize
	if hi > len(all) {
		hi = len(all)
	}
	return all[lo:hi], total, nil
}

func (m *LibraryMemory) UpdateMeta(_ context.Context, lessonID uuid.UUID, in library.UpdateMetaInput) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	i, it := m.find(lessonID)
	if it == nil {
		// A lesson can only be curated if it exists as a recorded item.
		return domain.ErrNotFound
	}
	if in.Visible != nil {
		it.Visible = *in.Visible
	}
	if in.Featured != nil {
		it.Featured = *in.Featured
	}
	if in.ThumbnailURL != nil {
		it.ThumbnailURL = in.ThumbnailURL
	}
	if in.DurationSeconds != nil {
		d := *in.DurationSeconds
		it.DurationSeconds = &d
	}
	if in.SortOrder != nil {
		it.SortOrder = *in.SortOrder
	}
	m.items[i] = *it
	return nil
}

var _ library.Repository = (*LibraryMemory)(nil)
