-- Section 5: operational marketplace announcements.
create table if not exists public.marketplace_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  body text not null check (char_length(body) between 3 and 2000),
  severity text not null default 'info' check (severity in ('info','success','warning','critical')),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
alter table public.marketplace_announcements enable row level security;
create policy "active announcements public read" on public.marketplace_announcements for select to anon, authenticated
using (active and starts_at <= now() and (ends_at is null or ends_at > now()) or public.is_admin());
create policy "announcements admin write" on public.marketplace_announcements for all to authenticated
using (public.is_admin()) with check (public.is_admin());
grant select on public.marketplace_announcements to anon, authenticated;
grant all on public.marketplace_announcements to service_role;
create index if not exists marketplace_announcements_active_idx on public.marketplace_announcements(active, starts_at desc, ends_at);
