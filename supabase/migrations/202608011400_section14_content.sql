-- Section 14: publishable OSRS news, guides, quest helpers, and searchable content.
create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  type text not null check (type in ('news','blog','guide','quest_helper')), title text not null, summary text not null,
  body_markdown text not null, search_text tsvector generated always as (to_tsvector('english',title||' '||summary||' '||body_markdown)) stored,
  status text not null default 'draft' check (status in ('draft','review','published','archived')), featured boolean not null default false,
  author_id uuid references public.profiles(id) on delete set null, published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((status='published' and published_at is not null) or status<>'published')
);
alter table public.content_posts enable row level security;
create policy "published content public" on public.content_posts for select to anon,authenticated using (status='published' and published_at<=now() or public.is_admin());
create policy "content admin create" on public.content_posts for insert to authenticated with check (public.is_admin());
create policy "content admin update" on public.content_posts for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.content_posts to anon,authenticated; grant insert,update on public.content_posts to authenticated; grant all on public.content_posts to service_role;
create index if not exists content_posts_public_idx on public.content_posts(type,status,published_at desc);
create index if not exists content_posts_search_idx on public.content_posts using gin(search_text);
