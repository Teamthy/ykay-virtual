

YKAY VIRTUAL SCHOOL
Product, UX/UI & Software Engineering Working Document
Website • Tutor Marketplace • Cohort Learning • Virtual School Platform


Working proposition — A trusted, academically governed online learning platform combining British and Nigerian curricula, examination preparation, private tuition, group cohorts, digital skills and a vetted tutor network.

Prepared for software engineering, UI/UX design and product planning
Version 1.0 • August 2026
 
Document Map
Section	Contents
1	Executive Product Brief
2	Business Positioning & Differentiation
3	Founder/Academic Leader Profile
4	Target Users & Personas
5	Scope: MVP, Phase 2 & Future Virtual School
6	Information Architecture / Sitemap
7	Core User Journeys
8	Detailed Public Website Pages & Wireframes
9	Student Portal
10	Parent Portal
11	Tutor Portal
12	Admin / Academic Operations Portal
13	Tutor Application & Vetting
14	Cohorts, Private Lessons & Scheduling
15	Payments & Commercial Model
16	Learning, Assessment & Reporting
17	Functional Requirements
18	Non-Functional Requirements
19	Roles & Permissions
20	Data Model / Core Entities
21	Suggested API & Integration Map
22	Analytics, Notifications & Audit Trail
23	Security, Privacy & Safeguarding
24	UI Design System
25	Acceptance Criteria & Test Scenarios
26	Delivery Roadmap
27	Engineering Handover Checklist

Important — This document is deliberately technology-agnostic. The engineering team may propose the final stack, hosting architecture and third-party integrations, provided the functional, security and UX requirements are preserved.

1. Executive Product Brief
Ykay Virtual School is envisioned as a digital education business and online-school platform rather than a simple tutor directory. It should enable families to discover programmes, enrol learners, book vetted tutors, join structured cohorts, attend lessons, receive learning resources, complete assessments and track progress.
1.1 Product vision
To make high-quality, accountable teaching accessible beyond geography by combining the standards of a strong school with the flexibility of online learning.
1.2 Core value proposition
•	Academically governed: Ykay controls tutor quality, programme standards and learner experience.
•	Multi-curriculum: Nigerian and British curriculum pathways in one platform.
•	Multiple learning modes: one-to-one tuition, small-group cohorts, exam bootcamps and structured programmes.
•	Parent visibility: attendance, progress, tutor feedback, schedules and payments.
•	Teacher opportunity: qualified educators can apply, be vetted and earn as approved subject experts.
•	Technology-enabled: live-class integration, digital resources, assessments, reports and notifications.
2. Business Positioning & Differentiation
Dimension	Marketplace-only model	Ykay Virtual School model
Academic ownership	Platform connects tutor and learner.	Platform defines programme, tutor standards, learning expectations and QA.
Discovery	Search tutors.	Search programmes, subjects, cohorts or tutors.
Learning structure	Mostly booking-led.	Curriculum pathways, schemes, cohorts, lesson plans and progress.
Trust	Tutor profile/reviews.	Vetting + academic governance + safeguarding + performance review.
Parent experience	Transaction focused.	Parent dashboard and progress visibility.
Growth path	Tutoring marketplace.	Tutoring → exam academy → virtual school → broader digital academy.

2.1 Suggested positioning statement
“Expert teaching. Structured learning. Anywhere.”
Alternative working descriptor: “Ykay Virtual School — British & Nigerian curriculum learning, examination preparation and expert private tuition online.”
3. Founder / Academic Leader Profile
The public website should feature a strong but evidence-led leader profile. Avoid unsupported superlatives; allow achievements to establish authority.
3.1 Draft website profile
Yinka Oladimeji is an experienced educator, Computing leader and information technology professional with a career spanning leading international schools in Nigeria. His professional journey includes Atlantic Hall Educational Trust Council, Day Waterman College and Children’s International School, Lekki, where he leads the Computing Department.

He holds a BSc in Computer Science and an MSc in Information Technology and is a Fellow of the COBIS Middle Leaders programme. His work bridges classroom teaching, curriculum leadership, educational technology, digital skills and professional certification.

