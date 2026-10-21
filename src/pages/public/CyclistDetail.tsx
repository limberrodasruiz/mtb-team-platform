import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/ui/StatCard';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { getCyclistBySlug, getCyclistStats } from '../../services/supabase/cyclists';
import { getResultsByCyclist } from '../../services/supabase/results';
import { getGallery } from '../../services/supabase/content';
import type { Category, Cyclist, GalleryItem, Race, RaceResult } from '../../types';

interface DetailData {
  cyclist: Cyclist;
  results: RaceResult[];
  races: Race[];
  categories: Category[];
  achievements: Array<Record<string, unknown>>;
  gallery: GalleryItem[];
  stats: Awaited<ReturnType<typeof getCyclistStats>>;
}

function galleryUrl(item: GalleryItem): string | null {
  const raw = item as unknown as Record<string, unknown>;
  if (typeof raw.image_url === 'string' && raw.image_url) return raw.image_url;
  if (typeof raw.url === 'string' && raw.url) return raw.url;
  return null;
}

function achievementTitle(a: Record<string, unknown>): string {
  return typeof a.title === 'string' ? a.title : 'Logro';
}

function achievementDate(a: Record<string, unknown>): string {
  if (typeof a.achieved_at === 'string') return a.achieved_at.slice(0, 10);
  if (typeof a.year === 'number') return String(a.year);
  if (typeof a.year === 'string') return a.year;
  return '—';
}

async function fetchDetail(slug: string): Promise<DetailData | null> {
  const cyclist = await getCyclistBySlug(slug);
  if (!cyclist) return null;
  const [results, stats, galleryAll] = await Promise.all([
    getResultsByCyclist(cyclist.id),
    getCyclistStats(cyclist.id),
    getGallery().catch(() => [] as GalleryItem[]),
  ]);

  const raceIds = [...new Set(results.map((r) => r.race_id))];
  let races: Race[] = [];
  if (raceIds.length > 0) {
    const { data } = await supabase.from('races').select('*').in('id', raceIds);
    races = ((data ?? []) as Race[]);
  }
  const { data: cats } = await supabase.from('categories').select('*');
  const { data: ach } = await supabase
    .from('achievements')
    .select('*')
    .eq('cyclist_id', cyclist.id)
    .order('created_at', { ascending: false });

  const gallery = galleryAll.filter((g) => {
    const raw = g as unknown as Record<string, unknown>;
    return raw.cyclist_id === cyclist.id;
  });

  return {
    cyclist,
    results,
    races,
    categories: ((cats ?? []) as Category[]),
    achievements: ((ach ?? []) as Array<Record<string, unknown>>),
    gallery,
    stats,
  };
}

function raceOf(races: Race[], id: string): Race | undefined {
  return races.find((r) => r.id === id);
}

function raceDateLabel(race: Race | undefined): string {
  if (!race) return '—';
  const raw = race as unknown as Record<string, unknown>;
  const d = typeof raw.race_date === 'string' ? raw.race_date : typeof raw.date === 'string' ? raw.date : null;
  if (!d) return '—';
  return new Date(`${d}T00:00:00`).toLocaleDateString('es-BO', { year: 'numeric' });
}

function categoryName(categories: Category[], id: string | null | undefined): string {
  if (!id) return '—';
  return categories.find((c) => c.id === id)?.name ?? '—';
}

export function CyclistDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data, loading, error, reload } = useSupabaseQuery(() => fetchDetail(slug), [slug]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState title="Supabase no configurado" description="No se puede mostrar el perfil." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center px-4 py-16">
        <Spinner label="Cargando corredor…" />
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
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-10">
        <EmptyState
          title="Corredor no encontrado"
          description="El perfil que buscas no existe o fue movido."
          action={
            <Link
              to="/corredores"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Volver a corredores
            </Link>
          }
        />
      </div>
    );
  }

  const { cyclist, stats } = data;
  const photo = cyclist.photo_url ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <Link to="/corredores" className="text-sm font-medium text-brand-600 hover:underline">
        ← Volver a corredores
      </Link>

      <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-[240px_1fr]">
        {photo ? (
          <img src={photo} alt={cyclist.full_name} className="h-60 w-full rounded-xl object-cover md:h-72" />
        ) : (
          <span className="flex h-60 w-full items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-shark-900 text-5xl font-bold text-white md:h-72">
            {cyclist.full_name.charAt(0)}
          </span>
        )}
        <div>
          {cyclist.nickname ? (
            <p className="text-sm font-medium uppercase tracking-wide text-brand-600">“{cyclist.nickname}”</p>
          ) : null}
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">{cyclist.full_name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={cyclist.is_active ? 'success' : 'default'}>
              {cyclist.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
            {categoryName(data.categories, cyclist.category_id) !== '—' ? (
              <Badge variant="info">{categoryName(data.categories, cyclist.category_id)}</Badge>
            ) : null}
          </div>
          {cyclist.bio ? <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{cyclist.bio}</p> : null}
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Carreras" value={stats.total_races} />
            <StatCard label="Puntos" value={stats.total_points} />
            <StatCard label="Victorias" value={stats.wins} />
            <StatCard label="Podios" value={stats.podiums} />
          </dl>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-bold text-slate-900">Logros</h2>
        {data.achievements.length === 0 ? (
          <EmptyState title="Sin logros registrados" description="Pronto se publicará el palmarés." className="mt-3" />
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.achievements.map((a, i) => (
              <li key={String(a.id ?? i)} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{achievementTitle(a)}</p>
                {typeof a.description === 'string' ? (
                  <p className="mt-1 text-sm text-slate-500">{a.description}</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-400">{achievementDate(a)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.gallery.length > 0 ? (
        <section>
          <h2 className="text-xl font-bold text-slate-900">Galería del corredor</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.gallery.map((g) => {
              const url = galleryUrl(g);
              if (!url) return null;
              return (
                <img
                  key={g.id}
                  src={url}
                  alt={g.title ?? cyclist.full_name}
                  className="aspect-square w-full rounded-xl object-cover"
                  loading="lazy"
                />
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-xl font-bold text-slate-900">Historial de resultados</h2>
        <div className="mt-3">
          <Table
            columns={[
              { key: 'year', header: 'Año', render: (r: RaceResult) => raceDateLabel(raceOf(data.races, r.race_id)) },
              { key: 'race', header: 'Carrera', render: (r: RaceResult) => raceOf(data.races, r.race_id)?.name ?? '—' },
              { key: 'cat', header: 'Categoría', render: (r: RaceResult) => categoryName(data.categories, r.category_id) },
              { key: 'pos', header: 'Posición', render: (r: RaceResult) => `#${r.position}` },
              { key: 'pts', header: 'Puntos', render: (r: RaceResult) => r.points },
            ]}
            data={data.results}
            keyExtractor={(r) => r.id}
            emptyMessage="Este corredor aún no tiene resultados publicados."
          />
        </div>
      </section>
    </div>
  );
}

export default CyclistDetail;
