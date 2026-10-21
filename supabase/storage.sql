-- ============================================================
-- MTB Team Platform — storage.sql
-- Buckets públicos + políticas de lectura/escritura.
-- Ejecutar DESPUÉS de schema.sql y rls.sql.
-- ============================================================

-- 1) Buckets (idempotente)
insert into storage.buckets (id, name, public)
values
  ('gallery', 'gallery', true),
  ('news', 'news', true),
  ('banners', 'banners', true),
  ('cyclists', 'cyclists', true),
  ('sponsors', 'sponsors', true)
on conflict (id) do nothing;

-- 2) Lectura pública en esos buckets
drop policy if exists "public read storage" on storage.objects;
create policy "public read storage" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('gallery','news','banners','cyclists','sponsors'));

-- 3) Escritura solo authenticated (subir)
drop policy if exists "auth insert storage" on storage.objects;
create policy "auth insert storage" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('gallery','news','banners','cyclists','sponsors'));

-- 4) Actualizar solo authenticated
drop policy if exists "auth update storage" on storage.objects;
create policy "auth update storage" on storage.objects
  for update to authenticated
  using (bucket_id in ('gallery','news','banners','cyclists','sponsors'))
  with check (bucket_id in ('gallery','news','banners','cyclists','sponsors'));

-- 5) Borrar solo authenticated
drop policy if exists "auth delete storage" on storage.objects;
create policy "auth delete storage" on storage.objects
  for delete to authenticated
  using (bucket_id in ('gallery','news','banners','cyclists','sponsors'));
