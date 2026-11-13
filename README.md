# i-SOA WorkHub — Connect. Work. Grow.

i-SOA DigiLab publishes paid missions (design, development, social media…). Freelancers are **invited by email** with a private link, accept a mission, deliver a URL, and are paid their share in **USDT** via NOWPayments.
Split per mission: **50% i-SOA · 40% freelancer · 10% fees** (stored per mission in `offer_finance`; the freelancer never sees the client price, only their own amount).

**Stack:** Next.js 15 · TypeScript · Tailwind · Supabase (Postgres/Auth/RLS) · Cloudflare Workers (OpenNext) · Brevo (invitation emails) · NOWPayments (crypto payouts).

## Flow
1. Admin → **Offers**: create a mission (client price in USD) and publish it.
2. Admin → **Invite by email**: paste emails; each gets a private link `/i/<token>`.
3. Freelancer opens the link → creates account / logs in → adds a wallet (Wallet page) → **Accept** (first come, first served).
4. Freelancer submits a URL to the finished work.
5. Admin → **Review**: Approve (creates the payout row) or Reject with feedback.
6. Admin → **Payouts**: **1 · Create payout**, then **2 · enter the 2FA code** (required by NOWPayments) → status updates to Paid with the TX hash.

## Setup (once)
**Supabase SQL Editor**: run, in order, `supabase/migrations/20261112000001_schema.sql`, `…000002_seed_reference_data.sql`, `20261113000001_offers_v3.sql` (skip the ones already run).
Make yourself admin:
```sql
update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOU@EXAMPLE.COM');
```
**Cloudflare** (Worker name must equal `name` in `wrangler.jsonc`: `i-soaworkerhub`) → Settings → Variables and secrets:

| Name | Type | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` | Variable (Build + Runtime) | `NEXT_PUBLIC_SITE_URL=https://i-soaworkerhub.isoa.workers.dev` |
| `BREVO_API_KEY`, `MAIL_FROM` | **Secret** | Brevo → SMTP & API → API keys; verify `MAIL_FROM` as a sender in Brevo |
| `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_EMAIL`, `NOWPAYMENTS_PASSWORD` | **Secret** | NOWPayments dashboard; enable 2FA; fund the custody balance |

**Supabase → Authentication → URL Configuration:** Site URL = `https://i-soaworkerhub.isoa.workers.dev`, Redirect URLs: `https://i-soaworkerhub.isoa.workers.dev/**` and `http://localhost:3000/**`.

## Security
Authorization is enforced by Postgres RLS + guard triggers. Offers are visible only to admin and the assigned freelancer; invitation tokens are 122-bit random and expire in 14 days; payouts are created only by `approve_submission()` and only an admin can start one (atomic status claim prevents double payouts); crypto API secrets live only in Cloudflare secrets; Zod validation, https-only URLs, DB-backed rate limits and security headers are on.

## Notes / limits
- NOWPayments payouts require JWT + a 2FA code each time; this app creates the payout and asks you for the code. Verify endpoint details against NOWPayments docs if their API changes.
- Payouts are sent in the amount shown (USDT = USD 1:1). Network fees depend on your NOWPayments settings (the 10% "fees" bucket is meant to cover them).
- Payment *from clients* to i-SOA is not automated here (record it yourself before publishing a mission).
- Typecheck/build were not run in the authoring environment: check the Cloudflare build log after pushing.
