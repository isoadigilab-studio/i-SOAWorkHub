-- i-SOA WorkHub — core schema, constraints, indexes, triggers and Row Level Security.

-- ───────────── Enums ─────────────
create type public.user_role as enum ('freelancer', 'client', 'admin');
create type public.opportunity_status as enum ('draft', 'pending', 'published', 'closed', 'rejected');
create type public.opportunity_type as enum ('freelance', 'full_time', 'part_time');
create type public.work_mode as enum ('remote', 'on_site', 'hybrid');
create type public.application_status as enum ('submitted', 'viewed', 'shortlisted', 'rejected', 'withdrawn');
create type public.inquiry_status as enum ('new', 'accepted', 'declined', 'closed');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

-- ───────────── Tables ─────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'freelancer',
  full_name text not null default '' check (char_length(full_name) <= 120),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table public.freelancer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  display_name text not null default '' check (char_length(display_name) <= 120),
  headline text check (char_length(headline) <= 160),
  bio text check (char_length(bio) <= 3000),
  location text check (char_length(location) <= 120),
  hourly_rate numeric(10,2) check (hourly_rate >= 0),
  currency text not null default 'USD' check (currency in ('USD', 'EUR', 'MGA')),
  experience_level text not null default 'entry' check (experience_level in ('entry', 'intermediate', 'expert')),
  availability text not null default 'available' check (availability in ('available', 'busy', 'unavailable')),
  languages text[] not null default '{}',
  skills text[] not null default '{}',
  visibility boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index freelancer_profiles_skills_idx on public.freelancer_profiles using gin (skills);
create index freelancer_profiles_visibility_idx on public.freelancer_profiles (visibility, created_at desc);

create table public.client_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  company_name text not null default '' check (char_length(company_name) <= 120),
  website text check (char_length(website) <= 500),
  country text check (char_length(country) <= 80),
  description text check (char_length(description) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name = lower(name))
);

create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.freelancer_profiles(user_id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  url text not null check (url ~* '^https?://' and char_length(url) <= 500),
  description text check (char_length(description) <= 500),
  created_at timestamptz not null default now()
);
create index portfolios_user_idx on public.portfolios (user_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_fr text not null,
  name_mg text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.client_profiles(user_id) on delete cascade,
  category_id uuid not null references public.categories(id),
  title text not null check (char_length(title) between 5 and 140),
  slug text not null unique,
  description text not null check (char_length(description) between 30 and 5000),
  company_name text not null default '' check (char_length(company_name) <= 120),
  opportunity_type public.opportunity_type not null default 'freelance',
  work_mode public.work_mode not null default 'remote',
  location_text text check (char_length(location_text) <= 120),
  budget_min numeric(12,2) check (budget_min >= 0),
  budget_max numeric(12,2) check (budget_max >= 0),
  currency text not null default 'USD' check (currency in ('USD', 'EUR', 'MGA')),
  skills text[] not null default '{}',
  deadline date,
  status public.opportunity_status not null default 'pending',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  constraint opp_budget_order check (budget_min is null or budget_max is null or budget_min <= budget_max),
  constraint opp_owner_or_demo check (is_demo or client_id is not null)
);
create index opportunities_status_pub_idx on public.opportunities (status, published_at desc);
create index opportunities_category_idx on public.opportunities (category_id);
create index opportunities_client_idx on public.opportunities (client_id);

create table public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  freelancer_id uuid not null references public.freelancer_profiles(user_id) on delete cascade,
  cover_note text not null check (char_length(cover_note) between 20 and 3000),
  portfolio_url text check (portfolio_url ~* '^https?://' and char_length(portfolio_url) <= 500),
  status public.application_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, freelancer_id)
);
create index applications_freelancer_idx on public.applications (freelancer_id, created_at desc);
create index applications_opportunity_idx on public.applications (opportunity_id);

create table public.project_inquiries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(user_id) on delete cascade,
  freelancer_id uuid not null references public.freelancer_profiles(user_id) on delete cascade,
  subject text not null check (char_length(subject) between 3 and 140),
  message text not null check (char_length(message) between 10 and 3000),
  budget text check (char_length(budget) <= 80),
  status public.inquiry_status not null default 'new',
  created_at timestamptz not null default now()
);
create index inquiries_freelancer_idx on public.project_inquiries (freelancer_id, created_at desc);
create index inquiries_client_idx on public.project_inquiries (client_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  reason text not null check (reason in ('scam', 'fee_required', 'misleading', 'inappropriate', 'other')),
  details text check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_created_idx on public.admin_audit_logs (created_at desc);

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count int not null
);

