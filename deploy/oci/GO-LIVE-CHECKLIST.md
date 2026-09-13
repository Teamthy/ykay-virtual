# YKAY GO-LIVE CHECKLIST (both systems)

Use as the launch gate. Every item needs an owner, evidence, and a date.
No production DNS until **every** Critical item is green.

Legend: ðŸ”´ critical (blocks) Â· ðŸŸ  required before public traffic Â· ðŸŸ¢ verify within week 1

---

## 0. Environments & ownership

- [ ] ðŸ”´ Staging exists on OCI with staging hosts (`api-staging.*`) and staging Vercel projects; production deployed by the **same** scripts/workflows.
- [ ] ðŸ”´ `.env` on OCI is `chmod 600`, owned by the deploy user, and contains **no** `CHANGE_ME`/`sk_test`.
- [ ] ðŸ”´ Virtual API boots in `ENVIRONMENT=production` (it refuses dev defaults â€” fix every fatal before launch).
- [ ] ðŸŸ  On-call owner named for each system; runbooks (`docs/OPS_MANUAL.md`, `DR_RUNBOOK.md`) accessible.
- [ ] ðŸŸ  Every secret that ever touched Render/Vercel preview is rotated before cutover.

## 1. Secrets & platform accounts

- [ ] ðŸ”´ EduPortal: `AUTH_SECRET` â‰¥32 random; Virtual: `CBT_ATTEMPT_SECRET` â‰¥32; `COLLEGE_SSO_SECRET` â‰¥32 **and identical on both systems**, distinct from AUTH_SECRET.
- [ ] ðŸ”´ Paystack **live** keys both sides; webhook URLs set in Paystack dashboard; webhook secret = Paystack secret key.
- [ ] ðŸŸ  Flutterwave keys if used; `PAYMENT_REFUNDS_ENABLED` set deliberately after the refund drill.
- [ ] ðŸ”´ S3/R2 buckets: public/private/quarantine; credentials scoped (no admin keys); bucket CORS allows exactly the Vercel origin(s) for presigned PUT/GET.
- [ ] ðŸŸ  Resend/SMTP verified sending domains; Termii/WhatsApp where used; Google OAuth client redirect URLs on prod.
- [ ] ðŸŸ  Sentry DSN(s) set; sample rates sensible; a test error was received.
- [ ] ðŸŸ  EAS/Expo project + OTA channel; `EXPO_PUBLIC_API_URL` baked into mobile builds points at prod.

## 2. Network & TLS (OCI)

- [ ] ðŸ”´ NSG/UFW allows only 22 (admin IPs), 80, 443; Postgres/Redis have **no** host port.
- [ ] ðŸ”´ Caddy issued valid LE certs for the API host; `curl https://$API_HOST/health/live` and `/health/ready` are 200.
- [ ] ðŸ”´ Vercel â†’ API: BFF proxy `API_PROXY_TARGET=https://...` works from a deployed preview (login round-trip, cookie set).
- [ ] ðŸ”´ EduPortal DB reachable from Vercel: Neon pooled URL + `DIRECT_URL` (preferred), or an audited TLS/tunnel path â€” never 5432 open to the internet.
- [ ] ðŸŸ  `TRUST_PROXY=true` on the Virtual API so client IPs/rate limits work; `ALLOWED_ORIGINS` lists exact Vercel origins (no wildcard).
- [ ] ðŸŸ  HSTS/CSP/X-Frame headers verified with securityheaders.com / curl.

## 3. Rate limiting & abuse

- [ ] ðŸ”´ EduPortal Upstash Redis configured in Vercel: login burst returns **429, never 503**.
- [ ] ðŸ”´ IT self-signup is throttled (post-fix `enforceRateLimit("signup")`); confirm 6th attempt is 429.
- [ ] ðŸ”´ Public CBT practice endpoints return 429 after sustained hammering; key harvesting is bounded.
- [ ] ðŸŸ  Virtual auth limiter verified (20/min default) and global limiter sane for Nigerian NAT shared IPs.

## 4. Background work & cron

- [ ] ðŸ”´ EduPortal notification dispatcher runs every 60s: systemd timer on OCI (deploy/oci/eduportal-notify.timer) and a test alert is delivered within ~2 min. (Vercel Hobby daily cron is NOT sufficient.)
- [ ] ðŸ”´ Virtual worker running; Redis `ykvirtual:jobs:dead` empty/monitored; crons (escrow expiry, enrollment expiry, plus renewal, payouts) fire with leader lock.
- [ ] ðŸŸ  Queue-depth and cron-success Prometheus metrics exist and have alerts.

## 5. Payments end-to-end (live or staged live keys)

