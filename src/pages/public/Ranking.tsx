import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { getTeamRanking } from '../../services/supabase/rankings';
import type { Category, Cyclist } from '../../types';

interface RankingData {
  rows: Awaited<ReturnType<typeof getTeamRanking>>;
  categories: Category[];
  cyclists: Cyclist[];
  years: number[];
}

async function fetchRanking(year: string, categoryId: string): Promise<RankingData> {
  const parsedYear = year ? Number(year) : undefined;
  const rows = await getTeamRanking(
    Number.isFinite(parsedYear) ? parsedYear : undefined,
    categoryId || undefined,
  );
  const [{ data: cats }, { data: cyc }, { data: races }] = await Promise.all([
    supabase.from('categories').select('*'),
    supabase.from('cyclists').select('id, category_id'),
    supabase.from('races').select('id, race_date, date'),
  ]);
  const categories = ((cats ?? []) as Category[]);
  const cyclists = ((cyc ?? []) as Cyclist[]);
  const yearSet = new Set<number>();
  for (const r of ((races ?? []) as Array<Record<string, unknown>>)) {
    const d = typeof r.race_date === 'string' ? r.race_date : typeof r.date === 'string' ? r.date : null;
    if (d) yearSet.add(new Date(`${d}T00:00:00`).getFullYear());
  }
  const current = new Date().getFullYear();
  if (yearSet.size === 0) {
    for (let y = current - 4; y <= current; y += 1) yearSet.add(y);
  }
  return { rows, categories, cyclists, years: [...yearSet].sort((a, b) => b - a) };
}

export function Ranking() {
  const [year, setYear] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const { data, loading, error, reload } = useSupabaseQuery(
    () => fetchRanking(year, categoryId),
    [year, categoryId],
  );

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState title="Supabase no configurado" description="No se puede mostrar el ranking." />
      </div>
    );
  }

  const categoryByCyclist = new Map<string, string>();
  if (data) {
    for (const c of data.cyclists) {
      if (c.category_id) {
        const name = data.categories.find((cat) => cat.id === c.category_id)?.name;
        if (name) categoryByCyclist.set(c.id, name);
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <PageHeader title="Ranking del equipo" subtitle="Puntos acumulados por corredor" />

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <Select
          label="Año"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          options={(data?.years ?? []).map((y) => ({ value: String(y), label: String(y) }))}
          placeholder="Todos los años"
        />
        <Select
          label="Categoría"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={(data?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Todas las categorías"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Cargando ranking…" />
        </div>
      ) : error || !data ? (
        <ErrorState message={error ?? 'No se pudo cargar el ranking.'} onRetry={reload} />
      ) : data.rows.length === 0 ? (
        <EmptyState
          title="Sin ranking"
          description="No hay puntos registrados para los filtros seleccionados."
        />
      ) : (
        <Table
          columns={[
            {
              key: 'pos',
              header: 'Pos',
              render: (r) => `#${(r as unknown as { _pos: number })._pos}`,
            },
            {
              key: 'rider',
              header: 'Corredor',
              render: (r) =>
                r.slug ? (
                  <Link to={`/corredores/${r.slug}`} className="font-medium text-brand-600 hover:underline">
                    {r.full_name}
                  </Link>
                ) : (
                  r.full_name
                ),
            },
            {
              key: 'cat',
              header: 'Categoría',
              render: (r) => categoryByCyclist.get(r.cyclist_id) ?? '—',
            },
            { key: 'pts', header: 'Puntos', render: (r) => r.total_points },
            { key: 'wins', header: 'Victorias', render: (r) => r.wins },
            { key: 'pod', header: 'Podios', render: (r) => r.podiums },
          ]}
          data={data.rows.map((r, i) => ({ ...r, _pos: i + 1 }))}
          keyExtractor={(r) => r.cyclist_id}
          emptyMessage="Sin datos de ranking."
        />
      )}
    </div>
  );
}

export default Ranking;
