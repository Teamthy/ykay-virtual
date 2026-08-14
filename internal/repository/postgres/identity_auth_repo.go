package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

// Identity repos — users, sessions, roles (migration 000001_identity).

type UserRepo struct{ db TxQuerier }

func NewUserRepo(db TxQuerier) *UserRepo { return &UserRepo{db: db} }

const userColumns = `id, email, first_name, last_name, phone, password_hash, status, timezone,
	email_verified_at, phone_verified_at, last_login_at, created_at, updated_at`

func scanUser(row interface{ Scan(...any) error }) (*identity.User, error) {
	var u identity.User
	var phone, firstName, lastName sql.NullString
	var emailVerifiedAt, phoneVerifiedAt, lastLoginAt sql.NullTime
	if err := row.Scan(&u.ID, &u.Email, &firstName, &lastName, &phone, &u.PasswordHash,
		&u.Status, &u.Timezone, &emailVerifiedAt, &phoneVerifiedAt, &lastLoginAt,
		&u.CreatedAt, &u.UpdatedAt); err != nil {
		return nil, err
	}
	if firstName.Valid {
		u.FirstName = firstName.String
	}
	if lastName.Valid {
		u.LastName = lastName.String
	}
	if phone.Valid {
		u.Phone = &phone.String
	}
	if emailVerifiedAt.Valid {
		u.EmailVerifiedAt = &emailVerifiedAt.Time
	}
	if phoneVerifiedAt.Valid {
		u.PhoneVerifiedAt = &phoneVerifiedAt.Time
	}
	if lastLoginAt.Valid {
		u.LastLoginAt = &lastLoginAt.Time
	}
	return &u, nil
}

func (r *UserRepo) Create(ctx context.Context, u *identity.User) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO users (email, first_name, last_name, phone, password_hash, status, timezone)
		VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at, updated_at`,
		u.Email, u.FirstName, u.LastName, u.Phone, u.PasswordHash, u.Status, u.Timezone,
	).Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("%w: email already registered", domain.ErrAlreadyExists)
		}
		return fmt.Errorf("create user: %w", err)
	}
	return nil
}

func (r *UserRepo) FindByEmail(ctx context.Context, email string) (*identity.User, error) {
	row := r.db.QueryRowContext(ctx,
		"SELECT "+userColumns+" FROM users WHERE email = $1 AND deleted_at IS NULL", email)
	u, err := scanUser(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return u, nil
}

func (r *UserRepo) FindByID(ctx context.Context, id uuid.UUID) (*identity.User, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+userColumns+" FROM users WHERE id = $1 AND deleted_at IS NULL", id)
	u, err := scanUser(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return u, nil
}

func (r *UserRepo) Update(ctx context.Context, u *identity.User) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE users SET email=$1, first_name=$2, last_name=$3, phone=$4, password_hash=$5,
			status=$6, timezone=$7, email_verified_at=$8, phone_verified_at=$9, updated_at=NOW()
		WHERE id=$10`,
		u.Email, u.FirstName, u.LastName, u.Phone, u.PasswordHash, u.Status, u.Timezone,
		u.EmailVerifiedAt, u.PhoneVerifiedAt, u.ID)
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}
	return nil
}

func (r *UserRepo) UpdateLastLogin(ctx context.Context, id uuid.UUID, at time.Time) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE users SET last_login_at = $1, updated_at = NOW() WHERE id = $2", at, id)
	if err != nil {
		return fmt.Errorf("update last login: %w", err)
	}
	return nil
}

var _ identity.UserRepository = (*UserRepo)(nil)

// --- Sessions ---

type SessionRepo struct{ db TxQuerier }

func NewSessionRepo(db TxQuerier) *SessionRepo { return &SessionRepo{db: db} }

func (r *SessionRepo) Create(ctx context.Context, s *identity.Session) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at)
		VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
		s.UserID, s.TokenHash, s.IPAddress, s.UserAgent, s.ExpiresAt,
	).Scan(&s.ID, &s.CreatedAt)
	if err != nil {
		return fmt.Errorf("create session: %w", err)
	}
	return nil
}

const sessionColumns = `id, user_id, token_hash, ip_address, user_agent, expires_at, created_at, rotated_at, revoked_at`

