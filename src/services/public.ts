import { errorMessage } from '../lib/errors';
import { requireConfiguration, supabase } from '../lib/supabase';
import type {
  Banner,
  NewsItem,
  PublicCyclist,
  PublicStats,
  Race,
  RankingRow,
  Sponsor,
} from '../types';
import { getPublicBanners, getPublishedNews, getPublicSponsors } from './content';
import { getPublicCyclists } from './cyclists';
import { getUpcomingRaces } from './races';
import { getRanking } from './results';
import { mapPublicStats } from './mappers';

export const EMPTY_PUBLIC_STATS: PublicStats = {
  activeCyclists: 0,
  races: 0,
  podiums: 0,
  wins: 0,
  news: 0,
  upcomingRaces: 0,
};

export async function getPublicStats(): Promise<PublicStats> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('v_public_stats')
    .select('*')
    .maybeSingle();

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar las estadísticas.'));
  return mapPublicStats(data as Record<string, unknown> | null);
}

export interface HomeData {
  stats: PublicStats;
  banners: Banner[];
  featured: PublicCyclist[];
  upcoming: Race[];
  news: NewsItem[];
  sponsors: Sponsor[];
  ranking: RankingRow[];
  warnings: string[];
}

export async function getHomeData(): Promise<HomeData> {
  requireConfiguration();
  const warnings: string[] = [];

  async function safe<T>(
    label: string,
    promise: Promise<T>,
    fallback: T,
  ): Promise<T> {
    try {
      return await promise;
    } catch {
      warnings.push(label);
      return fallback;
    }
  }

  const [stats, banners, cyclists, upcoming, newsPage, sponsors, ranking] =
    await Promise.all([
      safe('estadísticas', getPublicStats(), EMPTY_PUBLIC_STATS),
      safe('banners', getPublicBanners(), []),
      safe('corredores', getPublicCyclists(), []),
      safe('carreras', getUpcomingRaces(4), []),
      safe('noticias', getPublishedNews(3), { items: [], total: 0 }),
      safe('auspiciadores', getPublicSponsors(), []),
      safe('ranking', getRanking(), []),
    ]);

  const featured = cyclists.filter((cyclist) => cyclist.featured);
  return {
    stats,
    banners,
    featured: (featured.length > 0 ? featured : cyclists).slice(0, 4),
    upcoming,
    news: newsPage.items,
    sponsors,
    ranking: ranking.slice(0, 5),
    warnings,
  };
}