He has prepared learners for British curriculum examinations, including IGCSE Computer Science, with students achieving exceptional national outcomes. He has also led students in international technology competitions, including the 2026 International Coding Olympiad in Rome, Italy, where his delegation won medals and a Nigerian student achieved a world Top-3 result in the Codementum category.

Yinka’s vision for Ykay Virtual School is to combine excellent teachers, strong academic systems and technology to give learners access to structured, high-quality education wherever they are.
Verification note — Before publication, the content team should verify the exact wording of awards, school titles, fellowship status and competition result descriptions, and obtain permission where institutional names/logos/testimonials are used.

4. Target Users & Personas
Persona	Primary need	Key product response
Parent / Guardian	Trusted teaching and visibility.	Programme discovery, tutor assurance, payments, attendance and progress.
Secondary learner	Clear teaching, revision and support.	Dashboard, lessons, resources, assignments, feedback.
Exam candidate	Focused WAEC/NECO/JAMB/IGCSE preparation.	Exam cohorts, past-paper practice, mock tests, revision calendar.
A Level learner	Subject-specialist teaching.	A Level programme pages, private tutoring and small cohorts.
Tutor / Subject Expert	Flexible teaching opportunity.	Application, vetting, availability, assigned learners, earnings.
Academic Administrator	Quality and operational control.	Tutor approval, cohort setup, attendance, reports, moderation.
Platform Administrator	System control.	Users, permissions, payments, configuration, logs and support.

5. Product Scope & Phasing
5.1 MVP — launchable commercial product
•	Marketing website and programme catalogue
•	Student/parent registration
•	Tutor application and admin approval
•	Private lesson request/booking
•	Cohort application/enrolment
•	Payment recording/gateway integration
•	Lesson scheduling and meeting links
•	Student, parent, tutor and admin dashboards
•	Attendance and tutor lesson notes
•	Resources/assignments
•	Basic progress report
•	Email/SMS/WhatsApp-ready notifications
•	Support/contact workflow
5.2 Phase 2
•	Automated assessments and question banks
•	Integrated report cards and gradebook
•	Tutor payouts/wallet
•	Recorded lesson library
•	Certificates
•	Referral/coupon engine
•	Advanced analytics
•	Mobile/PWA experience
•	Institutional/school accounts
5.3 Future full virtual school
•	Formal admissions workflow
•	Full timetable and subject registration
•	Term/academic-year structure
•	Homeroom/pastoral features
•	Continuous assessment
•	School reports/transcripts
•	Virtual assemblies/clubs
•	School-wide parent communication
•	Accreditation/compliance workflows as applicable
6. Information Architecture / Sitemap
Public route	Purpose
Home	Primary conversion and trust page
About	Vision, leadership, academic standards, safeguarding
Programmes	Hub for all curricula and learning modes
British Curriculum	Year 7–9, IGCSE/Year 10–11, A Level
Nigerian Curriculum	JSS1–3, SSS1–3
Exam Preparation	WAEC, NECO, JAMB, IGCSE, A Level revision
Subjects	Subject directory with level filters
Private Tuition	One-to-one booking/request
Group Cohorts	Scheduled small-group classes
Computing & Digital Skills	CS, ICT, Python, AI, Cybersecurity, productivity/certification prep
Find a Tutor	Approved tutor discovery where enabled
Become a Tutor	Tutor recruitment and application
How It Works	Parent/student/tutor flows
Pricing	Packages, cohort fees and private tuition
Success Stories	Results, testimonials, competitions
Resources	Blog, study tips, curriculum/exam guidance
Contact / Support	Enquiry, WhatsApp/contact channels, FAQ
Login / Register	Role-aware authentication

7. Core User Journeys
Journey	Flow
Parent joins cohort	Home → Programme → Level/Subject → Cohort details → Apply/Enrol → Learner details → Payment → Confirmation → Parent dashboard.
Private tuition	Subject page → Private tuition → preferences/availability → tutor matching or tutor selection → price → payment → schedule → lesson.
Tutor onboarding	Become a Tutor → account → application → identity/qualification/experience → subjects/curricula → availability → references → admin review → interview/demo → approved/rejected → tutor dashboard.
Student lesson	Login → Today’s lesson → lesson detail → Join live class → tutor marks attendance → resources/assignment → feedback.
Admin creates cohort	Admin → Programmes → Create cohort → subject/level/tutor → capacity → dates/times → fee → publish → enrolments → attendance/progress.

