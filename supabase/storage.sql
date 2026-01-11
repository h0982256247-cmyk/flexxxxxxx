-- =========================================
-- Supabase Storage: bucket + RLS for flex-assets
-- Requirement:
-- - admin後台要登入
-- - 所有登入使用者都能上傳
-- =========================================

-- Create bucket (run in SQL editor with service role / project owner)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flex-assets', 'flex-assets', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Enable RLS
alter table storage.objects enable row level security;

-- Policy: authenticated can upload into flex-assets
drop policy if exists "flex-assets upload auth" on storage.objects;
create policy "flex-assets upload auth"
on storage.objects for insert
to authenticated
with check (bucket_id = 'flex-assets');

-- Policy: authenticated can update own objects in flex-assets
drop policy if exists "flex-assets update own" on storage.objects;
create policy "flex-assets update own"
on storage.objects for update
to authenticated
using (bucket_id = 'flex-assets' and owner = auth.uid())
with check (bucket_id = 'flex-assets' and owner = auth.uid());

-- Policy: authenticated can delete own objects in flex-assets
drop policy if exists "flex-assets delete own" on storage.objects;
create policy "flex-assets delete own"
on storage.objects for delete
to authenticated
using (bucket_id = 'flex-assets' and owner = auth.uid());

-- Policy: public read (since bucket is public)
drop policy if exists "flex-assets public read" on storage.objects;
create policy "flex-assets public read"
on storage.objects for select
to public
using (bucket_id = 'flex-assets');

