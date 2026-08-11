# YKAY vs Tuteria — Parity + Leapfrog Analysis
Date: 2026-08-11

## What Tuteria v2 Has (Audited via https://v2.tuteria.com/)

### Core Product
- Lead-gen marketing: 8 public pages (/, /services, /hometutors, /gmat, /ielts, /gre, /sat, /toefl, /ican, /contact) — Next.js SSR, Cloudinary+ImageKit, WhatsApp CTA, Filesafe chat widget.
- Legacy marketplace on www.tuteria.com: 245 subjects, 16 categories, subject pages /basic-math-tutors/, wallet + escrow (15-30% fee, 70%→85% tutor take-home, 3-day auto-confirm, 24h payout), Good Fit Guarantee first hour, two-way reviews, reputation score, trust & safety 24/7.
- Tutor acquisition funnel tutors.tuteria.com: ₦516M earnings, 358K+ hours, 23,235 students, 200+ subjects, 7 stages (app, subjects, test, profile, gov ID + social + guarantor docs, lengthy interview, approval), Telegram community.
- Cohort products: tuteriaprep.com/utme (UTME 100+ live, 200+ exams, 10+ mocks, ₦35k/₦52.5k, ₦20M scholarship, top scores 341/338/317, OTP via SMS/WhatsApp), medbuddyacademy.com (HCA 3mo CPD/AOHT $200, clinical internship, 3,653+), Tuteria Plus premium 70% discount intl (+44).
- Payments: No Stripe snippet on v2; advisor sends Paystack/Flutterwave link after WhatsApp qualification. Legacy help says wallet load, escrow hold.
- Messaging: WhatsApp primary (+447465654119 GB, +2347063726773 NG, 09064631051 calls), email info@tuteria.com, no booking-scoped inbox observable on v2 (legacy /account likely has inbox).

### SEO (Weak)
- sitemap.xml returns 200 soft-404: "The exam sitemap.xml isn't available" — critical bug, causes index bloat.
- robots.txt: Disallow /account only, no Sitemap: line, no disallow private portals.
- Metadata: homepage title good, exam pages unique titles, but /services title bug duplicates contact title.
- No JSON-LD: no Organization, Course, Person+AggregateRating, FAQPage, BreadcrumbList, Article, Review.
- No canonical detection, no breadcrumbs, weak internal linking (only 8 service links + leaks to legacy domain), no RelatedContent tutor↔subject↔programme↔blog.
- Mixed CDN Cloudinary + ImageKit = extra DNS, no next/font self-hosted visibility, chat widget maybe render-blocking.
- No blog/content engine — SEO copy hardcoded in JSX, not CMS.
- No Lighthouse CI gate.

---

## What Tuteria Doesn't Have (Gaps YKAY Can Exploit)

1. **Unified domain**: v2, www, tuteriaprep, hca, plus splintered → splits domain authority. YKAY keeps /prep/utme, /hca, /premium under one domain.
2. **True self-serve marketplace**: v2 is form→human advisor; no instant search/filter/book/pay/tracking. High-touch works in Nigeria trust low, but not scalable to 10k users, 300-800 concurrent. YKAY offers self-serve + advisor fallback.
3. **Blog/Content CMS**: No Article schema, no subject/exam-tagged posts. SEO growth limited to landing pages. YKAY builds BlogPost CMS with scheduled publishing, SEO templates, related content graph — primary growth channel per AGENTS.md.
4. **B2B institutional accounts**: No institutions table, no membership roles, no pooled billing. YKAY adds: institutions, institution_memberships, institution_students, roles OWNER/ADMIN/TEACHER/STUDENT/BILLING, for-schools + corporate-training pages.
5. **Proper escrow automation**: Legacy mentions 3-day auto-release but likely manual. YKAY implements: wallets, escrow_holds, payouts, payment_webhooks with provider_reference UNIQUE (idempotent webhook), expire_stale_booking_holds cron, process_weekly_tutor_payouts cron, zero duplicate charges SLO 100 VU payment load test.
6. **Booking-scoped messaging**: WhatsApp external loses audit trail, safeguarding risk for minors. YKAY: conversations (booking, cohort, support, direct), conversation_participants with last_read_at, messages with type TEXT/IMAGE/FILE/SYSTEM, message_attachments (private bucket signed URLs), Redis pub/sub fan-out, notification center in-app + email/SMS/WhatsApp adapters.
7. **Staged vetting transparency**: Tuteria vetting docs in PRIVATE bucket but no API signed URL flow described publicly. YKAY enforces server-side authz check before signed URL generation, vetting_events timestamped + attributable, competency_assessments with score, expiry.
8. **Reviews consent-gated**: Tuteria hardcodes testimonials, not Review schema. YKAY: reviews with is_public + consent_given + moderation, review_responses, aggregate rating recomputed, Person+Review JSON-LD only when consent true.
9. **Referral program**: Not observed. YKAY: referral_codes, referrals, referral_rewards, send_referral_rewards worker.
10. **SEO infrastructure done right**: canonical on every page, noindex thin filter combos, JSON-LD builders (Org home, Course programmes, Person+AggregateRating tutors, FAQPage exam pages, BreadcrumbList all nested, Article blog, Review), slug URLs never raw DB IDs, RedirectMap 301 for renamed slugs, proper 404s never soft-404, sitemap index split by type (tutors/subjects/programmes/blog/pages) filtered published/active/approved only, regenerated via cron, robots.txt Allow public Allow / + Disallow /admin /api /student /parent /tutor + Sitemap line, Core Web Vitals budgets LCP<2.5s INP<200ms CLS<0.1, next/image everywhere AVIF/WebP lazy below-fold, next/font self-hosted, no render-blocking third-party above fold, Lighthouse CI gate fail build if <90.
11. **Observability**: No structured logs with request_id/user_id/trace_id mentioned. YKAY: OpenTelemetry, Prometheus/Grafana, AuditService on every money/access/tutor-status change, context.Context propagated end-to-end.
12. **Testing pyramid**: Tuteria has no public tests. YKAY per AGENTS.md: Go unit table-driven testify mocked repos, integration testcontainers real Postgres+Redis in CI, frontend Vitest+RTL+MSW, E2E Playwright docker-compose full stack, k6 load 500 VU search + 100 VU payment-webhook, security govulncheck npm audit gitleaks ZAP baseline authz matrix.

