-- Owner-authorized cancellation without granting customers arbitrary order updates.
grant select on public.settings to anon, authenticated, service_role;
grant select on public.scheduled_prices, public.bulk_price_tiers to anon, authenticated, service_role;

create or replace function public.cancel_own_order(p_reference text)
returns table(reference text, status text, payment_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare current_id uuid := auth.uid(); target public.orders%rowtype;
begin
  if current_id is null then raise exception 'authentication required'; end if;
  select * into target from public.orders where public.orders.reference = upper(trim(p_reference)) and user_id = current_id for update;
  if target.id is null then raise exception 'order not found'; end if;
  if target.status not in ('pending','awaiting_payment') then raise exception 'order can no longer be cancelled'; end if;
  update public.orders set status = 'cancelled', payment_status = 'cancelled', updated_at = now() where id = target.id;
  return query select o.reference, o.status, o.payment_status from public.orders o where o.id = target.id;
end $$;
revoke all on function public.cancel_own_order(text) from public;
grant execute on function public.cancel_own_order(text) to authenticated;
