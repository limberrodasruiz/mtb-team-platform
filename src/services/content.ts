import { errorMessage } from '../lib/errors';
import { requireConfiguration, supabase } from '../lib/supabase';
import type {
  Banner,
  GalleryItem,
  NewsItem,
  NewsStatus,
  Sponsor,
} from '../types';
import { mapBanner, mapGallery, mapNews, mapSponsor } from './mappers';

export interface Paged<T> {
  items: T[];
  total: number;
}

export type NewsInput = Omit<
  NewsItem,
  'id' | 'created_at' | 'updated_at'
>;

export type BannerInput = Omit<Banner, 'id' | 'created_at' | 'updated_at'>;

export type SponsorInput = Omit<Sponsor, 'id' | 'created_at' | 'updated_at'>;

export type GalleryInput = Omit<
  GalleryItem,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'race_name'
  | 'cyclist_name'
  | 'created_by'
>;

const NEWS_FIELDS =
  'id, title, slug, cover_path, cover_url, excerpt, content, published_at, author, category, status, featured, created_at, updated_at';

export async function getPublishedNews(
  limit = 9,
  offset = 0,
): Promise<Paged<NewsItem>> {
  requireConfiguration();
  const now = new Date().toISOString();
  const { data, error, count } = await supabase
    .from('news')
    .select(NEWS_FIELDS, { count: 'exact' })
    .eq('status', 'PUBLICADO')
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar las noticias.'));
  return {
    items: (data ?? []).map((row) => mapNews(row as Record<string, unknown>)),
    total: count ?? 0,
  };
}

export async function getPublishedNewsBySlug(slug: string): Promise<NewsItem | null> {
  requireConfiguration();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('news')
    .select(NEWS_FIELDS)
    .eq('slug', slug)
    .eq('status', 'PUBLICADO')
    .or(`published_at.is.null,published_at.lte.${now}`)
    .maybeSingle();

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar la noticia.'));
  return data ? mapNews(data as Record<string, unknown>) : null;
}

export async function getAdminNews(): Promise<NewsItem[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar las noticias.'));
  return (data ?? []).map((row) => mapNews(row as Record<string, unknown>));
}

export async function createNews(payload: NewsInput): Promise<NewsItem> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('news')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo crear la publicación.'));
  return mapNews(data as Record<string, unknown>);
}

export async function updateNews(
  id: string,
  payload: Partial<NewsInput>,
): Promise<NewsItem> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('news')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo actualizar la publicación.'));
  return mapNews(data as Record<string, unknown>);
}

export async function setNewsStatus(id: string, status: NewsStatus): Promise<void> {
  requireConfiguration();
  const changes: Record<string, unknown> = { status };
  if (status === 'PUBLICADO') changes.published_at = new Date().toISOString();
  const { error } = await supabase.from('news').update(changes).eq('id', id);
  if (error) throw new Error(errorMessage(error, 'No se pudo cambiar el estado.'));
}

export async function deleteNews(id: string): Promise<void> {
  requireConfiguration();
  const { error } = await supabase.from('news').delete().eq('id', id);
  if (error) throw new Error(errorMessage(error, 'No se pudo eliminar la publicación.'));
}

export async function getPublicBanners(): Promise<Banner[]> {
  requireConfiguration();
  const today = new Date().toISOString();
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar los banners.'));
  return (data ?? [])
    .map((row) => mapBanner(row as Record<string, unknown>))
    .filter((banner) => {
      if (banner.starts_at && banner.starts_at > today) return false;
      if (banner.ends_at && banner.ends_at < today) return false;
      return true;
    });
}

export async function getAdminBanners(): Promise<Banner[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar los banners.'));
  return (data ?? []).map((row) => mapBanner(row as Record<string, unknown>));
}

export async function createBanner(payload: BannerInput): Promise<Banner> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('banners')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo crear el banner.'));
  return mapBanner(data as Record<string, unknown>);
}

export async function updateBanner(
  id: string,
  payload: Partial<BannerInput>,
): Promise<Banner> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('banners')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo actualizar el banner.'));
  return mapBanner(data as Record<string, unknown>);
}

