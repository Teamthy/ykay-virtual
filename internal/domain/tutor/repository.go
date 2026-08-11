package tutor

import (
	"context"

	"github.com/google/uuid"
)

// TutorRepository — read side for the public marketplace + booking engine.
// Implementations: internal/repository/postgres, internal/repository/memory.

type TutorSearchParams struct {
	SubjectSlug string
	Location    string
	Online      *bool // accepts_online filter when set
	InPerson    *bool // accepts_in_person filter when set
	MinPrice    *float64
	MaxPrice    *float64
	MinRating   *float64
	Page        int
	PageSize    int
	Sort        string // whitelist: ranking_score | rating | price | newest
}

type TutorSearchResult struct {
	Profile      TutorProfile
	Subjects     []string
	SubjectSlugs []string
	// LocationLabel is a denormalized display string (city/area/state) filled
	// by the postgres repository for search-result cards.
	LocationLabel *string
}

type TutorRepository interface {
	Search(ctx context.Context, params TutorSearchParams) ([]TutorSearchResult, int64, error)
	GetBySlug(ctx context.Context, slug string) (*TutorProfile, error)
	GetByID(ctx context.Context, id uuid.UUID) (*TutorProfile, error)
}

// TutorSubjectRepository — the tutor's teaching scope (tutor_subjects).
// Used by the vetting pipeline (subject selection + assessment eligibility)
// and the booking engine's TutorCanTeach check.
type TutorSubjectRepository interface {
	ListByTutor(ctx context.Context, profileID uuid.UUID) ([]TutorSubjectEntry, error)
	AddForTutor(ctx context.Context, profileID, subjectID uuid.UUID) error
}

// TutorSubjectEntry — a subject in the tutor's teaching scope.
type TutorSubjectEntry struct {
	SubjectID uuid.UUID `json:"subject_id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Approved  bool      `json:"approved"`
}
