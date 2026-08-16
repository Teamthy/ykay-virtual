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

## What's here (M3 + M4)

| Screen | File | Notes |
|---|---|---|
| Welcome | `app/index.tsx` | Brand + CTAs |
| Login | `app/login.tsx` | **M4**: `/auth/login/mobile` → bearer token in SecureStore → device registration |
| Onboarding | `app/onboarding.tsx` | Compact 4-screen web flow; verify via `/auth/login-code/mobile/confirm` (token) |
| Home | `app/home.tsx` | Quick links (chat, cohorts, tutors, LMS) |
| Chat | `app/chat.tsx` | Thin client for the AI assistant |
| **My Learning** | `app/lms.tsx` | **M3**: courses via `/me/lessons` (Bearer) |
| **Course** | `app/lms/[cohortId].tsx` | **M3**: lessons, resources, assignments (submit), attendance |

Shared bits: `src/lib/api.ts` (envelope fetch + SecureStore bearer token +
`registerDevice()` via expo-notifications, plus on-demand video lesson-progress
helpers), `src/lib/theme.ts` (gold/cream/navy tokens mirroring the web),
`src/components/TabBar.tsx` (reusable bottom tab bar on Home/Learning).

## Roadmap

- **M3 done** — student LMS screens on the live API.
- **M4 done (backend)** — `/auth/login/mobile`, `/auth/login-code/mobile/confirm`,
  bearer-token sessions (`Authorization: Bearer`), device registry
  (`POST/GET /me/devices`, `DELETE /me/devices/{id}`), Expo push sender
  (agent chat replies notify the user's devices). App-side registration
  wired via expo-notifications.
- **M5** — store launch (App Store + Play) with privacy policy.

## Caveat

`app.json` → `extra.projectId` must be your real Expo project ID for push
tokens to validate. Set `EXPO_ACCESS_TOKEN` on the API for authenticated
Expo push delivery (optional in dev).
