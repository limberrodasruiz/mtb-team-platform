import { useState, type FormEvent } from 'react';
import {
  Clock,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Send,
  Youtube,
} from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useSiteSettings } from '../../providers/SiteSettingsProvider';
import { useToast } from '../../providers/ToastProvider';
import { DEFAULT_WHATSAPP_MESSAGE } from '../../constants';
import { isValidEmail } from '../../utils/validation';
import { buttonStyles } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { PublicPageHero } from '../../components/public/PublicPageHero';
import { Section } from '../../components/public/SectionHeading';

function fullUrl(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

const SUBJECTS = [
  'Información general',
  'Quiero sumarme al equipo',
  'Auspicio y alianzas',
  'Prensa y comunicación',
  'Otro',
];

export function ContactPage() {
  useDocumentTitle('Contacto');
  const { settings, contactEmail, whatsappNumber } = useSiteSettings();
  const { info, warning } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const socials = [
    { label: 'Facebook', href: fullUrl(settings.facebook), icon: Facebook },
    { label: 'Instagram', href: fullUrl(settings.instagram), icon: Instagram },
    { label: 'TikTok', href: fullUrl(settings.tiktok), icon: Music2 },
    { label: 'YouTube', href: fullUrl(settings.youtube), icon: Youtube },
  ].filter((item) => item.href);

  const hasChannels = Boolean(contactEmail || whatsappNumber || settings.address);
  const mapUrl = settings.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`
    : null;

  function compose(): string {
    return [
      `Nombre: ${name.trim()}`,
      email.trim() ? `Correo: ${email.trim()}` : null,
      `Motivo: ${subject}`,
      '',
      message.trim(),
    ]
      .filter((line) => line !== null)
      .join('\n');
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Indica tu nombre.');
      return;
    }
    if (email.trim() && !isValidEmail(email)) {
      setError('El correo no tiene un formato válido.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Escribe un mensaje de al menos 10 caracteres.');
      return;
    }

    const body = compose();

    if (contactEmail) {
      const href = `mailto:${contactEmail}?subject=${encodeURIComponent(
        `[Web] ${subject}`,
      )}&body=${encodeURIComponent(body)}`;
      window.location.href = href;
      info('Se abrirá tu aplicación de correo con el mensaje preparado.');
      return;
    }

    if (whatsappNumber) {
      const href = `https://wa.me/${whatsappNumber.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
        body,
      )}`;
      window.open(href, '_blank', 'noopener,noreferrer');
      info('Se abrirá WhatsApp con el mensaje preparado.');
      return;
    }

    warning(
      'El equipo todavía no configuró un canal de contacto. Intenta nuevamente más tarde.',
    );
  }

  return (
    <>
      <PublicPageHero
        eyebrow="Hablemos"
        title="Contacto"
        description="Consultas, inscripciones, auspicios o simplemente ganas de pedalear: escríbenos."
        crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Contacto' }]}
        compact
      />

      <Section className="pt-10 sm:pt-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
              Formulario
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase leading-none text-slate-950">
              Escríbenos un mensaje
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Completa los datos y elige cómo enviarlo. El mensaje se prepara en tu correo o
              WhatsApp; no se almacena en este sitio.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Nombre"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Tu nombre"
                  required
                  autoComplete="name"
                />
                <Input
                  label="Correo"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  hint="Opcional, para que podamos responderte."
                />
              </div>

              <Select
                label="Motivo"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              >
                {SUBJECTS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>

              <Textarea
                label="Mensaje"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={6}
                placeholder="Cuéntanos en qué podemos ayudarte…"
                required
              />

              {error && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700" role="alert">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className={buttonStyles('primary', 'md')}>
                  <Send className="h-4 w-4" aria-hidden />
                  Preparar mensaje
                </button>
                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                      settings.whatsapp_message || DEFAULT_WHATSAPP_MESSAGE,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonStyles('outline', 'md')}
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    WhatsApp directo
                  </a>
                )}
              </div>
              {!contactEmail && !whatsappNumber && (
                <p className="text-xs text-amber-700">
                  Los canales de envío aún no están configurados por el equipo.
                </p>
              )}
            </form>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Canales directos
              </p>
              {hasChannels ? (
                <ul className="mt-4 space-y-4 text-sm">
                  {contactEmail && (
                    <li>
                      <a
                        href={`mailto:${contactEmail}`}
                        className="flex items-start gap-3 text-slate-700 transition hover:text-[var(--brand-dark)]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-dark)]">
                          <Mail className="h-4 w-4" aria-hidden />
                        </span>
                        <span>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Correo
                          </span>
                          <span className="break-all font-medium">{contactEmail}</span>
                        </span>
                      </a>
                    </li>
                  )}
                  {whatsappNumber && (
                    <li>
                      <a
                        href={`https://wa.me/${whatsappNumber.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                          settings.whatsapp_message || DEFAULT_WHATSAPP_MESSAGE,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-start gap-3 text-slate-700 transition hover:text-[var(--brand-dark)]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-dark)]">
                          <MessageCircle className="h-4 w-4" aria-hidden />
                        </span>
                        <span>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            WhatsApp
                          </span>
                          <span className="font-medium">{whatsappNumber}</span>
                        </span>
                      </a>
                    </li>
                  )}
                  {settings.address && (
                    <li>
                      {mapUrl ? (
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-start gap-3 text-slate-700 transition hover:text-[var(--brand-dark)]"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-dark)]">
                            <MapPin className="h-4 w-4" aria-hidden />
                          </span>
                          <span>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Ubicación
                            </span>
                            <span className="font-medium">{settings.address}</span>
                          </span>
                        </a>
                      ) : (
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-dark)]">
                            <MapPin className="h-4 w-4" aria-hidden />
                          </span>
                          <span>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Ubicación
                            </span>
                            <span className="font-medium text-slate-700">{settings.address}</span>
                          </span>
                        </div>
                      )}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Los canales de contacto se publicarán cuando el equipo los configure. Mientras
                  tanto, puedes visitar nuestras redes sociales.
                </p>
              )}

              {socials.length > 0 && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Redes sociales
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {socials.map(({ label, href, icon: Icon }) => (
                      <a
                        key={label}
                        href={href!}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={label}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]"
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-[var(--secondary)] p-5 text-white">
              <Clock className="h-5 w-5 text-[var(--accent)]" aria-hidden />
              <p className="mt-3 font-display text-xl font-bold uppercase leading-tight">
                Respuesta del equipo
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                Respondemos las consultas por orden de llegada. Para temas urgentes de carrera,
                usa WhatsApp.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-slate-500 shadow-sm">
              <p className="font-semibold text-slate-700">Sobre tus datos</p>
              <p className="mt-1.5">
                Este formulario no envía datos a un servidor. Solo prepara un mensaje en tu
                aplicación de correo o WhatsApp para que decidas enviarlo.
              </p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
