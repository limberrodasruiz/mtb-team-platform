import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bike,
  CalendarDays,
  ChevronRight,
  Flag,
  Flame,
  MapPin,
  MessageCircle,
  Mountain,
  Newspaper,
  Trophy,
  Users,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useSiteSettings } from '../../providers/SiteSettingsProvider';
import { getHomeData, type HomeData } from '../../services/public';
import { resolveMediaUrl } from '../../services/storage';
import { formatLongDate, formatNumber } from '../../utils/format';
import { DEFAULT_WHATSAPP_MESSAGE } from '../../constants';
import { buttonStyles } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { Section, SectionHeading } from '../../components/public/SectionHeading';
import { CyclistCard } from '../../components/public/CyclistCard';
import { RaceCard } from '../../components/public/RaceCard';
import { NewsCard } from '../../components/public/NewsCard';
import { SponsorGrid } from '../../components/public/SponsorGrid';

function homeBannerLink(url: string | null): { href: string; external: boolean } | null {
  if (!url?.trim()) return null;
  const value = url.trim();
  if (/^https?:\/\//i.test(value)) return { href: value, external: true };
  if (value.startsWith('/') && !value.startsWith('//')) {
    return { href: value, external: false };
  }
  // Reject other schemes and protocol-relative URLs instead of rendering them.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) return null;
  return { href: `/${value}`, external: false };
}

function whatsappHref(number: string, message: string): string {
  return `https://wa.me/${number.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`;
}

export function HomePage() {
  useDocumentTitle(null);
  const { settings, heroUrl, whatsappNumber, contactEmail } = useSiteSettings();
  const { data, loading, error, reload } = useAsync<HomeData>(getHomeData, []);

  const banner = data?.banners[0];
  const bannerImage = banner
    ? resolveMediaUrl(banner.image_path, banner.image_url, 'banners')
    : null;
  const heroImage = bannerImage || heroUrl;
  const bannerLink = banner ? homeBannerLink(banner.url) : null;
  const stats = data?.stats;

  return (
    <>
      <section className="relative overflow-hidden bg-[var(--secondary)] text-white">
        {heroImage && (
          <>
            <img
              src={heroImage}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/30" />
          </>
        )}
        {!heroImage && (
          <>
            <div className="topographic absolute inset-0" aria-hidden />
            <div className="grid-pattern absolute inset-0 opacity-60" aria-hidden />
            <div className="hero-fade absolute inset-0" aria-hidden />
          </>
        )}

        <div
          className="pointer-events-none absolute -right-16 top-1/2 hidden -translate-y-1/2 select-none font-display text-[26rem] font-bold leading-none text-white/[0.035] lg:block"
          aria-hidden
        >
          MTB
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24 lg:grid-cols-[1.35fr_0.65fr] lg:items-end lg:px-8 lg:pb-24">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden />
                Mountain bike · Santa Cruz, Bolivia
              </span>
              {settings.founded_year && (
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Desde {settings.founded_year}
                </span>
              )}
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
              {banner?.subtitle || settings.slogan || 'Pasión. Competencia. Comunidad.'}
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-7xl">
              {banner?.title || settings.team_name}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
              {settings.description ||
                'Un equipo de mountain bike que compite, forma corredores y construye comunidad sobre dos ruedas.'}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/equipo" className={buttonStyles('primary', 'lg')}>
                Conoce al equipo
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                to="/carreras"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <CalendarDays className="h-4 w-4" aria-hidden />
                Calendario
              </Link>
              {bannerLink && banner?.button_label && (
                bannerLink.external ? (
                  <a
                    href={bannerLink.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-12 items-center gap-2 px-2 text-sm font-semibold text-white/70 underline decoration-white/30 underline-offset-4 transition hover:text-white"
                  >
                    {banner.button_label}
                  </a>
                ) : (
                  <Link
                    to={bannerLink.href}
                    className="inline-flex h-12 items-center gap-2 px-2 text-sm font-semibold text-white/70 underline decoration-white/30 underline-offset-4 transition hover:text-white"
                  >
                    {banner.button_label}
                  </Link>
                )
              )}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                  El equipo en números
                </p>
                <Trophy className="h-4 w-4 text-[var(--accent)]" aria-hidden />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[
                  { label: 'Corredores', value: stats?.activeCyclists, icon: Users },
                  { label: 'Carreras', value: stats?.races, icon: Flag },
                  { label: 'Podios', value: stats?.podiums, icon: Mountain },
                  { label: 'Victorias', value: stats?.wins, icon: Flame },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label}>
                    <div className="flex items-center gap-1.5 text-white/40">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      <p className="text-[10px] font-semibold uppercase tracking-wider">
                        {label}
                      </p>
                    </div>
                    <p className="mt-1 font-display text-3xl font-bold tabular-nums text-white">
                      {loading ? '—' : formatNumber(value ?? 0)}
                    </p>
                  </div>
                ))}
              </div>
              <Link
                to="/ranking"
                className="mt-5 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Ver ranking del equipo
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10 bg-black/20">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/10 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
            {[
              { label: 'Corredores activos', value: stats?.activeCyclists ?? 0 },
              { label: 'Carreras registradas', value: stats?.races ?? 0 },
              { label: 'Podios', value: stats?.podiums ?? 0 },
              { label: 'Noticias publicadas', value: stats?.news ?? 0 },
            ].map((item) => (
              <div key={item.label} className="py-4 pr-4 sm:py-5">
                <p className="font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
                  {loading ? '—' : formatNumber(item.value)}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <ErrorState
            title="No se pudo cargar la portada"
            message={error}
            onRetry={reload}
          />
        </div>
      )}

      <Section>
        <SectionHeading
          eyebrow="La escuadra"
          title="Corredores que representan al equipo"
          description="Cada dorsal cuenta una historia. Conoce a quienes llevan los colores de Trinx Bolivia por las rutas y circuitos del país."
          linkTo="/corredores"
          linkLabel="Ver toda la plantilla"
        />
        {loading ? (
          <LoadingBlock message="Cargando corredores…" />
        ) : data && data.featured.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.featured.map((cyclist) => (
              <CyclistCard key={cyclist.id} cyclist={cyclist} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bike}
            title="La plantilla se está actualizando"
            description="Muy pronto verás aquí a los corredores del equipo. Mientras tanto, puedes conocer nuestra historia y calendario."
            action={
              <Link to="/equipo" className={buttonStyles('primary', 'md')}>
                Conocer el equipo
              </Link>
            }
          />
        )}
      </Section>

      {data?.sponsors && data.sponsors.length > 0 && (
        <div className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <p className="mb-5 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
              Con el apoyo de
            </p>
            <SponsorGrid sponsors={data.sponsors.slice(0, 10)} compact />
          </div>
        </div>
      )}

      <Section className="bg-slate-100/60">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Calendario"
              title="Próximas carreras"
              description="El equipo en la ruta. Consulta fechas, sedes y detalles de cada competencia."
              linkTo="/carreras"
              linkLabel="Ver calendario"
              className="mb-6"
            />
            {loading ? (
              <LoadingBlock message="Cargando calendario…" />
            ) : data && data.upcoming.length > 0 ? (
              <div className="space-y-3">
                {data.upcoming.map((race) => (
                  <RaceCard key={race.id} race={race} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="Sin carreras programadas"
                description="Cuando se confirme la próxima competencia, aparecerá aquí con todos los detalles."
                action={
                  <Link to="/resultados" className={buttonStyles('outline', 'md')}>
                    Ver resultados anteriores
                  </Link>
                }
              />
            )}
          </div>

          <div>
            <SectionHeading
              eyebrow="Temporada"
              title="Ranking interno"
              description="Puntos acumulados por los resultados oficiales del equipo."
              linkTo="/ranking"
              linkLabel="Ranking completo"
              className="mb-6"
            />
            {loading ? (
              <LoadingBlock message="Calculando ranking…" />
            ) : data && data.ranking.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Top 5 de la temporada
                  </p>
                  <Trophy className="h-4 w-4 text-[var(--brand)]" aria-hidden />
                </div>
                <ol className="divide-y divide-slate-100">
                  {data.ranking.map((row, index) => (
                    <li
                      key={row.cyclist_id}
                      className="flex items-center gap-4 px-5 py-3.5"
                    >
                      <span
                        className={
                          index === 0
                            ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] font-display text-sm font-bold text-[var(--accent-contrast)]'
                            : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-display text-sm font-bold text-slate-600'
                        }
                      >
                        {row.position_rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        {row.slug ? (
                          <Link
                            to={`/corredores/${row.slug}`}
                            className="truncate text-sm font-semibold text-slate-900 transition hover:text-[var(--brand-dark)]"
                          >
                            {row.full_name}
                          </Link>
                        ) : (
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {row.full_name}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-500">
                          {row.category_name || 'Sin categoría'} · {row.races_count} carreras
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-lg font-bold tabular-nums text-slate-950">
                          {row.total_points}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">
                          puntos
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <EmptyState
                icon={Trophy}
                title="Ranking en construcción"
                description="El ranking se calcula automáticamente a partir de los resultados publicados por el equipo."
                action={
                  <Link to="/resultados" className={buttonStyles('outline', 'md')}>
                    Ver resultados
                  </Link>
                }
              />
            )}
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Actualidad"
          title="Últimas noticias"
          description="Competencias, entrenamientos y todo lo que pasa dentro y fuera de la pista."
          linkTo="/noticias"
          linkLabel="Todas las noticias"
        />
        {loading ? (
          <LoadingBlock message="Cargando noticias…" />
        ) : data && data.news.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.news.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Newspaper}
            title="Todavía no hay noticias publicadas"
            description="Las novedades del equipo se publicarán aquí. Mientras tanto, sigue nuestra actividad en redes sociales."
            action={
              <Link to="/contacto" className={buttonStyles('outline', 'md')}>
                Contactar al equipo
              </Link>
            }
          />
        )}
      </Section>

      <section className="relative overflow-hidden bg-[var(--secondary)] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
        <div className="topographic absolute inset-0 opacity-70" aria-hidden />
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur sm:p-12">
          <div className="max-w-2xl">
            <Badge tone="brand" className="bg-white/10 text-[var(--accent)] ring-white/10">
              Súmate al equipo
            </Badge>
            <h2 className="mt-4 font-display text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
              {settings.short_name
                ? `Pedalea con ${settings.short_name}`
                : 'Pedalea con nosotros'}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/65 sm:text-base">
              {settings.join_info ||
                'Si quieres formar parte del equipo, entrenar con nosotros o apoyar el proyecto, escríbenos. Te contamos cómo funciona la convocatoria, las categorías y la membresía.'}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/contacto" className={buttonStyles('primary', 'lg')}>
                <MessageCircle className="h-4 w-4" aria-hidden />
                Escribir al equipo
              </Link>
              {whatsappNumber && (
                <a
                  href={whatsappHref(
                    whatsappNumber,
                    settings.whatsapp_message || DEFAULT_WHATSAPP_MESSAGE,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/25 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  WhatsApp
                </a>
              )}
            </div>
            {!contactEmail && !whatsappNumber && (
              <p className="mt-4 text-xs text-white/40">
                Los canales de contacto se habilitarán desde la configuración del sitio.
              </p>
            )}
          </div>

          {data?.upcoming[0] && (
            <div className="mt-10 grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Próxima carrera
                </p>
                <p className="mt-1 font-display text-xl font-bold uppercase leading-tight">
                  {data.upcoming[0].name}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Fecha
                </p>
                <p className="mt-1 inline-flex items-center gap-2 text-sm text-white/80">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  {formatLongDate(data.upcoming[0].date)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Sede
                </p>
                <p className="mt-1 inline-flex items-center gap-2 text-sm text-white/80">
                  <MapPin className="h-4 w-4" aria-hidden />
                  {[data.upcoming[0].place, data.upcoming[0].city]
                    .filter(Boolean)
                    .join(' · ') || 'Por confirmar'}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
