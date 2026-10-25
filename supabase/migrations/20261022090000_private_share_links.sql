-- Private share links: the design_shares table is written by the editor
-- but was never read back. This migration makes the flow work:
--  - design_shares table (+ RLS) if it does not already exist
--  - get_shared_design() RPC so anonymous visitors with the token
--    can read the shared design without needing access to the designs table.

create table if not exists public.design_shares (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

alter table public.design_shares enable row level security;

drop policy if exists "design_shares owner select" on public.design_shares;
drop policy if exists "design_shares owner insert" on public.design_shares;
drop policy if exists "design_shares owner delete" on public.design_shares;

create policy "design_shares owner select" on public.design_shares
  for select using (auth.uid() = user_id);
create policy "design_shares owner insert" on public.design_shares
  for insert with check (auth.uid() = user_id);
create policy "design_shares owner delete" on public.design_shares
  for delete using (auth.uid() = user_id);

-- Security definer: the token acts as a capability. Anyone who has it can
-- read that single design, without any access to the designs table itself.
create or replace function public.get_shared_design(p_design_id uuid, p_token text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select to_jsonb(d)
  from public.designs d
  join public.design_shares s on s.design_id = d.id
  where d.id = p_design_id
    and s.token = p_token
  limit 1;
$$;

grant execute on function public.get_shared_design(uuid, text) to anon, authenticated;
