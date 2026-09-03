# YK-Virtual — Privacy Notice (G5.2)

> **Status: DRAFT for legal review.** Replace placeholders (entity name,
> address, DPO contact, dates) before publication. Aligned with the Nigeria
> Data Protection Act 2023 (NDPA) and GDPR principles for any EU/UK users.

## 1. Who we are

**Operator:** ________________ (the "Company"), a Nigerian company
(registration no. ______), address ________________.
**Contact / DPO:** privacy@ykaycollege.com · response target: 30 days.

## 2. What we collect

| Category      | Examples                                                      | Purpose                  | Basis                                  |
| ------------- | ------------------------------------------------------------- | ------------------------ | -------------------------------------- |
| Account       | name, email, phone, password hash                             | authentication, support  | contract / consent                     |
| Family        | learner profile: name, DOB, school, level, guardian consent   | enrolment, safeguarding  | consent (guardian) + legal obligation  |
| Tutor vetting | ID documents, qualifications, competency results              | vetting (G4)             | consent + legitimate interest (safety) |
| Learning      | attendance, submissions, quiz results, progress reports       | deliver the service      | contract                               |
| Payments      | order/payment/escrow records (never full card numbers)        | billing, refunds, ledger | contract + legal (tax)                 |
| Device        | push tokens, app version                                      | notifications (opt-in)   | consent                                |
| Technical     | IP, user agent, session cookies, telemetry (no PII in traces) | security, performance    | legitimate interest                    |

## 3. Minors

Learner profiles are created and consented by a parent/guardian
(`parent_student_links`). We never contact a learner directly for marketing.
Data subject requests about a learner are handled through the linked parent.

## 4. Sharing

- Processors only, under contracts: hosting/DB (Render/Fly/Cloudflare),
  payment gateways (Paystack/Flutterwave), email/SMS (SMTP provider/Termii),
  object storage (S3-compatible), AI provider (chat content is PII-redacted
  before generation), video provider (Whereby, only where lessons run).
- Never sold. Disclosed to authorities only where law requires.

## 5. Retention

| Data                               | Retention                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------- |
| Active accounts + learning records | account lifetime + 90 days after deletion request                         |
| Vetting documents                  | 3 years post-relationship (regulatory) — private bucket, signed URLs only |
| Payment records                    | 6 years (tax)                                                             |
| Session cookies/devices            | session lifetime; devices until logout/revocation                         |
| Support tickets                    | 2 years (safeguarding tickets: 6 years)                                   |

## 6. Your rights

Export (GET `/me/export` — full account package), correction, deletion,
restriction, objection — via privacy@ykaycollege.com or account settings. We
respond within 30 days and verify identity before acting.

## 7. Security

Encryption in transit (TLS) and at rest; private documents served only via
expiring signed URLs; role-based access with audit logging on every
money/access mutation; backups encrypted, restore drills recorded.

## 8. Changes

Material changes are notified by email 14 days before taking effect.
