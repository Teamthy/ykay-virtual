# PHASE 20 — Tuteria Layout Complete: Bookings Dashboard & All Landings — DELIVERY

Branch: `feature/phase-20-tuteria-layout-complete`
Base: `main` @ `a15f9f0` (phase 19 — Tuteria visual brand)
Delivery method: git bundle `ykay-virtual-phase-20.bundle`

---

## What was delivered

### 1. Parent dashboard → bookings-style (tuteria.com/users/bookings)

`/dashboard` rebuilt on the reference layout:

- **Sidebar nav**: Bookings · Payments (paid-count badge) · Progress +
  Messages (unread badge) + "Book more tuition" / "Find a programme" CTAs.
- **Bookings tab**: status filter pills (**All / Upcoming / Completed /
  Cancelled**) + booking cards (icon, lesson title, date/time + timezone,
  **StatusBadge** text+icon+colour, "Join class" when live) — EmptyState when
  none.
- **Payments tab**: orders list with status badges + **Receipt modal** (items,
  totals, payments) — now the shared `Modal` component.
- **Progress tab**: attendance summary grid + tutor notes placeholder.
- Kept: learner switcher, outstanding-payment alert (lucide CreditCard), paid
  bookings / unread stat chips, ReferralCard.

### 2. New Tuteria-style landings (all real v2 copy)

| Page            | Reference                                       | Content                                                                                                                                                                                                                         |
| --------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/gmat`         | v2.tuteria.com/gmat (screenshots 003143–003238) | "Pass your GMAT exam in one sitting", **720 avg / 95% / 350+** stats, real student quote (530→700 INSEAD), **lead form** (name/phone/country/email → support ticket), 3-step band, benefits (Study Abroad / Dream job / Online) |
| `/study-abroad` | v2 home "Admissions & Travels"                  | "Live, work and study abroad — Apply to 1600+ universities", US 480+ / UK 390+ / Canada 310+ / Australia 290+ stat card, test prep + admissions + relocation services                                                           |
| `/plus`         | v2 home Plus section (screenshot 003543)        | "Upgrade Your Child's Learning with YK-Virtual Plus", top-5% tutors, **foreign-standard without the foreign price tag** (up to 70% less), WhatsApp CTA, 3-step how-it-works                                                     |
| `/healthcare`   | v2 home HCA strip                               | "Become a Certified Caregiver, Work In Care Worldwide", 180+ students, hands-on practicals + clinical internship, WhatsApp CTA                                                                                                  |

### 3. Homepage additions from v2

`TravelAndCareBands` — **Admissions & Travels** band (1600+ universities, test
chips) + **Certified Caregiver** strip (180+ enrolled, Join the Training).

### 4. Navigation wired across the platform

Header "Our Services" dropdown (UTME 2026, GMAT Prep, YK-Virtual Plus, Study
Abroad, Healthcare Training), CategoryRail (UTME 2026 Prep · GMAT Prep ·
Entrance Exams · Online Classes · Study Abroad · YK-Virtual Plus · Healthcare),
footer Programmes column — all new pages reachable sitewide.

---

## Verification

```text
gofmt                     clean
go build ./...            PASS
go vet ./...              PASS
go test ./internal/...    PASS
npx tsc --noEmit          PASS
next build                PASS (all routes incl. /gmat, /study-abroad,
                          /plus, /healthcare)
scripts/e2e.sh            77 passed · 0 failed
Live render: 4 new landings HTTP 200 with hero band; home shows Admissions &
  Travels + Caregiver bands; dashboard shell renders.
```
