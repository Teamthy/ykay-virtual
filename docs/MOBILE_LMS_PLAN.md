# NUVORA — Mobile LMS Standardization Plan (Expo)

**Goal:** the mobile app covers a standard LMS learner journey: courses →
lessons → quizzes → assignments → progress → messaging → notifications —
plus parent/payment support. **Status: planning — execution next tranche.**

## Current state (mobile/app/)

| Screen | Has | Missing (standard-LMS gap) |
|---|---|---|
| `index.tsx` / `home.tsx` | dashboard shell | real session data everywhere, learner switcher |
| `lms.tsx`, `lms/[cohortId].tsx` | session-resolved lessons (G1.2) | quizzes, assignments, resources, attendance, progress per learner |
| `chat.tsx` | chat UI | thread list, escalation, unread badges |
| `login.tsx` | auth | magic-link flow, verification screen, forgot password |
| `onboarding.tsx` | role select | learner creation flow, parent↔learner linking UI |
| `_layout.tsx` | navigation | deep links for notifications |

## Target screen map (standard LMS parity)

1. **Home** — greeting + today's lessons + unread badge + quick actions.
2. **Courses** (lms) — enrolled cohorts as course cards (progress %).
3. **Course detail** — lessons list (join meeting link G4.2), assignments,
   resources, quiz list with pass state.
4. **Quiz player** — start/submit attempt (single-attempt rules, timer,
   auto-grade result) — reuse `/learning` API contract from web.
5. **Assignments** — detail + submission upload (signed URL storage G4.2).
6. **Progress** — attendance %, quiz gauges, latest report (parent view).
7. **Messages** — conversations + notifications centre (unread counts).
8. **Account** — profile, learners management, logout, data export.
9. **Push** — register device (Expo token), notification taps deep-link
   into the relevant screen.

## Execution order (each step testable)

1. API client parity: mobile apiFetch mirrors client/lib/api.ts (session
   cookie → bearer, trace-id) — audit mobile requests (Phase 43 covered
   lms; extend to quizzes/messages/notifications).
2. Screens 2–5 against real endpoints (dynamic IDs only — G1.2 rule).
3. Push: device registration on login + deep-link routing on tap.
4. Offline: cache enrolled course structure (async-storage) + SW parity.
5. Device matrix + store builds (eas.json already wired: preview APK /
   production AAB — docs/MOBILE_RELEASE.md).

## Acceptance (per plan G6)

- A learner can complete a full course cycle on the app: enrol (web) →
  attend lesson (join link) → take quiz → submit assignment → see the
  progress report — with every ID session-resolved (no fixtures).
- Push opt-in/out + delivery verified on a real device (G4.3 checklist).
