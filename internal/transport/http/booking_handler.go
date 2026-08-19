package httpapi

import (
	"net/http"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// BookingHandler — POST /api/v1/bookings (cohort enrollment or private
// package), transactional + idempotency-key replay.

type BookingHandler struct{ svc *service.BookingService }

func NewBookingHandler(svc *service.BookingService) *BookingHandler { return &BookingHandler{svc: svc} }

type createBookingRequest struct {
	Type            string   `json:"type"` // COHORT | PRIVATE
	CohortID        string   `json:"cohort_id"`
	ParentUserID    string   `json:"parent_user_id"`
	StudentID       string   `json:"student_id"`
	SubjectID       string   `json:"subject_id"`
	TutorProfileID  string   `json:"tutor_profile_id"`
	TotalSessions   *int     `json:"total_sessions"`
	SessionDuration *int     `json:"session_duration_minutes"`
	PricePerSession *float64 `json:"price_per_session"`
	Currency        string   `json:"currency"`
	Goals           *string  `json:"goals,omitempty"`
	PreferredDays   *string  `json:"preferred_days,omitempty"`
	PreferredTime   *string  `json:"preferred_time_range,omitempty"`
	IdempotencyKey  string   `json:"idempotency_key"`
}

type bookingResponse struct {
	Order           *orderDTO `json:"order"`
	EnrollmentID    *string   `json:"enrollment_id,omitempty"`
	PackageID       *string   `json:"package_id,omitempty"`
	Replayed        bool      `json:"replayed,omitempty"`
	PaymentRequired bool      `json:"payment_required"`
}

type orderDTO struct {
	ID          string    `json:"id"`
	OrderNumber string    `json:"order_number"`
	Status      string    `json:"status"`
	Subtotal    float64   `json:"subtotal"`
	Discount    float64   `json:"discount_amount"`
	Total       float64   `json:"total_amount"`
	Currency    string    `json:"currency"`
	Items       []itemDTO `json:"items"`
}

type itemDTO struct {
	ItemType    string  `json:"item_type"`
	ReferenceID string  `json:"reference_id"`
	Description *string `json:"description,omitempty"`
	Quantity    int     `json:"quantity"`
	TotalPrice  float64 `json:"total_price"`
}

func toOrderDTO(orderID uuid.UUID, status string, subtotal, discount, total float64, currency string) *orderDTO {
	return &orderDTO{
		ID: orderID.String(), OrderNumber: "", Status: status,
		Subtotal: subtotal, Discount: discount, Total: total, Currency: currency,
	}
}

func (h *BookingHandler) Create(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req createBookingRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	reqID := requestIDString(r)
	traceID := reqID

	// G1: the paying parent is ALWAYS the session user. A body-supplied
	// parent_user_id is only allowed when it matches (or the caller is admin).
	parentID := actor.UserID
	if req.ParentUserID != "" {
		supplied, err := uuid.Parse(req.ParentUserID)
		if err != nil {
			WriteAppError(w, pkg.BadRequest("parent_user_id must be a valid UUID", nil))
			return
		}
		if supplied != actor.UserID && !actor.IsAdmin {
			WriteAppError(w, pkg.Forbidden("parent_user_id does not match the authenticated user"))
			return
		}
		parentID = supplied
	}
	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("student_id must be a valid UUID", nil))
		return
	}

	switch req.Type {
	case "COHORT":
		cohortID, err := uuid.Parse(req.CohortID)
		if err != nil {
			WriteAppError(w, pkg.BadRequest("cohort_id must be a valid UUID", nil))
			return
		}
		res, err := h.svc.CreateCohortBooking(r.Context(), service.CreateCohortBookingInput{
			CohortID:       cohortID,
			ParentUserID:   parentID,
			StudentID:      studentID,
			IdempotencyKey: req.IdempotencyKey,
			RequestID:      &reqID,
			TraceID:        &traceID,
		})
		if err != nil {
			WriteAppError(w, err)
			return
		}
		var enrollmentID *string
		if res.EnrollmentID != nil {
			s := res.EnrollmentID.String()
			enrollmentID = &s
		}
		pkg.WriteSuccess(w, http.StatusCreated, bookingResponse{
			Order:           orderFromResult(res),
			EnrollmentID:    enrollmentID,
			Replayed:        res.Replayed,
			PaymentRequired: !res.Replayed,
		}, nil)

	case "PRIVATE":
		if req.TotalSessions == nil || req.SessionDuration == nil {
			WriteAppError(w, pkg.BadRequest("total_sessions and session_duration_minutes are required", nil))
			return
		}
		// YK-042: never take price from the client. Zero here; service loads
		// the published tutor session rate.
		var clientPrice float64
		if req.PricePerSession != nil {
			clientPrice = *req.PricePerSession // discarded in service
		}
		_ = clientPrice
		tutorID, err := uuid.Parse(req.TutorProfileID)
		if err != nil {
			WriteAppError(w, pkg.BadRequest("tutor_profile_id must be a valid UUID", nil))
			return
		}
		subjectID, err := uuid.Parse(req.SubjectID)
		if err != nil {
			WriteAppError(w, pkg.BadRequest("subject_id must be a valid UUID", nil))
			return
		}
		res, err := h.svc.CreatePrivateBooking(r.Context(), service.CreatePrivateBookingInput{
			ParentUserID:    parentID,
			StudentID:       studentID,
			TutorProfileID:  tutorID,
			SubjectID:       subjectID,
			TotalSessions:   *req.TotalSessions,
			SessionDuration: *req.SessionDuration,
			PricePerSession: 0,
			Currency:        req.Currency,
			Goals:           req.Goals,
			PreferredDays:   req.PreferredDays,
			PreferredTime:   req.PreferredTime,
			IdempotencyKey:  req.IdempotencyKey,
			RequestID:       &reqID,
			TraceID:         &traceID,
		})
		if err != nil {
			WriteAppError(w, err)
			return
		}
		var pkgID *string
		if res.PackageID != nil {
			s := res.PackageID.String()
			pkgID = &s
		}
		pkg.WriteSuccess(w, http.StatusCreated, bookingResponse{
			Order:           orderFromResult(res),
			PackageID:       pkgID,
			Replayed:        res.Replayed,
			PaymentRequired: !res.Replayed,
		}, nil)

	default:
		WriteAppError(w, pkg.BadRequest("type must be COHORT or PRIVATE", nil))
	}
}

