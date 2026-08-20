# NUVORA — Local fixture data (development only)

## Local operator seed (Postgres)

Creates **new** local users with **random passwords** (printed once, not in git).
Does not use `admin@nuvora.com` / published hashes.

```bash
docker compose up -d postgres redis
go run ./cmd/migrate --cmd=up
go run ./cmd/seedusers
```

Accounts:

| Email | Role |
|---|---|
| `local.super@nuvora.test` | SUPER_ADMIN (MFA on login) |
| `local.academic@nuvora.test` | ACADEMIC_ADMIN (MFA on login) |
| `local.parent@nuvora.test` | PARENT |
| `local.tutor@nuvora.test` | TUTOR |
| `local.student@nuvora.test` | STUDENT |

Passwords are written to `seed-local-users.once.txt` (gitignored). Delete that file after you copy them.

Self-registered users stay `PENDING_VERIFICATION` until they confirm the email link (e2e covers this).


> **Never use these accounts in a shared environment.** Fixture data is now
> disabled by default, including when the API uses its in-memory development
> fallback. It exists only as a temporary local visual-development aid while
> the E2E suite is migrated to dynamically created records.

To opt in locally, set both `ENVIRONMENT=development` and
`SEED_DEMO_DATA=true`. Password defaults to `password123` and is overridable
through `DEMO_PASSWORD`. Production validation rejects `SEED_DEMO_DATA=true`;
production must use an empty, real PostgreSQL database with real identities.

## Accounts (in-memory only, when `SEED_DEMO_DATA=true`)

Migrations `000019` / `000034` used to insert these rows into Postgres.
`000042` **disables them** (soft-delete, unusable password). They are **not**
valid on a migrated database or in production. Use them only in the
in-memory store after explicitly setting `SEED_DEMO_DATA=true`.

| Role    | Email              | Password     | Dashboard                          | User ID (suffix) |
|---------|--------------------|--------------|------------------------------------|------------------|
| Admin   | `admin@nuvora.com` | `DEMO_PASSWORD` | `/admin` | `…00a1` |
| Parent  | `parent@nuvora.com`| `DEMO_PASSWORD` | `/dashboard` | `…00a2` |
| Tutor   | `tutor@nuvora.com` | `DEMO_PASSWORD` | `/tutor-dashboard` | `…00a3` |
| Student | `student@nuvora.com`| `DEMO_PASSWORD` | `/student-dashboard` | `…00a4` |

> Note: sign-in by **6-digit email code** (`/login-code`) also works for any
> registered email — codes appear in the API log (`/tmp/api32.log` in this
> sandbox, or the email log in your deployment).

## Learner & tutor profiles (used by the LMS)

| Profile            | ID (suffix) | Used by                                             |
|--------------------|-------------|-----------------------------------------------------|
| Student profile    | `…0001`     | `/lms`, assignments, quizzes, attendance, grades    |
| Tutor profile (Oluwatobi) | `…0102` | `/lms/tutor`, teaching console, availability        |

## Catalogue & LMS demo content (seeded)

| Item | Slug / ID | Details |
|------|-----------|---------|
| Programme — Nigerian Curriculum (Core Maths) | `/programmes/nigerian-curriculum` | Format: cohort |
| Programme — British Curriculum (IGCSE Prep) | `/programmes/british-curriculum` | Format: cohort |
| Cohort — UTME 2026 Mastery (320+) | `/cohorts/utme-2026-mastery` (`…c010`) | 3 lessons, **2 assignments**, **1 auto-graded quiz (3 Qs)**, attendance + graded submission for learner `…0001`, enrollment CONFIRMED |
| Cohort — IGCSE Computer Science | `/cohorts/igcse-computer-science` (`…c011`) | 3 lessons |
| Cohort — WAEC Mathematics Intensive | `/cohorts/waec-mathematics-intensive` (`…c012`) | 3 lessons |
| Subjects | `/subjects` | Mathematics, English, Physics |
| Tutors | `/tutors` | Chinasa, Oluwatobi (mock profiles) |
| Lessons | `/cohorts/…c010/lessons` | Intro + diagnostic · Algebra foundations · Comprehension strategies (Google Meet) |

## Demo quiz answers

The seeded quiz ("Week 1 diagnostic quiz") is auto-graded; the correct
answer for every question is **option B (index 1)**. Pass mark 70%.

## Google OAuth (optional)

Google sign-in is **disabled until configured** — the button shows a friendly
hint. To enable:

```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URL=https://yourdomain.com/api/v1/auth/google/callback
```

Register that exact redirect URI in the Google Cloud Console (OAuth consent
screen → authorized redirect URIs).

## API quick checks

```bash
# login (returns ykay_session cookie)
curl -c jar -X POST localhost:8080/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"student@nuvora.com","password":"password123"}'

# LMS surface
curl -b jar "localhost:8080/api/v1/me/lessons?student_profile_id=00000000-0000-0000-0000-000000000001"
curl "localhost:8080/api/v1/cohorts/00000000-0000-0000-0000-00000000c010/assignments"
```
