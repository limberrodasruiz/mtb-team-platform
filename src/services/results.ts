import { errorMessage } from '../lib/errors';
import { requireConfiguration, supabase } from '../lib/supabase';
import type {
  RankingRow,
  RaceResult,
  ResultStatus,
  ResultWithRelations,
  ScoringRule,
} from '../types';
import { mapRanking, mapResult, mapScoring } from './mappers';

export interface ResultFilters {
  raceId?: string;
  cyclistId?: string;
  categoryId?: string;
  year?: number;
  includeAnnulled?: boolean;
}

export type ResultInput = {
  race_id: string;
  cyclist_id: string;
  category_id: string | null;
  position: number | null;
  result_status: ResultStatus;
  time_text: string | null;
  time_seconds: number | null;
  notes: string | null;
};

interface RawResult extends Record<string, unknown> {
  races?: { name?: string | null; date?: string | null } | null;
  cyclists?: { full_name?: string | null; slug?: string | null } | null;
  categories?: { name?: string | null } | null;
}

/**
 * Public result columns. Internal notes and audit fields are intentionally
 * excluded and the anon role has column-level grants matching this list.
 */
export const PUBLIC_RESULT_SELECT =
  'id, race_id, cyclist_id, category_id, position, time_text, points, result_status, time_seconds, created_at, updated_at, races(name, date), cyclists(full_name, slug), categories(name)';

const ADMIN_RESULT_SELECT =
  '*, races(name, date), cyclists(full_name, slug), categories(name)';

function parseResult(row: RawResult): ResultWithRelations {
  return {
    ...mapResult(row),
    race_name: row.races?.name ?? null,
    race_date: row.races?.date ?? null,
    cyclist_name: row.cyclists?.full_name ?? null,
    cyclist_slug: row.cyclists?.slug ?? null,
    category_name: row.categories?.name ?? null,
  };
}

async function fetchResults(
  filters: ResultFilters,
  fields: string,
  includeAnnulledDefault = false,
): Promise<ResultWithRelations[]> {
  requireConfiguration();
  let query = supabase
    .from('race_results')
    .select(fields)
    .order('created_at', { ascending: false });

  if (filters.raceId) query = query.eq('race_id', filters.raceId);
  if (filters.cyclistId) query = query.eq('cyclist_id', filters.cyclistId);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (!(filters.includeAnnulled ?? includeAnnulledDefault)) {
    query = query.neq('result_status', 'ANULADO');
  }

  const { data, error } = await query;
  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar los resultados.'));

  let rows = (data ?? []).map((row) =>
    parseResult(row as unknown as RawResult),
  );
  if (filters.year) {
    rows = rows.filter(
      (row) => Number((row.race_date ?? '').slice(0, 4)) === filters.year,
    );
  }
  return rows;
}

export function getResults(
  filters: ResultFilters = {},
): Promise<ResultWithRelations[]> {
  return fetchResults(filters, ADMIN_RESULT_SELECT);
}

/** Public-safe variant: never requests internal notes or audit columns. */
export function getPublicResults(
  filters: ResultFilters = {},
): Promise<ResultWithRelations[]> {
  return fetchResults(filters, PUBLIC_RESULT_SELECT);
}

export async function createResult(payload: ResultInput): Promise<RaceResult> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('race_results')
    .insert({
      ...payload,
      annulled_at: payload.result_status === 'ANULADO' ? new Date().toISOString() : null,
      annul_reason: null,
    })
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo registrar el resultado.'));
  return mapResult(data as Record<string, unknown>);
}

export async function updateResult(
  id: string,
  payload: Partial<ResultInput> & { annul_reason?: string | null },
): Promise<RaceResult> {
  requireConfiguration();
  const changes: Record<string, unknown> = { ...payload };
  if (payload.result_status && payload.result_status !== 'ANULADO') {
    changes.annulled_at = null;
    changes.annul_reason = null;
  }
  if (payload.result_status === 'ANULADO' && !payload.annul_reason) {
    throw new Error('Indica el motivo de la anulación del resultado.');
  }

  const { data, error } = await supabase
    .from('race_results')
    .update(changes)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo actualizar el resultado.'));
  return mapResult(data as Record<string, unknown>);
}

export async function annulResult(id: string, reason: string): Promise<void> {
  requireConfiguration();
  const { error } = await supabase
    .from('race_results')
    .update({
      result_status: 'ANULADO',
      annul_reason: reason,
      annulled_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(errorMessage(error, 'No se pudo anular el resultado.'));
}

export async function getScoringRules(): Promise<ScoringRule[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('scoring_rules')
    .select('*')
    .order('position', { ascending: true });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar las reglas de puntuación.'));
  return (data ?? []).map((row) => mapScoring(row as Record<string, unknown>));
}

export async function updateScoringRules(
  rules: Array<{ position: number; points: number }>,
): Promise<void> {
  requireConfiguration();
  const { error } = await supabase
    .from('scoring_rules')
    .upsert(rules, { onConflict: 'position' });

  if (error) throw new Error(errorMessage(error, 'No se pudieron guardar las reglas.'));
}

export async function getRanking(
  year?: number,
  categoryId?: string,
): Promise<RankingRow[]> {
  requireConfiguration();
  const { data, error } = await supabase.rpc('get_ranking', {
    p_year: year ?? null,
    p_category_id: categoryId ?? null,
  });

  if (error) throw new Error(errorMessage(error, 'No se pudo calcular el ranking.'));
  return ((data ?? []) as Record<string, unknown>[]).map(mapRanking);
}
