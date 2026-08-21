# NUVORA Mobile — Dashboard Design Direction

> Reinterpretation of two reference dashboards (a light health-style app and
> a deep-green finance-style app) for NUVORA's own product, users and data.
> Principle: **borrow the architecture of the experience, not the identity.**
> Updated 2026-08-21.

## 1. What the references taught us (architecture, not content)

| Borrowed principle | Observed in references |
|---|---|
| Command-center first screen | One dominant status card answers "what matters right now" before anything else |
| Card-composed body | Each information domain sits in its own rounded surface, clearly separated |
| Strict hierarchy | Primary card → 2-up metric grid → quick actions → activity list → everything else |
| Progressive density | First screen shows the right amount; detail lives one tap deeper |
| Bottom navigation | 4–5 persistent destinations; one center action visually elevated |
| Living surface | Progress bars, status chips, live numbers — state is visible at a glance |
| Calm rhythm | Generous section gaps, consistent radii, one accent colour, muted neutrals |

**Explicitly NOT copied:** any health/fitness content, wallet/finance content,
their cards, icons, colours, illustrations, labels, metrics or arrangements.
NUVORA keeps its own tokens (lime `#70F250` / deep `#013920`, Anton + DM
Sans, radius 8/12/16/20/pill) — the references happen to share the green
family, which is NUVORA's existing brand, not a new import.

## 2. The user's mental model

> "Where am I, what is important right now, what can I do, and what needs my
> attention?" — answered within the first screen, per role.

| Role | What matters NOW | Most frequent actions |
|---|---|---|
| Learner | Next lesson; overall progress | Join lesson · practice exam · message tutor |
| Parent | Their learner's next lesson; escrow status | Book/find tutors · track progress |
| Tutor | Available balance; today's schedule | View schedule · messages · create exam |

## 3. Dashboard composition (mobile)

```
A. Header        avatar · time-aware greeting · notification bell (badge)
B. Primary card  ONE dominant piece of information, visually emphasized
C. Key metrics   2-up card grid (max 4 numbers — never decoration)
D. Quick actions primary full-width CTA → 4 secondary tiles
E. Activity      up-next lessons + recent exam attempts (status chips)
F. More tools    compact icon-only grid (progressive disclosure, low weight)
   Bottom nav    Home · Learning · [Explore] · Alerts · Profile
```

### A. Header
Lightweight personal workspace: avatar initial, "Good morning/afternoon/
evening, <name>", bell with unread badge → `/notifications`. Signed-out users
see a welcome header without identity chrome.

### B. Primary card (role-aware, one dominant fact per dashboard)
Each dashboard owns ONE dominant fact, so no two dashboards compete:

| Dashboard | Dominant fact (hero card) |
|---|---|
| Home · learner/parent | **Next lesson** — title, date/time, LIVE/ON-DEMAND chip, watched-progress bar, View course CTA |
| Home · tutor | **Today's schedule** — next class today, classes-today count, LIVE chip, View schedule + Create exam CTAs |
| Home · signed out | Welcome card — what NUVORA is, Log in / Create account |
| Learning · learner | **Overall progress** — watched % as the hero number, X of Y lessons, next-lesson chip, View courses CTA |
| Learning · tutor | **Teaching overview** — cohorts count as the hero number, lessons this term, Create exam + View schedule CTAs |
| Tutor earnings | Ledger-first: three equal escrow-status cards (held / released / paid out), then holds + payouts — **no money hero** |
| Admin console | **Lessons today** — the live-class count as the hero number, users/tutors sub-stats; escrow stays in the metrics grid |
| Tutor hub | **Up next** — the next class as the headline, LIVE chip, classes-this-week sub-stat, View schedule + Create exam CTAs |

The hero card uses the single-hue deep gradient (`navy → navyDark`) — the one
meaningful gradient in the app, echoing the deep surface of the finance
reference while staying inside the brand system.

### C. Key metrics (2-up grid)
Only numbers the role actually monitors:
- Learner/Parent: Lessons · Watched % · Practice average · Attempts.
- Tutor: Lessons this week · Exams published · Held · Paid out.
Each metric tile opens its source screen (tap-through).

### D. Quick actions
Primary action first (full-width, never buried):
- Learner/Parent: **Take a practice exam** (learner) / **Find a tutor** (parent)
- Tutor: **Create exam**
Then four secondary tiles: My learning · Find a tutor · Messages · Saved
(learner) / Schedule · Messages · Earnings · Exams (tutor).