-- ───────────── Helper functions ─────────────
create or replace function public.app_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and status = 'active'
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = 'admin', false)
$$;

create or replace function public.check_rate_limit(p_key text, p_max int, p_window int) returns boolean
language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into public.rate_limits as r (key, window_start, count) values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when r.window_start < now() - make_interval(secs => p_window) then now() else r.window_start end,
    count = case when r.window_start < now() - make_interval(secs => p_window) then 1 else r.count + 1 end
  returning count into c;
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return c <= p_max;
end $$;
revoke all on function public.check_rate_limit(text, int, int) from public;
grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;

-- ───────────── Signup: create profile rows (admin can never be self-assigned) ─────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r public.user_role := 'freelancer';
  n text := left(coalesce(new.raw_user_meta_data->>'full_name', ''), 120);
begin
  if new.raw_user_meta_data->>'role' = 'client' then r := 'client'; end if;
  insert into public.profiles (id, role, full_name) values (new.id, r, n);
  if r = 'client' then
    insert into public.client_profiles (user_id, company_name) values (new.id, n);
  else
    insert into public.freelancer_profiles (user_id, username, display_name)
    values (new.id, 'user-' || substr(replace(new.id::text, '-', ''), 1, 10), n);
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ───────────── Guard triggers (defense in depth on top of RLS) ─────────────
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
  end if;
  new.id := old.id;
  return new;
end $$;
create trigger protect_profile_trg before update on public.profiles
for each row execute function public.protect_profile();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create trigger freelancer_touch before update on public.freelancer_profiles
for each row execute function public.touch_updated_at();
create trigger client_touch before update on public.client_profiles
for each row execute function public.touch_updated_at();
create trigger applications_touch before update on public.applications
for each row execute function public.touch_updated_at();

create or replace function public.guard_opportunity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
      new.published_at := now();
    end if;
    return new;
  end if;
  new.is_demo := false;
  if tg_op = 'UPDATE' then
    new.client_id := old.client_id;
    new.slug := old.slug;
    new.published_at := old.published_at;
  end if;
  -- Clients can only save drafts, submit for moderation or close; publishing needs an admin.
  if new.status not in ('draft', 'closed') then
    new.status := 'pending';
  end if;
  return new;
end $$;
create trigger guard_opportunity_trg before insert or update on public.opportunities
for each row execute function public.guard_opportunity();

create or replace function public.guard_application() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.opportunity_id := old.opportunity_id;
  new.freelancer_id := old.freelancer_id;
  new.cover_note := old.cover_note;
  new.portfolio_url := old.portfolio_url;
  if auth.uid() = old.freelancer_id then
    if new.status <> 'withdrawn' then new.status := old.status; end if;
  else
    if new.status in ('withdrawn', 'submitted') then new.status := old.status; end if;
  end if;
  return new;
end $$;
create trigger guard_application_trg before update on public.applications
for each row execute function public.guard_application();

create or replace function public.guard_inquiry() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.client_id := old.client_id;
  new.freelancer_id := old.freelancer_id;
  new.subject := old.subject;
  new.message := old.message;
  new.budget := old.budget;
  if auth.uid() = old.client_id and new.status <> 'closed' then new.status := old.status; end if;
  return new;
end $$;
create trigger guard_inquiry_trg before update on public.project_inquiries
for each row execute function public.guard_inquiry();

-- ───────────── Automatic notifications ─────────────
create or replace function public.notify_application() returns trigger
language plpgsql security definer set search_path = public as $$
declare o record;
begin
  select title, client_id, slug into o from public.opportunities where id = new.opportunity_id;
  if tg_op = 'INSERT' and o.client_id is not null then
    insert into public.notifications (user_id, type, body, link)
    values (o.client_id, 'application_received', o.title, '/dashboard/opportunities/' || new.opportunity_id || '/applications');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.status <> 'withdrawn' then
    insert into public.notifications (user_id, type, body, link)
    values (new.freelancer_id, 'application_' || new.status, o.title, '/dashboard/applications');
  end if;
  return new;
end $$;
create trigger notify_application_trg after insert or update on public.applications
for each row execute function public.notify_application();

create or replace function public.notify_inquiry() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, body, link)
    values (new.freelancer_id, 'inquiry_received', new.subject, '/dashboard/inquiries');
  elsif new.status is distinct from old.status then
    insert into public.notifications (user_id, type, body, link)
    values (new.client_id, 'inquiry_' || new.status, new.subject, '/dashboard/inquiries');
  end if;
  return new;
