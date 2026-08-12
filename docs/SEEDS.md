# NUVORA — Working Seed / Demo Accounts (dev mode)

All accounts are seeded **only** when Postgres is unavailable (in-memory dev
fallback). Password defaults to `password123` and is overridable via the
`DEMO_PASSWORD` env var. In production, no demo accounts exist and the API
fails fast if the database is unreachable.

## Accounts (all verified working)

| Role    | Email              | Password     | Dashboard                          | User ID (suffix) |
|---------|--------------------|--------------|------------------------------------|------------------|
| Admin   | `admin@nuvora.com` | `password123` | `/admin` (analytics, vetting queue)| `…00a1` |
| Parent  | `parent@nuvora.com`| `password123` | `/dashboard`                       | `…00a2` |
| Tutor   | `tutor@nuvora.com` | `password123` | `/tutor-dashboard`, `/lms/tutor`   | `…00a3` |
| Student | `student@nuvora.com`| `password123` | `/student-dashboard`, `/lms`       | `…00a4` |

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
