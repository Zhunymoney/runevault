-- RuneVault all-in-one schema. Run once in a NEW Supabase project SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'customer' check (role in ('customer','staff','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  buy_rate numeric(10,4) not null default 0.18,
  sell_rate numeric(10,4) not null default 0.14,
  inventory_m bigint not null default 1000,
  minimum_order_m bigint not null default 10,
  maximum_order_m bigint not null default 5000,
  maintenance_mode boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.settings(id) values(1) on conflict do nothing;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null default ('RV-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_type text not null check (order_type in ('buy','sell')),
  game text not null default 'Old School RuneScape',
  server text not null default 'Main Game',
  amount_m bigint not null check (amount_m > 0),
  price_per_m numeric(10,4) not null check (price_per_m >= 0),
  total_price numeric(12,2) not null check (total_price >= 0),
  status text not null default 'pending' check (status in ('pending','awaiting_payment','paid','assigned','delivering','completed','cancelled')),
  delivery_name text,
  notes text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff'));
$$;

create policy "profiles view own or admin" on public.profiles for select to authenticated using (auth.uid() = id or public.is_admin());
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "settings public read" on public.settings for select to anon, authenticated using (true);
create policy "settings admin update" on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "orders create own" on public.orders for insert to authenticated with check (auth.uid() = user_id);
create policy "orders view own or admin" on public.orders for select to authenticated using (auth.uid() = user_id or public.is_admin());
create policy "orders admin update" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "audit admin view" on public.audit_logs for select to authenticated using (public.is_admin());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name) values(new.id, new.raw_user_meta_data->>'full_name') on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders for each row execute procedure public.set_updated_at();

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at before update on public.settings for each row execute procedure public.set_updated_at();
