# PHASE 14 — NUVORA Polish: Icons, Auth, Email, Vetting UX — DELIVERY

Branch: `feature/phase-14-nuvora-polish`
Base: `main` @ `8128489` (phase 13)
Delivery method: git bundle `ykay-virtual-phase-14.bundle`

---

## What was delivered (all four planned items)

### 1. NUVORA brand assets — icons, favicon, logo, social card

- **PWA icons regenerated** (`public/icons/icon-192.png`, `icon-512.png`):
  NUVORA mark drawn programmatically — navy→blue gradient tile, white open-book
  glyph, restrained gold dot with white ring (exact brand tokens; 512 version
  padded for maskable safe zone).
- **`public/favicon.ico`** (16/32/48/64) + **`public/logo.png`** (mark).
- **`public/og.png`** (1200×630): navy gradient, NUVORA wordmark, gold rule +
  dot, tagline, positioning strip. Root metadata now sets `openGraph` +
  `twitter` images; `lib/seo.ts` defaults point at `/og.png` (previously
  referenced a **missing** `og-default.jpg` — broken share cards are fixed).
- Manifest: PWA `shortcuts` added (Find a programme / Book private tuition).

### 2. Auth & checkout on the navy/blue surfaces

- New **`AuthShell`** (split-screen): navy brand panel (Logo, "Learning beyond
  boundaries", positioning strip, four trust points) + white form column.
  Applied to **login, register, forgot-password (incl. "check your inbox"
  state), reset-password, verify-email** — forms sit in soft-shadow cards.
- **Checkout**: heading in brand navy; the "What you get" panel is now a navy
  gradient card with gold **"Escrow protected"** badge and icon bullets.

### 3. Branded transactional email & platform identifiers

- New **`notification.BrandEmail()`** HTML shell: navy gradient header with
  NUVORA wordmark + gold tagline, body, footer — used by the verification and
  password-reset emails; subjects now "Verify your NUVORA email" / "Reset your
  NUVORA password" with styled CTA buttons.
- Sender/from defaults → `no-reply@nuvora.com`, `verification@`/`security@nuvora.com`;
  SMTP `From: NUVORA`.
- Defaults rebranded: `SITE_URL` → `https://nuvora.com`, payment `redirect_url`,
  postgres/S3 bucket defaults, docker-compose services/db.
- **Order numbers**: memory prefix `NUVORA-MEM-`; new migration
  `000017_nuvora_order_prefix` rewrites the `generate_order_number()` function
  so new Postgres orders are `NUVORA-YYYYMMDD-XXXXXXXX` (existing rows untouched).

### 4. Vetting document UX on the §24.1 kit

- **Tutor side** (`DocumentsStep`): plain filename input replaced with the
  **FileUploader** (drag & drop, up to 3 files, accept filter) + a **Modal**
  confirm step listing the documents with a privacy note before submission.
- **Admin side** (vetting detail): document review chips → **StatusBadge**;
  `window.prompt` rejection replaced with a **Modal** form — required reason,
  inline validation, tutor-facing copy.

---

## Verification

```text
gofmt                     clean
go build ./...            PASS
go vet ./...              PASS
go test ./internal/...    PASS
npx tsc --noEmit          PASS
next build                PASS (all routes; auth pages rebuilt on AuthShell)
scripts/e2e.sh            71 passed · 0 failed
```
