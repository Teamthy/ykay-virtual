# Payments, WhatsApp & Email Setup Runbook + Domain Migration

> Exact steps to activate Paystack (live), Termii (WhatsApp/SMS) and Resend
> (email) on the current Render API, run the ₦1,000 money loop, and move to a
> .com domain with zero downtime. Budget target: ₦50k / 3 months.

## 0. Current state

- API: `https://ykay-virtual.onrender.com` (Render, healthy).
- Web: `https://ykay-virtual-wtar.vercel.app` (Vercel).
- Env vars live in Render → your service → Environment. Changes take effect
  on redeploy (Render restarts the service automatically).

## 1. Paystack (payments in AND out)

### 1a. Keys

1. Log in at dashboard.paystack.com → Settings → API Keys & Webhooks.
2. Copy the **Live Secret Key** (`sk_live_...`) — never the public key for the
   API.
3. Render env:
   - `PAYSTACK_SECRET` = `sk_live_...` (bank-list resolution + webhook
     verification + transfers all read this one value).
   - Keep `PAYSTACK_PUBLIC_KEY` (Vercel `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`)
     as `pk_live_...`.
4. Webhook: Settings → API Keys & Webhooks → Webhook URL =
   `https://ykay-virtual.onrender.com/api/v1/payments/webhooks/paystack`
   (the route exists at `/payments/webhooks/{provider}`). Save — the API
   verifies every webhook signature with `PAYSTACK_SECRET`.

### 1b. Payouts (money out)

1. Render env: `PAYSTACK_TRANSFER_ENABLED=false` → **`true`** once you want
   real transfers (it is fail-closed by design: false = payouts refuse to run).
2. Paystack: Settings → Transfers. Add your bank/balance; if the dashboard
   shows "OTP required" on transfer init, the existing
   `PAYSTACK_TRANSFER_OTP` flow in the admin payouts console handles
   entering it (one-click transfers with OTP finalize were built in).
3. Tutor side: tutor saves bank details (mobile `Tutor → Earnings → Bank
details`, or web) → admin approves payouts in the web console.

### 1c. The ₦1,000 test cohort (this batch)

`go run ./cmd/seedlms --tutor-email samaliu333@gmail.com --test-cohort` seeds
a **PUBLISHED "Payment test cohort — N1,000"** (code `NV-PAYTEST`, fee
₦1,000, 50 seats, one scheduled lesson, attached to your tutor). Money loop:

1. Log in as any parent/learner account → the cohort appears in the
   catalogue → **Enrol** → Paystack checkout.
2. Pay **₦1,000** (real card on live keys; Paystack also offers test cards
   only on test keys — for the real loop use a real ₦1,000).
3. Check: order shows PAID → the ₦1,000 sits in **escrow** (admin console →
   In escrow metric; tutor Earnings → Held).
4. Deliver the lesson (or mark attendance) → admin releases the escrow.
5. Tutor Earnings → Released → admin pays out → Paystack transfer lands in
   the tutor's bank account. Loop verified end-to-end.

## 2. WhatsApp + SMS (free path — skip Termii's $50 bundle)

**You do NOT need to pay Termii's ~$50 WhatsApp bundle.** That fee is
Termii's prepaid top-up for the WhatsApp channel; Meta charges the same
conversations directly, and Meta's own Cloud API gives you **1,000 free
service conversations/month**.

1. **SMS (Termii, pay-per-message)**: sign up at termii.com → API key →
   Sender ID. Render: `TERMII_API_KEY`, `TERMII_SENDER_ID`, `TERMII_FROM`.
2. **WhatsApp (Meta Cloud API, free)**: business.facebook.com → create a
   business → WhatsApp Manager → connect your number → developers.facebook.com
   → My Apps → WhatsApp → **API Setup** → copy the **Permanent token** and
   the **Phone number ID**. Render:
   - `WHATSAPP_CLOUD_TOKEN` = the token
   - `WHATSAPP_CLOUD_PHONE_ID` = the phone number id
     (boot log shows `whatsapp provider active: meta-cloud`.)
3. **Numbers** (both paths):
   - `WHATSAPP_BUSINESS_NUMBER` = the number advertised on the site — the
     wa.me chat button needs ONLY this, no API at all (free).
   - `WHATSAPP_ADMIN_NUMBER` = YOUR number, digits only — ops alerts (new
     lead, ticket, payment) land here.
