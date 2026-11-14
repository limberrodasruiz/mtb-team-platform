import { Link } from 'react-router-dom';
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Youtube,
} from 'lucide-react';
import { useSiteSettings } from '../../providers/SiteSettingsProvider';
import { DEFAULT_WHATSAPP_MESSAGE } from '../../constants';
import { Logo } from './Logo';

const CURRENT_YEAR = new Date().getFullYear();

const EXPLORE = [
  { label: 'Equipo', to: '/equipo' },
  { label: 'Corredores', to: '/corredores' },
  { label: 'Ranking', to: '/ranking' },
  { label: 'Carreras', to: '/carreras' },
  { label: 'Resultados', to: '/resultados' },
];

const COMMUNITY = [
  { label: 'Noticias', to: '/noticias' },
  { label: 'Galería', to: '/galeria' },
  { label: 'Auspiciadores', to: '/auspiciadores' },
  { label: 'Contacto', to: '/contacto' },
];

function fullUrl(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

function whatsappUrl(number: string, message: string): string {
  const digits = number.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function Footer() {
  const { settings, contactEmail, whatsappNumber } = useSiteSettings();
  const socials = [
    { label: 'Facebook', href: fullUrl(settings.facebook), icon: Facebook },
    { label: 'Instagram', href: fullUrl(settings.instagram), icon: Instagram },
    { label: 'TikTok', href: fullUrl(settings.tiktok), icon: Music2 },
    { label: 'YouTube', href: fullUrl(settings.youtube), icon: Youtube },
  ].filter((item) => item.href);

  const hasContact = Boolean(contactEmail || whatsappNumber || settings.address);

  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo variant="dark" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              {settings.description ||
                'Equipo de mountain bike de Santa Cruz, Bolivia. Pasión, competencia y comunidad sobre dos ruedas.'}
            </p>
            {socials.length > 0 && (
              <div className="mt-5 flex items-center gap-2">
                {socials.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href!}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Explorar
            </h3>
            <ul className="mt-4 space-y-2.5">
              {EXPLORE.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Comunidad
            </h3>
            <ul className="mt-4 space-y-2.5">
              {COMMUNITY.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Contacto
            </h3>
            {hasContact ? (
              <ul className="mt-4 space-y-3 text-sm">
                {contactEmail && (
                  <li>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="flex items-start gap-2.5 text-slate-400 transition hover:text-white"
                    >
                      <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span className="break-all">{contactEmail}</span>
                    </a>
                  </li>
                )}
                {whatsappNumber && (
                  <li>
                    <a
                      href={whatsappUrl(
                        whatsappNumber,
                        settings.whatsapp_message || DEFAULT_WHATSAPP_MESSAGE,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-2.5 text-slate-400 transition hover:text-white"
                    >
                      <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>{whatsappNumber}</span>
                    </a>
                  </li>
                )}
                {settings.address && (
                  <li className="flex items-start gap-2.5 text-slate-400">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{settings.address}</span>
                  </li>
                )}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-slate-500">
                Los canales de contacto se publicarán cuando estén configurados.
              </p>
            )}
            <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-white/30">
              {settings.founded_year ? `Desde ${settings.founded_year}` : 'MTB Bolivia'}
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {CURRENT_YEAR} {settings.team_name}. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <span>Santa Cruz, Bolivia</span>
            <Link to="/admin/login" className="transition hover:text-white">
              Acceso privado
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
