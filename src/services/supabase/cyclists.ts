import { supabase } from '../../lib/supabaseClient';
import type { Cyclist, CyclistStats } from '../../types';

function toFriendly(error: unknown, fallback: string): Error {
  if (error instanceof Error) return new Error(`${fallback}: ${error.message}`);
  return new Error(fallback);
}

export async function getCyclists(): Promise<Cyclist[]> {
  try {
    const { data, error } = await supabase
      .from('cyclists')
      .select('*')
      .order('full_name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Cyclist[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener los ciclistas');
  }
}

export async function getActiveCyclists(): Promise<Cyclist[]> {
  try {
    const { data, error } = await supabase
      .from('cyclists')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Cyclist[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener los ciclistas activos');
  }
}

export async function getFeaturedCyclists(): Promise<Cyclist[]> {
  try {
    const { data, error } = await supabase
      .from('cyclists')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('full_name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Cyclist[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener los ciclistas destacados');
  }
}

export async function getCyclistBySlug(slug: string): Promise<Cyclist | null> {
  try {
    const { data, error } = await supabase
      .from('cyclists')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) return null;
    return data as Cyclist;
  } catch (e) {
    throw toFriendly(e, 'No se pudo obtener el ciclista');
  }
}

export async function getCyclistStats(cyclistId: string): Promise<CyclistStats> {
  try {
    const { data, error } = await supabase
      .from('race_results')
      .select('position, points')
      .eq('cyclist_id', cyclistId);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ position: number; points: number }>;
    let wins = 0;
    let seconds = 0;
    let thirds = 0;
    let totalPoints = 0;
    let best: number | null = null;
    for (const r of rows) {
      totalPoints += r.points ?? 0;
      if (r.position === 1) wins += 1;
      else if (r.position === 2) seconds += 1;
      else if (r.position === 3) thirds += 1;
      if (best === null || r.position < best) best = r.position;
    }
    return {
      cyclist_id: cyclistId,
      total_races: rows.length,
      total_points: totalPoints,
      wins,
      seconds,
      thirds,
      podiums: wins + seconds + thirds,
      best_position: best,
    };
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener las estadísticas del ciclista');
  }
}

export async function createCyclist(
  payload: Omit<Cyclist, 'id' | 'created_at'>,
): Promise<Cyclist> {
  try {
    const { data, error } = await supabase
      .from('cyclists')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Cyclist;
  } catch (e) {
    throw toFriendly(e, 'No se pudo crear el ciclista');
  }
}

export async function updateCyclist(
  id: string,
  payload: Partial<Omit<Cyclist, 'id' | 'created_at'>>,
): Promise<Cyclist> {
  try {
    const { data, error } = await supabase
      .from('cyclists')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Cyclist;
  } catch (e) {
    throw toFriendly(e, 'No se pudo actualizar el ciclista');
  }
}

export async function deactivateCyclist(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('cyclists')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  } catch (e) {
    throw toFriendly(e, 'No se pudo desactivar el ciclista');
  }
}
