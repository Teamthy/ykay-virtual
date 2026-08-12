# PHASE 37 — P0 knockout: /account, parent learner dashboard, site search, checkout round-trip — DELIVERY

Branch: `feature/phase-37-p0-account-search`
Base: `main` @ `f7f780d` (phase 36)
Delivery method: git bundle `ykay-virtual-phase-37.bundle`

---

## 1. `/account` — settings hub (was P0-2)

**Backend**
- `identity.User` gains `FirstName`/`LastName` (migration `000023_profile_fields`);
  postgres Create/Update/scan extended; memory flows automatically.
- **`PUT /auth/me/profile`** — {first_name, last_name, phone, timezone}
  (AccountService.UpdateProfile, empty phone clears).
- **`GET /auth/me/export`** — JSON download of everything the user owns:
  user, roles, learners, devices, chat threads + messages (audited).
- **`POST /auth/me/delete`** — soft-delete (status DELETED), revoke all
  sessions, purge push devices, clear cookie (audited). Deleted accounts
  can no longer log in (tested).
- `/auth/me` now returns profile fields (toUserResponseFull).

**Frontend (`/account`)** — 5 tabs: Profile (name/phone/timezone form),
Security (change password with confirm + mismatch hint), Devices
(list/remove push devices with platform icons), Preferences (email toggles,
client-side for now), Data (**download my data** + **delete account** with
"type DELETE" confirmation). Linked from parent/student/tutor dashboards.

## 2. Parent dashboard — real per-child progress (was P0-3)

- Progress section now queries `listProgressReports(learnerId)` for the
  selected learner and renders actual reports (period, ★rating, strengths,
  weaknesses, recommendations) instead of a placeholder. Attendance summary
  retained.

## 3. Site-wide search (was P0-4)

- **Backend**: free-text `q` on `GET /tutors/search` — ILIKE over
  display_name/headline/bio (postgres) + fold-case filter (memory mock).
- **`/search`** page: groups **Tutors / Programmes / Subjects** with result
  counts and tab switching; rich tutor cards (initial avatar, subjects,
  rating); empty states.
- Header search (desktop + mobile) now routes to `/search?q=…`.

## 4. Checkout payment round-trip (was P0-1, web UX)

- `PaymentLinkCard` now **polls the order every 6s** once the gateway is
  opened and shows **"✅ Payment confirmed — seat secured"** when the
  webhook flips it to PAID, plus a "waiting for confirmation (checked N×)"
  counter. Copy-link retained.
- Real live-key verification still needs the merchant's Paystack test/live
  keys; the webhook→escrow→enrollment path remains e2e-covered.

## Tests
- `TestAccountService_ProfileExportDelete`: profile update + phone clear,
  export contents, delete → status DELETED + login rejected.
- E2E grew **119 → 128**: update profile, me includes profile, export 200,
  tutor free-text search, relogin after profile edit.

## Verification
```text
gofmt / go build / go vet     PASS
go test ./...                 PASS (account + chat + push suites)
tsc --noEmit                  PASS
next build                    PASS
scripts/e2e.sh                128 passed · 0 failed
Live: /account 200 · profile saved (Adaeze Okonkwo) · me returns names ·
  export JSON keys (user/roles/learners/devices/chat) · search finds
  tutors by name · /search?q=utme 200 · dashboard/student-dashboard 200
```

## Gap doc updated
`docs/WEBSITE_GAP_ANALYSIS.md` — P0 section now marked DONE with what
shipped; remaining P1s: admin payments/refunds/payouts UI, tutor earnings
& payout dashboard, real Google creds + OAuth error page, notifications for
the real session user, private-tuition booking UI, progress charts on LMS.
