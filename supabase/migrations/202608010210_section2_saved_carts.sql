-- Section 2 completion: customer-owned saved checkout drafts.
create table if not exists public.saved_checkout_drafts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check(char_length(name) between 1 and 80), order_type text not null check(order_type in ('buy','sell')),
  amount_m bigint not null check(amount_m>0), delivery_name text, preferred_world integer check(preferred_world between 301 and 999),
  contact_details text, notes text, payout_method text, payout_details text, coupon_code text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.saved_checkout_drafts enable row level security;
create policy "saved drafts own" on public.saved_checkout_drafts for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select,insert,update,delete on public.saved_checkout_drafts to authenticated;
grant all on public.saved_checkout_drafts to service_role;
create index if not exists saved_checkout_drafts_owner_idx on public.saved_checkout_drafts(user_id,updated_at desc);
