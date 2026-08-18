# Can 50 people test NUVORA end-to-end?

**Short answer: yes for signup, login, Google, dashboards, browse, and
checkout in Paystack *test* mode** — if Render stays up and SMTP/Google
are configured. **No** for 50 simultaneous *live* card charges, SMS OTP,
or load-test proof.

## What each tester should do

| Role | Path | Lands on |
|---|---|---|
| Parent (email) | `/onboarding` → verify code → Parent | `/dashboard` |
| Parent (Google) | `/login` → Google → pick role | `/dashboard` after step 7 |
| Student | Role = Student | `/student-dashboard` (own learner profile created) |
| Tutor | Role = Tutor | `/become-tutor/apply` then `/tutor-dashboard` |
| School | Role = School | Saved as **PARENT** (admin roles cannot be self-assigned) → `/dashboard` |

Returning users with `onboarded` skip signup and go to `homeForRoles`.

Wrong dashboard URL is redirected by `RoleGate`. Signed-out `/dashboard`
goes to `/login`.

## Capacity (honest)

| Constraint | Limit | 50 testers |
|---|---|---|
| Auth rate limit | 240 / min / IP | OK unless all share one school NAT |
| Resend free | ~100 emails / day | 50 signups OK; Google needs **0** emails |
| Neon free | 0.5 GB + scale-to-zero | Fine for 50 accounts |
| Render free | Sleeps after idle | First request after sleep is slow |
| Paystack **test** | Unlimited test cards | Use test keys only |
| Jitsi | Public rooms | OK for demo lessons |
| Inbox | Fixed `display_name` SQL | Redeploy API after that commit |

## Do **not** claim

- 50 concurrent live Paystack settlements
- Formal 1k-DAU load test
- Institution-admin self-signup
- Pre-booking tutor WebSocket chat

## Smoke script for one tester

1. Incognito → `/onboarding` or Google `/login`  
2. Finish role + path + Finish setup  
3. Confirm dashboard matches role  
4. Parent: add learner on dashboard  
5. Browse `/tutors`, `/cohorts`, `/programmes`  
6. Logout → login again → **no** wizard (onboarded)  
7. Open `/messages` (empty list, not 500)
