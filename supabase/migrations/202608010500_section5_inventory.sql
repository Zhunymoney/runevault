-- Section 5: transactional inventory, listings, reservations, status history, and notes.
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null,
  category text not null default 'osrs-gold', description text, active boolean not null default true,
  featured boolean not null default false, available_stock_m bigint check (available_stock_m is null or available_stock_m >= 0),
  minimum_amount_m bigint not null default 10, maximum_amount_m bigint not null default 5000,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(), amount_m bigint not null check (amount_m <> 0),
  transaction_type text not null check (transaction_type in ('opening','purchase','sale','reservation','release','adjustment','reconciliation')),
  order_id uuid references public.orders(id) on delete set null, reason text not null,
  actor_id uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete cascade,
  amount_m bigint not null check (amount_m > 0), status text not null default 'active' check (status in ('active','consumed','released','expired')),
  expires_at timestamptz not null default (now() + interval '30 minutes'), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  previous_status text, status text not null, customer_message text, actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_notes (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null, body text not null check (char_length(body) between 1 and 5000),
  customer_visible boolean not null default false, created_at timestamptz not null default now()
);

alter table public.listings enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_notes enable row level security;
create policy "active listings public read" on public.listings for select to anon, authenticated using (active or public.is_admin());
create policy "listings admin write" on public.listings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "inventory admin access" on public.inventory_transactions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "reservations owner or admin read" on public.inventory_reservations for select to authenticated using (public.is_admin() or exists(select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "status history owner or admin read" on public.order_status_history for select to authenticated using (public.is_admin() or exists(select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "notes owner visible or admin" on public.order_notes for select to authenticated using (public.is_admin() or (customer_visible and exists(select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())));
create policy "notes admin write" on public.order_notes for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.listings to anon, authenticated;
grant select on public.inventory_reservations, public.order_status_history, public.order_notes to authenticated;
grant all on public.listings, public.inventory_transactions, public.inventory_reservations, public.order_status_history, public.order_notes to service_role;

create or replace function public.track_order_status() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_status_history(order_id, previous_status, status, actor_id) values(new.id, old.status, new.status, auth.uid());
    if new.status = 'cancelled' then
      update public.inventory_reservations set status = 'released', updated_at = now() where order_id = new.id and status = 'active';
      insert into public.inventory_transactions(amount_m, transaction_type, order_id, reason, actor_id)
      select amount_m, 'release', order_id, 'Order cancelled', auth.uid() from public.inventory_reservations where order_id = new.id and status = 'released';
    elsif new.status = 'completed' and new.order_type = 'buy' then
      update public.inventory_reservations set status = 'consumed', updated_at = now() where order_id = new.id and status = 'active';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists orders_status_history on public.orders;
create trigger orders_status_history after update of status on public.orders for each row execute function public.track_order_status();

create index if not exists listings_active_idx on public.listings(active, featured, updated_at desc);
create index if not exists inventory_transactions_created_idx on public.inventory_transactions(created_at desc);
create index if not exists inventory_reservations_status_idx on public.inventory_reservations(status, expires_at);
create index if not exists order_status_history_order_idx on public.order_status_history(order_id, created_at);
create index if not exists order_notes_order_idx on public.order_notes(order_id, created_at);