8. Detailed Public Website Pages & Wireframes
Desktop wireframes below are low-fidelity layout specifications. Mobile layouts should stack content, preserve CTA visibility and use a compact navigation drawer.
8.1 Home Page
┌────────────────────────────────────────────────────────────────────┐
│ LOGO  Programmes  Curricula  Private Tuition  Tutors  About  LOGIN │
├────────────────────────────────────────────────────────────────────┤
│ HERO: Expert teaching. Structured learning. Anywhere.              │
│ British + Nigerian curricula | Exam prep | Private + Cohorts       │
│ [Find a Programme] [Book Private Tuition]                          │
│                                      [Learner/teacher hero visual] │
├────────────────────────────────────────────────────────────────────┤
│ TRUST STRIP: Experienced educators | Vetted tutors | Parent view   │
├────────────────────────────────────────────────────────────────────┤
│ CHOOSE PATH: British | Nigerian | Exam Prep | Digital Skills       │
├────────────────────────────────────────────────────────────────────┤
│ POPULAR PROGRAMMES / UPCOMING COHORTS cards                        │
├────────────────────────────────────────────────────────────────────┤
│ HOW IT WORKS: Choose → Enrol/Book → Learn → Track progress         │
├────────────────────────────────────────────────────────────────────┤
│ ACADEMIC LEADERSHIP + founder profile teaser                       │
├────────────────────────────────────────────────────────────────────┤
│ RESULTS / SUCCESS STORIES / TESTIMONIALS                            │
├────────────────────────────────────────────────────────────────────┤
│ BECOME A TUTOR CTA | FAQ | FOOTER                                  │
└────────────────────────────────────────────────────────────────────┘

Primary CTAs: Find a Programme; Book Private Tuition. Secondary CTA: Become a Tutor. Home search should support Subject + Curriculum/Exam + Level.
Component	Behaviour / data
Hero search	Filters programme catalogue; no dead-end search.
Programme cards	Title, curriculum, level, subject, format, next start, CTA.
Upcoming cohorts	Capacity/status, schedule, tutor, fee, enrol CTA.
Trust indicators	Use only verifiable claims.
Testimonials	Admin-managed; consent flag required.

8.2 Programmes Hub
HEADER / breadcrumb
TITLE + filter bar [Curriculum] [Level] [Subject] [Format] [Exam]
┌───────────────┐  ┌──────────────────────────────────────────────┐
│ FILTERS       │  │ Programme card                              │
│ British       │  │ IGCSE Computer Science                     │
│ Nigerian      │  │ Year 10–11 • Cohort / Private              │
│ WAEC/JAMB     │  │ [View Programme]                            │
│ A Level       │  ├──────────────────────────────────────────────┤
│ Digital       │  │ Programme card ...                          │
└───────────────┘  └──────────────────────────────────────────────┘
PAGINATION / load more | Footer

Programme detail pages should be reusable templates, not individually hard-coded.
8.3 Programme / Subject Detail
Breadcrumb
PROGRAMME TITLE | curriculum | level | subject
Summary + learning outcomes                         [ENROL / BOOK]
Tabs: Overview | Topics | Cohorts | Private Tuition | Tutor(s) | FAQ
──────────────────────────────────────────────────────────────────
Curriculum/topics | who it is for | prerequisites
Available cohorts: dates, times, tutor, seats, fee [Join cohort]
Private tuition: request/choose schedule [Request lesson]
Tutor profile cards
FAQ + related programmes

8.4 British Curriculum Landing
HERO: British Curriculum Online
Year 7 | Year 8 | Year 9 | IGCSE Year 10 | IGCSE Year 11 | A Level
Subject grid
How assessment/exam support works
Featured cohorts
Private tuition CTA
Academic standards / FAQs

8.5 Nigerian Curriculum Landing
HERO: Nigerian Curriculum Online
JSS1 | JSS2 | JSS3 | SSS1 | SSS2 | SSS3
Core subject grid
WAEC | NECO | JAMB pathways
Featured cohorts + private tuition
FAQs

