package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/payment"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type OrderRepo struct{ db TxQuerier }

func NewOrderRepo(db TxQuerier) *OrderRepo { return &OrderRepo{db: db} }

const orderColumns = `id, order_number, parent_user_id, student_profile_id, institution_id,
	status, subtotal, discount_amount, total_amount, currency, idempotency_key, created_at, updated_at`

func scanOrder(row interface{ Scan(...any) error }) (*payment.Order, error) {
	var o payment.Order
	var studentID, institutionID uuidNull
	var idemKey sql.NullString
	if err := row.Scan(
		&o.ID, &o.OrderNumber, &o.ParentUserID, &studentID, &institutionID,
		&o.Status, &o.Subtotal, &o.DiscountAmount, &o.TotalAmount, &o.Currency,
		&idemKey, &o.CreatedAt, &o.UpdatedAt,
	); err != nil {
		return nil, err
	}
	if studentID.Valid {
		o.StudentID = &studentID.UUID
	}
	if institutionID.Valid {
		o.InstitutionID = &institutionID.UUID
	}
	if idemKey.Valid {
		o.IdempotencyKey = &idemKey.String
	}
	return &o, nil
}

func (r *OrderRepo) Create(ctx context.Context, o *payment.Order) error {
	if o.OrderNumber == "" {
		// generate_order_number() → 'YK-Virtual-YYYYMMDD-XXXXXXXX' (migrations 000007 + 000017)
		if err := r.db.QueryRowContext(ctx, "SELECT generate_order_number()").Scan(&o.OrderNumber); err != nil {
			return fmt.Errorf("generate order number: %w", err)
		}
	}
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO orders (order_number, parent_user_id, student_profile_id, institution_id,
			status, subtotal, discount_amount, total_amount, currency, idempotency_key)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		RETURNING id, created_at, updated_at`,
		o.OrderNumber, o.ParentUserID, o.StudentID, o.InstitutionID,
		o.Status, o.Subtotal, o.DiscountAmount, o.TotalAmount, o.Currency, o.IdempotencyKey,
	).Scan(&o.ID, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create order: %w", err)
	}
	return nil
}

func (r *OrderRepo) CreateItem(ctx context.Context, item *payment.OrderItem) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO order_items (order_id, item_type, reference_id, description, quantity, unit_price, total_price)
		VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at`,
		item.OrderID, item.ItemType, item.ReferenceID, item.Description,
		item.Quantity, item.UnitPrice, item.TotalPrice,
	).Scan(&item.ID, &item.CreatedAt)
	if err != nil {
		return fmt.Errorf("create order item: %w", err)
	}
	return nil
}

func scanOrderItem(row interface{ Scan(...any) error }) (*payment.OrderItem, error) {
	var it payment.OrderItem
	var desc sql.NullString
	if err := row.Scan(&it.ID, &it.OrderID, &it.ItemType, &it.ReferenceID, &desc,
		&it.Quantity, &it.UnitPrice, &it.TotalPrice, &it.CreatedAt); err != nil {
		return nil, err
	}
	if desc.Valid {
		it.Description = &desc.String
	}
	return &it, nil
}

func (r *OrderRepo) ListItems(ctx context.Context, orderID uuid.UUID) ([]payment.OrderItem, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, order_id, item_type, reference_id, description, quantity, unit_price, total_price, created_at
		FROM order_items WHERE order_id = $1 ORDER BY created_at`, orderID)
	if err != nil {
		return nil, fmt.Errorf("list order items: %w", err)
	}
	defer rows.Close()
	out := []payment.OrderItem{}
	for rows.Next() {
		it, err := scanOrderItem(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *it)
	}
	return out, rows.Err()
}

func (r *OrderRepo) ListItemsByOrderIDs(ctx context.Context, orderIDs []uuid.UUID) (map[uuid.UUID][]payment.OrderItem, error) {
	out := map[uuid.UUID][]payment.OrderItem{}
	if len(orderIDs) == 0 {
		return out, nil
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, order_id, item_type, reference_id, description, quantity, unit_price, total_price, created_at
		FROM order_items WHERE order_id = ANY($1::uuid[]) ORDER BY created_at`, pq.Array(orderIDs))
	if err != nil {
		return nil, fmt.Errorf("list order items by ids: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		it, err := scanOrderItem(rows)
		if err != nil {
			return nil, err
		}
		out[it.OrderID] = append(out[it.OrderID], *it)
	}
	return out, rows.Err()
}

func (r *OrderRepo) GetByID(ctx context.Context, id uuid.UUID) (*payment.Order, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+orderColumns+" FROM orders WHERE id = $1", id)
	o, err := scanOrder(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return o, nil
}

func (r *OrderRepo) GetByIDempotencyKey(ctx context.Context, key string) (*payment.Order, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+orderColumns+" FROM orders WHERE idempotency_key = $1", key)
	o, err := scanOrder(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return o, nil
}

func (r *OrderRepo) GetByNumber(ctx context.Context, number string) (*payment.Order, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+orderColumns+" FROM orders WHERE order_number = $1", number)
	o, err := scanOrder(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return o, nil
}

func (r *OrderRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status payment.OrderStatus) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2", status, id)
	if err != nil {
		return fmt.Errorf("update order status: %w", err)
	}
	return nil
}

func (r *OrderRepo) Update(ctx context.Context, o *payment.Order) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE orders SET status=$1, subtotal=$2, discount_amount=$3, total_amount=$4, updated_at=NOW()
		WHERE id=$5`,
		o.Status, o.Subtotal, o.DiscountAmount, o.TotalAmount, o.ID)
	if err != nil {
		return fmt.Errorf("update order: %w", err)
	}
	return nil
}

func (r *OrderRepo) ListAll(ctx context.Context, limit, offset int) ([]payment.Order, int64, error) {
	var total int64
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM orders`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count orders: %w", err)
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+orderColumns+` FROM orders
		ORDER BY created_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list orders: %w", err)
	}
	defer rows.Close()
	out := []payment.Order{}
	for rows.Next() {
		var o payment.Order
		var studentID, institutionID uuidNull
		var idemKey sql.NullString
		if err := rows.Scan(&o.ID, &o.OrderNumber, &o.ParentUserID, &studentID, &institutionID,
			&o.Status, &o.Subtotal, &o.DiscountAmount, &o.TotalAmount, &o.Currency,
			&idemKey, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, 0, err
		}
		if idemKey.Valid {
			o.IdempotencyKey = &idemKey.String
		}
		out = append(out, o)
	}
	return out, total, rows.Err()
}

func (r *OrderRepo) ListByParentUserID(ctx context.Context, parentUserID uuid.UUID, limit, offset int) ([]payment.Order, int64, error) {
	if limit < 1 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM orders WHERE parent_user_id = $1", parentUserID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count orders: %w", err)
	}
	rows, err := r.db.QueryContext(ctx, "SELECT "+orderColumns+" FROM orders WHERE parent_user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", parentUserID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list orders: %w", err)
	}
	defer rows.Close()
	out := []payment.Order{}
	for rows.Next() {
		o, err := scanOrder(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *o)
	}
	return out, total, rows.Err()
}

var _ payment.OrderRepository = (*OrderRepo)(nil)
