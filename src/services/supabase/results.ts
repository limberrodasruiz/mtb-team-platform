import { supabase } from '../../lib/supabaseClient';
import { getPointsForPosition } from '../../utils/ranking';
import type { RaceResult, ScoringRule } from '../../types';

export interface ResultFilters {
  raceId?: string;
  cyclistId?: string;
  categoryId?: string;
}

function toFriendly(error: unknown, fallback: string): Error {
  if (error instanceof Error) return new Error(`${fallback}: ${error.message}`);
  return new Error(fallback);
}

export async function getResults(filters: ResultFilters = {}): Promise<RaceResult[]> {
  try {
    let query = supabase.from('race_results').select('*').order('position', { ascending: true });
    if (filters.raceId) query = query.eq('race_id', filters.raceId);
    if (filters.cyclistId) query = query.eq('cyclist_id', filters.cyclistId);
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as RaceResult[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener los resultados');
  }
}

export async function getResultsByCyclist(cyclistId: string): Promise<RaceResult[]> {
  return getResults({ cyclistId });
}

async function resolvePointsForPosition(position: number): Promise<number> {
  const { data, error } = await supabase
    .from('scoring_rules')
    .select('*');
  if (error || !data) {
    return getPointsForPosition({}, position);
  }
  return getPointsForPosition(data as ScoringRule[], position);
}

export async function createResult(
  payload: Omit<RaceResult, 'id' | 'created_at' | 'points'> & { points?: number },
): Promise<RaceResult> {
  try {
    const points =
      payload.points ?? (await resolvePointsForPosition(payload.position));
    const { data, error } = await supabase
      .from('race_results')
      .insert({ ...payload, points })
      .select()
      .single();
    if (error) throw error;
    return data as RaceResult;
  } catch (e) {
    throw toFriendly(e, 'No se pudo crear el resultado');
  }
}

export async function updateResult(
  id: string,
  payload: Partial<Omit<RaceResult, 'id' | 'created_at'>>,
): Promise<RaceResult> {
  try {
    const changes: Partial<Omit<RaceResult, 'id' | 'created_at'>> = { ...payload };
    if (payload.position !== undefined && payload.points === undefined) {
      changes.points = await resolvePointsForPosition(payload.position);
    }
    const { data, error } = await supabase
      .from('race_results')
      .update(changes)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as RaceResult;
  } catch (e) {
    throw toFriendly(e, 'No se pudo actualizar el resultado');
  }
}
