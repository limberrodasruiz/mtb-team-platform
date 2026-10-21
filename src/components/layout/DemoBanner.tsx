import { useEffect, useState } from 'react';
import {
  getSupabaseUrl,
  isSupabaseFallbackActive,
  isUsingDemoData,
  onSupabaseFallback,
} from '../../lib/supabaseClient';

export function DemoBanner() {
  const [fallback, setFallback] = useState(() =>
    isSupabaseFallbackActive(),
  );

  useEffect(() => {
    const off = onSupabaseFallback(() => setFallback(true));
    const onEvent = () => setFallback(true);
    window.addEventListener('mtb:supabase-fallback', onEvent);
    return () => {
      off();
      window.removeEventListener('mtb:supabase-fallback', onEvent);
    };
  }, []);

  if (isUsingDemoData()) {
    return (
      <div className="bg-amber-400 px-4 py-2 text-center text-xs font-semibold text-amber-950">
        Modo demo local: datos de prueba en memoria, se pierden al recargar. Para datos
        reales configura Supabase (ver <span className="underline">docs/supabase-desde-cero.md</span>).
        Admin demo: <span className="font-mono">admin@equipo.bo / admin123</span>
      </div>
    );
  }

  if (!fallback) return null;

  return (
    <div className="bg-red-600 px-4 py-2 text-center text-xs font-semibold text-white">
      No se pudo conectar a Supabase ({getSupabaseUrl() || 'URL no configurada'}): mostrando
      datos demo en memoria. Verifica tu conexión, que el proyecto no esté pausado/eliminado
      y que VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY sean correctos en .env (reinicia con{' '}
      <span className="font-mono">npm run dev</span>).
    </div>
  );
}
