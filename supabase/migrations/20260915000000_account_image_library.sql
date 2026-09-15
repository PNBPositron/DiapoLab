create table if not exists public.account_images (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.account_images enable row level security;

create policy "Users can view their account images"
on public.account_images for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their account images"
on public.account_images for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete their account images"
on public.account_images for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, delete on public.account_images to authenticated;

create index if not exists account_images_user_created_idx
on public.account_images (user_id, created_at desc);
