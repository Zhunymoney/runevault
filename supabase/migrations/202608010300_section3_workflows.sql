-- Section 3: OSRS buy/sell workflow and authoritative price management.
alter table public.settings add column if not exists buy_enabled boolean not null default true;
alter table public.settings add column if not exists sell_enabled boolean not null default true;
alter table public.settings add column if not exists estimated_delivery_minutes integer not null default 15 check (estimated_delivery_minutes between 1 and 1440);
alter table public.settings add column if not exists pause_message text;

alter table public.orders add column if not exists preferred_world integer check (preferred_world between 301 and 999);
alter table public.orders add column if not exists contact_details text;
alter table public.orders add column if not exists payout_method text;
alter table public.orders add column if not exists payout_details text;
alter table public.orders add column if not exists seller_status text check (seller_status in ('awaiting_meetup','gold_received','verification','payout_pending','payout_completed','rejected'));
alter table public.orders add column if not exists seller_risk_notes text;

create table if not exists public.price_history (
  id bigint generated always as identity primary key, buy_rate numeric(10,4) not null,
  sell_rate numeric(10,4) not null, changed_by uuid references public.profiles(id) on delete set null,
  reason text, effective_at timestamptz not null default now(), created_at timestamptz not null default now()
);

create table if not exists public.scheduled_prices (
  id uuid primary key default gen_random_uuid(), buy_rate numeric(10,4), sell_rate numeric(10,4),
  starts_at timestamptz not null, ends_at timestamptz, label text, active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
  check (buy_rate is not null or sell_rate is not null), check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.bulk_price_tiers (
  id uuid primary key default gen_random_uuid(), order_type text not null check (order_type in ('buy','sell')),
  minimum_amount_m bigint not null check (minimum_amount_m > 0), rate_adjustment numeric(10,4) not null default 0,
  active boolean not null default true, created_at timestamptz not null default now(), unique(order_type, minimum_amount_m)
);

alter table public.price_history enable row level security;
alter table public.scheduled_prices enable row level security;
alter table public.bulk_price_tiers enable row level security;
create policy "price history public read" on public.price_history for select to anon, authenticated using (true);
create policy "scheduled prices public read" on public.scheduled_prices for select to anon, authenticated using (active);
create policy "bulk tiers public read" on public.bulk_price_tiers for select to anon, authenticated using (active);
create policy "price history admin write" on public.price_history for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "scheduled prices admin write" on public.scheduled_prices for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "bulk tiers admin write" on public.bulk_price_tiers for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.price_history, public.scheduled_prices, public.bulk_price_tiers to anon, authenticated;
grant all on public.price_history, public.scheduled_prices, public.bulk_price_tiers to service_role;

create or replace function public.record_price_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.buy_rate is distinct from old.buy_rate or new.sell_rate is distinct from old.sell_rate then
    insert into public.price_history(buy_rate, sell_rate, changed_by, reason)
    values(new.buy_rate, new.sell_rate, auth.uid(), 'Admin settings update');
  end if;
  return new;
end; $$;
drop trigger if exists settings_price_history on public.settings;
create trigger settings_price_history after update of buy_rate, sell_rate on public.settings for each row execute function public.record_price_change();

create index if not exists price_history_effective_idx on public.price_history(effective_at desc);
create index if not exists scheduled_prices_window_idx on public.scheduled_prices(active, starts_at, ends_at);
create index if not exists orders_seller_queue_idx on public.orders(seller_status, created_at desc) where order_type = 'sell';
