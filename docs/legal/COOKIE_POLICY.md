# NUVORA — Cookie Policy (G5.2)

> **Status: DRAFT for legal review.**

## Cookies we set

| Cookie | Purpose | Lifespan |
|---|---|---|
| `nuvora_session` | signed-in session (HttpOnly, Secure in production, SameSite=Lax) | session |
| `theme` / `locale` | UI preferences (dark mode, language) | 1 year |
| `cookie_consent` | records your banner choice | 1 year |

## Third-party

- Payment gateways (Paystack/Flutterwave) set their own cookies during
  checkout — governed by their policies.
- Analytics/performance tooling, when enabled, uses first-party metrics
  only (no advertising trackers are deployed).

## Managing cookies

You may clear cookies at any time; the site degrades gracefully (you will
just be signed out and preferences reset). The consent banner records your
choice and is re-shown only if you clear it.
