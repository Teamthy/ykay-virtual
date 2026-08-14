# NUVORA — Pilot Launch Checklist (Go/No-Go)

**Purpose:** one document to walk the go/no-go review before the first
invite-only pilot. Every G0–G6 acceptance criterion from
`PRODUCTION_REMEDIATION_PLAN.md` is mapped to its verified evidence and
the remaining human action. **No launch without every "blocking" row
closed.**

**How to use:** engineering fills the "Evidence" column from the phase
delivery docs (all verified in CI + local runs). The owner signs each
"blocking" row. Anything amber = pilot start is blocked.

---

## 1. Release gates — automated evidence (already green)

| # | Gate | Evidence | Where |
|---|---|---|---|
| 1 | Go build/vet/gofmt + full test suite (incl. Redis integration, contract, queue, DR) | 9/9 packages | CI "Go — build, vet, test" |
| 2 | API E2E vs real PostgreSQL | 184/184 | CI "E2E — real PostgreSQL" |
| 3 | Browser E2E (Playwright + axe: pilot journey, wizard, role routing, cross-family isolation, tutor onboarding, 25-page sweep) | 9/9 · axe 0 critical | CI "Browser E2E" |
| 4 | OpenAPI contract coverage (router ↔ spec drift fails CI) | 141 paths | CI "OpenAPI contract" |
| 5 | Dependency audit (npm) | 0 vulnerabilities | CI "Web — typecheck + build" |
| 6 | DR drill (backup → restore → every-table verify, deep checksums) | 75 tables verified | CI "DR drill" |
| 7 | Metrics/alerts config validation (promtool + dashboard JSON + compose) | 11 rules valid | CI "Metrics + alerts" |
| 8 | Staging provider-contract evidence (webhooks idempotency, meetings, push, presign) | 33/33 | `scripts/staging-evidence.sh` |
| 9 | Load tests (catalogue ~5k rps, session path +65% after cache, webhook storm = 1 settlement) | recorded | `docs/LOAD_TEST_REPORT.md` |
| 10 | Prompt evals (chat rubric) | CI job | CI "Prompt evals" |

→ **All automated gates are CI-enforced on `main`. A red check = no merge.**

---

## 2. Business sign-offs (G5) — HUMAN ACTION, blocks pilot

| # | Decision | Owner | Status |
|---|---|---|---|
| 1 | Launch market/geography (Nigeria-only vs international; currency NGN; timezone Africa/Lagos) | Founder | ☐ |
| 2 | Account/minor model (age threshold, parent verification/linking rules) | Safeguarding/legal | ☐ |
| 3 | Tutor communication (chat permissions, moderation/escalation) | Academic/safeguarding | ☐ |
| 4 | Video/recordings (recording consent, retention, access) | Safeguarding/legal | ☐ |
| 5 | Tutor commercial model (contractor terms, payout terms, tax) | Finance/legal | ☐ |
| 6 | Programme/pricing (launch catalogue, capacity, prices) | Academic/commercial | ☐ |
| 7 | Cancellations/refunds (policy + authority limits) | Finance/ops | ☐ |
| 8 | Data retention (retention/deletion/export schedule) | Legal/engineering | ☐ |

Sign-off record lives in `docs/legal/DECISION_REGISTER.md` — fill each row
with owner · date · outcome before launch.

---

## 3. Legal & safeguarding deliverables (G5.2)

| # | Deliverable | Status | Action |
|---|---|---|---|
| 1 | Privacy Notice (NDPA/GDPR) legal review | draft in `docs/legal/PRIVACY_NOTICE.md` | ☐ sign + publish on /privacy |
| 2 | Terms of Service | draft in `docs/legal/TERMS_OF_SERVICE.md` | ☐ sign + publish on /terms |
| 3 | Cancellation & Refund Policy | draft | ☐ sign + publish |
| 4 | Safeguarding Policy + **named safeguarding owner appointed** | draft | ☐ appoint + train |
| 5 | Tutor Agreement (accepted version per tutor recorded) | draft | ☐ finalise |
| 6 | Acceptable Use + Cookie Policy | drafts | ☐ sign + publish |
| 7 | Consent register rows for every public testimonial/claim/photo | template | ☐ collect evidence (no row = unpublish) |
| 8 | Staff trained on `docs/OPS_MANUAL.md` drills (safeguarding, refund, DSR, outage) | — | ☐ tabletop run + record |

---

## 4. Live-provider credentials (G4) — staging first

Run every row of `docs/STAGING_EVIDENCE.md` with real TEST keys and record:

| # | Provider | Test action | Status |
|---|---|---|---|
| 1 | Paystack test keys | initiate → webhook settles once → replay idempotent → forged 400 → refund reconciles | ☐ |
| 2 | Flutterwave test keys | same matrix | ☐ |
| 3 | SMTP (verified sender domain, SPF/DKIM) | verification, reset, booking emails land | ☐ |
| 4 | Termii (registered sender ID) | lesson-reminder SMS received on a real number | ☐ |
| 5 | S3-compatible buckets (public/private/quarantine) | tutor upload → presigned GET expires → .exe 400 → EICAR quarantined | ☐ |
| 6 | Whereby (or chosen video) | tutor opens room → student joins inside window → auto-close | ☐ |
| 7 | Google OAuth | callback on staging domain completes; state validated | ☐ (only if launch feature) |
| 8 | Gemini | chat answers from context; budget-exhaustion fallback reply | ☐ |
| 9 | Expo push | real-device registration + delivery + opt-out | ☐ |

---

## 5. Catalogue & content (G5.3) — production data only

| # | Action | Status |
|---|---|---|
| 1 | Seed the production catalogue ONLY through the admin publish flows (`POST /admin/programmes/{id}/status`, admin cohorts) — never `SEED_DEMO_DATA` | ☐ |
| 2 | Approve testimonials only with consent rows (admin consent gate enforces this — 403 without) | ☐ |
| 3 | Record AI-generated imagery disclosure decision (hero/tutor assets) | ☐ |
| 4 | Verify `/healthcare` redirect + no healthcare copy anywhere (Batch 2) | ✅ done |

---

## 6. Pilot shape (G6.3)

- **Geography:** Nigeria · **Catalog:** consent-cleared programmes + named tutors
- **Families:** 10–30 invited · **Payments:** gateway test/live mode per owner decision
- **Named owners required:** academic · support · finance · safeguarding · engineering on-call
- **Daily ops review:** queue health (Grafana), support SLA queue, payment reconciliation

**Metrics to capture from day 1** (dashboards + `/me/recommendations` usage):
visit→enquiry→booking→paid conversion · webhook failure rate · lesson
attendance · support first-response time · safeguarding incidents (must be 0) ·
parent/student satisfaction · tutor utilisation/payout accuracy · errors/LCP.

---

## 7. Exit criteria for the pilot (from the plan)

- [ ] 10–30 families complete with **no unresolved critical security/safeguarding/financial defect**
- [ ] Finance records reconcile (orders/payments/escrow) for the pilot period
- [ ] A recorded restore drill passes (CI DR job + manual run logged)
- [ ] Academic, finance, safeguarding + engineering owners sign the go/no-go record below

---

## 8. Go/No-Go record

| Owner | Role | Date | Go? | Signature |
|---|---|---|---|---|
|  | Founder |  | ☐ |  |
|  | Academic |  | ☐ |  |
|  | Finance |  | ☐ |  |
|  | Safeguarding |  | ☐ |  |
|  | Engineering |  | ☐ |  |
