import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Bike,
  CalendarDays,
  Image as ImageIcon,
  Medal,
  Mountain,
  Ruler,
  Target,
  Trophy,
  UserRound,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  getCyclistAchievements,
  getCyclistResults,
  getCyclistStats,
  getPublicCyclistBySlug,
} from '../../services/cyclists';
import { getGalleryForCyclist } from '../../services/content';
import { resolveMediaUrl } from '../../services/storage';
import type {
  Achievement,
  CyclistStats,
  GalleryItem,
  PublicCyclist,
  ResultWithRelations,
} from '../../types';
import { formatDate, formatLongDate, initials, ordinal } from '../../utils/format';
import { StatusBadge } from '../../components/ui/Badge';
import { buttonStyles } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { PublicPageHero } from '../../components/public/PublicPageHero';
import { Section } from '../../components/public/SectionHeading';
import { Lightbox, galleryToLightbox } from '../../components/public/Lightbox';
import { StatCard } from '../../components/ui/StatCard';

interface CyclistPageData {
  cyclist: PublicCyclist;
  stats: CyclistStats;
  achievements: Achievement[];
  results: ResultWithRelations[];
  gallery: GalleryItem[];
}

export function CyclistDetailPage() {
  const { slug = '' } = useParams();
  useDocumentTitle('Corredor');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const { data, loading, error, reload } = useAsync<CyclistPageData | null>(
    async () => {
      const cyclist = await getPublicCyclistBySlug(slug);
      if (!cyclist) return null;

      const [stats, achievements, results, gallery] = await Promise.all([
        getCyclistStats(cyclist.id),
        getCyclistAchievements(cyclist.id),
        getCyclistResults(cyclist.id),
        getGalleryForCyclist(cyclist.id),
      ]);

      return { cyclist, stats, achievements, results, gallery };
    },
    [slug],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <LoadingBlock message="Cargando perfil del corredor…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <ErrorState
          title="No se pudo cargar el perfil"
          message={error}
          onRetry={reload}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <EmptyState
          icon={UserRound}
          title="Corredor no encontrado"
          description="El perfil que buscas no existe o ya no está publicado."
          action={
            <Link to="/corredores" className={buttonStyles('primary', 'md')}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver a corredores
            </Link>
          }
        />
      </div>
    );
  }

  const { cyclist, stats, achievements, results, gallery } = data;
  const photo = resolveMediaUrl(cyclist.photo_path, cyclist.photo_url, 'cyclists');
  const galleryItems = galleryToLightbox(gallery);
  const finished = results.filter((result) => result.result_status === 'FINISHED');
  const recent = results.slice(0, 12);
  const best = stats.best_position;

  return (
    <>
      <PublicPageHero
        eyebrow={cyclist.category_name || 'Corredor del equipo'}
        title={cyclist.full_name}
        description={cyclist.bio ? undefined : cyclist.specialty || 'Perfil del corredor'}
        crumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Corredores', to: '/corredores' },
          { label: cyclist.full_name },
        ]}
        compact
      />

      <Section className="pt-0 sm:pt-0">
        <div className="-mt-8 grid gap-8 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
              <div className="relative aspect-[4/5] bg-[var(--secondary)]">
                {photo ? (
                  <img
                    src={photo}
                    alt={cyclist.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-[var(--secondary)] to-[var(--brand-darker)]">
                    <div
                      className="absolute inset-x-0 top-4 text-center font-display text-[120px] font-bold leading-none text-white/5"
                      aria-hidden
                    >
                      {cyclist.number ?? 'MTB'}
                    </div>
                    <span className="font-display text-7xl font-bold text-white/90">
                      {initials(cyclist.full_name)}
                    </span>
                    <Bike className="mt-4 h-8 w-8 text-[var(--accent)]" aria-hidden />
                  </div>
                )}
                {cyclist.number !== null && (
                  <span className="absolute left-4 top-4 rounded-xl bg-white/95 px-3 py-1.5 font-display text-lg font-bold tabular-nums text-slate-950 shadow">
                    #{cyclist.number}
                  </span>
                )}
              </div>
              <div className="p-5">
                <dl className="space-y-3 text-sm">
                  {cyclist.nickname && (
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Apodo
                      </dt>
                      <dd className="font-medium text-slate-900">“{cyclist.nickname}”</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Categoría
                    </dt>
                    <dd className="font-medium text-slate-900">
                      {cyclist.category_name || 'Sin categoría'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Especialidad
                    </dt>
                    <dd className="font-medium text-slate-900">
                      {cyclist.specialty || 'Mountain bike'}
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Edad
                      </dt>
                      <dd className="font-medium text-slate-900">
                        {cyclist.age ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        En el equipo
                      </dt>
                      <dd className="font-medium text-slate-900">
                        {cyclist.team_since ?? (cyclist.joined_at ? formatDate(cyclist.joined_at) : '—')}
                      </dd>
                    </div>
                  </div>
                </dl>
                <Link
                  to="/corredores"
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  Toda la plantilla
                </Link>
              </div>
            </div>

            {galleryItems.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Galería
                  </p>
                  <ImageIcon className="h-4 w-4 text-slate-400" aria-hidden />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {galleryItems.slice(0, 6).map((item, index) => (
                    <button
                      key={`${item.src}-${index}`}
                      type="button"
                      onClick={() => setLightbox(index)}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100"
                      aria-label={`Ver ${item.title || 'fotografía'}`}
                    >
                      <img
                        src={item.src}
                        alt={item.alt || item.title || cyclist.full_name}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <div className="min-w-0">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Carreras"
                value={stats.total_races}
                icon={CalendarDays}
                tone="brand"
              />
              <StatCard
                label="Puntos"
                value={stats.total_points}
                icon={Target}
                tone="sky"
              />
              <StatCard
                label="Podios"
                value={stats.podiums}
                icon={Trophy}
                tone="amber"
              />
              <StatCard
                label="Mejor puesto"
                value={best ? ordinal(best) : '—'}
                icon={Medal}
                tone="emerald"
              />
            </div>

            {cyclist.bio ? (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
                  Sobre el corredor
                </p>
                <div className="mt-3 space-y-3 text-base leading-relaxed text-slate-600">
                  {cyclist.bio.split(/\n{2,}/).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                La biografía de {cyclist.full_name.split(' ')[0]} se publicará próximamente.
              </div>
            )}

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-display text-2xl font-bold uppercase leading-none text-slate-950">
                    Historial deportivo
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Resultados oficiales publicados por el equipo.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {finished.length} finalizadas
                </span>
              </div>
              {recent.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-3 text-left">Carrera</th>
                        <th className="px-3 py-3 text-left">Fecha</th>
                        <th className="px-3 py-3 text-center">Puesto</th>
                        <th className="px-3 py-3 text-left">Tiempo</th>
                        <th className="px-5 py-3 text-right">Puntos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recent.map((result) => (
                        <tr key={result.id} className="transition hover:bg-slate-50/70">
                          <td className="px-5 py-3.5" data-label="Carrera">
                            <p className="font-medium text-slate-900">
                              {result.race_name || 'Carrera'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {result.category_name || cyclist.category_name || 'General'}
                            </p>
                          </td>
                          <td className="px-3 py-3.5 text-slate-500" data-label="Fecha">
                            {formatDate(result.race_date)}
                          </td>
                          <td className="px-3 py-3.5 text-center" data-label="Puesto">
                            {result.result_status === 'FINISHED' ? (
                              <span className="font-display text-base font-bold text-slate-900">
                                {ordinal(result.position)}
                              </span>
                            ) : (
                              <StatusBadge status={result.result_status} />
                            )}
                          </td>
                          <td className="px-3 py-3.5 text-slate-500" data-label="Tiempo">
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
              ) : (
                <div className="p-5">
                  <EmptyState
                    compact
                    icon={Mountain}
                    title="Sin resultados registrados"
                    description="Los resultados oficiales de este corredor aparecerán aquí una vez publicados."
                  />
                </div>
              )}
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl font-bold uppercase leading-none text-slate-950">
                    Palmarés
                  </h2>
                  <Award className="h-5 w-5 text-[var(--brand)]" aria-hidden />
                </div>
                {achievements.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {achievements.map((achievement) => (
                      <li
                        key={achievement.id}
                        className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {achievement.title}
                            </p>
                            {achievement.description && (
                              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                {achievement.description}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                            {achievement.year || (achievement.achieved_at ? formatLongDate(achievement.achieved_at).slice(-4) : '—')}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4">
                    <EmptyState
                      compact
                      icon={Award}
                      title="Palmarés en preparación"
                      description="Los logros destacados se publicarán aquí."
                    />
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl font-bold uppercase leading-none text-slate-950">
                    Estadísticas
                  </h2>
                  <Ruler className="h-5 w-5 text-[var(--brand)]" aria-hidden />
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  {[
                    { label: 'Victorias', value: stats.wins },
                    { label: 'Segundos puestos', value: stats.seconds },
                    { label: 'Terceros puestos', value: stats.thirds },
                    { label: 'Podios totales', value: stats.podiums },
                    { label: 'Carreras finalizadas', value: finished.length },
                    { label: 'Puntos acumulados', value: stats.total_points },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0"
                    >
                      <dt className="text-slate-500">{row.label}</dt>
                      <dd className="font-display text-lg font-bold tabular-nums text-slate-950">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[var(--brand-soft)] px-5 py-4">
              <p className="text-sm text-[var(--brand-dark)]">
                ¿Quieres conocer al resto de la escuadra?
              </p>
              <Link to="/corredores" className={buttonStyles('primary', 'sm')}>
                Ver todos los corredores
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <Lightbox
        items={galleryItems}
        index={lightbox}
        onIndexChange={setLightbox}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}
