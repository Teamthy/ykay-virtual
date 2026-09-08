# Device QA — PWA, cookies, fee-lock, CBT seed

Run on a **staging** student account, not production, until each row is green.

## PWA install

| Device | Check |
|---|---|
| Android Chrome | Address-bar install / `InstallPrompt`. Homescreen icon is the brand mark. Opens standalone (no browser chrome). |
| iPhone Safari | Share → Add to Home Screen. Splash from `apple-touch-icon` / `AppleSplash`. |
| Desktop Chrome | Install icon in the omnibox. |

College: `InstallPrompt` + `public/manifest.json`.
Virtual: `client/components/layout/InstallPrompt.tsx` + `client/public/manifest.json`.

## Cookie banner

- First visit: banner visible, does not cover primary CTAs on mobile.
- Accept / reject persists (`yk-virtual-cookie-consent` / College equivalent).
- Analytics scripts load **only** after accept (Plausible/domain env).

## Fee-lock (College student)

1. Log in as a student with an outstanding invoice.
2. `/student/exams` shows **Fees outstanding**, no Start button.
3. Pay the invoice (Paystack test key on staging).
4. Start button appears. Sitting autosaves and auto-submits at 00:00.

## CBT banks (empty bank = no papers)

College (in the College repo):

```
npx prisma migrate deploy
npm run cbt:seed
```

Virtual (repo root):

```
go run ./cmd/migrate --cmd=up
go run ./cmd/seedlms
```

Confirm `/cbt` (College, public) lists subjects with question counts > 0.
Confirm `/lms/practice` (Virtual, logged-in student) lists bank subjects.

## Smoke after deploy

- Home 200, hero visible, no mixed-content.
- Login → student dashboard.
- One practice paper start → answer → submit → review.
- Cookie + install prompts do not block those clicks.
