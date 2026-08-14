package memory

import (
	"context"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

// In-memory identity stores (tests / dev fallback).

type UserMemory struct {
	mu      sync.RWMutex
	rows    map[uuid.UUID]*identity.User
	byEmail map[string]*identity.User
}

func NewUserMemory() *UserMemory {
	return &UserMemory{rows: map[uuid.UUID]*identity.User{}, byEmail: map[string]*identity.User{}}
}

// Count returns (total users, users with a verified email or phone) — used by
// the dev-mode analytics funnel.
func (m *UserMemory) Count() (total, verified int64) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, u := range m.rows {
		total++
		if u.EmailVerifiedAt != nil || u.PhoneVerifiedAt != nil {
			verified++
		}
	}
	return total, verified
}

func (m *UserMemory) Create(_ context.Context, u *identity.User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, exists := m.byEmail[u.Email]; exists {
		return domain.ErrAlreadyExists
	}
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	u.CreatedAt = time.Now().UTC()
	u.UpdatedAt = u.CreatedAt
	m.rows[u.ID] = u
	m.byEmail[u.Email] = u
	return nil
}

func (m *UserMemory) FindByEmail(_ context.Context, email string) (*identity.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if u, ok := m.byEmail[email]; ok {
		cp := *u
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *UserMemory) FindByID(_ context.Context, id uuid.UUID) (*identity.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if u, ok := m.rows[id]; ok {
		cp := *u
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

// SetOnboarded — marks the first-time wizard complete (000031).
func (m *UserMemory) SetOnboarded(_ context.Context, id uuid.UUID, at time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	u, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	u.OnboardedAt = &at
	u.UpdatedAt = time.Now().UTC()
	return nil
}

func (m *UserMemory) Update(_ context.Context, u *identity.User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.rows[u.ID]; !ok {
		return domain.ErrNotFound
	}
	u.UpdatedAt = time.Now().UTC()
	m.rows[u.ID] = u
	m.byEmail[u.Email] = u
	return nil
}

func (m *UserMemory) UpdateLastLogin(_ context.Context, id uuid.UUID, at time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	u, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	u.LastLoginAt = &at
	return nil
}

var _ identity.UserRepository = (*UserMemory)(nil)

// --- Sessions ---

type SessionMemory struct {
	mu   sync.RWMutex
	rows map[string]*identity.Session // by token hash
}

func NewSessionMemory() *SessionMemory {
	return &SessionMemory{rows: map[string]*identity.Session{}}
}

func (m *SessionMemory) Create(_ context.Context, s *identity.Session) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	s.CreatedAt = time.Now().UTC()
	m.rows[s.TokenHash] = s
	return nil
}

func (m *SessionMemory) FindByTokenHash(_ context.Context, tokenHash string) (*identity.Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if s, ok := m.rows[tokenHash]; ok {
		cp := *s
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *SessionMemory) Revoke(_ context.Context, id uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, s := range m.rows {
		if s.ID == id {
			if s.RevokedAt == nil {
				now := time.Now().UTC()
				s.RevokedAt = &now
			}
			return nil // idempotent: already revoked is fine
		}
	}
	return domain.ErrNotFound
}

func (m *SessionMemory) RevokeAllForUser(_ context.Context, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC()
	for _, s := range m.rows {
		if s.UserID == userID && s.RevokedAt == nil {
			s.RevokedAt = &now
		}
	}
	return nil
}

func (m *SessionMemory) DeleteExpired(_ context.Context) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC()
	var n int64
	for k, s := range m.rows {
		if s.ExpiresAt.Before(now) {
			delete(m.rows, k)
			n++
		}
	}
	return n, nil
}

var _ identity.SessionRepository = (*SessionMemory)(nil)

// --- Roles ---

type RoleMemory struct {
	mu        sync.RWMutex
	byName    map[string]*identity.Role
	userRoles map[uuid.UUID][]identity.Role
}

func NewRoleMemory() *RoleMemory {
	return &RoleMemory{
		byName:    map[string]*identity.Role{},
		userRoles: map[uuid.UUID][]identity.Role{},
	}
}

// Seed ensures the standard roles exist (mirrors migration 000001 INSERTs).
func (m *RoleMemory) Seed() {
	for _, name := range []string{"STUDENT", "PARENT", "TUTOR", "ACADEMIC_ADMIN", "SUPER_ADMIN", "INSTITUTION_ADMIN"} {
		if _, ok := m.byName[name]; !ok {
			m.byName[name] = &identity.Role{ID: uuid.New(), Name: name}
		}
	}
}

func (m *RoleMemory) FindByName(_ context.Context, name string) (*identity.Role, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if r, ok := m.byName[name]; ok {
		cp := *r
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *RoleMemory) AssignToUser(_ context.Context, userID, roleID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, r := range m.userRoles[userID] {
		if r.ID == roleID {
			return nil
		}
	}
	for _, r := range m.byName {
		if r.ID == roleID {
			m.userRoles[userID] = append(m.userRoles[userID], *r)
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *RoleMemory) RolesForUser(_ context.Context, userID uuid.UUID) ([]identity.Role, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]identity.Role, len(m.userRoles[userID]))
	copy(out, m.userRoles[userID])
	return out, nil
}

func (m *RoleMemory) RemoveAllForUser(_ context.Context, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.userRoles, userID)
	return nil
}

var _ identity.RoleRepository = (*RoleMemory)(nil)

// --- Student profiles + parent links ---

type StudentProfileMemory struct {
	mu       sync.RWMutex
	rows     map[uuid.UUID]*identity.StudentProfile
	byParent map[uuid.UUID][]uuid.UUID
}

// Count returns the number of learner profiles — dev-mode analytics funnel.
func (m *StudentProfileMemory) Count() int64 {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return int64(len(m.rows))
}

func NewStudentProfileMemory() *StudentProfileMemory {
	return &StudentProfileMemory{rows: map[uuid.UUID]*identity.StudentProfile{}, byParent: map[uuid.UUID][]uuid.UUID{}}
}

func (m *StudentProfileMemory) Create(_ context.Context, p *identity.StudentProfile) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	p.CreatedAt = nowUTC()
	p.UpdatedAt = p.CreatedAt
	m.rows[p.ID] = p
	return nil
}

func (m *StudentProfileMemory) FindByUserID(_ context.Context, userID uuid.UUID) (*identity.StudentProfile, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, p := range m.rows {
		if p.UserID != nil && *p.UserID == userID {
			cp := *p
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *StudentProfileMemory) FindByID(_ context.Context, id uuid.UUID) (*identity.StudentProfile, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if p, ok := m.rows[id]; ok {
		cp := *p
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *StudentProfileMemory) ListByParentUserID(_ context.Context, parentUserID uuid.UUID) ([]identity.StudentProfile, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []identity.StudentProfile{}
	for _, id := range m.byParent[parentUserID] {
		if p, ok := m.rows[id]; ok {
			out = append(out, *p)
		}
	}
	return out, nil
}

// LinkStudent — test/dev helper to attach a learner to a parent.
func (m *StudentProfileMemory) LinkStudent(parentUserID, studentID uuid.UUID) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.byParent[parentUserID] = append(m.byParent[parentUserID], studentID)
}

var _ identity.StudentProfileRepository = (*StudentProfileMemory)(nil)

// --- Parent-student links ---

type ParentStudentLinkMemory struct {
	mu       sync.RWMutex
	links    map[string]bool // parent|student
	students *StudentProfileMemory
}

func NewParentStudentLinkMemory(students *StudentProfileMemory) *ParentStudentLinkMemory {
	return &ParentStudentLinkMemory{links: map[string]bool{}, students: students}
}

// StudentExistsForParent — booking authz reader (mirrors StudentLinkMemory,
// but backed by the same store the onboarding flow writes to).
func (m *ParentStudentLinkMemory) StudentExistsForParent(ctx context.Context, studentID, parentUserID uuid.UUID) (bool, error) {
	return m.Exists(ctx, parentUserID, studentID)
}

func (m *ParentStudentLinkMemory) Create(_ context.Context, l *identity.ParentStudentLink) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	l.CreatedAt = nowUTC()
	m.links[l.ParentUserID.String()+"|"+l.StudentProfileID.String()] = true
	if m.students != nil {
		m.students.byParent[l.ParentUserID] = append(m.students.byParent[l.ParentUserID], l.StudentProfileID)
	}
	return nil
}

func (m *ParentStudentLinkMemory) Exists(_ context.Context, parentUserID, studentProfileID uuid.UUID) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.links[parentUserID.String()+"|"+studentProfileID.String()], nil
}

var _ identity.ParentStudentLinkRepository = (*ParentStudentLinkMemory)(nil)
