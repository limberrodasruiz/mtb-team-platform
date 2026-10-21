import { supabase } from '../../lib/supabaseClient';
import type { AuditLog, Profile, Role } from '../../types';

function toFriendly(error: unknown, fallback: string): Error {
  if (error instanceof Error) return new Error(`${fallback}: ${error.message}`);
  return new Error(fallback);
}

export async function getProfiles(): Promise<Profile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Profile[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener los perfiles');
  }
}

export async function updateUserRole(
  userId: string,
  role: Role,
): Promise<Profile> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  } catch (e) {
    throw toFriendly(e, 'No se pudo actualizar el rol del usuario');
  }
}

export async function getAuditLogs(limit = 100): Promise<AuditLog[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as AuditLog[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener los registros de auditoría');
  }
}

export async function logAudit(
  entry: Omit<AuditLog, 'id' | 'created_at'>,
): Promise<void> {
  try {
    const { error } = await supabase.from('audit_logs').insert(entry);
    if (error) throw error;
  } catch (e) {
    throw toFriendly(e, 'No se pudo registrar la auditoría');
  }
}

export interface DashboardStats {
  cyclists: number;
  activeCyclists: number;
  races: number;
  upcomingRaces: number;
  members: number;
  cashBalance: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const [cyclistsRes, racesRes, membersRes, cashRes] = await Promise.all([
      supabase.from('cyclists').select('id, is_active'),
      supabase.from('races').select('id, race_date'),
      supabase.from('members').select('id'),
      supabase.from('cash_movements').select('amount, type'),
    ]);
    if (cyclistsRes.error) throw cyclistsRes.error;
    if (racesRes.error) throw racesRes.error;
    if (membersRes.error) throw membersRes.error;
    if (cashRes.error) throw cashRes.error;

    const cyclists = (cyclistsRes.data ?? []) as Array<{
      id: string;
      is_active: boolean;
    }>;
    const races = (racesRes.data ?? []) as Array<{
      id: string;
      race_date: string;
    }>;
    const today = new Date().toISOString().slice(0, 10);
    const movements = (cashRes.data ?? []) as Array<{
      amount: number;
      type: 'INGRESO' | 'EGRESO';
    }>;

    let balance = 0;
    for (const m of movements) {
      balance += m.type === 'INGRESO' ? m.amount : -m.amount;
    }

    return {
      cyclists: cyclists.length,
      activeCyclists: cyclists.filter((c) => c.is_active).length,
      races: races.length,
      upcomingRaces: races.filter((r) => r.race_date >= today).length,
      members: (membersRes.data ?? []).length,
      cashBalance: balance,
    };
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener las estadísticas');
  }
}
