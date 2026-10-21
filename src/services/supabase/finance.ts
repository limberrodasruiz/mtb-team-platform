import { supabase } from '../../lib/supabaseClient';
import { calculateCashBalance, getDebtors as calcDebtors } from '../../utils/finance';
import type {
  CashMovement,
  Contribution,
  Expense,
  Member,
  MembershipPayment,
  RaceBudget,
} from '../../types';
import type { DebtorRow } from '../../utils/finance';

function toFriendly(error: unknown, fallback: string): Error {
  if (error instanceof Error) return new Error(`${fallback}: ${error.message}`);
  return new Error(fallback);
}

export async function getMembers(): Promise<Member[]> {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('full_name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Member[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener los miembros');
  }
}

export async function createMember(
  payload: Omit<Member, 'id' | 'created_at'>,
): Promise<Member> {
  try {
    const { data, error } = await supabase
      .from('members')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Member;
  } catch (e) {
    throw toFriendly(e, 'No se pudo crear el miembro');
  }
}

export async function updateMember(
  id: string,
  payload: Partial<Omit<Member, 'id' | 'created_at'>>,
): Promise<Member> {
  try {
    const { data, error } = await supabase
      .from('members')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Member;
  } catch (e) {
    throw toFriendly(e, 'No se pudo actualizar el miembro');
  }
}

export async function getMembershipPayments(
  monthKey?: string,
): Promise<MembershipPayment[]> {
  try {
    let query = supabase
      .from('membership_payments')
      .select('*')
      .order('month_key', { ascending: false });
    if (monthKey) query = query.eq('month_key', monthKey);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as MembershipPayment[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener los pagos de membresía');
  }
}

export async function updateMemberPayment(
  id: string,
  payload: Partial<Omit<MembershipPayment, 'id' | 'created_at'>>,
): Promise<MembershipPayment> {
  try {
    const { data, error } = await supabase
      .from('membership_payments')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as MembershipPayment;
  } catch (e) {
    throw toFriendly(e, 'No se pudo actualizar el pago');
  }
}

export async function getDebtors(monthKey?: string): Promise<DebtorRow[]> {
  try {
    const [members, payments] = await Promise.all([
      getMembers(),
      getMembershipPayments(monthKey),
    ]);
    return calcDebtors(members, payments, monthKey);
  } catch (e) {
    throw toFriendly(e, 'No se pudieron calcular los deudores');
  }
}

export async function createContribution(
  payload: Omit<Contribution, 'id' | 'created_at'>,
): Promise<Contribution> {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Contribution;
  } catch (e) {
    throw toFriendly(e, 'No se pudo registrar el aporte');
  }
}

export async function getCashMovements(): Promise<CashMovement[]> {
  try {
    const { data, error } = await supabase
      .from('cash_movements')
      .select('*')
      .order('movement_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as CashMovement[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener los movimientos de caja');
  }
}

export async function getCashBalance(): Promise<number> {
  try {
    const movements = await getCashMovements();
    return calculateCashBalance(movements);
  } catch (e) {
    throw toFriendly(e, 'No se pudo calcular el saldo de caja');
  }
}

export async function createExpense(
  payload: Omit<Expense, 'id' | 'created_at'>,
): Promise<Expense> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    const expense = data as Expense;
    const { error: cashError } = await supabase.from('cash_movements').insert({
      concept: `Gasto: ${payload.title}`,
      type: 'EGRESO',
      amount: payload.amount,
      movement_date: payload.expense_date,
      category: payload.category ?? null,
      related_race_id: payload.race_id ?? null,
      notes: payload.description ?? null,
    });
    if (cashError) throw cashError;
    return expense;
  } catch (e) {
    throw toFriendly(e, 'No se pudo registrar el gasto');
  }
}

export async function getExpensesByRace(raceId: string): Promise<Expense[]> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('race_id', raceId)
      .order('expense_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Expense[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener los gastos de la carrera');
  }
}

export async function getRaceBudgets(): Promise<RaceBudget[]> {
  try {
    const { data, error } = await supabase.from('race_budgets').select('*');
    if (error) throw error;
    return (data ?? []) as RaceBudget[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener los presupuestos');
  }
}

export async function createRaceBudget(
  payload: Omit<RaceBudget, 'id' | 'created_at'>,
): Promise<RaceBudget> {
  try {
    const { data, error } = await supabase
      .from('race_budgets')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as RaceBudget;
  } catch (e) {
    throw toFriendly(e, 'No se pudo crear el presupuesto');
  }
}
