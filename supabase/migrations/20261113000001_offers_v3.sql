-- i-SOA WorkHub v3: i-SOA publishes offers, freelancers are invited by email link,
-- split 50% i-SOA / 40% freelancer / 10% fees, payouts in crypto (NOWPayments).
-- Run AFTER the two first migrations.

-- Public registration creates freelancers only (clients no longer exist; admins are promoted by SQL).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare n text := left(coalesce(new.raw_user_meta_data->>'full_name', ''), 120);
begin
  insert into public.profiles (id, role, full_name) values (new.id, 'freelancer', n);
  insert into public.freelancer_profiles (user_id, username, display_name)
  values (new.id, 'user-' || substr(replace(new.id::text, '-', ''), 1, 10), n);
  return new;
end $$;

-- Old marketplace writes are closed.
drop policy if exists opp_insert on public.opportunities;
drop policy if exists inq_insert on public.project_inquiries;
drop policy if exists app_insert on public.applications;

-- Freelancer crypto wallet
alter table public.freelancer_profiles
  add column if not exists wallet_address text check (char_length(wallet_address) between 20 and 120),
  add column if not exists wallet_network text check (wallet_network in ('usdttrc20', 'usdtbsc', 'usdtmatic'));

-- ───────────── Offers (visible only to admin and to the assigned freelancer) ─────────────
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(title) between 5 and 140),
  category text not null check (category in ('design','development','social_media','video','writing','translation','data_entry','assistant','other')),
  description text not null check (char_length(description) between 20 and 5000),
  instructions text check (char_length(instructions) <= 5000),
  deadline date,
  freelancer_amount numeric(12,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','open','assigned','submitted','approved','paid','cancelled')),
  assigned_to uuid references public.freelancer_profiles(user_id) on delete set null,
  assigned_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index offers_status_idx on public.offers (status, created_at desc);
create index offers_assigned_idx on public.offers (assigned_to);

-- Money split lives in an admin-only table so freelancers never see the client price.
create table public.offer_finance (
  offer_id uuid primary key references public.offers(id) on delete cascade,
  price_usd numeric(12,2) not null check (price_usd > 0),
  pct_platform int not null default 50 check (pct_platform >= 0),
  pct_freelancer int not null default 40 check (pct_freelancer >= 0),
  pct_fees int not null default 10 check (pct_fees >= 0),
  freelancer_amount numeric(12,2) generated always as (round(price_usd * pct_freelancer / 100.0, 2)) stored,
  fees_amount numeric(12,2) generated always as (round(price_usd * pct_fees / 100.0, 2)) stored,
  platform_amount numeric(12,2) generated always as (price_usd - round(price_usd * pct_freelancer / 100.0, 2) - round(price_usd * pct_fees / 100.0, 2)) stored,
  constraint pct_sum check (pct_platform + pct_freelancer + pct_fees = 100)
);

create or replace function public.sync_offer_amount() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.offers set freelancer_amount = new.freelancer_amount where id = new.offer_id;
  return new;
end $$;
create trigger sync_offer_amount_trg after insert or update on public.offer_finance
for each row execute function public.sync_offer_amount();

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) <= 254),
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'pending' check (status in ('pending','sent','accepted','expired','failed')),
  expires_at timestamptz not null default now() + interval '14 days',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (offer_id, email)
);
create index invitations_offer_idx on public.invitations (offer_id);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  freelancer_id uuid not null references public.freelancer_profiles(user_id) on delete cascade,
  url text not null check (url ~* '^https?://' and char_length(url) <= 500),
  note text check (char_length(note) <= 2000),
  status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
  review_note text check (char_length(review_note) <= 1000),
  created_at timestamptz not null default now()
);
create index submissions_offer_idx on public.submissions (offer_id, created_at desc);
create index submissions_status_idx on public.submissions (status, created_at desc);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null unique references public.offers(id) on delete cascade,
  freelancer_id uuid not null references public.freelancer_profiles(user_id) on delete cascade,
  amount_usd numeric(12,2) not null check (amount_usd > 0),
  network text,
  address text,
  status text not null default 'pending' check (status in ('pending','needs_wallet','created','processing','finished','failed')),
  np_batch_id text,
  np_withdrawal_id text,
  tx_hash text,
  last_error text check (char_length(last_error) <= 500),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index payouts_status_idx on public.payouts (status, created_at desc);
create index payouts_freelancer_idx on public.payouts (freelancer_id);

-- ───────────── Public preview + claim by invitation token ─────────────
create or replace function public.offer_by_token(p_token text)
returns table (title text, category text, description text, deadline date, freelancer_amount numeric,
               pct_freelancer int, offer_status text, invite_status text, expired boolean)
language sql stable security definer set search_path = public as $$
  select o.title, o.category, o.description, o.deadline, o.freelancer_amount, f.pct_freelancer,
         o.status, i.status, (i.expires_at < now())
  from public.invitations i
  join public.offers o on o.id = i.offer_id
  join public.offer_finance f on f.offer_id = o.id
  where i.token = p_token
$$;
revoke all on function public.offer_by_token(text) from public;
grant execute on function public.offer_by_token(text) to anon, authenticated;

