import { errorMessage } from '../lib/errors';
import { requireConfiguration, supabase } from '../lib/supabase';
import type {
  Achievement,
  Cyclist,
  CyclistStats,
  PublicCyclist,
  ResultWithRelations,
} from '../types';
import {
  mapAchievement,
  mapCyclist,
  mapPublicCyclist,
  mapResult,
  mapStats,
} from './mappers';
import { PUBLIC_RESULT_SELECT } from './results';

export type CyclistInput = Omit<
  Cyclist,
  'id' | 'created_at' | 'updated_at' | 'photo_path' | 'photo_url'
> & {
  photo_path?: string | null;
  photo_url?: string | null;
};

export async function getPublicCyclists(): Promise<PublicCyclist[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('v_public_cyclists')
    .select(
      'id, full_name, slug, nickname, category_id, category_name, category_slug, specialty, number, photo_path, photo_url, bio, team_since, joined_at, featured, active, age, created_at, updated_at',
    )
    .order('featured', { ascending: false })
    .order('full_name', { ascending: true });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar los corredores.'));
  return (data ?? []).map((row) => mapPublicCyclist(row as Record<string, unknown>));
}

export async function getPublicCyclistBySlug(
  slug: string,
): Promise<PublicCyclist | null> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('v_public_cyclists')
    .select(
      'id, full_name, slug, nickname, category_id, category_name, category_slug, specialty, number, photo_path, photo_url, bio, team_since, joined_at, featured, active, age, created_at, updated_at',
    )
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar el corredor.'));
  return data ? mapPublicCyclist(data as Record<string, unknown>) : null;
}

export async function getCyclistStats(cyclistId: string): Promise<CyclistStats> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('v_public_cyclist_stats')
    .select(
      'cyclist_id, total_races, total_points, wins, seconds, thirds, podiums, best_position',
    )
    .eq('cyclist_id', cyclistId)
    .maybeSingle();

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar las estadísticas.'));

  if (!data) {
    return {
      cyclist_id: cyclistId,
      total_races: 0,
      total_points: 0,
      wins: 0,
      seconds: 0,
      thirds: 0,
      podiums: 0,
      best_position: null,
    };
  }
  return mapStats(data as Record<string, unknown>);
}

export async function getCyclistAchievements(cyclistId: string): Promise<Achievement[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('cyclist_id', cyclistId)
    .order('sort_order', { ascending: true })
    .order('year', { ascending: false });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar los logros.'));
  return (data ?? []).map((row) => mapAchievement(row as Record<string, unknown>));
}

interface RawResult extends Record<string, unknown> {
  races?: { name?: string | null; date?: string | null } | null;
  cyclists?: { full_name?: string | null; slug?: string | null } | null;
  categories?: { name?: string | null } | null;
}

export async function getCyclistResults(
  cyclistId: string,
): Promise<ResultWithRelations[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('race_results')
    .select(PUBLIC_RESULT_SELECT)
    .eq('cyclist_id', cyclistId)
    .neq('result_status', 'ANULADO')
    .order('created_at', { ascending: false });

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar el historial deportivo.'));

  return (data ?? []).map((row) => {
    const raw = row as RawResult;
    return {
      ...mapResult(raw),
      race_name: raw.races?.name ?? null,
      race_date: raw.races?.date ?? null,
      cyclist_name: raw.cyclists?.full_name ?? null,
      cyclist_slug: raw.cyclists?.slug ?? null,
      category_name: raw.categories?.name ?? null,
    };
  });
}

export async function getAdminCyclists(): Promise<Cyclist[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('cyclists')
    .select('*')
    .order('active', { ascending: false })
    .order('full_name', { ascending: true });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar los corredores.'));
  return (data ?? []).map((row) => mapCyclist(row as Record<string, unknown>));
}

export async function createCyclist(payload: CyclistInput): Promise<Cyclist> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('cyclists')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo crear el corredor.'));
  return mapCyclist(data as Record<string, unknown>);
}

export async function updateCyclist(
  id: string,
  payload: Partial<CyclistInput>,
): Promise<Cyclist> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('cyclists')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo actualizar el corredor.'));
  return mapCyclist(data as Record<string, unknown>);
}

export async function setCyclistActive(id: string, active: boolean): Promise<void> {
  requireConfiguration();
  const { error } = await supabase.from('cyclists').update({ active }).eq('id', id);
  if (error) throw new Error(errorMessage(error, 'No se pudo cambiar el estado del corredor.'));
}

export async function setCyclistFeatured(id: string, featured: boolean): Promise<void> {
  requireConfiguration();
  const { error } = await supabase.from('cyclists').update({ featured }).eq('id', id);
  if (error) throw new Error(errorMessage(error, 'No se pudo destacar al corredor.'));
}

export type AchievementInput = Omit<Achievement, 'id' | 'created_at' | 'updated_at'>;

export async function createAchievement(
  payload: AchievementInput,
): Promise<Achievement> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('achievements')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo crear el logro.'));
  return mapAchievement(data as Record<string, unknown>);
}

export async function updateAchievement(
  id: string,
  payload: Partial<AchievementInput>,
): Promise<Achievement> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('achievements')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo actualizar el logro.'));
  return mapAchievement(data as Record<string, unknown>);
}

export async function deleteAchievement(id: string): Promise<void> {
  requireConfiguration();
  const { error } = await supabase.from('achievements').delete().eq('id', id);
  if (error) throw new Error(errorMessage(error, 'No se pudo eliminar el logro.'));
}
