package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"

	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// --- Subjects ---

type SubjectHandler struct{ svc *service.SubjectService }

func NewSubjectHandler(svc *service.SubjectService) *SubjectHandler { return &SubjectHandler{svc: svc} }

func (h *SubjectHandler) List(w http.ResponseWriter, r *http.Request) {
	p := ParsePagination(r)
	params := academics.SubjectListParams{
		Search:   r.URL.Query().Get("search"),
		Category: firstNonEmpty(r.URL.Query().Get("category"), p.Filters["category"]),
		Page:     p.Page,
		PageSize: p.PageSize,
		Sort:     p.Sort,
	}
	subjects, total, err := h.svc.List(r.Context(), params)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, subjects, p.Meta(total))
}

func (h *SubjectHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	sub, err := h.svc.GetBySlug(r.Context(), slug)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if sub == nil {
		pkg.WriteError(w, http.StatusNotFound, string(pkg.CodeNotFound), "subject not found", nil)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, sub, nil)
}

// --- Tutors ---

type TutorHandler struct{ svc *service.TutorService }

func NewTutorHandler(svc *service.TutorService) *TutorHandler { return &TutorHandler{svc: svc} }

// TutorSubjectDTO — subject teaching summary on tutor cards/search results.
type TutorSubjectDTO struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type TutorDTO struct {
	ID               string            `json:"id"`
	Slug             string            `json:"slug"`
	DisplayName      string            `json:"display_name"`
	Headline         *string           `json:"headline,omitempty"`
	Bio              *string           `json:"bio,omitempty"`
	HourlyRateMin    *float64          `json:"hourly_rate_min,omitempty"`
	HourlyRateMax    *float64          `json:"hourly_rate_max,omitempty"`
	Currency         string            `json:"currency"`
	RatingAvg        float64           `json:"rating_avg"`
	RatingCount      int               `json:"rating_count"`
	RankingScore     float64           `json:"ranking_score"`
	Location         *string           `json:"location,omitempty"`
	AcceptsOnline    bool              `json:"accepts_online"`
	Subjects         []TutorSubjectDTO `json:"subjects"`
	Timezone         string            `json:"timezone"`
	YearsExperience  int               `json:"years_experience"`
	TotalHoursTaught int               `json:"total_hours_taught"`
	TotalStudents    int               `json:"total_students"`
}

func toTutorDTO(res tutor.TutorSearchResult) TutorDTO {
	return TutorDTO{
		ID:               res.Profile.ID.String(),
		Slug:             res.Profile.Slug,
		DisplayName:      res.Profile.DisplayName,
		Headline:         res.Profile.Headline,
		Bio:              res.Profile.Bio,
		HourlyRateMin:    res.Profile.HourlyRateMin,
		HourlyRateMax:    res.Profile.HourlyRateMax,
		Currency:         res.Profile.Currency,
		RatingAvg:        res.Profile.RatingAvg,
		RatingCount:      res.Profile.RatingCount,
		RankingScore:     res.Profile.RankingScore,
		Location:         res.LocationLabel,
		AcceptsOnline:    res.Profile.AcceptsOnline,
		Subjects:         toSubjectDTOs(res.Subjects, res.SubjectSlugs),
		Timezone:         res.Profile.Timezone,
		YearsExperience:  res.Profile.YearsExperience,
		TotalHoursTaught: res.Profile.TotalHoursTaught,
		TotalStudents:    res.Profile.TotalStudents,
	}
}

// toSubjectDTOs — pairs subject names with slugs (defensive when counts drift).
func toSubjectDTOs(names, slugs []string) []TutorSubjectDTO {
	out := []TutorSubjectDTO{}
	for i, name := range names {
		slug := ""
		if i < len(slugs) {
			slug = slugs[i]
		}
		out = append(out, TutorSubjectDTO{Name: name, Slug: slug})
	}
	return out
}

