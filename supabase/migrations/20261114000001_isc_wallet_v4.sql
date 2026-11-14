-- i-SOA WorkHub v4: ISC wallet (append-only ledger), open + invite missions, tickets, withdrawals, manual KYC.
-- Fixed rate (non-negotiable): 1 USD = 0.01 ISC  =>  1 ISC = 100 USD. Minimum withdrawal = 0.02 ISC ($2).
-- Run after the three previous migrations. Forward-only.

-- ───────────── Profiles: KYC status (users cannot change it) ─────────────
alter table public.profiles add column if not exists kyc_status text not null default 'none'
  check (kyc_status in ('none', 'pending', 'approved', 'rejected'));

create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
    new.kyc_status := old.kyc_status;
  end if;
  new.id := old.id;
  return new;
end $$;

-- ───────────── Offers: visibility (invite | open) + private instructions ─────────────
alter table public.offers add column if not exists visibility text not null default 'invite'
  check (visibility in ('invite', 'open'));

create table if not exists public.offer_private (
  offer_id uuid primary key references public.offers(id) on delete cascade,
  instructions text check (char_length(instructions) <= 5000)
);
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'offers' and column_name = 'instructions') then
    insert into public.offer_private (offer_id, instructions)
      select id, instructions from public.offers where instructions is not null
      on conflict (offer_id) do nothing;
    alter table public.offers drop column instructions;
  end if;
end $$;
alter table public.offer_private enable row level security;
create policy offer_private_select on public.offer_private for select to authenticated
  using (public.is_admin() or exists (select 1 from public.offers o where o.id = offer_id and o.assigned_to = auth.uid()));
create policy offer_private_admin_ins on public.offer_private for insert to authenticated with check (public.is_admin());
create policy offer_private_admin_upd on public.offer_private for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy offer_private_admin_del on public.offer_private for delete to authenticated using (public.is_admin());

-- Open missions are visible to every active freelancer (price/split stay in admin-only offer_finance).
create policy offers_open_select on public.offers for select to authenticated
  using (status = 'open' and visibility = 'open' and public.app_role() = 'freelancer');

-- Accepting no longer requires a crypto wallet (earnings are paid in ISC).
create or replace function public.claim_offer(p_token text) returns text
language plpgsql security definer set search_path = public as $$
declare inv record;
begin
  if auth.uid() is null then return 'login_required'; end if;
  if public.app_role() is distinct from 'freelancer' then return 'freelancer_only'; end if;
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

create or replace function public.claim_open_offer(p_offer uuid) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return 'login_required'; end if;
  if public.app_role() is distinct from 'freelancer' then return 'freelancer_only'; end if;
  update public.offers set status = 'assigned', assigned_to = auth.uid(), assigned_at = now()
  where id = p_offer and status = 'open' and visibility = 'open' and assigned_to is null;
  if not found then return 'taken'; end if;
  return 'ok';
end $$;
revoke all on function public.claim_open_offer(uuid) from public, anon;
grant execute on function public.claim_open_offer(uuid) to authenticated;

-- ───────────── Currency helpers (single source of truth in the database) ─────────────
create or replace function public.usd_to_isc(p_usd numeric) returns numeric
language sql immutable as $$ select round(p_usd * 0.01, 4) $$;
create or replace function public.isc_to_usd(p_isc numeric) returns numeric
language sql immutable as $$ select round(p_isc * 100, 2) $$;

