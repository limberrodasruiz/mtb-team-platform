import { DEFAULT_TEAM_NAME } from '../../constants';
import { supabase } from '../../lib/supabaseClient';
import type {
  Banner,
  GalleryItem,
  NewsItem,
  SiteSettings,
  Sponsor,
} from '../../types';

function toFriendly(error: unknown, fallback: string): Error {
  if (error instanceof Error) return new Error(`${fallback}: ${error.message}`);
  return new Error(fallback);
}

export async function getNews(): Promise<NewsItem[]> {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as NewsItem[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener las noticias');
  }
}

export async function getNewsBySlug(slug: string): Promise<NewsItem | null> {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) return null;
    return data as NewsItem;
  } catch (e) {
    throw toFriendly(e, 'No se pudo obtener la noticia');
  }
}

export async function createNews(
  payload: Omit<NewsItem, 'id' | 'created_at'>,
): Promise<NewsItem> {
  try {
    const { data, error } = await supabase
      .from('news')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as NewsItem;
  } catch (e) {
    throw toFriendly(e, 'No se pudo crear la noticia');
  }
}

export async function getGallery(): Promise<GalleryItem[]> {
  try {
    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as GalleryItem[];
  } catch (e) {
    throw toFriendly(e, 'No se pudo obtener la galería');
  }
}

export async function getBanners(): Promise<Banner[]> {
  try {
    const today = new Date().toISOString();
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as Banner[];
    return rows.filter((b) => {
      if (b.start_date && b.start_date > today) return false;
      if (b.end_date && b.end_date < today) return false;
      return true;
    });
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener los banners');
  }
}

export async function getSponsors(): Promise<Sponsor[]> {
  try {
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Sponsor[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener los patrocinadores');
  }
}

export async function getActiveSponsors(): Promise<Sponsor[]> {
  try {
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Sponsor[];
  } catch (e) {
    throw toFriendly(e, 'No se pudieron obtener los patrocinadores activos');
  }
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1)
      .single();
    if (error) return null;
    return data as SiteSettings;
  } catch {
    return {
      id: 'default',
      team_name: DEFAULT_TEAM_NAME,
    };
  }
}

export async function updateSiteSettings(
  id: string,
  payload: Partial<Omit<SiteSettings, 'id'>>,
): Promise<SiteSettings> {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as SiteSettings;
  } catch (e) {
    throw toFriendly(e, 'No se pudo actualizar la configuración del sitio');
  }
}
