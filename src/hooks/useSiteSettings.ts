import { useEffect, useState } from 'react';
import { DEFAULT_TEAM_NAME } from '../constants';
import { getSiteSettings } from '../services/supabase/content';
import type { SiteSettings } from '../types';

function defaultSettings(): SiteSettings {
  return {
    id: 'default',
    team_name: DEFAULT_TEAM_NAME,
    slogan: 'Pasión por el MTB',
    logo_url: null,
    primary_color: null,
    contact_email: null,
    contact_phone: null,
    address: null,
    social_facebook: null,
    social_instagram: null,
    social_tiktok: null,
    about_text: null,
  };
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(() =>
    defaultSettings(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSiteSettings()
      .then((s) => {
        if (active && s) setSettings(s);
      })
      .catch(() => {
        if (active) setSettings(defaultSettings());
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { settings, loading };
}
