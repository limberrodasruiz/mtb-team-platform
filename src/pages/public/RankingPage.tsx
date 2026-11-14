import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Info, Medal, Trophy } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getRanking } from '../../services/results';
import { getPublicCategories } from '../../services/categories';
import type { Category, RankingRow } from '../../types';
import { resolveMediaUrl } from '../../services/storage';
import { formatNumber, initials, yearOptions } from '../../utils/format';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { PublicPageHero } from '../../components/public/PublicPageHero';
import { Section } from '../../components/public/SectionHeading';
import { cn } from '../../utils/cn';

interface PageData {
  ranking: RankingRow[];
  categories: Category[];
}

const MEDALS: Record<number, string> = {
  1: 'bg-[var(--accent)] text-[var(--accent-contrast)]',
  2: 'bg-slate-300 text-slate-800',
  3: 'bg-amber-200 text-amber-900',
};

export function RankingPage() {
  useDocumentTitle('Ranking');
  const years = yearOptions(6);
  const [year, setYear] = useState(years[0]);
  const [categoryId, setCategoryId] = useState('');

  const { data, loading, error, reload } = useAsync<PageData>(async () => {
    const [ranking, categories] = await Promise.all([
      getRanking(year, categoryId || undefined),
      getPublicCategories(),
    ]);
    return { ranking, categories };
  }, [year, categoryId]);

  const ranking = data?.ranking ?? [];
  const podium = ranking.slice(0, 3);
  const selectedCategory = data?.categories.find((category) => category.id === categoryId);

  return (
    <>
      <PublicPageHero
        eyebrow={`Temporada ${year}`}
        title="Ranking"
        description="La clasificación interna del equipo se calcula automáticamente a partir de los resultados oficiales de cada carrera."
        crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Ranking' }]}
        compact
      />

      <Section className="pt-10 sm:pt-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Temporada
              </span>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-medium text-slate-900 shadow-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
              >
                {years.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Categoría
              </span>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-medium text-slate-900 shadow-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
              >
                <option value="">Todas las categorías</option>
                {(data?.categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Info className="h-3.5 w-3.5" aria-hidden />
            {selectedCategory ? `Filtro: ${selectedCategory.name}` : 'Clasificación general'}
          </p>
        </div>

        {loading ? (
          <LoadingBlock message="Calculando ranking…" />
        ) : error ? (
          <ErrorState
            title="No se pudo calcular el ranking"
            message={error}
            onRetry={reload}
          />
        ) : ranking.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Ranking sin datos para esta temporada"
            description="El ranking se activa cuando hay resultados oficiales registrados. Puedes consultar otras temporadas o el historial de resultados."
            action={
              <Link to="/resultados" className="text-sm font-semibold text-[var(--brand-dark)] underline underline-offset-4">
                Ver resultados
              </Link>
            }
          />
        ) : (
          <>
            <div className="mb-10 grid gap-4 md:grid-cols-3">
              {podium.map((row, index) => {
                const photo = resolveMediaUrl(null, row.photo_url, 'cyclists');
                const rank = row.position_rank || index + 1;
                return (
                  <article
                    key={row.cyclist_id}
                    className={cn(
                      'relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm',
                      rank === 1
                        ? 'border-[var(--brand)] ring-1 ring-[var(--brand)]/20 md:-mt-2 md:pb-7'
                        : 'border-slate-200',
                    )}
                  >
                    <div
                      className={cn(
                        'absolute -right-6 -top-6 flex h-24 w-24 items-end justify-start rounded-full pb-3 pl-4 font-display text-5xl font-bold opacity-10',
                        rank === 1 ? 'bg-[var(--brand)]' : 'bg-slate-400',
                      )}
                      aria-hidden
                    >
                      {rank}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg',
                          MEDALS[rank] ?? 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {rank === 1 ? (
                          <Trophy className="h-4 w-4" aria-hidden />
                        ) : (
                          <Medal className="h-4 w-4" aria-hidden />
                        )}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        {rank === 1 ? 'Líder del ranking' : `${rank}.º puesto`}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                        {photo ? (
                          <img
                            src={photo}
                            alt={row.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-display text-xl font-bold text-slate-500">
                            {initials(row.full_name)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        {row.slug ? (
                          <Link
                            to={`/corredores/${row.slug}`}
                            className="block truncate font-display text-xl font-bold uppercase leading-tight text-slate-950 transition hover:text-[var(--brand-dark)]"
                          >
                            {row.full_name}
                          </Link>
                        ) : (
                          <p className="truncate font-display text-xl font-bold uppercase leading-tight text-slate-950">
                            {row.full_name}
                          </p>
                        )}
                        <p className="truncate text-xs text-slate-500">
                          {row.category_name || 'Sin categoría'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Puntos
                        </p>
                        <p className="font-display text-3xl font-bold tabular-nums text-slate-950">
                          {formatNumber(row.total_points)}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-slate-500">
                        <p>{row.races_count} carreras</p>
                        <p>{row.podiums} podios</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-display text-2xl font-bold uppercase leading-none text-slate-950">
                    Clasificación completa
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {ranking.length} corredores · temporada {year}
                    {selectedCategory ? ` · ${selectedCategory.name}` : ''}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <Award className="h-3.5 w-3.5" aria-hidden />
                  Ranking interno
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 text-center">#</th>
                      <th className="px-4 py-3 text-left">Corredor</th>
                      <th className="px-4 py-3 text-left">Categoría</th>
                      <th className="px-4 py-3 text-center">Carreras</th>
                      <th className="px-4 py-3 text-center">1.º</th>
                      <th className="px-4 py-3 text-center">2.º</th>
                      <th className="px-4 py-3 text-center">3.º</th>
                      <th className="px-4 py-3 text-center">Podios</th>
                      <th className="px-4 py-3 text-center">Mejor</th>
                      <th className="px-5 py-3 text-right">Puntos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ranking.map((row) => {
                      const photo = resolveMediaUrl(null, row.photo_url, 'cyclists');
                      return (
                        <tr
                          key={row.cyclist_id}
                          className={cn(
                            'transition hover:bg-slate-50/70',
                            row.position_rank <= 3 && 'bg-[var(--brand-soft)]/30',
                          )}
                        >
                          <td className="px-4 py-3 text-center" data-label="Puesto">
                            <span
                              className={cn(
                                'inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 font-display text-sm font-bold',
                                MEDALS[row.position_rank] ?? 'bg-slate-100 text-slate-600',
                              )}
                            >
                              {row.position_rank}
                            </span>
                          </td>
                          <td className="px-4 py-3" data-label="Corredor">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-500">
                                    {initials(row.full_name)}
                                  </span>
                                )}
                              </span>
                              {row.slug ? (
                                <Link
                                  to={`/corredores/${row.slug}`}
                                  className="font-medium text-slate-900 transition hover:text-[var(--brand-dark)]"
                                >
                                  {row.full_name}
                                </Link>
                              ) : (
                                <span className="font-medium text-slate-900">{row.full_name}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500" data-label="Categoría">
                            {row.category_name || '—'}
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums text-slate-600" data-label="Carreras">
                            {row.races_count}
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums text-slate-600" data-label="Victorias">
                            {row.wins}
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums text-slate-600" data-label="Segundos">
                            {row.seconds}
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums text-slate-600" data-label="Terceros">
                            {row.thirds}
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums text-slate-600" data-label="Podios">
                            {row.podiums}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600" data-label="Mejor puesto">
                            {row.best_position ? `${row.best_position}.º` : '—'}
                          </td>
                          <td className="px-5 py-3 text-right font-display text-base font-bold tabular-nums text-slate-950" data-label="Puntos">
                            {formatNumber(row.total_points)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-slate-500 sm:grid-cols-2">
              <p>
                <strong className="text-slate-700">Cómo se calcula:</strong> cada posición
                final suma los puntos definidos en la tabla de puntuación del equipo. Los
                resultados anulados, DNF, DSQ y DNS no suman puntos.
              </p>
              <p>
                <strong className="text-slate-700">Empates:</strong> si dos corredores suman
                los mismos puntos, comparten posición y se ordenan por podios y mejor puesto.
                El ranking es una vista calculada: no se edita manualmente.
              </p>
            </div>
          </>
        )}
      </Section>
    </>
  );
}
