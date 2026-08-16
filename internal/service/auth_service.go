package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/notification"
	"ykay-virtual/internal/worker"
)

// AuthService — registration, session-based login (httpOnly cookie bound),
// logout, current-user lookup and session rotation on privilege change.
//
// Security invariants (per AGENTS.md / PRD):
//   - Passwords hashed with bcrypt (never stored/returned raw)
//   - Sessions: random 32-byte token; only its SHA-256 hash is stored;
//     the raw token lives only in the httpOnly cookie
//   - Sessions rotate on privilege change (role grant/revoke)
//   - Rate limiting on auth endpoints is applied at the transport layer

const (
	SessionTTL    = 30 * 24 * time.Hour
	bcryptCost    = 10
	SessionCookie = "nuvora_session"
)

// selfAssignableRoles — the ONLY roles a user may grant themselves, either at
// registration or through the self-service onboarding role step
// (POST /auth/me/role). Administrative roles (ACADEMIC_ADMIN, SUPER_ADMIN,
// INSTITUTION_ADMIN) are deliberately absent: they grant privileged access to
// the admin surface, payments, vetting and refunds, so they can only ever be
// granted by an already-privileged actor. Accepting them here would be a
// self-service privilege escalation (security CF-1).
var selfAssignableRoles = map[string]bool{
	"STUDENT": true,
	"PARENT":  true,
	"TUTOR":   true,
}

// isSelfAssignableRole reports whether a (normalized, upper-cased) role name
// may be granted by the account owner without an explicit admin grant.
func isSelfAssignableRole(roleName string) bool {
	return selfAssignableRoles[roleName]
}

type AuthService struct {
	users     identity.UserRepository
	sessions  identity.SessionRepository
	roles     identity.RoleRepository
	tokens    identity.AuthTokenRepository
	email     notification.EmailSender
	queue     worker.Queue // durable dispatch when available (G4)
	audit     identity.AuditService
	referrals ReferralApplier
	students  identity.StudentProfileRepository
	now       func() time.Time
	devLog    func(format string, args ...any) // nil outside development
}

func NewAuthService(users identity.UserRepository, sessions identity.SessionRepository,
	roles identity.RoleRepository, audit identity.AuditService) *AuthService {
	return &AuthService{
		users: users, sessions: sessions, roles: roles, audit: audit,
		tokens: nil, email: notification.NewEmailSender(), now: time.Now,
	}
}

// WithQueue routes outbound emails through the durable job queue when one is
// configured (G4.1); without a queue, delivery stays synchronous.
func (s *AuthService) WithQueue(q worker.Queue) *AuthService {
	s.queue = q
	return s
}

// WithDevLogging enables plain-text dev logging of login codes, verification
// and password-reset links (so developers can copy them from the terminal
// without parsing the branded email). NEVER enabled in production.
func (s *AuthService) WithDevLogging(enabled bool) *AuthService {
	if enabled {
		s.devLog = func(format string, args ...any) {
			log.Printf("🔑 "+format, args...)
		}
	} else {
		s.devLog = nil
	}
	return s
}

func (s *AuthService) logDev(format string, args ...any) {
	if s.devLog != nil {
		s.devLog(format, args...)
	}
}

// sendEmail — durable-queue first, direct SMTP/console fallback. The queue
// handler is idempotent and retries with backoff (at-least-once).
func (s *AuthService) sendEmail(ctx context.Context, to, subject, htmlBody string) error {
	if s.queue != nil {
		payload := map[string]string{"to": to, "subject": subject, "body": htmlBody}
		if _, err := s.queue.Enqueue(ctx, worker.JobSendEmail, payload); err != nil {
			return s.email.Send(ctx, to, subject, htmlBody) // queue down → direct
		}
		return nil
	}
	return s.email.Send(ctx, to, subject, htmlBody)
}

// WithAuthTokens wires the token repository (email verification + reset).
func (s *AuthService) WithAuthTokens(tokens identity.AuthTokenRepository) *AuthService {
	s.tokens = tokens
	return s
}

