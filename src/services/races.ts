import { errorMessage } from '../lib/errors';
import { requireConfiguration, supabase } from '../lib/supabase';
import type {
  Race,
  RaceRegistration,
  RegistrationStatus,
} from '../types';
import { todayISO } from '../utils/format';
import { mapRace } from './mappers';

export type RaceInput = Omit<Race, 'id' | 'created_at' | 'updated_at'>;

export interface RegistrationWithCyclist extends RaceRegistration {
  cyclist_name: string | null;
  cyclist_slug: string | null;
  cyclist_photo_url: string | null;
}

interface RawRegistration extends Record<string, unknown> {
  cyclists?:
    | { full_name?: string | null; slug?: string | null; photo_url?: string | null }
    | null;
}

function parseRegistration(row: RawRegistration): RegistrationWithCyclist {
  return {
    ...(row as unknown as RaceRegistration),
    cyclist_name: row.cyclists?.full_name ?? null,
    cyclist_slug: row.cyclists?.slug ?? null,
    cyclist_photo_url: row.cyclists?.photo_url ?? null,
  };
}

export async function getPublicRaces(): Promise<Race[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('races')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar las carreras.'));
  return (data ?? []).map((row) => mapRace(row as Record<string, unknown>));
}

export async function getAdminRaces(): Promise<Race[]> {
  return getPublicRaces();
}

export async function getUpcomingRaces(limit = 6): Promise<Race[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('races')
    .select('*')
    .gte('date', todayISO())
    .neq('status', 'CANCELADA')
    .order('date', { ascending: true })
    .limit(limit);

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar las próximas carreras.'));
  return (data ?? []).map((row) => mapRace(row as Record<string, unknown>));
}

export async function getRaceBySlug(slug: string): Promise<Race | null> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('races')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar la carrera.'));
  return data ? mapRace(data as Record<string, unknown>) : null;
}

export async function getRaceById(id: string): Promise<Race | null> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('races')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar la carrera.'));
  return data ? mapRace(data as Record<string, unknown>) : null;
}

export async function createRace(payload: RaceInput): Promise<Race> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('races')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo crear la carrera.'));
  return mapRace(data as Record<string, unknown>);
}

export async function updateRace(
  id: string,
  payload: Partial<RaceInput>,
): Promise<Race> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('races')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo actualizar la carrera.'));
  return mapRace(data as Record<string, unknown>);
}

export async function getRaceRegistrations(
  raceId: string,
): Promise<RegistrationWithCyclist[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('race_registrations')
    .select('id, race_id, cyclist_id, status, created_at, cyclists(full_name, slug, photo_url)')
    .eq('race_id', raceId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar las inscripciones.'));
  return (data ?? []).map((row) => parseRegistration(row as RawRegistration));
}

export async function addRaceRegistration(
  raceId: string,
  cyclistId: string,
): Promise<void> {
  requireConfiguration();
  const { error } = await supabase.from('race_registrations').insert({
    race_id: raceId,
    cyclist_id: cyclistId,
    status: 'INSCRITO',
  });
  if (error) throw new Error(errorMessage(error, 'No se pudo inscribir al corredor.'));
}

export async function updateRaceRegistration(
  id: string,
  status: RegistrationStatus,
): Promise<void> {
  requireConfiguration();
  const { error } = await supabase
    .from('race_registrations')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(errorMessage(error, 'No se pudo actualizar la inscripción.'));
}

export async function removeRaceRegistration(id: string): Promise<void> {
  requireConfiguration();
  const { error } = await supabase.from('race_registrations').delete().eq('id', id);
  if (error) throw new Error(errorMessage(error, 'No se pudo quitar la inscripción.'));
}
