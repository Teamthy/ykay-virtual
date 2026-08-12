package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

// Postgres devices (migration 000022_devices).

type DeviceRepo struct{ db TxQuerier }

func NewDeviceRepo(db TxQuerier) *DeviceRepo { return &DeviceRepo{db: db} }

func (r *DeviceRepo) Create(ctx context.Context, d *identity.Device) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO devices (id, user_id, token, platform, app_version, last_seen_at, created_at)
		VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
		ON CONFLICT (user_id, token) DO UPDATE SET platform=$4, app_version=$5, last_seen_at=NOW()`,
		d.ID, d.UserID, d.Token, d.Platform, d.AppVersion)
	if err != nil {
		return fmt.Errorf("create device: %w", err)
	}
	return nil
}

func (r *DeviceRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]identity.Device, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, token, platform, app_version, last_seen_at, created_at
		FROM devices WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("list devices: %w", err)
	}
	defer rows.Close()
	out := []identity.Device{}
	for rows.Next() {
		var d identity.Device
		var appVersion sql.NullString
		if err := rows.Scan(&d.ID, &d.UserID, &d.Token, &d.Platform, &appVersion, &d.LastSeenAt, &d.CreatedAt); err != nil {
			return nil, err
		}
		if appVersion.Valid {
			d.AppVersion = appVersion.String
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (r *DeviceRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM devices WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete device: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *DeviceRepo) DeleteByToken(ctx context.Context, token string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM devices WHERE token = $1`, token)
	if err != nil {
		return fmt.Errorf("delete device by token: %w", err)
	}
	return nil
}

var _ identity.DeviceRepository = (*DeviceRepo)(nil)
var _ = errors.Is
