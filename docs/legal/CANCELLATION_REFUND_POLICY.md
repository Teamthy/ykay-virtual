# YK-Virtual — Cancellation & Refund Policy (G5.2)

> **Status: DRAFT for finance/legal sign-off (decision #7).** The admin
> console enforces these flows (`refund` + `confirm-payment` endpoints).

## 1. Cohort programmes

| When                                 | Outcome                                                    |
| ------------------------------------ | ---------------------------------------------------------- |
| Before cohort start (≥ 7 days)       | 100% refund, no question                                   |
| Before cohort start (< 7 days)       | 100% refund minus ₦______ admin fee                        |
| After start, within first 2 sessions | pro-rata refund of unattended sessions                     |
| After first 2 sessions               | no refund; credit toward a future cohort at ops discretion |

## 2. Private tuition

- Cancel ≥ 24h before a scheduled lesson: full refund of that lesson or
  reschedule at no cost.
- Cancel < 24h: reschedule at the tutor's discretion; refund only on
  tutor non-attendance.
- Tutor cancels: full refund (or reschedule + ₦______ goodwill credit).

## 3. Tutor non-attendance / no-show

If a tutor misses a scheduled lesson without an agreed reschedule within 7
days, the lesson is refunded and the incident is recorded on the tutor's
record (repeated incidents → delisting per `docs/OPS_MANUAL.md`).

## 4. Refund mechanics

- Refunds are processed through the admin console → gateway reversal →
  escrow release, each step audited (`audit_logs`, action `REFUND`).
- Refund approval authority: ≤ ₦100,000 support lead; above that, founder
  (decision #7).
- Refund timelines: 3–7 business days to the original payment method.

## 5. Exclusions

Completed lessons, used assessments, and digital resources already
consumed are non-refundable. Chargeback abuse (disputing while using the
service) may lead to account suspension.

## 6. Disputes

Open a support ticket (category FINANCE). Escalation: support lead → founder
→ external arbitration as required by Nigerian law.
