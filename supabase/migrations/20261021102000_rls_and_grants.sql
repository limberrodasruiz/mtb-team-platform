-- ============================================================================
-- MTB Team Platform - RLS, least-privilege grants and storage policies
-- Replaces the permissive policies from the legacy rls.sql / storage.sql.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Drop legacy and previous policies for the tables we manage.
-- ----------------------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'categories', 'cyclists', 'races', 'race_registrations',
        'scoring_rules', 'race_results', 'achievements', 'members',
        'membership_payments', 'membership_payment_entries', 'contributions',
        'cash_movements', 'expenses', 'race_budgets', 'sponsors', 'news',
        'banners', 'gallery', 'audit_logs', 'site_settings'
      )
  loop
    execute format('drop policy if exists %I on %I.%I',
      p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Enable RLS (idempotent)
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.cyclists enable row level security;
alter table public.races enable row level security;
alter table public.race_registrations enable row level security;
alter table public.scoring_rules enable row level security;
alter table public.race_results enable row level security;
alter table public.achievements enable row level security;
alter table public.members enable row level security;
alter table public.membership_payments enable row level security;
alter table public.membership_payment_entries enable row level security;
alter table public.contributions enable row level security;
alter table public.cash_movements enable row level security;
alter table public.expenses enable row level security;
alter table public.race_budgets enable row level security;
alter table public.sponsors enable row level security;
alter table public.news enable row level security;
alter table public.banners enable row level security;
alter table public.gallery enable row level security;
alter table public.audit_logs enable row level security;
alter table public.site_settings enable row level security;

-- ----------------------------------------------------------------------------
-- 3. Public read policies
-- ----------------------------------------------------------------------------
create policy "public_read_categories" on public.categories
  for select to anon, authenticated
  using (active = true);

create policy "public_read_cyclists" on public.cyclists
  for select to anon, authenticated
  using (active = true);

create policy "public_read_races" on public.races
  for select to anon, authenticated
  using (true);

create policy "public_read_registrations" on public.race_registrations
  for select to anon, authenticated
  using (true);

create policy "public_read_results" on public.race_results
  for select to anon, authenticated
  using (result_status <> 'ANULADO');

create policy "public_read_scoring" on public.scoring_rules
  for select to anon, authenticated
  using (true);

create policy "public_read_achievements" on public.achievements
  for select to anon, authenticated
  using (true);

create policy "public_read_sponsors" on public.sponsors
  for select to anon, authenticated
  using (
    active = true
    and (starts_at is null or starts_at <= current_date)
    and (ends_at is null or ends_at >= current_date)
  );

create policy "public_read_news" on public.news
  for select to anon, authenticated
  using (
    status = 'PUBLICADO'
    and (published_at is null or published_at <= now())
  );

create policy "public_read_banners" on public.banners
  for select to anon, authenticated
  using (
    active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create policy "public_read_gallery" on public.gallery
  for select to anon, authenticated
  using (published = true);

create policy "public_read_settings" on public.site_settings
  for select to anon, authenticated
  using (true);

-- Staff can read unpublished or inactive rows.
create policy "staff_read_categories" on public.categories
  for select to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "staff_read_cyclists" on public.cyclists
  for select to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "staff_read_results" on public.race_results
  for select to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "staff_read_sponsors" on public.sponsors
  for select to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "staff_read_news" on public.news
  for select to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "staff_read_banners" on public.banners
  for select to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "staff_read_gallery" on public.gallery
  for select to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']));

-- ----------------------------------------------------------------------------
-- 4. Content write policies: ADMIN + EDITOR
-- ----------------------------------------------------------------------------
create policy "write_categories" on public.categories
  for all to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']))
  with check (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "write_cyclists" on public.cyclists
  for all to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']))
  with check (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "write_races" on public.races
  for all to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']))
  with check (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "write_registrations" on public.race_registrations
  for all to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']))
  with check (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "write_results" on public.race_results
  for all to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']))
  with check (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "write_scoring" on public.scoring_rules
  for all to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']))
  with check (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "write_achievements" on public.achievements
  for all to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']))
  with check (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "write_sponsors" on public.sponsors
  for all to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']))
  with check (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "write_news" on public.news
  for all to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']))
  with check (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "write_banners" on public.banners
  for all to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']))
  with check (public.is_admin_or(array['ADMIN', 'EDITOR']));

create policy "write_gallery" on public.gallery
  for all to authenticated
  using (public.is_admin_or(array['ADMIN', 'EDITOR']))
  with check (public.is_admin_or(array['ADMIN', 'EDITOR']));

-- Settings are administrative, not editorial.
create policy "write_settings" on public.site_settings
  for update to authenticated
  using (public.is_admin_or(array['ADMIN']))
  with check (public.is_admin_or(array['ADMIN']));

-- ----------------------------------------------------------------------------
-- 5. Sensitive read policies
-- ----------------------------------------------------------------------------
create policy "finance_read_members" on public.members
  for select to authenticated
  using (public.is_admin_or(array['ADMIN', 'DIRECTIVA', 'TESORERIA']));

create policy "finance_read_obligations" on public.membership_payments
  for select to authenticated
  using (public.is_admin_or(array['ADMIN', 'DIRECTIVA', 'TESORERIA']));

create policy "finance_read_payment_entries" on public.membership_payment_entries
  for select to authenticated
  using (public.is_admin_or(array['ADMIN', 'DIRECTIVA', 'TESORERIA']));

create policy "finance_read_contributions" on public.contributions
  for select to authenticated
  using (public.is_admin_or(array['ADMIN', 'DIRECTIVA', 'TESORERIA']));

create policy "finance_read_cash" on public.cash_movements
  for select to authenticated
  using (public.is_admin_or(array['ADMIN', 'DIRECTIVA', 'TESORERIA']));

create policy "finance_read_expenses" on public.expenses
  for select to authenticated
  using (public.is_admin_or(array['ADMIN', 'DIRECTIVA', 'TESORERIA']));

create policy "finance_read_budgets" on public.race_budgets
  for select to authenticated
  using (public.is_admin_or(array['ADMIN', 'DIRECTIVA', 'TESORERIA']));

-- ----------------------------------------------------------------------------
-- 6. Sensitive write policies (direct table writes)
--    Cash, expenses and contributions are RPC-only (no DML grants).
-- ----------------------------------------------------------------------------
create policy "finance_write_members" on public.members
  for insert to authenticated
  with check (public.is_finance());

create policy "finance_update_members" on public.members
  for update to authenticated
  using (public.is_finance())
  with check (public.is_finance());

create policy "finance_write_obligations" on public.membership_payments
  for insert to authenticated
  with check (public.is_finance());

create policy "finance_update_obligations" on public.membership_payments
  for update to authenticated
  using (public.is_finance())
  with check (public.is_finance());

create policy "finance_write_budgets" on public.race_budgets
  for all to authenticated
  using (public.is_finance())
  with check (public.is_finance());

-- ----------------------------------------------------------------------------
-- 7. Profiles
-- ----------------------------------------------------------------------------
create policy "profiles_read_own" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin_or(array['ADMIN', 'DIRECTIVA', 'TESORERIA'])
  );

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_admin_update" on public.profiles
  for update to authenticated
  using (public.is_admin_or(array['ADMIN']))
  with check (public.is_admin_or(array['ADMIN']));

-- No insert: profiles are created by the auth trigger.
-- No delete: deleting auth.users cascades.

-- ----------------------------------------------------------------------------
-- 8. Audit logs: read-only for ADMIN; triggers write with definer rights.
-- ----------------------------------------------------------------------------
create policy "audit_read_admin" on public.audit_logs
  for select to authenticated
  using (public.is_admin_or(array['ADMIN']));

-- ----------------------------------------------------------------------------
-- 9. Grants: revoke everything from anon, then grant only public reads.
-- ----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all views in schema public from anon;
revoke all on all sequences in schema public from anon;

grant usage on schema public to anon, authenticated;

grant select on public.categories to anon, authenticated;
grant select
  (id, full_name, slug, nickname, category_id, specialty, number,
   photo_path, photo_url, bio, team_since, joined_at, featured, active,
   created_at, updated_at)
  on public.cyclists to anon;
grant select on public.cyclists to authenticated;
grant select on public.races to anon, authenticated;
grant select on public.race_registrations to anon, authenticated;
grant select
  (id, race_id, cyclist_id, category_id, position, time_text, points,
   result_status, time_seconds, created_at, updated_at)
  on public.race_results to anon;
grant select on public.race_results to authenticated;
grant select on public.scoring_rules to anon, authenticated;
grant select on public.achievements to anon, authenticated;
grant select on public.sponsors to anon, authenticated;
grant select on public.news to anon, authenticated;
grant select on public.banners to anon, authenticated;
grant select on public.gallery to anon, authenticated;
grant select on public.site_settings to anon, authenticated;

-- Authenticated can attempt reads on all tables; RLS still restricts rows.
grant select on all tables in schema public to authenticated;

-- Content and membership table writes are additionally constrained by RLS.
grant insert, update, delete on public.categories to authenticated;
grant insert, update, delete on public.cyclists to authenticated;
grant insert, update, delete on public.races to authenticated;
grant insert, update, delete on public.race_registrations to authenticated;
grant insert, update, delete on public.race_results to authenticated;
grant insert, update, delete on public.scoring_rules to authenticated;
grant insert, update, delete on public.achievements to authenticated;
grant insert, update, delete on public.sponsors to authenticated;
grant insert, update, delete on public.news to authenticated;
grant insert, update, delete on public.banners to authenticated;
grant insert, update, delete on public.gallery to authenticated;
grant insert, update, delete on public.members to authenticated;
grant insert, update, delete on public.membership_payments to authenticated;
grant insert, update, delete on public.race_budgets to authenticated;
grant update on public.profiles to authenticated;
grant update on public.site_settings to authenticated;

-- Financial ledger tables are RPC-only: no direct insert/update/delete.
revoke insert, update, delete on public.contributions from authenticated;
revoke insert, update, delete on public.membership_payment_entries from authenticated;
revoke insert, update, delete on public.cash_movements from authenticated;
revoke insert, update, delete on public.expenses from authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- Views
revoke all on all views in schema public from anon;
revoke all on all views in schema public from authenticated;

grant select on public.v_public_cyclists to anon, authenticated;
grant select on public.v_public_cyclist_stats to anon, authenticated;
grant select on public.v_membership_obligations to authenticated;
grant select on public.v_cash_summary to authenticated;
grant select on public.v_cash_monthly to authenticated;
grant select on public.v_cash_ledger to authenticated;
grant select on public.v_expenses_detail to authenticated;
grant select on public.v_expenses_by_category to authenticated;
grant select on public.v_race_financials to authenticated;
grant select on public.v_race_expense_categories to authenticated;
grant select on public.v_member_debt to authenticated;
grant select on public.v_membership_summary to authenticated;
grant select on public.v_finance_monthly to authenticated;

-- Functions
revoke all on all functions in schema public from public;
grant execute on function public.is_admin_or(text[]) to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_finance() to authenticated;
grant execute on function public.is_content_editor() to authenticated;
grant execute on function public.get_ranking(integer, uuid) to anon, authenticated;

-- Finance RPCs are intentionally NOT executable by anon.
grant execute on function public.register_membership_payment(uuid, numeric, date, text, text, text, text) to authenticated;
grant execute on function public.reverse_membership_payment(uuid, text) to authenticated;
grant execute on function public.register_income(text, date, numeric, text, uuid, text, text, text, text) to authenticated;
grant execute on function public.reverse_income(uuid, text) to authenticated;
grant execute on function public.register_expense(date, text, text, numeric, text, uuid, text, text, text, text) to authenticated;
grant execute on function public.reverse_expense(uuid, text) to authenticated;
grant execute on function public.set_opening_balance(numeric, date, text) to authenticated;
grant execute on function public.reverse_opening_balance(text) to authenticated;
grant execute on function public.generate_membership_obligations(integer, integer) to authenticated;
grant execute on function public.annul_membership_obligation(uuid, text) to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.bootstrap_admin(text) to service_role;

-- ----------------------------------------------------------------------------
-- 10. Storage buckets and policies
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('gallery', 'gallery', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('news', 'news', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('banners', 'banners', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('cyclists', 'cyclists', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('sponsors', 'sponsors', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in (
        'public read storage', 'auth insert storage', 'auth update storage',
        'auth delete storage', 'public_media_read', 'public_media_insert',
        'public_media_update', 'public_media_delete', 'documents_read',
        'documents_insert', 'documents_update', 'documents_delete'
      )
  loop
    execute format('drop policy if exists %I on %I.%I',
      p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

create policy "public_media_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('gallery', 'news', 'banners', 'cyclists', 'sponsors'));

create policy "public_media_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('gallery', 'news', 'banners', 'cyclists', 'sponsors')
    and public.is_admin_or(array['ADMIN', 'EDITOR'])
  );

create policy "public_media_update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('gallery', 'news', 'banners', 'cyclists', 'sponsors')
    and public.is_admin_or(array['ADMIN', 'EDITOR'])
  )
  with check (
    bucket_id in ('gallery', 'news', 'banners', 'cyclists', 'sponsors')
    and public.is_admin_or(array['ADMIN', 'EDITOR'])
  );

create policy "public_media_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('gallery', 'news', 'banners', 'cyclists', 'sponsors')
    and public.is_admin_or(array['ADMIN', 'EDITOR'])
  );

create policy "documents_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and public.is_admin_or(array['ADMIN', 'DIRECTIVA', 'TESORERIA'])
  );

create policy "documents_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.is_finance()
  );

create policy "documents_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and public.is_finance()
  )
  with check (
    bucket_id = 'documents'
    and public.is_finance()
  );

create policy "documents_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and public.is_finance()
  );

commit;
