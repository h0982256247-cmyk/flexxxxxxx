-- =========================================
-- Flex Glass Editor - Final Complete Setup
-- This script sets up:
-- 1. Database Tables (docs, doc_versions, shares)
-- 2. Storage Bucket (flex-assets)
-- 3. Security Policies (RLS)
-- =========================================

-- 1. Enable Crypto Extension
create extension if not exists pgcrypto;

-- 2. Create Tables
-- docs
create table if not exists public.docs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('bubble','carousel')),
  title text not null default 'Untitled',
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','previewable','publishable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists docs_owner_idx on public.docs(owner_id);
create index if not exists docs_updated_idx on public.docs(updated_at desc);

-- trigger for updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_docs_updated_at on public.docs;
create trigger trg_docs_updated_at
before update on public.docs
for each row execute function public.set_updated_at();

-- doc_versions
create table if not exists public.doc_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  doc_id uuid not null references public.docs(id) on delete cascade,
  version_no int not null,
  flex_json jsonb not null,
  validation_report jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists doc_versions_unique on public.doc_versions(doc_id, version_no);
create index if not exists doc_versions_owner_idx on public.doc_versions(owner_id);

-- shares
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  doc_id uuid not null references public.docs(id) on delete cascade,
  version_id uuid not null references public.doc_versions(id) on delete cascade,
  token text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists shares_doc_idx on public.shares(doc_id);
create index if not exists shares_active_idx on public.shares(is_active);

-- 3. Functions
create or replace function public.get_share(p_token text)
returns table (
  token text,
  version_no int,
  flex_json jsonb,
  doc_model jsonb
)
language sql
security definer
set search_path = public
as $$
  select s.token,
         v.version_no,
         v.flex_json,
         d.content as doc_model
  from public.shares s
  join public.doc_versions v on v.id = s.version_id
  join public.docs d on d.id = s.doc_id
  where s.token = p_token and s.is_active = true
  limit 1;
$$;

-- Active token by doc id (share?id=... flow)
create or replace function public.get_active_token(p_doc_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select s.token
  from public.shares s
  where s.doc_id = p_doc_id and s.is_active = true
  order by s.created_at desc
  limit 1;
$$;

-- 4. Enable RLS on Tables
alter table public.docs enable row level security;
alter table public.doc_versions enable row level security;
alter table public.shares enable row level security;

-- 5. Table Policies
-- docs
drop policy if exists docs_select_own on public.docs;
create policy docs_select_own on public.docs for select using (auth.uid() = owner_id);

drop policy if exists docs_insert_own on public.docs;
create policy docs_insert_own on public.docs for insert with check (auth.uid() = owner_id);

drop policy if exists docs_update_own on public.docs;
create policy docs_update_own on public.docs for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists docs_delete_own on public.docs;
create policy docs_delete_own on public.docs for delete using (auth.uid() = owner_id);

-- doc_versions
drop policy if exists doc_versions_select_own on public.doc_versions;
create policy doc_versions_select_own on public.doc_versions for select using (auth.uid() = owner_id);

drop policy if exists doc_versions_insert_own on public.doc_versions;
create policy doc_versions_insert_own on public.doc_versions for insert with check (auth.uid() = owner_id);

drop policy if exists doc_versions_delete_own on public.doc_versions;
create policy doc_versions_delete_own on public.doc_versions for delete using (auth.uid() = owner_id);

-- shares
drop policy if exists shares_select_own on public.shares;
create policy shares_select_own on public.shares for select using (auth.uid() = owner_id);

drop policy if exists shares_insert_own on public.shares;
create policy shares_insert_own on public.shares for insert with check (auth.uid() = owner_id);

drop policy if exists shares_update_own on public.shares;
create policy shares_update_own on public.shares for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists shares_delete_own on public.shares;
create policy shares_delete_own on public.shares for delete using (auth.uid() = owner_id);

-- public access to function
grant execute on function public.get_share(text) to anon, authenticated;

grant execute on function public.get_active_token(uuid) to anon, authenticated;

-- 6. Storage Setup
-- NOTE: We do NOT enable RLS on storage.objects here as it is a system table
-- and usually already has RLS enabled. Attempting to enable it again often fails.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flex-assets', 'flex-assets', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage Policies
-- Upload
drop policy if exists "flex-assets upload auth" on storage.objects;
create policy "flex-assets upload auth"
on storage.objects for insert
to authenticated
with check (bucket_id = 'flex-assets');

-- Update own
drop policy if exists "flex-assets update own" on storage.objects;
create policy "flex-assets update own"
on storage.objects for update
to authenticated
using (bucket_id = 'flex-assets' and owner = auth.uid())
with check (bucket_id = 'flex-assets' and owner = auth.uid());

-- Delete own
drop policy if exists "flex-assets delete own" on storage.objects;
create policy "flex-assets delete own"
on storage.objects for delete
to authenticated
using (bucket_id = 'flex-assets' and owner = auth.uid());

-- Public Read
drop policy if exists "flex-assets public read" on storage.objects;
create policy "flex-assets public read"
on storage.objects for select
to public
using (bucket_id = 'flex-assets');
