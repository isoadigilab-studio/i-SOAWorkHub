# i-SOA WorkHub — Connect. Work. Grow.

Missions published by i-SOA DigiLab (invitation-only **or** open to all freelancers), delivered by URL, reviewed by an admin, paid in **ISC** into an in-app wallet. ISC can be transferred between accounts, spent on i-SOA services, held in one-time payment tickets, and withdrawn in crypto (USDT) through **NOWPayments** after **manual KYC**.

**Stack:** Next.js 15 · TypeScript · Tailwind · Supabase (Postgres/Auth/RLS/Storage) · Cloudflare Workers (OpenNext) · Brevo (invitation emails) · NOWPayments (withdrawal payouts).

## Money rules (fixed)
- **1 USD = 0.01 ISC → 1 ISC = 100 USD.** $2 = 0.02 ISC. **Minimum withdrawal 0.02 ISC.** ISC is the only internal currency; crypto exists only as the withdrawal rail.
- Mission split (admin-only): 50% i-SOA · 40% freelancer · 10% fees. The freelancer reward is `usd_to_isc(40% of price)`; e.g. a $20 mission pays **0.08 ISC**.
- Exact decimals: DB `numeric(18,4)`; `lib/isc.ts` uses integer units (1 unit = 0.0001 ISC = 1 US cent). No floating point is persisted.

## Flow
1. Admin → Offers: create a mission (client price USD, **visibility invite|open**), publish. Invite-only missions are shared with **email invitations** (`/i/<token>`); open missions appear in every freelancer's Tasks/Search.
2. Freelancer accepts (first come, first served), delivers a URL. Admin → Review: **Approve** credits ISC **exactly once** (unique ledger index) or Reject with feedback.
3. Wallet: Home · Transfer (by wallet ID `ISC-XXXXXXXXXX`) · Payment (catalog products) · Ticket (escrowed one-time code redeemed by another i-SOA service) · Withdraw · History.
4. Withdrawal: needs **KYC approved** (admin reviews documents in `/admin/kyc`). ISC is **held first**; admin → Withdrawals: **1 · Create payout**, **2 · enter NOWPayments 2FA**; status syncs from NOWPayments; failure/rejection refunds the hold. Never marked paid from a client response.

## Setup
**Supabase SQL Editor** — run in order: `…20261112000001_schema.sql`, `…000002_seed_reference_data.sql`, `20261113000001_offers_v3.sql`, **`20261114000001_isc_wallet_v4.sql`** (skip those already run). Then make yourself admin:
```sql
update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOU@EXAMPLE.COM');
```
**Cloudflare** (Worker `isoa-workhub`) → Settings → Variables and secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (variables, Build + Runtime); `BREVO_API_KEY`, `MAIL_FROM`, `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_EMAIL`, `NOWPAYMENTS_PASSWORD` (**secrets**). The Supabase *service-role* key is **not** used anywhere.

**Other i-SOA services (Shop Game, Intelli-SOA…)**: Admin → Catalog → create products and a **merchant key** per service (shown once, only its hash is stored). The service redeems a customer's ticket server-to-server:
```
POST https://YOUR-DOMAIN/api/tickets/redeem
x-merchant-key: mk_...        { "token": "tk_...", "service": "shop-game", "ref": "order-42" }
→ { "ok": true, "amount_isc": "0.0100", "purpose": "...", "ticket_id": "..." }
```
Errors: `forbidden`, `invalid`, `expired`, `already_used_or_closed`.

## Security design
- All money moves only through `SECURITY DEFINER` functions (strict `search_path`, `auth.uid()` checks, row locks, idempotency keys). No client insert/update on wallets, ledger, tickets or withdrawals; the ledger is append-only (trigger); balances cannot go negative (CHECK).
- Internal functions (`_post`, `_ticket_release`, `_withdrawal_release`, `ensure_wallet`) are revoked from every client role.
- RLS: users see only their own wallet, ledger, tickets, withdrawals and KYC; recipients see transfers addressed to them only by wallet ID (no emails exposed); admin actions are audited.
- KYC documents live in a **private** Storage bucket (`kyc`), validated by magic bytes (not browser MIME) and viewed by admins through 5-minute signed URLs. Users cannot edit their own KYC status.
- Withdrawal status is read directly from NOWPayments with our credentials (no inbound webhook to forge). Secrets only in Cloudflare.
- Rate limiting (DB-backed), security headers, Zod validation, open-redirect protection, ticket token and merchant key stored as SHA-256 hashes.

## Legacy data
The old direct-USDT `payouts` table is untouched (rows stay readable in each user's History as "Legacy USDT payout"). New approvals no longer create payouts; they credit ISC. The old admin payout screen and its actions were removed.

## Honest limits / what to verify before real money
- Not executed here: `npm install`, `next build`, DB migrations and tests were **not run** in the authoring environment. Run CI, apply the migration on a **test Supabase project**, and run `supabase/tests/wallet_invariants.sql`. Do a real NOWPayments sandbox/test payout before going live.
- NOWPayments payout needs JWT + 2FA each time, so withdrawals are *semi-automatic* (admin confirms). Their API may require IP whitelisting; Cloudflare Workers have no fixed IP.
- Single-entry ledger: i-SOA's own revenue from purchases is tracked in `purchases`, not as a platform wallet.
- Not implemented: admin balance adjustments, daily withdrawal limits, MFA for admins, AML screening, KYC liveness checks, automated browser tests. Operating an internal currency that converts to crypto may require legal/compliance review in your jurisdiction.
