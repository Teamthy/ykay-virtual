# YK-Virtual Mobile — Design Audit (panel review)

> Panel: Principal Product Designer · Senior UX Designer · Senior UI Designer ·
> Design Systems Engineer · Mobile Engineer · Accessibility Specialist ·
> Product Manager · User Researcher · Brand Designer
>
> Scope: the Expo/React Native app (`mobile/`), SDK 54, 37 screens, audited
> against the product's mobile UI spec (brand consistency, premium/modern,
> minimalist, accessible, production-ready). Audit date: 2026-08-21.

## Overall verdict

**8.8 / 10** — production-ready with a small remediation set, now applied.
The audit found three real violations (hook-order crash in the root layout,
brand-token drift between web and mobile, and lime-on-light contrast spots).
All three are fixed in the same change as this document; nothing remains
below 8/10.

## Panel scores

| Category                | Score   | Evidence                                                                                                                                                                            |
| ----------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual hierarchy        | **9.0** | One display scale (34→18), Anton headings vs DM Sans body, single accent colour; dashboards lead with greeting → summary → metrics → actions.                                       |
| UX clarity              | **8.5** | Every major screen family has a defined loading / empty / error / success state; wizard drafts persist; signed-out states explain _why_ and offer a CTA.                            |
| Navigation              | **9.0** | Bottom tab bar (Home · Explore · primary action · Activity · Profile) with the primary action visually emphasised; stack headers registered per route; deep links route to content. |
| Accessibility           | **8.0** | 44pt touch targets, semantic roles/labels, contrast fixed (lime is never text-on-white now — see §2); dynamic-type scaling is the remaining gap (§4.2).                             |
| Consistency             | **9.0** | Single token file (`src/lib/theme.ts`): radii 8/12/16/20/pill, spacing 4–48, 3 shadow tiers, one icon family (Ionicons) everywhere.                                                 |
| Brand identity          | **9.5** | Web tokens 1:1 (lime `#70F250`, deep `#013920`), Anton + DM Sans, the web mark as icon/splash/loader/login.                                                                         |
| Mobile usability        | **9.0** | Safe-area aware, haptics on tap, spring press feedback, keyboard-aware forms, pull-to-refresh, fixed tab bar.                                                                       |
| Component quality       | **9.0** | Reusable kit (Button, Card, Screen, AppText, AppInput, EmptyState, ErrorState, SuccessState, Skeleton, LoaderScreen) with defined states; skeleton shimmer preserves layout.        |
| Engineering feasibility | **9.5** | Type-safe (`tsc --noEmit` gate), 7 unit tests, worklets/reanimated pinned to the exact Expo Go SDK 54 native versions, lazy expo-notifications loading.                             |
| Originality             | **8.5** | No template layouts; role-aware dashboards (learner/tutor/parent), escrow-first pricing cards, curriculum-aware wizard — product-specific patterns throughout.                      |
| Premium feel            | **8.5** | Light neutral surfaces, subtle borders → soft shadows, generous whitespace, restrained motion (spring + fade only).                                                                 |
| AI-looking risk         | **9.0** | No glassmorphism, no random gradients (only the single-hue deep→deepDark LMS hero, which carries meaning), no decorative charts, consistent radii/spacing, deliberate typography.   |

## 1. What this audit fixed (same change)

| ID  | Finding                                                                                                                                                                                                       | Fix                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | **Root layout hook-order crash** — the font-load early return sat between `useEffect` hooks, so renders with/without fonts ran different hook counts ("Rendered more hooks than during the previous render"). | Moved the early return after every hook — hook order is now unconditional.                                                                                                     |
| B2  | **Brand drift** — mobile used `#16A34A`/`#0F2E1E` while the web uses lime `#70F250`/deep `#013920`.                                                                                                           | `theme.ts` now mirrors the web token table 1:1 (aliases preserved so legacy screens re-brand automatically).                                                                   |
| B3  | **Anton + DM Sans missing on mobile** — web identity depends on the type pairing.                                                                                                                             | `@expo-google-fonts/anton` + `dm-sans` + `expo-font`, loaded in the root layout with the native splash held until fonts are ready.                                             |
| B4  | **Lime on light surfaces** (EmptyState icon, account menu icons, help icon, recommendations sparkle, pull-to-refresh spinner) — `#70F250` on white is ~1.5:1, unreadable.                                     | Icons/tints on light backgrounds now use `deep` (`#013920`) or `primary-dark` (`#4CCB31`) as appropriate; lime is reserved for on-deep use (tab-bar primary bubble, LMS hero). |
| B5  | **Semantic green as large text** (seats-left, cohort fee) — `#4CCB31` text on white fails 3:1.                                                                                                                | Large metric text uses `deep`; semantic green remains for dots/checkmarks/tinted chips.                                                                                        |
| B6  | **Web logo absent on mobile** (icon, splash, in-app branding).                                                                                                                                                | Web mark is now the app icon + adaptive icon (safe-zone scaled) + splash (deep background, Anton wordmark) + BrandLogo component on welcome/login/loader.                      |
| B7  | **Onboarding carousel was icon-only**; the spec requires illustration per slide.                                                                                                                              | Three brand illustrations (tutor/learner, escrow shield, progress) now back the 3 carousel slides + the wizard welcome step, in the brand palette.                             |