4. Verify: trigger a lead or support ticket → your number receives the
   notification; the chat widget opens wa.me with the business number.
5. If you later outgrow the free tier, either pay Meta per-conversation
   (cheap) or switch to Termii by setting `TERMII_WHATSAPP_SENDER` — the
   code picks the provider automatically (meta-cloud → termii → none).

## 3. Resend (email)

1. Sign up at resend.com → **API Keys** → create a key.
2. **Domain**: Resend → Domains → add your sending domain (works even
   before you buy the final domain — use your .com once you buy it) →
   click **Verify** (it auto-adds the DNS records when the domain is on
   Resend's partner DNS, otherwise it shows the SPF/DKIM records to paste
   into Cloudflare — 3 TXT/CNAME records).
3. Render env:
   - `RESEND_API_KEY` = `re_...`
   - `EMAIL_FROM` = `YK-Virtual <no-reply@yourdomain.com>`
   - `EMAIL_PROVIDER` = `resend`
   - (clear `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` if they were set)
4. Verify: boot logs print `email provider active: resend`; then log in as
   super admin → web admin console → **"Send test email to myself"** (this
   button exists). You should receive the branded test mail.

## 4. "If I use Oracle, do I still need a VPS?"

**No — Oracle IS your VPS.** The Oracle Cloud _Always Free_ tier gives you a
permanent virtual machine (4 Arm cores / 24 GB RAM / 200 GB disk). That one
VM runs your API, Postgres, Redis, worker and ClamAV via your existing
`docker-compose.yml`. You never rent a second server.

What Cloudflare adds is the _edge_ in front of it (DNS, CDN, SSL, DDoS
protection) — it doesn't replace the VM, because a Postgres database and a
long-running Go API need a real server behind the proxy.

So the total picture: **1 free Oracle VM + free Cloudflare in front + free
Vercel for the website = ₦0 hosting.** The only cost is the domain
(~₦6–8k/year).

## 5. Moving to a .com domain — zero downtime

Order of operations (every step keeps the old URLs alive):

1. **Buy the .com** (Cloudflare Registrar is cheapest; or Namecheap).
   Do NOT change anything on the live sites yet.
2. **Add it to Cloudflare** (free plan). Cloudflare imports your existing
   DNS; the domain now resolves through Cloudflare.
3. **Vercel**: Project → Settings → Domains → add `www.yourdomain.com` +
   `yourdomain.com`. Vercel serves the site on the new domain while
   `ykay-virtual-wtar.vercel.app` keeps working — both stay live. Set
   `NEXT_PUBLIC_API_URL`/`ALLOWED_ORIGINS` to include the new domain and
   `COOKIE_DOMAIN` = `yourdomain.com`.
