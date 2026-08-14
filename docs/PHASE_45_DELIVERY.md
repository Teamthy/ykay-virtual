# PHASE 45 — G4 STAGING INTEGRATION PROOF (ENGINEERING) — DELIVERY

Branch: feature/phase-45-g4-staging
Base: feature/phase-44-g3-observability @ 31ad219
Scope: every G4 engineering deliverable that does not require live vendor
credentials — provider adapters, guardrails, lifecycle endpoints, a
gateway-sandbox staging harness, and the live-key evidence checklist.
Live-provider runs remain credential-gated (docs/STAGING_EVIDENCE.md).

## G4.1 — Payments

### Gateway sandbox mode (new)
- internal/payment/provider.go: PAYSTACK_BASE_URL / FLUTTERWAVE_BASE_URL
  env overrides — point the providers at the vendor sandbox or a local
  simulator without code changes (never set in production).

### Staging webhook harness (new scripts/staging-evidence.sh, scenario 1)
Proves against the API's real code path, with a local mock gateway:
- correctly HMAC-SHA512-signed Paystack webhook settles exactly once
  (kobo→naira normalization verified);
- replay of the same reference → 200 duplicate (no double settlement);
- forged signature (fresh reference) → 400, persisted with
  signature_valid=false for forensics;
- unknown reference → consumed with ignored=no_matching_payment
  (gateway retry storms cannot invent money);
- Flutterwave shape (verif-hash header + tx_ref, major units) accepted;
- a settled order refuses re-initiate (409) — reconciliation guard.

### Latent production bug fixed
- internal/config/config.go: FlutterwaveSecret was DECLARED but never
  loaded from env — Flutterwave webhook verification would always fail
  in production. Fixed + regression test (TestG4EnvSurface).

## G4.2 — Communications, storage, video

### SMS (new internal/notification/sms.go)
- Termii messaging API sender (api.ng.termii.com, dnd channel, plain
  type) + console fallback; unit-tested request construction, gateway
  rejection and HTTP error paths. TERMII_API_KEY / TERMII_SENDER_ID /
  TERMII_FROM env + compose wiring.

### Real S3-compatible storage (new internal/storage/s3_provider.go)
- MinioStorage (minio-go v7): any S3-compatible service (AWS S3, R2,
  B2, MinIO, Spaces); real presigned GETs (capped 24h); bucket
  existence fail-fast at boot; MoveToQuarantine → S3_QUARANTINE_BUCKET.
- UploadGuard: MIME allowlist (documents/images) + size cap
  (STORAGE_MAX_UPLOAD_BYTES, default 10 MB), optional post-upload
  malware-scan hook; implements the Storage interface so it drops into
  every existing upload path.
- cmd/api: production factory — S3 when S3_ENDPOINT set (fail-fast),
  else local; dev keeps ONE LocalStorage shared by the guard and the
  /objects serving route so HMAC presign signatures match.

### Meeting-link lifecycle (new internal/meeting + endpoints)
- internal/meeting: WherebyProvider (real REST) + StubMeetingProvider
  (dev, deterministic). MEETING_PROVIDER=whereby|stub + WHEREBY_API_KEY.
- migration 000028: lessons.meeting_ref / meeting_expires_at /
  join_window_minutes.
- internal/service/meeting_service.go: tutor GetOrCreateTutorLink
  (idempotent on provider ref, refresh only on expiry); participant
  GetParticipantLink with server-enforced join window
  (start−window … end+30m grace) + participant check.
- Endpoints (openapi.yaml documented):
  POST /api/v1/lessons/{lessonId}/meeting-link — tutor opens/refreshes;
  GET  /api/v1/lessons/{lessonId}/meeting-link — tutor host link or
  participant join link; profile IDs resolve from the session (G1.2);
  foreign tutor → 403; window closed → 403 with guidance message.

## G4.3 — OAuth, AI, push

- AI guardrails (internal/service/chat_gemini.go): AIGuard — per-request
  token cap (AI_MAX_TOKENS_PER_REQUEST) + daily budget
  (AI_DAILY_BUDGET_TOKENS) with UTC reset; budget exhausted → canned
  human-handoff fallback (FallbackReply) instead of failing the chat.
  Unit-tested (TestAIGuardBudget).
- Push dispatch: worker now registers send_email / send_sms / send_push
  handlers; DispatchService resolves recipients by user id and sends
  through SMTP/Termii/Expo adapters (best-effort semantics).
- Durable outbound mail: AuthService.WithQueue — verification, magic
  link and password-reset emails enqueue via Redis when up
  (API-side RedisQueue), with synchronous fallback when Redis is down.
- Google OAuth staging: unchanged (Phase 38) — evidence checklist in
  docs/STAGING_EVIDENCE.md.

## Staging evidence pack (new)

- scripts/staging-evidence.sh — self-contained 31-scenario matrix
  (webhooks, meetings, push registry, vetting presign, AI guard note),
  boots the API + a local gateway sandbox, exit 0/1.
  VERIFIED: 31 passed · 0 failed.
- docs/STAGING_EVIDENCE.md — live-key checklists for payments,
  communications/storage/video, OAuth/AI/push, each row with expected
  evidence to record; known-gap register (presigned PUT uploads, webhook
  alert counter, distributed rate limit).
- .env.production.example — full G4 environment surface (referenced by
  PRODUCTION_DEPLOY.md but never previously committed).

## Dev-seed fix

- seedMemoryTutors now links profile 0102 to the demo TUTOR user in the
  vetting store (SeedProfile) — the demo tutor's session resolves to
  their profile (G1.2), unbreaking /me/tutor-lessons + meeting routes in
  memory mode.

## Verification

```
gofmt / go build / go vet          PASS
go test ./...                      PASS (config incl. TestG4EnvSurface,
                                   notification, storage, service incl.
                                   meeting + dispatch + AIGuard, worker,
                                   telemetry)
scripts/e2e.sh (memory)            148 passed · 0 failed
scripts/e2e-pg.sh (real PG 17)     148 passed · 0 failed (migration head 28)
scripts/staging-evidence.sh        31 passed · 0 failed
openapi.yaml + compose YAML        valid
```

## Remaining (credential-gated or next phases)

- Live runs of every row in docs/STAGING_EVIDENCE.md once test keys /
  SMTP / Termii / S3 / Whereby / Expo credentials exist.
- G4.2 gap: direct-to-S3 presigned PUT uploads (recorded in the evidence
  doc with implementation note).
- G5: safeguarding/legal decisions + policy pack + consent-cleared
  catalogue workflow.
- G6: Playwright browser E2E + contract tests + a11y/perf budgets.
