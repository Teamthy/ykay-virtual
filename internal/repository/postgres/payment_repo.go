package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/payment"

	"github.com/google/uuid"
)

type PaymentRepo struct{ db TxQuerier }

func NewPaymentRepo(db TxQuerier) *PaymentRepo { return &PaymentRepo{db: db} }

const paymentColumns = `id, order_id, provider, provider_reference, amount, currency, status, paid_at, metadata, created_at, updated_at`

func scanPayment(row interface{ Scan(...any) error }) (*payment.Payment, error) {
	var p payment.Payment
	var ref sql.NullString
	var paidAt sql.NullTime
	var metadata sql.NullString
	if err := row.Scan(
		&p.ID, &p.OrderID, &p.Provider, &ref, &p.Amount, &p.Currency,
		&p.Status, &paidAt, &metadata, &p.CreatedAt, &p.UpdatedAt,
	); err != nil {
		return nil, err
	}
	if ref.Valid {
		p.ProviderReference = &ref.String
	}
	if paidAt.Valid {
		p.PaidAt = &paidAt.Time
	}
	if metadata.Valid {
		p.Metadata = &metadata.String
	}
	return &p, nil
}

func (r *PaymentRepo) Create(ctx context.Context, p *payment.Payment) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO payments (order_id, provider, provider_reference, amount, currency, status, metadata)
		VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at, updated_at`,
		p.OrderID, p.Provider, p.ProviderReference, p.Amount, p.Currency, p.Status, p.Metadata,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create payment: %w", err)
	}
	return nil
}

func (r *PaymentRepo) GetByID(ctx context.Context, id uuid.UUID) (*payment.Payment, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+paymentColumns+" FROM payments WHERE id = $1", id)
	p, err := scanPayment(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return p, nil
}

func (r *PaymentRepo) GetByProviderReference(ctx context.Context, provider payment.PaymentProvider, reference string) (*payment.Payment, error) {
	row := r.db.QueryRowContext(ctx,
		"SELECT "+paymentColumns+" FROM payments WHERE provider = $1 AND provider_reference = $2", provider, reference)
	p, err := scanPayment(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return p, nil
}

func (r *PaymentRepo) GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]payment.Payment, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT "+paymentColumns+" FROM payments WHERE order_id = $1 ORDER BY created_at", orderID)
	if err != nil {
		return nil, fmt.Errorf("list payments by order: %w", err)
	}
	defer rows.Close()
	out := []payment.Payment{}
	for rows.Next() {
		p, err := scanPayment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *p)
	}
	return out, rows.Err()
}

func (r *PaymentRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status payment.PaymentStatus, paidAt *time.Time) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE payments SET status = $1, paid_at = $2, updated_at = NOW() WHERE id = $3",
		status, paidAt, id)
	if err != nil {
		return fmt.Errorf("update payment status: %w", err)
	}
	return nil
}

var _ payment.PaymentRepository = (*PaymentRepo)(nil)

// --- Webhooks (idempotent, UNIQUE provider_reference) ---

type PaymentWebhookRepo struct{ db TxQuerier }

func NewPaymentWebhookRepo(db TxQuerier) *PaymentWebhookRepo { return &PaymentWebhookRepo{db: db} }

func (r *PaymentWebhookRepo) Create(ctx context.Context, w *payment.PaymentWebhook) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO payment_webhooks (provider, provider_reference, payload, signature_valid)
		VALUES ($1,$2,$3,$4) RETURNING id, created_at`,
		w.Provider, w.ProviderReference, w.Payload, w.SignatureValid,
	).Scan(&w.ID, &w.CreatedAt)
	if err != nil {
		// 23505 = unique_violation on provider_reference → duplicate webhook.
		if isUniqueViolation(err) {
			return domain.ErrAlreadyExists
		}
		return fmt.Errorf("create webhook: %w", err)
	}
	return nil
}

