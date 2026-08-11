package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// uuidNull scans nullable UUID columns into a *uuid.UUID.
type uuidNull struct {
	UUID  uuid.UUID
	Valid bool
}

func (n *uuidNull) Scan(value any) error {
	if value == nil {
		n.UUID, n.Valid = uuid.Nil, false
		return nil
	}
	switch v := value.(type) {
	case []byte:
		id, err := uuid.Parse(string(v))
		if err != nil {
			return err
		}
		n.UUID, n.Valid = id, true
		return nil
	case string:
		id, err := uuid.Parse(v)
		if err != nil {
			return err
		}
		n.UUID, n.Valid = id, true
		return nil
	}
	return fmt.Errorf("cannot scan %T into uuidNull", value)
}

// Postgres — bounded connection pool + transaction helper for the modular
// monolith. Money mutations (orders, payments, escrow, payouts) MUST use
// WithTx so repository calls share one transaction.

type Postgres struct {
	db *sql.DB
}

const (
	MaxOpenConns = 25 // bounded pool per AGENTS.md (no connection leaks under load)
	MaxIdleConns = 5
	ConnMaxLife  = 5 * time.Minute
)

func New(databaseURL string) (*Postgres, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open postgres: %w", err)
	}
	db.SetMaxOpenConns(MaxOpenConns)
	db.SetMaxIdleConns(MaxIdleConns)
	db.SetConnMaxLifetime(ConnMaxLife)
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}
	return &Postgres{db: db}, nil
}

func (p *Postgres) Close() error { return p.db.Close() }

func (p *Postgres) DB() *sql.DB { return p.db }

// WithTx runs fn inside a transaction; fn receives a *sql.Tx which the
// repository methods accept via the TxQuerier interface. On error the tx is
// rolled back — money mutations are all-or-nothing.
func (p *Postgres) WithTx(ctx context.Context, fn func(tx *sql.Tx) error) error {
	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	if err := tx.Commit(); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}

// TxQuerier abstracts *sql.DB and *sql.Tx so repository methods can run
// either directly or inside a service-level transaction.
type TxQuerier interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

// errNoRows maps sql.ErrNoRows to the domain sentinel.
func isNoRows(err error) bool { return err == sql.ErrNoRows }

// strPtr / boolPtr helpers for nullable scan columns.
func strPtr(s string) *string { return &s }
