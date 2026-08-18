# APPLY89.ps1 — OTP send, role account, dashboard photo + shorter copy.
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.\internal\notification\email.go')) { throw 'Run from ykay-virtual repo root.' }
$utf8 = New-Object System.Text.UTF8Encoding $false

New-Item -ItemType Directory -Force -Path 'internal\notification' | Out-Null
$content = @'
package notification

import (
	"context"
	"fmt"
	"log/slog"
	"net/smtp"
	"os"
	"strings"
)

// EmailSender — outbound email adapter (AGENTS.md internal/notification).
// Implementations:
//   - ConsoleEmailSender — logs emails to stdout (dev default)
//   - SMTPEmailSender   — real SMTP delivery via SMTP_* env vars
type EmailSender interface {
	Send(ctx context.Context, to, subject, htmlBody string) error
}

func NewEmailSender() EmailSender {
	if os.Getenv("SMTP_HOST") != "" {
		return NewSMTPEmailSender(
			os.Getenv("SMTP_HOST"),
			os.Getenv("SMTP_PORT"),
			os.Getenv("SMTP_USER"),
			os.Getenv("SMTP_PASS"),
			os.Getenv("EMAIL_FROM"),
		)
	}
	return ConsoleEmailSender{}
}

// ConsoleEmailSender — dev: logs the email so links are clickable in the
// terminal during local development.
type ConsoleEmailSender struct{}

func (ConsoleEmailSender) Send(_ context.Context, to, subject, htmlBody string) error {
	// Safe logging (A-20/A-21): the console sender runs only when SMTP is not
	// configured. In production that is a misconfiguration — warn WITHOUT
	// logging the body (which may contain magic links/codes/PII).
	if os.Getenv("ENVIRONMENT") == "production" {
		slog.Error("email console sender used in production — SMTP_HOST is not set; OTP/codes are NOT emailed", "to", to, "subject", subject)
		return fmt.Errorf("smtp not configured: set SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM")
	}
	// Dev console: log enough of the body to include codes/links (the branded
	// shell is long, so 300 would hide them).
	slog.Info("EMAIL (console/dev)", "to", to, "subject", subject, "body_len", len(htmlBody), "body", truncate(htmlBody, 3000))
	return nil
}

// SMTPEmailSender — production: plain SMTP (TLS/STARTTLS via smtp.SendMail).
type SMTPEmailSender struct {
	host, port, user, pass, from string
}

func NewSMTPEmailSender(host, port, user, pass, from string) *SMTPEmailSender {
	return &SMTPEmailSender{host: host, port: port, user: user, pass: pass, from: from}
}

func (s *SMTPEmailSender) Send(_ context.Context, to, subject, htmlBody string) error {
	headerFrom, addr := parseFrom(s.from)
	port := s.port
	if port == "" {
		port = "587"
	}
	addrHost := fmt.Sprintf("%s:%s", s.host, port)
	msg := strings.Join([]string{
		"From: " + headerFrom,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
		"",
		htmlBody,
	}, "\r\n")
	auth := smtp.PlainAuth("", s.user, s.pass, s.host)
	if err := smtp.SendMail(addrHost, auth, addr, []string{to}, []byte(msg)); err != nil {
		slog.Error("smtp send failed", "to", to, "subject", subject, "error", err)
		return fmt.Errorf("smtp send: %w", err)
	}
	slog.Info("smtp sent", "to", to, "subject", subject)
	return nil
}

// parseFrom accepts "you@domain" or "NUVORA <you@domain>" without double-wrapping.
func parseFrom(from string) (header, addr string) {
	from = strings.TrimSpace(from)
	if from == "" {
		return "NUVORA <beth.t@example.com>", "beth.t@example.com"
	}
	if i := strings.Index(from, "<"); i >= 0 {
		j := strings.Index(from, ">")
		if j > i {
			addr = strings.TrimSpace(from[i+1 : j])
			if addr != "" {
				return from, addr
			}
		}
	}
	return "NUVORA <" + from + ">", from
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	// Keep the TAIL — dev logs exist to expose codes/links, which live at
	// the end of the branded email shell (verification/reset links).
	head := 200
	if n <= head+50 {
		head = 0
	}
	if head == 0 {
		return "…" + s[len(s)-n:]
	}
	return s[:head] + " …[truncated]… " + s[len(s)-(n-head):]
}

