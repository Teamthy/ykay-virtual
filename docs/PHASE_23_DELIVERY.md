# PHASE 23 — Gold/Cream Design System, Detail Polish, Wizard & Backend Hardening — DELIVERY

Branch: `feature/phase-23-gold-system-hardening`
Base: `main` @ `e173796` (phase 22)
Delivery method: git bundle `ykay-virtual-phase-23.bundle`

---

## 1. Design system — implemented exactly per spec

The pasted CSS is now the platform's design foundation:

- **`:root` tokens** verbatim (Anton/DM Sans vars, primary `#F4B400` +
  hover/dark/light, cream backgrounds `#FFFCF5`/`#FFF8E8`/`#F7F5EF`, text
  scale `#111`–`#777`, borders `#E8E3D8`/`#F0ECE3`, semantic
  success/error/warning/info pairs, shadows, radii) added to `globals.css`.
- **Tailwind tokens remapped** to the spec so the whole app re-skins:
  `brand.gold`→`#F4B400` (+`gold-hover` `#DFA300`, `gold-dark` `#B98200`,
  `gold-light` `#FFF3C4`), `brand.blue`→`#2563EB` (+`#EAF1FF`),
  `ink`→`#111… #F0ECE3`, `surface`→cream trio, shadows per spec.
- **Buttons per spec**: `.btn-primary`/`.btn-gold` = gold pill, dark text,
  hover `#DFA300` + lift; new `.btn-secondary` outline pill (1.5px border);
  shared `Button` component default/gold → `rounded-full` gold pill, outline →
  bordered pill.
- **Utilities**: `.card` (white/`#F0ECE3`/20px radius/sm shadow),
  `.section-accent` (gold), `.section-dark` (`#111`), `.input` (full-width,
  md radius, gold focus ring) — all in `@layer components`.
- Body: cream background, `#111` text.

## 2. Detail-page polish (programmes + cohorts)

- **`/programmes/[slug]`**: display-font headline, gold-light tag pills,
  subject pills, and a sticky **CTA card** (`.card`): next start, display
  price, gold-check "what you get" list, `btn-primary` Find a cohort +
  `btn-secondary` Book private tuition.
- **`/cohorts/[id]`**: display title, gold location chip, icon stat cards
  (`.card`), session list with **StatusBadge**, and the enrol card upgraded:
  display price, **seat progress bar**, gold-check benefits, gold pill
  "Enrol now — pay securely" CTA.

## 3. Tutor-request wizard (Tuteria multi-step styling)

`PrivateTuitionWizard` (7 steps): custom stepper replaced with the shared
§24.1 **`Stepper`** component; wrapper → `.card`; step headings → display
font; inputs → **gold focus ring** (`focus:border-brand-gold` +
`ring-brand-gold/30`); selected option tiles → gold border + `gold-light`
fill. Next/submit CTAs are gold pills via the shared Button.

## 4. Backend hardening (webhook replay + worker coverage)

New `internal/service/payment_webhook_hardening_test.go` — 5 tests, all
passing (suite now **11 webhook tests** + cron tests):
- `MalformedPayload` → `ErrInvalidInput`
- `NoReference` → `ErrInvalidInput`
- `UnsupportedProvider` → `ErrInvalidInput`
- `UnprocessedDuplicate_ContinuesProcessing` — crash-recovery replay: a
  webhook row inserted but unprocessed is adopted and processed idempotently
  (exactly one payment row, one paid order).
- `ProcessedReplay_ShortCircuits` — full replay returns
  `duplicate=true, already_processed` and touches nothing.
- **`TestWorkerCronBoot_ExpiresStaleState`** — mirrors the worker's boot
  sequence: `ExpireStaleHolds` + `ExpireStaleAttempts` compose correctly on
  one store (hold RELEASED, attempt EXPIRED).

---

## Verification

```text
gofmt                     clean
go build ./...            PASS
go vet ./...              PASS
go test ./internal/...    PASS (service suite incl. 5 new hardening tests)
npx tsc --noEmit          PASS
next build                PASS (all routes)
scripts/e2e.sh            77 passed · 0 failed
Compiled CSS check: brand-gold emits rgb(244 180 0) = #F4B400 ✓
```
