# YKAY Virtual School — Build Plan to Tuteria-Level + Beyond

## Current State (Post-Clone)
- Repo: github.com/Teamthy/ykay-virtual cloned to /home/user/repo
- Frontend: Next.js 14 App Router with marketing shell mimicking Tuteria v2 (HeroCarousel, CategoryPills, TrustLogos, etc) — no TanStack Query actual usage, no API client, no SEO JSON-LD before this phase
- Backend: Go modular monolith simplified — flat internal/<domain>/handler+service in-memory slices, no Postgres, no repository pattern, no middleware, no pkg helpers, no migrations, no OpenAPI, no telemetry
- Infra: docker-compose postgres:16 + redis:7, no env.example, no Dockerfile
- Tests: service_test.go files exist but table-driven minimal, no testify mocks, no testcontainers, no Playwright, no k6

## What Was Just Completed (Phase 1 - Backend Domain & Schema)

### Migrations 000001-000010 (Tuteria parity + leapfrog)
- 000001_identity: users, roles, user_roles, sessions (token_hash UNIQUE), parent_profiles, student_profiles, parent_student_links (parent→linked students object-level authz), audit_logs (actor, action enum, target, IP, request_id, trace_id) — per AGENTS.md AuditService on money/access/tutor-status
- 000002_location: locations (country/state/city/area/custom) with slug UNIQUE, lat/long, seeded Nigeria/UK/US/CA
- 000003_institution: institutions (SCHOOL/CORPORATE/GOV/NGO), institution_memberships (OWNER/ADMIN/TEACHER/STUDENT/BILLING), institution_students — enables /for-schools + /corporate-training B2B flow that Tuteria lacks
- 000004_tutor_vetting: tutor_profiles (slug UNIQUE, display_name, bio, headline, years_experience, hourly_rate min/max, currency, status DRAFT→APPROVED, is_public, verified_at, rating_avg/count, total_hours/students, ranking_score, timezone, location, accepts_online/in_person), tutor_qualifications, tutor_documents (PRIVATE bucket file_key, file_name, document_status PENDING/APPROVED/REJECTED, reviewed_by), tutor_availabilities (day_of_week 0-6 + start/end TIME), availability_exceptions, vetting_events (stage ACCOUNT→ACTIVATION, from/to status, actor, notes), competency_assessments (subject FK, score/max, passed, expiry) — mirrors Tuteria 7 stages + ID verification + background checks + guarantor
- 000005_academics: curricula (BRITISH/NIGERIAN/DIGITAL/PROFESSIONAL/VOCATIONAL), levels (curriculum_id FK), subjects (slug UNIQUE, category Academic/Digital/Languages/Music/Exam Prep), exams (IGCSE/WAEC/NECO/JAMB/A-Level/IELTS/GMAT/GRE/SAT/TOEFL/ICAN/PTE/ACT — Tuteria parity), programmes (title/slug UNIQUE, summary/description, curriculum/level/exam FK, format COHORT/PRIVATE/BOOTCAMP/HOLIDAY/ONLINE_CLASS/HYBRID, status DRAFT/PUBLISHED/ARCHIVED, price_min/max, is_featured, seo_title/description, cover_image_key PUBLIC bucket), programme_subjects, tutor_subjects (tutor↔subject↔curriculum↔level, is_approved)
- 000006_booking: cohorts (programme_id FK, tutor_profile_id FK, capacity CHECK >0, enrolled_count, start/end DATE, schedule_description, timezone, location_mode ONLINE/IN_PERSON/HYBRID, fee, status DRAFT/PUBLISHED/FULL/ONGOING/COMPLETED/CANCELLED), cohort_enrollments (cohort_id FK, student_profile_id FK, parent_user_id FK, order_id FK, status PENDING/CONFIRMED/CANCELLED/REFUNDED/WAITLISTED UNIQUE cohort+student), private_tuition_requests (parent, student, subject, curriculum/level, goals, preferred days/time, timezone, location_mode, status PENDING/MATCHED/ASSIGNED/IN_PROGRESS/COMPLETED/CANCELLED, matched_tutor_id), private_packages (request_id FK, tutor, student, total_sessions CHECK>0, sessions_used, session_duration, price_per_session, total_price, valid_from/until), lessons (cohort_id OR private_package_id CHECK, tutor FK, title, start_at/end_at CHECK end>start, timezone, meeting_url/provider, location, status SCHEDULED/ONGOING/COMPLETED/CANCELLED/RESCHEDULED/NO_SHOW), lesson_participants, attendance (lesson+student UNIQUE, status PRESENT/ABSENT/LATE/EXCUSED, marked_by), lesson_notes (tutor+lesson, student optional, content/homework, is_visible_to_parent), resources (programme/cohort/lesson FK, file_key/file_url, is_public), assignments, submissions
- 000007_payment: wallets (user_id UNIQUE, balance CHECK >=0), orders (order_number UNIQUE, parent_user_id FK, student_profile_id, institution_id, status PENDING/PAID/FAILED/REFUNDED/CANCELLED, subtotal/discount/total CHECK>=0, idempotency_key UNIQUE), order_items (order FK, item_type COHORT/PRIVATE_PACKAGE/PRODUCT/FEE, reference_id, quantity CHECK>0, unit/total price), payments (order FK, provider PAYSTACK/FLUTTERWAVE/STRIPE/MANUAL/BANK_TRANSFER, provider_reference, amount, status PENDING/SUCCESS/FAILED/REFUNDED, paid_at), payment_webhooks (provider, provider_reference UNIQUE — idempotency per AGENTS.md, payload JSONB, signature_valid, processed), escrow_holds (order, payment, tutor FK, amount, status HELD/RELEASED/REFUNDED/DISPUTED, held_at/release_at), payouts (tutor, escrow_hold FK, amount, status PENDING/PROCESSING/PAID/FAILED, provider_ref), generate_order_number() function — implements Tuteria wallet+escrow (pay upfront, release after confirmation or 3-day auto) + SLO zero duplicate charges under 100 concurrent webhook load (unique constraint)
- 000008_messaging: conversations (type BOOKING/COHORT/SUPPORT/DIRECT, booking_id->private_packages, cohort_id, subject, is_closed), conversation_participants (conversation+user UNIQUE, joined_at, last_read_at, is_muted), messages (conversation FK, sender FK, type TEXT/IMAGE/FILE/SYSTEM, body, is_edited), message_attachments (message FK, file_key PRIVATE bucket), notifications (user FK, type, title/body, data JSONB, is_read), notification_templates (key UNIQUE, channel EMAIL/SMS/WHATSAPP/PUSH/IN_APP) — leapfrog over Tuteria WhatsApp-only, booking-scoped threads + Redis pub/sub fan-out per AGENTS.md
- 000009_review_referral: reviews (booking_id->private_packages, cohort_enrollment_id, reviewer_user_id, tutor_profile_id FK, rating 1-5 CHECK, title/comment, status PENDING/PUBLISHED/HIDDEN/FLAGGED, is_public, consent_given, moderated_by/at), review_responses (review FK, responder FK), referral_codes (user FK, code UNIQUE, is_active), referrals (referrer/referred FK, referral_code FK, order_id, reward_amount, status PENDING/QUALIFIED/REWARDED/EXPIRED UNIQUE referred_user), referral_rewards, redirect_map (from_slug UNIQUE, to_slug, type 301/302, created_by) — fixes Tuteria SEO gap: RedirectMap table + 301s for renamed slugs, proper 404s not soft-404
- 000010_content: blog_posts (title/slug UNIQUE, excerpt/content, cover_image_key PUBLIC, author FK, status DRAFT/SCHEDULED/PUBLISHED/ARCHIVED, seo_title/description, canonical_url, published_at/scheduled_at, view_count), blog_post_subjects (post FK ↔ subject FK), blog_post_exams (post↔exam), content_blocks (key UNIQUE, type TEXT/IMAGE/VIDEO/FAQ/TESTIMONIAL/CTA/CODE/QUOTE, body JSONB, is_active), testimonials (author, location, body, rating 1-5 CHECK, is_featured, consent_given, is_public — never fabricate), faqs (question/answer, category, order_index), support_tickets (user FK/email, subject/message, status OPEN/IN_PROGRESS/RESOLVED/CLOSED, assigned_to), progress_reports (student FK, tutor FK, cohort FK, period_start/end, strengths/weaknesses/recommendations, overall_rating 1-5) — Tuteria v2 lacks blog/content engine, hardcodes SEO copy; YKAY builds CMS from day 1 per SEO critical requirement

