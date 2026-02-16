-- Enable the pg_net extension if not already enabled (required for some storage ops, though usually default)
-- create extension if not exists "pg_net";

-- 1. 'avatars' bucket setup
-- Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policy: Anyone can view avatars (SELECT)
create policy "Avatar images are publicly accessible"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- Policy: Users can upload their own avatar (INSERT)
-- Path convention: user_id/filename
create policy "Users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own avatar (UPDATE)
create policy "Users can update their own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own avatar (DELETE) - Optional but good practice
create policy "Users can delete their own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);


-- 2. 'chat-images' bucket setup
-- Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

-- Policy: Anyone can view chat images (SELECT)
create policy "Chat images are publicly accessible"
on storage.objects for select
using ( bucket_id = 'chat-images' );

-- Policy: Authenticated users can upload chat images (INSERT)
-- No strict path restriction other than being logged in
create policy "Authenticated users can upload chat images"
on storage.objects for insert
with check (
  bucket_id = 'chat-images'
  and auth.role() = 'authenticated'
);
