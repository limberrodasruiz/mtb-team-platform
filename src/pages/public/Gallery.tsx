import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getGallery } from '../../services/supabase/content';
import { getPublicImageUrl } from '../../services/supabase/storage';
import { STORAGE_BUCKETS } from '../../constants';
import type { GalleryItem } from '../../types';

function imageUrlOf(item: GalleryItem): string | null {
  const raw = item as unknown as Record<string, unknown>;
  if (typeof raw.image_url === 'string' && raw.image_url) return raw.image_url;
  if (typeof raw.url === 'string' && raw.url) return raw.url;
  if (typeof raw.storage_path === 'string' && raw.storage_path) {
    try {
      return getPublicImageUrl(STORAGE_BUCKETS.GALLERY, raw.storage_path);
    } catch {
      return null;
    }
  }
  return null;
}

export function Gallery() {
  const { data, loading, error, reload } = useSupabaseQuery(getGallery);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const withUrl = data.filter((g) => imageUrlOf(g));
    if (!q) return withUrl;
    return withUrl.filter((g) => (g.title ?? '').toLowerCase().includes(q));
  }, [data, search]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState title="Supabase no configurado" description="No se puede mostrar la galería." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center px-4 py-16">
        <Spinner label="Cargando galería…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorState message={error ?? 'No se pudo cargar la galería.'} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <PageHeader title="Galería" subtitle={`${filtered.length} fotos`} />
      <div className="max-w-md">
        <Input
          label="Buscar"
          placeholder="Buscar por título…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="Sin fotos" description="Aún no hay fotos publicadas en la galería." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => {
            const url = imageUrlOf(item);
            if (!url) return null;
            return (
              <figure key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <img src={url} alt={item.title ?? 'Foto del equipo'} className="aspect-square w-full object-cover" loading="lazy" />
                {item.title ? (
                  <figcaption className="px-3 py-2 text-xs font-medium text-slate-600">{item.title}</figcaption>
                ) : null}
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Gallery;
