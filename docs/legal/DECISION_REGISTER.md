# NUVORA — Operating Decisions Register (G5.1)

**Owner:** Founder (decision maker) · Engineering keeps this file current.
**Status:** every row blocks a production launch until it has an owner,
an output, and a date. Fill in and commit — no launch without sign-off.

| # | Decision | Required owner/output | Status |
|---|---|---|---|
| 1 | Launch market/geography | founder: Nigeria-only vs international; timezone (Africa/Lagos), currency (NGN), tax and support implications | ☐ open |
| 2 | Account/minor model | safeguarding/legal: age threshold, parent verification/linking, consent and support rules | ☐ open |
| 3 | Tutor communication | academic/safeguarding: direct-chat permissions, moderation/escalation, contact-data visibility | ☐ open |
| 4 | Video/recordings | safeguarding/legal: recording consent, retention, access, deletion and incident workflow | ☐ open |
| 5 | Tutor commercial model | finance/legal: contractor terms, vetting evidence, payout terms, tax responsibility | ☐ open |
| 6 | Programme/pricing | academic/commercial: launch catalogue, capacity, tutor assignment, prices, enrolment windows | ☐ open |
| 7 | Cancellations/refunds | finance/ops: policy, authority limits, automated/manual flows | ☐ open |
| 8 | Data retention | legal/engineering: data classes, retention/deletion/export requirements, processor list | ☐ open |

## Engineering-visible consequences

- #1 → `SITE_URL`, currency codes, timezone defaults (already `Africa/Lagos`).
- #2 → verification flow, `parent_student_links` rules, age gates on registration.
- #3 → chat permissions (`chat_service` escalation rules).
- #4 → `meeting_*` retention jobs + recording flags.
- #5 → `payouts` cadence (currently weekly cron), vetting evidence list.
- #6 → catalogue rows must exist only via the G5.3 publish workflow.
- #7 → refund authority limits in the admin console + policy text.
- #8 → account export/delete (`/me/export`, `account_service`) retention table.

**Sign-off record:** each decision gets: owner name · date · one-line outcome · link
to the policy it updated.
