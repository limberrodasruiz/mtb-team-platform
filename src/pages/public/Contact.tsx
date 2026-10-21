import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { Card } from '../../components/ui/Card';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getSiteSettings } from '../../services/supabase/content';

export function Contact() {
  const { data, loading, error, reload } = useSupabaseQuery(getSiteSettings);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState title="Supabase no configurado" description="No se puede mostrar el contacto." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center px-4 py-16">
        <Spinner label="Cargando contacto…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  const raw = (data ?? {}) as unknown as Record<string, unknown>;
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
  const email = str(data?.contact_email) ?? str(raw.email);
  const phone = str(data?.contact_phone) ?? str(raw.whatsapp);
  const address = str(data?.address);
  const facebook = str(data?.social_facebook) ?? str(raw.facebook);
  const instagram = str(data?.social_instagram) ?? str(raw.instagram);
  const tiktok = str(data?.social_tiktok) ?? str(raw.tiktok);
  const youtube = str(raw.youtube);
  const socials = [
    facebook ? { label: 'Facebook', href: facebook } : null,
    instagram ? { label: 'Instagram', href: instagram } : null,
    tiktok ? { label: 'TikTok', href: tiktok } : null,
    youtube ? { label: 'YouTube', href: youtube } : null,
  ].filter((s): s is { label: string; href: string } => s !== null);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <PageHeader title="Contacto" subtitle={data?.team_name ?? 'Escríbenos'} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Datos de contacto" subtitle="Respuesta en horario de entrenamiento">
          <ul className="space-y-2 text-sm text-slate-700">
            {email ? (
              <li>
                Email:{' '}
                <a href={`mailto:${email}`} className="font-medium text-brand-600 hover:underline">
                  {email}
                </a>
              </li>
            ) : null}
            {phone ? (
              <li>
                WhatsApp:{' '}
                <a
                  href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-600 hover:underline"
                >
                  {phone}
                </a>
              </li>
            ) : null}
            {address ? <li>Dirección: {address}</li> : null}
            {!email && !phone && !address ? (
              <li className="text-slate-500">Pronto publicaremos nuestros datos de contacto.</li>
            ) : null}
          </ul>
        </Card>

        <Card title="Redes sociales" subtitle="Sigue al equipo">
          {socials.length === 0 ? (
            <p className="text-sm text-slate-500">Pronto publicaremos nuestras redes oficiales.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Escríbenos" subtitle="Auspicios, inscripciones y prensa">
        <p className="text-sm text-slate-600">
          Cuéntanos si quieres auspiciar, unirte como corredor o cubrir una carrera.
          {email ? (
            <>
              {' '}Escríbenos a{' '}
              <a href={`mailto:${email}`} className="font-medium text-brand-600 hover:underline">
                {email}
              </a>
            </>
          ) : null}
          {phone ? (
            <>
              {' '}o por WhatsApp al{' '}
              <a
                href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-600 hover:underline"
              >
                {phone}
              </a>
            </>
          ) : null}
          .
        </p>
      </Card>
    </div>
  );
}

export default Contact;
