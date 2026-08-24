package memory

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

// In-memory identity stores (tests / dev fallback).

type UserMemory struct {
	mu        sync.RWMutex
	rows      map[uuid.UUID]*identity.User
	byEmail   map[string]*identity.User
	roleStore *RoleMemory // optional: enables role join in ListUsers (dev fallback)
}

func NewUserMemory() *UserMemory {
	return &UserMemory{rows: map[uuid.UUID]*identity.User{}, byEmail: map[string]*identity.User{}}
}

// SetRoleStore links the role store so ListUsers can join role names (dev mode).
func (m *UserMemory) SetRoleStore(r *RoleMemory) {
	m.roleStore = r
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

// ListCreatedBetween — drip sweep window; oldest-first.
func (m *UserMemory) ListCreatedBetween(_ context.Context, from, to time.Time, limit int) ([]identity.User, error) {
	if limit < 1 {
		limit = 100
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	out := []identity.User{}
	ids := make([]uuid.UUID, 0, len(m.rows))
	for id := range m.rows {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return m.rows[ids[i]].CreatedAt.Before(m.rows[ids[j]].CreatedAt) })
	for _, id := range ids {
		u := m.rows[id]
		// window is [from, to): created at/after from and strictly before to
		if u.CreatedAt.Before(from) || !u.CreatedAt.Before(to) {
			continue
		}
		out = append(out, *u)
		if len(out) >= limit {
			break
		}
	}
	return out, nil
}

// BackdateCreated — test helper: force CreatedAt (drip-window tests).
func (m *UserMemory) BackdateCreated(id uuid.UUID, at time.Time) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if u, ok := m.rows[id]; ok {
		u.CreatedAt = at
		m.rows[id] = u
	}
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

// ListUsers — dev fallback for the admin user-management console.
func (m *UserMemory) ListUsers(ctx context.Context, search, status string, offset, limit int) ([]identity.UserWithRoles, int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	search = strings.ToLower(strings.TrimSpace(search))
	all := []identity.User{}
	for _, u := range m.rows {
		if status != "" && string(u.Status) != status {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(u.Email), search) &&
			!strings.Contains(strings.ToLower(u.FirstName), search) &&
			!strings.Contains(strings.ToLower(u.LastName), search) {
			continue
		}
		all = append(all, *u)
	}
	// sort by CreatedAt desc
	for i := 0; i < len(all); i++ {
		for j := i + 1; j < len(all); j++ {
			if all[j].CreatedAt.After(all[i].CreatedAt) {
				all[i], all[j] = all[j], all[i]
			}
		}
	}
	total := len(all)
	start := offset
	if start > total {
		start = total
	}
	end := start + limit
	if end > total {
		end = total
	}
	out := []identity.UserWithRoles{}
	for _, u := range all[start:end] {
		uwr := identity.UserWithRoles{User: u}
		if m.roleStore != nil {
			roles, _ := m.roleStore.RolesForUser(ctx, u.ID)
			for _, r := range roles {
				uwr.Roles = append(uwr.Roles, r.Name)
			}
		}
		out = append(out, uwr)
	}
	return out, total, nil
}

// SetStatus — activate/suspend a user account (dev fallback).
func (m *UserMemory) SetStatus(_ context.Context, id uuid.UUID, status string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	u, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	u.Status = identity.UserStatus(status)
	u.UpdatedAt = time.Now().UTC()
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

// Extend slides a session's expiry forward.
func (m *SessionMemory) Extend(_ context.Context, id uuid.UUID, expiresAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, s := range m.rows {
		if s.ID == id {
			s.ExpiresAt = expiresAt
			return nil
		}
	}
	return domain.ErrNotFound
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

func (m *RoleMemory) ListRoles(_ context.Context) ([]identity.Role, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]identity.Role, 0, len(m.byName))
	for _, r := range m.byName {
		out = append(out, *r)
	}
	return out, nil
}

func (m *RoleMemory) RemoveRoleForUser(_ context.Context, userID uuid.UUID, roleName string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	roles := m.userRoles[userID]
	kept := roles[:0]
	for _, r := range roles {
		if r.Name != roleName {
			kept = append(kept, r)
		}
	}
	m.userRoles[userID] = kept
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

// StudentBookingAccess — self-ownership + minor facts + guardian links
// (Phase 3). Mirrors the Postgres implementation against the memory store.
func (m *ParentStudentLinkMemory) StudentBookingAccess(ctx context.Context, studentID, actorUserID uuid.UUID) (booking.StudentBookingAccess, error) {
	parentLinked, _ := m.Exists(ctx, actorUserID, studentID)
	acc := booking.StudentBookingAccess{ParentLinked: parentLinked}
	if m.students != nil {
		if p, err := m.students.FindByID(ctx, studentID); err == nil && p != nil {
			acc.SelfOwned = p.UserID != nil && *p.UserID == actorUserID
			acc.DateOfBirth = p.DateOfBirth
			acc.GuardianConsent = p.GuardianConsent
		}
	}
	m.mu.RLock()
	for k := range m.links {
		// key format: parentUserID|studentProfileID
		if strings.HasSuffix(k, "|"+studentID.String()) {
			acc.HasLinkedParent = true
			break
		}
	}
	m.mu.RUnlock()
	return acc, nil
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
