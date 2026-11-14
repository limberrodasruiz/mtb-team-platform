import { useEffect } from 'react';
import { useSiteSettings } from '../providers/SiteSettingsProvider';

export function useDocumentTitle(title: string | null | undefined): void {
  const { settings } = useSiteSettings();

  useEffect(() => {
    document.title = title
      ? `${title} · ${settings.team_name}`
      : settings.team_name;
  }, [title, settings.team_name]);
}
