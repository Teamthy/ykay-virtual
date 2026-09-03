# YK-Virtual — Safeguarding Policy (G5.2)

> **Status: DRAFT for legal/safeguarding review — do not launch without sign-off.**
> Named safeguarding owner: ________________ (appointed before pilot).

## 1. Purpose

YK-Virtual connects minors with tutors. Every adult working with or talking to a
learner through the platform is bound by this policy. A learner's safety
outranks convenience, revenue, and confidentiality of the person reported.

## 2. Scope

Tutors, admins, support staff, contractors with platform access, and the
automated systems (chat, messaging) that mediate learner interactions.

## 3. Core rules

1. **No unmediated off-platform contact** between a tutor and a learner
   before enrolment is completed by a verified parent/guardian. All lesson
   communication stays on platform channels (cohort chat, lesson notes,
   notifications).
2. **No 1:1 private contact** between a tutor and a learner outside a
   scheduled lesson context unless the parent/guardian is included on the
   thread.
3. **Lesson conduct:** live classes are recorded by consent only (decision
   #4); tutors must teach from a neutral, visible environment; no content
   beyond the curriculum plan without academic approval.
4. **No gifts, meetings, personal social-media invites, or financial
   arrangements between tutor and learner/family outside the platform.**
5. **Vetting is non-negotiable:** every tutor completes identity, document,
   competency and reference checks (see `docs/OPS_MANUAL.md` — vetting)
   before being listed.

## 4. Reporting and escalation

- Anyone can raise a concern via the support form — select **Safeguarding**
  category (tickets are SLA'd at **4 hours**, severity floored at MEDIUM,
  queue: `GET /admin/support?category=SAFEGUARDING`).
- **Severity ladder** (owner must apply within the SLA):
  - **URGENT** — risk of imminent harm to a minor → immediately suspend the
    involved accounts (admin suspension procedure), notify the safeguarding
    owner AND legal within the hour, escalate to authorities where the law
    requires.
  - **HIGH** — grooming, abuse, or policy breach affecting a minor →
    suspend within the SLA, investigate, keep a written record.
  - **MEDIUM** — boundary concerns (off-platform invites, inappropriate
    language) → written warning or removal, recorded in the concern log.
- Every safeguarding ticket MUST end in a documented outcome (RESOLVED with
  notes) — no auto-closing.

## 5. Account suspension (safeguarding-triggered)

Admins may suspend any account immediately (status → suspended; sessions and
devices revoked — `account_service`), with reason recorded in the audit log.
Suspension for safeguarding reasons is reported to the named owner in the
same working day.

## 6. Staff training and drills

All staff complete this policy + the escalation tabletop drill (see
`docs/OPS_MANUAL.md` — drills) before pilot start; refresher every 6 months.