export async function deleteBanner(id: string): Promise<void> {
  requireConfiguration();
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw new Error(errorMessage(error, 'No se pudo eliminar el banner.'));
}

interface RawGallery extends Record<string, unknown> {
  races?: { name?: string | null } | null;
  cyclists?: { full_name?: string | null } | null;
}

function parseGallery(row: RawGallery): GalleryItem {
  return {
    ...mapGallery(row),
    race_name: row.races?.name ?? null,
    cyclist_name: row.cyclists?.full_name ?? null,
  };
}

export async function getPublicGallery(
  limit = 12,
  offset = 0,
): Promise<Paged<GalleryItem>> {
  requireConfiguration();
  const { data, error, count } = await supabase
    .from('gallery')
    .select('*, races(name), cyclists(full_name)', { count: 'exact' })
    .eq('published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar la galería.'));
  return {
    items: (data ?? []).map((row) => parseGallery(row as RawGallery)),
    total: count ?? 0,
  };
}

export async function getGalleryForCyclist(
  cyclistId: string,
  limit = 8,
): Promise<GalleryItem[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('gallery')
    .select('*, races(name), cyclists(full_name)')
    .eq('published', true)
    .eq('cyclist_id', cyclistId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar la galería.'));
  return (data ?? []).map((row) => parseGallery(row as RawGallery));
}

export async function getGalleryForRace(
  raceId: string,
  limit = 8,
): Promise<GalleryItem[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('gallery')
    .select('*, races(name), cyclists(full_name)')
    .eq('published', true)
    .eq('race_id', raceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar la galería.'));
  return (data ?? []).map((row) => parseGallery(row as RawGallery));
}

export async function getAdminGallery(): Promise<GalleryItem[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('gallery')
    .select('*, races(name), cyclists(full_name)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(errorMessage(error, 'No se pudo cargar la galería.'));
  return (data ?? []).map((row) => parseGallery(row as RawGallery));
}

export async function createGalleryItem(
  payload: GalleryInput,
): Promise<GalleryItem> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('gallery')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo guardar la fotografía.'));
  return mapGallery(data as Record<string, unknown>);
}

export async function updateGalleryItem(
  id: string,
  payload: Partial<GalleryInput>,
): Promise<GalleryItem> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('gallery')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo actualizar la fotografía.'));
  return mapGallery(data as Record<string, unknown>);
}

export async function deleteGalleryItem(id: string): Promise<void> {
  requireConfiguration();
  const { error } = await supabase.from('gallery').delete().eq('id', id);
  if (error) throw new Error(errorMessage(error, 'No se pudo eliminar la fotografía.'));
}

export async function getPublicSponsors(): Promise<Sponsor[]> {
  requireConfiguration();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('sponsors')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar los auspiciadores.'));
  return (data ?? [])
    .map((row) => mapSponsor(row as Record<string, unknown>))
    .filter((sponsor) => {
      if (sponsor.starts_at && sponsor.starts_at > today) return false;
      if (sponsor.ends_at && sponsor.ends_at < today) return false;
      return true;
    });
}

export async function getAdminSponsors(): Promise<Sponsor[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('sponsors')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar los auspiciadores.'));
  return (data ?? []).map((row) => mapSponsor(row as Record<string, unknown>));
}

export async function createSponsor(payload: SponsorInput): Promise<Sponsor> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('sponsors')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo crear el auspiciador.'));
  return mapSponsor(data as Record<string, unknown>);
}

export async function updateSponsor(
  id: string,
  payload: Partial<SponsorInput>,
): Promise<Sponsor> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('sponsors')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo actualizar el auspiciador.'));
  return mapSponsor(data as Record<string, unknown>);
}

export async function deleteSponsor(id: string): Promise<void> {
  requireConfiguration();
  const { error } = await supabase.from('sponsors').delete().eq('id', id);
  if (error) throw new Error(errorMessage(error, 'No se pudo eliminar el auspiciador.'));
}
