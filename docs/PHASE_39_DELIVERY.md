# PHASE 39 — P2 polish complete + M5 store submission kit — DELIVERY

Branch: `feature/phase-39-p2-m5`
Base: `main` @ `409343f` (phase 38)
Delivery method: git bundle `ykay-virtual-phase-39.bundle`

---

## P2 polish — all nine items

### 1. Wishlist / saved tutors
`useWishlist` (localStorage `nuvora-saved-tutors`) + ❤️/🤍 toggles with
`aria-pressed` on search-result tutor cards + **`/saved`** page (login-
gated, remove buttons, empty state). Server-side wishlist keyed to the
session = documented follow-up.

### 2. Referral UI — verified already shipped
`ReferralCard` on the parent dashboard already had code, share link and
copy; no work needed (confirmed).

### 3. i18n
`lib/i18n.ts` dictionaries (**en / fr / yo**), `useDict()` hook,
**LanguageSwitcher** in the header (persisted `nuvora-lang`), translated
auth-nav labels. Full page-content translation = follow-up; chrome strings
are live.

### 4. Dark mode
`darkMode: "class"` + `.dark` overrides in globals.css (backgrounds, cards,
text, borders, shadows via CSS variables + targeted utilities) +
**ThemeToggle** (sun/moon) in the header desktop + mobile; persisted
`nuvora-theme`, falls back to `prefers-color-scheme`. Works platform-wide
including dashboards/LMS/chat/admin.

### 5. SEO scaling
New landing pages **`/sat`**, **`/ielts-toefl`**, **`/gre`** — metadata,
course + FAQ JSON-LD, "what's included", FAQ, CTAs to private tuition —
plus **sitemap entries** (verified in the live sitemap).

### 6. Accessibility
Skip-to-content link (layout), global `:focus-visible` ring,
`prefers-reduced-motion` support, aria pass on icon buttons/toggles/menus,
**`docs/A11Y_AUDIT.md`** checklist; Lighthouse CI already gates a11y ≥ 90
on 6 core routes.

### 7. Performance budgets
`lighthouserc.json` extended: total-byte-weight, unused-javascript,
font-display, image-alt assertions.

### 8. Cookie consent banner
`CookieConsent` (bottom sheet, accept/dismiss, links to /privacy,
persisted) in the root layout.

### 9. Offline LMS
Service worker **v3**: app shell precache now includes `/lms /chat
/dashboard /login`; network-first navigations fall back to offline shell;
API never cached.

## M5 — store submission kit
**`docs/STORE_SUBMISSION.md`** — copy-paste listing content for App Store
Connect (name/subtitle/category, description, keywords, **data-privacy
answers**, export compliance) and Play Console (short/full description,
graphics sizes, data-safety mirror, rollout internal → closed → staged
production) + pre-submission checklist.

## Verification
```text
gofmt / go build / go vet     PASS
go test ./...                 PASS
tsc --noEmit                  PASS
next build                    PASS (sat/ielts-toefl/gre/saved + all routes)
scripts/e2e.sh                139 passed · 0 failed (unchanged surface)
Live: /sat /ielts-toefl /gre /saved 200 · sitemap contains 3 new pages ·
  sw.js v3 with app-shell precache · layout bundle carries SkipLink,
  LanguageSwitcher, ThemeToggle, CookieConsent · home 200
```
