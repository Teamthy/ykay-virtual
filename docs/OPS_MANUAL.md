# NUVORA — Operations Manual (G5.2)

**Audience:** admin/support/safeguarding staff. Every procedure maps to an
API surface that already enforces it; this is the human side.

## 1. Vetting (admin)

1. Tutor applies → documents upload (private bucket, signed URLs).
2. Admin reviews each document (approve/reject with reason) — rejections
   MUST include a reason (shown to the tutor).
3. Interview + competency assessment (deterministic bank, auto-graded).
4. Approve → profile becomes visible in search (public only after
   `is_public` + `APPROVED`).
5. Re-verify documents at least every 12 months (calendar the review).

## 2. Lesson exception (admin)

- Reschedule/cancel flows update lessons + notify enrolled families via
  the notification jobs (`send_email` / `send_sms` / `send_push`).
- Attendance is marked per learner in the teaching console; corrections
  are audited.
- A tutor no-show is a FINANCE/ACADEMIC ticket + refund path (see refund
  policy); 3 no-shows in 30 days → delisting review.

## 3. Support (support lead)

- Queue: `GET /admin/support` (+ `?category=` for triage).
- SLAs: safeguarding 4h · HIGH/URGENT 8h · default 24h — the SLA clock is
  on the ticket (`sla_due_at`); overdue = escalation to the founder.
- Every ticket ends RESOLVED/CLOSED with a written outcome (the system
  stamps `resolved_at` automatically).

## 4. Refund (finance)

- Support lead: refunds ≤ ₦100,000 via the admin console.
- Founder approval above that (decision #7).
- Verify the ledger reconciles after every refund (orders/payments/escrow
  states in the admin payments console); finance export weekly.

## 5. Suspension (admin)

- Reasons: safeguarding (immediate), fraud/chargebacks, AUP breach.
- Procedure: suspend account → revoke sessions + devices → record reason
  in the audit log → notify the safeguarding owner same day for
  safeguarding cases.

## 6. Data-subject request (DSR)

1. Verify requester identity (and guardian link for learner data).
2. Export via `GET /me/export` (or DB export for admin cases).
3. Deletion: account deletion flow + confirm retention exceptions
   (payments 6y, safeguarding 6y) in writing.

## 7. Incident response

1. Declare severity (URGENT/HIGH/MEDIUM) → start the clock.
2. Contain: suspend affected accounts; revoke sessions/devices.
3. Investigate: audit logs, chat/message records, webhook ledger.
4. Remediate + notify affected parties (and authorities where required).
5. Post-incident write-up within 48h; update the register + runbooks.

## 8. Drills (quarterly, tabletop)

- Safeguarding report → suspend → escalate (target ≤ 4h).
- Payment dispute → refund → reconcile.
- Lost device/session → revoke → verify logout.
- DSR → export → delete with retention exceptions.
- Provider outage (gateway/SMS/video) → runbook execution (see
  `docs/DR_RUNBOOK.md` §5).