### Domain Entities (no framework imports per AGENTS.md)
- identity/entity.go: User, Role, UserRole, Session, ParentProfile, StudentProfile, ParentStudentLink, AuditLog + business rules IsActive/CanLogin
- tutor/entity.go: TutorProfile with IsApproved/CanTeach/CanTransitionTo state machine (DRAFT→SUBMITTED→UNDER_REVIEW→INTERVIEW→VERIFICATION→APPROVED, HOLD, REJECTED, SUSPENDED), Qualification, Document (file_key PRIVATE never expose raw), Availability, AvailabilityException, VettingEvent, CompetencyAssessment
- booking/entity.go: Cohort IsFull/CanEnroll, CohortEnrollment, PrivateTuitionRequest, PrivatePackage RemainingSessions, Lesson Overlaps check (prevents double-booking)
- payment/entity.go: Wallet, Order, OrderItem, Payment, PaymentWebhook, EscrowHold, Payout + PaymentProviderInterface VerifyWebhookSignature/CreatePaymentLink (abstraction over Paystack/Flutterwave/Stripe)
- content/entity.go: BlogPost, ContentBlock, RedirectMap, Testimonial
- review/entity.go: Review, ReviewResponse
- referral/entity.go: Referral, ReferralCode, Reward
- messaging/entity.go: Conversation, Participant, Message, Notification
- institution/entity.go: Institution, Membership with MembershipRole OWNER/ADMIN/TEACHER/STUDENT/BILLING
- location/entity.go: Location with Type COUNTRY/STATE/CITY/AREA/CUSTOM

