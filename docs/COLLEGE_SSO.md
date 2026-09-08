# YKAY College → YK Virtual federated login (YK-013)

**Status:** implemented and unit-tested on both sides. Not yet deployed or
exercised against live services.

## The problem

YKAY College (EDU Portal) and YK Virtual are two separate products with two
separate identity stores:

| | EDU Portal | YK Virtual |
|---|---|---|
| User table | `User` (cuid) | `users` (uuid) |
| Roles | single `role` enum | `user_roles` many-to-many |
| Session | HS256 JWT in `ykay_session` cookie, or Bearer | opaque token, SHA-256 hash in `sessions.token_hash` |
| Revocation | `tokenVersion` + `isActive`/`isSuspended` on `User` | `sessions.revoked_at` + `users.status` |

Without a bridge, a parent or student needs **two accounts and two passwords**
across the Ykay family, with no shared view of who they are.

## The design

**The EDU Portal is the identity provider. YK Virtual is a relying party.**

No credentials are copied. No user records are synchronised. On each login
YK Virtual hands the presented College session token to the College portal and
asks "is this session live?" — then mints its own local session from the answer.

```
College user, signed in at ykaycollege.com
        │
        │  POST /api/v1/auth/college/login  { token: <ykay_session JWT> }
        ▼
   YK Virtual API
        │
        │  POST {COLLEGE_API_URL}/api/auth/verify-session
        │  X-College-SSO-Secret: <shared secret>
        │  { token }
        ▼
   EDU Portal  ── verifies JWT signature + expiry
        │        ── rejects impersonation sessions
        │        ── checks User.isActive / isSuspended / tokenVersion in the DB
        │
        │  200 { valid: true, user: { id, schoolId, role, name, email, tokenVersion } }
        ▼
   YK Virtual  ── upserts local user by lower-cased email
        │        ── maps the College role (least privilege)
        │        ── startSession() — the same path as password login
        ▼
   ykv_session cookie + raw token for native clients
```

## Why this shape

- **One source of truth.** A suspension, password change, or "sign out
  everywhere" on the College side takes effect on YK Virtual at the next login.
  There is no sync job to drift and no stale copy to reconcile.
- **No credential duplication.** YK Virtual never sees or stores a College
  password. The provisioned local account gets a random, unusable bcrypt hash.
- **Revocation actually propagates.** Because verification re-reads the
  database rather than trusting the JWT, a College account suspended five
  minutes ago is refused today — not in 30 days when the JWT expires.
- **Blast radius is contained.** The shared secret is *not* the portal's
  `AUTH_SECRET`. That value is the JWT signing key and already reaches the
  browser-adjacent middleware path; reusing it here would mean one leak
  compromises both signing and federation.

## Security properties

| Property | Where |
|---|---|
| Service-to-service auth | `X-College-SSO-Secret`, constant-time compare, 32+ chars required |
| Unconfigured fails closed | Portal answers **503** if `COLLEGE_SSO_SECRET` is unset/short; YK Virtual answers 503 if `Enabled()` is false and makes no outbound call |
| Half-configured rejected at boot | `config.Validate()` refuses `COLLEGE_API_URL` XOR `COLLEGE_SSO_SECRET` in production, requires https, requires 32+ chars |
| Impersonation cannot federate | Portal returns 403 `IMPERSONATION_NOT_FEDERABLE` — a super-admin browsing a teacher's account does not acquire a writable YK Virtual session |
| Suspension/revocation enforced | Portal checks `isActive`, `isSuspended`, `tokenVersion` against the DB on every call |
| "Could not check" ≠ "denied" | Portal returns **503** `IDENTITY_UNVERIFIABLE` on DB failure; YK Virtual maps it to `ErrConflict` (retry), not `ErrUnauthorized` (bad credentials) |
| 200 is not trusted blindly | YK Virtual requires `valid: true` in the body, so an empty 200 from a proxy cannot mint a session |
| Local suspension still honoured | A YK Virtual admin's independent suspension is re-checked via `CanLogin()` after provisioning |
| Rate limited | `authRate` limiter on the login route; the portal also rate-limits the verify endpoint |
| Least-privilege role mapping | See below |

## Role mapping

`service.MapCollegeRole` — deliberately least-privilege. A College staff account
is **not** automatically a YK Virtual administrator: `ACADEMIC_ADMIN` manages
programmes, cohorts and tutor vetting on this platform, which is a different job
with a different approval path.