func scanSession(row interface{ Scan(...any) error }) (*identity.Session, error) {
	var s identity.Session
	var ip, userAgent sql.NullString
	var rotatedAt, revokedAt sql.NullTime
	if err := row.Scan(&s.ID, &s.UserID, &s.TokenHash, &ip, &userAgent, &s.ExpiresAt,
		&s.CreatedAt, &rotatedAt, &revokedAt); err != nil {
		return nil, err
	}
	if ip.Valid {
		s.IPAddress = &ip.String
	}
	if userAgent.Valid {
		s.UserAgent = &userAgent.String
	}
	if rotatedAt.Valid {
		s.RotatedAt = &rotatedAt.Time
	}
	if revokedAt.Valid {
		s.RevokedAt = &revokedAt.Time
	}
	return &s, nil
}

func (r *SessionRepo) FindByTokenHash(ctx context.Context, tokenHash string) (*identity.Session, error) {
	row := r.db.QueryRowContext(ctx,
		"SELECT "+sessionColumns+" FROM sessions WHERE token_hash = $1", tokenHash)
	s, err := scanSession(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return s, nil
}

func (r *SessionRepo) Revoke(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE sessions SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL", id)
	if err != nil {
		return fmt.Errorf("revoke session: %w", err)
	}
	return nil
}

func (r *SessionRepo) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL", userID)
	if err != nil {
		return fmt.Errorf("revoke all sessions: %w", err)
	}
	return nil
}

func (r *SessionRepo) DeleteExpired(ctx context.Context) (int64, error) {
	res, err := r.db.ExecContext(ctx,
		"DELETE FROM sessions WHERE expires_at < NOW() OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days')")
	if err != nil {
		return 0, fmt.Errorf("delete expired sessions: %w", err)
	}
	n, _ := res.RowsAffected()
	return n, nil
}

var _ identity.SessionRepository = (*SessionRepo)(nil)

// --- Roles ---

type RoleRepo struct{ db TxQuerier }

func NewRoleRepo(db TxQuerier) *RoleRepo { return &RoleRepo{db: db} }

func (r *RoleRepo) FindByName(ctx context.Context, name string) (*identity.Role, error) {
	var role identity.Role
	var desc sql.NullString
	err := r.db.QueryRowContext(ctx,
		"SELECT id, name, description, created_at FROM roles WHERE name = $1", name).
		Scan(&role.ID, &role.Name, &desc, &role.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if desc.Valid {
		role.Description = &desc.String
	}
	return &role, nil
}

func (r *RoleRepo) AssignToUser(ctx context.Context, userID, roleID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)
		ON CONFLICT (user_id, role_id) DO NOTHING`, userID, roleID)
	if err != nil {
		return fmt.Errorf("assign role: %w", err)
	}
	return nil
}

func (r *RoleRepo) RolesForUser(ctx context.Context, userID uuid.UUID) ([]identity.Role, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT r.id, r.name, r.description, r.created_at
		FROM user_roles ur JOIN roles r ON r.id = ur.role_id
		WHERE ur.user_id = $1 ORDER BY r.name`, userID)
	if err != nil {
		return nil, fmt.Errorf("roles for user: %w", err)
	}
	defer rows.Close()
	out := []identity.Role{}
	for rows.Next() {
		var role identity.Role
		var desc sql.NullString
		if err := rows.Scan(&role.ID, &role.Name, &desc, &role.CreatedAt); err != nil {
			return nil, err
		}
		if desc.Valid {
			role.Description = &desc.String
		}
		out = append(out, role)
	}
	return out, rows.Err()
}

func (r *RoleRepo) RemoveAllForUser(ctx context.Context, userID uuid.UUID) error {
	if _, err := r.db.ExecContext(ctx,
		`DELETE FROM user_roles WHERE user_id = $1`, userID); err != nil {
		return fmt.Errorf("remove roles for user: %w", err)
	}
	return nil
}

var _ identity.RoleRepository = (*RoleRepo)(nil)

// --- Student profiles + parent links ---

type StudentProfileRepo struct{ db TxQuerier }

func NewStudentProfileRepo(db TxQuerier) *StudentProfileRepo { return &StudentProfileRepo{db: db} }

