-- Version history: snapshots of a design, taken on every save.
create table if not exists public.design_versions (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pages jsonb not null,
  canvas_w int not null,
  canvas_h int not null,
  thumbnail text,
  created_at timestamptz not null default now()
);

alter table public.design_versions enable row level security;

drop policy if exists "design_versions owner select" on public.design_versions;
drop policy if exists "design_versions owner insert" on public.design_versions;
drop policy if exists "design_versions owner delete" on public.design_versions;

create policy "design_versions owner select" on public.design_versions
  for select using (auth.uid() = user_id);
create policy "design_versions owner insert" on public.design_versions
  for insert with check (auth.uid() = user_id);
create policy "design_versions owner delete" on public.design_versions
  for delete using (auth.uid() = user_id);
