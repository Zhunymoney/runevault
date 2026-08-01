-- Section 1: additive, data-preserving payment infrastructure.
alter table public.orders add column if not exists payment_provider text;
alter table public.orders add column if not exists payment_status text;
alter table public.orders add column if not exists payment_id text;
alter table public.orders add column if not exists crypto_asset text;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists payment_method_selected_at timestamptz;
alter table public.orders add column if not exists payment_submitted_at timestamptz;
alter table public.orders add column if not exists payment_verified_at timestamptz;
alter table public.orders add column if not exists payment_failure_reason text;
alter table public.orders add column if not exists refunded_amount numeric(12,2) not null default 0;

create unique index if not exists orders_payment_id_unique on public.orders(payment_id) where payment_id is not null;
create index if not exists orders_payment_queue_idx on public.orders(payment_status, created_at desc);
create index if not exists orders_payment_provider_idx on public.orders(payment_provider, created_at desc);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(), provider text not null,
  provider_event_id text not null, order_id uuid references public.orders(id) on delete set null,
  event_type text not null, status text not null default 'received',
  safe_details jsonb not null default '{}'::jsonb, processed_at timestamptz,
  created_at timestamptz not null default now(), unique(provider, provider_event_id)
);

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880), created_at timestamptz not null default now()
);

alter table public.payment_events enable row level security;
alter table public.payment_proofs enable row level security;
drop policy if exists "payment proofs create own" on public.payment_proofs;
create policy "payment proofs create own" on public.payment_proofs for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
drop policy if exists "payment proofs view own or admin" on public.payment_proofs;
create policy "payment proofs view own or admin" on public.payment_proofs for select to authenticated
  using (auth.uid() = user_id or public.is_admin());
drop policy if exists "payment events admin view" on public.payment_events;
create policy "payment events admin view" on public.payment_events for select to authenticated using (public.is_admin());

grant select, insert, update on public.orders to service_role;
grant select, insert, update on public.payment_events to service_role;
grant select, insert on public.payment_proofs to service_role;
grant select, insert on public.payment_proofs to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "payment proof objects admin read" on storage.objects;
create policy "payment proof objects admin read" on storage.objects for select to authenticated
using (bucket_id = 'payment-proofs' and public.is_admin());