// WithEmailSender overrides the email adapter (tests / custom delivery).
func (s *AuthService) WithEmailSender(email notification.EmailSender) *AuthService {
	s.email = email
	return s
}

// WithReferrals wires the referral applier (register ?ref=CODE support).
func (s *AuthService) WithReferrals(r ReferralApplier) *AuthService {
	s.referrals = r
	return s
}

// WithStudentProfiles wires the student-profile repository so self-registered
// STUDENT accounts get a linked profile (G1: session-resolved identity).
func (s *AuthService) WithStudentProfiles(students identity.StudentProfileRepository) *AuthService {
	s.students = students
	return s
}

// ensureStudentProfile — creates the user's own student profile when the
// STUDENT role is granted and none exists yet. Best-effort: failures are
// logged to audit but never block auth flows.
func (s *AuthService) ensureStudentProfile(ctx context.Context, user *identity.User) {
	if s.students == nil || user == nil {
		return
	}
	if existing, err := s.students.FindByUserID(ctx, user.ID); err == nil && existing != nil {
		return
	}
	uid := user.ID
	firstName := strings.TrimSpace(user.FirstName)
	if firstName == "" {
		if at := strings.IndexByte(user.Email, '@'); at > 0 {
			firstName = user.Email[:at]
		} else {
			firstName = "Learner"
		}
	}
	profile := &identity.StudentProfile{
		UserID:    &uid,
		FirstName: firstName,
		LastName:  strings.TrimSpace(user.LastName),
		Timezone:  user.Timezone,
	}
	if err := s.students.Create(ctx, profile); err == nil {
		_ = s.audit.LogStateChange(ctx, &user.ID, identity.AuditCreate, "student_profile",
			&profile.ID, nil, map[string]any{"self": true}, nil, nil)
	}
}

type RegisterInput struct {
	Email        string   `json:"email"`
	Password     string   `json:"password"`
	Roles        []string `json:"roles"` // e.g. ["PARENT"], ["TUTOR"], ["STUDENT"]
	Phone        *string  `json:"phone,omitempty"`
	Timezone     string   `json:"timezone,omitempty"`
	ReferralCode string   `json:"referral_code,omitempty"`
}

