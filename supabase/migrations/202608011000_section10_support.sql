-- Section 10: customer support tickets, chat, messages, attachments, assignment, moderation, and ratings.
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(), ticket_number text not null unique default ('TKT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  user_id uuid references public.profiles(id) on delete set null, order_id uuid references public.orders(id) on delete set null,
  guest_name text, guest_email text, runescape_name text, category text not null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','pending','resolved','closed')),
  subject text not null, assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null, author_type text not null check (author_type in ('customer','staff','system')),
  body text not null check (char_length(body) between 1 and 10000), internal boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete set null,
  guest_token_hash text, customer_name text not null, email text not null, runescape_name text, order_id uuid references public.orders(id) on delete set null,
  status text not null default 'open' check (status in ('open','pending','resolved','blocked')),
  assigned_to uuid references public.profiles(id) on delete set null, last_customer_message_at timestamptz,
  last_staff_message_at timestamptz, customer_typing_at timestamptz, staff_typing_at timestamptz,
  rating integer check (rating between 1 and 5), rating_comment text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null, sender_type text not null check (sender_type in ('customer','staff','system')),
  body text not null check (char_length(body) between 1 and 10000), internal boolean not null default false,
  read_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.support_attachments (
  id uuid primary key default gen_random_uuid(), ticket_id uuid references public.support_tickets(id) on delete cascade,
  conversation_id uuid references public.chat_conversations(id) on delete cascade, uploader_id uuid references public.profiles(id) on delete set null,
  storage_path text not null unique, mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880), created_at timestamptz not null default now(),
  check ((ticket_id is not null)::integer + (conversation_id is not null)::integer = 1)
);
create table if not exists public.canned_replies (
  id uuid primary key default gen_random_uuid(), title text not null, body text not null, category text,
  active boolean not null default true, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security; alter table public.ticket_messages enable row level security;
alter table public.chat_conversations enable row level security; alter table public.chat_messages enable row level security;
alter table public.support_attachments enable row level security; alter table public.canned_replies enable row level security;
create policy "tickets own or admin read" on public.support_tickets for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "tickets own create" on public.support_tickets for insert to authenticated with check (user_id = auth.uid());
create policy "tickets admin update" on public.support_tickets for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ticket messages participant read" on public.ticket_messages for select to authenticated using (public.is_admin() or exists(select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid() and not internal));
create policy "ticket messages customer create" on public.ticket_messages for insert to authenticated with check (author_id = auth.uid() and author_type = 'customer' and not internal and exists(select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid()));
create policy "chat own or admin read" on public.chat_conversations for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "chat messages participant read" on public.chat_messages for select to authenticated using (public.is_admin() or exists(select 1 from public.chat_conversations c where c.id = conversation_id and c.user_id = auth.uid() and not internal));
create policy "chat messages customer create" on public.chat_messages for insert to authenticated with check (sender_id = auth.uid() and sender_type = 'customer' and not internal and exists(select 1 from public.chat_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy "canned replies staff" on public.canned_replies for select to authenticated using (public.is_admin());
grant select, insert on public.support_tickets, public.ticket_messages, public.chat_messages to authenticated;
grant select, insert, update on public.chat_conversations to authenticated;
grant all on public.support_tickets, public.ticket_messages, public.chat_conversations, public.chat_messages, public.support_attachments, public.canned_replies to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('support-attachments','support-attachments',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do nothing;
create index if not exists support_tickets_queue_idx on public.support_tickets(status, priority, updated_at desc);
create index if not exists ticket_messages_ticket_idx on public.ticket_messages(ticket_id, created_at);
create index if not exists chat_conversations_queue_idx on public.chat_conversations(status, updated_at desc);
create index if not exists chat_messages_conversation_idx on public.chat_messages(conversation_id, created_at);
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;
