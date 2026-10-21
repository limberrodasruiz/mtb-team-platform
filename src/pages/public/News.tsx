import { useMemo, useState } from 'react';
import { NewsCard } from '../../components/public/NewsCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getNews } from '../../services/supabase/content';

export function News() {
  const { data, loading, error, reload } = useSupabaseQuery(getNews);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((n) =>
      `${n.title} ${n.excerpt ?? ''}`.toLowerCase().includes(q),
    );
  }, [data, search]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState title="Supabase no configurado" description="No se pueden mostrar las noticias." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center px-4 py-16">
        <Spinner label="Cargando noticias…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorState message={error ?? 'No se pudieron cargar las noticias.'} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <PageHeader title="Noticias" subtitle={`${data.length} publicaciones`} />
      <div className="max-w-md">
        <Input
          label="Buscar"
          placeholder="Buscar noticias…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="Sin noticias" description="No hay noticias que coincidan con la búsqueda." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export default News;
