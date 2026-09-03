# YK-Virtual — Mobile App & AI Chatbot Plan

Status: PLAN (no code yet) · Owner: product/engineering
Companion docs: `docs/SEEDS.md` (demo accounts), `docs/PHASE_32_DELIVERY.md`.

---

## Part A — Mobile build

### A1. Strategic choice

| Option                    | Pros                                                        | Cons                                                   | Verdict                          |
| ------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ | -------------------------------- |
| **PWA upgrade (current)** | Ships today, no store friction, reuses the Next.js codebase | Limited push reliability on iOS, no app-store presence | ✅ Phase 1 — cheap, immediate    |
| Expo (React Native)       | True native feel, push, offline, stores                     | Parallel codebase; must share API only                 | ✅ Phase 2 — the real mobile app |
| Flutter                   | Fast UI, single codebase                                    | Dart team skills needed; not in repo today             | ⏸ optional later                 |

**Recommendation:** keep the PWA, then build the native app on **Expo
(React Native + TypeScript)** against the same `/api/v1` REST API with
session cookies (already CORS-ready and auth-bridge-free). A mobile API
variant (token-based login for the app) is a small addition:
`POST /auth/login/mobile` returning a bearer token scoped to the app.

### A2. Native app scope (Expo)

- **v1 (MVP):** Auth (email+code, Google), onboarding (reuse the 7-step
  flow as screens), cohort browsing, LMS student view (lessons, quizzes,
  assignments), payments via Paystack mobile SDK, notifications (Expo push).
- **v2:** Tutor app (teaching console: attendance, grading), parent app
  (receipts, progress reports), offline lesson caching, biometric unlock.
- **v3:** In-app live lessons (Jitsi/Google Meet embeds), wallet top-up,
  AI tutor (below).

### A3. Mobile plan phases

| Phase | Deliverable                                                                      | Est.    |
| ----- | -------------------------------------------------------------------------------- | ------- |
| M1    | PWA hardening: install manifest, offline shell, push via FCM/APNs service worker | 1–2 wks |
| M2    | Expo app scaffold + auth + onboarding screens (shared API)                       | 2–3 wks |
| M3    | Student LMS screens + quizzes + payments                                         | 3 wks   |
| M4    | Tutor + parent apps; TestFlight + Play internal tracks                           | 3 wks   |
| M5    | Store launch (App Store + Play) with privacy policy (GDPR/NDPR)                  | 1–2 wks |

**Foundations needed before M2:** token-based auth endpoint, refresh
token rotation, mobile push token registry (`POST /me/devices`), analytics
events parity.

---

## Part B — AI chatbot + human live chat (Google Gemini)

### B1. Product shape

- **AI assistant ("YK-Virtual Bot")** — humanlike chat on web + mobile:
  - Answers: programme/cohort/tutor questions, enrolment steps, fee info,
    session schedules, homework help (guarded), general support.
  - Does **not** handle: payments, account changes, refunds (hand off).
- **Live chat** — human agents take over seamlessly when the bot escalates
  (or on user request), using the existing messaging/notification service.

### B2. Architecture

```
Web (Next.js) / Mobile (Expo)
   │  POST /api/v1/chat {message, thread_id}   (SSE streaming)
   ▼
Chat Service (Go) — internal/service/chat_service.go (new)
   │
   ├─ Thread store (postgres: chat_threads, chat_messages, chat_escalations)
   ├─ Policy/guardrails layer (topic allowlist, PII redaction,
   │     rate limits, "human handoff" triggers)
   ├─ Context assembler (RAG): pulls real data (programmes, cohorts,
   │     fees, tutor bios, FAQs) from the existing services
   │     → grounded answers, no hallucinated pricing
   └─ Gemini API (gemini-2.x-flash via google.generativeai SDK,
        streaming) — system prompt = YK-Virtual brand + grounding data
        + tool-calling for: lookup programme, lookup cohort, create ticket
   ▼
Human handoff → existing messaging service → agent inbox (/support)
```

### B3. Gemini integration details

- **Model:** `gemini-2.0-flash` (or 2.5 at GA) for low-latency chat;
  temperature ~0.4; max output tokens ~500; `streaming` on.
- **Grounding (critical):** the bot never answers from memory — the Go
  service injects fresh catalogue/tutor/fee context per query (function
  calling: `get_programmes`, `get_cohort`, `get_tutors`, `get_faq`) so
  answers stay correct as the catalogue changes.
- **Guardrails:** input/output PII scrubbing; topic allowlist; refuse
  medical/legal/financial advice; age-appropriate defaults; prompt
  injection mitigation (system-prompt separation + output classifier).
- **Escalation triggers:** user asks for a human, sentiment negative,
  2 failed answers, payment/refund/account topics → create thread in the
  support queue with full transcript.
- **Cost model:** ~1–5k tokens/thread × ~10k threads/mo → well under
  $50/mo at flash pricing; cache frequent FAQ turns (Redis).

### B4. Chatbot plan phases

| Phase | Deliverable                                                       | Est.    |
| ----- | ----------------------------------------------------------------- | ------- |
| C1    | `chat` API + thread store + Gemini SDK wiring + streaming         | 1–2 wks |
| C2    | Web chat widget (AuthShell FAB → chat panel), guardrails          | 1 wk    |
| C3    | Grounding via function calling (catalogue, cohorts, tutors, FAQs) | 1–2 wks |
| C4    | Human handoff + agent inbox on `/support`; ratings                | 1 wk    |
| C5    | Mobile app chat + push notifications for agent replies            | 1 wk    |
| C6    | Analytics: deflection rate, CSAT, cost per thread; prompt evals   | 1 wk    |

### B5. Risks & mitigations

- **Hallucination** → grounding + refusal policy + "I'll check with a
  human" fallback; evaluation set of ~100 seeded Q&As in CI.
- **Abuse** → per-user rate limits (reuse middleware), topic allowlist,
  admin kill-switch env `CHATBOT_ENABLED=false`.
- **Data privacy** → no PII in prompts (redact before Gemini), retention
  policy for transcripts, NDPR/GDPR compliance notes.
- **Vendor lock** → thin `chatprovider` interface so Gemini can be swapped
  for OpenAI/Claude with one implementation.

---

## Suggested sequencing

1. **Phase 33:** Chatbot C1–C2 (API + widget) — highest visibility.
2. **Phase 34:** Mobile M1–M2 (PWA hardening + Expo scaffold).
3. **Phase 35:** Chatbot C3–C4 (grounding + handoff) + Mobile M3 (student LMS).
4. Later: M4–M5, C5–C6.