### pkg (AGENTS.md shared helpers)
- pkg/pagination.go: PaginationParams Page/PageSize with Offset/Limit, PaginationMeta TotalItems/TotalPages/HasNext/HasPrev, ParsePaginationFromQuery with clamp max 100
- pkg/response.go: SuccessEnvelope {data, meta} and ErrorEnvelope {error:{code,message,details}} per AGENTS.md response envelope convention
- pkg/apierror.go: Typed error system Code enum BAD_REQUEST/UNAUTHORIZED/FORBIDDEN/NOT_FOUND/CONFLICT/VALIDATION_ERROR/INTERNAL/PAYMENT_REQUIRED/TOO_MANY_REQUESTS, AppError with StatusCode, IsAppError, helpers BadRequest/Unauthorized/Forbidden/NotFound/Conflict/Internal — HTTP status mapping only at transport layer per AGENTS.md
- pkg/validator.go: ValidateEmail regex, ValidateRequiredString, ValidateMinLength

### API Contract
- api/openapi.yaml: OpenAPI 3.0.3 contract-first with servers local+prod, tags identity/tutors/subjects/programmes/cohorts/bookings/payments/messaging/reviews/content/institutions/referrals, paths for auth/register/login, subjects list+slug (cached 60-300s TTL), tutors/search (Redis cached p95<300ms @500 VU), tutors/{slug} SSG+ISR Person+AggregateRating, programmes list, cohorts list, bookings POST transactional bounded pool no N+1, payments/webhooks/{provider} idempotent unique provider_reference signature-verified, reviews POST consent-gated booking-scoped, content/blog list subject/exam-tagged SSG+ISR Article, institutions POST B2B. Schemas User, Subject, SubjectDetail, TutorProfile, PaginatedSubjects/Tutors/Programmes, PaginationMeta, CreateReview.

### Infra per AGENTS.md
- internal/config/config.go: Config struct Port, DatabaseURL, RedisURL, JWTSecret, S3Endpoint/Public/Private/Region/Access/Secret, PaymentProvider, PaystackSecret, FlutterwaveSecret, Environment, OtelEndpoint, Load() from env with fallback
- internal/middleware: RequestID (X-Request-ID, UUID), Logger (structured log request_id/user_id/trace_id per AGENTS.md), Recover (panic→500 with pkg.WriteError), RateLimiter (sliding window in-memory placeholder, production go-redis)
- internal/cache/redis.go: Cache interface Get/Set/Del/Incr/Exists, InMemoryCache placeholder with TTL
- internal/storage/s3.go: Storage interface Upload/Delete/GeneratePresignedURL/GetPublicURL, BucketType public/private per AGENTS.md public+private bucket split, LocalStorage placeholder
- internal/payment/provider.go: PaymentProviderInterface VerifyWebhookSignature HMAC SHA512 (Paystack pattern)
- internal/telemetry/otel.go: InitTracer OTLP placeholder
- internal/worker/jobs.go: JobType enum send_email/send_sms/send_push/process_payment_webhook_async/generate_lesson_reminders (cron)/expire_stale_booking_holds (cron)/compute_tutor_ranking_score nightly/refresh_search_cache/process_weekly_tutor_payouts (cron)/generate_progress_reports/send_referral_rewards/cleanup_expired_uploads/regenerate_sitemaps (cron)/publish_scheduled_blog_posts (cron) per AGENTS.md, Worker Process idempotent retry with backoff placeholder
- cmd/api/main.go: wiring config, cache, storage, middleware chain request-id→logger→recover, health endpoint {"status":"ok","version":"phase-1"}, placeholder tutors/search + subjects handlers with envelope, graceful shutdown SIGINT/SIGTERM
- cmd/worker/main.go: config load, worker ticker 30s cron expire-stale-holds, signal handling
- cmd/migrate/main.go: flag cmd up/down/status, placeholder for goose/golang-migrate integration, reads DATABASE_URL

