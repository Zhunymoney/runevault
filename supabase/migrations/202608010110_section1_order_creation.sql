-- Section 1 completion: idempotent checkout request identity and terms evidence.
alter table public.orders add column if not exists client_request_id uuid;
alter table public.orders add column if not exists terms_accepted_at timestamptz;
create unique index if not exists orders_client_request_id_idx on public.orders(user_id,client_request_id) where client_request_id is not null;
