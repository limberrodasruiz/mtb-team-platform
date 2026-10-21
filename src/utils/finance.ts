import type {
  CashMovement,
  CashSummary,
  Member,
  MembershipPayment,
} from '../types';

export function calculateCashBalance(movements: CashMovement[]): number {
  return movements.reduce((acc, m) => {
    if (m.type === 'INGRESO') return acc + m.amount;
    return acc - m.amount;
  }, 0);
}

export function summarizeCash(movements: CashMovement[]): CashSummary {
  let total_ingresos = 0;
  let total_egresos = 0;
  for (const m of movements) {
    if (m.type === 'INGRESO') total_ingresos += m.amount;
    else total_egresos += m.amount;
  }
  return {
    total_ingresos,
    total_egresos,
    balance: total_ingresos - total_egresos,
    movements_count: movements.length,
  };
}

export function summarizeByMonth(
  movements: CashMovement[],
): Record<string, { ingresos: number; egresos: number; balance: number }> {
  const out: Record<
    string,
    { ingresos: number; egresos: number; balance: number }
  > = {};
  for (const m of movements) {
    const key = m.movement_date.slice(0, 7);
    if (!out[key]) out[key] = { ingresos: 0, egresos: 0, balance: 0 };
    if (m.type === 'INGRESO') out[key].ingresos += m.amount;
    else out[key].egresos += m.amount;
    out[key].balance = out[key].ingresos - out[key].egresos;
  }
  return out;
}

export function summarizeByCategory(
  movements: CashMovement[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of movements) {
    const key = m.category ?? 'sin-categoria';
    const signed = m.type === 'INGRESO' ? m.amount : -m.amount;
    out[key] = (out[key] ?? 0) + signed;
  }
  return out;
}

function currentMonthKey(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${mm}`;
}

export interface DebtorRow {
  member: Member;
  payment: MembershipPayment | null;
}

export function getDebtors(
  members: Member[],
  payments: MembershipPayment[],
  monthKey?: string,
): DebtorRow[] {
  const target = monthKey ?? currentMonthKey();
  const byMember = new Map<string, MembershipPayment>();
  for (const p of payments) {
    if (p.month_key === target) byMember.set(p.member_id, p);
  }
  const debtors: DebtorRow[] = [];
  for (const member of members) {
    if (member.status !== 'ACTIVO') continue;
    const payment = byMember.get(member.id) ?? null;
    if (!payment || payment.status !== 'PAGADO') {
      debtors.push({ member, payment });
    }
  }
  return debtors;
}
