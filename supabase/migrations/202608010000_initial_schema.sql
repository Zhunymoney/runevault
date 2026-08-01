-- RuneVault initial schema baseline. Applied before all additive migrations.
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
  payment_provider text check (payment_provider in ('stripe','crypto_manual')),
  crypto_asset text check (crypto_asset in ('BTC','USDC')),
  payment_status text,
  payment_id text,
  paid_at timestamptz,
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  risk_level text check (risk_level in ('low','medium','high')),
  risk_reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe upgrade path for existing RuneVault databases.
alter table public.orders add column if not exists payment_provider text;
alter table public.orders add column if not exists crypto_asset text;
alter table public.orders add column if not exists payment_status text;
alter table public.orders add column if not exists payment_id text;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists risk_score integer not null default 0;
alter table public.orders add column if not exists risk_level text;
alter table public.orders add column if not exists risk_reasons text[] not null default '{}';
create unique index if not exists orders_payment_id_unique
  on public.orders(payment_id) where payment_id is not null;

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

create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.secure_order_values()
returns trigger language plpgsql security definer set search_path = '' as $$
declare s public.settings%rowtype;
begin
  select * into s from public.settings where id = 1;
  if s.maintenance_mode then raise exception 'Ordering is temporarily paused'; end if;
  if new.amount_m < s.minimum_order_m or new.amount_m > s.maximum_order_m then
    raise exception 'Order amount is outside the allowed range';
  end if;
  if new.order_type = 'buy' and new.amount_m > s.inventory_m then raise exception 'Insufficient inventory'; end if;
  new.user_id := auth.uid();
  new.price_per_m := case when new.order_type = 'buy' then s.buy_rate else s.sell_rate end;
  new.total_price := round(new.amount_m * new.price_per_m, 2);
  new.status := 'pending';
  new.payment_provider := null; new.crypto_asset := null; new.payment_status := null;
  new.payment_id := null; new.paid_at := null; new.assigned_to := null;
  new.risk_score := 0; new.risk_level := null; new.risk_reasons := '{}';
  return new;
end;
$$;

create policy "profiles view own or admin" on public.profiles for select to authenticated using (auth.uid() = id or public.is_admin());
create policy "profiles update own" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id and role = public.current_user_role());
create policy "settings public read" on public.settings for select to anon, authenticated using (true);
create policy "settings admin update" on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "orders create own" on public.orders for insert to authenticated with check (auth.uid() = user_id);
create policy "orders view own or admin" on public.orders for select to authenticated using (auth.uid() = user_id or public.is_admin());
create policy "orders admin update" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "audit admin view" on public.audit_logs for select to authenticated using (public.is_admin());

drop trigger if exists secure_order_values on public.orders;
create trigger secure_order_values before insert on public.orders
for each row execute procedure public.secure_order_values();

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
