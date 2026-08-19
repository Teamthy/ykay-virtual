# YKAY Virtual School — Working Document Gap Analysis
Status: 2026 · Compiled from repository evidence (routes, services, entities, UI) vs docs/WORKING_DOCUMENT.md.

Legend: ✅ Implemented · ⚠️ Partial · ❌ Not implemented / missing

---

## 1. Executive / positioning
- ✅ Academically-governed platform (vetting, programmes, QA) — implemented.
- ✅ Multi-curriculum (British + Nigerian) — implemented.
- ✅ Multiple learning modes (private, cohort, exam prep) — implemented.
- ✅ Parent visibility (dashboard) — implemented.
- ✅ Teacher opportunity (tutor application + vetting) — implemented.

## 2. Scope: MVP
| MVP item | Status | Notes |
|---|---|---|
| Marketing site + catalogue | ✅ | Full SEO marketing site |
| Student/parent registration | ✅ | /auth/register |
| Tutor application + admin approval | ✅ | /vetting + /admin/vetting |
| Private lesson request/booking | ⚠️ | Request form exists; booking/package flow is partial |
| Cohort application/enrolment | ✅ | /cohorts + enrol |
| Payment gateway integration | ✅ | Paystack/Flutterwave webhooks |
| Lesson scheduling + meeting links | ✅ | lessons + meeting-link endpoints |
| Student/parent/tutor/admin dashboards | ✅ | 4 dashboards |
| Attendance + tutor lesson notes | ✅ | /attendance, /notes |
| Resources/assignments | ✅ | resources + assignments |
| Basic progress report | ✅ | /progress-reports |
| Email/SMS/WhatsApp notifications | ⚠️ | Email + SMS wired; **WhatsApp not wired** |
| Support/contact workflow | ✅ | /support/tickets |

**Gaps found in MVP:**
- ❌ **Private tuition end-to-end booking/payment** is the weakest link — a request form exists but a full private-package purchase flow (price → package → schedule → pay → activate) is not a complete first-class journey.
- ⚠️ **WhatsApp notifications** referenced in the working doc but no provider adapter is wired (email/SMS only).
- ⚠️ **Referral/coupon** exists (referrals) but no coupon/discount engine in payments.

## 3. Phase 2 / Future
- ⚠️ Automated assessments/question banks — assessment create/start/submit exists; full question-bank auto-marking is partial.
- ✅ Tutor payouts/wallet — payouts + escrow implemented (Phase 2 items already built).
- ❌ Recorded lesson library — video upload/offline exists but no full recorded-library CMS.
- ❌ Certificates — not implemented.
- ⚠️ Referral engine — implemented (not coupon).
- ⚠️ Advanced analytics — funnel/fill/revenue present.
- ⚠️ Institutional/school accounts — institutions list exists; full B2B workflow partial.
- ❌ Formal admissions, timetable/subject registration, term structure, homeroom/pastoral, transcripts, assemblies, accreditation — **not implemented** (future virtual school).

## 4. Site structure
- ✅ All public routes present (Home, About, Programmes, British, Nigerian, Exam Prep, Subjects, Private Tuition, Cohorts, Digital Skills, Find a Tutor, Become a Tutor, How It Works, Pricing, Success Stories, Resources, Contact).
- ⚠️ **Exam prep** — now includes IGCSE, WAEC, NECO, JAMB, A-Level, **SAT** (added). GCE is covered by A-Level ("GCE Advanced Level").

