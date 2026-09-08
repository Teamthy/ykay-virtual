# CBT Practice Bank — Expansion, Difficulty, Timed Attempts & the 5,000-Question Plan

Status as of 2026-09-08. Companion to `CBT-PRACTICE-STATUS.md`.

## What shipped in this round

### 1. Student-chosen difficulty
`GET /cbt/subjects/{slug}/paper` now accepts `difficulty=0|1|2|3` (0 = mixed, the
default). The filter is applied in the draw query itself
(`AND ($2 = 0 OR q.difficulty = $2)`), so a "Hard only" paper can never contain
an easy question. The sitting UI (`/lms/practice/[slug]`) exposes Mixed / Easy /
Medium / Hard.

### 2. Student-chosen time limit, enforced by the server
The same endpoint accepts `duration_minutes=0..180` (0 = untimed). Every draw
now issues an **attempt ticket**:

```
base64url(JSON claims) + "." + base64url(HMAC-SHA256(key, claims))
claims = { sid, sub, diff, dur, iat, exp, ids[] }
```

- **Stateless by design** — no attempt table, no migration. The ticket *is*
  the record of the draw.
- `POST /cbt/grade` accepts `attempt_token`. When present the server enforces:
  signature, student binding (a ticket drawn by student A cannot be graded for
  student B), id binding (answers for questions that were never drawn are
  rejected), and the deadline (`exp`, with a 30-second grace so a browser
  auto-submit at 00:00 still lands).
- An empty token still grades (legacy untimed path), so older clients keep
  working. Timed sittings always send the token.
- **Key management:** `CBT_ATTEMPT_SECRET` (optional env, ≥32 chars in
  production) pins the signing key across restarts/instances. Unset, a random
  key is generated per boot and in-flight timed attempts are orphaned by a
  restart. For a practice bank this is acceptable; set the variable before you
  care about restart-safe timed sittings.
- Client behaviour: timed sittings count down to the **server** deadline (not a
  local budget) and auto-submit at zero; untimed sittings keep the 45s/question
  pacing aid, which no longer auto-submits.

### 3. 120 NERDC scheme-aligned questions (bank now 2,181)
`internal/bankdata/bank.csv` gained 120 hand-written questions mapped to real
NERDC weekly topics — the first tranche that covers **JSS1 (40), JSS2 (20),
JSS3 (20)** alongside SS1 (24) and SS2/SS3 (8 each). Sources
are tagged `nerdc-<class>-<subject>-w<week>` (e.g. `nerdc-jss1-maths-w03`).
Every question carries a 2–4 sentence worked explanation.

| Class | Questions added |
|---|---|
| jss1 | 40 (maths 20, basic science 10, English 10) |
| jss2 | 20 (maths 12, basic science 8) |
| jss3 | 20 (maths 12, basic science 4, civic 4) |
| ss1 | 24 (maths 12, physics 4, chemistry 4, biology 4) |
| ss2 | 8 |
| ss3 | 8 |
| **Total** | **120 → bank = 2,181** |

`internal/bankdata/bank_test.go` is a CI gate: every row must have a stem, four
options, an in-range key, a source and a non-empty explanation; stems must be
unique per subject; and **every `nerdc-*` row must carry a ≥40-character
explanation**. The legacy 2,061 rows keep terse explanations (a known audit
finding) — the gate deliberately does not fail on them, see "Open work" below.

### 4. Admin console & syncing
No new surface was needed. Bank content syncs to the admin console through the
existing, already-shipped path:

- **First boot:** `SeedIfAbsent` imports the embedded CSV (idempotent — only
  when the table is empty).
- **Existing deployments:** `POST /admin/cbt/import` (multipart CSV or raw
  body) upserts subjects by slug and skips duplicate stems, so re-importing the
  updated `bank.csv` after an upgrade adds exactly the 120 new rows and touches
  nothing else. This is the documented upgrade step for schools already
  running.
- The admin console (`/admin/cbt`) browses, authors, publishes/unpublishes and
  deletes questions against the same store students draw from.

## The 5,000-question target — an honest plan, not a claim

The bank is **2,181 today**. Getting to 5,000 is an allocation plan with a
quality bar, not something this commit ships:

| Tranche | Size | Source discipline |
|---|---|---|
| Current bank | 2,181 | JAMB/WAEC/NECO-adapted + NERDC tranche 1 |
| NERDC JSS1–3 completion (all subjects, all terms) | +1,100 | weekly scheme topics, `nerdc-*` sources, 2–4 sentence explanations, CI gate applies |
| NERDC SS1–3 completion (sciences, humanities, business) | +1,100 | same bar |
| WASSCE/UTME past-paper adaptation refresh | +619 | tagged `waec-*`/`utme-*` with year |

Rules for every tranche: no duplicate stems (importer + CI gate), every
question explained, difficulty honestly tagged, answer keys verified by a
second pass before merge. At that pace 5,000 lands in 3–4 content tranches.
**Nothing in the UI or docs claims 5,000 questions until the row count says
so.**

## College students (YKAY College → YK Virtual)

College students sign in to YK Virtual with their portal credentials via the
federated login (`docs/COLLEGE_SSO.md`); once signed in they are ordinary
authenticated students and the whole practice bank is available to them.
**Per-subject gating** ("only subjects they are enrolled in") is *not* built:
YK Virtual has no enrollment record for college students yet. That requires
the portal handoff to carry the student's subject list (or a lookup API) and a
draw-time check — tracked as the next CBT increment, deliberately not faked
with client-side filtering.

## Open work / limitations (explicit)

1. **Legacy explanations are terse.** 2,061 pre-existing rows have
   one-line restatements. Enriching them is content work, tracked above.
2. **Bank attempts are stateless.** No attempt history/analytics for the
   practice bank (the tutor-authored exam engine keeps full attempt records;
   the bank does not). If history becomes a requirement it is a new table +
   migration, not a ticket change.
3. **No per-subject enrollment gate** for college students (see above).
4. Timed tickets die on restart unless `CBT_ATTEMPT_SECRET` is set.
