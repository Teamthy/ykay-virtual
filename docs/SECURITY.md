# YK-Virtual security model

## Authentication

- Passwords: bcrypt, min 8 chars, letter + digit, max 72.
- Email/password login requires `ACTIVE` (email verified). PENDING users must verify first.
- Login codes prove email ownership and activate PENDING accounts.
- Sessions: 32-byte random token, SHA-256 stored, httpOnly cookie (web) or Bearer (mobile).
- Platform admins (`SUPER_ADMIN`, `ACADEMIC_ADMIN`) require emailed MFA before a session is issued.
- OTP/MFA codes are never written to production logs.
- Password change requires the current password and rotates every session.

## Authorization

- Self-service roles: STUDENT, PARENT, TUTOR only.
- `IsAdmin` is SUPER_ADMIN + ACADEMIC_ADMIN only.
- Object-level checks on payments, LMS, chat, messaging.

## Payments

- Webhooks HMAC-verified; unique provider reference; amount reconciliation.
- Gateway refund is attempted before marking an order refunded.
- Production refuses refunds if no payment secret is configured.

## Operators

- Do not seed production from `seed-admins.sql` with published hashes.
- Supply bcrypt hashes via session settings; rotate after first login.
- Cookie `Domain` must be your custom domain (e.g. `virtual.ykaycollege.com`). Never `.vercel.app` (public suffix).

## Reporting

Email security@ykaycollege.com (or the ops owner) for vulnerabilities.