---

## YKAY Parity → Leapfrog Matrix

| Domain | Tuteria Has | YKAY Phase 1 (This Repo) | YKAY Leapfrog |
|---|---|---|---|
| Public marketing | v2 Next.js 7 landing pages SSR | YKAY clone HeroCarousel, CategoryPills already (site-data.ts) — now adding /online-classes /for-schools /corporate-training /careers /blog + SEO builders | YKAY adds ISR, JSON-LD, sitemap index, canonical, internal linking RelatedContent |
| Marketplace search | Legacy /explore 245 subjects, but not on v2 | Placeholder /api/v1/tutors/search cached, pending Postgres repo | Redis cached tutor search 60-300s TTL invalidate on write, p95<300ms @500VU |
| Tutor profiles | Carousel sample Oluwatobi 4.6 20 reviews | POST /tutors in-memory — now domain tutor_profile with slug UNIQUE, rating, ranking_score, location, is_public | SSG tutor/[slug] with Person+AggregateRating, good fit guarantee badge |
| Subjects | /basic-math-tutors/ | subjects table + programme_subjects + tutor_subjects | subject/[slug] SSG+ISR with Course+FAQ+Breadcrumb, related tutors/programmes/blog |
| Programmes | Not distinct from subjects (?) | programmes table per curriculum/level/exam/format | programme/[slug] Course JSON-LD reusable template not hardcoded |
| Cohorts | tuteriaprep.com UTME separate subdomain | cohorts + cohort_enrollments tables | Cohort engine inside main domain, same wallet auth |
| Private tuition | Home tutoring /hometutors physical/online | private_tuition_requests + private_packages | Escrow + booking-scoped messaging |
| Vetting | 7 stages described | tutor_profiles status enum DRAFT→APPROVED, vetting_events, documents PRIVATE bucket, competency_assessments | Staged workflow + quiz engine + admin review queue (TanStack Table) |
| Payments | Wallet + escrow help/topic/60 | wallets, orders, order_items, payments, payment_webhooks UNIQUE provider_reference, escrow_holds, payouts | Idempotent webhook zero duplicate charges SLO, split-payment logic, provider interface Paystack/Flutterwave/Stripe |
| Messaging | WhatsApp external only | conversations + participants + messages tables | Booking-scoped threads, Redis pub/sub real-time, notification center |
| Reviews | Two-way legacy | reviews + review_responses with consent flag | Consent-gated public Reviews + aggregate recompute + Review JSON-LD |
| Referrals | None observed | referrals tables | Referral engine + reward worker |
| B2B | Mention but not live | institutions + memberships | /for-schools + corporate-training flow |
| Blog | None on v2 | blog_posts + content_blocks | Phase 9 BlogPost CMS admin editor subject/exam-tagged |
| Admin | Not public | admin handler placeholder | Full console per PRD + TanStack Table server pagination/sort/filter |
| Observability | None | middleware request-id logger recover, telemetry placeholder | OTel + Prometheus + Grafana dashboards + alerting |
| Infra | Cloudinary+ImageKit, maybe Vercel | docker-compose postgres+redis, S3 client public/private split | Docker pipeline Lighthouse gate, cloud deploy, DR runbook |

---

## Immediate Build Order (16 Phases from AGENTS.md)

**Phase 0 (Done):** Architecture.md, prd.md, audit — existing repo scaffold.

