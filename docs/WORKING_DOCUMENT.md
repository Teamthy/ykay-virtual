# YKAY VIRTUAL SCHOOL — Working Document
Product, UX/UI & Software Engineering Working Document
Website • Tutor Marketplace • Cohort Learning • Virtual School Platform

**Working proposition** — A trusted, academically governed online learning platform combining British and Nigerian curricula, examination preparation, private tuition, group cohorts, digital skills and a vetted tutor network.

Version 1.1 • 2026

---

## 1. Executive Product Brief

Ykay Virtual School is an online-school platform rather than a simple tutor directory. Families discover programmes, enrol learners, book vetted tutors, join structured cohorts, attend lessons, receive resources, complete assessments and track progress.

### 1.1 Vision
To make high-quality, accountable teaching accessible beyond geography by combining the standards of a strong school with the flexibility of online learning.

### 1.2 Value proposition
- **Academically governed** — platform controls tutor quality, programme standards and learner experience.
- **Multi-curriculum** — Nigerian and British curriculum pathways in one platform.
- **Multiple learning modes** — one-to-one tuition, small-group cohorts, exam bootcamps, structured programmes.
- **Parent visibility** — attendance, progress, tutor feedback, schedules, payments.
- **Teacher opportunity** — qualified educators apply, get vetted and earn as approved subject experts.
- **Technology-enabled** — live classes, digital resources, assessments, reports, notifications.

## 2. Business Positioning
| Dimension | Marketplace-only | Ykay Virtual School |
|---|---|---|
| Academic ownership | Platform connects tutor and learner | Platform defines programme, tutor standards, QA |
| Discovery | Search tutors | Search programmes, subjects, cohorts or tutors |
| Learning structure | Booking-led | Curriculum pathways, cohorts, lesson plans, progress |
| Trust | Tutor profile/reviews | Vetting + governance + safeguarding + performance review |
| Parent experience | Transaction focused | Parent dashboard + progress visibility |
| Growth path | Tutoring marketplace | Tutoring → exam academy → virtual school → digital academy |

**Positioning statement:** "Expert teaching. Structured learning. Anywhere."

