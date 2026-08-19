package httpapi

import (
	"net/http"
	"time"

	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// CouponHandler — coupon validation (public/authed) + admin management.
type CouponHandler struct {
	svc *service.CouponService
}

func NewCouponHandler(svc *service.CouponService) *CouponHandler { return &CouponHandler{svc: svc} }

// Validate — POST /api/v1/coupons/validate. Checks a code against a subtotal
// and returns the coupon + the discount it would apply (no usage recorded).
func (h *CouponHandler) Validate(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req struct {
		Code     string  `json:"code"`
		Subtotal float64 `json:"subtotal"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	coupon, discount, err := h.svc.Validate(r.Context(), req.Code, actor.UserID.String(), req.Subtotal)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"code":           coupon.Code,
		"discount":       discount,
		"discount_type":  coupon.DiscountType,
		"discount_value": coupon.DiscountValue,
		"currency":       coupon.Currency,
		"valid":          true,
	}, nil)
}

// List — GET /api/v1/admin/coupons (admin).
func (h *CouponHandler) List(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	p := ParsePagination(r)
	coupons, total, err := h.svc.ListCoupons(r.Context(), p.Page, p.PageSize)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, coupons, p.Meta(total))
}

// Create — POST /api/v1/admin/coupons (admin).
func (h *CouponHandler) Create(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	var req struct {
		Code              string   `json:"code"`
		Description       *string  `json:"description"`
		DiscountType      string   `json:"discount_type"`
		DiscountValue     float64  `json:"discount_value"`
		Currency          string   `json:"currency"`
		MinOrderAmount    float64  `json:"min_order_amount"`
		MaxDiscountAmount *float64 `json:"max_discount_amount"`
		UsageLimit        int      `json:"usage_limit"`
		PerUserLimit      int      `json:"per_user_limit"`
		ValidFrom         *string  `json:"valid_from"`
		ValidUntil        *string  `json:"valid_until"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	var vf, vu *time.Time
	var perr error
	if req.ValidFrom != nil && *req.ValidFrom != "" {
		t, err := time.Parse(time.RFC3339, *req.ValidFrom)
		if err != nil {
			perr = err
		} else {
			vf = &t
		}
	}
	if req.ValidUntil != nil && *req.ValidUntil != "" {
		t, err := time.Parse(time.RFC3339, *req.ValidUntil)
		if err != nil {
			perr = err
		} else {
			vu = &t
		}
	}
	if perr != nil {
		WriteAppError(w, pkg.BadRequest("valid_from/valid_until must be RFC3339", nil))
		return
	}
	coupon, err := h.svc.CreateCoupon(r.Context(), actor.UserID, service.CreateCouponInput{
		Code:              req.Code,
		Description:       req.Description,
		DiscountType:      payment.CouponDiscountType(req.DiscountType),
		DiscountValue:     req.DiscountValue,
		Currency:          req.Currency,
		MinOrderAmount:    req.MinOrderAmount,
		MaxDiscountAmount: req.MaxDiscountAmount,
		UsageLimit:        req.UsageLimit,
		PerUserLimit:      req.PerUserLimit,
		ValidFrom:         vf,
		ValidUntil:        vu,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, coupon, nil)
}
