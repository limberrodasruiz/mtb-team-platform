-- ============================================================================
-- MTB Team Platform - Transactional finance RPCs and derived views
-- All financial mutations go through SECURITY DEFINER functions so that the
-- expense/income and its cash movement are committed atomically.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Guard helper
-- ----------------------------------------------------------------------------
create or replace function public.assert_finance_role()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_finance() then
    raise exception 'Tu rol no tiene permisos financieros.' using errcode = '42501';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Membership payment: obligation + payment entry + cash income
-- ----------------------------------------------------------------------------
create or replace function public.register_membership_payment(
  p_obligation_id uuid,
  p_amount numeric,
  p_paid_at date default current_date,
  p_method text default null,
  p_reference text default null,
  p_notes text default null,
  p_idempotency_key text default null
)
returns public.membership_payment_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obligation public.membership_payments;
  v_entry public.membership_payment_entries;
  v_paid numeric(12,2);
  v_key text;
begin
  perform public.assert_finance_role();

  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto del pago debe ser mayor a cero.';
  end if;

  v_key := coalesce(p_idempotency_key, 'mem-' || gen_random_uuid()::text);

  select * into v_entry
  from public.membership_payment_entries
  where idempotency_key = v_key;

  if found then
    return v_entry;
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

  if v_obligation.waived then
    raise exception 'La obligación está exenta de pago.';
  end if;

  select coalesce(sum(amount), 0)
  into v_paid
  from public.membership_payment_entries
  where obligation_id = v_obligation.id
    and status = 'CONFIRMADO';

  if p_amount > (v_obligation.expected - v_paid) then
    raise exception 'El pago (%) supera el saldo pendiente (%).',
      p_amount, (v_obligation.expected - v_paid);
  end if;

  insert into public.membership_payment_entries
    (obligation_id, amount, paid_at, method, reference, notes, idempotency_key, created_by)
  values
    (v_obligation.id, p_amount, coalesce(p_paid_at, current_date), p_method,
     p_reference, p_notes, v_key, auth.uid())
  returning * into v_entry;

  insert into public.cash_movements
    (date, type, category, concept, amount, method, reference, member_id,
     source_type, source_id, status, idempotency_key, created_by)
  values
    (coalesce(p_paid_at, current_date), 'INGRESO', 'Membresías',
     'Membresía ' || lpad(v_obligation.month::text, 2, '0') || '/' || v_obligation.year,
     p_amount, p_method, p_reference, v_obligation.member_id,
     'MEMBRESIA', v_entry.id, 'CONFIRMADO', 'cash-' || v_entry.id, auth.uid());

  return v_entry;
end;
$$;

revoke all on function public.register_membership_payment(uuid, numeric, date, text, text, text, text) from public;
grant execute on function public.register_membership_payment(uuid, numeric, date, text, text, text, text) to authenticated;