### Frontend SEO-First (Phase 6B started early to avoid Tuteria pitfalls)
- lib/seo.ts: SITE_URL, absoluteUrl, buildMetadata (canonical, OpenGraph, Twitter, robots noIndex), organizationJsonLd, breadcrumbJsonLd, courseJsonLd, personJsonLd with aggregateRating, faqJsonLd, articleJsonLd, reviewJsonLd
- lib/api.ts: apiFetch with X-Trace-ID/X-Request-ID UUID header per AGENTS.md trace-id header, envelope handling, apiFetchSSR with revalidate 300 ISR default for catalogue
- lib/queryClient.ts: makeQueryClient staleTime 60s default, qk query-key factory per feature tutors search/bySlug, subjects list/bySlug, programmes list/bySlug, bookings byStudent with factory pattern
- app/robots.ts: MetadataRoute.Robots allow /, /subjects/, /programmes/, /tutors/, /blog/, /online-classes, /for-schools, /corporate-training disallow /admin /api /student /parent /tutor /dashboard /account + sitemap line (fixes Tuteria missing Sitemap directive)
- app/sitemap.ts: dynamic sitemap index placeholder returns static routes /,/programmes,/subjects,/tutors,/online-classes,/for-schools,/corporate-training,/careers,/blog with changeFrequency hourly/daily/weekly priority 0.5-1, comment for Phase6B split by type filtered published/active/approved
- components/ui/button.tsx, card.tsx, skeleton.tsx: shadcn-style, class-variance-authority
- features/tutors/api/search.ts: Tutor type, SearchParams, searchTutors builds qs, envelope, tutorKeys from qk factory
- features/tutors/components/TutorCard.tsx: Link to /tutors/[slug] with rating + subject pills hover shadow
- features/subjects/api/list.ts
- app/(marketing)/online-classes/page.tsx: revalidate 600 ISR, generateMetadata via buildMetadata, breadcrumb + Course JSON-LD, cohort cards (IGCSE CS, JAMB Mastery 320+, WAEC Maths), how cohorts beat lead-gen marketplaces section — leapfrog over Tuteria Prep separate subdomain, single domain authority
- app/(marketing)/for-schools/page.tsx: institution entity explanation, bulk enrolment CSV, institution dashboard roles OWNER/ADMIN/TEACHER/STUDENT/BILLING audit-logged PII, pooled billing — what Tuteria lacks
- app/(marketing)/corporate-training/page.tsx: Digital Academy teams
- app/(marketing)/careers/page.tsx
- app/(marketing)/blog/page.tsx: revalidate 300, subject/exam-tagged posts mock, Link to /blog/[slug], note about content_blocks CMS vs Tuteria hardcoded JSX
- app/(marketing)/blog/[slug]/page.tsx: generateMetadata dynamic, fakeDB, breadcrumb + Article JSON-LD, RelatedContent internal linking note tutor↔subject↔programme↔blog
- app/(marketing)/tutors/[slug]/page.tsx: revalidate 3600 ISR, generateMetadata dynamic, mock tutors chinasa/oluwatobi with bio, breadcrumb + Person+AggregateRating + Review JSON-LD, ID Verified + Background Checked badge, Good Fit Guarantee note, book tutor escrow note — fixes Tuteria missing Person schema
- app/(marketing)/subjects/[slug]/page.tsx: revalidate 600, subjects math/cs/ielts-prep, breadcrumb+Course+FAQ JSON-LD, private tuition/cohort/blog CTAs with ?subject param URL-driven state per AGENTS.md rendering strategy SSR with URL-driven state
- app/(marketing)/programmes/[slug]/page.tsx: revalidate 600, mock igcse-cs with topics/faqs, breadcrumb+Course+FAQ JSON-LD, enrol CTA with escrow note idempotent webhook provider_reference UNIQUE

