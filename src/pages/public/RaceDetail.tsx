import { Link, useParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { getRaceBySlug, getRaceRegistrations } from '../../services/supabase/races';
import { getResults } from '../../services/supabase/results';
import type { Cyclist, Race, RaceRegistration, RaceResult } from '../../types';

interface RaceDetailData {
  race: Race;
  registrations: RaceRegistration[];
  cyclists: Cyclist[];
  results: RaceResult[];
}

async function fetchRaceDetail(slug: string): Promise<RaceDetailData | null> {
  const race = await getRaceBySlug(slug);
  if (!race) return null;
  const [registrations, results] = await Promise.all([
    getRaceRegistrations(race.id),
    getResults({ raceId: race.id }),
  ]);
  const ids = [...new Set([...registrations.map((r) => r.cyclist_id), ...results.map((r) => r.cyclist_id)])];
  let cyclists: Cyclist[] = [];
  if (ids.length > 0) {
    const { data } = await supabase.from('cyclists').select('*').in('id', ids);
    cyclists = ((data ?? []) as Cyclist[]);
  }
  return { race, registrations, cyclists, results };
}

function cyclistName(cyclists: Cyclist[], id: string): string {
  return cyclists.find((c) => c.id === id)?.full_name ?? 'Corredor';
}

function dateLabel(race: Race): string {
  const raw = race as unknown as Record<string, unknown>;
  const d = typeof raw.race_date === 'string' ? raw.race_date : typeof raw.date === 'string' ? raw.date : null;
  if (!d) return 'Fecha por confirmar';
  return new Date(`${d}T00:00:00`).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function RaceDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data, loading, error, reload } = useSupabaseQuery(() => fetchRaceDetail(slug), [slug]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState title="Supabase no configurado" description="No se puede mostrar la carrera." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center px-4 py-16">
        <Spinner label="Cargando carrera…" />
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

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState
          title="Carrera no encontrada"
          description="La carrera que buscas no existe."
          action={
            <Link to="/carreras" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Volver a carreras
            </Link>
          }
        />
      </div>
    );
  }

  const { race } = data;
  const image = race.image_url ?? null;
  const raw = race as unknown as Record<string, unknown>;
  const place = typeof raw.place === 'string' ? raw.place : null;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <Link to="/carreras" className="text-sm font-medium text-brand-600 hover:underline">
        ← Volver a carreras
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {image ? (
          <img src={image} alt={race.name} className="aspect-video w-full object-cover" />
        ) : null}
        <div className="space-y-3 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={race.status === 'ABIERTA' ? 'success' : race.status === 'CANCELADA' ? 'danger' : 'info'}>
              {race.status}
            </Badge>
            <span className="text-sm text-slate-500">{dateLabel(race)}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{race.name}</h1>
          <p className="text-sm text-slate-500">
            {[race.location, place].filter(Boolean).join(' · ') || 'Lugar por confirmar'}
          </p>
          {race.description ? <p className="text-sm leading-relaxed text-slate-600 sm:text-base">{race.description}</p> : null}
          <dl className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
            {race.distance_km ? (
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <dt className="text-xs text-slate-500">Distancia</dt>
                <dd className="font-bold">{race.distance_km} km</dd>
              </div>
            ) : null}
            {race.elevation_m ? (
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <dt className="text-xs text-slate-500">Desnivel</dt>
                <dd className="font-bold">{race.elevation_m} m+</dd>
              </div>
            ) : null}
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <dt className="text-xs text-slate-500">Inscritos</dt>
              <dd className="font-bold">{data.registrations.length}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <dt className="text-xs text-slate-500">Resultados</dt>
              <dd className="font-bold">{data.results.length}</dd>
            </div>
          </dl>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-bold text-slate-900">Corredores inscritos</h2>
        {data.registrations.length === 0 ? (
          <EmptyState title="Sin inscritos" description="Aún no hay inscritos publicados." className="mt-3" />
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.registrations.map((reg) => (
              <li key={reg.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800">
                {cyclistName(data.cyclists, reg.cyclist_id)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">Resultados</h2>
        <div className="mt-3">
          <Table
            columns={[
              { key: 'pos', header: 'Pos.', render: (r) => `#${r.position}` },
              { key: 'rider', header: 'Corredor', render: (r) => cyclistName(data.cyclists, r.cyclist_id) },
              { key: 'pts', header: 'Puntos', render: (r) => r.points },
            ]}
            data={[...data.results].sort((a, b) => a.position - b.position)}
            keyExtractor={(r) => r.id}
            emptyMessage="Aún no hay resultados para esta carrera."
          />
        </div>
      </section>
    </div>
  );
}

export default RaceDetail;
