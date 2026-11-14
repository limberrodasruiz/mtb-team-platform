import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_DESCRIPTION,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  DEFAULT_SHORT_NAME,
  DEFAULT_SLOGAN,
  DEFAULT_TEAM_NAME,
} from '../constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { errorMessage } from '../lib/errors';
import type { SiteSettings } from '../types';
import { contrastText, darken, lighten, normalizeHex } from '../utils/color';
import { getSiteSettings } from '../services/settings';
import { resolveMediaUrl } from '../services/storage';

export const DEFAULT_SITE: SiteSettings = {
  id: 1,
  team_name: DEFAULT_TEAM_NAME,
  short_name: DEFAULT_SHORT_NAME,
  slogan: DEFAULT_SLOGAN,
  description: DEFAULT_DESCRIPTION,
  history: null,
  founded_year: null,
  logo_path: null,
  logo_url: null,
  email: null,
  contact_email: null,
  whatsapp: null,
  whatsapp_message: null,
  facebook: null,
  instagram: null,
  tiktok: null,
  youtube: null,
  primary_color: DEFAULT_PRIMARY_COLOR,
  secondary_color: DEFAULT_SECONDARY_COLOR,
  accent_color: DEFAULT_ACCENT_COLOR,
  mission: null,
  objectives: null,
  activities: null,
  achievements: null,
  address: null,
  hero_image_path: null,
  hero_image_url: null,
  sponsor_info: null,
  sponsor_email: null,
  join_info: null,
  updated_at: '',
};

interface SiteSettingsContextValue {
  settings: SiteSettings;
  raw: SiteSettings | null;
  loading: boolean;
  error: string | null;
  isFallback: boolean;
  refresh: () => Promise<void>;
  logoUrl: string | null;
  heroUrl: string | null;
  contactEmail: string | null;
  whatsappNumber: string | null;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null);

function applyTheme(settings: SiteSettings): void {
  const root = document.documentElement;
  const primary = normalizeHex(settings.primary_color, DEFAULT_PRIMARY_COLOR);
  const secondary = normalizeHex(settings.secondary_color, DEFAULT_SECONDARY_COLOR);
  const accent = normalizeHex(settings.accent_color, DEFAULT_ACCENT_COLOR);

  root.style.setProperty('--brand', primary);
  root.style.setProperty('--brand-dark', darken(primary, 0.22));
  root.style.setProperty('--brand-darker', darken(primary, 0.4));
  root.style.setProperty('--brand-soft', lighten(primary, 0.93));
  root.style.setProperty('--brand-mid', lighten(primary, 0.82));
  root.style.setProperty('--brand-contrast', contrastText(primary));
  root.style.setProperty('--secondary', secondary);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-contrast', contrastText(accent));

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', primary);
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setError('Supabase no está configurado.');
      return;
    }

    setLoading(true);
    try {
      const settings = await getSiteSettings();
      setRaw(settings);
      setError(null);
    } catch (err) {
      setRaw(null);
      setError(errorMessage(err, 'No se pudo cargar la configuración del sitio.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const settings = raw ?? DEFAULT_SITE;
  const logoUrl = useMemo(
    () => resolveMediaUrl(settings.logo_path, settings.logo_url, 'banners'),
    [settings.logo_path, settings.logo_url],
  );
  const heroUrl = useMemo(
    () => resolveMediaUrl(settings.hero_image_path, settings.hero_image_url, 'banners'),
    [settings.hero_image_path, settings.hero_image_url],
  );

  useEffect(() => {
    applyTheme(settings);
  }, [
    settings.primary_color,
    settings.secondary_color,
    settings.accent_color,
    settings,
  ]);

  const value = useMemo<SiteSettingsContextValue>(
    () => ({
      settings,
      raw,
      loading,
      error,
      isFallback: !raw,
      refresh: load,
      logoUrl,
      heroUrl,
      contactEmail: settings.contact_email || settings.email,
      whatsappNumber: settings.whatsapp,
    }),
    [settings, raw, loading, error, load, logoUrl, heroUrl],
  );

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettingsContextValue {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    throw new Error('useSiteSettings debe usarse dentro de SiteSettingsProvider.');
  }
  return context;
}
