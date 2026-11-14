import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Flag, MapPin, Search } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getPublicRaces } from '../../services/races';
import type { Race } from '../../types';
import { todayISO } from '../../utils/format';
import { RaceCard } from '../../components/public/RaceCard';
import { PublicPageHero } from '../../components/public/PublicPageHero';
import { Section } from '../../components/public/SectionHeading';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { buttonStyles } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { cn } from '../../utils/cn';

type View = 'proximas' | 'resultados' | 'todas';

function isUpcoming(race: Race): boolean {
  return race.date >= todayISO() && race.status !== 'CANCELADA';
}

export function RacesPage() {
  useDocumentTitle('Carreras');
  const [view, setView] = useState<View>('proximas');
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useAsync(getPublicRaces, []);

  const races = useMemo(() => data ?? [], [data]);
  const upcoming = races
    .filter(isUpcoming)
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = races
    .filter((race) => !isUpcoming(race))
    .sort((a, b) => b.date.localeCompare(a.date));

  const filtered = useMemo(() => {
    const base = view === 'proximas' ? upcoming : view === 'resultados' ? past : races;
    const term = search.trim().toLowerCase();
    if (!term) return base;
    return base.filter((race) =>
      [race.name, race.place, race.city, race.department, race.organizer, race.race_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [view, races, upcoming, past, search]);

  const groupedByYear = useMemo(() => {
    if (view !== 'resultados') return null;
    const groups = new Map<string, Race[]>();
    for (const race of filtered) {
      const year = race.date.slice(0, 4);
      const list = groups.get(year) ?? [];
      list.push(race);
      groups.set(year, list);
    }
    return Array.from(groups.entries());
  }, [filtered, view]);

  return (
    <>
      <PublicPageHero
        eyebrow="Calendario"
        title="Carreras"
        description="El calendario competitivo del equipo: próximas fechas, sedes y resultados de cada competencia."
        crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Carreras' }]}
        compact
      />

      <Section className="pt-10 sm:pt-12">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            items={[
              { id: 'proximas', label: 'Próximas', count: upcoming.length },
              { id: 'resultados', label: 'Disputadas', count: past.length },
              { id: 'todas', label: 'Todas', count: races.length },
            ]}
            value={view}
            onChange={(value) => setView(value as View)}
            ariaLabel="Filtrar carreras"
            className="border-b-0"
          />
          <div className="relative w-full lg:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar carrera o sede…"
              aria-label="Buscar carreras"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
            />
          </div>
        </div>

        {loading ? (
          <LoadingBlock message="Cargando calendario…" />
        ) : error ? (
          <ErrorState
            title="No se pudo cargar el calendario"
            message={error}
            onRetry={reload}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={
              search
                ? 'Sin carreras para esa búsqueda'
                : view === 'proximas'
                  ? 'No hay carreras programadas'
                  : 'Todavía no hay carreras registradas'
            }
            description={
              search
                ? 'Prueba con otro nombre, ciudad o tipo de carrera.'
                : 'Cuando el equipo confirme una competencia, aparecerá aquí con fecha, sede e inscripciones.'
            }
            action={
              search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className={buttonStyles('outline', 'md')}
                >
                  Limpiar búsqueda
                </button>
              ) : (
                <Link to="/resultados" className={buttonStyles('primary', 'md')}>
                  Ver resultados
                </Link>
              )
            }
          />
        ) : groupedByYear ? (
          <div className="space-y-12">
            {groupedByYear.map(([year, yearRaces]) => (
              <div key={year}>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="font-display text-3xl font-bold uppercase leading-none text-slate-300">
                    {year}
                  </h2>
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {yearRaces.length} carreras
                  </span>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {yearRaces.map((race) => (
                    <RaceCard key={race.id} race={race} past />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={cn('grid gap-3', view === 'todas' ? 'lg:grid-cols-2' : 'lg:grid-cols-2')}>
            {filtered.map((race) => (
              <RaceCard key={race.id} race={race} past={!isUpcoming(race)} />
            ))}
          </div>
        )}

        <div className="mt-12 grid gap-5 rounded-2xl bg-[var(--secondary)] p-6 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              <Flag className="h-4 w-4" aria-hidden />
              Resultados oficiales
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase leading-none">
              ¿Buscas un resultado?
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Consulta el historial completo por carrera, corredor y temporada, con tiempos,
              posiciones y puntos.
            </p>
          </div>
          <Link to="/resultados" className={buttonStyles('primary', 'lg')}>
            Ver resultados
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            Sedes en Bolivia
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Calendario actualizado por el equipo
          </span>
        </div>
      </Section>
    </>
  );
}
