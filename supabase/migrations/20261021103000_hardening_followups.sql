-- ============================================================================
-- MTB Team Platform - Follow-up hardening
-- - Least-privilege grants (removes legacy GRANT ALL leftovers)
-- - Membership obligations become RPC-managed (no direct ledger edits)
-- - Scoring changes recalculate result points
-- - Monthly cash view excludes the opening balance from operating net
-- - Public aggregate stats view
-- Additive and idempotent.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Rebuild grants from zero. RLS still decides which rows are visible.
-- ----------------------------------------------------------------------------
revoke all on all tables in schema public from public;
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

revoke all on all sequences in schema public from public;
revoke all on all sequences in schema public from anon;
revoke all on all sequences in schema public from authenticated;

revoke all on all functions in schema public from public;
revoke all on all functions in schema public from anon;
revoke all on all functions in schema public from authenticated;

grant usage on schema public to anon, authenticated;

-- Anonymous visitors get only public columns.
grant select on public.categories to anon;
grant select
  (id, full_name, slug, nickname, category_id, specialty, number,
   photo_path, photo_url, bio, team_since, joined_at, featured, active,
   created_at, updated_at)
  on public.cyclists to anon;
grant select on public.races to anon;
grant select (id, race_id, cyclist_id, status, created_at) on public.race_registrations to anon;
grant select
  (id, race_id, cyclist_id, category_id, position, time_text, points,
   result_status, time_seconds, created_at, updated_at)
  on public.race_results to anon;
grant select on public.scoring_rules to anon;
grant select on public.achievements to anon;
grant select on public.sponsors to anon;
grant select on public.news to anon;
grant select on public.banners to anon;
grant select on public.gallery to anon;
grant select on public.site_settings to anon;

-- Authenticated users can read every table; RLS limits the rows.
grant select on all tables in schema public to authenticated;

-- Content tables: ADMIN + EDITOR (enforced by RLS).
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

-- Membership master data: ADMIN + TESORERIA (enforced by RLS).
grant insert, update, delete on public.members to authenticated;
grant insert, update, delete on public.race_budgets to authenticated;

-- Profiles/settings: update only, column/trigger protections still apply.
grant update on public.profiles to authenticated;
grant update on public.site_settings to authenticated;

-- Ledger tables stay RPC-only. No direct DML grants for obligations,
-- payment entries, contributions, cash movements, expenses or audit logs.

grant usage, select on all sequences in schema public to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Views: public-safe first, finance views for authenticated only.
-- ----------------------------------------------------------------------------
revoke all on all views in schema public from public;
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

-- ----------------------------------------------------------------------------
-- 3. Functions: re-grant only the intended surface.
-- ----------------------------------------------------------------------------
grant execute on function public.is_admin_or(text[]) to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_finance() to authenticated;
grant execute on function public.is_content_editor() to authenticated;
grant execute on function public.get_ranking(integer, uuid) to anon, authenticated;

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
-- 4. Obligations are edited only through a validated RPC.
-- ----------------------------------------------------------------------------
drop policy if exists "finance_write_obligations" on public.membership_payments;
drop policy if exists "finance_update_obligations" on public.membership_payments;

create or replace function public.update_membership_obligation(
  p_obligation_id uuid,
  p_expected numeric,
  p_due_date date default null,
  p_waived boolean default false,
  p_notes text default null
)
returns public.membership_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obligation public.membership_payments;
  v_paid numeric(12,2);
begin
  perform public.assert_finance_role();

  if p_expected is null or p_expected < 0 then
    raise exception 'El monto esperado no puede ser negativo.';
  end if;

  select * into v_obligation
  from public.membership_payments
  where id = p_obligation_id
  for update;

  if not found then
    raise exception 'Obligación mensual no encontrada.';
  end if;

  if v_obligation.annulled_at is not null then
    raise exception 'La obligación está anulada.';
  end if;

  select coalesce(sum(amount), 0)
  into v_paid
  from public.membership_payment_entries
  where obligation_id = v_obligation.id
    and status = 'CONFIRMADO';

  if p_expected < v_paid then
    raise exception 'El monto esperado (%) no puede ser menor a lo ya pagado (%).',
      p_expected, v_paid;
  end if;

  update public.membership_payments
  set expected = p_expected,
      due_date = coalesce(p_due_date, due_date),
      waived = coalesce(p_waived, false),
      notes = p_notes
  where id = v_obligation.id
  returning * into v_obligation;

  return v_obligation;
end;
$$;

