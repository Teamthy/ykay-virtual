# NUVORA Mobile — Design Specification & Screen-by-Screen Reference

**Status:** live spec · **Owner:** design-system · **Applies to:** `mobile/`
This is the single source of truth for the mobile product's look, behaviour,
states, and accessibility. Any screen that diverges from this spec should be
flagged and reconciled.

---

## 1. Design Principles
1. **Light & neutral** — light warm-grey background (`#FAFAF7`), white surfaces.
2. **Green is the primary accent** (`#16A34A`). One accent colour, used for
   actions, emphasis, and selected states. Never mix random accent colours.
3. **Minimalist composition** — generous whitespace, strong hierarchy, no
   decorative UI. Every element has a purpose.
4. **Consistent tokens** — one spacing scale, one radius set, one type scale.
5. **iOS-quality polish, Android-compatible** — safe areas, touch targets,
   subtle motion, native-feeling components.
6. **Intentional, not "AI-looking"** — avoid generic gradients, glassmorphism,
   template dashboards, arbitrary icons, and meaningless stats.

---

## 2. Tokens
- **Spacing scale:** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 (`spacing.xxs…huge`).
- **Radius set:** 8 (sm) / 12 (md) / 16 (lg) / 20 (xl) / 999 (pill).
- **Type scale:** display 34/28/24/21/18, title 18, heading 16, body 15,
  bodySm 13, label 12, caption 11.
- **Elevation:** flat → subtle border → very soft shadow (sm) → interactive
  (md) → elevated modal (lg). Keep opacities low.
- **Touch target:** ≥ 44pt (with spacing for adjacent targets).
- **Layout:** page padding 20, card padding 16, section gap 24, list gap 12,
  button gap 12.

---

## 3. Navigation Model
Bottom tab bar (fixed, safe-area aware):
```
Home  Learning  [Explore]  Alerts  Profile
```
- **Explore** is the visually emphasized primary action (filled green circle).
- Active tab = green-tinted pill + bold label. Haptics on press.

---

## 4. Reusable Components & Their States
Every component documents default / pressed / focused / disabled / loading /
selected / error / success where applicable.

| Component | States |
|---|---|
| Button | default · pressed (scale+haptic) · disabled (opacity) · loading (spinner) |
| Card | default · pressed (if pressable) · disabled |
| AppInput | default · focused (green ring) · disabled · error (red border, when used) |
| AppText | variant-based defaults; no decorative colours |
| Skeleton | shimmer pulse (layout-stable) |
| EmptyState | icon + title + description + optional CTA |
| ErrorState | what happened / what to do / how to recover + retry |
| TabBar | selected (green pill) · unselected · primary action (emphasized) |
| OnboardingCarousel | progress dots, Next/Skip |

---

## 5. Screen-by-Screen Specification

For each screen: **Screen Name · Purpose · Primary Goal · Entry/Exit ·
Navigation · Content Hierarchy · Components · Interactions · Loading ·
Empty · Error · Success · Accessibility · Responsive.**

### 5.1 Splash (`/index`)
- **Purpose:** fast brand transition + session-aware routing.
- **Goal:** land logged-in users on their dashboard; logged-out users on onboarding.
- **Content:** light brand mark (N monogram + NUVORA) → OnboardingCarousel.
- **Loading:** centered green spinner while session is checked.
- **Success:** route to `/home`/`/lms` (or `/wizard` if not onboarded).

### 5.2 Onboarding (3 screens) — `OnboardingCarousel`
- **Purpose:** introduce value + gather role.
- **Content per screen:** icon illustration, headline, short explanation, progress dots, CTA (Next / Get started), Skip.
- **Empty/Error:** n/a (static).

### 5.3 Onboarding wizard (`/onboarding`)
- **Purpose:** create account → verify email → choose role → done.
- **Steps:** 1) name+email, 2) 6-digit code, 3) role cards, 4) success.
- **Loading:** button loading; **Error:** Alert with recovery; **Success:** green check + CTA.

### 5.4 Auth — login/forgot/reset/verify
- **Goal:** clean forms with validation; **Components:** AppInput, Button.
- **Error:** inline + retry; **Success:** route to dashboard.

### 5.5 Home (`/home`)
- **Hierarchy:** greeting → primary summary card → key metrics → quick actions → recommended → recent activity → bottom nav.
- **Loading:** CardSkeleton; **Empty:** EmptyState; **Pull-to-refresh:** yes.

### 5.6 Explore/Discovery (`/search`)
- **Hierarchy:** header → search → categories (chips) → featured (horizontal) → recommended.
- **Loading:** skeletons; **Empty:** EmptyState (no tutors); **Error:** ErrorState + retry.

### 5.7 Learning LMS (`/lms`, `/lms/[cohortId]`)
- **Content:** lessons (live + on-demand), resources, assignments, attendance, quizzes, progress.
- **Loading:** skeletons; **Empty:** EmptyState; **Offline:** cached catalogue + offline video downloads.

### 5.8 Profile (`/account`)
- **Hierarchy:** profile header → My Learners → grouped settings (Account /
  Learning / Notifications & privacy / Support) → logout.
- **Loading:** skeleton header + rows; **Empty:** EmptyState (no learners); **Success:** toasts.

### 5.9 Messages (`/messages`, `/messages/[conversationId]`)
- **Content:** conversations + thread; **Interactions:** polling (8s), optimistic send with "sending…" marker, pull-to-refresh.
- **Empty:** EmptyState (no conversations); **Offline:** cached threads.

### 5.10 Notifications (`/notifications`)
- **Content:** list, unread badge, mark read/read-all, deep-link on tap.
- **Loading:** skeletons; **Empty:** EmptyState; **Pull-to-refresh:** yes; **Polling:** 15s.

---

## 6. Cross-cutting Behaviours
- **Pull-to-refresh:** Home, Messages, Notifications, Explore.
- **Optimistic updates:** message send; read-state.
- **Offline-first:** catalogue, conversations, threads, notifications, videos.
- **Deep-linking:** notification tap → message thread / course / receipt.
- **Confirmation states:** restrained check + short message (no confetti).
- **Motion:** subtle — press scale, card fade, skeleton shimmer, tab transitions. No decorative animation.

---

## 7. Accessibility
- Colour contrast ≥ WCAG AA; touch targets ≥ 44pt.
- `accessibilityRole`, `accessibilityLabel`, `accessibilityState` on controls.
- Semantic `AppText` hierarchy; screen-reader-friendly structure.
- Non-colour-only communication (icons + text together).
- Dynamic text: rely on scale-independent fonts where possible.

---

## 8. Responsive / Device Adaptation
- Safe areas: status bar / notch / Dynamic Island / home indicator / keyboard /
  bottom nav all accounted for via safe-area hooks.
- Android: elevation for shadows, `RefreshControl` colors, keyboard handling.
- Layout uses `flex`, width `%`, and `ScrollView`/`FlatList` — no fixed-pixel
  assumptions that break on different phones.

---

## 9. Do / Don't
**Do:** consistent margins/padding · small radius set · subtle elevation ·
clear hierarchy · purposeful icons (one family) · intentional empty/error states ·
large readable numbers · restrained motion.

**Don't:** generic AI layouts · excessive gradients/glassmorphism · random
colours · oversized type · inconsistent radii/spacing · decorative UI ·
excessive shadows/icons · template-looking screens · cramped layouts ·
meaningless stats/charts.