**Phase 1 (Current — Backend domain & schema completion):**
- 000001-000010 migrations covering identity, location, institution, tutor vetting, academics, booking, payment, messaging, review/referral, content (this commit)
- Domain entities: identity, tutor, booking, payment, content, review, referral, messaging, institution, location (done)
- pkg pagination, response envelope, apierror, validator (done)
- api/openapi.yaml contract-first (done)
- internal/config, middleware (request-id, logger, recover, rate-limit), cache (Redis wrapper placeholder), storage (S3 public/private), payment provider interface, telemetry OTel placeholder, worker jobs (done)
- cmd/api, cmd/worker, cmd/migrate entrypoints (done)
- Missing to finish Phase1: repository interfaces in domain, postgres implementations in internal/repository/postgres, service orchestration with transactions, integration tests with testcontainers.

**Phase 2 (Next):** Core marketplace API — tutors, subjects, search endpoint with Redis caching (60-300s TTL), tutor/subject frontend hooks + pages (features/tutors/api/search.ts done, need backend handler + cache invalidate).

**Phase 3:** Booking, packages & escrow payment engine — Order→Payment→Escrow→Release, idempotent webhooks keyed on provider_reference UNIQUE.

**Phase 4:** Tutor vetting pipeline & competency assessment — staged workflow, quiz engine, admin queue.

**Phase 5:** Messaging & notifications — booking-scoped conversations, real-time delivery via Redis pub/sub, notification center.

**Phase 6:** Public marketplace frontend completion — All marketing pages including online-classes, for-schools, corporate-training, careers (done), plus programmes, subjects polish.

**Phase 6B:** SEO & discoverability — metadata templates per route (buildMetadata done), JSON-LD builders (done), sitemaps (done), slugs, SSR/SSG conversion, Lighthouse CI.

**Phase 7:** Student/Parent dashboard — per PRD A.3

**Phase 8:** Tutor dashboard — availability, wallet

**Phase 9:** Blog/content engine — BlogPost CMS, admin editor, subject/exam-tagged.

**Phase 10:** Reviews, referrals, institutional — Review/response model, referral program, /for-schools + /corporate-training B2B flow.

**Phase 11:** Admin console — full per PRD incl. blog/institution/referral modules with TanStack Table.

**Phase 12:** Search ranking & growth loop — ranking score nightly job, related-content internal linking.

**Phase 13:** Observability — OTel, Prometheus, dashboards, alerting.

**Phase 14:** Load & security testing — k6 500 VU search 100 VU payment, ZAP, authz matrix.

**Phase 15:** CI/CD, infra & launch readiness — Docker, pipeline with Lighthouse gate, cloud deploy, DR runbook.

**Phase 16:** Post-launch SEO ops — GSC/Bing setup, sitemap submission automation, CWV field-data monitoring.

---

## Key Decisions Resolved (formerly open)

- Geography: Nigeria primary (Africa/Lagos default timezone) + international support (UK/US/CA via locations + tutoring plus premium)
- Payment provider: Paystack primary (Nigeria) + Flutterwave fallback + Stripe international — behind PaymentProvider interface, webhook signature-verified
- Tutor matching: Managed matching + marketplace discovery hybrid — admin can disable public marketplace via is_public flag, but still have managed assignment via private_tuition_requests matched_tutor_id
- Video: Lightweight link-based MVP (meeting_url + meeting_provider GOOGLE_MEET/ZOOM/MS_TEAMS) — provider selection later via adapters
- Session strategy: httpOnly cookie session (sessions table token_hash UNIQUE) + rotation on privilege change, not JWT passthrough (per AGENTS.md)
- File storage: S3-compatible client public + private bucket split — vetting docs, message attachments, submissions in PRIVATE with signed URLs, server authz check first; cover images, blog covers in PUBLIC with CDN
- Notification: internal queue (worker jobs) + adapters email/SMS/WhatsApp/push/in_app via notification_templates table

---

## What to Avoid Copying from Tuteria

- Don't copy soft-404 sitemap.xml returning 200
- Don't leak domain authority across 4 domains — keep under ykayvirtual.com
- Don't hardcode SEO copy in JSX — use content_blocks CMS
- Don't rely solely on personal WhatsApp numbers — use official WhatsApp Business API + in-app messaging with audit trail
- Don't use two CDNs — single S3+CloudFront with next/image AVIF/WebP
- Don't store tutor docs public — PRIVATE bucket + signed URLs

---

## Success Metrics (Tuteria Baseline to Beat)

- Tuteria: 10k+ tutors, 280k+ lessons, 38k+ students, 95% success rate, 8.0 IELTS avg, 720 GMAT avg, ₦516M paid.
- YKAY Targets: ~10k registered users, 300-800 concurrent peak, p95 <300ms at 500 VU search, zero duplicate charges under 100 concurrent payment-webhook load, LCP<2.5s INP<200ms CLS<0.1, Lighthouse >90 Perf/SEO/A11y on key templates, sitemap indexed 100% valid, no soft-404s.
