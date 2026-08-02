-- Close direct PostgREST paths that bypass server-side authorization and pricing.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.admin_role = 'owner'
  );
$$;

revoke update on public.profiles from authenticated;
grant update (full_name, runescape_name, contact_email, preferred_payment_method,
  notification_preferences, deletion_requested_at, updated_at)
on public.profiles to authenticated;

revoke insert on public.orders from authenticated;
grant select on public.orders to authenticated;
grant select, insert, update on public.orders to service_role;

drop policy if exists "tickets own create" on public.support_tickets;
create policy "tickets own create" on public.support_tickets for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    order_id is null
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  )
);

create or replace function public.claim_order_notification(
  p_order_id uuid, p_event_key text, p_event_type text, p_channel text
)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Server access required'; end if;
  if p_event_key <> 'order-created:' || p_order_id::text
     or p_event_type <> 'order_created'
     or p_channel <> 'internal' then
    raise exception 'Invalid notification claim';
  end if;
  insert into public.notification_events(event_key, order_id, user_id, event_type, channel, attempts)
  select p_event_key, o.id, o.user_id, p_event_type, p_channel, 1
  from public.orders o where o.id = p_order_id
  on conflict(event_key) do nothing;
  return found;
end; $$;
revoke all on function public.claim_order_notification(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.claim_order_notification(uuid,text,text,text) to service_role;

-- Remove pre-migration policies captured in the production catalog. Canonical
-- owner-only policies above and in the chain remain authoritative.
drop policy if exists "Admins can update all orders" on public.orders;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can update settings" on public.settings;
