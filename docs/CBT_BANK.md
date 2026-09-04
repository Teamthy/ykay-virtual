# CBT Practice Bank — runbook

The shared practice bank (migration `000072`, commit `fb42889`): **2,061
exam-style questions across 13 subjects**, single-sourced from
`cbt-bank/build.py` (same generator that seeds the college site).

| Surface | Endpoint | Notes |
|---|---|---|
| Student | `GET /api/v1/cbt/subjects` | live published counts |
| Student | `GET /api/v1/cbt/subjects/{slug}/paper?limit=30` | random subset per request, limit 1–100; **no key, no explanation in the payload** |
| Student | `POST /api/v1/cbt/grade` | `{answers:[{question_id, selected_index}]}` — server-side scoring; review reveals key + explanations |
| Admin | `GET /api/v1/admin/cbt/questions?subject=&page=&page_size=` | includes drafts; `page_size` caps at 100 |
| Admin | `POST /api/v1/admin/cbt/questions` | subject upserted by slug; duplicate stem → 409 |
| Admin | `PATCH /api/v1/admin/cbt/questions/{id}` | `{"status":"draft"\|"published"}` |
| Admin | `DELETE /api/v1/admin/cbt/questions/{id}` | 204 |
| Admin | `POST /api/v1/admin/cbt/import` | CSV (multipart `file` or raw body); duplicate stems skipped → idempotent |

Guards: any authenticated session for `/cbt/*`; admin role for
`/admin/cbt/*` (401 unauthenticated, 403 non-admin — verified live).

## Deploying (Render)

The Docker image already carries everything; the deploy is zero-touch:

1. Merge/push to `main` → Render rebuilds `yk-virtual-api` from the blueprint.
2. `MIGRATE_ON_BOOT=true` (already set for the service) applies the embedded
   chain, including `000072` (`IF NOT EXISTS` — safe if applied by hand).
3. On first boot after that, the API logs
   `cbt bank seeded from embedded csv questions=2061` — `SeedIfAbsent` loads
   `internal/bankdata/bank.csv` (go:embed) only when the bank table is empty.
4. `GET /health/ready` gates traffic as usual.

Nothing to run by hand. To verify post-deploy:
`GET /api/v1/cbt/subjects` (13 subjects, counts summing to 2,061) and one
paper draw.

## Seeding rules

- **First boot only.** Re-boots skip the seed while the table has any
  published question — admin curation is never overwritten.
- **Re-import is safe.** `POST /admin/cbt/import` with the same CSV imports
  0, skips all (UNIQUE(subject_id, stem) + in-memory dedupe).
- **Option order is fixed per question (key distribution ~25% per letter).

Updating the bank content:** edit in `cbt-bank/` (the generator repo),
  run `build.py` → it rewrites all three copies (college `prisma/`, virtual
  `seeds/`, virtual `internal/bankdata/bank.csv`). The embedded copy changes
  the binary hash but never re-seeds a non-empty table — roll content out via
  `POST /admin/cbt/import` with the new CSV.

## Local verification (what was tested)

- `go test ./...` — 14 packages green (incl. 6 new CBT service tests and the
  OpenAPI contract test).
- Memory store: 13 subjects/2,061 seeded at boot (fresh postgres boot also seeds 2,061); two 15-question draws
  fully disjoint; papers contain only `id/text/options/topic/difficulty`;
  grading exact (15/15 all-correct, 0/15 all-wrong); admin CRUD + publish
  toggle (draft → subject count 0, paper 404) + CSV import `{imported:2}` →
  re-run `{imported:0, skipped:2}`.
- Postgres: full chain 1→72 on a scratch DB, boot seed, re-boot skips,
  physics paper graded 5/10 exact on a half-right answer set.

## Notes & edges

- Option order is deliberately NOT shuffled per draw — the grader maps the
  client's selected index onto the stored option order. Randomness comes
  from question selection + order (`ORDER BY random()`).
- Deleting every question of a subject leaves the subject row (count 0,
  papers 404). Harmless; clean up by hand if a test subject leaks in.
- `GET /admin/cbt/questions` sorts by `created_at` (postgres) / stem
  (memory) — cosmetic parity only.
- The tutor-authored fixed papers (`/learning/exams`) are unchanged and
  separate; this bank is the per-student variation layer on top.
