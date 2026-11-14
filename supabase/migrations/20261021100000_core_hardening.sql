-- ============================================================================
-- MTB Team Platform - Core schema hardening
-- Additive and idempotent. Does not delete or reset existing data.
-- Apply after the legacy supabase/schema.sql (or on an existing project).
-- ============================================================================

begin;

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Categories
-- ----------------------------------------------------------------------------
alter table public.categories
  add column if not exists sort_order integer not null default 0,
  add column if not exists active boolean not null default true;

comment on column public.categories.sort_order is 'Orden de presentación en el sitio público.';

-- ----------------------------------------------------------------------------
-- 2. Cyclists
-- ----------------------------------------------------------------------------
alter table public.cyclists
  add column if not exists nickname text,
  add column if not exists joined_at date,
  add column if not exists updated_by uuid,
  add column if not exists notes_private text;

comment on column public.cyclists.birth_date is
  'Dato privado. No se expone a anon; la edad se calcula en v_public_cyclists.';
comment on column public.cyclists.notes_private is
  'Notas internas del staff. Nunca se publican.';

-- ----------------------------------------------------------------------------
-- 3. Races and registrations
-- ----------------------------------------------------------------------------
alter table public.races
  add column if not exists registration_deadline date,
  add column if not exists registration_url text,
  add column if not exists season integer,
  add column if not exists updated_by uuid;

update public.races
set season = extract(year from date)::integer
where season is null;

alter table public.race_registrations
  add column if not exists status text not null default 'INSCRITO',
  add column if not exists notes text,
  add column if not exists created_by uuid default auth.uid(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.race_registrations
  drop constraint if exists race_registrations_status_check;
alter table public.race_registrations
  add constraint race_registrations_status_check
  check (status in ('INSCRITO', 'CONFIRMADO', 'CANCELADO'));

-- ----------------------------------------------------------------------------
-- 4. Scoring and results
-- ----------------------------------------------------------------------------
alter table public.scoring_rules
  add column if not exists updated_at timestamptz not null default now();

alter table public.race_results
  add column if not exists result_status text not null default 'FINISHED',
  add column if not exists time_seconds integer,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid default auth.uid(),
  add column if not exists annulled_at timestamptz,
  add column if not exists annul_reason text;

alter table public.race_results alter column position drop not null;

alter table public.race_results
  drop constraint if exists race_results_position_check;
alter table public.race_results
  add constraint race_results_position_check
  check (position is null or position > 0);

alter table public.race_results
  drop constraint if exists race_results_result_status_check;
alter table public.race_results
  add constraint race_results_result_status_check
  check (result_status in ('FINISHED', 'DNF', 'DSQ', 'DNS', 'ANULADO'));

alter table public.race_results
  drop constraint if exists race_results_finished_position_check;
alter table public.race_results
  add constraint race_results_finished_position_check
  check (result_status <> 'FINISHED' or position is not null);

-- Unique active result per race and cyclist. If duplicates already exist, do not
-- delete them: emit a warning and leave the index out so an administrator can
-- review the data first.
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'ux_race_results_race_cyclist_active'
  ) then
    if exists (
      select 1
      from public.race_results
      where result_status <> 'ANULADO'
      group by race_id, cyclist_id
      having count(*) > 1
    ) then
      raise warning 'No se creó ux_race_results_race_cyclist_active: hay resultados duplicados por carrera/corredor. Revísalos manualmente.';
    else
      create unique index ux_race_results_race_cyclist_active
        on public.race_results (race_id, cyclist_id)
        where result_status <> 'ANULADO';
    end if;
  end if;
end $$;

create index if not exists idx_results_status on public.race_results (result_status);
create index if not exists idx_results_race_position
  on public.race_results (race_id, position);

-- ----------------------------------------------------------------------------
-- 5. Achievements
-- ----------------------------------------------------------------------------
alter table public.achievements
  add column if not exists achieved_at date,
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- 6. Members
-- ----------------------------------------------------------------------------
alter table public.members
  add column if not exists fee_exempt boolean not null default false,
  add column if not exists left_at date,
  add column if not exists updated_by uuid;

comment on column public.members.ci is 'Dato privado. Solo visible para roles financieros.';
comment on column public.members.notes is 'Observaciones privadas. Nunca se publican.';

-- ----------------------------------------------------------------------------
-- 7. Membership obligations (existing table membership_payments)
--    It keeps the historical name for compatibility, but semantically stores
--    one monthly obligation per member. Individual payments live in
--    membership_payment_entries.
-- ----------------------------------------------------------------------------
alter table public.membership_payments
  add column if not exists due_date date,
  add column if not exists waived boolean not null default false,
  add column if not exists annulled_at timestamptz,
  add column if not exists annul_reason text,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid default auth.uid();