## 3. Founder / Academic Leader Profile
Yinka Oladimeji — educator, Computing leader and IT professional spanning leading international schools in Nigeria (Atlantic Hall Educational Trust Council, Day Waterman College, Children's International School, Lekki — Head of Computing). BSc Computer Science, MSc IT, Fellow COBIS Middle Leaders. Prepared IGCSE Computer Science learners with exceptional national outcomes; led a delegation at the 2026 International Coding Olympiad (Rome) — medals and a Nigerian student world Top-3 in Codementum.

> Verification note — verify exact wording of awards/school titles/fellowship status before publication; obtain permission for institutional names/logos/testimonials.

## 4. Target Users & Personas
| Persona | Primary need | Product response |
|---|---|---|
| Parent / Guardian | Trusted teaching + visibility | Programme discovery, tutor assurance, payments, attendance, progress |
| Secondary learner | Clear teaching, revision, support | Dashboard, lessons, resources, assignments, feedback |
| Exam candidate | Focused WAEC/NECO/JAMB/IGCSE prep | Exam cohorts, past-paper practice, mocks, revision calendar |
| A Level learner | Subject-specialist teaching | A Level pages, private tutoring, small cohorts |
| Tutor / Subject Expert | Flexible teaching opportunity | Application, vetting, availability, assigned learners, earnings |
| Academic Administrator | Quality + operational control | Tutor approval, cohort setup, attendance, reports, moderation |
| Platform Administrator | System control | Users, permissions, payments, config, logs, support |

## 5. Scope
### 5.1 MVP (launchable)
- Marketing site + programme catalogue
- Student/parent registration
- Tutor application + admin approval
- Private lesson request/booking
- Cohort application/enrolment
- Payment gateway integration
- Lesson scheduling + meeting links
- Student, parent, tutor, admin dashboards
- Attendance + tutor lesson notes
- Resources/assignments
- Basic progress report
- Email/SMS/WhatsApp notifications
- Support/contact workflow

### 5.2 Phase 2
Automated assessments/question banks, integrated report cards/gradebook, tutor payouts/wallet, recorded lesson library, certificates, referral/coupon engine, advanced analytics, mobile/PWA, institutional accounts.

### 5.3 Future full virtual school
Formal admissions, full timetable/subject registration, term/academic-year structure, homeroom/pastoral, continuous assessment, school reports/transcripts, virtual assemblies/clubs, school-wide parent comms, accreditation/compliance.

## 6. Information Architecture / Sitemap
Public routes: Home, About, Programmes, British Curriculum, Nigerian Curriculum, Exam Preparation, Subjects, Private Tuition, Group Cohorts, Computing & Digital Skills, Find a Tutor, Become a Tutor, How It Works, Pricing, Success Stories, Resources, Contact/Support, Login/Register.

## 7. Core User Journeys
- **Parent joins cohort:** Home → Programme → Level/Subject → Cohort details → Apply/Enrol → Learner details → Payment → Confirmation → Parent dashboard.
- **Private tuition:** Subject page → Private tuition → preferences → tutor matching → price → payment → schedule → lesson.
- **Tutor onboarding:** Become a Tutor → account → application → identity/qualification/experience → subjects/curricula → availability → references → admin review → interview/demo → approved/rejected → tutor dashboard.
- **Student lesson:** Login → Today's lesson → Join live class → attendance → resources/assignment → feedback.
- **Admin creates cohort:** Admin → Programmes → Create cohort → subject/level/tutor → capacity → dates/times → fee → publish → enrolments → attendance/progress.

## 8. Public Website Pages & Wireframes
(Full wireframes in original spec.) Key pages: Home, Programmes Hub, Programme/Subject Detail, British Curriculum Landing, Nigerian Curriculum Landing, **Exam Preparation** (IGCSE | WAEC | NECO | JAMB/UTME | A-Level | **SATs Prep**), Private Tuition, Find a Tutor, Tutor Profile, Become a Tutor, About/Academic Leadership, Pricing, Success Stories, Contact/Support, Authentication.

### 8.6 Exam Preparation (updated)
Exam cards: **IGCSE | WAEC | NECO | JAMB/UTME | A-Level | SATs Prep**
- Upcoming revision cohorts
- Mock / revision / past-paper methodology
- Subject selection
- CTAs: Join a Revision Cohort, Get Private Support

## 9. Student Portal
Dashboard: Today (join class), Progress, timetable/calendar, resources, assignments, grades/feedback, attendance, announcements, support. Join live-class link only within configured window.

## 10. Parent Portal
Select learner, today/upcoming lessons, attendance summary, progress snapshot, recent tutor notes, assignments/concerns, payments & receipts, manage multiple linked learners.

## 11. Tutor Portal
Status, today's lessons, cohorts/private learners, attendance to complete, lesson notes outstanding, assignments to review, earnings/payout summary, availability, announcements.

## 12. Admin / Academic Operations Portal
KPI dashboard + modules: Users, Tutors, Programmes, Cohorts, Private Tuition, Lessons, Learning, Reports, Finance, Content, Communications, Support, System.

## 13. Tutor Application & Vetting
Workflow (not a flag): Account → Personal profile → Professional → Teaching scope → Evidence → Screening → Decision → Activation. Every status change timestamped + attributable. Sensitive documents restricted.

## 14. Cohorts, Private Lessons & Scheduling
Cohort, private package, lesson, attendance, reschedule entities. UTC internally, display user timezone.

## 15. Payments & Commercial Model
Order before gateway redirect; webhook/verified callback confirms payment; never trust browser redirect alone; receipts; manual/admin-confirmed payment; refund status+reason; discount/coupon Phase 2; tutor payout separated from customer payments.

## 16. Learning, Assessment & Reporting
Resources, assignments, grades, tutor notes, progress, assessments (MVP: manual/external; later: question bank, timed tests, auto-marking).

## 17. Functional Requirements (FR-01…FR-25)
Role-based auth; parent links learners; admin manages curricula/levels/subjects/programmes/cohorts; filter/search programmes; enrol subject to capacity/payment; private-tuition request; admin assigns tutor; tutor sets availability; no double-booking; meeting links; attendance; lesson notes/resources/homework; student views resources + submits assignments; parent views linked learner schedule/attendance/progress; staged vetting + documents; admin approve/suspend; idempotent payment updates; configurable notifications; auditable admin actions; content admins publish without code deploy; trackable support; cancellation/reschedule states; CSV/PDF reports (later); programme visibility + enrolment windows.

## 18. Non-Functional Requirements
Responsive UX, performance (optimise assets, cache catalogue, paginate), availability (monitoring/backups/recovery), accessibility (WCAG 2.1 AA), security (TLS, sessions, least privilege, rate limiting, validation, secure uploads), privacy (minimisation, consent, retention), scalability (stateless, background jobs), observability (structured logs, error monitoring, health checks, audit), maintainability (modular, tests, documented API + migrations), browser support.

## 19. Roles & Permissions
Student / Parent / Tutor / Academic Admin / Super Admin matrix (per original spec §19).

## 20. Data Model / Core Entities
User, Role/Permission/UserRole, ParentProfile, StudentProfile, ParentStudentLink, TutorProfile, TutorQualification, TutorSubject, TutorAvailability, TutorVettingEvent, Curriculum, Level, Subject, Exam, Programme, ProgrammeSubject, Cohort, CohortEnrollment, PrivateTuitionRequest, PrivatePackage, Lesson, LessonParticipant, Attendance, LessonNote, Resource, Assignment, Submission, Grade/Feedback, ProgressReport, Order, OrderItem, Payment, Refund, TutorPayout, Notification, NotificationTemplate, SupportTicket, ContentPage, Testimonial, AuditLog.
> A Programme is the sellable/teachable academic offering; a Cohort is a scheduled delivery instance of that programme.

## 21. API & Integration Map
Auth, Catalogue, Enrolment, Tutors, Lessons, Learning, Payments, Notifications (Email/SMS/WhatsApp), Video (Zoom/Meet/Teams link strategy), Storage (private evidence/submissions, public CDN marketing media). REST or GraphQL; document authn/authz/pagination/error schema/idempotency/webhook verification.

## 22. Analytics, Notifications & Audit Trail
Funnel (visit → programme → enquiry → checkout → paid), cohort fill/retention, private requests/conversion, attendance/lesson completion, tutor utilisation/cancellation, revenue by programme/curriculum/subject, support volume/response. Transactional notifications list (§22.1). Audit events capture actor/action/target/timestamp/before-after/IP.

## 23. Security, Privacy & Safeguarding
Minors' data conservative; parent workflows for younger learners; don't expose learner contact to tutors unless required; role + object-level authz; secure uploads (type/size validation, scanning, private storage, expiring links); TLS + encryption at rest; hashed passwords; MFA for admins (recommended tutors); card data stays with provider; privacy/terms/tutor agreement/cancellation/safeguarding policies; reporting/escalation for safeguarding concerns; backups/recovery/incident response.

## 24. UI Design System
Modern, calm, premium, academic, human. Primary: deep navy/academic blue; accent: clear digital blue (restrained gold); white + very light blue/grey surfaces; modern sans-serif; soft-border cards, moderate radius, generous spacing; authentic consent-cleared photography; simple outline icons; one primary CTA per section; status = text+icon+colour; forms with large labels, inline validation, progress steps.

Reusable components: header/footer, breadcrumbs, programme card, cohort card, tutor card, filter/search bar, pricing card, stat card, calendar/lesson card, progress indicator, data table, stepper form, empty state, alert/banner, modal/drawer, file uploader, notification centre.

## 25. Acceptance Criteria & Test Scenarios
AC-01…AC-12 (per original spec §25): end-to-end parent enrolment, tutor can't appear approved before admin approval, tutor attendance only assigned lessons, no cross-family access, no double-booking, idempotent payment webhook, reschedule updates dashboards, resource access control, publish programme without deploy, tutor files not public, mobile flow works, admin changes audited.

## 26. Delivery Roadmap
0 Discovery → 1 UX/UI → 2 Foundation → 3 Commercial MVP → 4 Teaching Operations → 5 Tutor Network → 6 QA & Pilot → 7 Launch → 8 Phase 2.

## 27. Engineering Handover Checklist
(Per original spec §27 — product naming, curriculum catalogue, age rules, tutor model, pricing, cancellation rules, payment gateway, video strategy, notifications, storage/retention, safeguarding/privacy/terms, Figma, ERD/API spec, threat model, env/backups, analytics, tests, pilot, ops manual.)

---

## Appendix A — Launch Catalogue Structure (updated)
| Pathway | Levels / examples |
|---|---|
| British Curriculum | Year 7–9, IGCSE Year 10–11, A Level |
| Nigerian Curriculum | JSS1–3, SSS1–3 |
| **Examinations** | **IGCSE, WAEC, NECO, JAMB/UTME, A-Level, SATs Prep** |
| Learning mode | Private tuition, small-group cohort, revision bootcamp, holiday programme |
| Digital Academy | Computer Science, ICT, Python, AI, Cybersecurity, Microsoft Office/digital literacy |

## Appendix B — Key Product Decisions
Managed tutor matching vs public marketplace; learner self-registration vs parent-created minors; integrated APIs vs stored meeting links; fee collection model; direct tutor chat + safeguarding controls; lesson recordings (consent/retention/access); first subjects; Nigeria-only vs international; publication permission for claims/testimonials.

## Appendix C — Mobile Wireframe Pattern
(Per original spec — stacked mobile layout, sticky CTA.)

## Appendix D — Definition of Done for MVP
A new family can discover an offering, create the appropriate account/learner relationship, pay/enrol or request private tuition, receive a scheduled lesson, attend it, have attendance + tutor notes recorded, and see the relevant info in parent/student dashboards — while an approved tutor and administrator can complete their parts securely without manual DB intervention.
