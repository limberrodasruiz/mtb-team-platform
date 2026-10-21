import { Link } from 'react-router-dom';
import { NAV_PUBLIC } from '../../constants';
import { useSiteSettings } from '../../hooks/useSiteSettings';

export function Footer() {
  const { settings } = useSiteSettings();
  const year = new Date().getFullYear();

  const socials: { label: string; href: string }[] = [];
  if (settings.social_facebook) {
    socials.push({ label: 'Facebook', href: settings.social_facebook });
  }
  if (settings.social_instagram) {
    socials.push({ label: 'Instagram', href: settings.social_instagram });
  }
  if (settings.social_tiktok) {
    socials.push({ label: 'TikTok', href: settings.social_tiktok });
  }

  return (
    <footer className="bg-shark-900 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
        <div>
          <p className="text-base font-bold text-white">{settings.team_name}</p>
          {settings.slogan ? <p className="mt-1 text-sm text-slate-400">{settings.slogan}</p> : null}
          {socials.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <nav aria-label="Mapa del sitio">
          <p className="text-sm font-semibold text-white">Explora</p>
          <ul className="mt-3 space-y-2 text-sm">
            {NAV_PUBLIC.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-sm font-semibold text-white">Contacto</p>
          <ul className="mt-3 space-y-2 text-sm">
            {settings.contact_email ? <li>{settings.contact_email}</li> : null}
            {settings.contact_phone ? <li>{settings.contact_phone}</li> : null}
            {settings.address ? <li>{settings.address}</li> : null}
            {!settings.contact_email && !settings.contact_phone && !settings.address ? (
              <li className="text-slate-500">Pronto publicaremos nuestros datos de contacto.</li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-xl bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">¿Quieres ser auspiciador?</p>
          <p className="mt-1 text-sm text-slate-400">
            Apoya al equipo y haz visible tu marca en cada carrera.
          </p>
          <Link
            to="/auspiciadores"
            className="mt-3 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Ver auspiciadores
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-slate-500">
          © {year} {settings.team_name}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