8.6 Exam Preparation Landing
Exam cards: IGCSE | WAEC | NECO | JAMB | A Level
Upcoming revision cohorts
Mock / revision / past-paper methodology
Subject selection
[Join a Revision Cohort] [Get Private Support]

8.7 Private Tuition Page
Value proposition + safeguards
STEP 1 learner level/exam
STEP 2 subject(s)
STEP 3 goals/challenges
STEP 4 preferred days/time/timezone
STEP 5 tutor preference (optional)
STEP 6 contact/account
STEP 7 matching/selection → quote/payment → schedule

8.8 Find a Tutor
Search [Subject] [Curriculum] [Level] [Availability]
Tutor card: photo | first name/full display policy | verified badge
subjects | curricula | experience summary | rating if enabled
[View Profile] [Request Tuition]
NOTE: admin can disable public tutor marketplace and use managed matching.

8.9 Tutor Profile
Photo + verified status + intro
Subjects / curricula / levels
Qualifications & experience (approved fields only)
Teaching approach
Availability preview
Reviews/testimonials if enabled
[Request this Tutor]

8.10 Become a Tutor
Why teach with Ykay
Requirements / quality standards
Vetting process: Apply → Review → Interview/demo → Verification → Approval
Earning/engagement model summary
FAQ
[Start Tutor Application]

8.11 About / Academic Leadership
Mission / vision
Why Ykay Virtual School
Academic leader profile + professional image
Experience / credentials / selected achievements
Academic quality model
Safeguarding / learner wellbeing
CTA: Explore programmes

8.12 Pricing
Tabs: Cohorts | Private Tuition | Exam Prep | Digital Skills
Price/package cards
What is included
Cancellation/reschedule policy
FAQ
[Enrol] / [Request Tuition]

8.13 Success Stories
Results / competition achievements
Student/parent testimonials
Case studies
Consent-controlled photos
CTA

8.14 Contact / Support
Enquiry category
Name | email | phone | learner level | subject | message
Support contact information
FAQ
Optional WhatsApp deep-link
Response expectation

8.15 Authentication
LOGIN: Email + password | forgot password | optional Google sign-in
REGISTER: Parent / Student (age rules) / Tutor
Parent account can add multiple learners
Role-aware redirect after login

9. Student Portal
9.1 Student Dashboard
TOP: Logo | search | notifications | profile
SIDE: Dashboard | My Classes | Calendar | Resources | Assignments | Progress
┌──────────────── TODAY ────────────────┐ ┌──── PROGRESS ───────────┐
│ 4:00pm IGCSE CS [Join class]         │ │ attendance 92%          │
│ 6:00pm Mathematics                   │ │ assignments 8/10        │
└──────────────────────────────────────┘ └─────────────────────────┘
Upcoming assignments
My programmes/cohorts
Recent tutor feedback
Announcements

9.2 Student functions
•	View timetable/calendar
•	Join live-class link only within configured window
•	Download/view resources
•	Submit assignments
•	See grades/feedback where released
•	See attendance
•	View progress summary
•	Receive announcements/notifications
•	Raise support request
10. Parent Portal
10.1 Parent Dashboard
SELECT LEARNER [Child A ▼]          Outstanding action / next payment
Today / upcoming lessons
Attendance summary
Progress snapshot by subject
Recent tutor notes
Assignments / concerns
Payments & receipts
[Book more tuition] [Message support]

•	Manage multiple linked learners
•	View schedules and attendance
•	View tutor feedback/progress
•	View invoices/receipts/payments
•	Request new subject/private tuition
•	Approve/receive key communications
•	Update permitted learner details
11. Tutor Portal
11.1 Tutor Dashboard
Status: APPROVED | profile completion | availability
Today's lessons [Open lesson] [Join class]
My cohorts / private learners
Attendance to complete
Lesson notes outstanding
Assignments to review
Earnings/payout summary (Phase 2)
Announcements / support

