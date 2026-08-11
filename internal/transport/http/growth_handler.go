package httpapi

import (
	"context"
	"net/http"

	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/middleware"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// GrowthHandler — reviews, referrals, institutions (Phase 10):
//   - POST /api/v1/reviews                        (auth: parent submits review)
//   - GET  /api/v1/tutors/{slug}/reviews          (public, published+consent only)
//   - GET  /api/v1/me/referral-code               (auth)
//   - POST /api/v1/referrals/apply                (auth: {code})
//   - GET  /api/v1/me/referrals                   (auth)
//   - POST /api/v1/institutions                   (public B2B form)

type GrowthHandler struct {
	reviews      *service.ReviewService
	referrals    *service.ReferralService
	institutions *service.InstitutionService
	tutors       tutorBySlugReader
}

type tutorBySlugReader interface {
	GetBySlug(ctx context.Context, slug string) (*tutor.TutorProfile, error)
}

func NewGrowthHandler(reviews *service.ReviewService, referrals *service.ReferralService,
	institutions *service.InstitutionService, tutors tutorBySlugReader) *GrowthHandler {
	return &GrowthHandler{reviews: reviews, referrals: referrals, institutions: institutions, tutors: tutors}
}

// --- Reviews ---

func (h *GrowthHandler) CreateReview(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req struct {
		TutorProfileID string  `json:"tutor_profile_id"`
		BookingID      string  `json:"booking_id"`
		Rating         int     `json:"rating"`
		Title          *string `json:"title"`
		Comment        *string `json:"comment"`
		ConsentGiven   bool    `json:"consent_given"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	tutorID, err := uuid.Parse(req.TutorProfileID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("tutor_profile_id must be a valid UUID", nil))
		return
	}
	var bookingID *uuid.UUID
	if req.BookingID != "" {
		id, err := uuid.Parse(req.BookingID)
		if err != nil {
			WriteAppError(w, pkg.BadRequest("booking_id must be a valid UUID", nil))
			return
		}
		bookingID = &id
	}
	rv, err := h.reviews.Create(r.Context(), service.CreateReviewInput{
		ReviewerUserID: actor.UserID,
		TutorProfileID: tutorID,
		BookingID:      bookingID,
		Rating:         req.Rating,
		Title:          req.Title,
		Comment:        req.Comment,
		ConsentGiven:   req.ConsentGiven,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, rv, nil)
}

func (h *GrowthHandler) ListTutorReviews(w http.ResponseWriter, r *http.Request) {
	t, err := h.tutors.GetBySlug(r.Context(), r.PathValue("slug"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	reviews, err := h.reviews.ListPublishedByTutor(r.Context(), t.ID, 20)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, reviews, nil)
}

// --- Referrals ---

func (h *GrowthHandler) GetMyCode(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	rc, err := h.referrals.GetOrCreateCode(r.Context(), actor.UserID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	shareURL := r.URL.Scheme // empty in practice; build from site config
	_ = shareURL
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"code":       rc.Code,
		"is_active":  rc.IsActive,
		"reward":     service.ReferralRewardAmount,
		"currency":   "NGN",
		"share_link": "/register?ref=" + rc.Code,
	}, nil)
}

func (h *GrowthHandler) ApplyReferral(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req struct {
		Code string `json:"code"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	ref, err := h.referrals.Apply(r.Context(), actor.UserID, req.Code)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, ref, nil)
}

func (h *GrowthHandler) ListMyReferrals(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	refs, err := h.referrals.ListMine(r.Context(), actor.UserID, 50)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, refs, nil)
}

// --- Institutions (B2B) ---

func (h *GrowthHandler) CreateInstitution(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name        string  `json:"name"`
		Type        string  `json:"type"`
		Email       *string `json:"email"`
		Phone       *string `json:"phone"`
		Website     *string `json:"website"`
		Description *string `json:"description"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	var ownerID *uuid.UUID
	if actor, ok := middleware.ActorFromContext(r.Context()); ok && actor.UserID != uuid.Nil {
		ownerID = &actor.UserID
	}
	inst, err := h.institutions.Create(r.Context(), service.CreateInstitutionInput{
		Name:        req.Name,
		Type:        institution.InstitutionType(req.Type),
		Email:       req.Email,
		Phone:       req.Phone,
		Website:     req.Website,
		Description: req.Description,
		OwnerUserID: ownerID,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, inst, nil)
}
