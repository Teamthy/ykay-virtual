# PHASE 36 — M5 store-launch prep + C5 extras (prompt-eval CI, CSAT trends) + website gap analysis — DELIVERY

Branch: `feature/phase-36-m5-evals-gaps`
Base: `main` @ `eb27ddf` (phase 35)
Delivery method: git bundle `ykay-virtual-phase-36.bundle`

---

## M5 — Store launch prep

### Legal pages (web) — fixes dead links

- **`/privacy`** — full privacy policy (NDPR + GDPR-aligned): data
  collected, children's data with guardian consent, AI-assistant disclosure,
  third parties (Paystack/Flutterwave/Expo/Gemini), security, rights,
  retention, cookies, contact. Mentions data export/deletion (promised UX).
- **`/terms`** — terms of service: accounts, escrow payments, acceptable
  use, AI-assistant disclaimer, IP, liability cap, termination, governing
  law (Nigeria).
- Linked from the **footer** (Privacy Policy / Terms of Service) and the
  **onboarding** "Terms" + "Privacy Policy" (were dead spans — now real
  links).

### App assets (`mobile/assets/`)

- **`icon.png`** (1024×1024) — navy rounded-square with gold graduation-cap
  - "N" monogram (generated, brand tokens).
- **`adaptive-icon.png`** (1024×1024) — Android adaptive foreground.
- **`splash.png`** (1290×2796) — cream splash with navy YK-Virtual wordmark +
  tagline.
- `app.json` wired: `icon`, `splash.image`, `android.adaptiveIcon`
  (foreground + navy bg) — validated JSON.

### Release runbook

- **`docs/MOBILE_RELEASE.md`** — EAS builds, TestFlight flow (internal →
  external, privacy answers), Play Console (internal → closed → staged
  production), required legal URLs, pre-launch checklist (API prod config,
  OAuth, push, payments keys), versioning, rollback, troubleshooting
  (push tokens, export compliance, icon failures, tester links).

## C5 extras

### Prompt-eval CI job

- `.github/workflows/ci.yml` — new **`prompt-evals`** job: runs the CI
  rubric (`TestChatPromptEvals_CI` + chat/push suites) on every push/PR;
  runs **live Gemini evals** when the `GEMINI_API_KEY` repo secret is set.

### CSAT trend reporting

- **`GET /admin/chat/analytics/trends?days=N`** (≤90, default 14) → daily
  series: `{date, threads, escalated, rated, avg_rating, csat%}` computed
  from thread timestamps (created/rated days).
- `/admin/chat` renders a **14-day chart card** — gold volume bars with CSAT
  % labels + date axis (pure CSS/SVG, no chart dependency).
- Tests: `TestChatService_Trends` (same-day aggregation, avg 3.5, CSAT 50%,
  bounds: 0→14, 30 ok).

## Website gap analysis

- **`docs/WEBSITE_GAP_ANALYSIS.md`** — verified, ranked: 4 P0 (real
  payment round-trip on checkout, `/account` settings hub, parent learner
  management UI, site search), 6 P1 (admin payments/refunds/payouts UI,
  tutor earnings, Google creds, notifications wiring, private-tuition
  booking UI, progress charts), 10 P2 polish items + cross-cutting
  (session-aware UI replacing hardcoded dev ids, export/delete UX).
  See the doc for details — summary also given in chat.

## Verification

```text
gofmt / go build / go vet     PASS
go test ./...                 PASS (trends + evals + push + chat)
tsc --noEmit                  PASS
next build                    PASS
scripts/e2e.sh                119 passed · 0 failed (trends +2)
Live: /privacy 200 (NDPR/AI/contact present), /terms 200, footer +
  onboarding legal links, trends 7-point series OK, assets in place
```
