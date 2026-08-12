# NUVORA Mobile (Expo)

Native app scaffold (Phase M2) sharing the `/api/v1` backend with the web app.

## Run it

```bash
cd mobile
npm install
npx expo start          # then press i (iOS sim), a (Android emu), or w (web)
```

Point the app at your API via `app.json` → `extra.apiUrl`
(default `http://localhost:8080/api/v1`).

## What's here (M2 shell)

| Screen | File | Notes |
|---|---|---|
| Welcome | `app/index.tsx` | Brand + CTAs |
| Login | `app/login.tsx` | Email/password against shared auth |
| Onboarding | `app/onboarding.tsx` | Compact 4-screen version of the web 7-step flow (register → 6-digit code → role → done) |
| Home | `app/home.tsx` | Quick links (chat, cohorts, tutors, LMS) |
| Chat | `app/chat.tsx` | Thin client for the AI assistant |

Shared bits: `src/lib/api.ts` (envelope fetch + SecureStore token slot),
`src/lib/theme.ts` (gold/cream/navy tokens mirroring the web).

## Roadmap

- **M3** — student LMS screens (lessons, quizzes, assignments, attendance)
  on top of the existing endpoints; async-storage session persistence.
- **M4** — token-based mobile auth (`POST /auth/login/mobile` + refresh),
  push notifications (Expo push), tutor + parent apps.
- **M5** — store launch (App Store + Play) with privacy policy.

## Caveat

Sessions on native use a bearer-token slot (SecureStore). The token endpoint
is part of M4 — until then, mobile auth uses the same cookie flow as web
(works in web preview mode).
