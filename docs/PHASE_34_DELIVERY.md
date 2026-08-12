# PHASE 34 — Mobile M1–M2 (PWA + Expo) & Chatbot C4–C6 (agent inbox, ratings, analytics) — DELIVERY

Branch: `feature/phase-34-mobile-chatbot`
Base: `main` @ `2f90008` (phase 33)
Delivery method: git bundle `ykay-virtual-phase-34.bundle`

---

## Part A — Mobile M1–M2

### M1 — PWA hardening (web app ships first)
- **`public/manifest.json`** (new): NUVORA identity, `standalone` display,
  gold/cream/navy theme + background, 192/512 icons (any + maskable),
  portrait, `lang en-NG`, education category, **app shortcuts** (LMS, Chat,
  Tutors).
- **`app/layout.tsx`**: manifest link, apple-touch-icon, `appleWebApp`
  (capable + title), theme-color, mobile-web-app-capable.
- **`public/sw.js` v2**: precached app shell, **cache-first for hashed
  `/_next/static` assets**, network-first navigations with `/offline`
  fallback, stale-while-revalidate images, API never cached.
- **`InstallPrompt`** component: captures `beforeinstallprompt`, shows an
  "Install NUVORA" banner (dismissable) — wired into the root layout.

### M2 — Expo (React Native) scaffold (`mobile/`)
- `package.json` (Expo SDK 51 + expo-router + expo-secure-store),
  `app.json` (bundle ids, permissions, splash), tsconfig, babel, .gitignore.
- Screens: **Welcome** (`index.tsx`), **Login** (shared auth),
  **Onboarding** (compact 4-screen version of the web 7-step flow:
  name/email → 6-digit code → role → done), **Home** (quick links),
  **Chat** (thin AI-assistant client).
- `src/lib/api.ts` (envelope fetch + SecureStore bearer slot),
  `src/lib/theme.ts` (brand tokens). README documents run + roadmap
  (M3 LMS screens, M4 token auth + push, M5 store launch).

## Part B — Chatbot C4–C6

### C4 — Human handoff + agent inbox
- Backend: `RoleAgent`; admin endpoints —
  `GET /admin/chat/threads`, `GET /admin/chat/threads/{id}/messages`,
  `POST /admin/chat/threads/{id}/reply` (agent message), `POST …/close`.
- **`/admin/chat`** — polished agent inbox: thread list with status
  badges (ESCALATED/CLOSED/OPEN), full transcript with role labels
  (STUDENT / NUVORA AI / YOU-AGENT), reply composer (Enter to send),
  close button, ratings visible per thread. Linked from the admin hub.
- User-side `/chat` now shows a **"SUPPORT AGENT" badge** on agent replies
  and an escalated banner; admin guard verified (403 for students).

### C5 — Ratings
- `POST /chat/threads/{id}/rating {score 1–5, comment?}` (owner only;
  invalid scores rejected), stored on the thread.
- `/chat` shows a **⭐ 1–5 rating bar** after enough messages (once per
  thread), thanks + persists; ratings surface in the agent inbox.

### C6 — Analytics
- `GET /admin/chat/analytics` → total/open/escalated/closed threads,
  total messages, avg rating, **escalation rate + deflection rate**.
- `/admin/chat` renders six metric cards on top.

### Tests
- `TestChatService_AgentInboxAndAnalytics`: agent reply role, admin
  transcript, close, rating bounds, analytics figures.
- E2E grew **92 → 102**: rating, inbox list, transcript, agent reply,
  student→403, close, analytics fields.

## Verification

```text
gofmt / go build / go vet     PASS
go test ./...                 PASS (chat C4–C6 service tests)
tsc --noEmit                  PASS
next build                    PASS
scripts/e2e.sh                102 passed · 0 failed
Live:
  /admin/chat 200 (admin) / 307 (anon) · agent reply 201 · rating saved ·
  analytics correct · manifest.json + sw.js v2 served ·
  mobile scaffold files in place
```

## Notes
- The sandbox lost its Go toolchain + node_modules mid-phase (snapshot
  cleanup); both were reinstalled and all gates re-ran green.
- Native token auth (M4) remains the one documented gap for the mobile app.
