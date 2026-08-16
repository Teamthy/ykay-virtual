package httpapi

import (
	"net/http"
	"strings"

	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// PaymentHandler — POST /api/v1/payments/initiate, POST /payments/webhooks/{provider}.
// The webhook route is idempotent (UNIQUE provider_reference) and signature-
// verified; the client redirect is never trusted.

type PaymentHandler struct {
	svc     *service.PaymentService
	secrets map[payment.PaymentProvider]string
	siteURL string
}

func NewPaymentHandler(svc *service.PaymentService, secrets map[payment.PaymentProvider]string, siteURL string) *PaymentHandler {
	return &PaymentHandler{svc: svc, secrets: secrets, siteURL: siteURL}
}

type initiatePaymentRequest struct {
	OrderID     string `json:"order_id"`
	Provider    string `json:"provider"` // PAYSTACK | FLUTTERWAVE
	Email       string `json:"email"`
	CallbackURL string `json:"callback_url,omitempty"`
}

type initiatePaymentResponse struct {
	PaymentID   string  `json:"payment_id"`
	OrderNumber string  `json:"order_number"`
	Provider    string  `json:"provider"`
	ProviderRef string  `json:"provider_reference"`
	Amount      float64 `json:"amount"`
	Currency    string  `json:"currency"`
	PaymentLink string  `json:"payment_link"`
	Status      string  `json:"status"`
}

func (h *PaymentHandler) Initiate(w http.ResponseWriter, r *http.Request) {
	// YK-010: require an authenticated actor (payment initiation is an
	// account-scoped operation; never anonymous).
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req initiatePaymentRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	orderID, err := uuid.Parse(req.OrderID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("order_id must be a valid UUID", nil))
		return
	}
	provider := payment.PaymentProvider(strings.ToUpper(req.Provider))
	if provider != payment.ProviderPaystack && provider != payment.ProviderFlutterwave {
		WriteAppError(w, pkg.BadRequest("provider must be PAYSTACK or FLUTTERWAVE", nil))
		return
	}
	if !pkg.ValidateEmail(req.Email) {
		WriteAppError(w, pkg.BadRequest("a valid email is required", nil))
		return
	}
	// YK-010: callback_url must be empty or a same-origin relative path —
	// never an arbitrary absolute URL (open-redirect / payment-confusion).
	if cb := strings.TrimSpace(req.CallbackURL); cb != "" {
		if strings.Contains(cb, "://") || !strings.HasPrefix(cb, "/") || strings.HasPrefix(cb, "//") {
			WriteAppError(w, pkg.BadRequest("callback_url must be a relative path", nil))
			return
		}
	}
	reqID := requestIDString(r)
	res, err := h.svc.InitiatePayment(r.Context(), service.InitiatePaymentInput{
		OrderID:     orderID,
		Provider:    provider,
		PayerEmail:  req.Email,
		CallbackURL: req.CallbackURL,
		ActorUserID: actor.UserID,
		RequestID:   &reqID,
		TraceID:     &reqID,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, initiatePaymentResponse{
		PaymentID:   res.Payment.ID.String(),
		Provider:    string(provider),
		ProviderRef: *res.Payment.ProviderReference,
		Amount:      res.Payment.Amount,
		Currency:    res.Payment.Currency,
		PaymentLink: res.PaymentLink,
		Status:      string(res.Payment.Status),
	}, nil)
}

// Webhook — idempotent delivery endpoint. Always 200 for already-processed
// references; 400 for signature failures (so providers retry/flag).
func (h *PaymentHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	provider := payment.PaymentProvider(strings.ToUpper(r.PathValue("provider")))
	secret, ok := h.secrets[provider]
	if !ok {
		WriteAppError(w, pkg.BadRequest("unsupported provider", nil))
		return
	}

	payload := make([]byte, 0, 64*1024)
	buf := make([]byte, 16*1024)
	for {
		n, err := r.Body.Read(buf)
		payload = append(payload, buf[:n]...)
		if err != nil {
			break
		}
		if len(payload) > 2*1024*1024 {
			WriteAppError(w, pkg.BadRequest("payload too large", nil))
			return
		}
	}

	signature := r.Header.Get("X-Paystack-Signature")
	if signature == "" {
		signature = r.Header.Get("verif-hash") // flutterwave
	}

	res, err := h.svc.ProcessWebhook(r.Context(), provider, payload, signature, secret)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, res, nil)
}
