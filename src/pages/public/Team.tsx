import { Link } from 'react-router-dom';
import { SectionTitle } from '../../components/public/SectionTitle';
import { StatsBar } from '../../components/public/StatsBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/ui/StatCard';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getSiteSettings } from '../../services/supabase/content';
import { getActiveCyclists } from '../../services/supabase/cyclists';
import { getRaces } from '../../services/supabase/races';
import { getTeamRanking } from '../../services/supabase/rankings';

async function fetchTeam() {
  const [settings, active, races, ranking] = await Promise.all([
    getSiteSettings(),
    getActiveCyclists(),
    getRaces(),
    getTeamRanking(),
  ]);
  return { settings, active, races, ranking };
}

function settingsText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function Team() {
  const { data, loading, error, reload } = useSupabaseQuery(fetchTeam);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState
          title="Supabase no configurado"
          description="Configura las variables de entorno para ver la información del equipo."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center px-4 py-16">
        <Spinner label="Cargando equipo…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorState message={error ?? 'No se pudo cargar el equipo.'} onRetry={reload} />
      </div>
    );
  }

  const raw = (data.settings ?? {}) as unknown as Record<string, unknown>;
  const teamName = data.settings?.team_name ?? 'Nuestro equipo';
  const about =
    settingsText(data.settings?.about_text) ??
    settingsText(raw.description) ??
    settingsText(raw.history) ??
    'Equipo de mountain bike comprometido con la formación deportiva y la competencia.';
  const history = settingsText(raw.history);
  const foundedYear =
    typeof raw.founded_year === 'number' ? raw.founded_year : null;
  const podiums = data.ranking.reduce((acc, r) => acc + (r.podiums ?? 0), 0);
  const wins = data.ranking.reduce((acc, r) => acc + (r.wins ?? 0), 0);
  const finished = data.races.filter((r) => r.status === 'FINALIZADA').length;

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
      <PageHeader
        title={teamName}
        subtitle={data.settings?.slogan ?? 'Historia, valores y trayectoria'}
      />

      <StatsBar
        stats={[
          { label: 'Corredores activos', value: data.active.length },
          { label: 'Carreras disputadas', value: finished },
          { label: 'Victorias', value: wins },
          { label: 'Podios', value: podiums },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <SectionTitle title="Nuestra historia" />
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:text-base">
            {history ?? about}
          </p>
          {history ? (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:text-base">
              {about}
            </p>
          ) : null}
          {foundedYear ? (
            <p className="mt-4 text-sm font-medium text-slate-500">
              Fundado en {foundedYear}
            </p>
          ) : null}
        </div>
        <div className="grid content-start gap-4">
          <StatCard label="Plantilla actual" value={data.active.length} description="Corredores activos" />
          <StatCard label="Temporadas en carrera" value={data.races.length} description="Carreras registradas" />
          <StatCard label="Espíritu" value="MTB" description="XC · Maratón · Descenso" />
        </div>
      </section>

      <section>
        <SectionTitle
          title="Trayectoria"
          subtitle="Del entrenamiento local a los podios departamentales."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.races.slice(0, 3).map((race) => (
            <article key={race.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {race.status}
              </p>
              <h3 className="mt-1 font-bold text-slate-900">{race.name}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {new Date(`${race.race_date}T00:00:00`).toLocaleDateString('es-BO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              {race.description ? (
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">{race.description}</p>
              ) : null}
            </article>
          ))}
        </div>
        {data.races.length === 0 ? (
          <EmptyState
            title="Sin trayectoria registrada"
            description="Aún no hay carreras registradas en el sistema."
            className="mt-4"
          />
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/corredores"
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Conoce a los corredores
          </Link>
          <Link
            to="/contacto"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Contacto
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Team;
