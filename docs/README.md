# YK-Virtual Documentation Index

> Added in the production-clean pass (2026-08-24). `docs/` accumulated ~40
> documents across the build. This index separates **live runbooks** (keep
> open during ops) from **historical delivery records** (safe to ignore
> day-to-day; they document how the system came to be).

## Live — read these during deploys & ops

| Doc                                                                                                                          | Purpose                                                        |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [DEPLOY_VERCEL_RENDER.md](DEPLOY_VERCEL_RENDER.md)                                                                           | How the stack deploys (Vercel web + Render API/worker)         |
| [ENV_VARS.md](ENV_VARS.md)                                                                                                   | Every environment variable, where it goes, safe defaults       |
| [PAYMENTS_RUNBOOK.md](PAYMENTS_RUNBOOK.md)                                                                                   | Gateway setup, webhooks, refunds drill (YK-006), disputes      |
| [DR_RUNBOOK.md](DR_RUNBOOK.md)                                                                                               | Backup / restore / failover drills                             |
| [OPS_MANUAL.md](OPS_MANUAL.md) / [OPS_MONITORING.md](OPS_MONITORING.md)                                                      | Day-2 operations, alerting, dashboards                         |
| [MIGRATIONS.md](MIGRATIONS.md)                                                                                               | Migration chain rules (`MIGRATE_ON_BOOT`, 0000xx pairs)        |
| [LOCAL_RUN.md](LOCAL_RUN.md)                                                                                                 | Running the stack locally (Docker Postgres/Redis)              |
| [PRODUCTION_READINESS_COHORT_FLOW.md](PRODUCTION_READINESS_COHORT_FLOW.md)                                                   | Cohort → enrolment → payment → student/tutor sign-off evidence |
| [MOBILE_PARITY.md](MOBILE_PARITY.md)                                                                                         | Web ↔ mobile feature matrix + roadmap                          |
| [CONTENT_WORKFLOW.md](CONTENT_WORKFLOW.md)                                                                                   | Blog / programme content publishing                            |
| [GOOGLE_AUTH.md](GOOGLE_AUTH.md)                                                                                             | Google OAuth setup                                             |
| [FREE_LAUNCH.md](FREE_LAUNCH.md)                                                                                             | Zero-cost hosting layout used today                            |
| [APK_HOSTING.md](APK_HOSTING.md) / [MOBILE_DISTRIBUTION.md](MOBILE_DISTRIBUTION.md) / [MOBILE_RELEASE.md](MOBILE_RELEASE.md) | Android APK hosting + store release process                    |

## Historical — delivery records (do not update)

`A11Y_AUDIT.md`, `DESIGN_SYSTEM.md`, `E2E_50_TESTERS.md`, `GAP_ANALYSIS.md`
(superseded by the readiness doc above), `INFRASTRUCTURE_PLAN.md`,
`LOAD_TEST_REPORT.md`, `MOBILE_DASHBOARD_DIRECTION.md`,
`MOBILE_DESIGN_AUDIT.md`, `MOBILE_LMS_PLAN.md`, `MOBILE_STRATEGY.md`,
`PHASE_*.md` (delivery logs), `STAGING_EVIDENCE` outputs, and similar
one-time records. They stay in git history for provenance; nothing links to
them at runtime.

> Rule of thumb going forward: new **runbooks** get a row above; new
> **delivery snapshots** join the historical pile without ceremony.