create or replace function public.claim_offer(p_token text) returns text
language plpgsql security definer set search_path = public as $$
declare inv record; fp record;
begin
  if auth.uid() is null then return 'login_required'; end if;
  if public.app_role() is distinct from 'freelancer' then return 'freelancer_only'; end if;
  select wallet_address, wallet_network into fp from public.freelancer_profiles where user_id = auth.uid();
  if fp.wallet_address is null or fp.wallet_network is null then return 'wallet_required'; end if;
  select i.id as inv_id, i.offer_id, i.expires_at, o.status as o_status, o.assigned_to into inv
  from public.invitations i join public.offers o on o.id = i.offer_id where i.token = p_token;
  if not found then return 'invalid'; end if;
  if inv.assigned_to = auth.uid() then return 'ok'; end if;
  if inv.expires_at < now() then return 'expired'; end if;
  if inv.o_status <> 'open' or inv.assigned_to is not null then return 'taken'; end if;
  update public.offers set status = 'assigned', assigned_to = auth.uid(), assigned_at = now()
  where id = inv.offer_id and status = 'open' and assigned_to is null;
  if not found then return 'taken'; end if;
  update public.invitations set status = 'accepted' where id = inv.inv_id;
  return 'ok';
end $$;
revoke all on function public.claim_offer(text) from public;
grant execute on function public.claim_offer(text) to authenticated;

create or replace function public.approve_submission(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s record; fp record; amt numeric;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into s from public.submissions where id = p_id and status = 'submitted';
  if not found then raise exception 'submission not found or already reviewed'; end if;
  select wallet_address, wallet_network into fp from public.freelancer_profiles where user_id = s.freelancer_id;
  select freelancer_amount into amt from public.offer_finance where offer_id = s.offer_id;
  update public.submissions set status = 'approved' where id = p_id;
  update public.offers set status = 'approved' where id = s.offer_id;
  insert into public.payouts (offer_id, freelancer_id, amount_usd, network, address, status)
  values (s.offer_id, s.freelancer_id, amt, fp.wallet_network, fp.wallet_address,
          case when fp.wallet_address is null then 'needs_wallet' else 'pending' end)
  on conflict (offer_id) do nothing;
  insert into public.notifications (user_id, type, body, link)
  select s.freelancer_id, 'submission_approved', o.title, '/dashboard/wallet' from public.offers o where o.id = s.offer_id;
end $$;
revoke all on function public.approve_submission(uuid) from public;
grant execute on function public.approve_submission(uuid) to authenticated;

-- ───────────── State sync triggers ─────────────
create or replace function public.on_submission_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.offers set status = 'submitted' where id = new.offer_id and status = 'assigned';
  elsif new.status = 'rejected' and old.status <> 'rejected' then
    update public.offers set status = 'assigned' where id = new.offer_id and status = 'submitted';
    insert into public.notifications (user_id, type, body, link)
    select new.freelancer_id, 'submission_rejected', o.title, '/dashboard/tasks/' || o.id from public.offers o where o.id = new.offer_id;
  end if;
  return new;
end $$;
create trigger on_submission_change_trg after insert or update on public.submissions
for each row execute function public.on_submission_change();

create or replace function public.on_payout_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished' and old.status <> 'finished' then
    update public.offers set status = 'paid' where id = new.offer_id;
    insert into public.notifications (user_id, type, body, link)
    select new.freelancer_id, 'payout_finished', o.title, '/dashboard/wallet' from public.offers o where o.id = new.offer_id;
  end if;
  return new;
end $$;
create trigger on_payout_change_trg after update on public.payouts
for each row execute function public.on_payout_change();

-- ───────────── RLS ─────────────
alter table public.offers enable row level security;
alter table public.offer_finance enable row level security;
alter table public.invitations enable row level security;
alter table public.submissions enable row level security;
alter table public.payouts enable row level security;

create policy offers_select on public.offers for select to authenticated
  using (public.is_admin() or assigned_to = auth.uid());
create policy offers_admin_ins on public.offers for insert to authenticated with check (public.is_admin());
create policy offers_admin_upd on public.offers for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy offers_admin_del on public.offers for delete to authenticated using (public.is_admin());

create policy finance_admin on public.offer_finance for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy invitations_admin on public.invitations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy submissions_select on public.submissions for select to authenticated
  using (freelancer_id = auth.uid() or public.is_admin());
create policy submissions_insert on public.submissions for insert to authenticated
  with check (freelancer_id = auth.uid() and status = 'submitted' and public.app_role() = 'freelancer'
              and exists (select 1 from public.offers o where o.id = offer_id and o.assigned_to = auth.uid() and o.status = 'assigned'));
create policy submissions_admin_upd on public.submissions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy payouts_select on public.payouts for select to authenticated
  using (freelancer_id = auth.uid() or public.is_admin());
create policy payouts_admin_upd on public.payouts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- No insert policy on payouts: rows are created only by approve_submission().

-- When a freelancer adds/changes the wallet, unblock payouts waiting for it.
create or replace function public.on_wallet_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.wallet_address is not null and new.wallet_network is not null
     and (new.wallet_address is distinct from old.wallet_address or new.wallet_network is distinct from old.wallet_network) then
    update public.payouts set address = new.wallet_address, network = new.wallet_network, status = 'pending'
    where freelancer_id = new.user_id and status in ('needs_wallet', 'pending');
  end if;
  return new;
end $$;
create trigger on_wallet_change_trg after update on public.freelancer_profiles
for each row execute function public.on_wallet_change();
