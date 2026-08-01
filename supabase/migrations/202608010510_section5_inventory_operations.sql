-- Section 5 completion: authoritative inventory mutations and idempotent reservation release.
alter table public.inventory_transactions add column if not exists source_key text;
create unique index if not exists inventory_transactions_source_key_idx on public.inventory_transactions(source_key) where source_key is not null;

create or replace function public.current_inventory_m() returns bigint language sql stable security definer set search_path='' as $$
  select coalesce(sum(amount_m),0)::bigint from public.inventory_transactions;
$$;
revoke all on function public.current_inventory_m() from public;
grant execute on function public.current_inventory_m() to anon,authenticated,service_role;

create or replace function public.adjust_inventory(p_amount_m bigint,p_reason text,p_actor_id uuid default null)
returns bigint language plpgsql security definer set search_path='' as $$
declare next_balance bigint;
begin
  if p_amount_m=0 or char_length(trim(p_reason))<3 then raise exception 'amount and reason required'; end if;
  perform pg_advisory_xact_lock(hashtext('runevault-inventory'));
  next_balance:=public.current_inventory_m()+p_amount_m;
  if next_balance<0 then raise exception 'inventory cannot become negative'; end if;
  insert into public.inventory_transactions(amount_m,transaction_type,reason,actor_id) values(p_amount_m,'adjustment',trim(p_reason),p_actor_id);
  update public.settings set inventory_m=next_balance,updated_at=now() where id=1;
  return next_balance;
end $$;

create or replace function public.reserve_inventory(p_order_id uuid,p_amount_m bigint)
returns uuid language plpgsql security definer set search_path='' as $$
declare reservation_id uuid; available bigint; order_row public.orders%rowtype;
begin
  if p_amount_m<=0 then raise exception 'reservation amount must be positive'; end if;
  perform pg_advisory_xact_lock(hashtext('runevault-inventory'));
  select * into order_row from public.orders where id=p_order_id for update;
  if order_row.id is null or order_row.order_type<>'buy' then raise exception 'eligible buy order required'; end if;
  if exists(select 1 from public.inventory_reservations where order_id=p_order_id) then raise exception 'order already has a reservation'; end if;
  available:=public.current_inventory_m();
  if available<p_amount_m then raise exception 'insufficient inventory'; end if;
  insert into public.inventory_reservations(order_id,amount_m) values(p_order_id,p_amount_m) returning id into reservation_id;
  insert into public.inventory_transactions(amount_m,transaction_type,order_id,reason,source_key) values(-p_amount_m,'reservation',p_order_id,'Inventory reserved for order','reserve:'||p_order_id::text);
  update public.settings set inventory_m=available-p_amount_m,updated_at=now() where id=1;
  return reservation_id;
end $$;

create or replace function public.release_inventory_reservation(p_order_id uuid,p_reason text,p_status text default 'released')
returns bigint language plpgsql security definer set search_path='' as $$
declare reserved bigint; next_balance bigint;
begin
  if p_status not in ('released','expired') then raise exception 'invalid release status'; end if;
  perform pg_advisory_xact_lock(hashtext('runevault-inventory'));
  update public.inventory_reservations set status=p_status,updated_at=now() where order_id=p_order_id and status='active' returning amount_m into reserved;
  if reserved is null then return public.current_inventory_m(); end if;
  insert into public.inventory_transactions(amount_m,transaction_type,order_id,reason,source_key) values(reserved,'release',p_order_id,trim(p_reason),'release:'||p_order_id::text) on conflict(source_key) where source_key is not null do nothing;
  next_balance:=public.current_inventory_m(); update public.settings set inventory_m=next_balance,updated_at=now() where id=1; return next_balance;
end $$;

create or replace function public.expire_inventory_reservations() returns integer language plpgsql security definer set search_path='' as $$
declare item record; released integer:=0;
begin
  for item in select order_id from public.inventory_reservations where status='active' and expires_at<=now() for update loop
    perform public.release_inventory_reservation(item.order_id,'Reservation expired','expired'); released:=released+1;
  end loop; return released;
end $$;

revoke all on function public.adjust_inventory(bigint,text,uuid),public.reserve_inventory(uuid,bigint),public.release_inventory_reservation(uuid,text,text),public.expire_inventory_reservations() from public,anon,authenticated;
grant execute on function public.adjust_inventory(bigint,text,uuid),public.reserve_inventory(uuid,bigint),public.release_inventory_reservation(uuid,text,text),public.expire_inventory_reservations() to service_role;

create or replace function public.track_order_status() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_status_history(order_id,previous_status,status,actor_id) values(new.id,old.status,new.status,auth.uid());
    if new.status='cancelled' then perform public.release_inventory_reservation(new.id,'Order cancelled','released');
    elsif new.status='completed' and new.order_type='buy' then update public.inventory_reservations set status='consumed',updated_at=now() where order_id=new.id and status='active'; end if;
  end if; return new;
end $$;
