import { errorMessage } from '../lib/errors';
import { requireConfiguration, supabase } from '../lib/supabase';
import type { SiteSettings } from '../types';
import { mapSettings } from './mappers';

const FALLBACK_MESSAGE = 'No se pudo cargar la configuración del sitio.';

export async function getSiteSettings(): Promise<SiteSettings | null> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw new Error(errorMessage(error, FALLBACK_MESSAGE));
  return data ? mapSettings(data as Record<string, unknown>) : null;
}

export async function updateSiteSettings(
  payload: Partial<Omit<SiteSettings, 'id' | 'updated_at'>>,
): Promise<SiteSettings> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('site_settings')
    .update(payload)
    .eq('id', 1)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo guardar la configuración.'));
  return mapSettings(data as Record<string, unknown>);
}
