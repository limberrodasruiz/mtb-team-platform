import { errorMessage } from '../lib/errors';
import { requireConfiguration, supabase } from '../lib/supabase';
import type {
  CashLedgerRow,
  CashMonthly,
  CashMovement,
  CashSummary,
  ContributionRow,
  ExpenseCategorySummary,
  ExpenseDetail,
  IncomeType,
  RaceBudget,
  RaceExpenseCategory,
  RaceFinancial,
} from '../types';
import { todayISO } from '../utils/format';
import { nonNegativeNumber, positiveNumber, required } from '../utils/validation';
import {
  mapBudget,
  mapCashLedger,
  mapCashMonthly,
  mapCashSummary,
  mapContribution,
  mapExpenseCategory,
  mapExpenseDetail,
  mapRaceFinancial,
} from './mappers';

interface DateFilters {
  from?: string;
  to?: string;
}

export interface LedgerFilters extends DateFilters {
  type?: 'INGRESO' | 'EGRESO';
  status?: 'CONFIRMADO' | 'ANULADO';
  search?: string;
}

export interface ContributionFilters extends DateFilters {
  type?: IncomeType;
  status?: 'CONFIRMADO' | 'ANULADO';
  search?: string;
}

export interface ExpenseFilters extends DateFilters {
  status?: 'CONFIRMADO' | 'ANULADO';
  raceId?: string;
  category?: string;
  search?: string;
}

function applyDateRange<T>(query: T, filters: DateFilters): T {
  // PostgREST's builder type is not exported; the runtime API is chainable.
  let next: any = query;
  if (filters.from) next = next.gte('date', filters.from);
  if (filters.to) next = next.lte('date', filters.to);
  return next as T;
}

export async function getCashSummary(): Promise<CashSummary> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('v_cash_summary')
    .select('*')
    .maybeSingle();

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar el resumen de caja.'));
  return mapCashSummary(data as Record<string, unknown> | null);
}

export async function getCashMonthly(): Promise<CashMonthly[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('v_cash_monthly')
    .select('*')
    .order('month_key', { ascending: true });

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar el resumen mensual.'));
  return (data ?? []).map((row) => mapCashMonthly(row as Record<string, unknown>));
}

