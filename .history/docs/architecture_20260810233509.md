# YKAY Virtual School Architecture Proposal

## 1. Product analysis

The product is an academically governed virtual-school platform rather than a simple tutor marketplace. The initial MVP should focus on the core vertical slice:

1. Parent registers and creates/links learners
2. Parent discovers a programme
3. Parent selects a cohort
4. Parent creates an order and pays
5. Enrollment is confirmed
6. Parent and student can access the relevant dashboard and lesson flow

## 2. MVP boundary

The initial scope should remain narrow and complete. The first release should cover:

- authentication and role-based access
- parent/student relationship management
- academic catalogue (curriculum, levels, subjects, programmes)
- cohort publishing and enrollment
- payments and webhook handling
- parent/student dashboards
- tutor application and approval workflow

## 3. Domain decomposition

The initial backend domains should be separated by responsibility:

- auth
- users
- parents
- students
- tutors
- academics
- programmes
- cohorts
- enrollments
- scheduling
- lessons
- learning
- payments
- notifications
- support
- audit
- platform

## 4. Open product decisions

The following decisions materially affect architecture and should be resolved before implementation expands:

- Launch geography: Nigeria-only or broader international launch
- Payment provider: Paystack, Flutterwave, Stripe, or another provider
- Tutor matching model: managed matching or open marketplace-style discovery
- Video provider and lesson delivery approach

## 5. Architecture proposal

### Frontend

- Next.js App Router
- React + TypeScript
- TanStack Query for server state
- TanStack Form for complex forms
- TanStack Table for admin table workflows

### Backend

- Go modular monolith
- REST API under /api/v1
- PostgreSQL as the source of truth
- Redis only where necessary for sessions, queues, caches, or rate limiting

## 6. Database proposal

The core relational model should include:

- users, roles, permissions, user_roles
- parent_profile, student_profile, parent_student_link
- tutor_profile, tutor_qualification, tutor_subject, tutor_availability, tutor_vetting_event
- curriculum, level, subject, exam
- programme, programme_subject
- cohort, cohort_enrollment
- order, order_item, payment, refund
- lesson, lesson_participant, attendance, lesson_note
- resource, assignment, submission, grade, feedback, progress_report
- notification, support_ticket, audit_log

Important invariants:

- A programme is a sellable or teachable academic offering
- A cohort is a scheduled delivery instance of a programme
- A parent does not automatically gain access to every student; authorization must verify the relationship

## 7. API architecture

Use versioned REST endpoints with consistent contracts:

- /api/v1/auth
- /api/v1/users
- /api/v1/parents
- /api/v1/students
- /api/v1/tutors
- /api/v1/programmes
- /api/v1/cohorts
- /api/v1/enrollments
- /api/v1/lessons
- /api/v1/payments
- /api/v1/notifications
- /api/v1/support

Each endpoint should define request/response schemas, auth requirements, authorization, validation, errors, pagination, idempotency, and audit requirements.

## 8. Authentication strategy

- Email/password authentication with email verification
- Session-based authentication using secure cookies or token-based auth with refresh rotation
- RBAC for role-based permission checks
- Relationship-based authorization for parent/student and tutor/learner access

## 9. Frontend architecture

- Public marketing pages in the Next.js app router
- Authenticated application shell for parents, students, tutors, and admins
- TanStack Query for all server-state interactions
- Route-level loading and error boundaries

## 10. Testing and delivery strategy

- Unit tests for domain logic
- Integration tests for database behavior
- API tests for authorization and contracts
- End-to-end tests for the parent enrollment journey

## 11. DevOps and environment strategy

- Development, staging, and production environments
- PostgreSQL and Redis via Docker Compose locally
- CI pipeline for linting, formatting, and tests
- Structured logs, metrics, tracing, and health checks from the outset

## 12. Sprint 0 plan

Sprint 0 should focus on discovery and architecture rather than feature delivery.

### Deliverables

- product decisions
- architecture decision records
- domain map
- initial ERD proposal
- API strategy
- repository structure
- risk register
- MVP boundary