## Next Steps to Complete Phase 1 (Remaining per AGENTS.md)

### Repository Layer
- internal/repository/postgres: Implement UserRepository, SessionRepository, ParentProfileRepository, StudentProfileRepository, TutorProfileRepository, SubjectRepository (with Redis cache 60-300s TTL invalidate on write), ProgrammeRepository, etc. Interface implementations per domain repository interfaces, typed errors mapped to HTTP only at transport layer.

### Service Orchestration
- internal/service: use-case orchestration per domain, context.Context propagated end-to-end, DB transactions on money-affecting mutations (orders, payments, escrow), AuditService on state change money/access/tutor-status.

### Transport Layer
- internal/transport/http: handlers, DTOs, validation (client+server), response envelope, shared pagination/filter helper (?page,?page_size,?sort,?filter[x]) per AGENTS.md.
- Add middleware/auth (httpOnly cookie session), middleware/authz (object-level: parent→linked students only, tutor→assigned bookings only) enforced in service layer not UI.

### Frontend Completion
- Need to migrate existing client/app/page.tsx homepage to use new lib/seo and features/tutors search infinite query.
- Convert public marketing pages to SSR/SSG/ISR never client-only (already done for new marketing pages, but existing tabs still CSR).
- Add generateMetadata to all existing routes, canonical, JSON-LD.
- Implement RelatedContent component tutor↔subject↔programme↔blog.
- Implement breadcrumbs everywhere visual+schema.

### Testing
- Go unit table-driven testify mocked repos (existing service_test.go minimal)
- Go integration testcontainers-go real Postgres+Redis in CI
- Frontend unit Vitest+RTL+MSW (need setup)
- E2E Playwright critical journeys docker-compose full stack
- k6 load testing 500 VU search + 100 VU payment webhook idempotency
- Security govulncheck npm audit gitleaks ZAP baseline authz matrix — need CI.

### Migration Runner
- Integrate golang-migrate or goose in cmd/migrate to run /migrations/*.up.sql
- Test migrations up/down locally via docker-compose postgres

### Env Vars Required (from config)
DATABASE_URL, REDIS_URL, JWT_SECRET, S3_ENDPOINT, S3_PUBLIC_BUCKET, S3_PRIVATE_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, PAYMENT_PROVIDER, PAYSTACK_SECRET, FLUTTERWAVE_SECRET, ENVIRONMENT, OTEL_EXPORTER_OTLP_ENDPOINT, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_API_URL

## How to Run Locally Now

1. docker-compose up -d postgres redis
2. go run ./cmd/migrate --cmd=up (once goose integrated)
3. go run ./cmd/api (new entrypoint) or go run ./server/cmd/server (old flat, still works but deprecated) — will listen :8080
4. npm --prefix client run dev — Next.js on :3000 with new SEO pages /online-classes etc.

## Risks / Deviations Flagged

- Deviation from AGENTS.md /cmd/server vs /cmd/api: existing server/cmd/server/main.go uses flat handlers, not repository pattern. New cmd/api/main.go uses new structure but placeholder handlers. Flag: need to deprecate old server/cmd/server in Phase 2, migrate logic to internal/transport/http + service + repository.
- No go binary in sandbox — go.mod manually edited with uuid v1.6.0, lib/pq, go-redis v9, godotenv. Need go install in CI.
- Frontend still uses unsplash images not next/image everywhere AVIF/WebP — need next/image conversion for Core Web Vitals LCP<2.5s per AGENTS.md SEO budgets.
- No Lighthouse CI gate yet — need to add in CI/CD.
- No background worker real Redis queue — InMemoryCache placeholder, need go-redis + asynq or equivalent.

## Output Delivery Protocol Note

Per AGENTS.md Output Delivery Protocol — Never commit/push directly. Output files via FILE blocks.

This plan + parity analysis + Phase1 migrations/entities/pkg/openapi/config/middleware/cache/storage/telemetry/worker/cmd/frontend SEO pages have been created as COMPLETE file contents in this phase.

Next commit should be:
branch: feature/phase-01-domain-schema
commit_message: "feat(domain): full schema Location,Institution,BlogPost,Referral,RedirectMap,Review + pkg + openapi + SEO base"
