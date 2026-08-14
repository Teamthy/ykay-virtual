# NUVORA — Content Workflow (G5.3)

**Goal:** no fabricated, unverified or fixture marketing material in
production, and launch offerings operable without code deploys.

## Publication pipeline

```
DRAFT ──► academic review ──► legal/consent check ──► PUBLISH ──► scheduled review
  ▲                                                       │            │
  └──────────────────── withdraw ◄────────────────────────┘      review_due_at
                                                                  (90 days)
```

## Programmes & cohorts

- Admin creates a programme/cohort as **DRAFT** (`POST /admin/cohorts`).
- Academic owner reviews copy, price and capacity → founder/legal clears
  claims → admin publishes:
  `POST /admin/programmes/{id}/status {"status":"PUBLISHED"}`
  (cohorts: `POST /admin/cohorts/{id}/status`).
- Publishing stamps `published_at` + `review_due_at` (90d) and **flushes
  the cached catalogue** (immediate visibility, G5.3 acceptance).
- At review date: update, re-publish, or archive. Archived content
  disappears from the public catalogue immediately.

## Testimonials (consent-gated sign-off)

- Created as drafts; **publication requires `consent_given`** recorded at
  creation (approval without consent → 403, server-enforced).
- Approval: `POST /admin/testimonials/{id}/public {"is_public":true}` —
  records `published_by` + `published_at` (auditable sign-off).
- Withdrawal: same endpoint with `false` — instant removal from the
  public list.
- Evidence lives in the consent register (`docs/legal/CONSENT_REGISTER.md`);
  no register row = not publishable.

## Blog / marketing pages

- Existing blog CMS (draft → publish → scheduled). Marketing claims,
  statistics and testimonials on landing pages require a consent-register
  row + founder sign-off before deploy.

## Structured data / SEO

- Only published entities are rendered (server-filtered), so canonical
  metadata can only describe truthful, visible content by construction.

## Fixture hygiene (G0 carry-over)

- Dev seed content (`SEED_DEMO_DATA=true`) never ships to production; the
  production catalogue is populated exclusively through these admin flows.