// Register — creates the user with bcrypt hash, assigns roles (validated
// against the roles table), audits the event. Returns the sanitized user.
func (s *AuthService) Register(ctx context.Context, in RegisterInput) (*identity.User, error) {
	email := strings.ToLower(strings.TrimSpace(in.Email))
	if !validEmail(email) {
		return nil, fmt.Errorf("%w: a valid email is required", domain.ErrInvalidInput)
	}
	if len(in.Password) < 8 {
		return nil, fmt.Errorf("%w: password must be at least 8 characters", domain.ErrInvalidInput)
	}
	if len(in.Roles) == 0 {
		return nil, fmt.Errorf("%w: at least one role is required (STUDENT, PARENT, TUTOR)", domain.ErrInvalidInput)
	}
	// Reject any administrative/privileged role in self-service registration.
	// Without this an anonymous attacker could register with roles=["SUPER_ADMIN"]
	// and take over the whole platform (security CF-1).
	for _, roleName := range in.Roles {
		if !isSelfAssignableRole(strings.ToUpper(strings.TrimSpace(roleName))) {
			return nil, fmt.Errorf("%w: role %q cannot be self-assigned", domain.ErrForbidden, roleName)
		}
	}
	if in.Timezone == "" {
		in.Timezone = "Africa/Lagos"
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcryptCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &identity.User{
		Email:        email,
		Phone:        in.Phone,
		PasswordHash: string(hash),
		Status:       identity.UserStatusPending,
		Timezone:     in.Timezone,
	}
	if err := s.users.Create(ctx, user); err != nil {
		return nil, err
	}
	for _, roleName := range in.Roles {
		roleName = strings.ToUpper(strings.TrimSpace(roleName))
		role, err := s.roles.FindByName(ctx, roleName)
		if err != nil {
			continue // unknown role names are ignored (defensive)
		}
		_ = s.roles.AssignToUser(ctx, user.ID, role.ID)
		if roleName == "STUDENT" {
			s.ensureStudentProfile(ctx, user)
		}
	}
	if s.referrals != nil && strings.TrimSpace(in.ReferralCode) != "" {
		// Record the referral (best-effort — never blocks registration).
		_, _ = s.referrals.Apply(ctx, user.ID, in.ReferralCode)
	}
	_ = s.audit.LogStateChange(ctx, &user.ID, identity.AuditCreate, "user",
		&user.ID, nil, map[string]any{"email": user.Email, "roles": in.Roles, "status": user.Status},
		nil, nil)
	return user, nil
}

// SetPrimaryRole — replaces the user's role grants with a single primary role
// (self-service onboarding step: "select role"). Unknown role names are
// rejected; the caller must already be authenticated.
func (s *AuthService) SetPrimaryRole(ctx context.Context, userID uuid.UUID, roleName string) ([]string, error) {
	roleName = strings.ToUpper(strings.TrimSpace(roleName))
	role, err := s.roles.FindByName(ctx, roleName)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, fmt.Errorf("%w: unknown role %q", domain.ErrInvalidInput, roleName)
		}
		return nil, err
	}
	// Known role, but self-service selection must never grant an
	// administrative role. Only STUDENT / PARENT / TUTOR may be self-assigned;
	// an authenticated user asking for SUPER_ADMIN is a privilege escalation
	// attempt (security CF-1).
	if !isSelfAssignableRole(roleName) {
		return nil, fmt.Errorf("%w: role %q cannot be self-assigned", domain.ErrForbidden, roleName)
	}
	if err := s.roles.RemoveAllForUser(ctx, userID); err != nil {
		return nil, err
	}
	if err := s.roles.AssignToUser(ctx, userID, role.ID); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &userID, identity.AuditUpdate, "user_role",
		nil, nil, map[string]any{"role": roleName}, nil, nil)
	if roleName == "STUDENT" {
		if user, err := s.users.FindByID(ctx, userID); err == nil {
			s.ensureStudentProfile(ctx, user)
		}
	}
	list, _ := s.roles.RolesForUser(ctx, userID)
	out := make([]string, 0, len(list))
	for _, r := range list {
		out = append(out, r.Name)
	}
	return out, nil
}

// ChangePassword — sets a new password for the authenticated user (used by the
// onboarding "complete your profile" step, where accounts are first created
// with a generated password, and by account settings).
//
// SECURITY (YK-017): after changing the password we rotate ALL of the user's
// sessions and issue a single fresh one. Previously-issued sessions (e.g. on a
// stolen/other device) are revoked immediately, so an attacker holding an old
// session token can no longer act as the user. The returned raw token is the
// replacement session the current client should adopt.
func (s *AuthService) ChangePassword(ctx context.Context, userID uuid.UUID, newPassword string) (string, error) {
	if len(newPassword) < 8 {
		return "", fmt.Errorf("%w: password must be at least 8 characters", domain.ErrInvalidInput)
	}
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return "", err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	user.PasswordHash = string(hash)
	if err := s.users.Update(ctx, user); err != nil {
		return "", err
	}
	// Rotate every existing session so no stale/stolen session survives.
	if err := s.sessions.RevokeAllForUser(ctx, userID); err != nil {
		return "", fmt.Errorf("revoke sessions: %w", err)
	}
	// Issue a fresh session for the current client so it stays signed in.
	raw, sessionHash, err := newSessionToken()
	if err != nil {
		return "", err
	}
	now := s.now().UTC()
	sess := &identity.Session{
		UserID:    userID,
		TokenHash: sessionHash,
		ExpiresAt: now.Add(SessionTTL),
	}
	if err := s.sessions.Create(ctx, sess); err != nil {
		return "", fmt.Errorf("create session: %w", err)
	}
	_ = s.audit.LogStateChange(ctx, &userID, identity.AuditUpdate, "user",
		nil, nil, map[string]any{"event": "password_changed", "sessions_rotated": true}, nil, nil)
	return raw, nil
}