// BrandEmail — wraps an HTML body in the NUVORA email shell (navy header,
// gold accent, footer). Used by every outbound template so transactional
// emails carry the brand.
func BrandEmail(bodyHTML string) string {
	return `<!DOCTYPE html>
<html lang="en"><body style="margin:0;padding:0;background:#FFFCF5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFCF5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #F0ECE3;box-shadow:0 8px 24px rgba(0,0,0,.06);">
        <tr><td style="background:#F4B400;padding:24px 32px;">
          <div style="color:#111111;font-size:22px;font-weight:800;letter-spacing:0.14em;">NUVORA</div>
          <div style="color:#111111;font-size:12px;margin-top:4px;letter-spacing:0.08em;opacity:.65;">LEARNING BEYOND BOUNDARIES</div>
        </td></tr>
        <tr><td style="padding:32px;color:#333333;font-size:15px;line-height:1.6;">` + bodyHTML + `</td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #F0ECE3;color:#777777;font-size:12px;">
          British &amp; Nigerian curricula &middot; Exam preparation &middot; Private tuition &middot; Live cohorts<br/>
          &copy; 2026 NUVORA. If this email wasn&rsquo;t expected, you can safely ignore it.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'internal\notification\email.go'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote internal/notification/email.go'

New-Item -ItemType Directory -Force -Path 'internal\service' | Out-Null
$content = @'
package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
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
			slog.Info(fmt.Sprintf("🔑 "+format, args...))
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
	// Auth codes must go out now. Queue-only delivery fails on Render when
	// the worker is not running (emails sit in Redis forever).
	if s.email == nil {
		return fmt.Errorf("email sender not configured")
	}
	if err := s.email.Send(ctx, to, subject, htmlBody); err != nil {
		if s.queue != nil {
			payload := map[string]string{"to": to, "subject": subject, "body": htmlBody}
			if _, qerr := s.queue.Enqueue(ctx, worker.JobSendEmail, payload); qerr == nil {
				slog.Warn("smtp failed — queued email for retry", "to", to, "subject", subject, "error", err)
				return nil
			}
		}
		return err
	}
	return nil
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
	// A-18: bcrypt only reads the first 72 bytes and Go's bcrypt rejects
	// longer passwords with an opaque error that would surface as a 500.
	// Reject over-long passwords with a friendly message instead.
	if len(in.Password) > 72 {
		return nil, fmt.Errorf("%w: password must be at most 72 characters", domain.ErrInvalidInput)
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
	if len(newPassword) > 72 {
		return "", fmt.Errorf("%w: password must be at most 72 characters", domain.ErrInvalidInput)
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
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'internal\service\auth_service.go'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote internal/service/auth_service.go'

New-Item -ItemType Directory -Force -Path 'internal\service' | Out-Null
$content = @'
package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/notification"
)

// Magic-link login (phase 18): 6-digit code via email, 10-minute TTL,
// single-use, hashed at rest (sha256 of userID:code), anti-enumeration
// (request always succeeds for valid-looking emails), sessions created via
// the same path as password login.

const (
	loginCodeTTL    = 10 * time.Minute
	loginCodeLength = 6
)

// RequestLoginCode — emails a 6-digit sign-in code. Always returns nil for a
//
// syntactically valid email so the response does not reveal account existence.
func (s *AuthService) RequestLoginCode(ctx context.Context, email string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil // anti-enumeration: pretend success
		}
		return err
	}
	if !user.CanLogin() {
		return nil // suspended/not active: do not leak status either
	}

	code, err := generateLoginCode()
	if err != nil {
		return err
	}

	// One active code per user.
	_ = s.tokens.InvalidateAllForUser(ctx, user.ID, identity.TokenLoginCode)
	token := &identity.AuthToken{
		UserID:    user.ID,
		Purpose:   identity.TokenLoginCode,
		TokenHash: HashToken(fmt.Sprintf("%s:%s", user.ID, code)),
		ExpiresAt: s.now().UTC().Add(loginCodeTTL),
	}
	if err := s.tokens.Create(ctx, token); err != nil {
		return err
	}

	s.logDev("login code for %s: %s (expires in 10 minutes)", user.Email, code)
	if s.email != nil {
		if err := s.sendEmail(ctx, user.Email, "Your NUVORA login code",
			notification.BrandEmail(
				"<h1 style=\"margin:0 0 12px;font-size:20px;color:#0A1F44;\">Your login code</h1>"+
					"<p style=\"margin:0 0 16px;\">Hi,</p>"+
					"<p style=\"margin:0 0 20px;\">Use this code to sign in to your NUVORA account. It expires in 10 minutes.</p>"+
					"<p style=\"margin:0 0 20px;text-align:center;\"><span style=\"display:inline-block;background:#E9F0FF;color:#0A1F44;font-size:30px;font-weight:800;letter-spacing:0.35em;padding:14px 22px;border-radius:12px;font-family:monospace;\">"+code+"</span></p>"+
					"<p style=\"margin:0 0 0;color:#8794AC;font-size:13px;\">If you didn't request this code, you can safely ignore this email.</p>")); err != nil {
			slog.Error("login code email failed", "to", user.Email, "error", err)
			return fmt.Errorf("could not send login code: %w", err)
		}
	}
	_ = s.audit.LogStateChange(ctx, &user.ID, identity.AuditLogin, "auth_token",
		nil, nil, map[string]any{"purpose": string(identity.TokenLoginCode)}, nil, nil)
	return nil
}

// ConfirmLoginCode — verifies the code, consumes it and starts a session
// (same session path as password login, including the audit trail).
func (s *AuthService) ConfirmLoginCode(ctx context.Context, email, code, ip, userAgent string) (string, *identity.User, []string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	code = strings.TrimSpace(code)
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		return "", nil, nil, fmt.Errorf("%w: invalid login code", domain.ErrUnauthorized)
	}
	if !user.CanLogin() {
		return "", nil, nil, fmt.Errorf("%w: account is not active", domain.ErrForbidden)
	}

	t, err := s.tokens.FindByHash(ctx, HashToken(fmt.Sprintf("%s:%s", user.ID, code)))
	if err != nil || t.Purpose != identity.TokenLoginCode || t.UserID != user.ID {
		return "", nil, nil, fmt.Errorf("%w: invalid login code", domain.ErrUnauthorized)
	}
	if t.IsConsumed() || s.now().UTC().After(t.ExpiresAt) {
		return "", nil, nil, fmt.Errorf("%w: login code expired", domain.ErrUnauthorized)
	}
	if err := s.tokens.Consume(ctx, t.ID); err != nil {
		return "", nil, nil, err
	}
	// A successful code sign-in proves email ownership: mark the address
	// verified and activate pending accounts (onboarding "verify email" step).
	if user.EmailVerifiedAt == nil {
		now := s.now().UTC()
		user.EmailVerifiedAt = &now
		if user.Status == identity.UserStatusPending {
			user.Status = identity.UserStatusActive
		}
		if err := s.users.Update(ctx, user); err != nil {
			return "", nil, nil, err
		}
	}
	return s.startSession(ctx, user, ip, userAgent)
}

// startSession — shared session creation used by password login and login code.
func (s *AuthService) startSession(ctx context.Context, user *identity.User, ip, userAgent string) (string, *identity.User, []string, error) {
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
	roles := make([]string, 0, len(roleList))
	for _, r := range roleList {
		roles = append(roles, r.Name)
	}
	_ = s.audit.LogStateChange(ctx, &user.ID, identity.AuditLogin, "session",
		&session.ID, nil, map[string]any{"email": user.Email, "ip": ip, "method": "login_code"}, nil, nil)
	return raw, user, roles, nil
}

func generateLoginCode() (string, error) {
	max := big.NewInt(int64(1e6))
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%0*d", loginCodeLength, n.Int64()), nil
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'internal\service\auth_magiclink.go'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote internal/service/auth_magiclink.go'

New-Item -ItemType Directory -Force -Path 'client\components\dashboard' | Out-Null
$content = @'
// PageHeader — navy photo band. Keep titles short; the photo is the texture.

export function PageHeader({
  eyebrow,
  title,
  subline,
  actions,
  cover = "/hero/programmes.jpg",
}: {
  eyebrow: string;
  title: string;
  subline?: string;
  actions?: React.ReactNode;
  cover?: string;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl bg-brand-navy bg-cover bg-center px-6 py-7 shadow-card md:px-8 md:py-8"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(6,15,38,0.62) 0%, rgba(1,57,32,0.82) 100%), url("${cover}")`,
      }}
    >
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">{eyebrow}</p>
        <h1 className="mt-1.5 font-display text-3xl tracking-[0.02em] text-white md:text-4xl">{title}</h1>
        {subline ? <p className="mt-1.5 max-w-xl text-sm text-white/80">{subline}</p> : null}
        {actions ? <div className="mt-4 flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\components\dashboard\PageHeader.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/components/dashboard/PageHeader.tsx'

New-Item -ItemType Directory -Force -Path 'client\components\layout' | Out-Null
$content = @'
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { unreadCount } from "@/features/messaging/api";
import { cn } from "@/lib/utils";
import { APP_NAV, type AppShellVariant, variantForRoles } from "@/lib/app-nav";
import { LogoutDialog } from "@/components/layout/LogoutDialog";

// AppShell — one chrome system, four role layouts. Sidebar + top bar +
// content. Marketing header stays off these routes (ShellVisibility).

export function AppShell({
  children,
  variant: forced,
}: {
  children: React.ReactNode;
  variant?: AppShellVariant;
}) {
  const { user, isLoading } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const variant = forced ?? variantForRoles(user?.roles ?? []);
  const spec = APP_NAV[variant];

  const unread = useQuery({
    queryKey: ["unread-count"],
    queryFn: unreadCount,
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unreadN = unread.data ?? 0;
  const greeting = user?.first_name?.trim() || user?.email?.split("@")[0] || "there";

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label={`${spec.title} navigation`}>
      <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">{spec.title}</p>
      {spec.items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-brand-gold text-ink-900" : "text-ink-700 hover:bg-ink-100"
            )}
          >
            <Icon size={16} className={active ? "text-ink-900" : "text-brand-navy"} />
            {item.label}
            {item.href === "/notifications" && unreadN > 0 && (
              <span className="ml-auto rounded-full bg-brand-navy px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadN}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div
      className="min-h-screen bg-surface-muted bg-cover bg-fixed bg-center dark:bg-[#07140e]"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(255,247,228,0.92) 0%, rgba(248,235,207,0.94) 100%), url(/hero/about.jpg)",
      }}
    >
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur dark:border-[#214c37] dark:bg-[#0d1f16]/95">
        <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 text-ink-700 lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link href={spec.home} className="font-display text-lg font-bold tracking-[0.1em] text-brand-navy">
              NUVORA
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/notifications"
              className="relative rounded-lg border border-ink-200 p-2.5 text-ink-600 hover:bg-ink-50"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadN > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gold px-1 text-[10px] font-bold text-ink-900">
                  {unreadN}
                </span>
              )}
            </Link>
            <Link
              href="/account"
              className="flex items-center gap-2 rounded-full border border-ink-200 py-1.5 pl-1.5 pr-3 text-sm font-bold text-ink-800 hover:bg-ink-50 sm:pr-4"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-navy text-xs font-extrabold text-white">
                {greeting.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[140px] truncate sm:block">{isLoading ? "…" : greeting}</span>
            </Link>
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              aria-label="Log out"
              title="Log out"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1400px] lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-ink-100 bg-white p-4 lg:block">{nav}</aside>

        {open && (
          <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true">
            <button type="button" className="absolute inset-0 bg-ink-900/40" aria-label="Close menu" onClick={() => setOpen(false)} />
            <aside className="absolute left-0 top-16 h-[calc(100vh-4rem)] w-[min(280px,88vw)] overflow-y-auto bg-white p-4 shadow-lift">
              {nav}
            </aside>
          </div>
        )}

        <div className="min-w-0">{children}</div>
      </div>
      <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </div>
  );
}