## 5. Functional Requirements (FR)
| FR | Status |
|---|---|
| FR-01 Role-based auth + reset | ✅ |
| FR-02 Parent links learners | ✅ |
| FR-03 Admin manages curricula/levels/subjects/programmes | ⚠️ admin cohorts yes; curricula/levels admin UI partial |
| FR-04 Admin create/publish cohorts | ✅ |
| FR-05 Filter/search programmes | ✅ |
| FR-06 Enrol subject to capacity/payment | ✅ |
| FR-07 Private-tuition request | ✅ |
| FR-08 Admin assigns tutor | ✅ |
| FR-09 Tutor sets availability | ✅ |
| FR-10 No double-booking | ⚠️ partial — needs explicit conflict check on lessons |
| FR-11 Meeting links | ✅ |
| FR-12 Attendance | ✅ |
| FR-13 Lesson notes/resources/homework | ✅ |
| FR-14 Student view resources + submit assignments | ✅ |
| FR-15 Parent view linked learner | ✅ |
| FR-16 Staged vetting + documents | ✅ |
| FR-17 Admin approve/suspend tutor | ✅ |
| FR-18 Idempotent payment update | ✅ |
| FR-19 Configurable notifications | ⚠️ templates exist, WhatsApp missing |
| FR-20 Auditable admin actions | ✅ |
| FR-21 Content admins publish w/o deploy | ✅ (blog/testimonial sign-off) |
| FR-22 Trackable support | ✅ |
| FR-23 Cancellation/reschedule states | ⚠️ attendance/lesson states exist; full reschedule flow partial |
| FR-24 CSV/PDF reports | ✅ CSV exports exist |
| FR-25 Programme visibility + enrolment windows | ⚠️ publish/unpublish yes; enrolment windows partial |

## 6. Data model
- ✅ Nearly all core entities present (User, Roles, Parent/Student profiles, Tutor profiles, Vetting events, Curriculum, Level, Subject, Exam, Programme, Cohort, Enrolment, Lessons, Attendance, Notes, Resources, Assignments, Submissions, Orders, Payments, Escrow, Payouts, Notifications, Support, Content, Testimonials, AuditLog).
- ⚠️ **PrivatePackage** exists; **Refund** modelled; **TutorPayout** exists.
- ❌ **Certificate** entity — missing (future).
- ⚠️ **ProgressReport** exists (basic).

## 7. Roles & Permissions
- ✅ Roles: STUDENT, PARENT, TUTOR, ACADEMIC_ADMIN, SUPER_ADMIN, INSTITUTION_ADMIN.
- ✅ Object-level authz (profile authorizer, order ownership, conversation participants).
- ✅ Super-admin user/role management.
- ⚠️ Institutional admin scoping — declared but full institution-scoped permission enforcement is partial.

## 8. Security / Safeguarding
- ✅ TLS, bcrypt, sessions, rate limiting, CORS fail-closed, secure uploads, audit trail.
- ✅ Booking-scoped messaging (no direct contact).
- ✅ Parent-linked minors only.
- ✅ Privacy/terms/tutor agreement/cancellation/safeguarding policies (docs/legal).
- ⚠️ **MFA for admins** — not implemented (recommended by working doc).
- ⚠️ **Malware scanning** for uploads — size/MIME validated; scanning strategy not implemented.

## 9. Acceptance Criteria
- ✅ AC-01 parent end-to-end enrolment.
- ✅ AC-02 tutor not approved before admin approval.
- ✅ AC-03 attendance only assigned.
- ✅ AC-04 no cross-family access (IDOR protected).
- ⚠️ AC-05 no double-booking — needs explicit overlap guard.
- ✅ AC-06 idempotent payment webhook.
- ⚠️ AC-07 reschedule updates dashboards — partial.
- ✅ AC-08 resource access control.
- ✅ AC-09 publish programme without deploy.
- ✅ AC-10 tutor files not public.
- ✅ AC-11 mobile flow works.
- ✅ AC-12 admin changes audited.

## 10. Top gaps to close for production readiness
1. **Private tuition full purchase journey** (request → package → schedule → pay → activate) — highest-value missing flow.
2. **Double-booking guard** (FR-10 / AC-05) — enforce explicit overlapping-lesson check for a tutor.
3. **MFA for admin accounts** — recommended by the working doc, not yet implemented.
4. **WhatsApp notifications** — working doc lists it; only email/SMS wired.
5. **Upload malware scanning** — MIME/size validated, no AV scan.
6. **Coupon/discount engine** — Phase 2, referenced.
7. **Certificates / recorded-library / full virtual-school** — Phase 2+/future.
