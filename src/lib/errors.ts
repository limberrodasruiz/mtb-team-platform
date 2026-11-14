interface SupabaseLikeError {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}

function getSupabaseError(error: unknown): SupabaseLikeError | null {
  if (error && typeof error === 'object' && 'message' in error) {
    return error as SupabaseLikeError;
  }
  return null;
}

const FRIENDLY_CODES: Record<string, string> = {
  '23505': 'Ya existe un registro con esos datos. Revisa los campos únicos (por ejemplo correo, slug o período).',
  '23503': 'El registro está relacionado con otros datos y no se puede completar la operación.',
  '23514': 'Alguno de los valores no cumple las reglas de la base de datos.',
  '42501': 'Tu rol no tiene permisos para realizar esta operación.',
  PGRST116: 'No se encontró el registro solicitado.',
  PGRST301: 'La sesión expiró. Vuelve a iniciar sesión.',
};

const NETWORK_HINTS = [
  'failed to fetch',
  'fetch failed',
  'load failed',
  'networkerror',
  'network error',
  'enotfound',
  'eai_again',
  'name_not_resolved',
  'err_name_not_resolved',
  'offline',
  'typeerror: fetch',
];

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const text = error.message.toLowerCase();
    if (NETWORK_HINTS.some((hint) => text.includes(hint))) {
      return 'No se pudo conectar con Supabase. Verifica tu conexión y que el proyecto esté activo.';
    }
    return error.message;
  }

  const sb = getSupabaseError(error);
  if (sb) {
    if (sb.code && FRIENDLY_CODES[sb.code]) {
      return FRIENDLY_CODES[sb.code];
    }
    const text = `${sb.message ?? ''} ${sb.details ?? ''}`.toLowerCase();
    if (NETWORK_HINTS.some((hint) => text.includes(hint))) {
      return 'No se pudo conectar con Supabase. Verifica tu conexión y que el proyecto esté activo.';
    }
    if (sb.message) return sb.message;
  }

  return fallback;
}

export function assertData<T>(
  result: { data: T | null; error: unknown },
  fallback: string,
): T {
  if (result.error) throw new Error(errorMessage(result.error, fallback));
  return result.data as T;
}
