import { useMemo, useState } from 'react';
import { RaceCard } from '../../components/public/RaceCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRaces } from '../../services/supabase/races';
import { RACE_STATUS } from '../../constants';

export function Races() {
  const { data, loading, error, reload } = useSupabaseQuery(getRaces);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((race) => {
      if (status && race.status !== status) return false;
      if (q) {
        const raw = race as unknown as Record<string, unknown>;
        const place = typeof raw.place === 'string' ? raw.place : '';
        const hay = `${race.name} ${race.location ?? ''} ${place}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, status]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState title="Supabase no configurado" description="No se puede mostrar el calendario." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center px-4 py-16">
        <Spinner label="Cargando carreras…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorState message={error ?? 'No se pudieron cargar las carreras.'} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <PageHeader title="Carreras" subtitle={`${data.length} carreras en el calendario`} />

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <Input
          label="Buscar"
          placeholder="Nombre o lugar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label="Estado"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={RACE_STATUS.map((s) => ({ value: s, label: s }))}
          placeholder="Todos los estados"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Sin carreras"
          description="No hay carreras que coincidan con los filtros."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((race) => (
            <RaceCard key={race.id} race={race} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Races;
