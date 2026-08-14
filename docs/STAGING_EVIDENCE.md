# NUVORA — Staging Evidence Pack (G4)

**Status:** engineering complete — live-provider runs are credential-gated.
**How to use:** `bash scripts/staging-evidence.sh` proves every scenario that
needs no live keys (self-contained, exit 0/1). The tables below are the
**live-key checklist** to complete on staging once credentials exist; each
row names the exact script/endpoint and the expected evidence to record.

## Automated (no live keys) — `scripts/staging-evidence.sh`

| # | Scenario | Proves |
|---|---|---|
| 1 | Paystack webhook: valid HMAC-SHA512 signature settles the payment | real signature code path |
| 2 | Replayed webhook → `duplicate: true`, no double settlement | idempotency (UNIQUE provider_reference) |
| 3 | Bad signature → 401 | forge-proof settlement |
| 4 | Unknown reference → 404 | no phantom payments |
| 5 | Flutterwave shape (verif-hash + tx_ref) accepted | both gateway adapters |
| 6 | Tutor opens meeting room; second call reuses the room | meeting-link lifecycle + idempotent refresh |
| 7 | Foreign tutor → 403 | object-level authz on rooms |
| 8 | Push device register/list | device registry |
| 9 | Vetting document presign + signature-verified serving | signed-URL storage contract |
| 10 | AI budget guard | `go test ./internal/service -run TestAIGuard` |

## Live-key checklist (G4.1 payments — Paystack/Flutterwave)

Run against staging with `PAYSTACK_SECRET`/`FLUTTERWAVE_SECRET` set to **test
keys**, then record each row:

- [ ] Initiate a payment → real hosted checkout URL opens (record reference).
- [ ] Pay with the gateway's test card → signed webhook arrives, order settles
      `COMPLETED`, enrolment active — screenshot the admin order detail.
- [ ] Replay the webhook from the gateway dashboard → no second settlement
      (admin shows `duplicate`).
- [ ] Temporarily corrupt the secret → gateway webhook → 401 recorded with
      `signature_valid=false` (admin webhook list), alert triggered.
- [ ] Test card decline → order stays `PENDING`, parent notified, hold expires
      via `expire_stale_booking_holds` (worker cron, 15m) — verify release.
- [ ] Admin refund → escrow released, parent notified, ledger reconciles.
- [ ] `scripts/backup.sh` + finance export: orders/payments/escrow rows
      reconcile for the test period.

## Live-key checklist (G4.2 communications / storage / video)

- [ ] SMTP: verification email lands (SPF/DKIM pass — check headers),
      password reset, booking confirmation; bounce handling verified.
- [ ] Termii (`TERMII_API_KEY`, registered sender id): lesson-reminder SMS
      received on a real number; delivery-report failures surface in worker
      logs (job retry → dead-letter if persistent).
- [ ] S3 (`S3_ENDPOINT`, public/private/quarantine buckets): tutor uploads a
      GOVT_ID → object lands in `nuvora-private`; presigned GET expires;
      anonymous fetch → 403; a renamed `.exe` upload → 400 (MIME allowlist);
      a test EICAR file → quarantined via `MoveToQuarantine`.
- [ ] Whereby (`MEETING_PROVIDER=whereby` + `WHEREBY_API_KEY`): tutor opens
      room → real `roomUrl`; student joins only inside the window; room
      auto-closes 1h after the lesson.

## Live-key checklist (G4.3 OAuth / AI / push)

- [ ] Google OAuth: sign-in via the callback on the staging domain completes;
      wrong state → rejected; account linking verified.
- [ ] Gemini (`GEMINI_API_KEY`): chat answers from platform context; a
      payments/refund question → human-handoff reply; `AI_DAILY_BUDGET_TOKENS`
      lowered to 100 → assistant returns the fallback message (record it).
- [ ] Expo push (`EXPO_ACCESS_TOKEN`): register a real device via Expo Go,
      trigger a notification, receive it; remove device → no further sends.

## Known gaps (carried forward)

| Gap | Note |
|---|---|
| Direct-to-S3 presigned **PUT** uploads | Document upload currently issues a presigned URL but the client upload path expects an API-mediated PUT; with MinioStorage the URL is a real S3 GET presign. Implement presigned PUTs (minio PresignedPutObject) in the vetting upload flow before the live S3 run. |
| Webhook alerting on `signature_valid=false` | 401s are recorded; add the Prometheus counter + alert (tracked in G6 hardening). |
| In-memory rate limiter at scale | Single-instance pilot is fine; Redis-backed limiter planned for multi-instance (G7). |
