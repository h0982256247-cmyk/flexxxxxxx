-- =========================================
-- Flex Glass Editor - Database Tables Only
-- Run this if the full setup script fails with permission errors.
-- =========================================

create extension if not exists pgcrypto;

-- ---------- docs ----------
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

-- keep updated_at current
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

-- ---------- doc_versions ----------
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

-- ---------- shares ----------
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

-- ---------- RPC: resolve token ----------
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

-- ---------- RLS ----------
alter table public.docs enable row level security;
alter table public.doc_versions enable row level security;
alter table public.shares enable row level security;

-- docs: owner only
drop policy if exists docs_select_own on public.docs;
create policy docs_select_own on public.docs for select using (auth.uid() = owner_id);

drop policy if exists docs_insert_own on public.docs;
create policy docs_insert_own on public.docs for insert with check (auth.uid() = owner_id);

drop policy if exists docs_update_own on public.docs;
create policy docs_update_own on public.docs for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists docs_delete_own on public.docs;
create policy docs_delete_own on public.docs for delete using (auth.uid() = owner_id);

-- doc_versions: owner only
drop policy if exists doc_versions_select_own on public.doc_versions;
create policy doc_versions_select_own on public.doc_versions for select using (auth.uid() = owner_id);

drop policy if exists doc_versions_insert_own on public.doc_versions;
create policy doc_versions_insert_own on public.doc_versions for insert with check (auth.uid() = owner_id);

drop policy if exists doc_versions_delete_own on public.doc_versions;
create policy doc_versions_delete_own on public.doc_versions for delete using (auth.uid() = owner_id);

-- shares: owner only (share page uses RPC)
drop policy if exists shares_select_own on public.shares;
create policy shares_select_own on public.shares for select using (auth.uid() = owner_id);

drop policy if exists shares_insert_own on public.shares;
create policy shares_insert_own on public.shares for insert with check (auth.uid() = owner_id);

drop policy if exists shares_update_own on public.shares;
create policy shares_update_own on public.shares for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists shares_delete_own on public.shares;
create policy shares_delete_own on public.shares for delete using (auth.uid() = owner_id);

-- allow anon to call get_share
grant execute on function public.get_share(text) to anon, authenticated;

-- allow anon to resolve active token by doc id
grant execute on function public.get_active_token(uuid) to anon, authenticated;

-- optional: allow anon to read from get_share outputs only, no table access
revoke all on table public.docs from anon;
revoke all on table public.doc_versions from anon;
revoke all on table public.shares from anon;