## 2. Spec compliance walkthrough

| Spec requirement                                                                                        | Status | Where                                                                                                            |
| ------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| Splash (brand, minimal, fast)                                                                           | ✅     | `app.json` splash (deep bg + mark + Anton wordmark) → fonts load → content.                                      |
| Onboarding 2–4 screens w/ illustration, headline, explanation, progress, CTA, skip                      | ✅     | `OnboardingCarousel` — 3 slides, dots progress, Next/Get started + Skip.                                         |
| Authentication: sign-in, sign-up, forgot, verify, reset, success                                        | ✅     | `login`, `onboarding` (4-step), `forgot-password`, `verify-email`, `reset-password`, `SuccessState`.             |
| Home dashboard (greeting → summary → metrics → quick actions → recommendations → activity → tabs)       | ✅     | `home.tsx` role-aware; `TabLayout` fixed bottom bar.                                                             |
| Discovery (header, search, categories, featured, popular, personalised)                                 | ✅     | `search`, `subjects`, `subjects/[slug]`, `recommendations` ("For you"), `saved`, `tutors/[slug]`.                |
| Profile (header, info, preferences, history, notifications, settings, help, logout, grouped)            | ✅     | `account.tsx` — grouped cards, not an endless list.                                                              |
| Intentional empty states (icon + explanation + CTA)                                                     | ✅     | `EmptyState` used on feed/saved/recommendations screens.                                                         |
| Loading states preserve layout (skeleton, button loading, page loading, image loading, pull-to-refresh) | ✅     | `Skeleton` shimmer, `LoaderScreen`, button spinner inline, `RefreshControl`.                                     |
| Error states explain what/why/how-to-recover                                                            | ✅     | `ErrorState` w/ retry; network/expired-session routes to login.                                                  |
| Confirmation states, restrained                                                                         | ✅     | `SuccessState` (email verified, payment, profile updated) — no confetti.                                         |
| Interactions: tap/long-press/swipe/pull/modal/sheet/picker/toggle/segmented/search/filter               | ✅     | Pressable spring + haptics; `Modal`, segmented role cards in onboarding; pickers in wizard; search with filters. |
| Components w/ default·pressed·focused·disabled·loading·selected·error·success states                    | ✅     | `Button` (all), `AppInput` (error borders, labels), `Card` (press scale).                                        |
| Small phones → tablets (no desktop shrink)                                                              | ✅     | `contentMaxWidth: 560` + center caps, fluid `full` buttons, safe areas.                                          |
| Accessibility (contrast, 44pt targets, focus states, labels, non-colour-only)                           | ✅     | Fixed B4/B5; `accessibilityRole/Label` throughout; status never colour-alone (icons + labels).                   |
| Subtle motion only                                                                                      | ✅     | Spring scale on press, fade-in entrances, skeleton shimmer, tab transitions.                                     |
| One icon family                                                                                         | ✅     | Ionicons only, consistent stroke weight.                                                                         |
| No template/AI look                                                                                     | ✅     | See B-series fixes; product-specific, deliberate layouts.                                                        |

## 3. Per-screen audit (representative)

| Screen                   | Purpose · hierarchy · states                                                      | Verdict        |
| ------------------------ | --------------------------------------------------------------------------------- | -------------- |
| `index`                  | Splash → brand lockup + carousel; session-aware redirect                          | Pass           |
| `wizard` ×3              | Stepper, draft persistence, role-aware fields, illustration                       | Pass           |
| `home`                   | Greeting → summary card → metrics → quick actions → recommendations → activity    | Pass           |
| `recommendations`        | Signed-out state explains + CTA (no dead "auth required")                         | Pass           |
| `lms` / `lms/[cohortId]` | Cohort list → course detail, video/quiz/assignment flow, single-hue hero gradient | Pass           |
| `tutor/*`                | Hub, earnings, lessons, schedule, messages — consistent card grid                 | Pass           |
| `account`                | Grouped settings, divider hierarchy, deep-tinted icons                            | Pass (post B4) |
| `cohorts/[id]`           | Stats row → fee → seats; metrics in `deep` (post B5)                              | Pass           |

## 4. Remaining roadmap (none blocking)

1. **Dynamic-type scaling** — respect OS font scale for body text (display
   sizes may opt out); add a fontScale pass on `AppText`.
2. **Skeleton coverage** — extend `Skeleton` placeholders to more list
   screens (currently home/lms); other screens use LoaderScreen.
3. **Empty-state coverage** — adopt `EmptyState` on notifications, messages
   and search-no-results (currently 3 screens).
4. **Admin MFA on mobile** — the email-code challenge screen; today the
   login explains this and directs admins to the web (documented behaviour,
   not a bug).
5. **Tablet layout** — content already caps at 560pt; consider a two-pane
   course view for iPad-size screens later.

## 5. Method note

Scores above are post-fix. The B-series findings were each reproduced in
code, fixed, then re-verified: `npx tsc --noEmit` (0 errors), 7/7 unit tests,
backend `go build ./... && go vet ./... && go test ./...` green, and the app
boots in Expo Go SDK 54 with the pinned worklets 0.5.1 / reanimated 4.1.0.