•	Maintain permitted profile fields
•	Set recurring availability and exceptions
•	View assigned students/cohorts
•	Access curriculum/resources
•	Open lesson roster
•	Mark attendance
•	Record lesson notes and homework
•	Upload resources
•	Create/review assignments where permitted
•	Submit progress comments
•	View engagement/payment status as allowed
12. Admin / Academic Operations Portal
12.1 Admin Dashboard
KPI cards: active learners | tutors | cohorts | lessons this week | revenue
Pending tutor applications
Pending enrolments / payment exceptions
Today's classes / attendance exceptions
Capacity alerts
Support tickets
Academic QA alerts / overdue tutor notes

Admin module	Core capabilities
Users	Search, view, activate/suspend, role/link management.
Tutors	Applications, documents, vetting stages, approval, subjects, availability.
Programmes	Curricula, levels, subjects, programme templates, pricing.
Cohorts	Create, assign tutor, capacity, timetable, enrolments, status.
Private Tuition	Requests, matching, tutor assignment, scheduling, package balance.
Lessons	Calendar, meeting links, attendance, notes, reschedule/cancel.
Learning	Resources, assignments, assessment records.
Reports	Learner progress, tutor performance, attendance.
Finance	Orders, invoices, payments, refunds, tutor payout data.
Content	Homepage blocks, FAQs, testimonials, success stories, blog.
Communications	Templates, announcements, notification logs.
Support	Tickets and escalation.
System	Roles, permissions, integrations, audit logs, configuration.

13. Tutor Application & Vetting
Tutor approval must be a workflow, not a simple registration flag.
Stage	Data / action	Status
Account	Email/phone verification	Draft
Personal profile	Name, location/timezone, bio, photo	Submitted
Professional	Education, qualifications, teaching experience	Under review
Teaching scope	Curriculum, levels, subjects, exams	Under review
Evidence	Certificates/CV/reference data as required	Verification
Screening	Interview and/or demonstration lesson	Interview
Decision	Approve, request changes, reject, hold	Decision
Activation	Agreement, safeguarding/policies, availability	Active

Engineering requirement — Every vetting status change should be timestamped and attributable to an administrator. Sensitive uploaded documents should not be public and should use restricted storage/access.

14. Cohorts, Private Lessons & Scheduling
Object	Required fields
Cohort	Programme, tutor(s), capacity, start/end, recurrence, timezone, fee, status.
Private package	Learner, subject, tutor, lesson duration, number of sessions, price, validity.
Lesson	Cohort/private reference, tutor, learners, start/end, timezone, meeting URL, status.
Attendance	Lesson, learner, status, marked by, timestamp, note.
Reschedule	Original slot, proposed slot, reason, actor, approval state.

All stored timestamps should use UTC internally while displaying the user’s configured timezone. The UI must clearly show timezone for cross-country learners.
15. Payments & Commercial Model
The system should support cohort fees and private-tuition packages. Engineering should isolate payment-provider logic behind an integration layer so gateways can change without rewriting enrolment logic.
•	Order created before gateway redirect/charge
•	Webhook or verified callback confirms successful payment
•	Never trust browser redirect alone as payment proof
•	Generate receipt/reference
•	Support manual/admin-confirmed payment where business policy permits
•	Refund status and reason tracked
•	Discount/coupon support may be Phase 2
•	Tutor payout calculations separated from customer payments
16. Learning, Assessment & Reporting
Feature	MVP	Later
Resources	Upload/link resources by programme/cohort/lesson	Content library and tagging
Assignments	Title, instructions, due date, submission link/file	Rubrics and plagiarism integrations
Grades	Simple score/feedback	Gradebook and weighting
Tutor notes	Per lesson learner note	Structured learning objectives/mastery
Progress	Attendance + tutor summary + simple subject status	Term reports, analytics and predicted grades
Assessments	Manual/external link	Question bank, timed tests, auto-marking

