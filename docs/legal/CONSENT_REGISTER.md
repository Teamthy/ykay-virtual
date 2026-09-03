# YK-Virtual — Consent Register (G5.2)

> Every public claim that is not first-party factual content must have a
> row here. **No consent row = not publishable** (enforced by the
> testimonial approval flow, G5.3).

## Template

| ID  | What | Who consented | Scope granted | Evidence (link/file) | Date | Expiry/review | Owner |
| --- | ---- | ------------- | ------------- | -------------------- | ---- | ------------- | ----- |

## Required rows (fill before launch)

| ID   | What                                  | Who consented       | Scope                   | Evidence                   | Date | Review | Owner     |
| ---- | ------------------------------------- | ------------------- | ----------------------- | -------------------------- | ---- | ------ | --------- |
| T-01 | Testimonial — [author]                | parent/adult author | name + quote on website | signed form / email thread | ☐    | 12m    | marketing |
| T-02 | …                                     |                     |                         |                            |      |        |           |
| P-01 | Learner photo — [cohort]              | parent/guardian     | website + socials       | signed media release       | ☐    | 12m    | marketing |
| I-01 | Institution logo — [school]           | institution officer | partner section         | email/letter               | ☐    | 24m    | founder   |
| S-01 | Statistic/claim — e.g. "210→289 UTME" | data owner          | published claim         | source data + sign-off     | ☐    | 6m     | academic  |

## Rules

1. **Consent evidence is stored in the private bucket** (signed URLs) or
   the legal drive, referenced by row ID.
2. **Expiry is enforced:** the content owner re-consents or the claim is
   withdrawn at review date (testimonial withdrawal = `is_public:false`
   via the admin endpoint).
3. **Minors:** always via parent/guardian, separately from any service
   consent.
4. **Institutional names/logos:** written permission from an officer of
   the institution before first use.
