import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useSiteSettings } from '../../providers/SiteSettingsProvider';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function ConfigNotice() {
  const { error } = useSiteSettings();
  if (!import.meta.env.DEV) return null;
  if (isSupabaseConfigured && !error) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
      <span className="inline-flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        {isSupabaseConfigured
          ? `Modo desarrollo: ${error}`
          : 'Modo desarrollo: Supabase no está configurado. Las secciones públicas mostrarán estados vacíos.'}
      </span>
    </div>
  );
}

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-lg"
      >
        Saltar al contenido
      </a>
      <ScrollToTop />
      <ConfigNotice />
      <Navbar />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
