package academics

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Entities for the curriculum-governed catalogue (migration 000005_academics).
// Programme + Subject are the SEO-first public catalogue surfaces; cohorts
// (scheduled deliveries) live in the booking domain.

type Curriculum struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Country   string    `json:"country"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type Level struct {
	ID           uuid.UUID `json:"id"`
	CurriculumID uuid.UUID `json:"curriculum_id"`
	Name         string    `json:"name"`
	Slug         string    `json:"slug"`
	SortOrder    int       `json:"sort_order"`
}

type Exam struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	Slug     string    `json:"slug"`
	Category string    `json:"category"`
	IsActive bool      `json:"is_active"`
}

type Subject struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Category    string    `json:"category"`
	Description *string   `json:"description,omitempty"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ProgrammeStatus string

const (
	ProgrammeDraft     ProgrammeStatus = "DRAFT"
	ProgrammePublished ProgrammeStatus = "PUBLISHED"
	ProgrammeArchived  ProgrammeStatus = "ARCHIVED"
)

type ProgrammeFormat string

const (
	FormatCohort      ProgrammeFormat = "COHORT"
	FormatPrivate     ProgrammeFormat = "PRIVATE"
	FormatBootcamp    ProgrammeFormat = "BOOTCAMP"
	FormatHoliday     ProgrammeFormat = "HOLIDAY"
	FormatOnlineClass ProgrammeFormat = "ONLINE_CLASS"
	FormatHybrid      ProgrammeFormat = "HYBRID"
)

type Programme struct {
	ID             uuid.UUID       `json:"id"`
	Title          string          `json:"title"`
	Slug           string          `json:"slug"`
	Summary        *string         `json:"summary,omitempty"`
	Description    *string         `json:"description,omitempty"`
	CurriculumID   *uuid.UUID      `json:"curriculum_id,omitempty"`
	LevelID        *uuid.UUID      `json:"level_id,omitempty"`
	ExamID         *uuid.UUID      `json:"exam_id,omitempty"`
	Format         ProgrammeFormat `json:"format"`
	Status         ProgrammeStatus `json:"status"`
	PriceMin       *float64        `json:"price_min,omitempty"`
	PriceMax       *float64        `json:"price_max,omitempty"`
	Currency       string          `json:"currency"`
	IsFeatured     bool            `json:"is_featured"`
	SeoTitle       *string         `json:"seo_title,omitempty"`
	SeoDescription *string         `json:"seo_description,omitempty"`
	CoverImageKey  *string         `json:"cover_image_key,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

func (p *Programme) IsPublished() bool { return p.Status == ProgrammePublished }

type ProgrammeSubject struct {
	ProgrammeID uuid.UUID `json:"programme_id"`
	SubjectID   uuid.UUID `json:"subject_id"`
	IsPrimary   bool      `json:"is_primary"`
}

// --- Repository interfaces (implemented in internal/repository/postgres) ---

type SubjectRepository interface {
	List(ctx context.Context, params SubjectListParams) ([]Subject, int64, error)
	GetBySlug(ctx context.Context, slug string) (*Subject, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Subject, error)
}

type SubjectListParams struct {
	Search   string
	Category string
	Page     int
	PageSize int
	Sort     string
}

type ProgrammeRepository interface {
	List(ctx context.Context, params ProgrammeListParams) ([]Programme, int64, error)
	GetBySlug(ctx context.Context, slug string) (*Programme, error)
}

type ProgrammeListParams struct {
	Search      string
	SubjectSlug string
	Curriculum  string
	Exam        string
	Format      string
	Level       string
	Featured    *bool
	Page        int
	PageSize    int
	Sort        string
}

// ProgrammeDetail — programme + display names + subjects + next cohort start.
type ProgrammeDetail struct {
	Programme
	CurriculumName *string  `json:"curriculum_name,omitempty"`
	LevelName      *string  `json:"level_name,omitempty"`
	ExamName       *string  `json:"exam_name,omitempty"`
	NextStart      *string  `json:"next_start,omitempty"` // ISO date of next published cohort
	Subjects       []string `json:"subjects"`             // subject names
	SubjectSlugs   []string `json:"subject_slugs"`
}