- [ ] ðŸ”´ Real fee payment â†’ invoice settled; receipt issued; duplicate webhook sent 50Ã— â†’ exactly one FeePayment.
- [ ] ðŸ”´ Virtual cohort order â†’ paid â†’ escrow HOLD â†’ completion â†’ payout (and OTP transfer path where required).
- [ ] ðŸ”´ Under/over-amount and wrong-currency webhooks rejected; no settlement.
- [ ] ðŸ”´ Client cannot self-mark success: tampering with callback/verify calls confirmed.
- [ ] ðŸ”´ Refund drill completed and result recorded; `PAYMENT_REFUNDS_ENABLED` decision logged.
- [ ] ðŸŸ  Manual/cash fee + admission record-fee path tested (EduPortal bursary).
- [ ] ðŸŸ  Reconciliation: orders vs Paystack dashboard vs payouts for the test day.

## 6. Admissions, exams, documents

- [ ] ðŸ”´ Full admissions journey: draft â†’ docs â†’ fee â†’ submit â†’ review â†’ enroll; orphan/duplicate applications behave.
- [ ] ðŸ”´ Document upload: EICAR rejected/quarantined; oversize and wrong MIME rejected; expired presign fails; private objects not directly enumerable.
- [ ] ðŸ”´ Exam day rehearsal: 60 concurrent starts/submits at deadline; late resume auto-submits; answers never visible in network tab before grading; retake consumed once.
- [ ] ðŸŸ  Practice CBT answer-key exposure test (only revealed per answered question).

## 7. Auth / RBAC / tenancy

- [ ] ðŸ”´ Suspended user blocked on the next request both systems; password reset revokes sessions; logout everywhere works.
- [ ] ðŸ”´ Role matrix spot-check: student cannot hit admin/teacher/bursar API routes; tutor cannot approve self; institution admin is not platform admin.
- [ ] ðŸ”´ IDOR checks: other-parent invoice/receipt/messages/conversations â†’ 403/404.
- [ ] ðŸ”´ No demo/fixture accounts in the migrated prod DB:
  - Virtual query: active users with ids `â€¦00a1..a4`/`â€¦00b1..b4` or emails admin/parent/tutor/student@ykaycollege.com must be zero.
- [ ] ðŸ”´ Multi-tenancy: `PLATFORM_MODE` stays off and **no second school onboarded** until RLS fail-open is closed (tracked as EDU-01).
- [ ] ðŸŸ  College SSO: login works; College suspension blocks new sessions; College outage shows 503/retry message; secret rotation procedure documented.

## 8. Data & recovery

- [ ] ðŸ”´ Automated backups enabled both databases; â‰¥3 consecutive successful backups observed.
- [ ] ðŸ”´ A restore has been **performed** into a scratch DB with checksum/deep verification (CI DR drill covers Virtual; do an OCI-level drill too). RPO/RTO written down.
- [ ] ðŸŸ  Backups copied off the OCI box (object storage); backup-failure alerting.
- [ ] ðŸŸ  Migration plan rehearsed: `migrate --cmd=up` / `prisma migrate deploy`; rollback/forward decision documented.

## 9. Observability & incident readiness

- [ ] ðŸ”´ Dashboards/alerts: 5xx rate, p95/p99, queue/DLQ depth, cron success, escrow stale-holds, payment/webhook failures, disk/RAM/CPU, backup age, auth 429/503.
- [ ] ðŸ”´ "Why did it fail at 2 am" drill: trace a synthetic error from Sentry/Grafana to logs with correlation id.
- [ ] ðŸŸ  `/metrics` requires token externally; Caddy does not expose prometheus/grafana ports publicly.
- [ ] ðŸŸ  SSE validation: EventSource stays open >60s with pings (post VRT-01 fix).

## 10. Mobile

- [ ] ðŸ”´ Signed Android build installs over prior build (consistent keystore); iOS path decided (TestFlight/enterprise).
- [ ] ðŸŸ  Airplane mode: screens render from cache, writes queue, replay on reconnect; SecureStore holds only the token.
- [ ] ðŸŸ  Deep links verified (`ykvirtual://`, `ykaycollege://` + assetlinks/AASA).
- [ ] ðŸŸ  Token expiry / logout / password reset behavior on device verified.

## 11. Deployment mechanics

- [ ] ðŸ”´ Virtual: `Deploy OCI` workflow green end-to-end on staging; failed deploy **auto-rolled back** (force a bad tag in staging).
- [ ] ðŸ”´ EduPortal: Vercel deploy from main gated by CI; instant rollback practiced.
- [ ] ðŸŸ  GHCR pull auth on VM working; images pinned by sha tag; old images pruned.
- [ ] ðŸŸ  Load test against staging at the 1k profile (`scripts/loadtest.sh`, EduPortal load job); p95/error budget recorded.

## 12. Launch-day

- [ ] ðŸŸ  Feature flags/quieter moments for: chatbot, refunds, payouts, OTA rollout percentage.
- [ ] ðŸŸ  Support contact/escalation paths in-app; Paystack dispute contact known.
- [ ] ðŸŸ  Announce/monitor first results day and first fee deadline (highest concurrency events).