update public.membership_payments
set due_date = (make_date(year, month, 1) + interval '1 month - 1 day')::date
where due_date is null;

alter table public.membership_payments
  drop constraint if exists membership_payments_status_check;
alter table public.membership_payments
  add constraint membership_payments_status_check
  check (status in ('PAGADO', 'PENDIENTE', 'PARCIAL', 'VENCIDO', 'ANULADA', 'EXENTA'));

create index if not exists idx_pay_due_date on public.membership_payments (due_date);
create index if not exists idx_pay_member_period
  on public.membership_payments (member_id, year desc, month desc);

create table if not exists public.membership_payment_entries (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references public.membership_payments (id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  paid_at date not null default current_date,
  method text,
  reference text,
  notes text,
  status text not null default 'CONFIRMADO'
    check (status in ('CONFIRMADO', 'ANULADO')),
  annulled_at timestamptz,
  annul_reason text,
  idempotency_key text unique,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

comment on table public.membership_payment_entries is
  'Pagos individuales (totales o parciales) de una obligación mensual.';

create index if not exists idx_mpe_obligation
  on public.membership_payment_entries (obligation_id);
create index if not exists idx_mpe_paid_at
  on public.membership_payment_entries (paid_at desc);

-- Preserve historical paid amounts by converting them into payment entries.
insert into public.membership_payment_entries
  (obligation_id, amount, paid_at, method, reference, status, idempotency_key)
select
  o.id,
  o.paid,
  coalesce(o.paid_at::date, make_date(o.year, o.month, 1)),
  o.method,
  'MIGRACION',
  'CONFIRMADO',
  'legacy-' || o.id::text
from public.membership_payments o
where o.paid > 0
  and not exists (
    select 1 from public.membership_payment_entries e where e.obligation_id = o.id
  )
on conflict (idempotency_key) do nothing;

-- ----------------------------------------------------------------------------
-- 8. Contributions / other income
-- ----------------------------------------------------------------------------
alter table public.contributions
  add column if not exists income_type text not null default 'APORTE_EXTRA',
  add column if not exists status text not null default 'CONFIRMADO',
  add column if not exists entity_name text,
  add column if not exists reference text,
  add column if not exists notes text,
  add column if not exists idempotency_key text unique,
  add column if not exists created_by uuid default auth.uid(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists annulled_at timestamptz,
  add column if not exists annul_reason text;

alter table public.contributions
  drop constraint if exists contributions_income_type_check;
alter table public.contributions
  add constraint contributions_income_type_check
  check (income_type in ('APORTE_EXTRA', 'AUSPICIO', 'DONACION', 'OTRO'));

alter table public.contributions
  drop constraint if exists contributions_status_check;
alter table public.contributions
  add constraint contributions_status_check
  check (status in ('CONFIRMADO', 'ANULADO'));

create index if not exists idx_contrib_status on public.contributions (status);

-- ----------------------------------------------------------------------------
-- 9. Expenses / cash movements
-- ----------------------------------------------------------------------------
alter table public.expenses
  add column if not exists status text not null default 'CONFIRMADO',
  add column if not exists idempotency_key text unique,
  add column if not exists created_by uuid default auth.uid(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists annulled_at timestamptz,
  add column if not exists annul_reason text;

alter table public.expenses
  drop constraint if exists expenses_status_check;
alter table public.expenses
  add constraint expenses_status_check
  check (status in ('CONFIRMADO', 'ANULADO'));

alter table public.cash_movements
  add column if not exists status text not null default 'CONFIRMADO',
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists member_id uuid references public.members (id) on delete set null,
  add column if not exists idempotency_key text unique,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists annulled_at timestamptz,
  add column if not exists annul_reason text;

alter table public.cash_movements
  drop constraint if exists cash_movements_status_check;
alter table public.cash_movements
  add constraint cash_movements_status_check
  check (status in ('CONFIRMADO', 'ANULADO'));

alter table public.cash_movements
  drop constraint if exists cash_movements_source_type_check;
alter table public.cash_movements
  add constraint cash_movements_source_type_check
  check (
    source_type is null
    or source_type in ('APERTURA', 'MEMBRESIA', 'CONTRIBUCION', 'GASTO', 'AJUSTE')
  );

create index if not exists idx_cash_status on public.cash_movements (status);
create index if not exists idx_cash_source on public.cash_movements (source_type, source_id);
create index if not exists idx_cash_member on public.cash_movements (member_id);

-- One confirmed cash movement per source record.
create unique index if not exists ux_cash_source_confirmed
  on public.cash_movements (source_type, source_id)
  where source_type is not null and source_id is not null and status = 'CONFIRMADO';

-- ----------------------------------------------------------------------------
-- 10. Race budgets
-- ----------------------------------------------------------------------------
alter table public.race_budgets
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- 11. Sponsors
-- ----------------------------------------------------------------------------
alter table public.sponsors
  add column if not exists sort_order integer not null default 0,
  add column if not exists ends_at date,
  add column if not exists featured boolean not null default false;

update public.sponsors set sort_order = 0 where sort_order is null;

-- ----------------------------------------------------------------------------
-- 12. News / banners / gallery
-- ----------------------------------------------------------------------------
alter table public.news
  add column if not exists excerpt text,
  add column if not exists updated_by uuid,
  add column if not exists featured boolean not null default false;

alter table public.news drop constraint if exists news_status_check;
alter table public.news
  add constraint news_status_check
  check (status in ('BORRADOR', 'PUBLICADO', 'OCULTO'));

create index if not exists idx_news_published
  on public.news (published_at desc)
  where status = 'PUBLICADO';

alter table public.banners
  add column if not exists updated_by uuid;

alter table public.gallery
  add column if not exists storage_bucket text not null default 'gallery',
  add column if not exists alt_text text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists created_by uuid default auth.uid(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_gallery_published
  on public.gallery (created_at desc)
  where published = true;

-- ----------------------------------------------------------------------------
-- 13. Site settings
-- ----------------------------------------------------------------------------
alter table public.site_settings
  add column if not exists logo_url text,
  add column if not exists short_name text,
  add column if not exists mission text,
  add column if not exists objectives text,
  add column if not exists activities text,
  add column if not exists achievements text,
  add column if not exists address text,
  add column if not exists contact_email text,
  add column if not exists hero_image_path text,
  add column if not exists hero_image_url text,
  add column if not exists whatsapp_message text,
  add column if not exists sponsor_info text,
  add column if not exists sponsor_email text,
  add column if not exists join_info text,
  add column if not exists accent_color text,
  add column if not exists updated_by uuid;

insert into public.site_settings (id, team_name, primary_color, secondary_color)
values (1, 'Trinx Bolivia - Bycle Sharks', '#0f766e', '#0f172a')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 14. Audit log
-- ----------------------------------------------------------------------------
alter table public.audit_logs drop constraint if exists audit_logs_action_check;
alter table public.audit_logs
  add constraint audit_logs_action_check
  check (action in (
    'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
    'REVERSAL', 'ROLE_CHANGE', 'PAYMENT', 'OPENING_BALANCE',
    'GENERATE', 'ANNUL'
  ));

create index if not exists idx_audit_module on public.audit_logs (module);
create index if not exists idx_audit_record on public.audit_logs (record_id);

-- ----------------------------------------------------------------------------
-- 15. Role helpers
-- ----------------------------------------------------------------------------
create or replace function public.is_admin_or(required_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = any (required_roles)
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_admin_or(array['ADMIN', 'DIRECTIVA', 'TESORERIA', 'EDITOR']);
$$;

create or replace function public.is_finance()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_admin_or(array['ADMIN', 'TESORERIA']);
$$;

create or replace function public.is_content_editor()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_admin_or(array['ADMIN', 'EDITOR']);
$$;

-- ----------------------------------------------------------------------------
-- 16. Profile protection and first-admin bootstrap
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, display_name)
  values (
    new.id,
    new.email,
    'CONSULTA',
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Direct SQL/service-role access (SQL editor) is allowed to bootstrap.
  if auth.uid() is null then
    return new;
  end if;

  if new.id <> old.id then
    raise exception 'No se puede cambiar el identificador de un perfil.';
  end if;

  if new.role is distinct from old.role
     and not public.is_admin_or(array['ADMIN']) then
    raise exception 'Solo un administrador puede cambiar roles.';
  end if;

  if old.role = 'ADMIN'
     and new.role <> 'ADMIN'
     and (select count(*) from public.profiles where role = 'ADMIN') <= 1 then
    raise exception 'No se puede quitar el rol al último administrador.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

create or replace function public.bootstrap_admin(p_email text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if exists (select 1 from public.profiles where role = 'ADMIN') then
    raise exception 'Ya existe un administrador. Usa admin_set_role con una sesión ADMIN.';
  end if;

  update public.profiles
  set role = 'ADMIN'
  where lower(email) = lower(p_email)
  returning * into v_profile;

  if not found then
    raise exception 'No existe un perfil con el correo %. Crea primero el usuario en Supabase Auth.', p_email;
  end if;

  return v_profile;
end;
$$;

revoke all on function public.bootstrap_admin(text) from public;
grant execute on function public.bootstrap_admin(text) to service_role;

create or replace function public.admin_set_role(p_user_id uuid, p_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin_or(array['ADMIN']) then
    raise exception 'Solo un administrador puede cambiar roles.';
  end if;

  if p_role not in ('ADMIN', 'DIRECTIVA', 'TESORERIA', 'EDITOR', 'CONSULTA') then
    raise exception 'Rol inválido: %', p_role;
  end if;

  update public.profiles
  set role = p_role
  where id = p_user_id
  returning * into v_profile;

  if not found then
    raise exception 'Perfil no encontrado.';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.admin_set_role(uuid, text) from public;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 17. Result points trigger (server-side, source of truth)
-- ----------------------------------------------------------------------------
create or replace function public.set_result_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.result_status = 'FINISHED' and new.position is not null then
    select coalesce(sr.points, 0)
    into new.points
    from public.scoring_rules sr
    where sr.position = new.position;

    new.points := coalesce(new.points, 0);
  else
    new.points := 0;
  end if;

  if new.category_id is null then
    select c.category_id into new.category_id
    from public.cyclists c
    where c.id = new.cyclist_id;
  end if;

  if new.result_status = 'ANULADO' then
    new.annulled_at := coalesce(new.annulled_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_result_points on public.race_results;
create trigger trg_set_result_points
  before insert or update on public.race_results
  for each row execute function public.set_result_points();

-- ----------------------------------------------------------------------------
-- 18. Membership obligation recalculation
-- ----------------------------------------------------------------------------
create or replace function public.set_obligation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paid numeric(12,2);
begin
  if new.due_date is null then
    new.due_date := (make_date(new.year, new.month, 1) + interval '1 month - 1 day')::date;
  end if;

  select coalesce(sum(e.amount), 0)
  into v_paid
  from public.membership_payment_entries e
  where e.obligation_id = new.id
    and e.status = 'CONFIRMADO';

  new.paid := v_paid;

  new.status := case
    when new.annulled_at is not null then 'ANULADA'
    when new.waived then 'EXENTA'
    when new.expected <= 0 then 'EXENTA'
    when v_paid >= new.expected then 'PAGADO'
    when v_paid > 0 and new.due_date < current_date then 'VENCIDO'
    when v_paid > 0 then 'PARCIAL'
    when new.due_date < current_date then 'VENCIDO'
    else 'PENDIENTE'
  end;

  return new;
end;
$$;

drop trigger if exists trg_set_obligation_fields on public.membership_payments;
create trigger trg_set_obligation_fields
  before insert or update on public.membership_payments
  for each row execute function public.set_obligation_fields();

create or replace function public.sync_obligation_after_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.membership_payments
  set updated_at = now()
  where id = coalesce(new.obligation_id, old.obligation_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_obligation_after_entry on public.membership_payment_entries;
create trigger trg_sync_obligation_after_entry
  after insert or update or delete on public.membership_payment_entries
  for each row execute function public.sync_obligation_after_entry();

-- Recalculate legacy rows now that entries exist.
update public.membership_payments set updated_at = now();

-- ----------------------------------------------------------------------------
-- 19. Audit trigger
-- ----------------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_old jsonb;
  v_new jsonb;
  v_id text;
begin
  v_action := case tg_op
    when 'INSERT' then 'CREATE'
    when 'UPDATE' then 'UPDATE'
    else 'DELETE'
  end;

  if tg_op in ('UPDATE', 'DELETE') then
    v_old := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_new := to_jsonb(new);
  end if;

  -- Do not duplicate identity documents or personal phone numbers in audit.
  if tg_table_name = 'members' then
    v_old := v_old - 'ci' - 'phone';
    v_new := v_new - 'ci' - 'phone';
  end if;

  v_id := coalesce(
    (case when tg_op = 'DELETE' then v_old else v_new end) ->> 'id',
    (case when tg_op = 'DELETE' then v_old else v_new end) ->> 'obligation_id'
  );

  insert into public.audit_logs (user_id, action, module, record_id, old_data, new_data)
  values (auth.uid(), v_action, tg_table_name, v_id, v_old, v_new);

  return coalesce(new, old);
end;
$$;

-- Attach audit triggers to relevant tables.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'cyclists', 'categories', 'races', 'race_results', 'achievements',
    'members', 'membership_payments', 'membership_payment_entries',
    'contributions', 'cash_movements', 'expenses', 'race_budgets',
    'sponsors', 'news', 'banners', 'gallery', 'site_settings'
  ]
  loop
    execute format('drop trigger if exists trg_audit_%I on public.%I', t, t);
    execute format(
      'create trigger trg_audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row_change()',
      t, t
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 20. Updated-at triggers for new columns
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'race_registrations', 'scoring_rules', 'race_results', 'achievements',
    'membership_payments', 'contributions', 'cash_movements', 'expenses',
    'race_budgets', 'gallery'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated on public.%I', t, t);
    execute format(
      'create trigger trg_%I_updated before update on public.%I for each row execute function public.handle_updated_at()',
      t, t
    );
  end loop;
end $$;

commit;
