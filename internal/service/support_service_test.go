package service

import (
	"context"
	"testing"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSupport_OpenTicket(t *testing.T) {
	svc := NewSupportService(memory.NewSupportMemory())
	ctx := context.Background()

	ticket, err := svc.OpenTicket(ctx, nil, "parent@example.com", "Private tuition request — Mathematics", "My daughter needs IGCSE maths support.")
	require.NoError(t, err)
	assert.Equal(t, "OPEN", ticket.Status)
	assert.NotEmpty(t, ticket.ID)

	// User-linked ticket
	uid := uuid.New()
	t2, err := svc.OpenTicket(ctx, &uid, "a@b.com", "Payment issue", "Paid but no confirmation.")
	require.NoError(t, err)
	require.NotNil(t, t2.UserID)
	assert.Equal(t, uid, *t2.UserID)
}

func TestSupport_Validation(t *testing.T) {
	svc := NewSupportService(memory.NewSupportMemory())
	ctx := context.Background()

	_, err := svc.OpenTicket(ctx, nil, "not-an-email", "Sub", "Body")
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	_, err = svc.OpenTicket(ctx, nil, "a@b.com", "", "Body")
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	_, err = svc.OpenTicket(ctx, nil, "a@b.com", "Sub", "  ")
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}
