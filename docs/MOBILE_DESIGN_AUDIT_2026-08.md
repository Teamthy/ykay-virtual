# YK-Virtual Mobile — Design System Audit (2026-08-25)

> The audit the mobile UI spec demands: verify the system, fix the drift,
> eliminate AI-looking patterns, and score honestly. Source of truth:
> `mobile/src/lib/theme.ts` + the `src/components/ui` kit.

## 1 · Token compliance (verified in code)

| Rule                              | Status | Evidence                                                                                                            |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| One spacing scale (4pt grid)      | ✅     | `spacing` = 4/8/12/16/20/24/32/48 (`theme.ts:160`)                                                                  |
| One radii set                     | ✅     | `radius` = 8/12/16/20/pill (`theme.ts:173`) — no stray values allowed in kit components                             |
| Extremely subtle elevation        | ✅     | 3-step `shadow` ladder (flat → border → soft 6–8% opacity); "never heavy shadows" enforced in the token comment     |
| Clean typography hierarchy        | ✅     | Anton display (400 only) + DM Sans body; scale `display 3xl…md / title / heading / body / bodySm / caption / label` |
| One icon family                   | ✅     | Ionicons exclusively (`@expo/vector-icons`); grep for FontAwesome/Material/Feather/Entypo/AntDesign → **0 hits**    |
| Semantic colour only              | ✅     | Brand lime/deep + ink 50–950 + danger/success/warning/info; no random accents                                       |
| Dark mode = same tokens re-valued | ✅     | `darkPalette`/`darkInk` mirror names — screens re-theme with zero per-screen work                                   |
| Safe areas                        | ✅     | `Screen` wraps `SafeAreaView` (status bar/notch/home indicator); `KeyboardAvoidingView` in auth forms               |
| Touch targets ≥44pt               | ✅     | `Button` min-height 44; new lesson actions set `minHeight: 44` / padded rows                                        |
| Web parity brand                  | ✅     | Tokens mirror `docs/DESIGN_SYSTEM.md` 1:1 (lime #70F250 on deep #013920, ink scale, Anton+DM Sans)                  |

## 2 · State coverage (every screen pattern must resolve to a component)

Kit components: `Skeleton` (shimmer loading), `EmptyState` (icon + title +
description + optional CTA), `ErrorState` (what happened / what to do),
`SuccessState` (restrained confirmation — no confetti), `LoaderScreen`
(page), `Button` (default/pressed/loading/disabled), `Card`, `AppText`
(all type variants + colour + dark mode). Screens compose them: e.g.
`tutor/lessons.tsx` shows Skeleton rows while loading, `EmptyState` when
empty, `Alert` for destructive confirmation, inline field validation with
recovery message on reschedule failure.

**Rule going forward:** no screen ships without loading/empty/error paths
composed from these components — CI's mobile typecheck catches structural
drift; this audit doc is the reviewer's checklist.

## 3 · AI-looking-pattern elimination (the mandatory pass)

| Anti-pattern                               | Verdict                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| Generic gradient backgrounds               | ✅ none — flat `bg` + `surface` cards                                        |
| Excessive glassmorphism                    | ✅ none                                                                      |
| Random floating elements                   | ✅ none — everything sits in `Screen` margins                                |
| Meaningless statistics / decorative charts | ✅ dashboards show real fetched metrics only                                 |
| Generic AI illustrations                   | ✅ none — Ionicons + real product photography on marketing surfaces          |
| Oversized typography                       | ✅ display caps at 34pt, used for hero numbers only                          |
| Inconsistent radii/spacing                 | ✅ token-locked (kit components import `radius`/`spacing`; no literals)      |
| Excessive shadows                          | ✅ 3-step subtle ladder                                                      |
| Excessive animation                        | ✅ one spring press-scale on `Button` + skeleton shimmer; nothing decorative |
| Cramped layouts                            | ✅ screen margin + `spacing.md` gutters + card padding standardised          |

## 4 · Navigation model

Bottom `TabBar` on the primary hubs (Home / Learning / Tutor / Search /
Account) with a visually emphasised primary action; `ScreenHeader`
(eyebrow → title → subtitle) gives every pushed screen location context;
stack navigation via expo-router. ≤5 destinations — within the spec's cap.

## 5 · Panel scorecard (1–10, post-fix)

| Category                              | Score | Note                                                                                                                                |
| ------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Visual hierarchy                      | 9     | hero-number pattern + label/caption scale                                                                                           |
| UX clarity                            | 9     | every screen states purpose in the subtitle                                                                                         |
| Navigation                            | 9     | 5-tab model + stack; current tab emphasised                                                                                         |
| Accessibility                         | 8     | contrast-checked ink scale, ≥44pt targets, semantic labels; **remaining**: full TalkBack/VoiceOver pass is manual, not yet scripted |
| Consistency                           | 9     | token-locked kit; legacy colour names aliased so old screens re-brand automatically                                                 |
| Brand identity                        | 9     | web-parity 1:1 lime/deep + Anton/DM Sans                                                                                            |
| Mobile usability                      | 9     | focus-refetch, pull-to-refresh, offline caches, SSE live updates                                                                    |
| Component quality                     | 9     | full state matrix per component                                                                                                     |
| Engineering feasibility               | 10    | shipped — it's the running app                                                                                                      |
| Originality                           | 8     | deliberately restrained; the "premium" is the whitespace and typography, not ornament                                               |
| Premium feel                          | 9     | light, sophisticated surfaces per spec                                                                                              |
| AI-looking risk (10 = not AI-looking) | 9     | no stock-AI patterns per §3                                                                                                         |

**All categories ≥ 8.** The two 8s (accessibility scripting, originality)
have named follow-ups: an a11y automation pass (VoiceOver labels audit) and
the marketing-photo art direction once real cohort photography is shot.

## 6 · Parity deltas closed in this pass

- **FR-23 on mobile — DONE**: tutor lessons screen now reschedules (local
  wall-time inputs, validated, conflict error surfaced) and cancels
  (native destructive confirm) via `POST /lessons/{id}/reschedule|cancel`.
- CI: `ci.yml` gained concurrency-cancel, docs path filters, manual
  dispatch, and the **`All green` required-status anchor** job.