| College role | YK Virtual role | Flag for operator review |
|---|---|---|
| `STUDENT`, `IT_STUDENT` | `STUDENT` | no |
| `PARENT` | `PARENT` | no |
| `TEACHER`, `HOD` | `STUDENT` | **yes** — can apply via normal tutor vetting |
| `ADMIN`, `DIRECTOR`, `COORDINATOR`, `BURSAR`, `SUPER_ADMIN` | `STUDENT` | **yes** |
| anything else | `STUDENT` | no |

No path auto-grants `ACADEMIC_ADMIN`, `SUPER_ADMIN` or `INSTITUTION_ADMIN`. This
is pinned by `TestMapCollegeRole_IsLeastPrivilege`.

The review flag is written to the audit log as `needs_role_review` so operators
can query who to look at.

## Setup

Generate one secret and set it on **both** sides:

```bash
openssl rand -hex 32
```

**EDU Portal** (`.env`):
```bash
COLLEGE_SSO_SECRET="<the value>"
```

**YK Virtual** (`.env`):
```bash
COLLEGE_API_URL="https://ykaycollege.com"   # https, no trailing slash
COLLEGE_SSO_SECRET="<the same value>"
```

Both must be set together. Leave both empty to disable the feature entirely.
On boot YK Virtual logs `college sso: YKAY College federated login ENABLED` or
`disabled`, so you can confirm which state you are in.

## API

### `POST /api/v1/auth/college/login`

```json
{ "token": "<ykay_session JWT>" }
```

`200` — sets the `ykv_session` cookie and returns:

```json
{ "token": "...", "user": { ... }, "provider": "ykay_college" }
```

| Status | Meaning |
|---|---|
| 401 | College session invalid, expired, or revoked |
| 403 | College account suspended/inactive, or an impersonation session |
| 409 | Feature not configured, or the College portal was unreachable |
| 429 | Rate limited |

### `GET /api/v1/auth/college/config`

Public, secret-free. Returns `{ "enabled": true|false }` so clients can hide the
button on deployments that have not enabled the feature.

### `POST {portal}/api/auth/verify-session` *(internal)*

Header `X-College-SSO-Secret`, body `{ "token": "..." }`. Returns claims only —
never a token, never a password.

## Client integration (not yet built)

The web client needs a "Sign in with YKAY College" button that:

1. Calls `GET /api/v1/auth/college/config`; hides itself if `enabled` is false.
2. Reads the College session. Two options:
   - **Redirect flow (recommended):** send the user to a College-portal page
     that, while they hold a valid `ykay_session` cookie, posts the token to
     YK Virtual and returns. Requires a small page on the portal.
   - **Same-site cookie read:** only works if both apps share a registrable
     domain and the cookie is not `HttpOnly`-scoped away — it is `HttpOnly`, so
     this needs a portal-side reader endpoint.
3. Posts the token to `/api/v1/auth/college/login`.
4. On 403/409, shows the reason rather than a generic failure.

**This is the remaining gap.** The server contract is complete and tested; the
browser button and the portal-side token hand-off page are not built.

## Tests

| Test | Covers |
|---|---|
| `tests/lib/verify-session-federation.test.ts` (13) | Portal side: unconfigured 503, short-secret 503, wrong/missing secret 403, forged signature 401, impersonation 403, DB failure **503 not 401**, all four DB refusal reasons, DB-sourced claims override stale JWT claims, no credential leakage |
| `internal/service/college_auth_test.go` (9 groups) | YK Virtual side: provisioning + live session, idempotency by email, every portal failure status mapped to the right domain error, 200-without-`valid` rejected, unconfigured fails closed, empty token rejected, **local suspension respected**, least-privilege role mapping, name splitting |
| `internal/config/testkeys_test.go` | Config guards incl. the paired COLLEGE_* validation |
| `internal/transport/http/contract_test.go` | Both new routes are in `api/openapi.yaml` |

## What is NOT done

- No client-side button or portal hand-off page (see above).
- No end-to-end test with both services running. The unit tests stub the
  opposite side; the two have never actually spoken to each other.
- No provisioning backfill for people who already hold accounts on both sides.
  Accounts are matched by lower-cased email, so existing YK Virtual accounts
  whose email matches will be linked on first login — but accounts with
  *different* emails on each side will end up as two people. That needs a
  manual merge pass before launch.
- `tokenVersion` is returned by the portal but YK Virtual does not yet store or
  re-check it, so a College "sign out everywhere" takes effect at the *next
  login*, not on already-issued YK Virtual sessions. Closing that needs either a
  short YK Virtual session TTL for federated logins or a `college_token_version`
  column checked on each request.
