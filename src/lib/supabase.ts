import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
const normalizedUrl = (url ?? '').toLowerCase();
const normalizedKey = (anonKey ?? '').toLowerCase();

export const isSupabaseConfigured = Boolean(
  url &&
    anonKey &&
    !normalizedUrl.includes('placeholder.supabase.co') &&
    !normalizedUrl.includes('tu-proyecto') &&
    !normalizedKey.includes('tu_anon_key'),
);

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export function requireConfiguration(): void {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase no está configurado. Copia .env.example a .env y completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
    );
  }
}
