import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  Compass,
  Flag,
  HeartHandshake,
  MapPin,
  MessageCircle,
  ScrollText,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useSiteSettings } from '../../providers/SiteSettingsProvider';
import { getPublicCategories } from '../../services/categories';
import { buttonStyles } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { PublicPageHero } from '../../components/public/PublicPageHero';
import { RichText } from '../../components/public/RichText';
import { Section, SectionHeading } from '../../components/public/SectionHeading';

export function TeamPage() {
  useDocumentTitle('Equipo');
  const { settings, contactEmail, whatsappNumber, heroUrl } = useSiteSettings();
  const { data: categories, loading, error, reload } = useAsync(
    getPublicCategories,
    [],
  );

  const hasStory = Boolean(
    settings.history ||
      settings.mission ||
      settings.objectives ||
      settings.activities ||
      settings.achievements,
  );

  return (
    <>
      <PublicPageHero
        eyebrow="Quiénes somos"
        title="El equipo"
        description={
          settings.description ||
          'Una comunidad de mountain bike que compite y crece junta.'
        }
        crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Equipo' }]}
        imageUrl={heroUrl}
        actions={
          <>
            <Link to="/corredores" className={buttonStyles('primary', 'md')}>
              Ver corredores
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/contacto"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/25 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Contacto
            </Link>
          </>
        }
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.5fr_0.8fr]">
          <div>
            <SectionHeading
              eyebrow="Nuestra historia"
              title={settings.short_name || 'La historia'}
              description={
                settings.founded_year
                  ? `Un proyecto que pedalea desde ${settings.founded_year}.`
                  : 'La historia del equipo, contada por quienes la construyen.'
              }
            />
            {loading && !hasStory ? (
              <LoadingBlock message="Cargando información del equipo…" />
            ) : settings.history ? (
              <RichText content={settings.history} className="space-y-5" />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-base leading-relaxed text-slate-600">
                  La historia completa del equipo se está preparando. Mientras tanto, puedes
                  conocer a nuestra plantilla, revisar el calendario de carreras o escribirnos
                  para saber más del proyecto.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/corredores" className={buttonStyles('primary', 'sm')}>
                    Conocer corredores
                  </Link>
                  <Link to="/contacto" className={buttonStyles('outline', 'sm')}>
                    Escribirnos
                  </Link>
                </div>
              </div>
            )}

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-dark)]">
                  <Target className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-xl font-bold uppercase text-slate-950">
                  Misión
                </h3>
                {settings.mission ? (
                  <RichText
                    content={settings.mission}
                    className="mt-2 space-y-2 text-sm [&_p]:text-sm"
                  />
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    La misión del equipo se publicará desde el panel de configuración.
                  </p>
                )}
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-dark)]">
                  <Compass className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-xl font-bold uppercase text-slate-950">
                  Objetivos
                </h3>
                {settings.objectives ? (
                  <RichText
                    content={settings.objectives}
                    className="mt-2 space-y-2 text-sm [&_p]:text-sm"
                  />
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Los objetivos de la temporada se publicarán desde el panel de configuración.
                  </p>
                )}
              </article>
            </div>

            {settings.activities && (
              <div className="mt-12">
                <SectionHeading
                  eyebrow="En movimiento"
                  title="Actividades"
                  description="Entrenamientos, salidas y competencias del equipo."
                />
                <RichText content={settings.activities} />
              </div>
            )}

            {settings.achievements && (
              <div className="mt-12">
                <SectionHeading
                  eyebrow="Palmarés"
                  title="Logros del equipo"
                  description="Resultados que marcan el camino recorrido."
                />
                <RichText content={settings.achievements} />
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <Card>
              <CardBody>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Ficha del equipo
                </p>
                <dl className="mt-4 space-y-4 text-sm">
                  <div className="flex gap-3">
                    <Flag className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Nombre
                      </dt>
                      <dd className="font-medium text-slate-900">{settings.team_name}</dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Base
                      </dt>
                      <dd className="font-medium text-slate-900">
                        {settings.address || 'Santa Cruz, Bolivia'}
                      </dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Fundación
                      </dt>
                      <dd className="font-medium text-slate-900">
                        {settings.founded_year ?? 'Por confirmar'}
                      </dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Disciplina
                      </dt>
                      <dd className="font-medium text-slate-900">Mountain bike</dd>
                    </div>
                  </div>
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Categorías
                  </p>
                  <Trophy className="h-4 w-4 text-[var(--brand)]" aria-hidden />
                </div>
                {loading ? (
                  <div className="mt-4 space-y-2">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="h-9 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                  </div>
                ) : error ? (
                  <p className="mt-3 text-xs text-rose-600">{error}</p>
                ) : categories && categories.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <Link
                          to={`/corredores?categoria=${category.slug}`}
                          className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]"
                        >
                          {category.name}
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs leading-relaxed text-slate-500">
                    Las categorías se publicarán cuando estén configuradas.
                  </p>
                )}
              </CardBody>
            </Card>

            <div className="rounded-2xl bg-[var(--secondary)] p-6 text-white">
              <HeartHandshake className="h-6 w-6 text-[var(--accent)]" aria-hidden />
              <h3 className="mt-3 font-display text-xl font-bold uppercase leading-tight">
                ¿Quieres sumarte?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                {settings.join_info ||
                  'Escríbenos para conocer los requisitos, entrenamientos y formas de apoyo al equipo.'}
              </p>
              <div className="mt-4 space-y-2">
                <Link to="/contacto" className={buttonStyles('primary', 'sm', true)}>
                  Contactar
                </Link>
                {whatsappNumber ? (
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full rounded-lg border border-white/20 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    WhatsApp
                  </a>
                ) : contactEmail ? (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="block w-full rounded-lg border border-white/20 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    Enviar correo
                  </a>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </Section>

      {error && !loading && (
        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <ErrorState
            title="No se pudieron cargar las categorías"
            message={error}
            onRetry={reload}
          />
        </div>
      )}

      <section className="border-t border-slate-200 bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
              <ScrollText className="h-4 w-4" aria-hidden />
              Nuestra gente
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase leading-none text-slate-950 sm:text-4xl">
              Conoce a los corredores
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Perfiles, especialidades y resultados de cada integrante de la plantilla.
            </p>
          </div>
          <Link to="/corredores" className={buttonStyles('secondary', 'lg')}>
            Ver plantilla
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      {!hasStory && !loading && !error && (
        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <EmptyState
            icon={ScrollText}
            title="Historia del equipo"
            description="La información institucional se completará desde el panel de administración."
          />
        </div>
      )}
    </>
  );
}