create or replace function public.reverse_membership_payment(
  p_entry_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.membership_payment_entries;
begin
  perform public.assert_finance_role();

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Debes indicar el motivo del reverso.';
  end if;

  select * into v_entry
  from public.membership_payment_entries
  where id = p_entry_id
  for update;

  if not found then
    raise exception 'Pago no encontrado.';
  end if;

  if v_entry.status = 'ANULADO' then
    return;
  end if;

  update public.membership_payment_entries
  set status = 'ANULADO', annulled_at = now(), annul_reason = p_reason
  where id = v_entry.id;

  update public.cash_movements
  set status = 'ANULADO', annulled_at = now(), annul_reason = p_reason
  where source_type = 'MEMBRESIA' and source_id = v_entry.id and status = 'CONFIRMADO';
end;
$$;

revoke all on function public.reverse_membership_payment(uuid, text) from public;
grant execute on function public.reverse_membership_payment(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Other income: contribution + cash income
-- ----------------------------------------------------------------------------
create or replace function public.register_income(
  p_income_type text,
  p_date date,
  p_amount numeric,
  p_concept text,
  p_member_id uuid default null,
  p_entity_name text default null,
  p_method text default null,
  p_reference text default null,
  p_idempotency_key text default null
)
returns public.contributions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contribution public.contributions;
  v_key text;
  v_category text;
begin
  perform public.assert_finance_role();

  if p_income_type not in ('APORTE_EXTRA', 'AUSPICIO', 'DONACION', 'OTRO') then
    raise exception 'Tipo de ingreso inválido.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero.';
  end if;

  if p_concept is null or btrim(p_concept) = '' then
    raise exception 'El concepto es obligatorio.';
  end if;

  v_key := coalesce(p_idempotency_key, 'inc-' || gen_random_uuid()::text);

  select * into v_contribution
  from public.contributions
  where idempotency_key = v_key;

  if found then
    return v_contribution;
  end if;

  v_category := case p_income_type
    when 'APORTE_EXTRA' then 'Aportes'
    when 'AUSPICIO' then 'Auspicios'
    when 'DONACION' then 'Donaciones'
    else 'Otros ingresos'
  end;

  insert into public.contributions
    (date, amount, concept, method, member_id, entity_name, income_type,
     reference, status, idempotency_key, created_by)
  values
    (coalesce(p_date, current_date), p_amount, p_concept, p_method, p_member_id,
     p_entity_name, p_income_type, p_reference, 'CONFIRMADO', v_key, auth.uid())
  returning * into v_contribution;

  insert into public.cash_movements
    (date, type, category, concept, amount, method, reference, member_id,
     source_type, source_id, status, idempotency_key, created_by)
  values
    (coalesce(p_date, current_date), 'INGRESO', v_category, p_concept, p_amount,
     p_method, p_reference, p_member_id, 'CONTRIBUCION', v_contribution.id,
     'CONFIRMADO', 'cash-' || v_contribution.id, auth.uid());

  return v_contribution;
end;
$$;

revoke all on function public.register_income(text, date, numeric, text, uuid, text, text, text, text) from public;
grant execute on function public.register_income(text, date, numeric, text, uuid, text, text, text, text) to authenticated;

create or replace function public.reverse_income(
  p_contribution_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contribution public.contributions;
begin
  perform public.assert_finance_role();

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Debes indicar el motivo del reverso.';
  end if;

  select * into v_contribution
  from public.contributions
  where id = p_contribution_id
  for update;

  if not found then
    raise exception 'Ingreso no encontrado.';
  end if;

  if v_contribution.status = 'ANULADO' then
    return;
  end if;

  update public.contributions
  set status = 'ANULADO', annulled_at = now(), annul_reason = p_reason
  where id = v_contribution.id;

  update public.cash_movements
  set status = 'ANULADO', annulled_at = now(), annul_reason = p_reason
  where source_type = 'CONTRIBUCION' and source_id = v_contribution.id and status = 'CONFIRMADO';
end;
$$;

revoke all on function public.reverse_income(uuid, text) from public;
grant execute on function public.reverse_income(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Expenses: expense + cash outcome
-- ----------------------------------------------------------------------------
create or replace function public.register_expense(
  p_date date,
  p_concept text,
  p_category text,
  p_amount numeric,
  p_method text default null,
  p_race_id uuid default null,
  p_beneficiary text default null,
  p_receipt_path text default null,
  p_notes text default null,
  p_idempotency_key text default null
)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense public.expenses;
  v_key text;
begin
  perform public.assert_finance_role();

  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto del gasto debe ser mayor a cero.';
  end if;

  if p_concept is null or btrim(p_concept) = '' then
    raise exception 'El concepto es obligatorio.';
  end if;

  if p_category is null or btrim(p_category) = '' then
    raise exception 'La categoría es obligatoria.';
  end if;

  v_key := coalesce(p_idempotency_key, 'exp-' || gen_random_uuid()::text);

  select * into v_expense from public.expenses where idempotency_key = v_key;
  if found then
    return v_expense;
  end if;

  insert into public.expenses
    (date, concept, category, amount, race_id, beneficiary, method, receipt_path,
     notes, status, idempotency_key, created_by)
  values
    (coalesce(p_date, current_date), p_concept, p_category, p_amount, p_race_id,
     p_beneficiary, p_method, p_receipt_path, p_notes, 'CONFIRMADO', v_key, auth.uid())
  returning * into v_expense;

  insert into public.cash_movements
    (date, type, category, concept, amount, method, race_id,
     source_type, source_id, status, idempotency_key, created_by)
  values
    (coalesce(p_date, current_date), 'EGRESO', p_category, p_concept, p_amount,
     p_method, p_race_id, 'GASTO', v_expense.id, 'CONFIRMADO',
     'cash-' || v_expense.id, auth.uid());

  return v_expense;
end;
$$;

revoke all on function public.register_expense(date, text, text, numeric, text, uuid, text, text, text, text) from public;
grant execute on function public.register_expense(date, text, text, numeric, text, uuid, text, text, text, text) to authenticated;

create or replace function public.reverse_expense(
  p_expense_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense public.expenses;
begin
  perform public.assert_finance_role();

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Debes indicar el motivo del reverso.';
  end if;

  select * into v_expense from public.expenses where id = p_expense_id for update;
  if not found then
    raise exception 'Gasto no encontrado.';
  end if;

  if v_expense.status = 'ANULADO' then
    return;
  end if;

  update public.expenses
  set status = 'ANULADO', annulled_at = now(), annul_reason = p_reason
  where id = v_expense.id;

  update public.cash_movements
  set status = 'ANULADO', annulled_at = now(), annul_reason = p_reason
  where source_type = 'GASTO' and source_id = v_expense.id and status = 'CONFIRMADO';
end;
$$;

revoke all on function public.reverse_expense(uuid, text) from public;
grant execute on function public.reverse_expense(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Opening balance (documented, one active opening movement)
-- ----------------------------------------------------------------------------
create or replace function public.set_opening_balance(
  p_amount numeric,
  p_date date,
  p_concept text
)
returns public.cash_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movement public.cash_movements;
begin
  if not public.is_admin_or(array['ADMIN']) then
    raise exception 'Solo un administrador puede registrar el saldo inicial.' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'El saldo inicial debe ser mayor a cero.';
  end if;

  if exists (
    select 1 from public.cash_movements
    where source_type = 'APERTURA' and status = 'CONFIRMADO'
  ) then
    raise exception 'Ya existe un saldo inicial confirmado. Reviértelo antes de registrar otro.';
  end if;

  insert into public.cash_movements
    (date, type, category, concept, amount, source_type, status, created_by)
  values
    (coalesce(p_date, current_date), 'INGRESO', 'Saldo inicial',
     coalesce(nullif(btrim(p_concept), ''), 'Saldo inicial de caja'),
     p_amount, 'APERTURA', 'CONFIRMADO', auth.uid())
  returning * into v_movement;

  return v_movement;
end;
$$;

revoke all on function public.set_opening_balance(numeric, date, text) from public;
grant execute on function public.set_opening_balance(numeric, date, text) to authenticated;

create or replace function public.reverse_opening_balance(p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_or(array['ADMIN']) then
    raise exception 'Solo un administrador puede revertir el saldo inicial.' using errcode = '42501';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Debes indicar el motivo del reverso.';
  end if;

  update public.cash_movements
  set status = 'ANULADO', annulled_at = now(), annul_reason = p_reason
  where source_type = 'APERTURA' and status = 'CONFIRMADO';
end;
$$;

revoke all on function public.reverse_opening_balance(text) from public;
grant execute on function public.reverse_opening_balance(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. Monthly obligations
-- ----------------------------------------------------------------------------
create or replace function public.generate_membership_obligations(
  p_year integer,
  p_month integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_due date;
begin
  perform public.assert_finance_role();

  if p_month not between 1 and 12 then
    raise exception 'Mes inválido.';
  end if;
  if p_year not between 2000 and 2100 then
    raise exception 'Año inválido.';
  end if;

  v_due := (make_date(p_year, p_month, 1) + interval '1 month - 1 day')::date;

  insert into public.membership_payments
    (member_id, month, year, expected, due_date, status, created_by)
  select m.id, p_month, p_year, m.monthly_amount, v_due, 'PENDIENTE', auth.uid()
  from public.members m
  where m.status = 'ACTIVO'
    and m.fee_exempt = false
    and m.monthly_amount > 0
    and m.joined_at <= v_due
    and (m.left_at is null or m.left_at >= make_date(p_year, p_month, 1))
  on conflict (member_id, month, year) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.generate_membership_obligations(integer, integer) from public;
grant execute on function public.generate_membership_obligations(integer, integer) to authenticated;

create or replace function public.annul_membership_obligation(
  p_obligation_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paid numeric(12,2);
begin
  perform public.assert_finance_role();

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Debes indicar el motivo de la anulación.';
  end if;

  select coalesce(sum(amount), 0)
  into v_paid
  from public.membership_payment_entries
  where obligation_id = p_obligation_id
    and status = 'CONFIRMADO';

  if v_paid > 0 then
    raise exception 'La obligación tiene pagos confirmados. Revierte los pagos antes de anularla.';
  end if;

  update public.membership_payments
  set annulled_at = now(), annul_reason = p_reason
  where id = p_obligation_id;

  if not found then
    raise exception 'Obligación no encontrada.';
  end if;
end;
$$;

revoke all on function public.annul_membership_obligation(uuid, text) from public;
grant execute on function public.annul_membership_obligation(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Public ranking (always derived from results, never stored)
-- ----------------------------------------------------------------------------
create or replace function public.get_ranking(
  p_year integer default null,
  p_category_id uuid default null
)
returns table (
  cyclist_id uuid,
  full_name text,
  slug text,
  photo_url text,
  category_name text,
  total_points bigint,
  races_count bigint,
  wins bigint,
  seconds bigint,
  thirds bigint,
  podiums bigint,
  best_position integer,
  position_rank bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with filtered as (
    select rr.cyclist_id, rr.points, rr.position
    from public.race_results rr
    join public.races r on r.id = rr.race_id
    join public.cyclists c on c.id = rr.cyclist_id
    where rr.result_status = 'FINISHED'
      and rr.position is not null
      and c.active = true
      and r.status <> 'CANCELADA'
      and (p_year is null or extract(year from r.date)::integer = p_year)
      and (p_category_id is null or rr.category_id = p_category_id)
  ),
  aggregated as (
    select
      c.id as cyclist_id,
      c.full_name,
      c.slug,
      c.photo_url,
      cat.name as category_name,
      coalesce(sum(f.points), 0)::bigint as total_points,
      count(*)::bigint as races_count,
      count(*) filter (where f.position = 1)::bigint as wins,
      count(*) filter (where f.position = 2)::bigint as seconds,
      count(*) filter (where f.position = 3)::bigint as thirds,
      count(*) filter (where f.position <= 3)::bigint as podiums,
      min(f.position)::integer as best_position
    from filtered f
    join public.cyclists c on c.id = f.cyclist_id
    left join public.categories cat on cat.id = c.category_id
    group by c.id, c.full_name, c.slug, c.photo_url, cat.name
  )
  select
    a.cyclist_id,
    a.full_name,
    a.slug,
    a.photo_url,
    a.category_name,
    a.total_points,
    a.races_count,
    a.wins,
    a.seconds,
    a.thirds,
    a.podiums,
    a.best_position,
    dense_rank() over (order by a.total_points desc)::bigint as position_rank
  from aggregated a
  order by a.total_points desc, a.wins desc, a.podiums desc,
           a.best_position asc nulls last, a.full_name asc;
$$;

revoke all on function public.get_ranking(integer, uuid) from public;
grant execute on function public.get_ranking(integer, uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8. Public views (safe columns only)
-- ----------------------------------------------------------------------------
create or replace view public.v_public_cyclists as
select
  c.id,
  c.full_name,
  c.slug,
  c.nickname,
  c.category_id,
  cat.name as category_name,
  cat.slug as category_slug,
  c.specialty,
  c.number,
  c.photo_path,
  c.photo_url,
  c.bio,
  c.team_since,
  c.joined_at,
  c.featured,
  c.active,
  case
    when c.birth_date is null then null
    else date_part('year', age(c.birth_date))::integer
  end as age,
  c.created_at,
  c.updated_at
from public.cyclists c
left join public.categories cat on cat.id = c.category_id
where c.active = true;

comment on view public.v_public_cyclists is
  'Datos públicos de corredores activos. Excluye birth_date y notas internas.';

grant select on public.v_public_cyclists to anon, authenticated;

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
where c.active = true
group by c.id;

grant select on public.v_public_cyclist_stats to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 9. Finance views (security_invoker => base-table RLS applies)
-- ----------------------------------------------------------------------------
create or replace view public.v_membership_obligations
with (security_invoker = true) as
select
  o.id,
  o.member_id,
  m.full_name,
  m.member_type,
  m.status as member_status,
  o.month,
  o.year,
  o.expected,
  o.paid,
  greatest(o.expected - o.paid, 0)::numeric(12,2) as balance,
  o.due_date,
  o.waived,
  o.annulled_at,
  o.annul_reason,
  o.notes,
  case
    when o.annulled_at is not null then 'ANULADA'
    when o.waived then 'EXENTA'
    when o.expected <= 0 then 'EXENTA'
    when o.paid >= o.expected then 'PAGADO'
    when o.paid > 0 and o.due_date < current_date then 'VENCIDO'
    when o.paid > 0 then 'PARCIAL'
    when o.due_date < current_date then 'VENCIDO'
    else 'PENDIENTE'
  end as status,
  o.created_at,
  o.updated_at
from public.membership_payments o
join public.members m on m.id = o.member_id;

grant select on public.v_membership_obligations to authenticated;

create or replace view public.v_cash_summary
with (security_invoker = true) as
select
  coalesce(sum(amount) filter (where type = 'INGRESO'), 0)::numeric(14,2) as total_income,
  coalesce(sum(amount) filter (where type = 'EGRESO'), 0)::numeric(14,2) as total_expenses,
  coalesce(sum(case when type = 'INGRESO' then amount else -amount end), 0)::numeric(14,2) as balance,
  coalesce(sum(amount) filter (where type = 'INGRESO' and source_type = 'APERTURA'), 0)::numeric(14,2) as opening_balance,
  count(*)::bigint as movements_count
from public.cash_movements
where status = 'CONFIRMADO';

comment on view public.v_cash_summary is
  'Saldo = saldo inicial + ingresos confirmados - egresos confirmados.';

grant select on public.v_cash_summary to authenticated;

create or replace view public.v_cash_monthly
with (security_invoker = true) as
select
  to_char(date_trunc('month', date), 'YYYY-MM') as month_key,
  coalesce(sum(amount) filter (
    where type = 'INGRESO' and coalesce(source_type, '') <> 'APERTURA'
  ), 0)::numeric(14,2) as operating_income,
  coalesce(sum(amount) filter (where type = 'EGRESO'), 0)::numeric(14,2) as expenses,
  coalesce(sum(case when type = 'INGRESO' then amount else -amount end), 0)::numeric(14,2) as net
from public.cash_movements
where status = 'CONFIRMADO'
group by date_trunc('month', date);

grant select on public.v_cash_monthly to authenticated;

create or replace view public.v_cash_ledger
with (security_invoker = true) as
select
  cm.id,
  cm.date,
  cm.type,
  cm.category,
  cm.concept,
  cm.amount,
  cm.method,
  cm.reference,
  cm.status,
  cm.source_type,
  cm.source_id,
  cm.race_id,
  r.name as race_name,
  cm.member_id,
  m.full_name as member_name,
  cm.created_by,
  p.display_name as created_by_name,
  cm.created_at,
  cm.annulled_at,
  cm.annul_reason
from public.cash_movements cm
left join public.races r on r.id = cm.race_id
left join public.members m on m.id = cm.member_id
left join public.profiles p on p.id = cm.created_by;

grant select on public.v_cash_ledger to authenticated;

create or replace view public.v_expenses_detail
with (security_invoker = true) as
select
  e.id,
  e.date,
  e.concept,
  e.category,
  e.amount,
  e.race_id,
  r.name as race_name,
  e.beneficiary,
  e.method,
  e.receipt_path,
  e.notes,
  e.status,
  e.created_by,
  p.display_name as created_by_name,
  e.created_at,
  e.annulled_at,
  e.annul_reason
from public.expenses e
left join public.races r on r.id = e.race_id
left join public.profiles p on p.id = e.created_by;

grant select on public.v_expenses_detail to authenticated;

create or replace view public.v_expenses_by_category
with (security_invoker = true) as
select
  coalesce(category, 'Sin categoría') as category,
  count(*)::bigint as count,
  sum(amount)::numeric(14,2) as total
from public.expenses
where status = 'CONFIRMADO'
group by coalesce(category, 'Sin categoría');

grant select on public.v_expenses_by_category to authenticated;

create or replace view public.v_race_financials
with (security_invoker = true) as
select
  r.id as race_id,
  r.name,
  r.date,
  r.status,
  coalesce(exp.total, 0)::numeric(14,2) as expenses_total,
  coalesce(inc.total, 0)::numeric(14,2) as income_total,
  coalesce(bud.total, 0)::numeric(14,2) as budget_total,
  (coalesce(bud.total, 0) - coalesce(exp.total, 0))::numeric(14,2) as budget_difference
from public.races r
left join (
  select race_id, sum(amount) as total
  from public.expenses
  where status = 'CONFIRMADO' and race_id is not null
  group by race_id
) exp on exp.race_id = r.id
left join (
  select race_id, sum(amount) as total
  from public.cash_movements
  where status = 'CONFIRMADO' and type = 'INGRESO' and race_id is not null
  group by race_id
) inc on inc.race_id = r.id
left join (
  select race_id, sum(budgeted) as total
  from public.race_budgets
  group by race_id
) bud on bud.race_id = r.id;

grant select on public.v_race_financials to authenticated;

create or replace view public.v_race_expense_categories
with (security_invoker = true) as
select
  race_id,
  coalesce(category, 'Sin categoría') as category,
  count(*)::bigint as count,
  sum(amount)::numeric(14,2) as total
from public.expenses
where status = 'CONFIRMADO' and race_id is not null
group by race_id, coalesce(category, 'Sin categoría');

grant select on public.v_race_expense_categories to authenticated;

create or replace view public.v_member_debt
with (security_invoker = true) as
select
  o.member_id,
  o.full_name,
  o.member_type,
  o.member_status,
  count(*)::bigint as pending_periods,
  sum(o.balance)::numeric(14,2) as pending_amount,
  sum(o.balance) filter (where o.status = 'VENCIDO')::numeric(14,2) as overdue_amount
from public.v_membership_obligations o
where o.status in ('PENDIENTE', 'PARCIAL', 'VENCIDO')
group by o.member_id, o.full_name, o.member_type, o.member_status;

grant select on public.v_member_debt to authenticated;

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
group by year, month;

grant select on public.v_membership_summary to authenticated;

create or replace view public.v_finance_monthly
with (security_invoker = true) as
select
  month_key,
  operating_income as income,
  expenses,
  net
from public.v_cash_monthly;

grant select on public.v_finance_monthly to authenticated;

commit;
