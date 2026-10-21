import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import type { Cyclist } from '../../types';

interface AchRow extends Record<string, unknown> {
  id: string;
  cyclist_id: string;
  title: string;
  description?: string | null;
}

interface AchievementsData {
  items: AchRow[];
  cyclists: Cyclist[];
}

async function fetchAchievements(): Promise<AchievementsData> {
  const [{ data: ach }, { data: cyc }] = await Promise.all([
    supabase.from('achievements').select('*').order('created_at', { ascending: false }),
    supabase.from('cyclists').select('id, full_name, slug'),
  ]);
  return {
    items: ((ach ?? []) as AchRow[]),
    cyclists: ((cyc ?? []) as Cyclist[]),
  };
}

function achDate(a: AchRow): string {
  if (typeof a.achieved_at === 'string') return a.achieved_at.slice(0, 10);
  if (typeof a.year === 'number') return String(a.year);
  if (typeof a.year === 'string') return a.year;
  return '—';
}

function isHighlight(a: AchRow): boolean {
  return a.highlight === true;
}

export function Achievements() {
  const { data, loading, error, reload } = useSupabaseQuery(fetchAchievements);
  const [filter, setFilter] = useState('');

  const items = useMemo(() => {
    if (!data) return [];
    if (filter === 'highlight') return data.items.filter(isHighlight);
    return data.items;
  }, [data, filter]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState title="Supabase no configurado" description="No se pueden mostrar los logros." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center px-4 py-16">
        <Spinner label="Cargando logros…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorState message={error ?? 'No se pudieron cargar los logros.'} onRetry={reload} />
      </div>
    );
  }

  const riderName = (id: string) => data.cyclists.find((c) => c.id === id)?.full_name ?? 'Equipo';

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <PageHeader title="Logros" subtitle="Palmarés y momentos destacados del equipo" />

      <div className="max-w-xs">
        <Select
          label="Filtro"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          options={[{ value: 'highlight', label: 'Solo destacados' }]}
          placeholder="Todos los logros"
        />
      </div>

      {items.length === 0 ? (
        <EmptyState title="Sin logros" description="Aún no hay logros publicados." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={isHighlight(a) ? 'warning' : 'default'}>
                  {isHighlight(a) ? 'Destacado' : achDate(a)}
                </Badge>
                {isHighlight(a) ? <span className="text-xs text-slate-400">{achDate(a)}</span> : null}
              </div>
              <h3 className="mt-2 font-bold text-slate-900">{a.title}</h3>
              <p className="mt-1 text-sm font-medium text-brand-600">{riderName(a.cyclist_id)}</p>
              {typeof a.description === 'string' && a.description ? (
                <p className="mt-2 text-sm text-slate-500">{a.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Achievements;