export function RoleAwareShell({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\components\layout\AppShell.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/components/layout/AppShell.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\account' | Out-Null
$content = @'
"use client";

import Link from "next/link";
import { loginWithReturn } from "@/lib/safe-next";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { PasswordInput, INPUT_CLS } from "@/components/ui/password-input";
import { useSession } from "@/hooks/useSession";
import { homeForRoles } from "@/hooks/useDashboardRoute";
import { changePassword, logout } from "@/features/auth/api";
import { clearOnboardingDraft } from "@/lib/onboarding";
import {
  listDevices,
  removeDevice,
  type Device,
} from "@/features/account/api";
import { ReferralCard } from "@/features/referrals/ReferralCard";
import { listLearners, type Learner } from "@/features/onboarding/api";
import { Camera, UserPlus } from "lucide-react";

// /account — settings hub (P0): profile, security, devices, preferences,
// data export + deletion.

type Profile = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  timezone: string;
  status: string;
};

const ALL_TABS = ["Profile", "Learners", "Referrals", "Security", "Devices", "Preferences", "Data"] as const;
type Tab = (typeof ALL_TABS)[number];

function tabsForRoles(roles: string[]): readonly Tab[] {
  if (roles.includes("PARENT")) return ALL_TABS;
  return ["Profile", "Security", "Devices", "Preferences", "Data"];
}

export default function AccountPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, isLoading } = useSession();
  const tabs = tabsForRoles(user?.roles ?? []);
  const [tab, setTab] = useState<Tab>("Profile");
  const dashHome = homeForRoles(user?.roles ?? []);

  useEffect(() => {
    if (!isLoading && !user) router.replace(loginWithReturn());
  }, [isLoading, user, router]);

  const devices = useQuery({ queryKey: ["account", "devices"], queryFn: listDevices });
  const learners = useQuery({ queryKey: ["onboarding", "learners"], queryFn: listLearners, enabled: !!user, staleTime: 30_000 });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/v1/me/avatar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Avatar upload failed");
      }
      const data = await res.json();
      qc.setQueryData(["session"], (old2: unknown) => ({ ...(old2 as object), avatar_url: data.data?.avatar_url }));
      toast.success("Profile photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Profile form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
      setPhone(user.phone ?? "");
      setTimezone(user.timezone || "Africa/Lagos");
    }
  }, [user]);

  // Preferences (client-side; documented in the privacy policy)
  const PREFS_KEY = "nuvora-email-prefs";
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setPrefs(JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}"));
    } catch {
      setPrefs({});
    }
  }, []);

  const saveProfile = useMutation({
    mutationFn: () =>
      apiFetch<Profile>("/auth/me/profile", {
        method: "PUT",
        body: JSON.stringify({ first_name: firstName, last_name: lastName, phone, timezone }),
      }),
    onSuccess: (res) => {
      qc.setQueryData(["session"], (old: unknown) => ({ ...(old as object), ...res.data }));
      toast.success("Profile saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save profile"),
  });

  const savePassword = useMutation({
    mutationFn: (pw: string) => changePassword(pw),
    onSuccess: () => {
      toast.success("Password updated");
      setNewPw("");
      setNewPw2("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update password"),
  });
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");

  const removeDev = useMutation({
    mutationFn: (id: string) => removeDevice(id),
    onSuccess: () => {
      toast.success("Device removed");
      qc.invalidateQueries({ queryKey: ["account", "devices"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove device"),
  });

  const doExport = async () => {
    try {
      const res = await fetch("/api/v1/auth/me/export", { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nuvora-export.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data export is downloading");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not export your data");
    }
  };

  const doDelete = useMutation({
    mutationFn: () => apiFetch<{ deleted: boolean }>("/auth/me/delete", { method: "POST" }),
    onSuccess: async () => {
      await logout();
      clearOnboardingDraft();
      toast.success("Your account has been deleted");
      qc.clear();
      router.replace("/");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete your account"),
  });
  const [confirmDelete, setConfirmDelete] = useState("");

  const togglePref = (key: string) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  if (isLoading || !user) return <p className="py-24 text-center text-ink-400">Loading…</p>;

  return (
    <main className="min-h-screen bg-[#FFF7E4] pb-16">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            <Link href="/dashboard" className="hover:text-brand-gold-dark">Dashboard</Link> / Account
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[0.02em] text-brand-navy">Account settings</h1>
          <p className="mt-1 text-sm text-ink-500">
            {user.email}
            {user.first_name ? ` · ${user.first_name} ${user.last_name ?? ""}` : ""}
          </p>
        </div>
      </header>

      <div className="mx-auto mt-6 grid max-w-5xl gap-6 px-6 lg:grid-cols-[220px_1fr]">
        {/* Tabs */}
        <aside className="h-fit rounded-2xl border border-ink-100 bg-white p-3 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold",
                tab === t ? "bg-brand-gold text-ink-900" : "text-ink-600 hover:bg-ink-50"
              )}
            >
              {t}
            </button>
          ))}
        </aside>

        <div className="space-y-6">
          {tab === "Profile" && (
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-navy">Profile</h2>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt="Your profile" className="size-20 rounded-full object-cover ring-2 ring-brand-gold" />
                  ) : (
                    <div className="grid size-20 place-items-center rounded-full bg-brand-navy text-2xl font-bold text-white">
                      {(user.first_name?.[0] ?? user.email[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 grid size-8 cursor-pointer place-items-center rounded-full bg-brand-gold text-ink-900 shadow-md transition-transform hover:scale-105" title="Upload photo">
                    <Camera size={15} />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingAvatar}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadAvatar(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="text-sm text-ink-500">
                  <p className="font-semibold text-ink-800">{uploadingAvatar ? "Uploading…" : "Profile photo"}</p>
                  <p>JPEG, PNG or WebP · up to 10 MB</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ac-first" className="mb-1.5 block text-sm font-medium text-ink-800">First name</label>
                  <input id="ac-first" type="text" autoComplete="given-name" className={INPUT_CLS} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="ac-last" className="mb-1.5 block text-sm font-medium text-ink-800">Last name</label>
                  <input id="ac-last" type="text" autoComplete="family-name" className={INPUT_CLS} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="ac-phone" className="mb-1.5 block text-sm font-medium text-ink-800">Phone</label>
                  <input id="ac-phone" type="tel" autoComplete="tel" className={INPUT_CLS} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="ac-tz" className="mb-1.5 block text-sm font-medium text-ink-800">Timezone</label>
                  <select id="ac-tz" className={INPUT_CLS} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    {["Africa/Lagos", "Africa/Accra", "Africa/Nairobi", "Africa/Cairo", "Europe/London", "America/New_York", "UTC"].map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => saveProfile.mutate()}
                disabled={saveProfile.isPending}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand-gold px-6 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-50"
              >
                {saveProfile.isPending ? "Saving…" : "Save changes"}
              </button>
            </section>
          )}

          {tab === "Learners" && (
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-navy">Learners</h2>
              <p className="mt-1 text-sm text-ink-500">Learners linked to your account (you book for them).</p>
              <ul className="mt-4 space-y-2">
                {(learners.data ?? []).map((l: Learner) => (
                  <li key={l.id} className="flex items-center justify-between rounded-xl border border-ink-100 bg-surface-muted px-4 py-3">
                    <div>
                      <p className="font-semibold text-ink-800">{l.first_name} {l.last_name}</p>
                      <p className="text-xs text-ink-500">{l.current_level || "Level not set"}{l.school_name ? ` · ${l.school_name}` : ""}</p>
                    </div>
                  </li>
                ))}
                {(learners.data ?? []).length === 0 && (
                  <li className="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-500">
                    No learners yet — add one to book tuition.
                  </li>
                )}
              </ul>
              <Link href="/dashboard" className="mt-4 inline-flex items-center gap-2 rounded-full border border-ink-300 px-5 py-2.5 text-sm font-bold text-ink-800 transition-colors hover:border-brand-gold">
                <UserPlus size={15} /> Add a learner
              </Link>
            </section>
          )}

          {tab === "Referrals" && (
            <ReferralCard userId={user.id} />
          )}

          {tab === "Security" && (
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-navy">Change password</h2>
              <div className="mt-4 max-w-md space-y-4">
                <PasswordInput id="ac-pw" label="New password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                <PasswordInput id="ac-pw2" label="Confirm new password" autoComplete="new-password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
                {newPw2 && newPw !== newPw2 && <p className="text-xs text-red-600">Passwords do not match.</p>}
                <button
                  type="button"
                  disabled={savePassword.isPending || !newPw || newPw.length < 8 || newPw !== newPw2}
                  onClick={() => savePassword.mutate(newPw)}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-gold px-6 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40"
                >
                  {savePassword.isPending ? "Updating…" : "Update password"}
                </button>
              </div>
            </section>
          )}

          {tab === "Devices" && (
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-navy">Push devices</h2>
              <p className="mt-1 text-sm text-ink-500">Devices that receive notifications from NUVORA.</p>
              <div className="mt-4 space-y-2">
                {(devices.data ?? []).map((d: Device) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{d.platform === "ios" ? "🍎" : d.platform === "android" ? "🤖" : "🌐"}</span>
                      <div>
                        <p className="text-sm font-semibold text-ink-800">{d.platform} · v{d.app_version ?? "?"}</p>
                        <p className="text-xs text-ink-400">{d.token.slice(0, 24)}… · last seen {new Date(d.last_seen_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDev.mutate(d.id)}
                      className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:border-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {(devices.data ?? []).length === 0 && (
                  <p className="rounded-xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-500">
                    No devices registered yet — install the app or allow notifications to see them here.
                  </p>
                )}
              </div>
            </section>
          )}

          {tab === "Preferences" && (
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-navy">Email preferences</h2>
              <p className="mt-1 text-sm text-ink-500">Stored on this device for now — server-side preferences ship with the notification centre.</p>
              <div className="mt-4 space-y-3">
                {[
                  ["booking", "Booking confirmations & payment receipts"],
                  ["progress", "Progress reports & tutor feedback"],
                  ["promo", "Programme offers & study tips"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3 text-sm">
                    <span className="font-medium text-ink-700">{label}</span>
                    <input
                      type="checkbox"
                      checked={prefs[key] ?? true}
                      onChange={() => togglePref(key)}
                      className="size-4 accent-[#70F250]"
                    />
                  </label>
                ))}
              </div>
            </section>
          )}

          {tab === "Data" && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-brand-navy">Export your data</h2>
                <p className="mt-1 text-sm leading-6 text-ink-500">
                  Download everything we hold on your account: profile, roles, learners, devices and chat
                  history — as a JSON file. This fulfils the export right in our{" "}
                  <Link href="/privacy" className="font-semibold text-brand-gold-dark hover:underline">privacy policy</Link>.
                </p>
                <button
                  type="button"
                  onClick={() => void doExport()}
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-brand-navy px-6 text-sm font-bold text-white hover:bg-brand-navy/90"
                >
                  ⬇ Download my data
                </button>
              </section>

              <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
                <h2 className="text-lg font-bold text-red-700">Delete your account</h2>
                <p className="mt-1 text-sm leading-6 text-red-600/80">
                  This permanently deletes your sign-in access, push devices and active sessions. Learners
                  linked to you remain in the system for administrative records until purged. This cannot be
                  undone — consider exporting your data first.
                </p>
                <div className="mt-4 flex max-w-md gap-2">
                  <input
                    type="text"
                    placeholder="Type DELETE to confirm"
                    className={cn(INPUT_CLS, "bg-white")}
                    value={confirmDelete}
                    onChange={(e) => setConfirmDelete(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={confirmDelete !== "DELETE" || doDelete.isPending}
                    onClick={() => doDelete.mutate()}
                    className="shrink-0 rounded-lg bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40"
                  >
                    {doDelete.isPending ? "Deleting…" : "Delete account"}
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\account\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/account/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\student-dashboard' | Out-Null
$content = @'
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  listMyAssignments,
  listMySubmissions,
  submitAssignment,
  getAttendanceSummary,
} from "@/features/portal/api";
import { StudentQuizzes } from "@/features/learning/StudentQuizzes";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { RecommendationsForYou } from "@/components/dashboard/RecommendationsForYou";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { LineChart, FileText, CheckCircle2 } from "lucide-react";

// Student portal (working-doc §9): side nav, Today panel, progress,
// assignments with submission, resources, announcements, support.

type Lesson = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  meeting_url?: string;
  status: string;
};

type Cohort = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
};

const SECTIONS = ["Overview", "My Classes", "Calendar", "Assignments", "Quizzes", "Progress"] as const;
type Section = (typeof SECTIONS)[number];

export default function StudentDashboardPage() {
  const qc = useQueryClient();
  // G1: the learner profile resolves from the session server-side.
  const { user } = useSession();
  const [section, setSection] = useState<Section>("Overview");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const lessons = useQuery({
    queryKey: ["student", "lessons"],
    queryFn: async () => {
      const res = await apiFetch<Lesson[]>("/me/lessons");
      return res.data ?? [];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const assignments = useQuery({
    queryKey: ["student", "assignments"],
    queryFn: () => listMyAssignments(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const submissions = useQuery({
    queryKey: ["student", "submissions"],
    queryFn: () => listMySubmissions(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const attendance = useQuery({
    queryKey: ["student", "attendance"],
    queryFn: () => getAttendanceSummary(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const submit = useMutation({
    mutationFn: ({ assignmentId, content }: { assignmentId: string; content: string }) =>
      submitAssignment(undefined, assignmentId, content),
    onSuccess: () => {
      toast.success("Assignment submitted!");
      qc.invalidateQueries({ queryKey: ["student", "assignments"] });
      qc.invalidateQueries({ queryKey: ["student", "submissions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not submit"),
  });

  const upcoming = (lessons.data ?? []).filter((l) => l.status === "SCHEDULED" || l.status === "ONGOING");
  const past = (lessons.data ?? []).filter((l) => l.status === "COMPLETED" || l.status === "NO_SHOW");
  const submittedIds = new Set((submissions.data ?? []).map((s) => s.assignment_id));

  return (
    <main className="px-4 py-8 md:px-8">
      <RoleGate page="/student-dashboard" />
      <RecommendationsForYou />
      <PageHeader eyebrow="Student" title="Home" cover="/hero/exam-prep.jpg" />

      <div className="mt-6 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              section === s ? "bg-brand-gold text-ink-900" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <div>
          {section === "Overview" && (
            <div className="space-y-6">
              {/* KPI snapshot */}
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Attendance" value={attendance.data ? `${attendance.data.rate.toFixed(0)}%` : "–"} hint={`${attendance.data?.present ?? 0} present of ${attendance.data?.total ?? 0}`} icon={<LineChart size={18} />} />
                <StatCard label="Assignments" value={`${submittedIds.size}/${assignments.data?.length ?? 0}`} hint="submitted" icon={<FileText size={18} />} />
                <StatCard label="Done" value={past.length} hint="lessons" icon={<CheckCircle2 size={18} />} />
              </div>

              {/* Today */}
              <section className="rounded-2xl bg-brand-blue text-white p-6">
                <h2 className="font-bold text-white">Today</h2>
                {lessons.isLoading ? (
                  <Skeleton className="h-12 w-full mt-3 bg-white/20" />
                ) : upcoming.length === 0 ? (
                  <p className="mt-3 text-sm text-white/80">No lessons scheduled for today.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {upcoming.slice(0, 4).map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/10 px-5 py-3">
                        <div>
                          <div className="font-semibold">{l.title}</div>
                          <div className="text-xs text-white/70">
                            {new Date(l.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                          </div>
                        </div>
                        {l.meeting_url ? (
                          <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-white text-brand-blue font-bold text-sm px-5 py-2.5">
                            Join class
                          </a>
                        ) : (
                          <span className="text-xs text-white/60">Link opens at lesson time</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Recent tutor feedback / notes */}
              <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
                <h2 className="font-bold">Recent</h2>
                {past.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-500">No completed lessons yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-ink-100">
                    {past.slice(0, 5).map((l) => (
                      <li key={l.id} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="text-sm font-semibold">{l.title}</div>
                          <div className="text-xs text-ink-500">{new Date(l.start_at).toLocaleDateString()}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-ink-100 text-ink-500">{l.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {section === "My Classes" && (
            <section className="border rounded-2xl p-6">
              <h2 className="font-bold text-lg">Classes</h2>
              {lessons.isLoading ? (
                <Skeleton className="h-20 w-full mt-3" />
              ) : (lessons.data?.length ?? 0) === 0 ? (
                <p className="mt-4 text-sm text-ink-500 border border-dashed border-ink-200 rounded-xl p-8 text-center">
                  No lessons yet — join a cohort to get started.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {(lessons.data ?? []).slice(0, 20).map((l) => (
                    <li key={l.id} className="border rounded-xl p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm">{l.title}</div>
                        <div className="text-xs text-ink-500">
                          {new Date(l.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                        </div>
                      </div>
                      {l.meeting_url ? (
                        <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-brand-blue text-white text-sm font-bold px-4 py-2">Join</a>
                      ) : (
                        <span className="text-xs text-ink-400">{l.status}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {section === "Calendar" && (
            <section className="border rounded-2xl p-6">
              <h2 className="font-bold text-lg">Calendar</h2>
              {lessons.isLoading ? (
                <Skeleton className="h-20 w-full mt-3" />
              ) : (lessons.data?.length ?? 0) === 0 ? (
                <p className="mt-4 text-sm text-ink-500">Nothing scheduled yet.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {groupByDate(lessons.data ?? []).map(([date, items]) => (
                    <div key={date}>
                      <h3 className="text-sm font-bold text-brand-blue">{date}</h3>
                      <ul className="mt-2 space-y-2">
                        {items.map((l) => (
                          <li key={l.id} className="border rounded-xl px-4 py-3 text-sm flex justify-between">
                            <span className="font-semibold">{l.title}</span>
                            <span className="text-xs text-ink-500">{new Date(l.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {l.timezone}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {section === "Assignments" && (
            <section className="border rounded-2xl p-6">
              <h2 className="font-bold text-lg">Assignments</h2>
              {assignments.isLoading ? (
                <Skeleton className="h-20 w-full mt-3" />
              ) : (assignments.data?.length ?? 0) === 0 ? (
                <p className="mt-4 text-sm text-ink-500">No assignments yet.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {assignments.data?.map((a) => {
                    const done = submittedIds.has(a.id);
                    return (
                      <li key={a.id} className="border rounded-xl p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <div className="font-semibold text-sm">{a.title}</div>
                            {a.instructions && <p className="text-xs text-ink-500 mt-1">{a.instructions}</p>}
                            <p className="text-[10px] text-ink-400 mt-1">
                              {a.due_at ? `Due ${new Date(a.due_at).toLocaleDateString()}` : "No due date"}
                              {a.max_score ? ` · max ${a.max_score} pts` : ""}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {done ? "Submitted" : "Pending"}
                          </span>
                        </div>
                        {!done && (
                          <div className="mt-3 flex gap-2">
                            <textarea
                              rows={2}
                              value={drafts[a.id] ?? ""}
                              onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                              placeholder="Write your answer…"
                              className="flex-1 rounded-xl border border-ink-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
                            />
                            <Button size="sm" disabled={submit.isPending || !(drafts[a.id] ?? "").trim()}
                              onClick={() => submit.mutate({ assignmentId: a.id, content: drafts[a.id] ?? "" })}>
                              Submit
                            </Button>
                          </div>
                        )}
                        {done && submissions.data?.find((s) => s.assignment_id === a.id)?.feedback && (
                          <p className="mt-2 text-xs text-green-700">Feedback: {submissions.data.find((s) => s.assignment_id === a.id)?.feedback}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {section === "Quizzes" && (
            <section className="border rounded-2xl p-6">
              <StudentQuizzes />
            </section>
          )}

          {section === "Progress" && (
            <section className="border rounded-2xl p-6">
              <h2 className="font-bold text-lg">Progress</h2>
              {attendance.data ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex justify-between text-sm"><span className="text-ink-600">Attendance</span><span className="font-bold">{attendance.data.rate.toFixed(1)}%</span></div>
                    <div className="mt-1 h-2 rounded-full bg-ink-100"><div className="h-2 rounded-full bg-brand-blue" style={{ width: `${attendance.data.rate}%` }} /></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                    <div className="rounded-xl bg-green-50 p-3"><div className="text-xl font-extrabold text-green-700">{attendance.data.present}</div><div className="text-[10px] text-ink-500">Present</div></div>
                    <div className="rounded-xl bg-red-50 p-3"><div className="text-xl font-extrabold text-red-700">{attendance.data.absent}</div><div className="text-[10px] text-ink-500">Absent</div></div>
                    <div className="rounded-xl bg-amber-50 p-3"><div className="text-xl font-extrabold text-amber-700">{attendance.data.late}</div><div className="text-[10px] text-ink-500">Late</div></div>
                    <div className="rounded-xl bg-ink-50 p-3"><div className="text-xl font-extrabold text-ink-600">{attendance.data.untracked}</div><div className="text-[10px] text-ink-500">Untracked</div></div>
                  </div>
                  <p className="text-xs text-ink-400">Attendance and assignment progress update after each lesson. Term reports arrive with the gradebook phase.</p>
                </div>
              ) : (
                <Skeleton className="h-24 w-full mt-3" />
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function groupByDate(lessons: Lesson[]): [string, Lesson[]][] {
  const map = new Map<string, Lesson[]>();
  [...lessons]
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .forEach((l) => {
      const key = new Date(l.start_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
      map.set(key, [...(map.get(key) ?? []), l]);
    });
  return [...map.entries()];
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\student-dashboard\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/student-dashboard/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\tutor-dashboard' | Out-Null
$content = @'
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { RecommendationsForYou } from "@/components/dashboard/RecommendationsForYou";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { getMyProfile } from "@/features/vetting/api";
import { getTutorEarnings } from "@/features/lms/api";
import { BookOpen, MessageSquare, Bell, LifeBuoy, Settings, Wallet, CalendarDays, ClipboardCheck, Users, NotebookPen } from "lucide-react";
import { TutorGradebook, TutorProgressReports } from "@/features/learning/TutorLearning";
import { listAvailability, upsertAvailability, deleteAvailability } from "@/features/portal/api";
import { PageHeader } from "@/components/dashboard/PageHeader";

// Tutor portal — tabbed workspace: Overview (KPIs + status + today) ·
// Lessons (upcoming, attendance, notes) · Availability · Earnings · Profile
// (application + gradebook + reports).

type Lesson = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  meeting_url?: string;
  status: string;
  cohort_id?: string;
};

type AttendanceRow = { id: string; lesson_id: string; student_profile_id: string; status: string; marked_at: string };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-ink-100 text-ink-600",
  SUBMITTED: "bg-amber-100 text-amber-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  INTERVIEW: "bg-blue-100 text-blue-700",
  VERIFICATION: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-red-100 text-red-700",
  HOLD: "bg-ink-100 text-ink-600",
};

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "lessons", label: "Lessons" },
  { key: "availability", label: "Availability" },
  { key: "earnings", label: "Earnings" },
  { key: "profile", label: "Profile" },
] as const;

export default function TutorDashboardPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("overview");
  const [newSlot, setNewSlot] = useState({ day_of_week: 1, start_time: "16:00", end_time: "17:00" });

  const profile = useQuery({
    queryKey: ["vetting", "me", user?.id],
    queryFn: () => getMyProfile(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const lessons = useQuery({
    queryKey: ["tutor", "lessons"],
    queryFn: async () => {
      const res = await apiFetch<Lesson[]>("/me/tutor-lessons");
      return res.data ?? [];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const attendance = useQuery({
    queryKey: ["tutor", "attendance"],
    queryFn: async () => {
      const res = await apiFetch<AttendanceRow[]>(`/lessons/${lessons.data?.[0]?.id}/attendance`);
      return res.data ?? [];
    },
    enabled: (lessons.data?.length ?? 0) > 0,
    staleTime: 15_000,
  });

  const availability = useQuery({
    queryKey: ["tutor", "availability"],
    queryFn: () => listAvailability(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const earnings = useQuery({
    queryKey: ["tutor", "earnings"],
    queryFn: () => getTutorEarnings(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const addSlot = useMutation({
    mutationFn: () =>
      upsertAvailability({
        day_of_week: newSlot.day_of_week,
        start_time: newSlot.start_time,
        end_time: newSlot.end_time,
        is_recurring: true,
      }),
    onSuccess: () => {
      toast.success("Availability slot added");
      qc.invalidateQueries({ queryKey: ["tutor", "availability"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add slot"),
  });

  const removeSlot = useMutation({
    mutationFn: (id: string) => deleteAvailability(id),
    onSuccess: () => {
      toast.success("Slot removed");
      qc.invalidateQueries({ queryKey: ["tutor", "availability"] });
    },
  });

  const p = profile.data;
  const today = (lessons.data ?? []).filter((l) => l.status === "SCHEDULED" || l.status === "ONGOING");
  const recent = (lessons.data ?? []).filter((l) => l.status === "COMPLETED" || l.status === "NO_SHOW");
  const upcoming = today
    .slice()
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  const profileCompletion = p ? Math.min(100, 40 + (p.bio ? 20 : 0) + (p.headline ? 10 : 0) + ((p.hourly_rate_min ?? 0) > 0 ? 15 : 0) + (p.accepts_online || p.accepts_in_person ? 15 : 0)) : 0;

  const quickLinks = [
    { href: "/lms/tutor", label: "Teach", desc: "Roster", icon: BookOpen },
    { href: "/messages", label: "Inbox", desc: "Chat", icon: MessageSquare },
    { href: "/notifications", label: "Alerts", desc: "Reminders", icon: Bell },
    { href: "/contact", label: "Help", desc: "Support", icon: LifeBuoy },
    { href: "/account", label: "Account", desc: "Profile", icon: Settings },
  ];

  return (
    <main className="px-4 py-8 md:px-8">
      <RoleGate page="/tutor-dashboard" />
      <RecommendationsForYou />
      <PageHeader
        eyebrow="Tutor"
        title="Home"
        cover="/hero/how-it-works.jpg"
        actions={
          <Link
            href="/lms/tutor"
            className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-5 py-2.5 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover"
          >
            <BookOpen size={15} /> Teach
          </Link>
        }
      />

      <div className="mt-6">
        <DashboardTabs
          tabs={TABS.map((t) => ({
            key: t.key,
            label: t.label,
            count: t.key === "lessons" ? today.length : t.key === "availability" ? availability.data?.length : undefined,
          }))}
          active={tab}
          onChange={(k) => setTab(k as (typeof TABS)[number]["key"])}
        />
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Upcoming" value={today.length} hint="lessons" icon={<CalendarDays size={18} />} />
            <StatCard label="Held (escrow)" value={`₦${(earnings.data?.held_total ?? 0).toLocaleString()}`} hint="awaiting delivery" icon={<Wallet size={18} />} />
            <StatCard label="Released" value={`₦${(earnings.data?.released_total ?? 0).toLocaleString()}`} hint="awaiting payout" icon={<ClipboardCheck size={18} />} />
            <StatCard label="Paid out" value={`₦${(earnings.data?.paid_total ?? 0).toLocaleString()}`} hint="total earnings" icon={<Wallet size={18} />} />
          </div>

          {/* Application status */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-ink-800">Application</h2>
                {p ? (
                  <>
                    <p className="text-sm text-ink-600 mt-1">{p.display_name} · {p.slug}</p>
                    <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[p.status] ?? "bg-ink-100"}`}>{p.status}</span>
                  </>
                ) : (
                  <p className="text-sm text-ink-500 mt-1">You haven&apos;t started your application yet.</p>
                )}
              </div>
              <Link href={p ? "/become-tutor/status" : "/become-tutor/apply"} className="btn-gold text-sm">
                {p ? "View application" : "Start application"}
              </Link>
            </div>
            {p && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-ink-500"><span>Profile completion</span><span>{profileCompletion}%</span></div>
                <div className="mt-1 h-2 rounded-full bg-ink-100"><div className="h-2 rounded-full bg-brand-blue" style={{ width: `${profileCompletion}%` }} /></div>
              </div>
            )}
          </section>

          {/* Today's lessons */}
          <section className="rounded-2xl bg-brand-gold text-ink-900 p-6">
            <h2 className="font-bold text-ink-900">Today</h2>
            {lessons.isLoading ? (
              <Skeleton className="h-12 w-full mt-3 bg-white/20" />
            ) : today.length === 0 ? (
              <p className="mt-3 text-sm text-ink-800/70">No lessons today.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {upcoming.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/10 px-5 py-3">
                    <div>
                      <div className="font-semibold">{l.title}</div>
                      <div className="text-xs text-ink-800/70">
                        {new Date(l.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(l.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                      </div>
                    </div>
                    {l.meeting_url && (
                      <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-white text-brand-blue text-sm font-bold px-4 py-2">Join class</a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Quick links */}
          <section>
            <h2 className="font-display text-lg tracking-[0.02em] text-brand-navy">Links</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {quickLinks.map((q) => (
                <Link key={q.href} href={q.href} className="group flex flex-col items-start gap-2 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand-gold">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-gold-light text-brand-green">
                    <q.icon size={17} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-brand-navy">{q.label}</span>
                    <span className="block text-xs text-ink-500">{q.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── Lessons ── */}
      {tab === "lessons" && (
        <div className="mt-6 space-y-6">
          {/* Attendance to complete */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="flex items-center gap-2 font-bold text-ink-800"><Users size={16} className="text-brand-green" /> Attendance to complete</h2>
            {recent.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">No completed lessons awaiting attendance.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {recent.slice(0, 5).map((l) => (
                  <li key={l.id} className="border rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-sm">{l.title}</div>
                        <div className="text-xs text-ink-500">{new Date(l.start_at).toLocaleDateString()}</div>
                      </div>
                      <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Mark attendance</span>
                    </div>
                    <Link href="/lms/tutor" className="mt-3 inline-flex items-center rounded-full border border-ink-200 px-4 py-1.5 text-xs font-semibold hover:border-brand-blue transition-colors">
                      Open roster to mark attendance →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Lesson notes */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="flex items-center gap-2 font-bold text-ink-800"><NotebookPen size={16} className="text-brand-green" /> Lesson notes &amp; homework</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Write lesson notes and homework after each session — parents see them in their portal.
            </p>
            <Link href="/lms/tutor" className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-brand-blue transition-colors hover:border-brand-blue">
              Open the teaching console <BookOpen size={13} />
            </Link>
          </section>

          {/* All lessons */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-bold text-ink-800">All lessons</h2>
            {lessons.isLoading ? (
              <Skeleton className="mt-3 h-20 w-full" />
            ) : (lessons.data?.length ?? 0) === 0 ? (
              <EmptyState icon={<CalendarDays size={20} />} title="No lessons yet" description="Lessons appear once a learner books you." />
            ) : (
              <ul className="mt-4 divide-y divide-ink-100">
                {(lessons.data ?? [])
                  .slice()
                  .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())
                  .map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-bold text-ink-800">{l.title}</p>
                        <p className="text-xs text-ink-500">
                          {new Date(l.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge label={l.status} kind={statusKindFor(l.status)} />
                        {l.meeting_url && (l.status === "SCHEDULED" || l.status === "ONGOING") && (
                          <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-bold text-white hover:bg-brand-blue-dark transition-colors">Join</a>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ── Availability ── */}
      {tab === "availability" && (
        <div className="mt-6 grid lg:grid-cols-[1fr_1.2fr] gap-6 items-start">
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-bold text-ink-800">Add a weekly slot</h2>
            <p className="text-xs text-ink-500 mt-1">Set recurring weekly windows learners can book.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <select value={newSlot.day_of_week} onChange={(e) => setNewSlot({ ...newSlot, day_of_week: Number(e.target.value) })}
                className="rounded-xl border border-ink-200 px-2 py-2 text-sm">
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
              <input type="time" value={newSlot.start_time} onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                className="rounded-xl border border-ink-200 px-2 py-2 text-sm" />
              <span className="self-center text-xs text-ink-400">–</span>
              <input type="time" value={newSlot.end_time} onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                className="rounded-xl border border-ink-200 px-2 py-2 text-sm" />
            </div>
            <Button size="sm" className="mt-3 w-full" disabled={addSlot.isPending} onClick={() => addSlot.mutate()}>
              {addSlot.isPending ? "Adding…" : "+ Add slot"}
            </Button>
          </section>

          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-bold text-ink-800">Current availability</h2>
            {availability.isLoading ? (
              <Skeleton className="mt-3 h-16 w-full" />
            ) : (availability.data?.length ?? 0) === 0 ? (
              <EmptyState icon={<CalendarDays size={20} />} title="No availability set" description="Add a weekly window so learners can book you." />
            ) : (
              <ul className="mt-3 space-y-1.5">
                {availability.data?.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm border-b border-ink-100 pb-1.5">
                    <span className="font-semibold text-ink-700">{DAYS[a.day_of_week]} · {a.start_time}–{a.end_time}</span>
                    <button onClick={() => removeSlot.mutate(a.id)} className="text-xs text-red-600 hover:underline">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ── Earnings ── */}
      {tab === "earnings" && (
        <section className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-brand-navy">
              <Wallet size={16} className="text-brand-green" /> Earnings
            </h2>
            <span className="rounded-full bg-brand-gold-light px-3 py-1 text-xs font-bold text-brand-navy">Escrow-protected</span>
          </div>
          <p className="mt-1 text-xs text-ink-500">Held until lessons are confirmed, then paid out on the weekly schedule.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-surface-muted p-3">
              <div className="text-lg font-extrabold text-brand-navy">₦{(earnings.data?.held_total ?? 0).toLocaleString()}</div>
              <div className="text-[10px] font-semibold text-ink-500">Held</div>
            </div>
            <div className="rounded-xl bg-surface-muted p-3">
              <div className="text-lg font-extrabold text-brand-navy">₦{(earnings.data?.released_total ?? 0).toLocaleString()}</div>
              <div className="text-[10px] font-semibold text-ink-500">Released</div>
            </div>
            <div className="rounded-xl bg-brand-gold-light p-3">
              <div className="text-lg font-extrabold text-brand-green">₦{(earnings.data?.paid_total ?? 0).toLocaleString()}</div>
              <div className="text-[10px] font-semibold text-ink-600">Paid out</div>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-bold text-ink-700">Recent payouts</p>
            {(earnings.data?.payouts ?? []).length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-ink-200 p-4 text-center text-xs text-ink-400">
                No payouts yet — released earnings are paid out on the weekly schedule.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {(earnings.data?.payouts ?? []).slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-2.5 text-sm">
                    <span className="font-semibold text-ink-700">₦{p.amount.toLocaleString()}</span>
                    <span className="text-xs text-ink-400">
                      {new Date(p.created_at).toLocaleDateString()} ·{" "}
                      <span className={p.status === "PAID" ? "font-bold text-green-600" : "font-semibold text-ink-500"}>{p.status}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Profile ── */}
      {tab === "profile" && (
        <div className="mt-6 space-y-6">
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-ink-800">Application &amp; profile</h2>
                {p ? (
                  <p className="text-sm text-ink-600 mt-1">{p.display_name} · {p.slug} · <span className="font-semibold">{profileCompletion}% complete</span></p>
                ) : (
                  <p className="text-sm text-ink-500 mt-1">Start your application to appear in tutor search.</p>
                )}
              </div>
              <Link href={p ? "/become-tutor/status" : "/become-tutor/apply"} className="btn-gold text-sm">
                {p ? "View application" : "Start application"}
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <TutorGradebook />
          </section>

          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <TutorProgressReports />
          </section>
        </div>
      )}
    </main>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\tutor-dashboard\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/tutor-dashboard/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\dashboard' | Out-Null
$content = @'
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/ui/stat-card";
import {
  CalendarDays,
  ReceiptText,
  MessageSquareText,
  Wallet,
  LineChart,
  CreditCard,
  UserPlus,
  Settings,
  TrendingUp,
  AlertTriangle,
  Compass,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { unreadCount } from "@/features/messaging/api";
import { listProgressReports } from "@/features/learning/api";
import { createLearner, listLearners, type Learner } from "@/features/onboarding/api";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { RecommendationsForYou } from "@/components/dashboard/RecommendationsForYou";
import { getAttendanceSummary, getOrderReceipt, type OrderReceipt } from "@/features/portal/api";
import { PageHeader } from "@/components/dashboard/PageHeader";

// Parent portal — bookings-style family dashboard. Sidebar nav + sections:
// Overview (KPIs + next lesson) · Bookings (status-filtered lessons) ·
// Payments (orders + receipts) · Progress (attendance + reports) ·
// Learners (management).

type Order = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  checkout_cohort_id?: string; // resumable checkout (Batch 4)
};

type Lesson = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  meeting_url?: string;
  status: string;
};

const NAV = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { key: "bookings", label: "Bookings", icon: <CalendarDays size={16} /> },
  { key: "payments", label: "Payments", icon: <Wallet size={16} /> },
  { key: "progress", label: "Progress", icon: <LineChart size={16} /> },
  { key: "learners", label: "Learners", icon: <Users size={16} /> },
] as const;

const BOOKING_TABS = ["All", "Upcoming", "Completed", "Cancelled"] as const;

export default function ParentDashboardPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [selectedLearner, setSelectedLearner] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ first_name: "", last_name: "", current_level: "", school_name: "" });
  const [section, setSection] = useState<(typeof NAV)[number]["key"]>("overview");
  const [tab, setTab] = useState<(typeof BOOKING_TABS)[number]>("All");
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const learners = useQuery({
    queryKey: ["onboarding", "learners"],
    queryFn: listLearners,
    enabled: !!user,
    staleTime: 30_000,
  });

  const activeLearner: Learner | undefined = (learners.data ?? []).find((l) => l.id === selectedLearner) ?? (learners.data ?? [])[0];
  const learnerId = activeLearner?.id ?? "";

  const reports = useQuery({
    queryKey: ["dashboard", "reports", selectedLearner],
    queryFn: () => listProgressReports(selectedLearner || undefined),
    enabled: !!selectedLearner,
    staleTime: 60_000,
  });

  const orders = useQuery({
    queryKey: ["me", "orders"],
    queryFn: async () => {
      const res = await apiFetch<Order[]>("/me/orders");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  const lessons = useQuery({
    queryKey: ["parent", "lessons", learnerId],
    queryFn: async () => {
      const res = await apiFetch<Lesson[]>(`/me/lessons?student_profile_id=${learnerId}`);
      return res.data ?? [];
    },
    enabled: !!learnerId,
    staleTime: 30_000,
  });

  const attendance = useQuery({
    queryKey: ["parent", "attendance", learnerId],
    queryFn: () => getAttendanceSummary(learnerId),
    enabled: !!learnerId,
    staleTime: 30_000,
  });

  const unread = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => unreadCount(),
    enabled: !!user,
    staleTime: 15_000,
  });

  const openReceipt = async (orderId: string) => {
    setReceiptLoading(true);
    try {
      const r = await getOrderReceipt(orderId);
      setReceipt(r);
    } finally {
      setReceiptLoading(false);
    }
  };

  const all = lessons.data ?? [];
  const filtered = all.filter((l) => {
    if (tab === "Upcoming") return l.status === "SCHEDULED" || l.status === "ONGOING";
    if (tab === "Completed") return l.status === "COMPLETED";
    if (tab === "Cancelled") return l.status === "CANCELLED" || l.status === "NO_SHOW";
    return true;
  });

  const upcoming = all
    .filter((l) => l.status === "SCHEDULED" || l.status === "ONGOING")
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  const nextLesson = upcoming[0];
  const nextPayment = (orders.data ?? []).find((o) => o.status === "PENDING");
  const paidCount = (orders.data ?? []).filter((o) => o.status === "PAID").length;

  return (
    <main className="px-4 py-8 md:px-8">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {NAV.map((n) => (
              <button
                key={n.key}
                type="button"
                onClick={() => setSection(n.key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  section === n.key ? "bg-brand-gold text-ink-900" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
                }`}
              >
                {n.icon}
                {n.label}
              </button>
            ))}
          </div>
          <RoleGate page="/dashboard" />
          <RecommendationsForYou />

          <PageHeader
            eyebrow="Family"
            title="Home"
            cover="/hero/home-tutoring.jpg"
            actions={
              <label className="flex items-center gap-2 text-sm">
                <span className="text-[10px] font-bold uppercase tracking-wide text-white/60">Learner</span>
                <select
                  value={selectedLearner || activeLearner?.id || ""}
                  onChange={(e) => setSelectedLearner(e.target.value)}
                  className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/40 [&>option]:text-ink-900"
                >
                  {(learners.data ?? []).map((l) => (
                    <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                  ))}
                  {(learners.data ?? []).length === 0 && <option value="">Add a learner…</option>}
                </select>
              </label>
            }
          />

          {!learnerId && (
            <div className="rounded-2xl border border-brand-blue/20 bg-brand-blue-light/60 p-6 text-sm">
              <strong className="text-brand-navy">No learner linked yet.</strong>{" "}
              <span className="text-ink-600">Add your first learner to see schedules, attendance and progress.</span>{" "}
              <button type="button" onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5 font-semibold text-brand-blue hover:underline">
                <UserPlus size={15} /> Add a learner →
              </button>
            </div>
          )}

          {nextPayment && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <CreditCard size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-800">Payment pending — {nextPayment.order_number}</p>
                  <p className="text-xs text-ink-500">{nextPayment.currency} {nextPayment.total_amount.toLocaleString()} · completes your booking</p>
                </div>
              </div>
              <a href={nextPayment.checkout_cohort_id ? `/checkout/${nextPayment.checkout_cohort_id}` : "/cohorts"} className="rounded-xl bg-brand-gold px-6 py-3 text-sm font-bold text-brand-navy hover:bg-brand-gold-dark transition-colors">
                Complete payment
              </a>
            </div>
          )}

          {/* Section: Overview */}
          {section === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Upcoming" value={upcoming.length} hint="lessons" icon={<CalendarDays size={18} />} />
                <StatCard label="Learners" value={(learners.data ?? []).length} hint="linked to your account" icon={<Users size={18} />} />
                <StatCard label="Paid orders" value={paidCount} hint="completed payments" icon={<Wallet size={18} />} />
                <StatCard
                  label="Attendance"
                  value={attendance.data ? `${attendance.data.rate.toFixed(0)}%` : "–"}
                  hint={attendance.data ? `${attendance.data.present} present of ${attendance.data.total}` : "link a learner"}
                  icon={<LineChart size={18} />}
                />
              </div>

              {nextLesson ? (
                <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-blue-light text-brand-blue">
                        <CalendarDays size={20} />
                      </span>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Next lesson</p>
                        <p className="font-bold text-ink-800">{nextLesson.title}</p>
                        <p className="text-xs text-ink-500">
                          {new Date(nextLesson.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {nextLesson.timezone}
                        </p>
                      </div>
                    </div>
                    {nextLesson.meeting_url && (
                      <a href={nextLesson.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-blue-dark transition-colors">
                        Join class
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<CalendarDays size={20} />}
                  title="No upcoming lessons"
                  description="When lessons are booked they appear here with time and join links."
                  action={
                    <Link href="/private-tuition" className="rounded-full bg-brand-gold px-6 py-3 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover">
                      Book tuition
                    </Link>
                  }
                />
              )}
            </div>
          )}

          {/* Section: Bookings */}
          {section === "bookings" && (
            <>
              <div className="flex gap-2 flex-wrap">
                {BOOKING_TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      tab === t ? "bg-brand-gold text-ink-900" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-100"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {!learnerId ? (
                <p className="text-sm text-ink-500">Link a learner to see their schedule.</p>
              ) : lessons.isLoading ? (
                <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays size={20} />}
                  title={`No ${tab === "All" ? "" : tab.toLowerCase() + " "}bookings`}
                  description="When lessons are booked they appear here with status, time and join links."
                />
              ) : (
                <ul className="space-y-3">
                  {filtered.map((l) => (
                    <li key={l.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-blue-light text-brand-blue">
                            <CalendarDays size={18} />
                          </span>
                          <div>
                            <p className="font-bold text-ink-800">{l.title}</p>
                            <p className="text-xs text-ink-500">
                              {new Date(l.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge label={l.status} kind={statusKindFor(l.status)} />
                          {l.meeting_url && (l.status === "SCHEDULED" || l.status === "ONGOING") && (
                            <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-bold text-white hover:bg-brand-blue-dark transition-colors">
                              Join class
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* Section: Payments */}
          {section === "payments" && (
            <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
              <h2 className="font-bold text-ink-800">Payments &amp; receipts</h2>
              {orders.isLoading ? (
                <Skeleton className="h-16 w-full mt-4" />
              ) : (orders.data?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={<ReceiptText size={20} />}
                  title="No payments yet"
                  description="Your orders and receipts will appear here."
                />
              ) : (
                <ul className="mt-4 divide-y divide-ink-100">
                  {orders.data?.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <span className="font-mono text-xs text-ink-600">{o.order_number}</span>
                        <div className="mt-1"><StatusBadge label={o.status} kind={statusKindFor(o.status)} /></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-ink-800">{o.currency} {o.total_amount.toLocaleString()}</span>
                        <button
                          onClick={() => void openReceipt(o.id)}
                          className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue-light transition-colors"
                        >
                          Receipt
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Section: Progress */}
          {section === "progress" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
                <h2 className="font-bold text-ink-800">Attendance summary</h2>
                {attendance.data ? (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    {[
                      { label: "Present", value: attendance.data.present, cls: "text-brand-green" },
                      { label: "Absent", value: attendance.data.absent, cls: "text-red-600" },
                      { label: "Late", value: attendance.data.late, cls: "text-amber-600" },
                      { label: "Rate", value: `${attendance.data.rate.toFixed(0)}%`, cls: "text-brand-blue" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-surface-muted p-3">
                        <div className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</div>
                        <div className="text-[10px] text-ink-500">{s.label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink-500">Attendance appears after lessons begin.</p>
                )}
              </div>
              <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
                <h2 className="font-bold text-ink-800">Progress reports</h2>
                {reports.isLoading ? (
                  <Skeleton className="mt-3 h-24 w-full" />
                ) : (reports.data ?? []).length === 0 ? (
                  <p className="mt-3 text-sm text-ink-500 rounded-xl border border-dashed border-ink-200 p-6 text-center">
                    No progress reports yet — your tutor shares them here after lessons begin.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {(reports.data ?? []).map((r) => (
                      <div key={r.id} className="rounded-xl border border-ink-100 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-ink-700">
                            {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                          </p>
                          <span className="rounded-full bg-brand-gold-light px-2.5 py-0.5 text-xs font-bold text-brand-navy">
                            ★ {r.overall_rating}/5
                          </span>
                        </div>
                        {r.strengths && <p className="mt-2 flex items-start gap-2 text-sm text-ink-600"><TrendingUp size={15} className="mt-0.5 shrink-0 text-brand-green" /> {r.strengths}</p>}
                        {r.weaknesses && <p className="mt-1 flex items-start gap-2 text-sm text-ink-600"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" /> {r.weaknesses}</p>}
                        {r.recommendations && <p className="mt-1 flex items-start gap-2 text-sm text-ink-700"><Compass size={15} className="mt-0.5 shrink-0 text-brand-blue" /> {r.recommendations}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Learners */}
          {section === "learners" && (
            <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold text-ink-800">Learners</h2>
                <button
                  onClick={() => setAddOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-5 py-2.5 text-sm font-bold text-ink-900 transition-colors hover:bg-brand-gold-hover"
                >
                  <UserPlus size={15} /> Add a learner
                </button>
              </div>
              {learners.isLoading ? (
                <Skeleton className="mt-4 h-20 w-full" />
              ) : (learners.data ?? []).length === 0 ? (
                <EmptyState
                  icon={<Users size={20} />}
                  title="No learners yet"
                  description="Add your first child to see their schedule, attendance and progress."
                />
              ) : (
                <ul className="mt-4 divide-y divide-ink-100">
                  {(learners.data ?? []).map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-gold-light font-bold text-brand-navy">
                          {l.first_name?.[0]?.toUpperCase() ?? "?"}
                        </span>
                        <div>
                          <p className="font-bold text-ink-800">{l.first_name} {l.last_name ?? ""}</p>
                          <p className="text-xs text-ink-500">
                            {l.current_level ?? "Level not set"}
                            {l.school_name ? ` · ${l.school_name}` : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelectedLearner(l.id); setSection("bookings"); }}
                        className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue-light transition-colors"
                      >
                        View bookings
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <Link
            href="/account"
            className="mt-4 block rounded-2xl border border-ink-100 bg-white p-5 shadow-soft text-center text-sm font-bold text-brand-navy hover:border-brand-gold"
          >
            <span className="inline-flex items-center gap-2"><Settings size={16} /> Account</span>
          </Link>
        </div>

      {/* Add-learner modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setAddError(null); }} title="Add a learner">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setAddSubmitting(true);
            setAddError(null);
            try {
              await createLearner({
                first_name: addForm.first_name.trim(),
                last_name: addForm.last_name.trim(),
                current_level: addForm.current_level.trim() || undefined,
                school_name: addForm.school_name.trim() || undefined,
                relationship: "PARENT",
              });
              await qc.invalidateQueries({ queryKey: ["onboarding", "learners"] });
              await qc.invalidateQueries({ queryKey: ["session", "context"] });
              setAddForm({ first_name: "", last_name: "", current_level: "", school_name: "" });
              setAddOpen(false);
            } catch (err) {
              setAddError(err instanceof Error ? err.message : "Could not add learner");
            } finally {
              setAddSubmitting(false);
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500">First name *</span>
              <input required value={addForm.first_name} onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })} className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500">Last name *</span>
              <input required value={addForm.last_name} onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })} className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500">Current level</span>
              <input placeholder="e.g. Year 7, JSS2, SSS3" value={addForm.current_level} onChange={(e) => setAddForm({ ...addForm, current_level: e.target.value })} className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500">School (optional)</span>
              <input value={addForm.school_name} onChange={(e) => setAddForm({ ...addForm, school_name: e.target.value })} className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
            </label>
          </div>
          {addError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{addError}</p>}
          <button type="submit" disabled={addSubmitting} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-gold text-sm font-bold text-ink-900 transition-colors hover:bg-brand-gold-hover disabled:opacity-50">
            {addSubmitting ? "Adding…" : "Add learner"}
          </button>
        </form>
      </Modal>

      {/* Receipt modal */}
      <Modal
        open={receipt !== null || receiptLoading}
        onClose={() => setReceipt(null)}
        title="Receipt"
        description={receipt ? receipt.order.order_number : "Loading…"}
      >
        {receipt && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-surface-muted p-4 space-y-1.5">
              <div className="flex justify-between"><span className="text-ink-500">Status</span><StatusBadge label={receipt.order.status} kind={statusKindFor(receipt.order.status)} /></div>
              <div className="flex justify-between"><span className="text-ink-500">Date</span><span className="font-semibold text-ink-800">{new Date(receipt.order.created_at).toLocaleDateString()}</span></div>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-2 text-ink-800">Items</h3>
              <ul className="space-y-1.5">
                {receipt.items.map((it, i) => (
                  <li key={i} className="flex justify-between text-ink-600">
                    <span>{it.description ?? it.item_type.replace(/_/g, " ")} × {it.quantity}</span>
                    <span className="font-semibold text-ink-800">{receipt.order.currency} {it.total_price.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-ink-100 pt-2 mt-2 font-bold text-ink-800">
                <span>Total</span><span>{receipt.order.currency} {receipt.order.total_amount.toLocaleString()}</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-2 text-ink-800">Payments</h3>
              <ul className="space-y-1.5 text-xs">
                {receipt.payments.map((p) => (
                  <li key={p.id} className="flex justify-between text-ink-600">
                    <span>{p.provider.replace(/_/g, " ")}{p.provider_reference ? ` · ${p.provider_reference.slice(0, 14)}…` : ""}</span>
                    <StatusBadge label={p.status} kind={statusKindFor(p.status)} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\dashboard\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/dashboard/page.tsx'

New-Item -ItemType Directory -Force -Path 'docs' | Out-Null
$content = @'
# NUVORA — free launch (₦50–70k, including domain)

This is the account-and-keys checklist for **this repo** (`ykay-virtual`).
It matches the env names the API actually reads (`internal/config/config.go`,
`internal/notification/email.go`, `client/lib/api.ts`).

**Budget:** spend cash on a **domain only**. Everything else below is a free
tier. **pgAdmin 4 is a GUI, not a database.** You still need Neon (or similar).

**Target:** ~5,000 registered users over 3 years. Free tiers are enough if you
do not store video or large files in Postgres.

Do **not** set `SEED_DEMO_DATA=true` or `MEETING_PROVIDER=stub` in production
(the API will refuse or crash).

---

## 0. Order of work (one evening)

1. Buy domain  
2. GitHub (already have `Teamthy/ykay-virtual`)  
3. Neon Postgres + copy `DATABASE_URL`  
4. Render API — set env, first boot with `MIGRATE_ON_BOOT=true`  
5. Vercel web — set `NEXT_PUBLIC_API_URL`  
6. Point domain at Vercel  
7. Resend SMTP  
8. Paystack **test** keys + webhook  
9. Flutterwave **test** keys + webhook  
10. Optional: Upstash Redis, Google OAuth, Cloudinary  

Live money (Paystack/Flutterwave **live** keys) waits until CAC/KYC. Use test
keys until then.

---

## 1. Domain (the only paid item)

**Buy:** `nuvora.com.ng` (~₦6–8k/yr) or `nuvora.ng` (~₦13–15k). `.com` is
~₦18–22k.

**Where:** WhoGoHost, Web4Africa, or Namecheap (naira card or transfer).

**After purchase — do not point DNS yet.** Finish Vercel first, then:

- Type **A** / **CNAME** as Vercel shows (Project → Settings → Domains).
- Optional later: `api.yourdomain.com` CNAME → `ykay-virtual.onrender.com`.

Until the custom domain works, keep using:

- Web: `https://ykay-virtual-wtar.vercel.app`
- API: `https://ykay-virtual.onrender.com`

---

## 2. GitHub

1. Sign in at [github.com](https://github.com).  
2. Repo is already `https://github.com/Teamthy/ykay-virtual`.  
3. You need **admin** on the repo to connect Vercel/Render.

No API key from GitHub is required for deploy.

---

## 3. Postgres — Neon (free) + optional pgAdmin

**pgAdmin 4 does not host data.** Install it later to *look* at Neon.

### Create Neon

1. Open [https://console.neon.tech](https://console.neon.tech).  
2. Sign up with GitHub.  
3. **New project** → name `nuvora` → region closest to Europe/US East
   (Render/Vercel sit there). Postgres version default is fine.  
4. After create: **Dashboard → Connection details**.  
5. Copy the **pooled** URI (has `-pooler` in the host). It looks like:

   `postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require`

6. That string is **`DATABASE_URL`**. Never commit it.

Free tier (2026): ~0.5 GB / project, compute scales to zero when idle.
Do **not** use Render’s free Postgres (deleted after 30 days).

### Optional: pgAdmin 4 (client only)

1. Download [pgAdmin 4](https://www.pgadmin.org/download/).  
2. Register → Server → Connection:  
   - Host = Neon host (without `postgresql://`)  
   - Port `5432`  
   - Database `neondb` (or the name Neon shows)  
   - Username / password from the URI  
   - SSL = **Require**  
3. You can browse tables after the first Render migrate.

---

## 4. Metrics token (required or API will not boot)

On any computer:

```powershell
# PowerShell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | ForEach-Object {[char]$_})
```

Save the output. That is **`METRICS_TOKEN`**.

---

## 5. Render — API

You already have `https://ykay-virtual.onrender.com`.

1. [dashboard.render.com](https://dashboard.render.com) → sign in with GitHub.  
2. Open the **existing** web service (`ykay-virtual` / `nuvora-api`).  
3. **Environment** → add/replace (Save + manual deploy):

| Key | Value | How you get it |
|---|---|---|
| `ENVIRONMENT` | `production` | type it |
| `PORT` | `8080` | type it |
| `DATABASE_URL` | Neon pooled URI | §3 |
| `SITE_URL` | `https://ykay-virtual-wtar.vercel.app` then later `https://nuvora.com.ng` | your web origin, **no trailing slash** |
| `ALLOWED_ORIGINS` | same as `SITE_URL` (comma-separate if both old + new) | must be exact origin, no `*` |
| `COOKIE_DOMAIN` | leave **empty** until a custom domain | then `.nuvora.com.ng` |
| `METRICS_TOKEN` | random string | §4 |
| `MEETING_PROVIDER` | `jitsi` | type it — **do not leave stub** |
| `MIGRATE_ON_BOOT` | `true` **first** deploy only | then set `false` |
| `TRUST_PROXY` | `true` | type it |
| `SEED_DEMO_DATA` | `false` or unset | never true in prod |
| `PAYMENT_PROVIDER` | `PAYSTACK` | type it |
| `PAYSTACK_SECRET` | `sk_test_…` | §8 |
| `FLUTTERWAVE_SECRET` | Flutterwave secret | §9 |
| `SMTP_HOST` | `smtp.resend.com` | §7 |
| `SMTP_PORT` | `587` | §7 |
| `SMTP_USER` | `resend` | §7 |
| `SMTP_PASS` | Resend API key | §7 |
| `EMAIL_FROM` | `NUVORA <beth.t@example.com>` | §7 |
| `REDIS_URL` | Upstash URL or omit | §10 — omit is OK (in-memory) |

4. **Do not** create Render Postgres on the free plan.  
5. After first healthy boot (`/health` returns ok), set `MIGRATE_ON_BOOT=false`.  
6. Confirm `https://ykay-virtual.onrender.com/health`.

**Jitsi:** no account, no key. Rooms are public `meet.jit.si` links.

---

## 6. Vercel — website

1. [vercel.com](https://vercel.com) → GitHub → import `Teamthy/ykay-virtual`
   (already done: `ykay-virtual-wtar`).  
2. **Settings → Environment Variables** (Production):

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://ykay-virtual.onrender.com/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | `https://ykay-virtual-wtar.vercel.app` then your domain |

3. Redeploy.  
4. **Settings → Domains** → add `nuvora.com.ng` → copy the DNS records to
   the registrar.

Root directory must stay `client` if that is how the project is set (check
Project Settings). This repo’s Next app lives in `client/`.

---

## 7. Email — Resend (free)

Login codes never arrive until SMTP works. Prod does **not** print OTPs.
The API now **sends SMTP immediately** (it does not wait for a worker).
If SMTP is missing, Render logs `smtp not configured` and the login-code
request fails instead of pretending success.

1. [https://resend.com/signup](https://resend.com/signup).  
2. **API Keys → Create** → copy `re_…` = `SMTP_PASS`.  
3. SMTP (Resend):

   - Host `smtp.resend.com`  
   - Port `587`  
   - User `resend`  
   - Pass = API key  

4. **Before you own a domain:** `EMAIL_FROM` must be a Resend test sender
   they show in the dashboard (often `beth.t@example.com`).  
5. **After domain:** Domains → Add `nuvora.com.ng` → add the DNS TXT/MX/CNAME
   they list → then `EMAIL_FROM=NUVORA <leo.a@example.org>`.

**Brevo** (Sendinblue) is the naira-friendly alternative: SMTP host
`smtp-relay.brevo.com`, user = your Brevo login, pass = SMTP key from
Settings → SMTP.

Do **not** set `AUTH_LOG_CODES=true` once real parents exist.

---

## 8. Paystack (test first — free)

1. [https://dashboard.paystack.com/#/signup](https://dashboard.paystack.com/#/signup).  
2. Business type can start as **starter**; live payouts later need BVN/NIN/CAC.  
3. **Settings → API Keys & Webhooks**.  
4. Copy **Test Secret Key** `sk_test_…` → Render `PAYSTACK_SECRET`.  
5. Webhook URL:

   `https://ykay-virtual.onrender.com/api/v1/webhooks/paystack`

6. Leave **Test** mode until KYC is done. Then switch to **Live Secret Key**
   and a live webhook (same path).

Paystack charges a **% of each payment**, not a monthly fee.

---

## 9. Flutterwave (test first — free)

1. [https://dashboard.flutterwave.com/signup](https://dashboard.flutterwave.com/signup).  
2. **Settings → API Keys** → **Test** secret → Render `FLUTTERWAVE_SECRET`.  
3. **Settings → Webhooks**:

   URL: `https://ykay-virtual.onrender.com/api/v1/webhooks/flutterwave`  
   Copy the **secret hash** if the dashboard shows one (keep it aligned with
   whatever Flutterwave signs with — this API accepts verif-hash or HMAC).

4. Go live only after Flutterwave KYC.

---

## 10. Optional free extras

### Redis — Upstash

1. [https://console.upstash.com](https://console.upstash.com) → Redis → Create
   (region us-east).  
2. Copy **Redis URL** (`rediss://…`) → Render `REDIS_URL`.  
3. If you skip this, the API logs “redis unavailable — in-memory cache”.
   Fine until you have real traffic.

### Google login

1. [https://console.cloud.google.com](https://console.cloud.google.com) →
   New project `nuvora`.  
2. **APIs & Services → OAuth consent screen** → External → app name NUVORA.  
3. **Credentials → Create OAuth client ID** → Web application.  
4. Authorized redirect URIs:

   `https://ykay-virtual-wtar.vercel.app/auth/google/callback`  
   and later `https://nuvora.com.ng/auth/google/callback`

5. Copy Client ID / Secret → Render `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL` (the **web** callback URL
   above).

Skip until email login works.

### Cloudinary (avatars / homework later)

1. [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free).  
2. Not wired as a first-class env in this API yet — keep using
   `client/public/tutors/*.jpg` until you add S3/Cloudinary code.

### Gemini chatbot

1. [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey).  
2. Render: `GEMINI_API_KEY`, `CHATBOT_ENABLED=true`.  
3. Or `CHATBOT_ENABLED=false` to turn the widget off.

---

## 11. What you paste where (cheat sheet)

### Render (API)

```
ENVIRONMENT=production
PORT=8080
DATABASE_URL=postgresql://…neon…?sslmode=require
SITE_URL=https://ykay-virtual-wtar.vercel.app
ALLOWED_ORIGINS=https://ykay-virtual-wtar.vercel.app
METRICS_TOKEN=your-long-random
MEETING_PROVIDER=jitsi
MIGRATE_ON_BOOT=true
TRUST_PROXY=true
PAYMENT_PROVIDER=PAYSTACK
PAYSTACK_SECRET=sk_test_…
FLUTTERWAVE_SECRET=FLWSECK_TEST-…
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_…
EMAIL_FROM=NUVORA <beth.t@example.com>
```

### Vercel (web)

```
NEXT_PUBLIC_API_URL=https://ykay-virtual.onrender.com/api/v1
NEXT_PUBLIC_SITE_URL=https://ykay-virtual-wtar.vercel.app
```

After the custom domain, change `SITE_URL`, `ALLOWED_ORIGINS`, and
`NEXT_PUBLIC_SITE_URL` to `https://nuvora.com.ng` (same on both sides).

---

## 12. Smoke test

1. `https://ykay-virtual.onrender.com/health` → `{"status":"ok",…}`  
2. Open the Vercel site → `/tutors` (API must not CORS-fail).  
3. `/register` → check Resend dashboard for the OTP email.  
4. Paystack test card on a ₦100 checkout (test mode).  
5. Create a lesson → meeting URL should look like `https://meet.jit.si/nuvora-…`.

---

## 13. Do not do on this budget

| Skip | Why |
|---|---|
| Render Postgres free | Deleted after 30 days |
| `MEETING_PROVIDER=stub` | API fatals in production |
| Whereby | Needs a paid key |
| Termii SMS | Email OTP is enough |
| Live Paystack before KYC | Settlements will fail |
| `AUTH_LOG_CODES=true` | Leaks login codes in logs |
| Treating pgAdmin as the DB | No data, no backups |

---

## 14. When 5k users actually show up

Move off free **only** when something hurts:

- Neon storage > ~0.5 GB → paid Neon or a ₦ cheap VPS Postgres  
- Render sleep annoys parents → Render Starter API  
- Need private lesson rooms → Whereby or self-hosted Jitsi  

Until then, keep the ₦ leftover for domain renewal and CAC, not a “server.”
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'docs\FREE_LAUNCH.md'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote docs/FREE_LAUNCH.md'

Write-Host 'Done. git add those files, commit, push. Do not add APPLY89.ps1.'