end $$;
create trigger notify_inquiry_trg after insert or update on public.project_inquiries
for each row execute function public.notify_inquiry();

create or replace function public.notify_opportunity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.client_id is not null and new.status is distinct from old.status
     and new.status in ('published', 'rejected') then
    insert into public.notifications (user_id, type, body, link)
    values (new.client_id, 'opportunity_' || new.status, new.title, '/dashboard/opportunities');
  end if;
  return new;
end $$;
create trigger notify_opportunity_trg after update on public.opportunities
for each row execute function public.notify_opportunity();

-- ───────────── Row Level Security ─────────────
alter table public.profiles enable row level security;
alter table public.freelancer_profiles enable row level security;
alter table public.client_profiles enable row level security;
alter table public.skills enable row level security;
alter table public.portfolios enable row level security;
alter table public.categories enable row level security;
alter table public.opportunities enable row level security;
alter table public.bookmarks enable row level security;
alter table public.applications enable row level security;
alter table public.project_inquiries enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.rate_limits enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- freelancer profiles
create policy fp_select on public.freelancer_profiles for select
  using (visibility or user_id = auth.uid() or public.is_admin());
create policy fp_update on public.freelancer_profiles for update to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

-- client profiles (company info is public)
create policy cp_select on public.client_profiles for select using (true);
create policy cp_update on public.client_profiles for update to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

-- skills catalog
create policy skills_select on public.skills for select using (true);
create policy skills_admin on public.skills for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- portfolios
create policy portfolios_select on public.portfolios for select
  using (exists (select 1 from public.freelancer_profiles f where f.user_id = portfolios.user_id)
         or user_id = auth.uid() or public.is_admin());
create policy portfolios_insert on public.portfolios for insert to authenticated
  with check (user_id = auth.uid() and public.app_role() = 'freelancer');
create policy portfolios_delete on public.portfolios for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- categories
create policy categories_select on public.categories for select using (true);
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- opportunities
create policy opp_select on public.opportunities for select
  using (status = 'published' or client_id = auth.uid() or public.is_admin());
create policy opp_insert on public.opportunities for insert to authenticated
  with check (client_id = auth.uid() and public.app_role() = 'client');
create policy opp_update on public.opportunities for update to authenticated
  using ((client_id = auth.uid() and public.app_role() = 'client') or public.is_admin())
  with check ((client_id = auth.uid() and public.app_role() = 'client') or public.is_admin());
create policy opp_delete on public.opportunities for delete to authenticated
  using ((client_id = auth.uid() and public.app_role() = 'client') or public.is_admin());

-- bookmarks
create policy bookmarks_select on public.bookmarks for select to authenticated using (user_id = auth.uid());
create policy bookmarks_insert on public.bookmarks for insert to authenticated
  with check (user_id = auth.uid() and public.app_role() is not null);
create policy bookmarks_delete on public.bookmarks for delete to authenticated using (user_id = auth.uid());

-- applications
create policy app_select on public.applications for select to authenticated
  using (freelancer_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.opportunities o where o.id = opportunity_id and o.client_id = auth.uid()));
create policy app_insert on public.applications for insert to authenticated
  with check (freelancer_id = auth.uid() and public.app_role() = 'freelancer' and status = 'submitted'
              and exists (select 1 from public.opportunities o
                          where o.id = opportunity_id and o.status = 'published' and not o.is_demo));
create policy app_update on public.applications for update to authenticated
  using (freelancer_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.opportunities o where o.id = opportunity_id and o.client_id = auth.uid()))
  with check (freelancer_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.opportunities o where o.id = opportunity_id and o.client_id = auth.uid()));

-- project inquiries
create policy inq_select on public.project_inquiries for select to authenticated
  using (client_id = auth.uid() or freelancer_id = auth.uid() or public.is_admin());
create policy inq_insert on public.project_inquiries for insert to authenticated
  with check (client_id = auth.uid() and public.app_role() = 'client' and status = 'new');
create policy inq_update on public.project_inquiries for update to authenticated
  using (freelancer_id = auth.uid() or client_id = auth.uid() or public.is_admin())
  with check (freelancer_id = auth.uid() or client_id = auth.uid() or public.is_admin());

-- reports
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open' and public.app_role() is not null);
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
create policy reports_admin_update on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- notifications
create policy notif_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit logs
create policy audit_select on public.admin_audit_logs for select to authenticated using (public.is_admin());
create policy audit_insert on public.admin_audit_logs for insert to authenticated
  with check (public.is_admin() and admin_id = auth.uid());

-- rate_limits: no policies on purpose (only check_rate_limit() touches it).