17. Functional Requirements
ID	Requirement
FR-01	Role-based registration/login and password reset.
FR-02	Parent account can create/link learner profiles.
FR-03	Admin can create curricula, levels, subjects and programmes.
FR-04	Admin can create/publish/unpublish cohorts.
FR-05	Users can filter/search programmes.
FR-06	Parent/learner can apply/enrol into a cohort subject to capacity/payment.
FR-07	User can submit private-tuition request.
FR-08	Admin can assign approved tutor to private request/cohort.
FR-09	Tutor can set availability.
FR-10	System prevents obvious double-booking for a tutor.
FR-11	Lessons can carry live-meeting links.
FR-12	Tutor/admin can mark attendance.
FR-13	Tutor can add lesson notes/resources/homework.
FR-14	Student can view resources and submit assignments.
FR-15	Parent can view linked learner schedule, attendance and released progress.
FR-16	Tutor application supports staged vetting and document evidence.
FR-17	Admin can approve/suspend tutor.
FR-18	Payment success updates enrolment/package status idempotently.
FR-19	System sends configurable transactional notifications.
FR-20	Admin actions affecting access, money, tutor approval or learner records are auditable.
FR-21	Content administrators can manage key public-site content without code deployment.
FR-22	Support enquiries/tickets are trackable.
FR-23	System supports cancellation/reschedule states.
FR-24	Reports export to CSV/PDF where appropriate in later iteration.
FR-25	Admin can configure programme visibility and enrolment windows.

18. Non-Functional Requirements
Area	Requirement
Responsive UX	Support modern mobile, tablet and desktop layouts.
Performance	Optimise images/assets; cache public catalogue; paginate large datasets.
Availability	Production monitoring, backups and documented recovery process.
Accessibility	Semantic headings, keyboard navigation, labels, contrast, alt text; target WCAG 2.1 AA practices.
Security	TLS, secure sessions/tokens, least privilege, rate limiting, validation, secure uploads.
Privacy	Data minimisation, consent/notice, retention rules and access controls.
Scalability	Stateless app/API where practical; background jobs for notifications/reports.
Observability	Structured logs, error monitoring, health checks and audit events.
Maintainability	Modular domain design, automated tests, documented API and migrations.
Browser support	Current major versions of Chrome, Safari, Edge and Firefox.

19. Roles & Permissions
Capability	Student	Parent	Tutor	Academic Admin	Super Admin
View own learning	✓	Linked learners	Assigned	✓	✓
Join lesson	✓	—	✓	Support	Support
Mark attendance	—	—	Assigned	✓	✓
View progress	Own	Linked	Assigned	✓	✓
Manage programmes	—	—	—	✓	✓
Approve tutors	—	—	—	✓	✓
Finance admin	—	Own	Limited	Configured	✓
Manage roles/system	—	—	—	—	✓
View audit logs	—	—	—	Limited	✓

20. Data Model / Core Entities
•	User(id, email, phone, status, timezone, last_login)
•	Role / Permission / UserRole
•	ParentProfile(user_id, …)
•	StudentProfile(user_id, DOB/age-safe fields, school/year, …)
•	ParentStudentLink
•	TutorProfile(user_id, bio, approval_status, public_fields, …)
•	TutorQualification
•	TutorSubject
•	TutorAvailability
•	TutorVettingEvent
•	Curriculum
•	Level
•	Subject
•	Exam
•	Programme
•	ProgrammeSubject
•	Cohort
•	CohortEnrollment
•	PrivateTuitionRequest
•	PrivatePackage
•	Lesson
•	LessonParticipant
•	Attendance
•	LessonNote
•	Resource
•	Assignment
•	Submission
•	Grade/Feedback
•	ProgressReport
•	Order
•	OrderItem
•	Payment
•	Refund
•	TutorPayout (Phase 2)
•	Notification
•	NotificationTemplate
•	SupportTicket
•	ContentPage
•	Testimonial
•	AuditLog
Relationship principle — Curriculum, level, subject and programme should be normalised enough to support both British and Nigerian pathways without duplicating the entire application. A Programme is the sellable/teachable academic offering; a Cohort is a scheduled delivery instance of that programme.

21. Suggested API & Integration Map
Domain	Illustrative endpoints / integration
Auth	/auth/register, /login, /forgot-password, /verify
Catalogue	/curricula, /levels, /subjects, /programmes, /cohorts
Enrolment	/enrolments, /private-requests, /packages
Tutors	/tutors, /applications, /availability, /vetting
Lessons	/lessons, /attendance, /notes, /resources
Learning	/assignments, /submissions, /progress
Payments	/orders, /payments/initiate, /payments/webhook, /refunds
Notifications	Email/SMS/WhatsApp provider adapters
Video	Zoom/Google Meet/Microsoft Teams link strategy; final provider to be selected
Storage	Private object storage for tutor evidence/submissions; public CDN for approved marketing media

