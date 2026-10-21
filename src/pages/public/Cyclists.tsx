import { useMemo, useState } from 'react';
import { CyclistCard } from '../../components/public/CyclistCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { getActiveCyclists } from '../../services/supabase/cyclists';
import type { Category, Cyclist } from '../../types';

interface CyclistsData {
  cyclists: Cyclist[];
  categories: Category[];
}

function isActiveValue(c: Cyclist): boolean {
  const raw = c as unknown as Record<string, unknown>;
  if (typeof raw.is_active === 'boolean') return raw.is_active;
  if (typeof raw.active === 'boolean') return raw.active;
  return true;
}

function isFeaturedValue(c: Cyclist): boolean {
  const raw = c as unknown as Record<string, unknown>;
  if (typeof raw.is_featured === 'boolean') return raw.is_featured;
  if (typeof raw.featured === 'boolean') return raw.featured;
  return false;
}

function categoryIdOf(c: Cyclist): string {
  return c.category_id ?? '';
}

async function fetchCyclists(): Promise<CyclistsData> {
  const cyclists = await getActiveCyclists();
  let categories: Category[] = [];
  try {
    const { data } = await supabase.from('categories').select('*').order('name');
    categories = ((data ?? []) as Category[]);
  } catch {
    categories = [];
  }
  return { cyclists, categories };
}

export function Cyclists() {
  const { data, loading, error, reload } = useSupabaseQuery(fetchCyclists);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.cyclists.filter((c) => {
      if (category && categoryIdOf(c) !== category) return false;
      if (filter === 'featured' && !isFeaturedValue(c)) return false;
      if (filter === 'active' && !isActiveValue(c)) return false;
      if (q) {
        const hay = `${c.full_name} ${c.nickname ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, category, filter]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState
          title="Supabase no configurado"
          description="Configura las variables de entorno para ver a los corredores."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center px-4 py-16">
        <Spinner label="Cargando corredores…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorState message={error ?? 'No se pudieron cargar los corredores.'} onRetry={reload} />
      </div>
    );
  }

  const categoryOptions = data.categories.map((cat) => ({ value: cat.id, label: cat.name }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <PageHeader
        title="Corredores"
        subtitle={`${data.cyclists.length} corredores activos en el equipo`}
      />

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <Input
          label="Buscar"
          placeholder="Nombre o apodo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label="Categoría"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={categoryOptions}
          placeholder="Todas las categorías"
        />
        <Select
          label="Estado"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          options={[
            { value: 'active', label: 'Activos' },
            { value: 'featured', label: 'Destacados' },
          ]}
          placeholder="Todos"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Sin corredores"
          description="No hay corredores que coincidan con los filtros. Prueba con otra búsqueda."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((cyclist) => (
            <CyclistCard key={cyclist.id} cyclist={cyclist} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Cyclists;
