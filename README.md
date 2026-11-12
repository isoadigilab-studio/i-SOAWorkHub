# i-SOA WorkHub — Connect. Work. Grow.

Online-work platform: opportunities, freelancer marketplace, role-based dashboards (freelancer / client / admin), moderation, reports, audit logs. Languages: Malagasy, French, English.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth + RLS) · Zod · Cloudflare Workers (OpenNext) · GitHub Actions.

> Honest status: this code was written without being able to run `npm install` / `next build` in the authoring environment. Run the CI once (step 4) and fix anything it reports before going live. Features marked "not included" at the bottom are not implemented.

## 1. Supabase (one time)
1. Create a project at supabase.com. Note the **Project ref**, **URL**, **anon key**, **database password**.
2. **Authentication → Providers → Email**: keep "Confirm email" ON (email verification).
3. **Authentication → URL Configuration**: Site URL = your production URL; add Redirect URLs: `https://YOUR-DOMAIN/auth/callback` and `http://localhost:3000/auth/callback`.
4. For real email delivery at volume, set a custom SMTP under Authentication → SMTP (the built-in sender is rate-limited).
5. Migrations are applied automatically by GitHub Actions (step 3). Optional DEMO listings: paste `supabase/seed.sql` in the SQL editor (they are flagged DEMO, have no owner, cannot receive applications).

## 2. Create the first admin
Register normally on the site and verify the email, then in Supabase → SQL editor:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'YOU@EXAMPLE.COM');
```
Nobody can become admin from the website; role changes by non-admins are ignored by a database trigger.

## 3. GitHub → Cloudflare + Supabase automation
Create a repo, push this folder to `main`. In **Settings → Secrets and variables → Actions** add:

| Secret | Where to find it |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | the DB password you set at project creation |
| `SUPABASE_PROJECT_REF` | Project Settings → General |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API (anon/public key) |
| `NEXT_PUBLIC_SITE_URL` | your final URL, e.g. `https://workhub.example.com` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → template "Edit Cloudflare Workers" |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages (right side) |

Every push to `main` then: applies new SQL migrations to Supabase → typechecks → runs tests → builds → deploys the Worker `isoa-workhub`. Pull requests/branches run CI only (`.github/workflows/ci.yml`).
Never use the Supabase **service_role** key in this project; it is not needed (all access goes through Row Level Security).

## 4. First run checklist
1. Push → open the **Actions** tab. Fix anything the typecheck/build reports.
2. Cloudflare → Workers & Pages → `isoa-workhub` → Settings → Domains: attach your custom domain.
3. Cloudflare → Security → WAF → Rate limiting rules: add a rule on `/login`, `/register`, `/forgot-password` (outer layer on top of the in-app limiter).
4. Test: register a client + a freelancer (two emails), post an opportunity, approve it as admin, apply, check notifications.

## Local development
```bash
cp .env.example .env.local   # fill with your Supabase values
npm install
npm run dev                  # http://localhost:3000
npm test
npm run preview              # run the Cloudflare build locally
```

## Security design
- Authorization is enforced in Postgres (RLS policies + guard triggers), not only in the UI. Clients cannot self-publish, freelancers cannot change application status, nobody can self-promote to admin.
- Server-side Zod validation on every action; http(s)-only URLs; open-redirect protection; account-enumeration-safe password reset.
- DB-backed rate limiting (login, register, reset, apply, report, inquiry, create opportunity) + security headers.
- Admin actions are written to `admin_audit_logs`. Suspicious opportunities can be reported by any signed-in user.
- No payments, no recruitment fees, no guaranteed income claims. Demo seed data is labelled DEMO.

## Not included yet (be aware)
Opportunity editing after creation (create/close/delete only), file uploads (portfolios are links), platform-settings page, MFA for admin (enable in Supabase when available on your plan), automated end-to-end browser tests, and a Content-Security-Policy header.
