-- RPC to resolve doc_id to the latest active share token
create or replace function public.get_active_token(p_doc_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select token
  from public.shares
  where doc_id = p_doc_id and is_active = true
  order by created_at desc
  limit 1;
$$;

-- Allow public access
grant execute on function public.get_active_token(uuid) to anon, authenticated;
