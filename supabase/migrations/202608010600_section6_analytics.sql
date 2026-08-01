-- Section 6: indexes supporting real admin reporting over order data.
create index if not exists orders_created_status_idx on public.orders(created_at desc, status);
create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists orders_type_status_created_idx on public.orders(order_type, status, created_at desc);
create index if not exists orders_payment_created_idx on public.orders(payment_provider, crypto_asset, created_at desc);
create index if not exists orders_completed_idx on public.orders(updated_at desc) where status = 'completed';