export async function getCashLedger(
  filters: LedgerFilters = {},
): Promise<CashLedgerRow[]> {
  requireConfiguration();
  let query = supabase
    .from('v_cash_ledger')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);

  query = applyDateRange(query, filters);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.search?.trim()) {
    query = query.ilike('concept', `%${filters.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(errorMessage(error, 'No se pudo cargar el libro de caja.'));
  return (data ?? []).map((row) => mapCashLedger(row as Record<string, unknown>));
}

export async function getExpenses(
  filters: ExpenseFilters = {},
): Promise<ExpenseDetail[]> {
  requireConfiguration();
  let query = supabase
    .from('v_expenses_detail')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);

  query = applyDateRange(query, filters);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.raceId) query = query.eq('race_id', filters.raceId);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.search?.trim()) {
    query = query.ilike('concept', `%${filters.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar los gastos.'));
  return (data ?? []).map((row) => mapExpenseDetail(row as Record<string, unknown>));
}

export async function getExpenseCategories(): Promise<ExpenseCategorySummary[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('v_expenses_by_category')
    .select('*')
    .order('total', { ascending: false });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar las categorías de gasto.'));
  return (data ?? []).map((row) =>
    mapExpenseCategory(row as Record<string, unknown>),
  );
}

export async function getRaceFinancials(): Promise<RaceFinancial[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('v_race_financials')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar la situación financiera por carrera.'));
  return (data ?? []).map((row) => mapRaceFinancial(row as Record<string, unknown>));
}

export async function getRaceExpenseCategories(): Promise<RaceExpenseCategory[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('v_race_expense_categories')
    .select('*')
    .order('total', { ascending: false });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar los gastos por carrera.'));
  return (data ?? []).map((row) => {
    const raw = row as Record<string, unknown>;
    return {
      race_id: String(raw.race_id),
      category: String(raw.category ?? 'Sin categoría'),
      count: Number(raw.count ?? 0),
      total: Number(raw.total ?? 0),
    };
  });
}

interface RawContribution extends Record<string, unknown> {
  members?: { full_name?: string | null } | null;
}

export async function getContributions(
  filters: ContributionFilters = {},
): Promise<ContributionRow[]> {
  requireConfiguration();
  let query = supabase
    .from('contributions')
    .select('*, members(full_name)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);

  query = applyDateRange(query, filters);
  if (filters.type) query = query.eq('income_type', filters.type);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.search?.trim()) {
    query = query.ilike('concept', `%${filters.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar los aportes.'));
  return (data ?? []).map((row) => {
    const raw = row as RawContribution;
    return {
      ...mapContribution(raw),
      member_name: raw.members?.full_name ?? null,
      created_by_name: null,
    };
  });
}

export async function getBudgets(raceId?: string): Promise<RaceBudget[]> {
  requireConfiguration();
  let query = supabase
    .from('race_budgets')
    .select('*')
    .order('category', { ascending: true });

  if (raceId) query = query.eq('race_id', raceId);

  const { data, error } = await query;
  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar los presupuestos.'));
  return (data ?? []).map((row) => mapBudget(row as Record<string, unknown>));
}

export interface BudgetInput {
  race_id: string;
  category: string;
  budgeted: number;
  notes: string | null;
}

export async function upsertBudget(input: BudgetInput): Promise<RaceBudget> {
  requireConfiguration();
  const payload = {
    race_id: input.race_id,
    category: required(input.category, 'La categoría'),
    budgeted: nonNegativeNumber(input.budgeted, 'El presupuesto'),
    notes: input.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from('race_budgets')
    .upsert(payload, { onConflict: 'race_id,category' })
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo guardar el presupuesto.'));
  return mapBudget(data as Record<string, unknown>);
}

export async function updateBudget(
  id: string,
  input: BudgetInput,
): Promise<RaceBudget> {
  requireConfiguration();
  const payload = {
    race_id: input.race_id,
    category: required(input.category, 'La categoría'),
    budgeted: nonNegativeNumber(input.budgeted, 'El presupuesto'),
    notes: input.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from('race_budgets')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo actualizar el presupuesto.'));
  return mapBudget(data as Record<string, unknown>);
}

export async function deleteBudget(id: string): Promise<void> {
  requireConfiguration();
  const { error } = await supabase.from('race_budgets').delete().eq('id', id);
  if (error) throw new Error(errorMessage(error, 'No se pudo eliminar el presupuesto.'));
}

export interface IncomeInput {
  incomeType: IncomeType;
  date: string;
  amount: number;
  concept: string;
  memberId: string | null;
  entityName: string | null;
  method: string | null;
  reference: string | null;
}

export async function registerIncome(
  input: IncomeInput,
): Promise<ContributionRow> {
  requireConfiguration();
  const amount = positiveNumber(input.amount, 'El monto');
  const concept = required(input.concept, 'El concepto');

  const { data, error } = await supabase.rpc('register_income', {
    p_income_type: input.incomeType,
    p_date: input.date || todayISO(),
    p_amount: amount,
    p_concept: concept,
    p_member_id: input.memberId || null,
    p_entity_name: input.entityName?.trim() || null,
    p_method: input.method || null,
    p_reference: input.reference?.trim() || null,
    p_idempotency_key: `inc-${crypto.randomUUID()}`,
  });

  if (error) throw new Error(errorMessage(error, 'No se pudo registrar el ingreso.'));
  return {
    ...mapContribution(data as Record<string, unknown>),
    member_name: null,
    created_by_name: null,
  };
}

export async function reverseIncome(id: string, reason: string): Promise<void> {
  requireConfiguration();
  if (!reason.trim()) throw new Error('Indica el motivo del reverso.');
  const { error } = await supabase.rpc('reverse_income', {
    p_contribution_id: id,
    p_reason: reason.trim(),
  });
  if (error) throw new Error(errorMessage(error, 'No se pudo revertir el ingreso.'));
}

export interface ExpenseInput {
  date: string;
  concept: string;
  category: string;
  amount: number;
  method: string | null;
  raceId: string | null;
  beneficiary: string | null;
  receiptPath: string | null;
  notes: string | null;
}

export async function registerExpense(input: ExpenseInput): Promise<ExpenseDetail> {
  requireConfiguration();
  const amount = positiveNumber(input.amount, 'El monto');
  const concept = required(input.concept, 'El concepto');
  const category = required(input.category, 'La categoría');

  const { data, error } = await supabase.rpc('register_expense', {
    p_date: input.date || todayISO(),
    p_concept: concept,
    p_category: category,
    p_amount: amount,
    p_method: input.method || null,
    p_race_id: input.raceId || null,
    p_beneficiary: input.beneficiary?.trim() || null,
    p_receipt_path: input.receiptPath || null,
    p_notes: input.notes?.trim() || null,
    p_idempotency_key: `exp-${crypto.randomUUID()}`,
  });

  if (error) throw new Error(errorMessage(error, 'No se pudo registrar el gasto.'));
  const row = data as Record<string, unknown>;
  return {
    ...mapExpenseDetail(row),
    race_name: null,
    created_by_name: null,
  };
}

export async function reverseExpense(id: string, reason: string): Promise<void> {
  requireConfiguration();
  if (!reason.trim()) throw new Error('Indica el motivo del reverso.');
  const { error } = await supabase.rpc('reverse_expense', {
    p_expense_id: id,
    p_reason: reason.trim(),
  });
  if (error) throw new Error(errorMessage(error, 'No se pudo revertir el gasto.'));
}

export async function setOpeningBalance(
  amount: number,
  date: string,
  concept: string,
): Promise<CashMovement> {
  requireConfiguration();
  const value = positiveNumber(amount, 'El saldo inicial');

  const { data, error } = await supabase.rpc('set_opening_balance', {
    p_amount: value,
    p_date: date || todayISO(),
    p_concept: concept.trim() || 'Saldo inicial de caja',
  });

  if (error) throw new Error(errorMessage(error, 'No se pudo registrar el saldo inicial.'));
  return data as unknown as CashMovement;
}

export async function reverseOpeningBalance(reason: string): Promise<void> {
  requireConfiguration();
  if (!reason.trim()) throw new Error('Indica el motivo del reverso.');
  const { error } = await supabase.rpc('reverse_opening_balance', {
    p_reason: reason.trim(),
  });
  if (error) throw new Error(errorMessage(error, 'No se pudo revertir el saldo inicial.'));
}
