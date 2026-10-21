import { Link } from 'react-router-dom';
import { Hero } from '../../components/public/Hero';
import { StatsBar } from '../../components/public/StatsBar';
import { SectionTitle } from '../../components/public/SectionTitle';
import { CyclistCard } from '../../components/public/CyclistCard';
import { RaceCard } from '../../components/public/RaceCard';
import { NewsCard } from '../../components/public/NewsCard';
import { SponsorGrid } from '../../components/public/SponsorGrid';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getActiveCyclists, getFeaturedCyclists } from '../../services/supabase/cyclists';
import { getRaces, getUpcomingRaces } from '../../services/supabase/races';
import { getResults } from '../../services/supabase/results';
import { getTeamRanking } from '../../services/supabase/rankings';
import { getActiveSponsors, getNews, getSiteSettings } from '../../services/supabase/content';
import type { Race, Cyclist, NewsItem, Sponsor, SiteSettings } from '../../types';

interface HomeData {
  settings: SiteSettings | null;
  active: Cyclist[];
  featured: Cyclist[];
  upcoming: Race[];
  races: Race[];
  results: Awaited<ReturnType<typeof getResults>>;
  news: NewsItem[];
  sponsors: Sponsor[];
  podiums: number;
  wins: number;
}

function raceName(races: Race[], id: string): string {
  return races.find((r) => r.id === id)?.name ?? 'Carrera';
}

function cyclistName(cyclists: Cyclist[], id: string): string {
  return cyclists.find((c) => c.id === id)?.full_name ?? 'Corredor';
}

async function fetchHome(): Promise<HomeData> {
  const [settings, active, featured, upcoming, races, results, news, sponsors, ranking] =
    await Promise.all([
      getSiteSettings(),
      getActiveCyclists(),
      getFeaturedCyclists(),
      getUpcomingRaces(),
      getRaces(),
      getResults(),
      getNews(),
      getActiveSponsors(),
      getTeamRanking(),
    ]);
  const podiums = ranking.reduce((acc, r) => acc + (r.podiums ?? 0), 0);
  const wins = ranking.reduce((acc, r) => acc + (r.wins ?? 0), 0);
  return { settings, active, featured, upcoming, races, results, news, sponsors, podiums, wins };
}

export function Home() {
  const { data, loading, error, reload } = useSupabaseQuery(fetchHome);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState
          title="Supabase no configurado"
          description="Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para ver el contenido del equipo."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center px-4 py-16">
        <Spinner label="Cargando inicio…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorState message={error ?? 'No se pudo cargar el inicio.'} onRetry={reload} />
      </div>
    );
  }

  const teamName = data.settings?.team_name ?? 'MTB Team';
  const slogan = data.settings?.slogan ?? 'Pasión por el MTB';
  const heroImage =
    (data.settings as unknown as Record<string, unknown> | null)?.logo_url ??
    (data.settings as unknown as Record<string, unknown> | null)?.logo_path ??
    data.upcoming[0]?.image_url ??
    null;

  const highlighted = data.featured.length > 0 ? data.featured : data.active.slice(0, 4);
  const latestResults = [...data.results]
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .slice(0, 6);
  const recentNews = data.news.slice(0, 3);

  return (
    <div>
      <Hero
        title={teamName}
        subtitle={slogan}
        imageUrl={typeof heroImage === 'string' ? heroImage : undefined}
        eyebrow="Equipo de mountain bike"
        ctas={[
          { label: 'Ver corredores', to: '/corredores' },
          { label: 'Próximas carreras', to: '/carreras', variant: 'secondary' },
        ]}
      />

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10">
        <StatsBar
          stats={[
            { label: 'Corredores activos', value: data.active.length },
            { label: 'Podios', value: data.podiums },
            { label: 'Victorias', value: data.wins },
            { label: 'Carreras', value: data.races.length },
          ]}
        />

        <section>
          <SectionTitle
            title="Corredores destacados"
            subtitle="Talento del equipo en cada categoría."
            action={
              <Link to="/corredores" className="text-sm font-medium text-brand-600 hover:underline">
                Ver todos →
              </Link>
            }
          />
          {highlighted.length === 0 ? (
            <EmptyState
              title="Sin corredores destacados"
              description="Pronto publicaremos a los corredores destacados."
              className="mt-4"
            />
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {highlighted.map((c) => (
                <CyclistCard key={c.id} cyclist={c} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle
            title="Próximas carreras"
            subtitle="Calendario oficial del equipo."
            action={
              <Link to="/carreras" className="text-sm font-medium text-brand-600 hover:underline">
                Ver calendario →
              </Link>
            }
          />
          {data.upcoming.length === 0 ? (
            <EmptyState
              title="Sin próximas carreras"
              description="No hay carreras programadas por el momento."
              className="mt-4"
            />
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.upcoming.slice(0, 3).map((race) => (
                <RaceCard key={race.id} race={race} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle
            title="Últimos resultados"
            subtitle="Puntos y posiciones recientes."
            action={
              <Link to="/resultados" className="text-sm font-medium text-brand-600 hover:underline">
                Ver resultados →
              </Link>
            }
          />
          <div className="mt-4">
            <Table
              columns={[
                { key: 'race', header: 'Carrera', render: (r) => raceName(data.races, r.race_id) },
                { key: 'cyclist', header: 'Corredor', render: (r) => cyclistName(data.active, r.cyclist_id) },
                { key: 'position', header: 'Pos.', render: (r) => `#${r.position}` },
                { key: 'points', header: 'Puntos', render: (r) => r.points },
              ]}
              data={latestResults}
              keyExtractor={(r) => r.id}
              emptyMessage="Aún no hay resultados publicados."
            />
          </div>
        </section>

        <section>
          <SectionTitle
            title="Noticias recientes"
            action={
              <Link to="/noticias" className="text-sm font-medium text-brand-600 hover:underline">
                Ver noticias →
              </Link>
            }
          />
          {recentNews.length === 0 ? (
            <EmptyState title="Sin noticias" description="Pronto publicaremos novedades." className="mt-4" />
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentNews.map((n) => (
                <NewsCard key={n.id} item={n} />
              ))}
            </div>
          )}
        </section>

        {data.sponsors.length > 0 ? (
          <section>
            <SectionTitle
              title="Auspiciadores"
              subtitle="Marcas que impulsan al equipo."
              action={
                <Link to="/auspiciadores" className="text-sm font-medium text-brand-600 hover:underline">
                  Ver todos →
                </Link>
              }
            />
            <SponsorGrid sponsors={data.sponsors} className="mt-4" />
          </section>
        ) : null}

        <section className="rounded-2xl bg-slate-900 px-6 py-10 text-center text-white sm:px-10">
          <h2 className="text-2xl font-bold">¿Quieres auspiciar al equipo?</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-300">
            Tu marca en cada carrera, en uniformes, redes y eventos. Escríbenos y sé parte del equipo.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to="/auspiciadores"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Ser auspiciador
            </Link>
            <Link
              to="/contacto"
              className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
            >
              Contacto
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;
