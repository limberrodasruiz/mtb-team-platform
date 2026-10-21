import { Link } from 'react-router-dom';
import { SponsorGrid } from '../../components/public/SponsorGrid';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getActiveSponsors, getSiteSettings } from '../../services/supabase/content';

async function fetchSponsors() {
  const [sponsors, settings] = await Promise.all([getActiveSponsors(), getSiteSettings()]);
  return { sponsors, settings };
}

export function Sponsors() {
  const { data, loading, error, reload } = useSupabaseQuery(fetchSponsors);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState title="Supabase no configurado" description="No se pueden mostrar los auspiciadores." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center px-4 py-16">
        <Spinner label="Cargando auspiciadores…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorState message={error ?? 'No se pudieron cargar los auspiciadores.'} onRetry={reload} />
      </div>
    );
  }

  const raw = (data.settings ?? {}) as unknown as Record<string, unknown>;
  const email = data.settings?.contact_email ?? (typeof raw.email === 'string' ? raw.email : null);
  const phone =
    data.settings?.contact_phone ??
    (typeof raw.whatsapp === 'string' ? raw.whatsapp : null);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
      <PageHeader title="Auspiciadores" subtitle="Marcas que hacen posible cada carrera" />

      {data.sponsors.length === 0 ? (
        <EmptyState title="Sin auspiciadores" description="Pronto anunciaremos a nuestros aliados." />
      ) : (
        <SponsorGrid sponsors={data.sponsors} />
      )}

      <section className="grid gap-4 rounded-2xl bg-slate-900 p-6 text-white sm:p-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">¿Quieres ser parte?</h2>
          <p className="mt-2 text-sm text-slate-300">
            Apoya al equipo con indumentaria, logística, hidratación o premios. A cambio, tu marca
            aparece en uniformes, redes sociales, banners y eventos oficiales.
          </p>
          <ul className="mt-4 space-y-1 text-sm text-slate-300">
            <li>· Visibilidad en carreras departamentales y municipales</li>
            <li>· Menciones en noticias y galería oficial</li>
            <li>· Reporte público de transparencia</li>
          </ul>
        </div>
        <div className="rounded-xl bg-white/5 p-5">
          <h3 className="font-semibold">Contacto de auspicios</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            {email ? <li>Email: {email}</li> : null}
            {phone ? <li>WhatsApp: {phone}</li> : null}
            {!email && !phone ? <li>Escríbenos desde la página de contacto.</li> : null}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/contacto"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Contactar
            </Link>
            <Link
              to="/transparencia"
              className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
            >
              Ver transparencia
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Sponsors;