4. **API**: Cloudflare DNS → add `api.yourdomain.com` → **CNAME**
   `ykay-virtual.onrender.com` (proxied/orange). Render env:
   `ALLOWED_ORIGINS` += `https://yourdomain.com` and
   `https://www.yourdomain.com`; `COOKIE_DOMAIN` = `.yourdomain.com`
   (or the same custom domain you'll use later on the VM).
5. **Switch the app(s)**: point Vercel + EAS (`EXPO_PUBLIC_API_URL`) at
   `https://api.yourdomain.com/api/v1`. Old URLs continue working until you
   are satisfied — this is why there is no downtime window.
6. **Later, when you migrate to Oracle**: change the same CNAME to the VM's
   IP (A record). Users see no change — the URL never moves.
7. Optional: `www` → Vercel via CNAME `cname.vercel.com`.

Throughout, `ykay-virtual.onrender.com` and `*.vercel.app` stay healthy
backups — nothing is turned off until the new domain has been live for a few
days.

## 6. Checklist summary

| Step                                           | Where                                                                                               | Cost                                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Paystack live key + webhook + transfers        | dashboard.paystack.com + Render                                                                     | ₦0 (fees only per transaction)                     |
| ₦1,000 test cohort                             | `go run ./cmd/seedlms --tutor-email samaliu333@gmail.com --test-cohort` (local or via Render shell) | ₦1,000 (your own test money, paid out back to you) |
| Termii key + WhatsApp sender + 2 numbers       | termii.com + Render                                                                                 | ₦0 (per-message fees)                              |
| Resend key + verified domain + provider=resend | resend.com + Render                                                                                 | ₦0 (free tier 100/day, 3k/month)                   |
| Oracle VM                                      | cloud.oracle.com → Always Free A1.Flex                                                              | ₦0                                                 |
| Cloudflare front + .com domain                 | cloudflare.com                                                                                      | ~₦6–8k/year                                        |
| UptimeRobot                                    | uptimerobot.com free                                                                                | ₦0                                                 |

All of this lands inside the ₦50k/3-month budget with ~₦42k to spare.

## 7. Money-movement controls & reconciliation (2026-10-27 hardening)

What the code now guarantees (enforced in this order — service CAS →
DB constraints → ledger):

1. **Exactly-once settlement.** Webhook, `POST /me/orders/{id}/verify` and the
   admin manual-confirm all settle through one atomic
   `PENDING|CANCELLED → PAID` compare-and-set (`orders.TryMarkPaid`). Only
   one winner; every loser acknowledges the event as a duplicate and runs
   **zero** side effects (no second escrow hold, enrollment, or Plus
   activation). A late capture on a checkout abandoned by the seat-leak cron
   still revives the order by design (CANCELLED is settleable; REFUNDED and
   PAID never are).
2. **Over-capture quarantine.** When the gateway captures funds for an
   order that is already PAID, the webhook returns
   `{"processed":true,"duplicate":true,"reason":"order_already_settled"}`,
   the attempt stays visibly `PENDING`, and an audit row with
   `action=duplicate_settlement_blocked` (type `payment_webhook`) records the
   reference + amount. **Action:** refund that reference at Paystack and
   note it on the order — never re-run settlement by hand.
3. **Escrow backstop.** `uq_escrow_holds_order_id` — one hold per order is
   impossible to violate at the storage layer (double-payout defense).
   `payouts` additionally stays UNIQUE per escrow hold; release/refund go
   through the YK-007 compare-and-set.
4. **Wallet ledger (wallet_transactions).** Every balance change writes an
   append-only journal row in the same atomic statement (`wallet_apply()`),
   with a unique `idempotency_key` (`referral_reward:{id}`,
   `escrow_refund:{holdId}`) so retried/concurrent credits apply exactly
   once. Health invariant — run weekly (must return **zero rows**):

   ```sql
   SELECT w.user_id, w.balance,
          COALESCE(SUM(CASE WHEN t.direction='CREDIT'  THEN t.amount END),0)
        - COALESCE(SUM(CASE WHEN t.direction='DEBIT'   THEN t.amount END),0) AS ledger
   FROM wallets w
   LEFT JOIN wallet_transactions t ON t.wallet_id = w.id
   GROUP BY w.user_id, w.balance
   HAVING w.balance IS DISTINCT FROM
          COALESCE(SUM(CASE WHEN t.direction='CREDIT' THEN t.amount END),0)
        - COALESCE(SUM(CASE WHEN t.direction='DEBIT'  THEN t.amount END),0);
   ```

5. **Referral rewards are effectively-once** — ledger idempotency key +
   `uq_referral_rewards_referral_id` (one reward row per referral), and the
   sequence resumes safely from a crash between "qualified" and "rewarded".
6. **Abandon sweep vs payment race** — the seat-leak cron cancels through
   `CancelIfPending` (compare-and-set), so it can never overwrite a PAID
   order; if it loses the race the seat stays taken.
7. **Backups must prove readability.** `scripts/backup.sh` and the compose
   backup service now run `pg_restore --list` on every dump before recording
   the success heartbeat; `YKVirtualBackupStale` / failure heartbeats page
   via Prometheus.

**Known, accepted for launch:** Go carries money as `float64` while
Postgres stores `DECIMAL(12,2)` (2-dp rounding at boundaries; integer minor
units is a future refactor); backups are daily `pg_dump` (RPO ≤ 24 h — enable
WAL archiving/PITR when the RPO must be lower); refunds stay
`PAYMENT_REFUNDS_ENABLED=false` until the certified gateway refund flow is
switched on (YK-006 fail-closed).
