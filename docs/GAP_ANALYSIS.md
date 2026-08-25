# YKAY Virtual School â€” Working Document Gap Analysis
Status: 2026 Â· Compiled from repository evidence (routes, services, entities, UI) vs docs/WORKING_DOCUMENT.md.

Legend: âœ… Implemented Â· âš ï¸ Partial Â· âŒ Not implemented / missing

---

## 1. Executive / positioning
- âœ… Academically-governed platform (vetting, programmes, QA) â€” implemented.
- âœ… Multi-curriculum (British + Nigerian) â€” implemented.
- âœ… Multiple learning modes (private, cohort, exam prep) â€” implemented.
- âœ… Parent visibility (dashboard) â€” implemented.
- âœ… Teacher opportunity (tutor application + vetting) â€” implemented.

## 2. Scope: MVP
| MVP item | Status | Notes |
|---|---|---|
| Marketing site + catalogue | âœ… | Full SEO marketing site |
| Student/parent registration | âœ… | /auth/register |
| Tutor application + admin approval | âœ… | /vetting + /admin/vetting |
| Private lesson request/booking | âš ï¸ | Request form exists; booking/package flow is partial |
| Cohort application/enrolment | âœ… | /cohorts + enrol |
| Payment gateway integration | âœ… | Paystack/Flutterwave webhooks |
| Lesson scheduling + meeting links | âœ… | lessons + meeting-link endpoints |
| Student/parent/tutor/admin dashboards | âœ… | 4 dashboards |
| Attendance + tutor lesson notes | âœ… | /attendance, /notes |
| Resources/assignments | âœ… | resources + assignments |
| Basic progress report | âœ… | /progress-reports |
| Email/SMS/WhatsApp notifications | âš ï¸ | Email + SMS wired; **WhatsApp not wired** |
| Support/contact workflow | âœ… | /support/tickets |

**Gaps found in MVP:**
- âŒ **Private tuition end-to-end booking/payment** is the weakest link â€” a request form exists but a full private-package purchase flow (price â†’ package â†’ schedule â†’ pay â†’ activate) is not a complete first-class journey.
- âš ï¸ **WhatsApp notifications** referenced in the working doc but no provider adapter is wired (email/SMS only).
- âš ï¸ **Referral/coupon** exists (referrals) but no coupon/discount engine in payments.

## 3. Phase 2 / Future
- âš ï¸ Automated assessments/question banks â€” assessment create/start/submit exists; full question-bank auto-marking is partial.
- âœ… Tutor payouts/wallet â€” payouts + escrow implemented (Phase 2 items already built).
- âŒ Recorded lesson library â€” video upload/offline exists but no full recorded-library CMS.
- âŒ Certificates â€” not implemented.
- âš ï¸ Referral engine â€” implemented (not coupon).
- âš ï¸ Advanced analytics â€” funnel/fill/revenue present.
- âš ï¸ Institutional/school accounts â€” institutions list exists; full B2B workflow partial.
- ðŸš§ **Virtual school build started** â€” see `docs/VIRTUAL_SCHOOL_PLAN.md`. Pillar 1 (academic sessions & terms) backend shipped 2026-08-25 (migration 000063, admin + public API, `cohorts.term_id` anchor).
- âœ… Term structure â€” sessions/terms with lifecycles, overlap guards, one-ACTIVE-per-scope, enrolment windows (admin UI pending).
- âŒ Timetable/subject registration, homeroom/pastoral, transcripts, assemblies, accreditation â€” **not implemented** (Pillars 2â€“7 in the plan). Formal admissions exists at âš ï¸ (applications + review; no document uploads/fees wiring yet).

## 4. Site structure
- âœ… All public routes present (Home, About, Programmes, British, Nigerian, Exam Prep, Subjects, Private Tuition, Cohorts, Digital Skills, Find a Tutor, Become a Tutor, How It Works, Pricing, Success Stories, Resources, Contact).
- âš ï¸ **Exam prep** â€” now includes IGCSE, WAEC, NECO, JAMB, A-Level, **SAT** (added). GCE is covered by A-Level ("GCE Advanced Level").