API design may be REST or GraphQL; the team should document authentication, authorisation, pagination, error schema, idempotency and webhook verification.
22. Analytics, Notifications & Audit Trail
•	Funnel: visit → programme view → enquiry → checkout → paid enrolment
•	Cohort fill rate and retention
•	Private tuition requests and conversion
•	Attendance and lesson completion
•	Tutor utilisation and cancellation rate
•	Revenue by programme/curriculum/subject
•	Support volume and response time
22.1 Transactional notifications
•	Account verification/reset
•	Tutor application received/status changed
•	Enrolment/payment confirmation
•	Lesson scheduled/rescheduled/cancelled
•	Lesson reminder
•	Assignment due/feedback released
•	Payment receipt
•	Admin exception alerts
22.2 Audit events
Capture actor, action, target type/id, timestamp, safe before/after metadata and IP/device context where appropriate for sensitive administrative events.
23. Security, Privacy & Safeguarding
•	Minors’ data must be handled conservatively; parent/guardian workflows should be prioritised for younger learners.
•	Do not expose learner contact details to tutors unless explicitly required by approved business rules.
•	Use role-based and object-level authorisation; a parent must only access linked learners.
•	Secure file uploads: type/size validation, malware scanning strategy, private storage and expiring access links.
•	Encrypt traffic in transit and use managed encryption at rest where available.
•	Passwords must be hashed with an industry-standard adaptive algorithm; never stored reversibly.
•	Use MFA for administrators where feasible; recommended for tutors.
•	Payment card data should remain with the payment provider; do not store raw card details.
•	Maintain privacy notice, terms, tutor agreement, cancellation policy and safeguarding policy.
•	Provide reporting/escalation mechanism for inappropriate conduct or safeguarding concerns.
•	Backups, recovery testing and account suspension/incident response procedures are required.
Safeguarding — Because the platform serves children, safeguarding is a product requirement, not only a policy document. Direct messaging, video links, tutor access, recordings and contact-data visibility must be deliberately designed and governed.

24. UI Design System
Desired visual character: modern, calm, premium, academic and human — not childish, crowded or overly corporate.
Element	Working direction
Primary colour	Deep navy / academic blue.
Accent	Clear digital blue; optional restrained gold for premium highlights.
Background	White and very light blue/grey surfaces.
Typography	Modern sans-serif with strong readability.
Cards	Soft border, moderate radius, generous spacing.
Photography	Authentic learners/educators; diverse and consent-cleared.
Icons	Simple outline icons; consistent library.
CTAs	One clear primary action per section.
Status	Text + icon + colour; never colour alone.
Forms	Large labels, inline validation, progress steps for long applications.

24.1 Reusable components
•	Global header/footer
•	Breadcrumbs
•	Programme card
•	Cohort card
•	Tutor card
•	Filter/search bar
•	Pricing card
•	Stat card
•	Calendar/lesson card
•	Progress indicator
•	Data table
•	Stepper form
•	Empty state
•	Alert/banner
•	Modal/drawer
•	File uploader
•	Notification centre
25. Acceptance Criteria & Test Scenarios
ID	Acceptance scenario
AC-01	A parent can register, verify account, add a learner, select a cohort, complete successful payment and see the enrolment on the dashboard.
AC-02	A tutor cannot appear as approved or receive assignments until an authorised admin completes approval.
AC-03	A tutor can mark attendance only for assigned lessons/cohorts.
AC-04	A parent cannot access another family’s learner by modifying a URL/API identifier.
AC-05	A tutor cannot be double-booked into overlapping lessons without an explicit authorised override.
AC-06	A verified payment webhook processed twice does not create duplicate enrolments/credits.
AC-07	Cancelling/rescheduling a lesson updates relevant dashboards and triggers notifications.
AC-08	Student can access only resources attached to programmes/cohorts in which access is granted.
AC-09	Admin can publish/unpublish a programme without deployment.
AC-10	Tutor qualification files are not publicly accessible.
AC-11	Mobile navigation and core enrolment flow work at common phone widths.
AC-12	Key administrative changes create an audit event.

