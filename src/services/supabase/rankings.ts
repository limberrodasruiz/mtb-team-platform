import { supabase } from '../../lib/supabaseClient';
import { calculateTeamRanking } from '../../utils/ranking';
import type { Race, RaceResult, RankingRow, ScoringRule } from '../../types';

function toFriendly(error: unknown, fallback: string): Error {
  if (error instanceof Error) return new Error(`${fallback}: ${error.message}`);
  return new Error(fallback);
}

export async function getScoringRules(): Promise<ScoringRule[]> {
  try {
    const { data, error } = await supabase
      .from('scoring_rules')
      .select('*')
      .order('position', { ascending: true });
    if (error) throw error;
    return (data ?? []) as ScoringRule[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener las reglas de puntuación');
  }
}

export async function updateScoringRules(
  rules: Array<Pick<ScoringRule, 'position' | 'points'>>,
): Promise<ScoringRule[]> {
  try {
    const { data, error } = await supabase
      .from('scoring_rules')
      .upsert(rules, { onConflict: 'position' })
      .select();
    if (error) throw error;
    return (data ?? []) as ScoringRule[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron actualizar las reglas de puntuación');
  }
}

export async function getTeamRanking(
  year?: number,
  categoryId?: string,
): Promise<RankingRow[]> {
  try {
    let raceIds: string[] | null = null;
    if (year !== undefined) {
      const { data: races, error: racesError } = await supabase
        .from('races')
        .select('id, race_date');
      if (racesError) throw racesError;
      raceIds = ((races ?? []) as Array<Pick<Race, 'id' | 'race_date'>>)
        .filter((r) => new Date(r.race_date).getFullYear() === year)
        .map((r) => r.id);
      if (raceIds.length === 0) return [];
    }

    let query = supabase.from('race_results').select('*');
    if (raceIds) query = query.in('race_id', raceIds);
    if (categoryId) query = query.eq('category_id', categoryId);

    const { data, error } = await query;
    if (error) throw error;
    const results = (data ?? []) as RaceResult[];

    const cyclistIds = [...new Set(results.map((r) => r.cyclist_id))];
    let names = new Map<string, { full_name: string; slug: string | null; photo_url: string | null }>();
    if (cyclistIds.length > 0) {
      const { data: cyclists } = await supabase
        .from('cyclists')
        .select('id, full_name, slug, photo_url')
        .in('id', cyclistIds);
      names = new Map(
        ((cyclists ?? []) as Array<{
          id: string;
          full_name: string;
          slug: string | null;
          photo_url: string | null;
        }>).map((c) => [
          c.id,
          { full_name: c.full_name, slug: c.slug, photo_url: c.photo_url },
        ]),
      );
    }

    const enriched = results.map((r) => ({
      cyclist_id: r.cyclist_id,
      position: r.position,
      points: r.points,
      cyclist_full_name: names.get(r.cyclist_id)?.full_name ?? r.cyclist_id,
      cyclist_slug: names.get(r.cyclist_id)?.slug ?? null,
      cyclist_photo_url: names.get(r.cyclist_id)?.photo_url ?? null,
    }));

    return calculateTeamRanking(enriched);
  } catch (e) {
    throw toFriendly(e, 'No se pudo obtener el ranking del equipo');
  }
}
