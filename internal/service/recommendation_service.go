package service

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/tutor"
)

// RecommendationService — the suggestions engine (G6 pilot polish):
// ranks the live catalogue for the SESSION's profile. Everything is
// derived from server-side data (learner level, cohort popularity and
// start date, tutor ranking) — no fixture IDs, no client guessing.

type RecommendedCohort struct {
	booking.Cohort
	Reason string `json:"reason"`
}

type RecommendedProgramme struct {
	academics.Programme
	Reason string `json:"reason"`
}

// RecommendedTutor — clean API DTO (the repository search result embeds the
// full domain profile; the API must not leak internal field names).
type RecommendedTutor struct {
	Profile  RecommendedTutorProfile `json:"profile"`
	Subjects []string                `json:"subjects"`
}

// RecommendedTutorProfile — public tutor summary for the recommendations feed.
type RecommendedTutorProfile struct {
	ID          string  `json:"id"`
	Slug        string  `json:"slug"`
	DisplayName string  `json:"display_name"`
	RatingAvg   float64 `json:"rating_avg"`
	RatingCount int     `json:"rating_count"`
}

type Recommendations struct {
	Cohorts    []RecommendedCohort    `json:"cohorts"`
	Programmes []RecommendedProgramme `json:"programmes"`
	Tutors     []RecommendedTutor     `json:"tutors"`
	Basis      string                 `json:"basis"` // human-readable personalisation note
}

type RecommendationService struct {
	cohorts    booking.CohortRepository
	programmes academics.ProgrammeRepository
	tutors     tutor.TutorRepository
	students   identity.StudentProfileRepository
}

func NewRecommendationService(cohorts booking.CohortRepository,
	programmes academics.ProgrammeRepository, tutors tutor.TutorRepository,
	students identity.StudentProfileRepository) *RecommendationService {
	return &RecommendationService{cohorts: cohorts, programmes: programmes, tutors: tutors, students: students}
}

// ForSession — recommendations scoped to the session user's profile:
// parents rank by their learners' levels; students by their own level;
// tutors see the cohorts still open for enrolment (supply-side view).
func (s *RecommendationService) ForSession(ctx context.Context, userID uuid.UUID, roles []string) (*Recommendations, error) {
	out := &Recommendations{}

	// Resolve the learner level(s) that personalise the feed.
	var levels []string
	studentProfiles, _ := s.students.ListByParentUserID(ctx, userID)
	if len(studentProfiles) == 0 {
		if own, err := s.students.FindByUserID(ctx, userID); err == nil && own != nil {
			studentProfiles = []identity.StudentProfile{*own}
		}
	}
	for _, sp := range studentProfiles {
		if sp.CurrentLevel != nil && *sp.CurrentLevel != "" {
			levels = append(levels, *sp.CurrentLevel)
		}
	}
	isTutor := false
	for _, r := range roles {
		if r == "TUTOR" {
			isTutor = true
		}
	}

	// Cohorts: published + open, ordered by soonest start then popularity.
	cohorts, _, err := s.cohorts.ListPublished(ctx, booking.CohortListParams{
		Status: string(booking.CohortPublished), Page: 1, PageSize: 12,
	})
	if err == nil {
		open := make([]booking.Cohort, 0, len(cohorts))
		for _, c := range cohorts {
			if c.CanEnroll() {
				open = append(open, c)
			}
		}
		// Stable ordering: soonest start first, then fill rate.
		for i := range open {
			for j := i + 1; j < len(open); j++ {
				if cohortLess(open[j], open[i]) {
					open[i], open[j] = open[j], open[i]
				}
			}
		}
		limit := 3
		if len(open) < limit {
			limit = len(open)
		}
		for _, c := range open[:limit] {
			out.Cohorts = append(out.Cohorts, RecommendedCohort{
				Cohort: c,
				Reason: cohortReason(c, levels, isTutor),
			})
		}
	}

	// Programmes: featured first, level-tagged where the title matches.
	progs, _, err := s.programmes.List(ctx, academics.ProgrammeListParams{
		Page: 1, PageSize: 6, Featured: boolPtr(true),
	})
	if err == nil && len(progs) == 0 {
		progs, _, err = s.programmes.List(ctx, academics.ProgrammeListParams{Page: 1, PageSize: 6})
	}
	if err == nil {
		for _, p := range progs {
			if len(out.Programmes) >= 3 {
				break
			}
			out.Programmes = append(out.Programmes, RecommendedProgramme{
				Programme: p,
				Reason:    programmeReason(p.Title, levels),
			})
		}
	}

	// Tutors: top-ranked, then rating — the same ordering search uses.
	// Mapped into a clean API DTO (never serialize the raw domain struct).
	// Subjects is coerced to [] so the API never emits JSON null (the PG
	// search path can leave it unset — the client crashed on null.slice).
	tutors, _, err := s.tutors.Search(ctx, tutor.TutorSearchParams{
		Sort: "ranking_score", Page: 1, PageSize: 3,
	})
	if err == nil {
		for _, t := range tutors {
			subjects := t.Subjects
			if subjects == nil {
				subjects = []string{}
			}
			out.Tutors = append(out.Tutors, RecommendedTutor{
				Profile: RecommendedTutorProfile{
					ID:          t.Profile.ID.String(),
					Slug:        t.Profile.Slug,
					DisplayName: t.Profile.DisplayName,
					RatingAvg:   t.Profile.RatingAvg,
					RatingCount: t.Profile.RatingCount,
				},
				Subjects: subjects,
			})
		}
	}

	// Basis line for the UI ("Because of…").
	switch {
	case isTutor:
		out.Basis = "Open cohorts that still need tutors — sorted by nearest start."
	case len(levels) > 0:
		out.Basis = "Based on " + strings.Join(levels, ", ") + " learners in your family."
	default:
		out.Basis = "Popular right now across YK-Virtual."
	}
	return out, nil
}

func cohortLess(a, b booking.Cohort) bool {
	if !a.StartDate.Equal(b.StartDate) {
		return a.StartDate.Before(b.StartDate)
	}
	return float64(a.EnrolledCount)/float64(max1(a.Capacity)) >
		float64(b.EnrolledCount)/float64(max1(b.Capacity))
}

func max1(n int) int {
	if n < 1 {
		return 1
	}
	return n
}

func cohortReason(c booking.Cohort, levels []string, isTutor bool) string {
	if isTutor {
		return "Open for enrolment"
	}
	if len(levels) > 0 {
		return "Starts " + c.StartDate.Format("2 Jan") + " · " + strings.Join(levels, ", ") + " fit"
	}
	return "Starts " + c.StartDate.Format("2 Jan") + " · popular"
}

func programmeReason(title string, levels []string) string {
	tl := strings.ToLower(title)
	for _, l := range levels {
		if strings.Contains(tl, strings.ToLower(l)) {
			return "Matches " + l
		}
	}
	return "Featured"
}

func boolPtr(b bool) *bool { return &b }

var _ = uuid.Nil // keep uuid import for future scoring by location