func (r *StudentProfileRepo) Create(ctx context.Context, p *identity.StudentProfile) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO student_profiles (user_id, first_name, last_name, date_of_birth, school_name, current_level, timezone)
		VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at, updated_at`,
		p.UserID, p.FirstName, p.LastName, p.DateOfBirth, p.SchoolName, p.CurrentLevel, p.Timezone,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create student profile: %w", err)
	}
	return nil
}

func (r *StudentProfileRepo) FindByUserID(ctx context.Context, userID uuid.UUID) (*identity.StudentProfile, error) {
	var id uuid.UUID
	err := r.db.QueryRowContext(ctx, `SELECT id FROM student_profiles WHERE user_id = $1 ORDER BY created_at LIMIT 1`, userID).Scan(&id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("find student profile by user: %w", err)
	}
	return r.FindByID(ctx, id)
}

func (r *StudentProfileRepo) FindByID(ctx context.Context, id uuid.UUID) (*identity.StudentProfile, error) {
	var p identity.StudentProfile
	var userID uuidNull
	var dob sql.NullTime
	var school, level sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, first_name, last_name, date_of_birth, school_name, current_level, timezone, created_at, updated_at
		FROM student_profiles WHERE id = $1`, id).
		Scan(&p.ID, &userID, &p.FirstName, &p.LastName, &dob, &school, &level, &p.Timezone, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if userID.Valid {
		p.UserID = &userID.UUID
	}
	if dob.Valid {
		p.DateOfBirth = &dob.Time
	}
	if school.Valid {
		p.SchoolName = &school.String
	}
	if level.Valid {
		p.CurrentLevel = &level.String
	}
	return &p, nil
}

func (r *StudentProfileRepo) ListByParentUserID(ctx context.Context, parentUserID uuid.UUID) ([]identity.StudentProfile, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT sp.id, sp.user_id, sp.first_name, sp.last_name, sp.date_of_birth, sp.school_name, sp.current_level, sp.timezone, sp.created_at, sp.updated_at
		FROM student_profiles sp
		JOIN parent_student_links psl ON psl.student_profile_id = sp.id
		WHERE psl.parent_user_id = $1 ORDER BY sp.created_at`, parentUserID)
	if err != nil {
		return nil, fmt.Errorf("list learners: %w", err)
	}
	defer rows.Close()
	out := []identity.StudentProfile{}
	for rows.Next() {
		var p identity.StudentProfile
		var userID uuidNull
		var dob sql.NullTime
		var school, level sql.NullString
		if err := rows.Scan(&p.ID, &userID, &p.FirstName, &p.LastName, &dob, &school, &level,
			&p.Timezone, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		if userID.Valid {
			p.UserID = &userID.UUID
		}
		if dob.Valid {
			p.DateOfBirth = &dob.Time
		}
		if school.Valid {
			p.SchoolName = &school.String
		}
		if level.Valid {
			p.CurrentLevel = &level.String
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

var _ identity.StudentProfileRepository = (*StudentProfileRepo)(nil)

type ParentStudentLinkRepo struct{ db TxQuerier }

func NewParentStudentLinkRepo(db TxQuerier) *ParentStudentLinkRepo {
	return &ParentStudentLinkRepo{db: db}
}

func (r *ParentStudentLinkRepo) Create(ctx context.Context, l *identity.ParentStudentLink) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO parent_student_links (parent_user_id, student_profile_id, relationship, is_primary)
		VALUES ($1,$2,$3,$4) RETURNING id, created_at`,
		l.ParentUserID, l.StudentProfileID, l.Relationship, l.IsPrimary,
	).Scan(&l.ID, &l.CreatedAt)
	if err != nil {
		return fmt.Errorf("create parent-student link: %w", err)
	}
	return nil
}

func (r *ParentStudentLinkRepo) Exists(ctx context.Context, parentUserID, studentProfileID uuid.UUID) (bool, error) {
	var one int
	err := r.db.QueryRowContext(ctx, `
		SELECT 1 FROM parent_student_links WHERE parent_user_id = $1 AND student_profile_id = $2 LIMIT 1`,
		parentUserID, studentProfileID).Scan(&one)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

var _ identity.ParentStudentLinkRepository = (*ParentStudentLinkRepo)(nil)
