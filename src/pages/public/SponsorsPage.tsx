import { Link } from 'react-router-dom';
import { Handshake, HeartHandshake, Mail, MessageCircle, Sparkles } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useSiteSettings } from '../../providers/SiteSettingsProvider';
import { getPublicSponsors } from '../../services/content';
import { buttonStyles } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { PublicPageHero } from '../../components/public/PublicPageHero';
import { Section, SectionHeading } from '../../components/public/SectionHeading';
import { SponsorGrid } from '../../components/public/SponsorGrid';

export function SponsorsPage() {
  useDocumentTitle('Auspiciadores');
  const { settings, contactEmail, whatsappNumber } = useSiteSettings();
  const { data, loading, error, reload } = useAsync(getPublicSponsors, []);
  const sponsors = data ?? [];
  const sponsorEmail = settings.sponsor_email || contactEmail;

  return (
    <>
      <PublicPageHero
        eyebrow="Aliados del proyecto"
        title="Auspiciadores"
        description="Las marcas y personas que hacen posible que el equipo siga pedaleando."
        crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Auspiciadores' }]}
        compact
      />

      <Section className="pt-10 sm:pt-12">
        <SectionHeading
          eyebrow="Gracias a ellos"
          title="Nuestros aliados"
          description="Cada apoyo se transforma en entrenamiento, equipamiento, logística y competencia."
        />

        {loading ? (
          <LoadingBlock message="Cargando auspiciadores…" />
        ) : error ? (
          <ErrorState
            title="No se pudieron cargar los auspiciadores"
            message={error}
            onRetry={reload}
          />
        ) : sponsors.length === 0 ? (
          <EmptyState
            icon={Handshake}
            title="Auspiciadores en camino"
            description="Estamos preparando la presentación de nuestras marcas aliadas. Si quieres apoyar al equipo, escríbenos."
            action={
              <Link to="/contacto" className={buttonStyles('primary', 'md')}>
                Quiero auspiciar
              </Link>
            }
          />
        ) : (
          <>
            {sponsors.some((sponsor) => sponsor.featured) && (
              <div className="mb-10">
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  Aliados principales
                </p>
                <SponsorGrid
                  sponsors={sponsors.filter((sponsor) => sponsor.featured)}
                  compact
                />
              </div>
            )}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Red de apoyo
              </p>
              <p className="text-xs text-slate-500">
                {sponsors.length} {sponsors.length === 1 ? 'aliado' : 'aliados'}
              </p>
            </div>
            <SponsorGrid sponsors={sponsors} />
          </>
        )}

        {(settings.sponsor_info || sponsorEmail) && (
          <div className="mt-12 overflow-hidden rounded-3xl bg-[var(--secondary)] p-8 text-white sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
                  <HeartHandshake className="h-4 w-4" aria-hidden />
                  Súmate como auspiciador
                </p>
                <h2 className="mt-3 font-display text-4xl font-bold uppercase leading-none">
                  Tu marca, junto al equipo
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65">
                  {settings.sponsor_info ||
                    'Buscamos aliados que quieran acompañar el crecimiento del mountain bike en Bolivia. Escríbenos para conocer las opciones de apoyo y visibilidad.'}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {sponsorEmail && (
                  <a
                    href={`mailto:${sponsorEmail}?subject=${encodeURIComponent('Propuesta de auspicio')}`}
                    className={buttonStyles('primary', 'lg', true)}
                  >
                    <Mail className="h-4 w-4" aria-hidden />
                    {sponsorEmail}
                  </a>
                )}
                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/[^\d]/g, '')}?text=${encodeURIComponent('Hola, me interesa auspiciar al equipo de MTB.')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/25 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    Hablar por WhatsApp
                  </a>
                )}
                {!sponsorEmail && !whatsappNumber && (
                  <Link to="/contacto" className={buttonStyles('outline', 'lg', true)}>
                    Ir a contacto
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {!settings.sponsor_info && !sponsorEmail && sponsors.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Sparkles className="h-4 w-4 text-[var(--brand)]" aria-hidden />
              ¿Quieres que tu marca aparezca aquí?
            </p>
            <Link to="/contacto" className={buttonStyles('primary', 'sm')}>
              Contactar
            </Link>
          </div>
        )}
      </Section>
    </>
  );
}
