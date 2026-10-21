import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { getResults } from '../../services/supabase/results';
import type { Category, Cyclist, Race, RaceResult } from '../../types';

interface ResultsData {
  results: RaceResult[];
  races: Race[];
  cyclists: Cyclist[];
  categories: Category[];
  years: number[];
}

function raceDateValue(race: Race | undefined): string | null {
  if (!race) return null;
  const raw = race as unknown as Record<string, unknown>;
  if (typeof raw.race_date === 'string') return raw.race_date;
  if (typeof raw.date === 'string') return raw.date;
  return null;
}

async function fetchResultsData(): Promise<ResultsData> {
  const [results, { data: races }, { data: cyclists }, { data: cats }] = await Promise.all([
    getResults(),
    supabase.from('races').select('*').order('created_at', { ascending: false }),
    supabase.from('cyclists').select('id, full_name, slug'),
    supabase.from('categories').select('*'),
  ]);
  const raceList = ((races ?? []) as Race[]);
  const years = [...new Set(raceList.map((r) => raceDateValue(r)?.slice(0, 4)).filter(Boolean) as string[])]
    .map(Number)
    .sort((a, b) => b - a);
  return {
    results,
    races: raceList,
    cyclists: ((cyclists ?? []) as Cyclist[]),
    categories: ((cats ?? []) as Category[]),
    years,
  };
}

export function Results() {
  const { data, loading, error, reload } = useSupabaseQuery(fetchResultsData);
  const [year, setYear] = useState('');
  const [raceId, setRaceId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cyclistId, setCyclistId] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    const raceById = new Map(data.races.map((r) => [r.id, r]));
    return data.results.filter((r) => {
      if (raceId && r.race_id !== raceId) return false;
      if (categoryId && r.category_id !== categoryId) return false;
      if (cyclistId && r.cyclist_id !== cyclistId) return false;
      if (year) {
        const d = raceDateValue(raceById.get(r.race_id));
        if (!d || !d.startsWith(year)) return false;
      }
      return true;
    });
  }, [data, year, raceId, categoryId, cyclistId]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState title="Supabase no configurado" description="No se pueden mostrar los resultados." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center px-4 py-16">
        <Spinner label="Cargando resultados…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorState message={error ?? 'No se pudieron cargar los resultados.'} onRetry={reload} />
      </div>
    );
  }

  const raceName = (id: string) => data.races.find((r) => r.id === id)?.name ?? '—';
  const riderName = (id: string) => data.cyclists.find((c) => c.id === id)?.full_name ?? '—';
  const catName = (id: string | null | undefined) =>
    id ? (data.categories.find((c) => c.id === id)?.name ?? '—') : '—';

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <PageHeader title="Resultados" subtitle={`${filtered.length} resultados`} />

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Año"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          options={data.years.map((y) => ({ value: String(y), label: String(y) }))}
          placeholder="Todos"
        />
        <Select
          label="Carrera"
          value={raceId}
          onChange={(e) => setRaceId(e.target.value)}
          options={data.races.map((r) => ({ value: r.id, label: r.name }))}
          placeholder="Todas"
        />
        <Select
          label="Categoría"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={data.categories.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Todas"
        />
        <Select
          label="Corredor"
          value={cyclistId}
          onChange={(e) => setCyclistId(e.target.value)}
          options={data.cyclists.map((c) => ({ value: c.id, label: c.full_name }))}
          placeholder="Todos"
        />
      </div>

      <Table
        columns={[
          { key: 'race', header: 'Carrera', render: (r) => raceName(r.race_id) },
          { key: 'rider', header: 'Corredor', render: (r) => riderName(r.cyclist_id) },
          { key: 'cat', header: 'Categoría', render: (r) => catName(r.category_id) },
          { key: 'pos', header: 'Posición', render: (r) => `#${r.position}` },
          { key: 'pts', header: 'Puntos', render: (r) => r.points },
        ]}
        data={filtered}
        keyExtractor={(r) => r.id}
        emptyMessage="No hay resultados para los filtros seleccionados."
      />
    </div>
  );
}

export default Results;
