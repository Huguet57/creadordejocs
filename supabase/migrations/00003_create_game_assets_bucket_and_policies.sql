insert into storage.buckets (id, name, public)
values ('game-assets', 'game-assets', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

drop policy if exists "public_read_game_assets" on storage.objects;
create policy "public_read_game_assets"
on storage.objects
for select
using (bucket_id = 'game-assets');

drop policy if exists "authenticated_insert_game_assets" on storage.objects;
create policy "authenticated_insert_game_assets"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'game-assets');

drop policy if exists "authenticated_update_game_assets" on storage.objects;
create policy "authenticated_update_game_assets"
on storage.objects
for update
to authenticated
using (bucket_id = 'game-assets')
with check (bucket_id = 'game-assets');

drop policy if exists "authenticated_delete_game_assets" on storage.objects;
create policy "authenticated_delete_game_assets"
on storage.objects
for delete
to authenticated
using (bucket_id = 'game-assets');
