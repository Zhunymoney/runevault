-- Section 2: additive customer profile, character, security, and preference data.
alter table public.profiles add column if not exists runescape_name text;
alter table public.profiles add column if not exists contact_email text;
alter table public.profiles add column if not exists preferred_payment_method text;
alter table public.profiles add column if not exists notification_preferences jsonb not null default '{"email":true,"order_updates":true,"security":true}'::jsonb;
alter table public.profiles add column if not exists deletion_requested_at timestamptz;

create table if not exists public.saved_characters (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 12), preferred_world integer check (preferred_world between 301 and 999),
  is_default boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  outcome text not null check (outcome in ('success','failure','password_reset','password_changed')),
  ip_hash text, user_agent_summary text, suspicious boolean not null default false, created_at timestamptz not null default now()
);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','reviewing','completed','cancelled')),
  requested_at timestamptz not null default now(), completed_at timestamptz, unique(user_id, status)
);

alter table public.saved_characters enable row level security;
alter table public.login_events enable row level security;
alter table public.account_deletion_requests enable row level security;
create policy "characters own" on public.saved_characters for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "login events own read" on public.login_events for select to authenticated using (auth.uid() = user_id or public.is_admin());
create policy "deletion requests own create" on public.account_deletion_requests for insert to authenticated with check (auth.uid() = user_id);
create policy "deletion requests own read" on public.account_deletion_requests for select to authenticated using (auth.uid() = user_id or public.is_admin());
grant select, insert, update, delete on public.saved_characters to authenticated;
grant select on public.login_events to authenticated;
grant select, insert on public.account_deletion_requests to authenticated;
grant all on public.saved_characters, public.login_events, public.account_deletion_requests to service_role;
