-- Run this in Supabase Dashboard → SQL Editor for the project used by the app.
-- Creates the public photo bucket and allows app (anonymous) uploads only under hazards/.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'Hazard-Photos',
  'Hazard-Photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Allow Hazard-Photos uploads" on storage.objects;

create policy "Allow Hazard-Photos uploads"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'Hazard-Photos'
    and (storage.foldername(name))[1] = 'hazards'
  );