-- ───────────── Wallet accounts + immutable ledger ─────────────
create table public.wallet_accounts (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  code text not null unique default ('ISC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  available numeric(18,4) not null default 0 check (available >= 0),
  held numeric(18,4) not null default 0 check (held >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  tx_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete restrict,
  bucket text not null check (bucket in ('available', 'held')),
  amount numeric(18,4) not null check (amount <> 0),
  kind text not null check (kind in ('earning','transfer_out','transfer_in','payment','ticket_hold','ticket_release','ticket_payment','withdrawal_hold','withdrawal_release','withdrawal_paid','adjustment')),
  ref_type text,
  ref_id uuid,
  description text check (char_length(description) <= 200),
  idempotency_key text check (char_length(idempotency_key) between 8 and 64),
  created_at timestamptz not null default now()
);
create index ledger_user_idx on public.ledger_entries (user_id, created_at desc);
create unique index ledger_idem_uidx on public.ledger_entries (user_id, idempotency_key, kind) where idempotency_key is not null;
create unique index ledger_earning_uidx on public.ledger_entries (ref_id) where kind = 'earning';

create or replace function public.ledger_immutable() returns trigger
language plpgsql as $$ begin raise exception 'ledger entries are immutable'; end $$;
create trigger ledger_no_update before update or delete on public.ledger_entries
for each row execute function public.ledger_immutable();

create or replace function public.ensure_wallet(p_user uuid) returns void
language sql security definer set search_path = public as $$
  insert into public.wallet_accounts (user_id) values (p_user) on conflict (user_id) do nothing
$$;
revoke all on function public.ensure_wallet(uuid) from public, anon, authenticated;

create or replace function public.profile_create_wallet() returns trigger
language plpgsql security definer set search_path = public as $$
begin insert into public.wallet_accounts (user_id) values (new.id) on conflict do nothing; return new; end $$;
create trigger profile_create_wallet_trg after insert on public.profiles
for each row execute function public.profile_create_wallet();
insert into public.wallet_accounts (user_id) select id from public.profiles on conflict do nothing;

-- Internal posting primitive: never callable by clients.
create or replace function public._post(p_user uuid, p_bucket text, p_amount numeric, p_kind text, p_tx uuid,
  p_ref_type text, p_ref uuid, p_desc text, p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.ledger_entries (tx_id, user_id, bucket, amount, kind, ref_type, ref_id, description, idempotency_key)
  values (p_tx, p_user, p_bucket, p_amount, p_kind, p_ref_type, p_ref, left(p_desc, 200), p_key);
  if p_bucket = 'available' then
    update public.wallet_accounts set available = available + p_amount, updated_at = now() where user_id = p_user;
  else
    update public.wallet_accounts set held = held + p_amount, updated_at = now() where user_id = p_user;
  end if;
  if not found then raise exception 'wallet missing'; end if;
end $$;
revoke all on function public._post(uuid, text, numeric, text, uuid, text, uuid, text, text) from public, anon, authenticated;

-- ───────────── Mission approval credits ISC exactly once ─────────────
create or replace function public.approve_submission(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s record; usd numeric; isc numeric; tx uuid := gen_random_uuid();
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into s from public.submissions where id = p_id and status = 'submitted' for update;
  if not found then raise exception 'submission not found or already reviewed'; end if;
  select freelancer_amount into usd from public.offer_finance where offer_id = s.offer_id;
  isc := public.usd_to_isc(usd);
  if isc <= 0 then raise exception 'reward rounds to zero'; end if;
  perform public.ensure_wallet(s.freelancer_id);
  perform 1 from public.wallet_accounts where user_id = s.freelancer_id for update;
  update public.submissions set status = 'approved' where id = p_id;
  perform public._post(s.freelancer_id, 'available', isc, 'earning', tx, 'offer', s.offer_id, 'Mission reward', null);
  update public.offers set status = 'paid' where id = s.offer_id;
  insert into public.notifications (user_id, type, body, link)
  select s.freelancer_id, 'submission_approved', o.title, '/dashboard/wallet' from public.offers o where o.id = s.offer_id;
end $$;

-- ───────────── Transfers ─────────────
create or replace function public.wallet_transfer(p_to_code text, p_amount numeric, p_note text, p_key text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); to_id uuid; tx uuid := gen_random_uuid(); my_code text; to_code text; bal numeric;
begin
  if me is null then return 'login_required'; end if;
  if public.app_role() is null then return 'suspended'; end if;
  if p_amount is null or p_amount <= 0 or round(p_amount, 4) <> p_amount then return 'invalid_amount'; end if;
  if p_key is null or char_length(p_key) < 8 or char_length(p_key) > 64 then return 'invalid_key'; end if;
  select user_id, code into to_id, to_code from public.wallet_accounts where code = upper(trim(p_to_code));
  if to_id is null or not exists (select 1 from public.profiles where id = to_id and status = 'active') then return 'recipient_not_found'; end if;
  if to_id = me then return 'self_transfer'; end if;
  perform 1 from public.wallet_accounts where user_id in (me, to_id) order by user_id for update;
  if exists (select 1 from public.ledger_entries where user_id = me and idempotency_key = p_key and kind = 'transfer_out') then return 'ok'; end if;
  select available, code into bal, my_code from public.wallet_accounts where user_id = me;
  if bal < p_amount then return 'insufficient_funds'; end if;
  perform public._post(me, 'available', -p_amount, 'transfer_out', tx, 'wallet', to_id, 'To ' || to_code || coalesce(' — ' || left(p_note, 100), ''), p_key);
  perform public._post(to_id, 'available', p_amount, 'transfer_in', tx, 'wallet', me, 'From ' || my_code || coalesce(' — ' || left(p_note, 100), ''), null);
  return 'ok';
end $$;
revoke all on function public.wallet_transfer(text, numeric, text, text) from public, anon;
grant execute on function public.wallet_transfer(text, numeric, text, text) to authenticated;

-- ───────────── i-SOA services catalog, product payments ─────────────
create table public.services (
  code text primary key check (code ~ '^[a-z0-9_-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 300),
  active boolean not null default true
);
create table public.service_products (
  id uuid primary key default gen_random_uuid(),
  service_code text not null references public.services(code) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  price_isc numeric(18,4) not null check (price_isc > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  product_id uuid references public.service_products(id) on delete set null,
  service_code text not null,
  product_name text not null,
  price_isc numeric(18,4) not null,
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  created_at timestamptz not null default now()
);
create index purchases_user_idx on public.purchases (user_id, created_at desc);

create or replace function public.wallet_pay_product(p_product uuid, p_key text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); pr record; tx uuid := gen_random_uuid(); bal numeric; pid uuid;
begin
  if me is null then return 'login_required'; end if;
  if public.app_role() is null then return 'suspended'; end if;
  if p_key is null or char_length(p_key) < 8 or char_length(p_key) > 64 then return 'invalid_key'; end if;
  select p.id, p.name, p.price_isc, p.service_code into pr from public.service_products p
    join public.services s on s.code = p.service_code where p.id = p_product and p.active and s.active;
  if not found then return 'product_not_found'; end if;
  perform 1 from public.wallet_accounts where user_id = me for update;
  if exists (select 1 from public.ledger_entries where user_id = me and idempotency_key = p_key and kind = 'payment') then return 'ok'; end if;
  select available into bal from public.wallet_accounts where user_id = me;
  if bal < pr.price_isc then return 'insufficient_funds'; end if;
  insert into public.purchases (user_id, product_id, service_code, product_name, price_isc)
  values (me, pr.id, pr.service_code, pr.name, pr.price_isc) returning id into pid;
  perform public._post(me, 'available', -pr.price_isc, 'payment', tx, 'purchase', pid, pr.service_code || ' — ' || pr.name, p_key);
  return 'ok';
end $$;
revoke all on function public.wallet_pay_product(uuid, text) from public, anon;
grant execute on function public.wallet_pay_product(uuid, text) to authenticated;

-- ───────────── Payment tickets (escrowed ISC redeemed by a merchant service server-to-server) ─────────────
create table public.ticket_merchants (
  service_code text primary key references public.services(code) on delete cascade,
  key_hash text not null check (key_hash ~ '^[a-f0-9]{64}$'),
  rotated_at timestamptz not null default now()
);
create table public.payment_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  service_code text not null references public.services(code),
  purpose text not null check (char_length(purpose) between 3 and 80),
  amount_isc numeric(18,4) not null check (amount_isc > 0),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'open' check (status in ('open', 'redeemed', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  merchant_ref text check (char_length(merchant_ref) <= 120),
  created_at timestamptz not null default now()
);
create index tickets_user_idx on public.payment_tickets (user_id, created_at desc);

create or replace function public.ticket_create(p_service text, p_purpose text, p_amount numeric, p_minutes int, p_token_hash text, p_key text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); tx uuid := gen_random_uuid(); bal numeric; tid uuid;
begin
  if me is null then return 'login_required'; end if;
  if public.app_role() is null then return 'suspended'; end if;
  if p_amount is null or p_amount <= 0 or round(p_amount, 4) <> p_amount then return 'invalid_amount'; end if;
  if p_minutes is null or p_minutes < 5 or p_minutes > 10080 then return 'invalid_input'; end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_key is null or char_length(p_key) < 8 or char_length(p_key) > 64 then return 'invalid_input'; end if;
  if not exists (select 1 from public.services where code = p_service and active) then return 'product_not_found'; end if;
  perform 1 from public.wallet_accounts where user_id = me for update;
  if exists (select 1 from public.ledger_entries where user_id = me and idempotency_key = p_key and kind = 'ticket_hold') then return 'ok'; end if;
  select available into bal from public.wallet_accounts where user_id = me;
  if bal < p_amount then return 'insufficient_funds'; end if;
  insert into public.payment_tickets (user_id, service_code, purpose, amount_isc, token_hash, expires_at)
  values (me, p_service, left(p_purpose, 80), p_amount, p_token_hash, now() + make_interval(mins => p_minutes)) returning id into tid;
  perform public._post(me, 'available', -p_amount, 'ticket_hold', tx, 'ticket', tid, 'Ticket ' || p_service || ' — ' || left(p_purpose, 60), p_key);
  perform public._post(me, 'held', p_amount, 'ticket_hold', tx, 'ticket', tid, 'Ticket hold', null);
  return 'ok';
end $$;
revoke all on function public.ticket_create(text, text, numeric, int, text, text) from public, anon;
grant execute on function public.ticket_create(text, text, numeric, int, text, text) to authenticated;

create or replace function public._ticket_release(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare t record; tx uuid := gen_random_uuid();
begin
  select * into t from public.payment_tickets where id = p_id and status = 'open' for update;
  if not found then return; end if;
  update public.payment_tickets set status = p_status where id = p_id;
  perform public._post(t.user_id, 'held', -t.amount_isc, 'ticket_release', tx, 'ticket', t.id, 'Ticket ' || p_status, null);
  perform public._post(t.user_id, 'available', t.amount_isc, 'ticket_release', tx, 'ticket', t.id, 'Ticket ' || p_status, null);
end $$;
revoke all on function public._ticket_release(uuid, text) from public, anon, authenticated;

create or replace function public.ticket_cancel(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return 'login_required'; end if;
  perform 1 from public.wallet_accounts where user_id = auth.uid() for update;
  if not exists (select 1 from public.payment_tickets where id = p_id and user_id = auth.uid() and status = 'open') then return 'invalid'; end if;
  perform public._ticket_release(p_id, 'cancelled');
  return 'ok';
end $$;
revoke all on function public.ticket_cancel(uuid) from public, anon;
grant execute on function public.ticket_cancel(uuid) to authenticated;

create or replace function public.ticket_release_expired() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if auth.uid() is null then return; end if;
  perform 1 from public.wallet_accounts where user_id = auth.uid() for update;
  for r in select id from public.payment_tickets where user_id = auth.uid() and status = 'open' and expires_at < now() loop
    perform public._ticket_release(r.id, 'expired');
  end loop;
end $$;
revoke all on function public.ticket_release_expired() from public, anon;
grant execute on function public.ticket_release_expired() to authenticated;

-- Called by OUR route /api/tickets/redeem after hashing the merchant key; the merchant key never reaches the DB in clear.
create or replace function public.ticket_redeem(p_token_hash text, p_service text, p_key_hash text, p_ref text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t record; tx uuid := gen_random_uuid();
begin
  if not exists (select 1 from public.ticket_merchants where service_code = p_service and key_hash = p_key_hash) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  select * into t from public.payment_tickets where token_hash = p_token_hash and service_code = p_service for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if t.status <> 'open' then return jsonb_build_object('ok', false, 'error', 'already_used_or_closed'); end if;
  perform 1 from public.wallet_accounts where user_id = t.user_id for update;
  if t.expires_at < now() then
    perform public._ticket_release(t.id, 'expired');
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  update public.payment_tickets set status = 'redeemed', redeemed_at = now(), merchant_ref = left(p_ref, 120) where id = t.id;
  perform public._post(t.user_id, 'held', -t.amount_isc, 'ticket_payment', tx, 'ticket', t.id, 'Paid ' || t.service_code || ' — ' || t.purpose, null);
  return jsonb_build_object('ok', true, 'amount_isc', t.amount_isc, 'purpose', t.purpose, 'ticket_id', t.id);
end $$;
revoke all on function public.ticket_redeem(text, text, text, text) from public;
grant execute on function public.ticket_redeem(text, text, text, text) to anon, authenticated;

-- ───────────── Withdrawals (ISC held first, paid out in crypto by NOWPayments after admin 2FA) ─────────────
create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount_isc numeric(18,4) not null check (amount_isc >= 0.02),
  usd_value numeric(18,2) not null,
  network text not null check (network in ('usdttrc20', 'usdtbsc', 'usdtmatic')),
  address text not null check (char_length(address) between 20 and 120),
  status text not null default 'requested' check (status in ('requested', 'processing', 'paid', 'failed', 'cancelled')),
  np_batch_id text,
  np_withdrawal_id text,
  tx_hash text,
  last_error text check (char_length(last_error) <= 500),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index withdrawals_status_idx on public.withdrawals (status, created_at desc);

create or replace function public.withdrawal_request(p_amount numeric, p_network text, p_address text, p_key text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); tx uuid := gen_random_uuid(); wid uuid; bal numeric; kyc text; addr text := trim(p_address); open_count int;
begin
  if me is null then return 'login_required'; end if;
  if public.app_role() is null then return 'suspended'; end if;
  select kyc_status into kyc from public.profiles where id = me;
  if kyc is distinct from 'approved' then return 'kyc_required'; end if;
  if p_amount is null or p_amount <= 0 or round(p_amount, 4) <> p_amount then return 'invalid_amount'; end if;
  if p_amount < 0.02 then return 'below_minimum'; end if;
  if p_key is null or char_length(p_key) < 8 or char_length(p_key) > 64 then return 'invalid_key'; end if;
  if p_network = 'usdttrc20' then
    if addr !~ '^T[1-9A-HJ-NP-Za-km-z]{33}$' then return 'wallet_invalid'; end if;
  elsif p_network in ('usdtbsc', 'usdtmatic') then
    if addr !~ '^0x[a-fA-F0-9]{40}$' then return 'wallet_invalid'; end if;
  else return 'wallet_invalid'; end if;
  perform 1 from public.wallet_accounts where user_id = me for update;
  if exists (select 1 from public.withdrawals where user_id = me and idempotency_key = p_key) then return 'ok'; end if;
  select count(*) into open_count from public.withdrawals where user_id = me and status in ('requested', 'processing');
  if open_count >= 3 then return 'too_many_open'; end if;
  select available into bal from public.wallet_accounts where user_id = me;
  if bal < p_amount then return 'insufficient_funds'; end if;
  insert into public.withdrawals (user_id, amount_isc, usd_value, network, address, idempotency_key)
  values (me, p_amount, public.isc_to_usd(p_amount), p_network, addr, p_key) returning id into wid;
  perform public._post(me, 'available', -p_amount, 'withdrawal_hold', tx, 'withdrawal', wid, 'Withdrawal request', p_key);
  perform public._post(me, 'held', p_amount, 'withdrawal_hold', tx, 'withdrawal', wid, 'Withdrawal hold', null);
  return 'ok';
end $$;
revoke all on function public.withdrawal_request(numeric, text, text, text) from public, anon;
grant execute on function public.withdrawal_request(numeric, text, text, text) to authenticated;

create or replace function public._withdrawal_release(p_id uuid, p_status text, p_error text) returns void
language plpgsql security definer set search_path = public as $$
declare w record; tx uuid := gen_random_uuid();
begin
  select * into w from public.withdrawals where id = p_id and status in ('requested', 'processing') for update;
  if not found then raise exception 'withdrawal not found or already closed'; end if;
  perform 1 from public.wallet_accounts where user_id = w.user_id for update;
  update public.withdrawals set status = p_status, last_error = left(p_error, 500), updated_at = now() where id = p_id;
  perform public._post(w.user_id, 'held', -w.amount_isc, 'withdrawal_release', tx, 'withdrawal', w.id, 'Withdrawal ' || p_status, null);
  perform public._post(w.user_id, 'available', w.amount_isc, 'withdrawal_release', tx, 'withdrawal', w.id, 'Withdrawal ' || p_status, null);
end $$;
revoke all on function public._withdrawal_release(uuid, text, text) from public, anon, authenticated;

create or replace function public.withdrawal_cancel(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return 'login_required'; end if;
  if not exists (select 1 from public.withdrawals where id = p_id and user_id = auth.uid() and status = 'requested') then return 'invalid'; end if;
  perform public._withdrawal_release(p_id, 'cancelled', null);
  return 'ok';
end $$;
revoke all on function public.withdrawal_cancel(uuid) from public, anon;
grant execute on function public.withdrawal_cancel(uuid) to authenticated;

create or replace function public.withdrawal_progress(p_id uuid, p_batch text, p_wid text, p_error text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.withdrawals set np_batch_id = coalesce(p_batch, np_batch_id), np_withdrawal_id = coalesce(p_wid, np_withdrawal_id),
    last_error = left(p_error, 500), status = case when p_batch is not null and status = 'requested' then 'processing' else status end, updated_at = now()
  where id = p_id and status in ('requested', 'processing');
end $$;
revoke all on function public.withdrawal_progress(uuid, text, text, text) from public, anon;
grant execute on function public.withdrawal_progress(uuid, text, text, text) to authenticated;

create or replace function public.withdrawal_complete(p_id uuid, p_hash text) returns void
language plpgsql security definer set search_path = public as $$
declare w record; tx uuid := gen_random_uuid();
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into w from public.withdrawals where id = p_id and status in ('requested', 'processing') for update;
  if not found then raise exception 'withdrawal not found or already closed'; end if;
  perform 1 from public.wallet_accounts where user_id = w.user_id for update;
  update public.withdrawals set status = 'paid', tx_hash = left(p_hash, 200), last_error = null, updated_at = now() where id = p_id;
  perform public._post(w.user_id, 'held', -w.amount_isc, 'withdrawal_paid', tx, 'withdrawal', w.id, 'Withdrawal paid', null);
  insert into public.notifications (user_id, type, body, link) values (w.user_id, 'withdrawal_paid', w.amount_isc::text || ' ISC', '/dashboard/wallet?tab=history');
end $$;
revoke all on function public.withdrawal_complete(uuid, text) from public, anon;
grant execute on function public.withdrawal_complete(uuid, text) to authenticated;

create or replace function public.withdrawal_fail(p_id uuid, p_error text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  perform public._withdrawal_release(p_id, 'failed', p_error);
  select user_id into uid from public.withdrawals where id = p_id;
  insert into public.notifications (user_id, type, body, link) values (uid, 'withdrawal_failed', 'Funds returned to your wallet', '/dashboard/wallet?tab=history');
end $$;
revoke all on function public.withdrawal_fail(uuid, text) from public, anon;
grant execute on function public.withdrawal_fail(uuid, text) to authenticated;

-- ───────────── Manual KYC (documents in a private Storage bucket; admin reviews) ─────────────
create table public.kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  legal_name text not null check (char_length(legal_name) between 2 and 120),
  country text not null check (char_length(country) between 2 and 80),
  doc_type text not null check (doc_type in ('national_id', 'passport', 'driver_license')),
  id_front_path text not null,
  id_back_path text,
  selfie_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text check (char_length(review_note) <= 500),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index kyc_one_pending_uidx on public.kyc_submissions (user_id) where status = 'pending';

create or replace function public.kyc_on_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin update public.profiles set kyc_status = 'pending' where id = new.user_id; return new; end $$;
create trigger kyc_on_insert_trg after insert on public.kyc_submissions
for each row execute function public.kyc_on_insert();

create or replace function public.kyc_review(p_id uuid, p_decision text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare k record;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'invalid decision'; end if;
  select * into k from public.kyc_submissions where id = p_id and status = 'pending' for update;
  if not found then raise exception 'submission not found or already reviewed'; end if;
  update public.kyc_submissions set status = p_decision, review_note = left(p_note, 500), reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  update public.profiles set kyc_status = p_decision where id = k.user_id;
  insert into public.notifications (user_id, type, body, link) values (k.user_id, 'kyc_' || p_decision, coalesce(left(p_note, 120), ''), '/dashboard/kyc');
end $$;
revoke all on function public.kyc_review(uuid, text, text) from public, anon;
grant execute on function public.kyc_review(uuid, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kyc', 'kyc', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
create policy kyc_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);
create policy kyc_objects_select on storage.objects for select to authenticated
  using (bucket_id = 'kyc' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ───────────── RLS for everything new ─────────────
alter table public.wallet_accounts enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.services enable row level security;
alter table public.service_products enable row level security;
alter table public.purchases enable row level security;
alter table public.ticket_merchants enable row level security;
alter table public.payment_tickets enable row level security;
alter table public.withdrawals enable row level security;
alter table public.kyc_submissions enable row level security;

create policy wallet_select on public.wallet_accounts for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy ledger_select on public.ledger_entries for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy services_select on public.services for select to authenticated using (active or public.is_admin());
create policy services_admin on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy products_select on public.service_products for select to authenticated using (active or public.is_admin());
create policy products_admin on public.service_products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy purchases_select on public.purchases for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy merchants_admin on public.ticket_merchants for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy tickets_select on public.payment_tickets for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy withdrawals_select on public.withdrawals for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy kyc_select on public.kyc_submissions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy kyc_insert on public.kyc_submissions for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending'
              and (select kyc_status from public.profiles where id = auth.uid()) in ('none', 'rejected')
              and id_front_path like auth.uid()::text || '/%' and selfie_path like auth.uid()::text || '/%'
              and (id_back_path is null or id_back_path like auth.uid()::text || '/%'));
-- No insert/update/delete policies on wallet_accounts, ledger_entries, purchases, withdrawals, payment_tickets:
-- money moves only through the SECURITY DEFINER functions above.
-- Seed the i-SOA service catalog (prices are added by an admin in /admin/catalog).
insert into public.services (code, name, description) values
  ('shop-game', 'i-SOA Shop Game', 'Top-up, diamonds, gaming products'),
  ('intelli-soa', 'Intelli-SOA Bot', 'Subscriptions and AI services'),
  ('digilab', 'i-SOA DigiLab', 'Digital services'),
  ('workhub', 'i-SOA WorkHub', 'Platform services and fees')
on conflict (code) do nothing;
