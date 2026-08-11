# YKAY Mobile Strategy

## Decision: PWA-first, native later

| | PWA (delivered in Phase 5) | Native (Expo/React Native — future) |
|---|---|---|
| Install | Browser "Add to home screen" | App stores |
| Codebase | Same Next.js app | Shared API + feature modules |
| Push | Web Push via service worker | APNs / FCM |
| Store friction | None | Review, signing, fees |
| Offline | SW cache + offline shell | Full local DB |

## What's already in place (Phase 5)
- `app/manifest.ts` — installable manifest (standalone, icons, theme)
- `public/sw.js` — service worker (network-first, offline fallback, API bypass)
- `public/icons/icon-{192,512}.png` — real generated icons
- `components/layout/MobileNav.tsx` — app-style bottom tab bar (small screens)
- CORS middleware (`ALLOWED_ORIGINS`) so any origin can call the API
- API is fully mobile-ready: JSON envelopes, `X-User-ID/X-User-Roles` bridge
  headers (→ sessions in Phase 7), paginated lists

## Native path (when we build it)
1. `npx create-expo-app mobile` — same repo, `mobile/` workspace
2. Copy `client/features/*/api.ts` verbatim (pure fetch + types)
3. Auth: token from the Phase 7 session API
4. Push: web push now; FCM later for native
5. Verify the same booking → escrow → messaging journeys

## Offline rules (already encoded in sw.js)
- Never cache `/api/` (money + personal data)
- Cache static shell + pages
- Offline → `/offline` page with guidance
