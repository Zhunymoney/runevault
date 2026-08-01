-- Section 8: loyalty, referrals, coupons, scheduled promotions, VIP tiers, and affiliate attribution.
create table if not exists public.loyalty_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade, points_balance bigint not null default 0 check (points_balance >= 0),
  lifetime_points bigint not null default 0 check (lifetime_points >= 0), vip_tier text not null default 'standard' check (vip_tier in ('standard','silver','gold','vault')),
  updated_at timestamptz not null default now()
);
create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null, points bigint not null check (points <> 0), reason text not null,
  created_at timestamptz not null default now(), unique(order_id, reason)
);
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(), referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid unique references public.profiles(id) on delete cascade, code text not null unique,
  status text not null default 'pending' check (status in ('pending','qualified','rewarded','rejected')),
  qualified_order_id uuid references public.orders(id) on delete set null, created_at timestamptz not null default now(), rewarded_at timestamptz
);
create table if not exists public.coupon_codes (
  id uuid primary key default gen_random_uuid(), code text not null unique, description text not null,
  discount_type text not null check (discount_type in ('percentage','fixed')), discount_value numeric(12,2) not null check (discount_value > 0),
  minimum_spend numeric(12,2) not null default 0, maximum_discount numeric(12,2), total_usage_limit integer,
  per_customer_limit integer not null default 1, starts_at timestamptz, expires_at timestamptz, active boolean not null default true,
  terms text not null, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(), coupon_id uuid not null references public.coupon_codes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, order_id uuid not null unique references public.orders(id) on delete cascade,
  discount_amount numeric(12,2) not null check (discount_amount >= 0), created_at timestamptz not null default now()
);
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(), name text not null, description text not null, starts_at timestamptz not null,
  ends_at timestamptz not null, discount_type text not null check (discount_type in ('percentage','fixed','rate_override')),
  discount_value numeric(12,4) not null, minimum_amount_m bigint not null default 0, active boolean not null default true,
  terms text not null, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), check (ends_at > starts_at)
);
create table if not exists public.affiliate_attributions (
  id uuid primary key default gen_random_uuid(), affiliate_code text not null, user_id uuid references public.profiles(id) on delete set null,
  order_id uuid unique references public.orders(id) on delete set null, landing_path text, created_at timestamptz not null default now()
);
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists discount_amount numeric(12,2) not null default 0;
alter table public.loyalty_accounts enable row level security; alter table public.loyalty_transactions enable row level security;
alter table public.referrals enable row level security; alter table public.coupon_codes enable row level security;
alter table public.coupon_redemptions enable row level security; alter table public.promotions enable row level security; alter table public.affiliate_attributions enable row level security;
create policy "loyalty own read" on public.loyalty_accounts for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "loyalty history own read" on public.loyalty_transactions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "referrals own read" on public.referrals for select to authenticated using (referrer_id = auth.uid() or referred_id = auth.uid() or public.is_admin());
create policy "active coupons authenticated read" on public.coupon_codes for select to authenticated using (active or public.is_admin());
create policy "coupon redemptions own read" on public.coupon_redemptions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "active promotions public read" on public.promotions for select to anon, authenticated using ((active and now() between starts_at and ends_at) or public.is_admin());
create policy "rewards admin write" on public.coupon_codes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "promotions admin write" on public.promotions for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.loyalty_accounts, public.loyalty_transactions, public.referrals, public.coupon_codes, public.coupon_redemptions to authenticated;
grant select on public.promotions to anon, authenticated;
grant all on public.loyalty_accounts, public.loyalty_transactions, public.referrals, public.coupon_codes, public.coupon_redemptions, public.promotions, public.affiliate_attributions to service_role;
create index if not exists coupon_codes_active_idx on public.coupon_codes(active, starts_at, expires_at);
create index if not exists coupon_redemptions_customer_idx on public.coupon_redemptions(coupon_id, user_id);
create index if not exists promotions_window_idx on public.promotions(active, starts_at, ends_at);
create index if not exists loyalty_transactions_user_idx on public.loyalty_transactions(user_id, created_at desc);
