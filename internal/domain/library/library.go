// Package library — the on-demand recorded-lesson library catalogue
// (migration 000064). A recorded lesson is a `lessons` row with a `video_url`
// (000035) plus optional `transcript` (000061). `recorded_library` is a 1:1
// companion row that admins use to curate which recorded lessons appear in the
// public catalogue (visible/featured/thumbnail/duration/sort) WITHOUT touching
// the core lessons table or every query that reads it.
//
// Design rule (extend, don't fork): the library is a browse/discovery surface
// over the existing lessons→cohort→programme spine. Making an item "visible"
// never grants playback to non-members — entitlement stays in the service layer
// (a viewer must be a participant of the lesson's cohort/private package, or an
// admin), and the API nulls `video_url`/`transcript` for non-entitled viewers.
package library

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// LibraryMeta — the curatable portion of a catalogue row.
type LibraryMeta struct {
	Visible         bool    `json:"visible"`
	Featured        bool    `json:"featured"`
	ThumbnailURL    *string `json:"thumbnail_url,omitempty"`
	DurationSeconds *int    `json:"duration_seconds,omitempty"`
	SortOrder       int     `json:"sort_order"`
}

// Item — one catalogue row: lesson + library meta + cohort/programme context.
// VideoURL/Transcript are only populated by the service when the viewer is
// entitled to playback; Entitled is computed in the service layer.
type Item struct {
	LessonID        uuid.UUID `json:"lesson_id"`
	Title           string    `json:"title"`
	Description     *string   `json:"description,omitempty"`
	VideoURL        *string   `json:"video_url,omitempty"`
	Transcript      *string   `json:"transcript,omitempty"`
	ThumbnailURL    *string   `json:"thumbnail_url,omitempty"`
	DurationSeconds *int      `json:"duration_seconds,omitempty"`
	Visible         bool      `json:"visible"`
	Featured        bool      `json:"featured"`
	SortOrder       int       `json:"sort_order"`
	StartAt         time.Time `json:"start_at"`
	EndAt           time.Time `json:"end_at"`
	Status          string    `json:"-"`

	// Cohort / programme context (nullable — a lesson may predate a cohort,
	// or be attached to a private package with no public programme).
	CohortID       *uuid.UUID `json:"cohort_id,omitempty"`
	CohortTitle    *string    `json:"cohort_title,omitempty"`
	CohortSlug     *string    `json:"cohort_slug,omitempty"`
	ProgrammeID    *uuid.UUID `json:"programme_id,omitempty"`
	ProgrammeTitle *string    `json:"programme_title,omitempty"`
	ProgrammeSlug  *string    `json:"programme_slug,omitempty"`
	CurriculumName *string    `json:"curriculum_name,omitempty"`
	LevelName      *string    `json:"level_name,omitempty"`
	Subjects       []string   `json:"subjects"`

	// Entitled — whether the current viewer may play this item. Service-set.
	Entitled bool `json:"entitled"`
}

// Filter — catalogue query filters. All are optional (nil = no filter).
type Filter struct {
	Search       string
	ProgrammeID  *uuid.UUID
	SubjectID    *uuid.UUID
	LevelID      *uuid.UUID
	CurriculumID *uuid.UUID
	FeaturedOnly bool
	Page         int
	PageSize     int
}

// UpdateMetaInput — partial update of a lesson's library row. Nil pointers are
// left untouched; a zero/negative numeric value is only applied when its
// pointer is non-nil (so callers can clear a duration by passing a pointer to 0).
type UpdateMetaInput struct {
	Visible         *bool
	Featured        *bool
	ThumbnailURL    *string
	DurationSeconds *int
	SortOrder       *int
}

// Repository — persistence contract for the library.
type Repository interface {
	// Catalogue returns the public, visible items matching the filter, plus
	// the total matching count (before paging).
	Catalogue(ctx context.Context, f Filter) ([]Item, int64, error)
	// Featured returns the visible + featured items (homepage rail).
	Featured(ctx context.Context, limit int) ([]Item, error)
	// GetByLessonID returns one item (regardless of visibility) so a detail
	// page can render metadata + apply entitlement.
	GetByLessonID(ctx context.Context, lessonID uuid.UUID) (*Item, error)
	// ListAdmin returns every recorded lesson (video_url set) with its library
	// meta, for the admin content manager — including non-visible rows.
	ListAdmin(ctx context.Context, search string, page, pageSize int) ([]Item, int64, error)
	// UpdateMeta upserts the library row for a lesson.
	UpdateMeta(ctx context.Context, lessonID uuid.UUID, in UpdateMetaInput) error
}