### E. Activity
"RECENT ACTIVITY": the next 2 lessons + latest 2 practice attempts with
pass/fail status chips (learner); the next 3 lessons with time chips (tutor).
Every row navigates to its source (course screen / exam hub).

### F. More tools
Compact icon-only grid (labels only, no descriptions) keeps the long tail of
destinations reachable — quizzes, progress, subjects, exam prep, chat, my
lessons, notifications, account — without crowding the dashboard.

## 4. Navigation model

`Home · Learning · [Explore] · Alerts · Profile` — 5 destinations, center
**Explore** elevated as the primary discovery action (deep circle + lime
glyph). This is the reference pattern applied to NUVORA's actual topology:
Learning is the main feature destination; Explore is the single most
frequent marketplace action (find a tutor/cohort).

## 5. States (never an afterthought)

| State | Treatment |
|---|---|
| Loading | Skeleton hero + skeleton metric tiles + skeleton rows (layout-stable, no spinner wall) |
| First-time learner | Primary card shows "No lessons yet — enrol on a programme" + CTA |
| Empty activity | `EmptyState`: what happened → why it matters → what to do next |
| Error | `ErrorState` with retry; a failed optional feed never blocks the rest of the dashboard |
| Offline / expired session | Token-only 401 handling; signed-out fallback content |

## 6. Interaction principles

- Taps on cards/metrics navigate to the source of the number.
- Press feedback: spring scale + haptic (shared Button/Card primitives).
- State changes are communicated by chips (LIVE / ON-DEMAND / PASSED / FAIL),
  never by colour alone.
- Animation only where it communicates: entrance stagger, progress fill,
  skeleton shimmer, tab transitions.

## 7. Responsive strategy

| Form factor | Composition |
|---|---|
| Mobile (<600pt) | Single column as in §3; content capped at 560pt, centred |
| Tablet | Same shell; metrics become a 2-column grid; primary card widens with the content cap |
| Desktop | Already implemented on the web: sidebar (`AppShell`) + header + dashboard content — the mobile hierarchy maps 1:1 into that layout |

The mobile app never stretches to fill a tablet; it centres at 560pt with
safe-area insets on every edge.

## 7a. Rollout status (2026-08-21)

Applied: Home, My Learning, Tutor hub, Practice hub (segmented), exam player
+ results, Account (grouped, themed), My lessons (week-view hero,
role-aware), Progress (attendance analytics hero + metrics grid),
Notifications (priority inbox: unread hero, unread-first, mark-all),
Messages (unread summary card, unread-first), tutor sub-pages (Schedule
week-view hero, Earnings balance hero, Lessons, Messages inbox,
Availability, Profile — all themed), auth pages (login, forgot, reset,
verify — branded with the web mark + SuccessState confirmations) and
onboarding/wizard (branded, themed, singular pages), student pages
(quizzes — also fixed a double tab bar, subjects, search, saved),
parent pages (payments — total-spent hero, learners), and a NEW mobile
admin console (read-only operations overview: revenue-in-escrow hero,
needs-attention queues, today's classes, audit feed; super admin gets the
email-delivery test). Every dashboard owns exactly ONE dominant fact and
every number is live backend data.

Money never leads: balance figures were removed as heroes (tutor hub, earnings,
admin escrow) — money lives in metric cards and ledgers, not the dominant slot.
Motion: entrance animations are subtle 240ms fades — the spring/bounce
entrance was removed across the app (press feedback on buttons/cards keeps
its spring, which is interaction state, not decoration). Theme: a light/
dark toggle now sits in the top-right of every stack header.

Not command-center-ized (deliberate): catalogue/marketing pages (subjects,
tutors, exam prep, programmes, cohorts) are browse flows, not dashboards —
they follow the same tokens/typography but keep a browse composition.
Detail pages (lesson notes, learning progress, receipts, devices, course
player, chat, help, referrals, edit profile, offline, marketing pages) are
now fully dark-mode aware — every screen in the app resolves colours from
the active theme. Parent accounts get a learner switcher (pin a child; all
learner-scoped screens filter to them); tutors get bank-details entry on
mobile.

## 8. Quality bar

- One accent colour used intentionally; neutrals carry the load.
- Consistent radii (8/12/16/20/pill) and spacing scale (4–48).
- Every number on screen maps to a real backend value.
- No decorative charts, no glassmorphism, no confetti, no random cards.
