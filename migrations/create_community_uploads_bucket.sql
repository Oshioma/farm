-- Storage for Community Builder uploads: journal photos/videos, post images,
-- community logos/banners, and member avatars/gallery profile fields.
--
-- The bucket is public — object URLs are stable CDN links, not signed URLs, so
-- images load fast with no extra round trip. This matches most small-community
-- platforms, but note it means uploaded media is fetchable by anyone with the
-- URL even inside a private/invite-only community; the app-level content (the
-- journal entry, the post) stays gated by RLS as normal. Tightening this to
-- signed URLs per-community is a follow-up if that tradeoff isn't acceptable.
insert into storage.buckets (id, name, public)
values ('community-uploads', 'community-uploads', true)
on conflict (id) do update set public = excluded.public;

-- Objects are stored under "<uploader-user-id>/...", so ownership is derived
-- from the path rather than a separate ACL table.
drop policy if exists "community_uploads_public_read" on storage.objects;
create policy "community_uploads_public_read"
  on storage.objects for select
  using (bucket_id = 'community-uploads');

drop policy if exists "community_uploads_owner_insert" on storage.objects;
create policy "community_uploads_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'community-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "community_uploads_owner_update" on storage.objects;
create policy "community_uploads_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'community-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "community_uploads_owner_delete" on storage.objects;
create policy "community_uploads_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'community-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