// Login — verifies credentials, creates a session, returns the raw token
// (the handler puts it in the httpOnly cookie) + the user + roles.
func (s *AuthService) Login(ctx context.Context, email, password, ip, userAgent string) (token string, user *identity.User, roles []string, err error) {
	email = strings.ToLower(strings.TrimSpace(email))
	user, err = s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return "", nil, nil, fmt.Errorf("%w: invalid credentials", domain.ErrUnauthorized)
		}
		return "", nil, nil, err
	}
	if !user.CanLogin() {
		return "", nil, nil, fmt.Errorf("%w: account is not active", domain.ErrForbidden)
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)) != nil {
		return "", nil, nil, fmt.Errorf("%w: invalid credentials", domain.ErrUnauthorized)
	}

	raw, hash, err := newSessionToken()
	if err != nil {
		return "", nil, nil, err
	}
	now := s.now().UTC()
	session := &identity.Session{
		UserID:    user.ID,
		TokenHash: hash,
		IPAddress: &ip,
		UserAgent: &userAgent,
		ExpiresAt: now.Add(SessionTTL),
	}
	if err := s.sessions.Create(ctx, session); err != nil {
		return "", nil, nil, err
	}
	_ = s.users.UpdateLastLogin(ctx, user.ID, now)
	roleList, _ := s.roles.RolesForUser(ctx, user.ID)
	roles = make([]string, 0, len(roleList))
	for _, r := range roleList {
		roles = append(roles, r.Name)
	}
	_ = s.audit.LogStateChange(ctx, &user.ID, identity.AuditLogin, "session",
		&session.ID, nil, map[string]any{"email": user.Email, "ip": ip}, nil, nil)
	return raw, user, roles, nil
}

// Me — resolves the current user + roles from a session token hash.
// MarkOnboarded — first-time wizard completion marker (idempotent).
func (s *AuthService) MarkOnboarded(ctx context.Context, userID uuid.UUID) error {
	return s.users.SetOnboarded(ctx, userID, s.now().UTC())
}

func (s *AuthService) Me(ctx context.Context, tokenHash string) (*identity.User, []string, error) {
	session, err := s.sessions.FindByTokenHash(ctx, tokenHash)
	if err != nil {
		return nil, nil, err
	}
	if session.RevokedAt != nil {
		return nil, nil, fmt.Errorf("%w: session revoked", domain.ErrUnauthorized)
	}
	if session.ExpiresAt.Before(s.now().UTC()) {
		return nil, nil, fmt.Errorf("%w: session expired", domain.ErrUnauthorized)
	}
	user, err := s.users.FindByID(ctx, session.UserID)
	if err != nil {
		return nil, nil, err
	}
	if !user.CanLogin() {
		return nil, nil, fmt.Errorf("%w: account is not active", domain.ErrForbidden)
	}
	roleList, _ := s.roles.RolesForUser(ctx, user.ID)
	roles := make([]string, 0, len(roleList))
	for _, r := range roleList {
		roles = append(roles, r.Name)
	}
	return user, roles, nil
}

// Logout — revokes the session by token hash (cookie cleared by handler).
func (s *AuthService) Logout(ctx context.Context, tokenHash string) error {
	session, err := s.sessions.FindByTokenHash(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil // idempotent logout
		}
		return err
	}
	return s.sessions.Revoke(ctx, session.ID)
}

// RotateAllSessions — revokes every session for a user (privilege change).
// The user re-authenticates to get a fresh session (session rotation per
// AGENTS.md: "Sessions rotate on privilege change").
func (s *AuthService) RotateAllSessions(ctx context.Context, userID uuid.UUID) error {
	return s.sessions.RevokeAllForUser(ctx, userID)
}

// --- Helpers ---

func newSessionToken() (raw, hash string, err error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", "", fmt.Errorf("generate session token: %w", err)
	}
	raw = base64.RawURLEncoding.EncodeToString(buf)
	sum := sha256.Sum256([]byte(raw))
	return raw, hex.EncodeToString(sum[:]), nil
}

// HashToken — SHA-256 hex of a raw session token (for cookie→lookup).
func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func validEmail(email string) bool {
	return strings.Contains(email, "@") && strings.Contains(email, ".")
}