func (r *PaymentWebhookRepo) GetByProviderReference(ctx context.Context, provider payment.PaymentProvider, reference string) (*payment.PaymentWebhook, error) {
	var w payment.PaymentWebhook
	var processedAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, provider, provider_reference, payload, signature_valid, processed, processed_at, created_at
		FROM payment_webhooks WHERE provider = $1 AND provider_reference = $2`, provider, reference).
		Scan(&w.ID, &w.Provider, &w.ProviderReference, &w.Payload, &w.SignatureValid,
			&w.Processed, &processedAt, &w.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if processedAt.Valid {
		w.ProcessedAt = &processedAt.Time
	}
	return &w, nil
}

func (r *PaymentWebhookRepo) MarkProcessed(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE payment_webhooks SET processed = TRUE, processed_at = NOW() WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("mark webhook processed: %w", err)
	}
	return nil
}

var _ payment.PaymentWebhookRepository = (*PaymentWebhookRepo)(nil)

// --- Escrow ---

type EscrowHoldRepo struct{ db TxQuerier }

func NewEscrowHoldRepo(db TxQuerier) *EscrowHoldRepo { return &EscrowHoldRepo{db: db} }

const escrowColumns = `id, order_id, payment_id, tutor_profile_id, amount, status,
	held_at, release_at, released_at, dispute_reason, created_at, updated_at`

func scanEscrow(row interface{ Scan(...any) error }) (*payment.EscrowHold, error) {
	var h payment.EscrowHold
	var releaseAt, releasedAt sql.NullTime
	var dispute sql.NullString
	if err := row.Scan(
		&h.ID, &h.OrderID, &h.PaymentID, &h.TutorProfileID, &h.Amount, &h.Status,
		&h.HeldAt, &releaseAt, &releasedAt, &dispute, &h.CreatedAt, &h.UpdatedAt,
	); err != nil {
		return nil, err
	}
	if releaseAt.Valid {
		h.ReleaseAt = &releaseAt.Time
	}
	if releasedAt.Valid {
		h.ReleasedAt = &releasedAt.Time
	}
	if dispute.Valid {
		h.DisputeReason = &dispute.String
	}
	return &h, nil
}

func (r *EscrowHoldRepo) Create(ctx context.Context, h *payment.EscrowHold) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO escrow_holds (order_id, payment_id, tutor_profile_id, amount, status, release_at)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, held_at, created_at, updated_at`,
		h.OrderID, h.PaymentID, h.TutorProfileID, h.Amount, h.Status, h.ReleaseAt,
	).Scan(&h.ID, &h.HeldAt, &h.CreatedAt, &h.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create escrow hold: %w", err)
	}
	return nil
}

func (r *EscrowHoldRepo) GetByID(ctx context.Context, id uuid.UUID) (*payment.EscrowHold, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+escrowColumns+" FROM escrow_holds WHERE id = $1", id)
	h, err := scanEscrow(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return h, nil
}

func (r *EscrowHoldRepo) GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]payment.EscrowHold, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT "+escrowColumns+" FROM escrow_holds WHERE order_id = $1 ORDER BY created_at", orderID)
	if err != nil {
		return nil, fmt.Errorf("list escrow holds: %w", err)
	}
	defer rows.Close()
	out := []payment.EscrowHold{}
	for rows.Next() {
		h, err := scanEscrow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *h)
	}
	return out, rows.Err()
}

func (r *EscrowHoldRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status payment.EscrowStatus, releasedAt *time.Time, disputeReason *string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE escrow_holds SET status = $1, released_at = $2, dispute_reason = $3, updated_at = NOW()
		WHERE id = $4`, status, releasedAt, disputeReason, id)
	if err != nil {
		return fmt.Errorf("update escrow status: %w", err)
	}
	return nil
}

func (r *EscrowHoldRepo) ListStaleHeld(ctx context.Context, now time.Time, limit int) ([]payment.EscrowHold, error) {
	if limit < 1 {
		limit = 100
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+escrowColumns+` FROM escrow_holds
		WHERE status = 'HELD' AND release_at IS NOT NULL AND release_at < $1
		ORDER BY release_at LIMIT $2`, now, limit)
	if err != nil {
		return nil, fmt.Errorf("list stale escrow holds: %w", err)
	}
	defer rows.Close()
	out := []payment.EscrowHold{}
	for rows.Next() {
		h, err := scanEscrow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *h)
	}
	return out, rows.Err()
}

func (r *EscrowHoldRepo) ListByTutorProfileID(ctx context.Context, tutorProfileID uuid.UUID, limit int) ([]payment.EscrowHold, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, "SELECT "+escrowColumns+" FROM escrow_holds WHERE tutor_profile_id = $1 ORDER BY created_at DESC LIMIT $2", tutorProfileID, limit)
	if err != nil {
		return nil, fmt.Errorf("list escrow by tutor: %w", err)
	}
	defer rows.Close()
	out := []payment.EscrowHold{}
	for rows.Next() {
		h, err := scanEscrow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *h)
	}
	return out, rows.Err()
}

var _ payment.EscrowHoldRepository = (*EscrowHoldRepo)(nil)

// --- Payouts ---

type PayoutRepo struct{ db TxQuerier }

func NewPayoutRepo(db TxQuerier) *PayoutRepo { return &PayoutRepo{db: db} }

func (r *PayoutRepo) Create(ctx context.Context, p *payment.Payout) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO payouts (tutor_profile_id, escrow_hold_id, amount, currency, status)
		VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at, updated_at`,
		p.TutorProfileID, p.EscrowHoldID, p.Amount, p.Currency, p.Status,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create payout: %w", err)
	}
	return nil
}

