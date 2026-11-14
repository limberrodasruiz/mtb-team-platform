import { errorMessage } from '../lib/errors';
import { requireConfiguration, supabase } from '../lib/supabase';
import type { AuditLog } from '../types';
import { mapAudit } from './mappers';

export interface AuditFilters {
  module?: string;
  action?: string;
  search?: string;
}

export async function getAuditLogs(
  filters: AuditFilters = {},
  limit = 200,
): Promise<AuditLog[]> {
  requireConfiguration();
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.module) query = query.eq('module', filters.module);
  if (filters.action) query = query.eq('action', filters.action);

  const { data, error } = await query;
  if (error) throw new Error(errorMessage(error, 'No se pudo cargar la auditoría.'));

  const rows = (data ?? []).map((row) => mapAudit(row as Record<string, unknown>));
  const term = filters.search?.trim().toLowerCase();
  if (!term) return rows;

  return rows.filter((row) => {
    const text = [
      row.record_id,
      row.module,
      row.action,
      JSON.stringify(row.new_data ?? {}),
      JSON.stringify(row.old_data ?? {}),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return text.includes(term);
  });
}
