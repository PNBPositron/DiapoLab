insert into storage.buckets (id, name, public)
values ('account-images', 'account-images', false)
on conflict (id) do update set public = false;