func (r *PayoutRepo) GetByEscrowHoldID(ctx context.Context, escrowHoldID uuid.UUID) (*payment.Payout, error) {
	var p payment.Payout
	var provider, providerRef sql.NullString
	var processedAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT id, tutor_profile_id, escrow_hold_id, amount, currency, status, provider, provider_reference, processed_at, created_at, updated_at
		FROM payouts WHERE escrow_hold_id = $1`, escrowHoldID).
		Scan(&p.ID, &p.TutorProfileID, &p.EscrowHoldID, &p.Amount, &p.Currency, &p.Status,
			&provider, &providerRef, &processedAt, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if provider.Valid {
		p.Provider = &provider.String
	}
	if providerRef.Valid {
		p.ProviderReference = &providerRef.String
	}
	if processedAt.Valid {
		p.ProcessedAt = &processedAt.Time
	}
	return &p, nil
}

func (r *PayoutRepo) ListByStatus(ctx context.Context, status payment.PayoutStatus, limit int) ([]payment.Payout, error) {
	if limit < 1 {
		limit = 200
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, tutor_profile_id, escrow_hold_id, amount, currency, status, provider, provider_reference, processed_at, created_at, updated_at
		FROM payouts WHERE status = $1 ORDER BY created_at LIMIT $2`, status, limit)
	if err != nil {
		return nil, fmt.Errorf("list payouts: %w", err)
	}
	defer rows.Close()
	out := []payment.Payout{}
	for rows.Next() {
		var p payment.Payout
		var provider, providerRef sql.NullString
		var processedAt sql.NullTime
		if err := rows.Scan(&p.ID, &p.TutorProfileID, &p.EscrowHoldID, &p.Amount, &p.Currency,
			&p.Status, &provider, &providerRef, &processedAt, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		if provider.Valid {
			p.Provider = &provider.String
		}
		if providerRef.Valid {
			p.ProviderReference = &providerRef.String
		}
		if processedAt.Valid {
			p.ProcessedAt = &processedAt.Time
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *PayoutRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status payment.PayoutStatus, providerRef *string, processedAt *time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE payouts SET status = $1, provider_reference = $2, processed_at = $3, updated_at = NOW()
		WHERE id = $4`, status, providerRef, processedAt, id)
	if err != nil {
		return fmt.Errorf("update payout status: %w", err)
	}
	return nil
}

func (r *PayoutRepo) ListByTutorProfileID(ctx context.Context, tutorProfileID uuid.UUID, limit int) ([]payment.Payout, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, tutor_profile_id, escrow_hold_id, amount, currency, status, provider, provider_reference, processed_at, created_at, updated_at
		FROM payouts WHERE tutor_profile_id = $1 ORDER BY created_at DESC LIMIT $2`, tutorProfileID, limit)
	if err != nil {
		return nil, fmt.Errorf("list payouts by tutor: %w", err)
	}
	defer rows.Close()
	out := []payment.Payout{}
	for rows.Next() {
		var p payment.Payout
		var provider, providerRef sql.NullString
		var processedAt sql.NullTime
		if err := rows.Scan(&p.ID, &p.TutorProfileID, &p.EscrowHoldID, &p.Amount, &p.Currency,
			&p.Status, &provider, &providerRef, &processedAt, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		if provider.Valid {
			p.Provider = &provider.String
		}
		if providerRef.Valid {
			p.ProviderReference = &providerRef.String
		}
		if processedAt.Valid {
			p.ProcessedAt = &processedAt.Time
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

var _ payment.PayoutRepository = (*PayoutRepo)(nil)

// --- Wallets ---

type WalletRepo struct{ db TxQuerier }

func NewWalletRepo(db TxQuerier) *WalletRepo { return &WalletRepo{db: db} }

func (r *WalletRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*payment.Wallet, error) {
	var w payment.Wallet
	err := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, balance, currency, created_at, updated_at FROM wallets WHERE user_id = $1`, userID).
		Scan(&w.ID, &w.UserID, &w.Balance, &w.Currency, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &w, nil
}

func (r *WalletRepo) Create(ctx context.Context, w *payment.Wallet) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO wallets (user_id, balance, currency) VALUES ($1,$2,$3)
		RETURNING id, created_at, updated_at`,
		w.UserID, w.Balance, w.Currency).Scan(&w.ID, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create wallet: %w", err)
	}
	return nil
}

// GetOrCreate ensures a wallet row exists (called at order creation so every
// paying parent has a wallet; CHECK balance >= 0 guards negative balances).
func (r *WalletRepo) GetOrCreate(ctx context.Context, userID uuid.UUID, currency string) (*payment.Wallet, error) {
	w, err := r.GetByUserID(ctx, userID)
	if err == nil {
		return w, nil
	}
	if !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}
	w = &payment.Wallet{UserID: userID, Balance: 0, Currency: currency}
	if err := r.Create(ctx, w); err != nil && !isUniqueViolation(err) {
		return nil, err
	}
	return r.GetByUserID(ctx, userID)
}

func (r *WalletRepo) Credit(ctx context.Context, userID uuid.UUID, amount float64) error {
	res, err := r.db.ExecContext(ctx,
		"UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2", amount, userID)
	if err != nil {
		return fmt.Errorf("credit wallet: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *WalletRepo) Debit(ctx context.Context, userID uuid.UUID, amount float64) error {
	res, err := r.db.ExecContext(ctx,
		"UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2 AND balance >= $1",
		amount, userID)
	if err != nil {
		return fmt.Errorf("debit wallet: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrInsufficientBalance
	}
	return nil
}

var _ payment.WalletRepository = (*WalletRepo)(nil)

func isUniqueViolation(err error) bool {
	var pgErr interface{ Code() string }
	if errors.As(err, &pgErr) {
		return pgErr.Code() == "23505"
	}
	return false
}
