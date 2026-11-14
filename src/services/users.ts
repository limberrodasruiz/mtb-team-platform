import { errorMessage } from '../lib/errors';
import { requireConfiguration, supabase } from '../lib/supabase';
import type { Profile, Role } from '../types';

export async function getProfiles(): Promise<Profile[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar los usuarios.'));
  return (data ?? []) as Profile[];
}

export async function getProfileById(id: string): Promise<Profile | null> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar el perfil.'));
  return (data as Profile | null) ?? null;
}

export async function setUserRole(id: string, role: Role): Promise<Profile> {
  requireConfiguration();
  const { data, error } = await supabase.rpc('admin_set_role', {
    p_user_id: id,
    p_role: role,
  });

  if (error) throw new Error(errorMessage(error, 'No se pudo cambiar el rol.'));
  return data as Profile;
}
