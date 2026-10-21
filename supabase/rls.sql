-- ============================================================
-- MTB Team Platform — rls.sql
-- Ejecutar DESPUÉS de schema.sql.
-- Roles: ADMIN todo; DIRECTIVA lectura sensible;
-- TESORERIA CRUD finanzas; EDITOR CRUD deporte/contenido.
-- ============================================================

-- ---------- 1) Funciones de rol (SECURITY DEFINER) ----------
create or replace function public.is_admin_or(required_roles text[])
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = any (required_roles)
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
as $$
  select public.is_admin_or(array['ADMIN','DIRECTIVA','TESORERIA','EDITOR']);
$$;

-- ---------- 2) Habilitar RLS en todas ----------
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

-- ============================================================
-- 3) LECTURA PÚBLICA (anon + authenticated)
-- ============================================================

-- Categories: todo público
drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories
  for select to anon, authenticated using (true);

-- Cyclists: solo activos en público
drop policy if exists "public read cyclists" on public.cyclists;
create policy "public read cyclists" on public.cyclists
  for select to anon, authenticated using (active = true);

-- Races: todas visibles
drop policy if exists "public read races" on public.races;
create policy "public read races" on public.races
  for select to anon, authenticated using (true);

-- Race results / scoring / achievements: públicos
drop policy if exists "public read race_results" on public.race_results;
create policy "public read race_results" on public.race_results
  for select to anon, authenticated using (true);

drop policy if exists "public read scoring" on public.scoring_rules;
create policy "public read scoring" on public.scoring_rules
  for select to anon, authenticated using (true);

drop policy if exists "public read achievements" on public.achievements;
create policy "public read achievements" on public.achievements
  for select to anon, authenticated using (true);

-- Registrations: lectura pública (lista de inscritos)
drop policy if exists "public read registrations" on public.race_registrations;
create policy "public read registrations" on public.race_registrations
  for select to anon, authenticated using (true);

-- Sponsors activos
drop policy if exists "public read sponsors" on public.sponsors;
create policy "public read sponsors" on public.sponsors
  for select to anon, authenticated using (active = true);

-- News publicadas
drop policy if exists "public read news" on public.news;
create policy "public read news" on public.news
  for select to anon, authenticated using (status = 'PUBLICADO');

-- Banners activos
drop policy if exists "public read banners" on public.banners;
create policy "public read banners" on public.banners
  for select to anon, authenticated using (active = true);

-- Gallery publicada
drop policy if exists "public read gallery" on public.gallery;
create policy "public read gallery" on public.gallery
  for select to anon, authenticated using (published = true);

-- Site settings: público
drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings
  for select to anon, authenticated using (true);

-- ============================================================
-- 4) ESCRITURA deporte/contenido → ADMIN + EDITOR
-- Tablas: categories, cyclists, races, race_registrations,
-- race_results, scoring_rules, achievements,
-- sponsors, news, banners, gallery, site_settings
-- ============================================================

-- Helper: no hay loops en SQL plano, se repite por tabla.
-- Categories
drop policy if exists "write categories staff" on public.categories;
create policy "write categories staff" on public.categories
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','EDITOR']))
  with check (public.is_admin_or(array['ADMIN','EDITOR']));

-- Cyclists
drop policy if exists "write cyclists staff" on public.cyclists;
create policy "write cyclists staff" on public.cyclists
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','EDITOR']))
  with check (public.is_admin_or(array['ADMIN','EDITOR']));

-- Races
drop policy if exists "write races staff" on public.races;
create policy "write races staff" on public.races
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','EDITOR']))
  with check (public.is_admin_or(array['ADMIN','EDITOR']));

-- Registrations
drop policy if exists "write registrations staff" on public.race_registrations;
create policy "write registrations staff" on public.race_registrations
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','EDITOR']))
  with check (public.is_admin_or(array['ADMIN','EDITOR']));

-- Results
drop policy if exists "write results staff" on public.race_results;
create policy "write results staff" on public.race_results
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','EDITOR']))
  with check (public.is_admin_or(array['ADMIN','EDITOR']));

-- Scoring
drop policy if exists "write scoring staff" on public.scoring_rules;
create policy "write scoring staff" on public.scoring_rules
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','EDITOR']))
  with check (public.is_admin_or(array['ADMIN','EDITOR']));

-- Achievements
drop policy if exists "write achievements staff" on public.achievements;
create policy "write achievements staff" on public.achievements
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','EDITOR']))
  with check (public.is_admin_or(array['ADMIN','EDITOR']));

-- Sponsors
drop policy if exists "write sponsors staff" on public.sponsors;
create policy "write sponsors staff" on public.sponsors
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','EDITOR']))
  with check (public.is_admin_or(array['ADMIN','EDITOR']));

-- News
drop policy if exists "write news staff" on public.news;
create policy "write news staff" on public.news
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','EDITOR']))
  with check (public.is_admin_or(array['ADMIN','EDITOR']));

-- Banners
drop policy if exists "write banners staff" on public.banners;
create policy "write banners staff" on public.banners
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','EDITOR']))
  with check (public.is_admin_or(array['ADMIN','EDITOR']));

-- Gallery
drop policy if exists "write gallery staff" on public.gallery;
create policy "write gallery staff" on public.gallery
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','EDITOR']))
  with check (public.is_admin_or(array['ADMIN','EDITOR']));

