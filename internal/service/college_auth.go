package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
)

// CollegeAuthService — federated login for YKAY College accounts (YK-013).
//
// YK Virtual and the College EDU Portal are separate products with separate
// identity stores. Instead of copying College users into this database and
// keeping two passwords in sync, a presented College session token is verified
// against the College portal and a local session is minted from the answer.
//
// The College portal therefore stays authoritative: suspending an account,
// changing a password, or "sign out everywhere" on the College side takes
// effect here at the next login, with no synchronisation job to drift.
//
// This mirrors the existing Google federated path (google_auth.go): verify with
// the external provider, upsert the local user by email, then startSession —
// the same code path password login uses.
type CollegeAuthService struct {
	auth    *AuthService
	baseURL string
	secret  string
	http    *http.Client
}

// CollegeSSOConfig — wiring for the federated login. Both fields must be set
// for the feature to be enabled; an empty BaseURL disables it entirely.
type CollegeSSOConfig struct {
	BaseURL string
	Secret  string
}

func NewCollegeAuthService(cfg CollegeSSOConfig, auth *AuthService) *CollegeAuthService {
	return &CollegeAuthService{
		auth:    auth,
		baseURL: strings.TrimRight(cfg.BaseURL, "/"),
		secret:  cfg.Secret,
		http:    &http.Client{Timeout: 10 * time.Second},
	}
}

// Enabled reports whether federated College login is configured. The handler
// answers 503 when false rather than letting the call fail opaquely.
func (c *CollegeAuthService) Enabled() bool {
	return c.baseURL != "" && c.secret != "" && c.auth != nil
}