26. Delivery Roadmap
Stage	Indicative output
0. Discovery	Confirm business rules, brand, curriculum catalogue, pricing, tutor model, payment/video providers.
1. UX/UI	Clickable high-fidelity prototype based on this wireframe specification.
2. Foundation	Auth, roles, database, CMS/catalogue, environments, CI/CD.
3. Commercial MVP	Programme discovery, enrolment/private request, payments, dashboards.
4. Teaching Operations	Scheduling, lesson links, attendance, resources, tutor notes.
5. Tutor Network	Application, vetting, availability, assignment.
6. QA & Pilot	Security/permission tests, payment tests, responsive/accessibility QA; limited pilot cohort.
7. Launch	Production deployment, monitoring, support process, analytics.
8. Phase 2	Assessment engine, gradebook, payouts, recordings, advanced reporting.

Recommended delivery method: release a narrow but complete end-to-end journey first (e.g., one curriculum + several subjects + cohort/private tuition) while retaining the generalised data model.
27. Engineering Handover Checklist
•	Confirm product name, logo and domain strategy.
•	Confirm exact curriculum/subject catalogue for launch.
•	Confirm age/parent-account rules.
•	Confirm tutor employment/contractor and payout model.
•	Confirm private tuition pricing logic and cohort pricing.
•	Confirm cancellation/reschedule/refund rules.
•	Select payment gateway(s).
•	Select live-class/video strategy.
•	Select email/SMS/WhatsApp notification providers.
•	Confirm file-storage and retention rules.
•	Approve safeguarding/privacy/terms documents.
•	Produce Figma high-fidelity screens and responsive variants.
•	Produce ERD and API specification.
•	Produce threat model and role/permission matrix.
•	Set up dev/staging/production environments and backups.
•	Define analytics events and operational dashboards.
•	Write automated unit/integration/E2E tests for critical flows.
•	Run pilot with real parent, learner, tutor and admin users.
•	Create administrator operating manual and support escalation process.
Appendix A — Suggested Launch Catalogue Structure
Pathway	Levels / examples
British Curriculum	Year 7, Year 8, Year 9, IGCSE Year 10, IGCSE Year 11, A Level.
Nigerian Curriculum	JSS1, JSS2, JSS3, SSS1, SSS2, SSS3.
Examinations	IGCSE, WAEC, NECO, JAMB, A Level.
Learning mode	Private tuition, small-group cohort, revision bootcamp, holiday programme.
Digital Academy	Computer Science, ICT, Python, Artificial Intelligence, Cybersecurity, Microsoft Office/digital literacy, certification preparation.

Appendix B — Key Product Decisions for Founder + Engineer
•	Managed tutor matching versus fully public tutor marketplace?
•	Can learners self-register, or must minors be created/linked by parents?
•	Will classes run through integrated APIs or stored meeting links at MVP?
•	Will Ykay collect all fees and later pay tutors, or only charge programme fees?
•	Are tutors allowed direct chat with learners? If yes, what safeguarding controls apply?
•	Will lesson recordings be supported? If yes, define consent, retention and access.
•	Which subjects launch first? Avoid launching an empty catalogue.
•	Does the first release serve Nigeria only or accept international learners/timezones/payments?
•	Which claims/testimonials/results have publication permission and documentary support?
Appendix C — Mobile Wireframe Pattern
Mobile programme detail
┌───────────────────────────┐
│ ☰  YKAY             LOGIN │
├───────────────────────────┤
│ IGCSE Computer Science    │
│ Year 10–11 • British      │
│ [JOIN A COHORT]           │
│ [PRIVATE TUITION]         │
├───────────────────────────┤
│ Overview                  │
│ Topics                    │
│ Available cohorts         │
│ Tutor(s)                  │
│ FAQ                       │
├───────────────────────────┤
│ sticky CTA when useful    │
└───────────────────────────┘

Appendix D — Definition of Done for MVP
The MVP is ready for commercial pilot when a new family can discover an offering, create the appropriate account/learner relationship, pay/enrol or request private tuition, receive a scheduled lesson, attend it, have attendance and tutor notes recorded, and see the relevant information in parent/student dashboards — while an approved tutor and administrator can complete their parts of the workflow securely without manual database intervention.
