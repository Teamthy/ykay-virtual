package identity

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Device — a push-enabled client (native app / PWA) registered by the user.
// The push token is provider-specific (Expo push token for the mobile app).

type Device struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"user_id"`
	Token      string    `json:"token"`
	Platform   string    `json:"platform"` // ios | android | web
	AppVersion string    `json:"app_version,omitempty"`
	LastSeenAt time.Time `json:"last_seen_at"`
	CreatedAt  time.Time `json:"created_at"`
}

type DeviceRepository interface {
	// Create registers a device; a token already registered to the same
	// user is refreshed (upsert by (user_id, token)).
	Create(ctx context.Context, d *Device) error
	ListByUser(ctx context.Context, userID uuid.UUID) ([]Device, error)
	Delete(ctx context.Context, id, userID uuid.UUID) error
	DeleteByToken(ctx context.Context, token string) error
}