// collegeUser — the claims the College portal returns. Kept deliberately
// narrow: the portal is the authority on who this person is, this service is
// only allowed to learn enough to open a local session.
type collegeUser struct {
	ID           string `json:"id"`
	SchoolID     string `json:"schoolId"`
	Role         string `json:"role"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	TokenVersion int    `json:"tokenVersion"`
}

type collegeVerifyResponse struct {
	Valid  bool        `json:"valid"`
	Reason string      `json:"reason"`
	User   collegeUser `json:"user"`
}

// MapCollegeRole translates a College EDU Portal role into a YK Virtual role.
//
// Deliberately LEAST-PRIVILEGE. A College staff account is not automatically a
// YK Virtual administrator: ACADEMIC_ADMIN manages programmes, cohorts and
// tutor vetting on this platform, which is a different job with a different
// approval path. Staff who need it are granted it explicitly.
//
//	STUDENT, IT_STUDENT          -> STUDENT
//	PARENT                       -> PARENT
//	TEACHER, HOD                 -> STUDENT (they can self-serve as learners and
//	                                 apply through the normal tutor vetting flow)
//	everything else (ADMIN, DIRECTOR, COORDINATOR, BURSAR, SUPER_ADMIN)
//	                             -> STUDENT, flagged for manual role grant
//
// Returns the YK Virtual role name and whether an operator should review the
// account for a privilege grant.
func MapCollegeRole(collegeRole string) (string, bool) {
	switch strings.ToUpper(strings.TrimSpace(collegeRole)) {
	case "PARENT":
		return "PARENT", false
	case "STUDENT", "IT_STUDENT":
		return "STUDENT", false
	case "TEACHER", "HOD":
		// Campus teachers land on the Virtual tutor workspace so they can
		// finish vetting and receive payouts — not the student LMS.
		return "TUTOR", true
	case "ADMIN", "DIRECTOR", "COORDINATOR", "BURSAR", "SUPER_ADMIN":
		return "STUDENT", true
	default:
		return "STUDENT", false
	}
}

// splitName splits the College `name` field into first/last. The College
// schema stores a single display name; YK Virtual stores the two separately.
func splitName(full string) (string, string) {
	full = strings.TrimSpace(full)
	if full == "" {
		return "", ""
	}
	parts := strings.Fields(full)
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], strings.Join(parts[1:], " ")
}

// ExchangeSession verifies a College session token and returns a YK Virtual
// session token, the local user, and their roles — the same tuple the other
// login paths return, so the handler is a drop-in alongside them.
func (c *CollegeAuthService) ExchangeSession(ctx context.Context, collegeToken, ip, userAgent string) (string, *identity.User, []string, error) {
	if !c.Enabled() {
		return "", nil, nil, fmt.Errorf("%w: YKAY College login is not configured", domain.ErrConflict)
	}
	if strings.TrimSpace(collegeToken) == "" {
		return "", nil, nil, fmt.Errorf("%w: a College session token is required", domain.ErrInvalidInput)
	}

	claims, err := c.verifyWithCollege(ctx, collegeToken)
	if err != nil {
		return "", nil, nil, err
	}
	return c.upsertAndStart(ctx, claims, ip, userAgent)
}

// ExchangePassword verifies College email+password (the same details a student
// uses on the College portal) and mints a YK Virtual session. This is how
// College students sign in on the Virtual login form without a prior SSO hop.
func (c *CollegeAuthService) ExchangePassword(ctx context.Context, email, password, ip, userAgent string) (string, *identity.User, []string, error) {
	if !c.Enabled() {
		return "", nil, nil, fmt.Errorf("%w: YKAY College login is not configured", domain.ErrConflict)
	}
	if strings.TrimSpace(email) == "" || strings.TrimSpace(password) == "" {
		return "", nil, nil, fmt.Errorf("%w: email and password are required", domain.ErrInvalidInput)
	}
	claims, err := c.verifyCredentialsWithCollege(ctx, email, password)
	if err != nil {
		return "", nil, nil, err
	}
	return c.upsertAndStart(ctx, claims, ip, userAgent)
}

func (c *CollegeAuthService) upsertAndStart(ctx context.Context, claims *collegeUser, ip, userAgent string) (string, *identity.User, []string, error) {
	if claims == nil || strings.TrimSpace(claims.Email) == "" {
		return "", nil, nil, fmt.Errorf("%w: the College account has no email address", domain.ErrUnauthorized)
	}

	email := strings.ToLower(strings.TrimSpace(claims.Email))

	// Upsert by email, exactly as the Google path does. Email is the only
	// durable shared identifier between the two systems.
	user, err := c.auth.users.FindByEmail(ctx, email)
	if errors.Is(err, domain.ErrNotFound) {
		user, err = c.createCollegeUser(ctx, claims, email)
		if err != nil {
			return "", nil, nil, err
		}
	} else if err != nil {
		return "", nil, nil, err
	}

	// The College portal already refused suspended/inactive/revoked sessions,
	// but re-check locally: a YK Virtual admin may have suspended this account
	// independently, and that must still hold.
	if !user.CanLogin() {
		return "", nil, nil, fmt.Errorf("%w: account is not active on YK Virtual", domain.ErrForbidden)
	}

	// Keep the local profile name in step with the College record, so a name
	// correction on the College side shows up here.
	firstName, lastName := splitName(claims.Name)
	dirty := false
	if firstName != "" && (user.FirstName != firstName || user.LastName != lastName) {
		user.FirstName = firstName
		user.LastName = lastName
		dirty = true
	}
	// College accounts are already fully provisioned on the campus portal —
	// skip the Virtual first-time wizard so they are not bounced through it.
	if user.OnboardedAt == nil {
		now := c.auth.now().UTC()
		user.OnboardedAt = &now
		dirty = true
	}
	if dirty {
		if err := c.auth.users.Update(ctx, user); err != nil {
			return "", nil, nil, err
		}
	}

	if roleName, _ := MapCollegeRole(claims.Role); roleName == "STUDENT" {
		c.auth.ensureStudentProfile(ctx, user)
	}

	return c.auth.startSession(ctx, user, ip, userAgent, "ykay_college")
}

// verifyWithCollege calls the portal's verification endpoint.
//
// The portal answers non-2xx for a genuinely invalid session, so an HTTP error
// here is an authentication failure, not a server fault — except 503, which the
// portal returns when it could not reach its own database. That distinction is
// preserved so the caller can tell "bad credentials" from "try again".
func (c *CollegeAuthService) verifyWithCollege(ctx context.Context, collegeToken string) (*collegeUser, error) {
	return c.postCollege(ctx, "/api/auth/verify-session", map[string]string{"token": collegeToken})
}

func (c *CollegeAuthService) verifyCredentialsWithCollege(ctx context.Context, email, password string) (*collegeUser, error) {
	return c.postCollege(ctx, "/api/auth/verify-credentials", map[string]string{
		"email":    strings.TrimSpace(email),
		"password": password,
	})
}

func (c *CollegeAuthService) postCollege(ctx context.Context, path string, payload any) (*collegeUser, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-College-SSO-Secret", c.secret)

	res, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: could not reach YKAY College to verify this login", domain.ErrConflict)
	}
	defer res.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(res.Body, 64*1024))

	var parsed collegeVerifyResponse
	// The portal sends a JSON body on errors too; ignore decode failures and
	// fall back to the status code.
	_ = json.Unmarshal(raw, &parsed)

	switch {
	case res.StatusCode == http.StatusOK && parsed.Valid:
		return &parsed.User, nil
	case res.StatusCode == http.StatusServiceUnavailable:
		return nil, fmt.Errorf("%w: YKAY College could not verify this login right now", domain.ErrConflict)
	case res.StatusCode == http.StatusForbidden:
		return nil, fmt.Errorf("%w: this YKAY College account is not permitted to sign in here (%s)",
			domain.ErrForbidden, reasonOr(parsed.Reason, "forbidden"))
	case res.StatusCode == http.StatusUnauthorized:
		return nil, fmt.Errorf("%w: your YKAY College session is no longer valid (%s)",
			domain.ErrUnauthorized, reasonOr(parsed.Reason, "invalid"))
	case res.StatusCode == http.StatusTooManyRequests:
		return nil, fmt.Errorf("%w: too many login attempts, please wait", domain.ErrConflict)
	default:
		return nil, fmt.Errorf("%w: YKAY College rejected this login (%s)",
			domain.ErrUnauthorized, reasonOr(parsed.Reason, res.Status))
	}
}

func reasonOr(reason, fallback string) string {
	if strings.TrimSpace(reason) == "" {
		return fallback
	}
	return reason
}

// createCollegeUser provisions a local account for a first-time College login.
//
// The password hash is random and unguessable: this account authenticates only
// through the College portal, so there is no password to know. Email is marked
// verified because the College portal has already authenticated the person and
// only returns a verified, active account.
func (c *CollegeAuthService) createCollegeUser(ctx context.Context, claims *collegeUser, email string) (*identity.User, error) {
	now := c.auth.now().UTC()
	firstName, lastName := splitName(claims.Name)

	user := &identity.User{
		Email:           email,
		FirstName:       firstName,
		LastName:        lastName,
		Status:          identity.UserStatusActive,
		Timezone:        "Africa/Lagos",
		EmailVerifiedAt: &now,
		OnboardedAt:     &now,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	raw, _, err := newSessionToken()
	if err != nil {
		return nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(raw), bcryptCost)
	if err != nil {
		return nil, err
	}
	user.PasswordHash = string(hash)

	if err := c.auth.users.Create(ctx, user); err != nil {
		return nil, err
	}

	roleName, needsReview := MapCollegeRole(claims.Role)
	if role, err := c.auth.roles.FindByName(ctx, roleName); err == nil {
		_ = c.auth.roles.AssignToUser(ctx, user.ID, role.ID)
	}
	if roleName == "STUDENT" {
		c.auth.ensureStudentProfile(ctx, user)
	}

	_ = c.auth.audit.LogStateChange(ctx, &user.ID, identity.AuditCreate, "user", &user.ID, nil,
		map[string]any{
			"email":             user.Email,
			"method":            "ykay_college_sso",
			"college_user_id":   claims.ID,
			"college_role":      claims.Role,
			"mapped_role":       roleName,
			"needs_role_review": needsReview,
		}, nil, nil)

	return user, nil
}
