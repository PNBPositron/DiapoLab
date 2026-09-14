insert into storage.buckets (id, name, public)
values ('account-images', 'account-images', false)
on conflict (id) do nothing;

create policy "Users can upload account images"
on storage.objects for insert to authenticated
with check (bucket_id = 'account-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users can read account images"
on storage.objects for select to authenticated
using (bucket_id = 'account-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users can delete account images"
on storage.objects for delete to authenticated
using (bucket_id = 'account-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