func (h *TutorHandler) Search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	p := ParsePagination(r)
	params := tutor.TutorSearchParams{
		Query:       firstNonEmpty(q.Get("q"), q.Get("query"), p.Filters["q"]),
		SubjectSlug: firstNonEmpty(q.Get("subject"), p.Filters["subject"], p.Filters["subject_slug"]),
		Location:    firstNonEmpty(q.Get("location"), p.Filters["location"]),
		Online:      ParseBoolPtr(q.Get("online")),
		InPerson:    ParseBoolPtr(q.Get("in_person")),
		MinPrice:    ParseFloatPtr(q.Get("min_price")),
		MaxPrice:    ParseFloatPtr(q.Get("max_price")),
		MinRating:   ParseFloatPtr(q.Get("min_rating")),
		Page:        p.Page,
		PageSize:    p.PageSize,
		Sort:        p.Sort,
	}
	results, total, err := h.svc.Search(r.Context(), params)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	out := make([]TutorDTO, 0, len(results))
	for _, res := range results {
		out = append(out, toTutorDTO(res))
	}
	pkg.WriteSuccess(w, http.StatusOK, out, p.Meta(total))
}

func (h *TutorHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	t, err := h.svc.GetBySlug(r.Context(), r.PathValue("slug"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if t == nil {
		pkg.WriteError(w, http.StatusNotFound, string(pkg.CodeNotFound), "tutor not found", nil)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, toTutorDTO(tutor.TutorSearchResult{Profile: *t}), nil)
}

// --- Programmes ---

type ProgrammeHandler struct{ svc *service.ProgrammeService }

func NewProgrammeHandler(svc *service.ProgrammeService) *ProgrammeHandler {
	return &ProgrammeHandler{svc: svc}
}

func (h *ProgrammeHandler) List(w http.ResponseWriter, r *http.Request) {
	p := ParsePagination(r)
	q := r.URL.Query()
	params := academics.ProgrammeListParams{
		Search:      q.Get("search"),
		SubjectSlug: q.Get("subject"),
		Curriculum:  firstNonEmpty(q.Get("curriculum"), p.Filters["curriculum"]),
		Exam:        firstNonEmpty(q.Get("exam"), p.Filters["exam"]),
		Format:      firstNonEmpty(q.Get("format"), p.Filters["format"]),
		Level:       firstNonEmpty(q.Get("level"), p.Filters["level"]),
		Featured:    ParseBoolPtr(q.Get("featured")),
		Page:        p.Page,
		PageSize:    p.PageSize,
		Sort:        p.Sort,
	}
	// Enriched when supported (postgres), plain otherwise.
	if list, total, err := h.svc.ListWithMeta(r.Context(), params); err == nil && list != nil {
		pkg.WriteSuccess(w, http.StatusOK, list, p.Meta(total))
		return
	}
	programmes, total, err := h.svc.List(r.Context(), params)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, programmes, p.Meta(total))
}

func (h *ProgrammeHandler) Tutors(w http.ResponseWriter, r *http.Request) {
	pr, err := h.svc.GetBySlug(r.Context(), r.PathValue("slug"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if pr == nil {
		pkg.WriteError(w, http.StatusNotFound, string(pkg.CodeNotFound), "programme not found", nil)
		return
	}
	tutors, err := h.svc.TutorsForProgramme(r.Context(), pr.ID, 12)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	out := make([]TutorDTO, 0, len(tutors))
	for _, t := range tutors {
		out = append(out, toTutorDTO(t))
	}
	pkg.WriteSuccess(w, http.StatusOK, out, nil)
}

func (h *ProgrammeHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	if detail, err := h.svc.GetDetailBySlug(r.Context(), r.PathValue("slug")); err == nil && detail != nil {
		pkg.WriteSuccess(w, http.StatusOK, detail, nil)
		return
	}
	pr, err := h.svc.GetBySlug(r.Context(), r.PathValue("slug"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if pr == nil {
		pkg.WriteError(w, http.StatusNotFound, string(pkg.CodeNotFound), "programme not found", nil)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, pr, nil)
}

// --- Helpers ---

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func writeJSONData(w http.ResponseWriter, status int, v any) {
	pkg.WriteSuccess(w, status, v, nil)
}

var _ = json.Marshal
