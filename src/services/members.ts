import { errorMessage } from '../lib/errors';
import { requireConfiguration, supabase } from '../lib/supabase';
import type {
  Member,
  MemberDebt,
  MemberStatus,
  MembershipObligation,
  MembershipPaymentEntry,
  MembershipSummary,
  PaymentStatus,
} from '../types';
import { todayISO } from '../utils/format';
import {
  nonNegativeNumber,
  optionalEmail,
  required,
} from '../utils/validation';
import {
  mapMember,
  mapMemberDebt,
  mapMembershipSummary,
  mapObligation,
  mapPaymentEntry,
} from './mappers';

export interface MemberInput {
  full_name: string;
  ci: string | null;
  phone: string | null;
  email: string | null;
  joined_at: string;
  status: MemberStatus;
  member_type: Member['member_type'];
  monthly_amount: number;
  fee_exempt: boolean;
  left_at: string | null;
  notes: string | null;
}

function validateMember(payload: MemberInput): MemberInput {
  return {
    full_name: required(payload.full_name, 'El nombre'),
    ci: payload.ci?.trim() || null,
    phone: payload.phone?.trim() || null,
    email: optionalEmail(payload.email),
    joined_at: payload.joined_at || todayISO(),
    status: payload.status,
    member_type: payload.member_type,
    monthly_amount: nonNegativeNumber(payload.monthly_amount, 'La cuota mensual'),
    fee_exempt: Boolean(payload.fee_exempt),
    left_at: payload.left_at || null,
    notes: payload.notes?.trim() || null,
  };
}

export async function getMembers(): Promise<Member[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('status', { ascending: true })
    .order('full_name', { ascending: true });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar los miembros.'));
  return (data ?? []).map((row) => mapMember(row as Record<string, unknown>));
}

export async function getMember(id: string): Promise<Member | null> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar el miembro.'));
  return data ? mapMember(data as Record<string, unknown>) : null;
}

export async function createMember(payload: MemberInput): Promise<Member> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('members')
    .insert(validateMember(payload))
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo crear el miembro.'));
  return mapMember(data as Record<string, unknown>);
}

export async function updateMember(
  id: string,
  payload: MemberInput,
): Promise<Member> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('members')
    .update(validateMember(payload))
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo actualizar el miembro.'));
  return mapMember(data as Record<string, unknown>);
}

export async function setMemberStatus(
  id: string,
  status: MemberStatus,
  currentLeftAt?: string | null,
): Promise<void> {
  requireConfiguration();
  const { error } = await supabase
    .from('members')
    .update({
      status,
      left_at:
        status === 'INACTIVO' ? currentLeftAt || todayISO() : null,
    })
    .eq('id', id);

  if (error) throw new Error(errorMessage(error, 'No se pudo cambiar el estado del miembro.'));
}

export interface ObligationFilters {
  year?: number;
  month?: number;
  status?: PaymentStatus;
  memberId?: string;
  search?: string;
}

export async function getObligations(
  filters: ObligationFilters = {},
): Promise<MembershipObligation[]> {
  requireConfiguration();
  let query = supabase
    .from('v_membership_obligations')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .order('full_name', { ascending: true })
    .limit(1000);

  if (filters.year) query = query.eq('year', filters.year);
  if (filters.month) query = query.eq('month', filters.month);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.memberId) query = query.eq('member_id', filters.memberId);
  if (filters.search?.trim()) {
    query = query.ilike('full_name', `%${filters.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar las membresías.'));
  return (data ?? []).map((row) => mapObligation(row as Record<string, unknown>));
}

export async function getPaymentEntries(
  obligationId: string,
): Promise<MembershipPaymentEntry[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('membership_payment_entries')
    .select('*')
    .eq('obligation_id', obligationId)
    .order('paid_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar el historial de pagos.'));
  return (data ?? []).map((row) =>
    mapPaymentEntry(row as Record<string, unknown>),
  );
}

export interface PaymentInput {
  amount: number;
  paidAt: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
}

export async function registerMembershipPayment(
  obligationId: string,
  input: PaymentInput,
): Promise<MembershipPaymentEntry> {
  requireConfiguration();
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('El monto del pago debe ser mayor a cero.');
  }

  const { data, error } = await supabase.rpc('register_membership_payment', {
    p_obligation_id: obligationId,
    p_amount: amount,
    p_paid_at: input.paidAt || todayISO(),
    p_method: input.method || null,
    p_reference: input.reference?.trim() || null,
    p_notes: input.notes?.trim() || null,
    p_idempotency_key: `mem-${crypto.randomUUID()}`,
  });

  if (error) throw new Error(errorMessage(error, 'No se pudo registrar el pago.'));
  return mapPaymentEntry(data as Record<string, unknown>);
}

export async function reverseMembershipPayment(
  entryId: string,
  reason: string,
): Promise<void> {
  requireConfiguration();
  if (!reason.trim()) throw new Error('Indica el motivo del reverso.');

  const { error } = await supabase.rpc('reverse_membership_payment', {
    p_entry_id: entryId,
    p_reason: reason.trim(),
  });

  if (error) throw new Error(errorMessage(error, 'No se pudo revertir el pago.'));
}

export async function generateObligations(
  year: number,
  month: number,
): Promise<number> {
  requireConfiguration();
  const { data, error } = await supabase.rpc('generate_membership_obligations', {
    p_year: year,
    p_month: month,
  });

  if (error) throw new Error(errorMessage(error, 'No se pudieron generar las cuotas.'));
  return Number(data ?? 0);
}

export async function annulObligation(
  obligationId: string,
  reason: string,
): Promise<void> {
  requireConfiguration();
  if (!reason.trim()) throw new Error('Indica el motivo de la anulación.');

  const { error } = await supabase.rpc('annul_membership_obligation', {
    p_obligation_id: obligationId,
    p_reason: reason.trim(),
  });

  if (error) throw new Error(errorMessage(error, 'No se pudo anular la obligación.'));
}

export interface ObligationUpdate {
  expected: number;
  dueDate: string | null;
  waived: boolean;
  notes: string | null;
}

export async function updateObligation(
  obligationId: string,
  input: ObligationUpdate,
): Promise<void> {
  requireConfiguration();
  const expected = nonNegativeNumber(input.expected, 'El monto esperado');

  const { error } = await supabase.rpc('update_membership_obligation', {
    p_obligation_id: obligationId,
    p_expected: expected,
    p_due_date: input.dueDate || null,
    p_waived: input.waived,
    p_notes: input.notes?.trim() || null,
  });

  if (error) throw new Error(errorMessage(error, 'No se pudo actualizar la obligación.'));
}

export async function getMembershipSummary(
  year?: number,
): Promise<MembershipSummary[]> {
  requireConfiguration();
  let query = supabase
    .from('v_membership_summary')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (year) query = query.eq('year', year);

  const { data, error } = await query;
  if (error) throw new Error(errorMessage(error, 'No se pudo cargar el resumen de membresías.'));
  return (data ?? []).map((row) =>
    mapMembershipSummary(row as Record<string, unknown>),
  );
}

export async function getMemberDebt(): Promise<MemberDebt[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('v_member_debt')
    .select('*')
    .order('overdue_amount', { ascending: false })
    .order('pending_amount', { ascending: false });

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar la lista de deudores.'));
  return (data ?? []).map((row) => mapMemberDebt(row as Record<string, unknown>));
}
