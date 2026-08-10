# Sprint 0 — Product + Engineering Discovery

## 1. Sprint Objective

Confirm the MVP boundary, resolve the highest-impact product decisions, and establish the architecture that will guide the first implementation slices.

## 2. Why This Sprint Exists

This sprint prevents premature feature work. The product is broad, but the first release should be a narrow, complete, end-to-end journey around parent signup, learner management, programme discovery, cohort selection, enrollment, payment, and dashboard access.

## 3. Prerequisites

- Product specification review
- Repository initialization
- Local development environment availability
- Docker support for PostgreSQL and Redis

## 4. Scope

- Confirm the MVP context and release perimeter
- Document major open product decisions
- Propose the modular monolith backend structure
- Define the initial database domain model
- Define versioned REST API conventions
- Define frontend architecture with Next.js and TanStack
- Define testing, observability, and security expectations

## 5. Out of Scope

- Full tutor marketplace features
- Full LMS functionality
- Full billing and payout automation
- Advanced analytics and reporting
- Public content management beyond basic documentation

## 6. Domain Design

### Entities

- User
- Role
- Permission
- ParentProfile
- StudentProfile
- ParentStudentLink
- TutorProfile
- Programme
- Cohort
- Order
- Payment
- Lesson
- AuditLog

### Relationships

- A parent can link to many students
- A student can be linked to one or more parents
- A programme can have many cohorts
- A cohort can have many enrollments
- An order can contain many order items
- A payment belongs to one order

### Invariants

- A cohort belongs to exactly one programme
- Enrollment must be tied to a valid cohort and a valid order/payment state
- Parent access to a student must be verified through the relationship table

## 7. Database Design

### Tables

- users
- roles
- permissions
- user_roles
- parent_profiles
- student_profiles
- parent_student_links
- tutor_profiles
- programmes
- cohorts
- enrollments
- orders
- order_items
- payments
- lessons
- audit_logs

### Key constraints

- foreign keys for all relationship tables
- unique constraints on role names and email addresses
- status constraints for enrollment/payment states
- check constraints for non-negative amounts and valid statuses

## 8. API Contract

### Authentication

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- POST /api/v1/auth/password-reset
- POST /api/v1/auth/verify-email

### Programmes and cohorts

- GET /api/v1/programmes
- GET /api/v1/programmes/:id
- GET /api/v1/cohorts
- GET /api/v1/cohorts/:id

### Enrollment

- POST /api/v1/enrollments
- GET /api/v1/enrollments/me

## 9. Frontend Architecture

- Marketing pages for public visitors
- Auth shell for signed-in parents, students, tutors, and admins
- Programme catalog page with filters and search
- Cohort detail page
- Enrollment flow page
- Dashboard pages by role

## 10. Backend Implementation

- Auth package handles registration, login, session, and password reset
- Users package manages profile and role operations
- Parents and students packages manage relationship and dashboard access
- Programmes and cohorts packages expose catalogue and enrollment data
- Payments package owns payment initiation, webhook handling, and idempotency
- Audit package records sensitive actions

## 11. Security

- Enforce authentication on protected resources
- Enforce role checks and relationship checks for data access
- Validate all inputs at the API boundary
- Never trust client-side authorization
- Use idempotency for payment webhooks

## 12. Testing

- Unit tests for domain logic and validation
- Integration tests for database transactions and authorization
- End-to-end test for parent registration to enrollment confirmation

## 13. Observability

- Structured logs for auth, payments, enrollment, and errors
- Basic metrics for request latency and error rate
- Health checks for the API and database

## 14. Implementation Order

1. Create repository structure and documentation
2. Add Docker Compose for PostgreSQL and Redis
3. Create initial backend package layout
4. Define database migrations and schema skeleton
5. Implement auth and user foundation
6. Implement programme and cohort discovery
7. Implement enrollment and payment flow scaffolding
8. Create frontend shell and initial role-based routes

## 15. Definition of Done

- Repository can be cloned and started locally
- PostgreSQL and Redis run via Docker Compose
- Initial architecture and sprint documents exist
- Core domain model is documented
- Open decisions are recorded
- Team can begin Sprint 1 implementation

## 16. Mentor Review

The key engineering lesson in this sprint is that architecture is not an afterthought. The initial decisions around domain boundaries, authorization, payments, and data ownership shape every later sprint. The strongest teams resist the urge to build features before they understand the core invariants and failure modes.