-- Site settings (solo ADMIN + EDITOR)
drop policy if exists "write settings staff" on public.site_settings;
create policy "write settings staff" on public.site_settings
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','EDITOR']))
  with check (public.is_admin_or(array['ADMIN','EDITOR']));

-- ============================================================
-- 5) TABLAS SENSIBLES — solo authenticated
-- members, membership_payments, contributions,
-- cash_movements, expenses, race_budgets
-- Lectura: ADMIN, DIRECTIVA, TESORERIA
-- Escritura: ADMIN, TESORERIA
-- ============================================================

-- Members
drop policy if exists "read members staff" on public.members;
create policy "read members staff" on public.members
  for select to authenticated
  using (public.is_admin_or(array['ADMIN','DIRECTIVA','TESORERIA']));
drop policy if exists "write members finance" on public.members;
create policy "write members finance" on public.members
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','TESORERIA']))
  with check (public.is_admin_or(array['ADMIN','TESORERIA']));

-- Membership payments
drop policy if exists "read payments staff" on public.membership_payments;
create policy "read payments staff" on public.membership_payments
  for select to authenticated
  using (public.is_admin_or(array['ADMIN','DIRECTIVA','TESORERIA']));
drop policy if exists "write payments finance" on public.membership_payments;
create policy "write payments finance" on public.membership_payments
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','TESORERIA']))
  with check (public.is_admin_or(array['ADMIN','TESORERIA']));

-- Contributions
drop policy if exists "read contributions staff" on public.contributions;
create policy "read contributions staff" on public.contributions
  for select to authenticated
  using (public.is_admin_or(array['ADMIN','DIRECTIVA','TESORERIA']));
drop policy if exists "write contributions finance" on public.contributions;
create policy "write contributions finance" on public.contributions
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','TESORERIA']))
  with check (public.is_admin_or(array['ADMIN','TESORERIA']));

-- Cash movements
drop policy if exists "read cash staff" on public.cash_movements;
create policy "read cash staff" on public.cash_movements
  for select to authenticated
  using (public.is_admin_or(array['ADMIN','DIRECTIVA','TESORERIA']));
drop policy if exists "write cash finance" on public.cash_movements;
create policy "write cash finance" on public.cash_movements
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','TESORERIA']))
  with check (public.is_admin_or(array['ADMIN','TESORERIA']));

-- Expenses
drop policy if exists "read expenses staff" on public.expenses;
create policy "read expenses staff" on public.expenses
  for select to authenticated
  using (public.is_admin_or(array['ADMIN','DIRECTIVA','TESORERIA']));
drop policy if exists "write expenses finance" on public.expenses;
create policy "write expenses finance" on public.expenses
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','TESORERIA']))
  with check (public.is_admin_or(array['ADMIN','TESORERIA']));

-- Race budgets
drop policy if exists "read budgets staff" on public.race_budgets;
create policy "read budgets staff" on public.race_budgets
  for select to authenticated
  using (public.is_admin_or(array['ADMIN','DIRECTIVA','TESORERIA']));
drop policy if exists "write budgets finance" on public.race_budgets;
create policy "write budgets finance" on public.race_budgets
  for all to authenticated
  using (public.is_admin_or(array['ADMIN','TESORERIA']))
  with check (public.is_admin_or(array['ADMIN','TESORERIA']));

-- ============================================================
-- 6) Profiles — sensible, solo authenticated
-- ============================================================
drop policy if exists "read profiles own" on public.profiles;
create policy "read profiles own" on public.profiles
  for select to authenticated
  using (
    auth.uid() = id
    or public.is_admin_or(array['ADMIN','DIRECTIVA'])
  );
drop policy if exists "update profiles own" on public.profiles;
create policy "update profiles own" on public.profiles
  for update to authenticated
  using (auth.uid() = id or public.is_admin_or(array['ADMIN']))
  with check (auth.uid() = id or public.is_admin_or(array['ADMIN']));
drop policy if exists "insert profiles own" on public.profiles;
create policy "insert profiles own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id or public.is_admin_or(array['ADMIN']));
drop policy if exists "delete profiles admin" on public.profiles;
create policy "delete profiles admin" on public.profiles
  for delete to authenticated
  using (public.is_admin_or(array['ADMIN']));

-- ============================================================
-- 7) Audit logs — insert cualquier autenticado, sin update/delete
-- ============================================================
drop policy if exists "read audit admin" on public.audit_logs;
create policy "read audit admin" on public.audit_logs
  for select to authenticated
  using (public.is_admin_or(array['ADMIN']));
drop policy if exists "insert audit any" on public.audit_logs;
create policy "insert audit any" on public.audit_logs
  for insert to authenticated
  with check (true);
-- Sin políticas de update/delete = nadie puede modificar ni borrar.

-- ============================================================
-- 8) GRANTs básicos
-- ============================================================
grant usage on schema public to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.cyclists to anon, authenticated;
grant select on public.races to anon, authenticated;
grant select on public.race_registrations to anon, authenticated;
grant select on public.race_results to anon, authenticated;
grant select on public.scoring_rules to anon, authenticated;
grant select on public.achievements to anon, authenticated;
grant select on public.sponsors to anon, authenticated;
grant select on public.news to anon, authenticated;
grant select on public.banners to anon, authenticated;
grant select on public.gallery to anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.is_admin_or(text[]) to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
