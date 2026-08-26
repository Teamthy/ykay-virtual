package payment

import (
	"github.com/google/uuid"
	"time"
)

type OrderStatus string

const (
	OrderPending   OrderStatus = "PENDING"
	OrderPaid      OrderStatus = "PAID"
	OrderFailed    OrderStatus = "FAILED"
	OrderRefunded  OrderStatus = "REFUNDED"
	OrderCancelled OrderStatus = "CANCELLED"
)

type PaymentStatus string

const (
	PaymentPending  PaymentStatus = "PENDING"
	PaymentSuccess  PaymentStatus = "SUCCESS"
	PaymentFailed   PaymentStatus = "FAILED"
	PaymentRefunded PaymentStatus = "REFUNDED"
)

type PaymentProvider string

const (
	ProviderPaystack     PaymentProvider = "PAYSTACK"
	ProviderFlutterwave  PaymentProvider = "FLUTTERWAVE"
	ProviderStripe       PaymentProvider = "STRIPE"
	ProviderManual       PaymentProvider = "MANUAL"
	ProviderBankTransfer PaymentProvider = "BANK_TRANSFER"
)

type EscrowStatus string

const (
	EscrowHeld     EscrowStatus = "HELD"
	EscrowReleased EscrowStatus = "RELEASED"
	EscrowRefunded EscrowStatus = "REFUNDED"
	EscrowDisputed EscrowStatus = "DISPUTED"
)

type PayoutStatus string

const (
	PayoutPending    PayoutStatus = "PENDING"
	PayoutProcessing PayoutStatus = "PROCESSING"
	PayoutPaid       PayoutStatus = "PAID"
	PayoutFailed     PayoutStatus = "FAILED"
)

type Wallet struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Balance   float64   `json:"balance"`
	Currency  string    `json:"currency"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Order struct {
	ID             uuid.UUID   `json:"id"`
	OrderNumber    string      `json:"order_number"`
	ParentUserID   uuid.UUID   `json:"parent_user_id"`
	StudentID      *uuid.UUID  `json:"student_profile_id,omitempty"`
	InstitutionID  *uuid.UUID  `json:"institution_id,omitempty"`
	Status         OrderStatus `json:"status"`
	Subtotal       float64     `json:"subtotal"`
	DiscountAmount float64     `json:"discount_amount"`
	TotalAmount    float64     `json:"total_amount"`
	Currency       string      `json:"currency"`
	IdempotencyKey *string     `json:"idempotency_key,omitempty"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

type OrderItem struct {
	ID          uuid.UUID `json:"id"`
	OrderID     uuid.UUID `json:"order_id"`
	ItemType    string    `json:"item_type"`
	ReferenceID uuid.UUID `json:"reference_id"`
	Description *string   `json:"description,omitempty"`
	Quantity    int       `json:"quantity"`
	UnitPrice   float64   `json:"unit_price"`
	TotalPrice  float64   `json:"total_price"`
	CreatedAt   time.Time `json:"created_at"`
}

type Payment struct {
	ID                uuid.UUID       `json:"id"`
	OrderID           uuid.UUID       `json:"order_id"`
	Provider          PaymentProvider `json:"provider"`
	ProviderReference *string         `json:"provider_reference,omitempty"`
	Amount            float64         `json:"amount"`
	Currency          string          `json:"currency"`
	Status            PaymentStatus   `json:"status"`
	PaidAt            *time.Time      `json:"paid_at,omitempty"`
	Metadata          *string         `json:"metadata,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

type PaymentWebhook struct {
	ID                uuid.UUID       `json:"id"`
	Provider          PaymentProvider `json:"provider"`
	ProviderReference string          `json:"provider_reference"`
	Payload           string          `json:"payload"`
	SignatureValid    bool            `json:"signature_valid"`
	Processed         bool            `json:"processed"`
	ProcessedAt       *time.Time      `json:"processed_at,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
}

type EscrowHold struct {
	ID             uuid.UUID    `json:"id"`
	OrderID        uuid.UUID    `json:"order_id"`
	PaymentID      uuid.UUID    `json:"payment_id"`
	TutorProfileID uuid.UUID    `json:"tutor_profile_id"`
	Amount         float64      `json:"amount"`
	Status         EscrowStatus `json:"status"`
	HeldAt         time.Time    `json:"held_at"`
	ReleaseAt      *time.Time   `json:"release_at,omitempty"`
	ReleasedAt     *time.Time   `json:"released_at,omitempty"`
	DisputeReason  *string      `json:"dispute_reason,omitempty"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`
}

type Payout struct {
	ID                uuid.UUID    `json:"id"`
	TutorProfileID    uuid.UUID    `json:"tutor_profile_id"`
	EscrowHoldID      uuid.UUID    `json:"escrow_hold_id"`
	Amount            float64      `json:"amount"`
	Currency          string       `json:"currency"`
	Status            PayoutStatus `json:"status"`
	Provider          *string      `json:"provider,omitempty"`
	ProviderReference *string      `json:"provider_reference,omitempty"`
	ProcessedAt       *time.Time   `json:"processed_at,omitempty"`
	// TransferCode — Paystack transfer_code once initiated (000056).
	TransferCode *string `json:"transfer_code,omitempty"`
	// OTPRequired — Paystack asked for an OTP to finalize the transfer.
	OTPRequired bool      `json:"otp_required"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type PaymentProviderInterface interface {
	VerifyWebhookSignature(payload []byte, signature string) bool
	CreatePaymentLink(amount float64, currency, reference, email string) (string, error)
}
