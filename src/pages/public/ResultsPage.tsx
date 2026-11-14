import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, Filter, Search, Trophy } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getPublicResults } from '../../services/results';
import { getPublicRaces } from '../../services/races';
import { getPublicCategories } from '../../services/categories';
import type { Category, Race, ResultWithRelations } from '../../types';
import { downloadCsv } from '../../utils/csv';
import { formatDate, ordinal, yearOptions } from '../../utils/format';
import { buttonStyles } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { PublicPageHero } from '../../components/public/PublicPageHero';
import { Section } from '../../components/public/SectionHeading';

interface PageData {
  results: ResultWithRelations[];
  races: Race[];
  categories: Category[];
}

export function ResultsPage() {
  useDocumentTitle('Resultados');
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const raceSlug = params.get('carrera') ?? '';

  const { data, loading, error, reload } = useAsync<PageData>(async () => {
    const [results, races, categories] = await Promise.all([
      getPublicResults(),
      getPublicRaces(),
      getPublicCategories(),
    ]);
    return { results, races, categories };
  }, []);

  const raceId = (data?.races ?? []).find((race) => race.slug === raceSlug)?.id ?? '';

  const years = useMemo(() => {
    const fromData = new Set<string>();
    for (const result of data?.results ?? []) {
      const resultYear = (result.race_date ?? '').slice(0, 4);
      if (resultYear) fromData.add(resultYear);
    }
    const options = yearOptions(6).map(String);
    for (const option of options) fromData.add(option);
    return Array.from(fromData).sort((a, b) => b.localeCompare(a));
  }, [data?.results]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.results ?? [])
      .filter((result) => {
        if (year && !(result.race_date ?? '').startsWith(year)) return false;
        if (raceId && result.race_id !== raceId) return false;
        if (categoryId && result.category_id !== categoryId) return false;
        if (status && result.result_status !== status) return false;
        if (!term) return true;
        return [result.cyclist_name, result.race_name, result.category_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => {
        const dateCompare = (b.race_date ?? '').localeCompare(a.race_date ?? '');
        if (dateCompare !== 0) return dateCompare;
        const aPos = a.position ?? 9999;
        const bPos = b.position ?? 9999;
        return aPos - bPos;
      });
  }, [data?.results, year, raceId, categoryId, status, search]);

  function updateRace(slug: string) {
    if (slug) params.set('carrera', slug);
    else params.delete('carrera');
    setParams(params, { replace: true });
  }

  function clearFilters() {
    setSearch('');
    setYear('');
    setCategoryId('');
    setStatus('');
    updateRace('');
  }

  function exportCsv() {
    downloadCsv(
      `resultados-${year || 'todos'}`,
      ['Fecha', 'Carrera', 'Corredor', 'Categoría', 'Posición', 'Estado', 'Tiempo', 'Puntos'],
      filtered.map((result) => [
        result.race_date ?? '',
        result.race_name ?? '',
        result.cyclist_name ?? '',
        result.category_name ?? '',
        result.position ?? '',
        result.result_status,
        result.time_text ?? '',
        result.points,
      ]),
    );
  }

  const activeFilters = [year, raceId, categoryId, status, search].filter(Boolean).length;

  return (
    <>
      <PublicPageHero
        eyebrow="Historial competitivo"
        title="Resultados"
        description="Todas las competencias del equipo, con posiciones, tiempos y puntos obtenidos por cada corredor."
        crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Resultados' }]}
        compact
      />

      <Section className="pt-10 sm:pt-12">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-end gap-4">
            <label className="min-w-[130px] flex-1">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Temporada
              </span>
              <select
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
              >
                <option value="">Todas</option>
                {years.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-[180px] flex-[1.4]">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Carrera
              </span>
              <select
                value={raceSlug}
                onChange={(event) => updateRace(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
              >
                <option value="">Todas las carreras</option>
                {(data?.races ?? []).map((race) => (
                  <option key={race.id} value={race.slug}>
                    {race.name} ({race.date.slice(0, 4)})
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-[150px] flex-1">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Categoría
              </span>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
              >
                <option value="">Todas</option>
                {(data?.categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-[140px] flex-1">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Estado
              </span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
              >
                <option value="">Todos</option>
                <option value="FINISHED">Finalizó</option>
                <option value="DNF">Abandonó</option>
                <option value="DSQ">Descalificado</option>
                <option value="DNS">No largó</option>
              </select>
            </label>

            <div className="relative min-w-[180px] flex-[1.2]">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Buscar
              </span>
              <Search
                className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-slate-400"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Corredor o carrera…"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5" aria-hidden />
              {loading
                ? 'Cargando…'
                : `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'}`}
              {activeFilters > 0 && ` · ${activeFilters} filtro${activeFilters === 1 ? '' : 's'}`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {activeFilters > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
                >
                  Limpiar filtros
                </button>
              )}
              <button
                type="button"
                onClick={exportCsv}
                disabled={filtered.length === 0}
                className={buttonStyles('outline', 'sm')}
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Exportar CSV
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingBlock message="Cargando resultados…" />
        ) : error ? (
          <ErrorState
            title="No se pudieron cargar los resultados"
            message={error}
            onRetry={reload}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title={activeFilters > 0 ? 'Sin resultados para estos filtros' : 'Resultados en preparación'}
            description={
              activeFilters > 0
                ? 'No encontramos resultados que coincidan. Prueba con otra temporada, carrera o corredor.'
                : 'Los resultados oficiales se publicarán a medida que el equipo compita.'
            }
            action={
              activeFilters > 0 ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className={buttonStyles('outline', 'md')}
                >
                  Limpiar filtros
                </button>
              ) : (
                <Link to="/carreras" className={buttonStyles('primary', 'md')}>
                  Ver calendario
                </Link>
              )
            }
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-display text-2xl font-bold uppercase leading-none text-slate-950">
                  Clasificaciones oficiales
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Ordenadas por fecha de carrera. Los resultados anulados no se muestran.
                </p>
              </div>
              <Link
                to="/ranking"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-soft)] px-3 py-2 text-xs font-semibold text-[var(--brand-dark)] transition hover:bg-[var(--brand-mid)]"
              >
                <Trophy className="h-3.5 w-3.5" aria-hidden />
                Ver ranking
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Carrera</th>
                    <th className="px-4 py-3 text-left">Corredor</th>
                    <th className="px-4 py-3 text-left">Categoría</th>
                    <th className="px-4 py-3 text-center">Pos.</th>
                    <th className="px-4 py-3 text-left">Tiempo</th>
                    <th className="px-5 py-3 text-right">Puntos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((result) => (
                    <tr key={result.id} className="transition hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-500" data-label="Fecha">
                        {formatDate(result.race_date)}
                      </td>
                      <td className="px-4 py-3.5" data-label="Carrera">
                        <span className="font-medium text-slate-900">
                          {result.race_name || 'Carrera'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" data-label="Corredor">
                        {result.cyclist_slug ? (
                          <Link
                            to={`/corredores/${result.cyclist_slug}`}
                            className="font-medium text-slate-900 transition hover:text-[var(--brand-dark)]"
                          >
                            {result.cyclist_name || 'Corredor'}
                          </Link>
                        ) : (
                          <span className="text-slate-700">{result.cyclist_name || 'Corredor'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500" data-label="Categoría">
                        {result.category_name || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center" data-label="Posición">
                        {result.result_status === 'FINISHED' ? (
                          <span className="font-display text-base font-bold tabular-nums text-slate-900">
                            {ordinal(result.position)}
                          </span>
                        ) : (
                          <StatusBadge status={result.result_status} />
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500" data-label="Tiempo">
                        {result.time_text || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-900" data-label="Puntos">
                        {result.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>
    </>
  );
}