revoke all on function public.update_membership_obligation(uuid, numeric, date, boolean, text) from public;
grant execute on function public.update_membership_obligation(uuid, numeric, date, boolean, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Keep result points in sync when the scoring table changes.
-- ----------------------------------------------------------------------------
create or replace function public.recalc_results_for_scoring()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_position integer;
begin
  if tg_op = 'UPDATE' and old.position is distinct from new.position then
    -- Recalculate both the old and the new position.
    update public.race_results
    set updated_at = now()
    where position in (old.position, new.position);
    return new;
  end if;

  v_position := coalesce(new.position, old.position);
  update public.race_results
  set updated_at = now()
  where position = v_position;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recalc_results_for_scoring on public.scoring_rules;
create trigger trg_recalc_results_for_scoring
  after insert or update or delete on public.scoring_rules
  for each row execute function public.recalc_results_for_scoring();

-- ----------------------------------------------------------------------------
-- 6. Monthly cash view: opening balance must not distort operating net.
-- ----------------------------------------------------------------------------
drop view if exists public.v_finance_monthly;
drop view if exists public.v_cash_monthly;

create view public.v_cash_monthly
with (security_invoker = true) as
select
  to_char(date_trunc('month', date), 'YYYY-MM') as month_key,
  coalesce(sum(amount) filter (
    where type = 'INGRESO' and coalesce(source_type, '') <> 'APERTURA'
  ), 0)::numeric(14,2) as operating_income,
  coalesce(sum(amount) filter (where type = 'EGRESO'), 0)::numeric(14,2) as expenses,
  coalesce(sum(case
    when type = 'INGRESO' and coalesce(source_type, '') <> 'APERTURA' then amount
    when type = 'EGRESO' then -amount
    else 0
  end), 0)::numeric(14,2) as net
from public.cash_movements
where status = 'CONFIRMADO'
group by date_trunc('month', date);

create view public.v_finance_monthly
with (security_invoker = true) as
select
  month_key,
  operating_income as income,
  expenses,
  net
from public.v_cash_monthly;

comment on view public.v_cash_monthly is
  'Ingresos operativos y egresos por mes. El saldo inicial se informa aparte en v_cash_summary.';

grant select on public.v_cash_monthly to authenticated;
grant select on public.v_finance_monthly to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Public cyclist stats exclude cancelled races.
-- ----------------------------------------------------------------------------
create or replace view public.v_public_cyclist_stats as
select
  c.id as cyclist_id,
  count(rr.id)::bigint as total_races,
  coalesce(sum(rr.points), 0)::bigint as total_points,
  count(*) filter (where rr.position = 1)::bigint as wins,
  count(*) filter (where rr.position = 2)::bigint as seconds,
  count(*) filter (where rr.position = 3)::bigint as thirds,
  count(*) filter (where rr.position <= 3)::bigint as podiums,
  min(rr.position)::integer as best_position
from public.cyclists c
left join public.race_results rr
  on rr.cyclist_id = c.id and rr.result_status = 'FINISHED'
left join public.races r on r.id = rr.race_id
where c.active = true
  and (rr.id is null or r.status <> 'CANCELADA')
group by c.id;

grant select on public.v_public_cyclist_stats to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8. Membership summary excludes annulled obligations.
-- ----------------------------------------------------------------------------
create or replace view public.v_membership_summary
with (security_invoker = true) as
select
  year,
  month,
  count(*)::bigint as obligations,
  sum(expected)::numeric(14,2) as expected_total,
  sum(paid)::numeric(14,2) as paid_total,
  sum(balance)::numeric(14,2) as pending_total,
  count(*) filter (where status = 'PAGADO')::bigint as paid_count,
  count(*) filter (where status in ('PENDIENTE', 'PARCIAL', 'VENCIDO'))::bigint as pending_count,
  count(*) filter (where status = 'VENCIDO')::bigint as overdue_count
from public.v_membership_obligations
where annulled_at is null
group by year, month;

grant select on public.v_membership_summary to authenticated;

-- ----------------------------------------------------------------------------
-- 9. Public aggregate stats (single row) for the landing page.
-- ----------------------------------------------------------------------------
create or replace view public.v_public_stats
with (security_invoker = true) as
select
  (select count(*) from public.cyclists c where c.active = true)::bigint as active_cyclists,
  (select count(*) from public.races)::bigint as races,
  (select count(*) from public.race_results rr
     join public.races r on r.id = rr.race_id
    where rr.result_status = 'FINISHED'
      and rr.position = 1
      and r.status <> 'CANCELADA')::bigint as wins,
  (select count(*) from public.race_results rr
     join public.races r on r.id = rr.race_id
    where rr.result_status = 'FINISHED'
      and rr.position <= 3
      and r.status <> 'CANCELADA')::bigint as podiums,
  (select count(*) from public.news n
    where n.status = 'PUBLICADO'
      and (n.published_at is null or n.published_at <= now()))::bigint as news,
  (select count(*) from public.races r
    where r.date >= current_date
      and r.status in ('PLANIFICADA', 'ABIERTA'))::bigint as upcoming_races;

comment on view public.v_public_stats is
  'Agregados públicos del equipo. No expone datos personales ni financieros.';

grant select on public.v_public_stats to anon, authenticated;

-- Financial rows are inserted/updated by SECURITY DEFINER RPCs. Read policies
-- from the previous migration remain in place.

commit;
