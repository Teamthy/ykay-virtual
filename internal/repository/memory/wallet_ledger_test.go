package memory

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/payment"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newLedgerWallet(t *testing.T) (*WalletMemory, uuid.UUID) {
	t.Helper()
	m := NewWalletMemory()
	userID := uuid.New()
	_, err := m.GetOrCreate(context.Background(), userID, "NGN")
	require.NoError(t, err)
	return m, userID
}

// Every credit writes an append-only journal row with the resulting balance —
// no balance change without a ledger record.
func TestWalletLedger_CreditEntry_Journals(t *testing.T) {
	m, user := newLedgerWallet(t)
	ctx := context.Background()
	holdID := uuid.New()

	err := m.CreditEntry(ctx, user, 75000, payment.WalletLedgerEntry{
		RefType: "ESCROW_REFUND", RefID: &holdID,
		IdempotencyKey: "escrow_refund:" + holdID.String(),
	})
	require.NoError(t, err)

	w, err := m.GetByUserID(ctx, user)
	require.NoError(t, err)
	assert.Equal(t, 75000.0, w.Balance)

	ledger := m.Ledger(user)
	require.Len(t, ledger, 1)
	assert.Equal(t, "CREDIT", ledger[0].Direction)
	assert.Equal(t, 75000.0, ledger[0].Amount)
	assert.Equal(t, 75000.0, ledger[0].BalanceAfter)
	assert.Equal(t, "ESCROW_REFUND", ledger[0].RefType)
	require.NotNil(t, ledger[0].RefID)
	assert.Equal(t, holdID, *ledger[0].RefID)
	require.NotNil(t, ledger[0].IdempotencyKey)
	assert.Equal(t, "escrow_refund:"+holdID.String(), *ledger[0].IdempotencyKey)
}

// A replayed idempotency key must not move money twice — the whole mutation
// (journal + balance) is at-most-once.
func TestWalletLedger_CreditEntry_ReplayIsNoOp(t *testing.T) {
	m, user := newLedgerWallet(t)
	ctx := context.Background()
	key := "referral_reward:" + uuid.NewString()

	for i := 0; i < 5; i++ {
		require.NoError(t, m.CreditEntry(ctx, user, 2000, payment.WalletLedgerEntry{
			RefType: "REFERRAL_REWARD", IdempotencyKey: key,
		}))
	}

	w, err := m.GetByUserID(ctx, user)
	require.NoError(t, err)
	assert.Equal(t, 2000.0, w.Balance, "five replays must credit exactly once")
	assert.Len(t, m.Ledger(user), 1)
}

// Distinct keys credit independently (two different rewards).
func TestWalletLedger_DistinctKeys_AreIndependent(t *testing.T) {
	m, user := newLedgerWallet(t)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		require.NoError(t, m.CreditEntry(ctx, user, 100, payment.WalletLedgerEntry{
			RefType: "REFERRAL_REWARD", IdempotencyKey: uuid.NewString(),
		}))
	}
	w, _ := m.GetByUserID(ctx, user)
	assert.Equal(t, 300.0, w.Balance)
	assert.Len(t, m.Ledger(user), 3)
}

// Debits journal too, and refuse to overdraw (CHECK balance >= 0 parity).
func TestWalletLedger_Debit_JournalsAndGuardsBalance(t *testing.T) {
	m, user := newLedgerWallet(t)
	ctx := context.Background()

	require.NoError(t, m.CreditEntry(ctx, user, 5000, payment.WalletLedgerEntry{RefType: "TOPUP"}))

	err := m.Debit(ctx, user, 999999)
	assert.ErrorIs(t, err, domain.ErrInsufficientBalance)
	w, _ := m.GetByUserID(ctx, user)
	assert.Equal(t, 5000.0, w.Balance, "failed debit must not move money")
	assert.Len(t, m.Ledger(user), 1, "failed debit must not journal")

	require.NoError(t, m.Debit(ctx, user, 1500))
	w, _ = m.GetByUserID(ctx, user)
	assert.Equal(t, 3500.0, w.Balance)
	ledger := m.Ledger(user)
	require.Len(t, ledger, 2)
	assert.Equal(t, "DEBIT", ledger[1].Direction)
	assert.Equal(t, 1500.0, ledger[1].Amount)
	assert.Equal(t, 3500.0, ledger[1].BalanceAfter)
}

// Unknown wallets and non-positive amounts are rejected up-front.
func TestWalletLedger_Guards(t *testing.T) {
	m, user := newLedgerWallet(t)
	ctx := context.Background()

	err := m.CreditEntry(ctx, uuid.New(), 100, payment.WalletLedgerEntry{RefType: "X"})
	assert.ErrorIs(t, err, domain.ErrNotFound)

	err = m.CreditEntry(ctx, user, 0, payment.WalletLedgerEntry{RefType: "X"})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
	err = m.CreditEntry(ctx, user, -5, payment.WalletLedgerEntry{RefType: "X"})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	// No rows written by any rejected call.
	w, err := m.GetByUserID(ctx, user)
	require.NoError(t, err)
	assert.Equal(t, 0.0, w.Balance)
	assert.Empty(t, m.Ledger(user))
}

// The journal is per-user (two wallets never interleave).
func TestWalletLedger_UserScoping(t *testing.T) {
	m := NewWalletMemory()
	ctx := context.Background()
	a, b := uuid.New(), uuid.New()
	_, err := m.GetOrCreate(ctx, a, "NGN")
	require.NoError(t, err)
	_, err = m.GetOrCreate(ctx, b, "NGN")
	require.NoError(t, err)

	require.NoError(t, m.CreditEntry(ctx, a, 100, payment.WalletLedgerEntry{RefType: "A_TOPUP"}))
	require.NoError(t, m.CreditEntry(ctx, b, 250, payment.WalletLedgerEntry{RefType: "B_TOPUP"}))

	ledgerA := m.Ledger(a)
	require.Len(t, ledgerA, 1)
	assert.Equal(t, 100.0, ledgerA[0].Amount)
	ledgerB := m.Ledger(b)
	require.Len(t, ledgerB, 1)
	assert.Equal(t, 250.0, ledgerB[0].Amount)
	assert.True(t, ledgerB[0].CreatedAt.After(time.Time{}))
}
