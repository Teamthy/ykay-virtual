# PHASE 46 — G5 SAFEGUARDING/LEGAL/CONTENT FOUNDATIONS — DELIVERY

Branch: feature/phase-46-g5-safeguarding
Base: feature/phase-45-g4-staging @ 205295d
Scope: G5.1 decision register, G5.2 policy pack + safeguarding escalation
(engineering-enforced), G5.3 catalogue publish workflow + consent-gated
publication sign-off. Business sign-offs remain with the founder/legal —
every engineering consequence is enumerated for them.

## G5.1 — Operating decisions register (docs/legal/DECISION_REGISTER.md)

8 decisions (geography, minor model, tutor comms, recordings, commercial
model, pricing, refunds, retention) each with required owner/output and the
engineering-visible consequence mapped (timezone/currency, chat permissions,
payout cadence, retention jobs…). No launch without filled rows.

## G5.2 — Policy pack + safeguarding escalation (docs/legal/)

Policies drafted (all marked DRAFT-for-review): PRIVACY_NOTICE (NDPA/GDPR
aligned: data table, minors, retention, rights), TERMS_OF_SERVICE,
CANCELLATION_REFUND_POLICY, SAFEGUARDING_POLICY (reporting ladder +
suspension), TUTOR_AGREEMENT, ACCEPTABLE_USE_POLICY, COOKIE_POLICY,
CONSENT_REGISTER (template + required rows).

### Safeguarding escalation — enforced in code, not just documented
- Migration 000029: support_tickets gains category/severity/sla_due_at/
  resolved_at; testimonials gain consent evidence + publication sign-off;
  programmes gain published_at/review_due_at.
- SupportService.OpenTicketWithMeta — SAFEGUARDING tickets: 4h SLA,
  severity floored at MEDIUM; HIGH/URGENT 8h; default 24h; unknown
  categories rejected.
- Admin triage queue: GET /admin/support?category=SAFEGUARDING
  (admin-only — non-admin 403); resolving stamps resolved_at (reopen
  clears it).
- docs/OPS_MANUAL.md — vetting, lesson exceptions, support SLAs, refunds,
  suspension, DSR, incident response, quarterly tabletop drills.

## G5.3 — Catalogue publication sign-off (no-deploy operations)

### Programme publish workflow
- POST /admin/programmes/{programmeId}/status (DRAFT/PUBLISHED/ARCHIVED):
  publish stamps published_at + 90-day review_due_at, archives clear both,
  every transition audited against the acting admin.
- NEW: cache invalidation on publish state change — ProgrammeService
  InvalidateCatalogue + cache.Cache.DelPrefix (Redis SCAN impl already
  existed; in-memory parity added) — the public catalogue updates
  immediately instead of after the 180s TTL. (Latent race fixed: the
  in-memory cache had no locking; it is now mutex-guarded.)

### Testimonial consent-gated sign-off
- POST /admin/testimonials/{id}/public — approval REQUIRES consent_given
  (403 without; server-enforced in AdminService.SetTestimonialPublic),
  records published_by + published_at; withdrawal always allowed.
- CreateTestimonial relaxed to allow unconsented DRAFTS (the publish
  endpoint is the gate) — matches the G5.3 workflow.
- Repos: SetPublic + GetByID on both memory and Postgres testimonial
  stores; consent evidence columns written at creation.

### Docs
- docs/CONTENT_WORKFLOW.md — DRAFT→academic→legal→PUBLISH→90d review
  pipeline, fixture-hygiene carry-over, structured-data truthfulness.
- openapi.yaml — /support/tickets (categories+SLA), admin programme
  status, admin testimonial sign-off documented.

## Verification

```
gofmt / go build / go vet           PASS
go test ./...                       PASS (service incl. G5 rule tests:
                                    TestSupportServiceSLA,
                                    TestTestimonialConsentRule,
                                    TestProgrammePublishWorkflow + cache
                                    invalidation assertion)
scripts/e2e.sh (memory)             168 passed · 0 failed  (was 148;
                                    20 new G5 scenarios)
scripts/e2e-pg.sh (real PG 17)      168 passed · 0 failed  (migration 29)
openapi.yaml                        valid YAML
```

## Remaining (owner-gated)

- Fill the decision register (G5.1) — founder.
- Legal review + sign-off of every docs/legal document; appoint the named
  safeguarding owner; collect consent-register evidence rows.
- Seed the production catalogue exclusively through the new admin
  publish flows (G5.3 acceptance, operational step).
- G6: Playwright browser E2E + contract tests + a11y/perf budgets.
