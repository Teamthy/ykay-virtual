# PHASE 05 — Messaging, Notifications, Dashboards & Mobile (PWA) — DELIVERY

Branch: `feature/phase-05-messaging-dashboards` (contains Phase 3 + 4 + 5)
Base: `feature/phase-04-tutor-vetting` @ `7532f20`
Delivery method: git bundle `ykay-virtual-phase-05.bundle`

---

## What was built

### Messaging & notifications (backend)
- **Domain**: `internal/domain/messaging/repository.go` — Conversation/Message/
  Notification repository interfaces + `ConversationWithMeta` (counterpart,
  last message, unread count)
- **Repos (postgres + memory)**: conversation create/lookup-by-booking/
  participant list & authz/`UpdateLastRead`, message cursor pagination
  (newest-first, `before` param), notifications list/unread/mark-read/mark-all
- **Service** `internal/service/messaging_service.go`:
  - `CreateBookingConversation` / `CreateCohortConversation` — **booking-scoped
    only** (validates the package/cohort exists), idempotent per booking
  - `SendMessage` — participant-only authz, 4000-char cap, conversation touch,
    **notifies all other participants** (MESSAGE notification rows)
  - `ListConversations` / `ListMessages` / `MarkConversationRead`
  - Notification lifecycle + generic `Notify` (booking/payment/vetting hooks)
- **Migration 000013**: scale indexes (participants by user, messages by
  conversation+time, notifications by user+read, lesson participants by student)
- **Transport**: `/me/conversations` (list/create), `/{id}/messages` (list/send),
  `/{id}/read`, `/me/notifications`, `/unread-count`, `/{id}/read`, `/read-all`

### Dashboards (portals — beyond MVP)
- `DashboardService`: ParentOrders (authorization-scoped by parent user),
  StudentLessons / TutorLessons (new `LessonRepository`), TutorEarnings
  (escrow holds + payouts totals)
- New repo reads: `OrderRepository.ListByParentUserID`,
  `EscrowHoldRepository.ListByTutorProfileID`, `PayoutRepository.ListByTutorProfileID`,
  `LessonRepository` (postgres + memory)
- **Transport**: `/me/orders`, `/me/lessons?student_profile_id=`,
  `/me/tutor-lessons?tutor_profile_id=`, `/me/earnings?tutor_profile_id=`

### Frontend (new pages)
- `/messages` — booking-scoped **MessageCenter**: conversation list with
  unread badges, chat thread with **optimistic sends** (TanStack Query), polling
  refresh (Redis pub/sub lands with realtime), mark-read on open, empty/loading states
- `/notifications` — notification center with unread highlighting, mark-read on
  tap, mark-all-read
- `/dashboard` — parent portal: quick links, live stats (bookings/pending/
  unread), orders table with status badges
- `/tutor-dashboard` — tutor portal: vetting status badge, escrow earnings
  summary (held/released/paid), links to messages + vetting portal
- `/offline` — offline shell page

### Mobile app (PWA)
- `app/manifest.ts` → **installable PWA** (standalone, theme, icons)
- `public/sw.js` — service worker: network-first + cache fallback, offline shell
  (registered in prod only, progressive enhancement)
- Generated real PNG icons (192/512, verified with PIL)
- `MobileNav` — **app-style bottom navigation** on small screens (Home/Search/
  Messages/Alerts/Account)
- **CORS middleware** + `ALLOWED_ORIGINS` env — browser/PWA/mobile clients can
  call the API from any origin; `Vary: Origin`, preflight 204
- Layout wraps content with bottom-nav padding; `RegisterSW` client component

### API contract
OpenAPI now **37 paths** (was 26) — messaging + notifications + dashboard
endpoints documented under `actorHeader` security. YAML validated.

---

## Test results (run in sandbox)

```
go build ./...                  PASS    go vet ./...            PASS
gofmt -l (whole module)         0
go test ./internal/service/...  55 tests PASS   (8 new messaging/dashboard tests)
legacy/server: go test ./...    9 packages PASS
client: npx tsc --noEmit        PASS
client: npx next build          PASS  (messages, notifications, dashboard,
                                      tutor-dashboard, offline, manifest.webmanifest)
API smoke (memory fallback)     PASS
```

