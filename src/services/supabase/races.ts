import { supabase } from '../../lib/supabaseClient';
import type { Race, RaceRegistration } from '../../types';

function toFriendly(error: unknown, fallback: string): Error {
  if (error instanceof Error) return new Error(`${fallback}: ${error.message}`);
  return new Error(fallback);
}

export async function getRaces(): Promise<Race[]> {
  try {
    const { data, error } = await supabase
      .from('races')
      .select('*')
      .order('race_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Race[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener las carreras');
  }
}

export async function getUpcomingRaces(): Promise<Race[]> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('races')
      .select('*')
      .gte('race_date', today)
      .neq('status', 'CANCELADA')
      .order('race_date', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Race[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener las próximas carreras');
  }
}

export async function getRaceBySlug(slug: string): Promise<Race | null> {
  try {
    const { data, error } = await supabase
      .from('races')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) return null;
    return data as Race;
  } catch (e) {
    throw toFriendly(e, 'No se pudo obtener la carrera');
  }
}

export async function createRace(
  payload: Omit<Race, 'id' | 'created_at'>,
): Promise<Race> {
  try {
    const { data, error } = await supabase
      .from('races')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Race;
  } catch (e) {
    throw toFriendly(e, 'No se pudo crear la carrera');
  }
}

export async function updateRace(
  id: string,
  payload: Partial<Omit<Race, 'id' | 'created_at'>>,
): Promise<Race> {
  try {
    const { data, error } = await supabase
      .from('races')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Race;
  } catch (e) {
    throw toFriendly(e, 'No se pudo actualizar la carrera');
  }
}

export async function getRaceRegistrations(
  raceId: string,
): Promise<RaceRegistration[]> {
  try {
    const { data, error } = await supabase
      .from('race_registrations')
      .select('*')
      .eq('race_id', raceId);
    if (error) throw error;
    return (data ?? []) as RaceRegistration[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener las inscripciones');
  }
}

export async function registerCyclistToRace(
  raceId: string,
  cyclistId: string,
): Promise<RaceRegistration> {
  try {
    const { data, error } = await supabase
      .from('race_registrations')
      .insert({ race_id: raceId, cyclist_id: cyclistId, status: 'INSCRITO' })
      .select()
      .single();
    if (error) throw error;
    return data as RaceRegistration;
  } catch (e) {
    throw toFriendly(e, 'No se pudo inscribir al ciclista');
  }
}

export async function unregisterFromRace(
  raceId: string,
  cyclistId: string,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('race_registrations')
      .delete()
      .eq('race_id', raceId)
      .eq('cyclist_id', cyclistId);
    if (error) throw error;
  } catch (e) {
    throw toFriendly(e, 'No se pudo eliminar la inscripción');
  }
}
