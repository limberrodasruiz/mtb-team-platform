import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Flag,
  Image as ImageIcon,
  MapPin,
  Timer,
  Trophy,
  Users,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getRaceBySlug, getRaceRegistrations, type RegistrationWithCyclist } from '../../services/races';
import { getPublicResults } from '../../services/results';
import { getGalleryForRace } from '../../services/content';
import { resolveMediaUrl } from '../../services/storage';
import type { GalleryItem, Race, ResultWithRelations } from '../../types';
import { formatDate, formatLongDate, ordinal, todayISO } from '../../utils/format';
import { safeExternalUrl } from '../../utils/validation';
import { StatusBadge } from '../../components/ui/Badge';
import { buttonStyles } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { PublicPageHero } from '../../components/public/PublicPageHero';
import { Section } from '../../components/public/SectionHeading';
import { Lightbox, galleryToLightbox } from '../../components/public/Lightbox';

interface RacePageData {
  race: Race;
  results: ResultWithRelations[];
  registrations: RegistrationWithCyclist[];
  gallery: GalleryItem[];
}

function daysUntil(date: string): number | null {
  const target = new Date(`${date}T12:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000);
}

export function RaceDetailPage() {
  const { slug = '' } = useParams();
  useDocumentTitle('Carrera');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const { data, loading, error, reload } = useAsync<RacePageData | null>(
    async () => {
      const race = await getRaceBySlug(slug);
      if (!race) return null;
      const [results, registrations, gallery] = await Promise.all([
        getPublicResults({ raceId: race.id }),
        getRaceRegistrations(race.id),
        getGalleryForRace(race.id),
      ]);
      return { race, results, registrations, gallery };
    },
    [slug],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <LoadingBlock message="Cargando carrera…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <ErrorState title="No se pudo cargar la carrera" message={error} onRetry={reload} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <EmptyState
          icon={Flag}
          title="Carrera no encontrada"
          description="La carrera que buscas no existe o fue retirada del calendario público."
          action={
            <Link to="/carreras" className={buttonStyles('primary', 'md')}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver al calendario
            </Link>
          }
        />
      </div>
    );
  }

  const { race, results, registrations, gallery } = data;
  const image = resolveMediaUrl(race.image_path, race.image_url, 'banners');
  const galleryItems = galleryToLightbox(gallery);
  const registrationUrl = safeExternalUrl(race.registration_url);
  const upcoming = race.date >= todayISO() && race.status !== 'CANCELADA';
  const days = daysUntil(race.date);
  const confirmed = registrations.filter((item) => item.status === 'CONFIRMADO');
  const finished = results.filter((result) => result.result_status !== 'ANULADO');
  const podiums = finished
    .filter((result) => result.result_status === 'FINISHED' && result.position !== null && result.position <= 3)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const location = [race.place, race.city, race.department].filter(Boolean).join(' · ');

  return (
    <>
      <PublicPageHero
        eyebrow={[race.race_type, race.season].filter(Boolean).join(' · ') || 'Carrera'}
        title={race.name}
        description={race.description || undefined}
        crumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Carreras', to: '/carreras' },
          { label: race.name },
        ]}
        imageUrl={image}
        compact
        actions={
          <>
            {upcoming && registrationUrl && (
              <a
                href={registrationUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonStyles('primary', 'md')}
              >
                Inscripciones
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            )}
            <Link
              to="/carreras"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/25 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Calendario
            </Link>
          </>
        }
      />

      <Section className="pt-10 sm:pt-12">
        {race.status === 'CANCELADA' && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            <strong className="font-semibold">Carrera cancelada.</strong> Consulta el calendario
            para ver las próximas competencias del equipo.
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <CalendarDays className="h-4 w-4 text-[var(--brand)]" aria-hidden />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Fecha
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatLongDate(race.date)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <MapPin className="h-4 w-4 text-[var(--brand)]" aria-hidden />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Sede
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {race.city || race.place || 'Por confirmar'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <Users className="h-4 w-4 text-[var(--brand)]" aria-hidden />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Inscritos
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {registrations.length > 0 ? registrations.length : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <Timer className="h-4 w-4 text-[var(--brand)]" aria-hidden />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Estado
                </p>
                <div className="mt-1">
                  <StatusBadge status={race.status} />
                </div>
              </div>
            </div>

            {podiums.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-2xl font-bold uppercase leading-none text-slate-950">
                    Podio del equipo
                  </h2>
                  <Trophy className="h-5 w-5 text-[var(--brand)]" aria-hidden />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {podiums.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] font-display text-base font-bold text-[var(--brand-dark)]">
                        {result.position}
                      </span>
                      <div className="min-w-0">
                        {result.cyclist_slug ? (
                          <Link
                            to={`/corredores/${result.cyclist_slug}`}
                            className="block truncate text-sm font-semibold text-slate-900 hover:text-[var(--brand-dark)]"
                          >
                            {result.cyclist_name || 'Corredor'}
                          </Link>
                        ) : (
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {result.cyclist_name || 'Corredor'}
                          </p>
                        )}
                        <p className="truncate text-[11px] text-slate-500">
                          {result.category_name || 'General'}
                          {result.time_text ? ` · ${result.time_text}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-display text-2xl font-bold uppercase leading-none text-slate-950">
                    Resultados
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {upcoming
                      ? 'Los resultados se publicarán al finalizar la competencia.'
                      : 'Clasificación oficial registrada por el equipo.'}
                  </p>
                </div>
                {finished.length > 0 && (
                  <Link
                    to={`/resultados?carrera=${race.slug}`}
                    className="text-xs font-semibold text-[var(--brand-dark)] underline underline-offset-4"
                  >
                    Ver en resultados
                  </Link>
                )}
              </div>
              {finished.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-3 text-center">Pos.</th>
                        <th className="px-4 py-3 text-left">Corredor</th>
                        <th className="px-4 py-3 text-left">Categoría</th>
                        <th className="px-4 py-3 text-left">Tiempo</th>
                        <th className="px-5 py-3 text-right">Puntos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {finished
                        .slice()
                        .sort((a, b) => {
                          const posA = a.position ?? 9999;
                          const posB = b.position ?? 9999;
                          return posA - posB;
                        })
                        .map((result) => (
                          <tr key={result.id} className="transition hover:bg-slate-50/70">
                            <td className="px-5 py-3.5 text-center" data-label="Posición">
                              {result.result_status === 'FINISHED' ? (
                                <span className="font-display text-base font-bold text-slate-900">
                                  {ordinal(result.position)}
                                </span>
                              ) : (
                                <StatusBadge status={result.result_status} />
                              )}
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
                                <span className="font-medium text-slate-900">
                                  {result.cyclist_name || 'Corredor'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-slate-500" data-label="Categoría">
                              {result.category_name || '—'}
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
              ) : (
                <div className="p-5">
                  <EmptyState
                    compact
                    icon={Trophy}
                    title={upcoming ? 'Resultados pendientes' : 'Sin resultados publicados'}
                    description={
                      upcoming
                        ? `La carrera está programada para el ${formatLongDate(race.date)}.`
                        : 'Cuando el equipo publique la clasificación, aparecerá en esta sección.'
                    }
                  />
                </div>
              )}
            </div>

            {galleryItems.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-2xl font-bold uppercase leading-none text-slate-950">
                    Galería de la carrera
                  </h2>
                  <ImageIcon className="h-5 w-5 text-slate-400" aria-hidden />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {galleryItems.slice(0, 9).map((item, index) => (
                    <button
                      key={`${item.src}-${index}`}
                      type="button"
                      onClick={() => setLightbox(index)}
                      className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100"
                      aria-label={`Ver ${item.title || 'fotografía'}`}
                    >
                      <img
                        src={item.src}
                        alt={item.alt || item.title || race.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Información de la carrera
              </p>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Fecha
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{formatDate(race.date)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Ubicación
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {location || 'Por confirmar'}
                  </dd>
                </div>
                {race.organizer && (
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Organiza
                    </dt>
                    <dd className="mt-0.5 font-medium text-slate-900">{race.organizer}</dd>
                  </div>
                )}
                {race.race_type && (
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tipo
                    </dt>
                    <dd className="mt-0.5 font-medium text-slate-900">{race.race_type}</dd>
                  </div>
                )}
                {race.registration_deadline && (
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Cierre de inscripciones
                    </dt>
                    <dd className="mt-0.5 font-medium text-slate-900">
                      {formatDate(race.registration_deadline)}
                    </dd>
                  </div>
                )}
              </dl>

              {upcoming && (
                <div className="mt-5 rounded-xl bg-[var(--brand-soft)] p-4">
                  <p className="text-xs font-semibold text-[var(--brand-dark)]">
                    {days !== null && days >= 0
                      ? days === 0
                        ? '¡Es hoy!'
                        : `Faltan ${days} ${days === 1 ? 'día' : 'días'}`
                      : 'Carrera programada'}
                  </p>
                  {registrationUrl ? (
                    <a
                      href={registrationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonStyles('primary', 'sm', true)}
                    >
                      Inscribirse
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  ) : (
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--brand-dark)]/80">
                      Las inscripciones se coordinan con el equipo. Consulta por los canales de
                      contacto.
                    </p>
                  )}
                </div>
              )}
            </div>

            {registrations.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Participantes
                  </p>
                  <Users className="h-4 w-4 text-slate-400" aria-hidden />
                </div>
                <ul className="mt-3 space-y-2">
                  {registrations.slice(0, 10).map((registration) => (
                    <li
                      key={registration.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate text-slate-700">
                        {registration.cyclist_name || 'Corredor'}
                      </span>
                      <StatusBadge status={registration.status} />
                    </li>
                  ))}
                </ul>
                {registrations.length > 10 && (
                  <p className="mt-3 text-[11px] text-slate-400">
                    +{registrations.length - 10} participantes más
                  </p>
                )}
                {confirmed.length > 0 && (
                  <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                    {confirmed.length} confirmados
                  </p>
                )}
              </div>
            )}

            <div className="rounded-2xl bg-[var(--secondary)] p-5 text-white">
              <Trophy className="h-5 w-5 text-[var(--accent)]" aria-hidden />
              <p className="mt-3 font-display text-xl font-bold uppercase leading-tight">
                Resultados y ranking
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                Todos los resultados del equipo alimentan el ranking interno de la temporada.
              </p>
              <Link to="/ranking" className={buttonStyles('primary', 'sm', true)}>
                Ver ranking
              </Link>
            </div>
          </aside>
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