New tests: booking conversation creation + idempotency, send message notifies
others (and not the sender), non-participant send/list forbidden, read-receipt
(unread 1 → 0 after mark-read), notification lifecycle (create/unread/mark/
mark-all), parent orders scoping (other parents' orders invisible), tutor
earnings totals (held/released/paid) + isolation, lessons by student/tutor.

### Smoke test transcript (excerpt)
```
OPTIONS /me/conversations (CORS)      204
POST /bookings (private)              package created
POST /me/conversations                conversation for package
POST /me/conversations/{id}/messages  message sent (tutor)
GET  /me/conversations (parent)       1 conv · unread 1 · last message shown
GET  /me/notifications (parent)       1 · MESSAGE "New message"
GET  messages (stranger)              403
GET  /me/notifications/unread-count   1
POST /{id}/read                       200 → unread 0
GET  /me/orders (parent)              1 order
```

---

## Manifest

### New backend
- `internal/domain/messaging/repository.go`
- `internal/repository/postgres/messaging_repo.go`, `lesson_repo.go`
- `internal/repository/memory/messaging_memory.go`, `lesson_memory.go`
- `internal/service/messaging_service.go`, `dashboard_service.go`
- `internal/service/messaging_service_test.go`
- `internal/middleware/cors.go`
- `internal/transport/http/messaging_handler.go`, `dashboard_handler.go`
- `migrations/000013_messaging_indexes.{up,down}.sql`

### Modified backend
- `internal/domain/booking/repository.go` (+LessonRepository)
- `internal/domain/payment/repository.go` (+list-by-user methods)
- `internal/repository/postgres/{order_repo,payment_repo}.go`, `memory/memory.go`
- `internal/transport/http/router.go`, `cmd/api/main.go`,
  `internal/config/config.go` (+AllowedOrigins), `.env.example` (+ALLOWED_ORIGINS)
- `api/openapi.yaml` (37 paths)

### New frontend
- `client/features/messaging/{api.ts,components/MessageCenter.tsx}`
- `client/app/{messages,notifications,offline}/page.tsx`
- `client/app/dashboard/page.tsx` (rewritten), `client/app/tutor-dashboard/page.tsx`
- `client/components/layout/MobileNav.tsx`, `client/components/register-sw.tsx`
- `client/app/manifest.ts`, `client/public/sw.js`, `client/public/icons/icon-{192,512}.png`
- `client/app/layout.tsx` (MobileNav + RegisterSW + bottom padding)

### Docs
- `docs/PHASE_05_DELIVERY.md`, `docs/MOBILE_STRATEGY.md`

---

## Mobile strategy (summary — see docs/MOBILE_STRATEGY.md)

**PWA-first (delivered now):** installable from the browser (manifest + SW +
offline shell + app-style bottom nav), zero app-store friction, one codebase.
**Native later:** the REST API is already mobile-ready (CORS, JSON envelopes,
token headers) — an Expo/React Native app can reuse `features/*/api.ts` 1:1.
Push notifications: web push via the SW + FCM when native.

## 10k-user readiness notes
- Indexed hot paths (conversations, messages, notifications, lessons) — migration 000013
- Existing bounded pools (25 conns), Redis caching (60-300s TTL), rate limiting,
  pagination on every list endpoint
- Realtime: dev polling is a stand-in; swap to Redis pub/sub + WebSocket fan-out
  behind the same service methods without UI changes

## Bundle instructions

```
git fetch /path/to/ykay-virtual-phase-05.bundle feature/phase-05-messaging-dashboards
git checkout -b feature/phase-05-messaging-dashboards FETCH_HEAD
go run ./cmd/migrate --cmd=up
go run ./cmd/api && go run ./cmd/worker
npm --prefix client install && npm --prefix client run dev
```

Try it: `/dashboard` (parent portal), `/messages` (chat), `/notifications`,
`/tutor-dashboard`, and install the PWA from the browser (Chrome → Install).

## Known limitations / next phases
- Real-time delivery (Redis pub/sub + WebSockets) — service seams ready
- Sessions replace the dev auth headers (Phase 7)
- Native mobile app (Expo) — API + feature modules ready to consume
- Lesson scheduling/calendar UI, progress reports — Phases 8/9