## 5. Functional Requirements (FR)
| FR | Status |
|---|---|
| FR-01 Role-based auth + reset | âœ… |
| FR-02 Parent links learners | âœ… |
| FR-03 Admin manages curricula/levels/subjects/programmes | âš ï¸ admin cohorts yes; curricula/levels admin UI partial |
| FR-04 Admin create/publish cohorts | âœ… |
| FR-05 Filter/search programmes | âœ… |
| FR-06 Enrol subject to capacity/payment | âœ… |
| FR-07 Private-tuition request | âœ… |
| FR-08 Admin assigns tutor | âœ… |
| FR-09 Tutor sets availability | âœ… |
| FR-10 No double-booking | âš ï¸ partial â€” needs explicit conflict check on lessons |
| FR-11 Meeting links | âœ… |
| FR-12 Attendance | âœ… |
| FR-13 Lesson notes/resources/homework | âœ… |
| FR-14 Student view resources + submit assignments | âœ… |
| FR-15 Parent view linked learner | âœ… |
| FR-16 Staged vetting + documents | âœ… |
| FR-17 Admin approve/suspend tutor | âœ… |
| FR-18 Idempotent payment update | âœ… |
| FR-19 Configurable notifications | âš ï¸ templates exist, WhatsApp missing |
| FR-20 Auditable admin actions | âœ… |
| FR-21 Content admins publish w/o deploy | âœ… (blog/testimonial sign-off) |
| FR-22 Trackable support | âœ… |
| FR-23 Cancellation/reschedule states | âš ï¸ attendance/lesson states exist; full reschedule flow partial |
| FR-24 CSV/PDF reports | âœ… CSV exports exist |
| FR-25 Programme visibility + enrolment windows | âš ï¸ publish/unpublish yes; enrolment windows partial |

## 6. Data model
- âœ… Nearly all core entities present (User, Roles, Parent/Student profiles, Tutor profiles, Vetting events, Curriculum, Level, Subject, Exam, Programme, Cohort, Enrolment, Lessons, Attendance, Notes, Resources, Assignments, Submissions, Orders, Payments, Escrow, Payouts, Notifications, Support, Content, Testimonials, AuditLog).
- âš ï¸ **PrivatePackage** exists; **Refund** modelled; **TutorPayout** exists.
- âŒ **Certificate** entity â€” missing (future).
- âš ï¸ **ProgressReport** exists (basic).

## 7. Roles & Permissions
- âœ… Roles: STUDENT, PARENT, TUTOR, ACADEMIC_ADMIN, SUPER_ADMIN, INSTITUTION_ADMIN.
- âœ… Object-level authz (profile authorizer, order ownership, conversation participants).
- âœ… Super-admin user/role management.
- âš ï¸ Institutional admin scoping â€” declared but full institution-scoped permission enforcement is partial.

## 8. Security / Safeguarding
- âœ… TLS, bcrypt, sessions, rate limiting, CORS fail-closed, secure uploads, audit trail.
- âœ… Booking-scoped messaging (no direct contact).
- âœ… Parent-linked minors only.
- âœ… Privacy/terms/tutor agreement/cancellation/safeguarding policies (docs/legal).
- âš ï¸ **MFA for admins** â€” not implemented (recommended by working doc).
- âš ï¸ **Malware scanning** for uploads â€” size/MIME validated; scanning strategy not implemented.

## 9. Acceptance Criteria
- âœ… AC-01 parent end-to-end enrolment.
- âœ… AC-02 tutor not approved before admin approval.
- âœ… AC-03 attendance only assigned.
- âœ… AC-04 no cross-family access (IDOR protected).
- âš ï¸ AC-05 no double-booking â€” needs explicit overlap guard.
- âœ… AC-06 idempotent payment webhook.
- âš ï¸ AC-07 reschedule updates dashboards â€” partial.
- âœ… AC-08 resource access control.
- âœ… AC-09 publish programme without deploy.
- âœ… AC-10 tutor files not public.
- âœ… AC-11 mobile flow works.
- âœ… AC-12 admin changes audited.

## 10. Top gaps to close for production readiness
1. **Private tuition full purchase journey** (request â†’ package â†’ schedule â†’ pay â†’ activate) â€” highest-value missing flow.
2. **Double-booking guard** (FR-10 / AC-05) â€” enforce explicit overlapping-lesson check for a tutor.
3. **MFA for admin accounts** â€” recommended by the working doc, not yet implemented.
4. **WhatsApp notifications** â€” working doc lists it; only email/SMS wired.
5. **Upload malware scanning** â€” MIME/size validated, no AV scan.
6. **Coupon/discount engine** â€” Phase 2, referenced.
7. **Certificates / recorded-library / full virtual-school** â€” Phase 2+/future.