func orderFromResult(res *service.BookingResult) *orderDTO {
	d := &orderDTO{
		ID:          res.Order.ID.String(),
		OrderNumber: res.Order.OrderNumber,
		Status:      string(res.Order.Status),
		Subtotal:    res.Order.Subtotal,
		Discount:    res.Order.DiscountAmount,
		Total:       res.Order.TotalAmount,
		Currency:    res.Order.Currency,
	}
	for _, it := range res.Items {
		d.Items = append(d.Items, itemDTO{
			ItemType:    it.ItemType,
			ReferenceID: it.ReferenceID.String(),
			Description: it.Description,
			Quantity:    it.Quantity,
			TotalPrice:  it.TotalPrice,
		})
	}
	return d
}

func requestIDString(r *http.Request) string {
	if id := r.Header.Get("X-Request-ID"); id != "" {
		return id
	}
	return "local"
}

var _ = toOrderDTO

// ---------------------------------------------------------------------------
// Private tuition: request → match → pay → escrow (managed matching journey)
// ---------------------------------------------------------------------------

type privateRequestBody struct {
	StudentID     string `json:"student_id"`
	SubjectID     string `json:"subject_id"`
	Goals         string `json:"goals"`
	PreferredDays string `json:"preferred_days"`
	PreferredTime string `json:"preferred_time"`
	Timezone      string `json:"timezone"`
	LocationMode  string `json:"location_mode"`
}

// CreatePrivateRequest — POST /api/v1/private-tuition/requests (auth): a parent
// asks to be matched to a tutor for a subject (no tutor chosen yet).
func (h *BookingHandler) CreatePrivateRequest(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req privateRequestBody
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("student_id must be a valid UUID", nil))
		return
	}
	subjectID, err := uuid.Parse(req.SubjectID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("subject_id must be a valid UUID", nil))
		return
	}
	reqID := requestIDString(r)
	res, err := h.svc.CreatePrivateTuitionRequest(r.Context(), service.CreatePrivateRequestInput{
		ParentUserID:  actor.UserID,
		StudentID:     studentID,
		SubjectID:     subjectID,
		Goals:         req.Goals,
		PreferredDays: req.PreferredDays,
		PreferredTime: req.PreferredTime,
		Timezone:      req.Timezone,
		LocationMode:  req.LocationMode,
		RequestID:     &reqID,
		TraceID:       &reqID,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, res, nil)
}

// ListMyPrivateRequests — GET /api/v1/private-tuition/requests (auth).
func (h *BookingHandler) ListMyPrivateRequests(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	res, err := h.svc.ListMyPrivateTuitionRequests(r.Context(), actor.UserID, 50)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, res, nil)
}

// GetPrivateRequest — GET /api/v1/private-tuition/requests/{id} (owner/admin).
func (h *BookingHandler) GetPrivateRequest(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	requestID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid request id", nil))
		return
	}
	res, err := h.svc.GetPrivateTuitionRequest(r.Context(), actor.UserID, requestID, actor.IsAdmin)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, res, nil)
}

// ListPrivateRequests — GET /api/v1/admin/private-tuition/requests (admin queue).
func (h *BookingHandler) ListPrivateRequests(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	p := ParsePagination(r)
	status := r.URL.Query().Get("status")
	if status == "" {
		status = p.Filters["status"]
	}
	res, total, err := h.svc.ListPrivateTuitionRequests(r.Context(), status, p.Page, p.PageSize)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, res, p.Meta(total))
}

// MatchPrivateRequest — POST /api/v1/admin/private-tuition/requests/{id}/match
// (admin): assigns a vetted tutor, creating a payable package + escrow order.
func (h *BookingHandler) MatchPrivateRequest(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	requestID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid request id", nil))
		return
	}
	var body struct {
		TutorProfileID         string `json:"tutor_profile_id"`
		TotalSessions          int    `json:"total_sessions"`
		SessionDurationMinutes int    `json:"session_duration_minutes"`
	}
	if err := DecodeJSON(r, &body); err != nil {
		WriteAppError(w, err)
		return
	}
	tutorID, err := uuid.Parse(body.TutorProfileID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("tutor_profile_id must be a valid UUID", nil))
		return
	}
	res, err := h.svc.MatchPrivateTuitionRequest(r.Context(), actor.UserID, requestID, tutorID,
		body.TotalSessions, body.SessionDurationMinutes)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, res, nil)
}
