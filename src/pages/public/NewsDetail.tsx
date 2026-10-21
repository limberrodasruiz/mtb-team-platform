import { Link, useParams } from 'react-router-dom';
import { NewsCard } from '../../components/public/NewsCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Spinner } from '../../components/ui/Spinner';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getNews, getNewsBySlug } from '../../services/supabase/content';

async function fetchNewsDetail(slug: string) {
  const [item, all] = await Promise.all([getNewsBySlug(slug), getNews()]);
  return { item, related: all.filter((n) => n.slug !== slug).slice(0, 3) };
}

function coverOf(item: Record<string, unknown>): string | null {
  if (typeof item.cover_image_url === 'string' && item.cover_image_url) return item.cover_image_url;
  if (typeof item.cover_url === 'string' && item.cover_url) return item.cover_url;
  return null;
}

function dateOf(item: Record<string, unknown>): string | null {
  const v = item.published_at ?? item.created_at;
  if (typeof v !== 'string' || !v) return null;
  return new Date(v).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function NewsDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data, loading, error, reload } = useSupabaseQuery(() => fetchNewsDetail(slug), [slug]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState title="Supabase no configurado" description="No se puede mostrar la noticia." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center px-4 py-16">
        <Spinner label="Cargando noticia…" />
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

  if (!data?.item) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState
          title="Noticia no encontrada"
          description="La noticia que buscas no existe."
          action={
            <Link to="/noticias" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Volver a noticias
            </Link>
          }
        />
      </div>
    );
  }

  const raw = data.item as unknown as Record<string, unknown>;
  const cover = coverOf(raw);
  const date = dateOf(raw);

  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Link to="/noticias" className="text-sm font-medium text-brand-600 hover:underline">
        ← Volver a noticias
      </Link>
      {date ? <p className="text-sm text-slate-500">{date}</p> : null}
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{data.item.title}</h1>
      {cover ? <img src={cover} alt={data.item.title} className="aspect-video w-full rounded-2xl object-cover" /> : null}
      {data.item.excerpt ? (
        <p className="text-lg font-medium text-slate-600">{data.item.excerpt}</p>
      ) : null}
      <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700 sm:text-base">
        {data.item.content}
      </div>
      {data.related.length > 0 ? (
        <section className="pt-6">
          <h2 className="text-xl font-bold text-slate-900">Noticias relacionadas</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.related.map((n) => (
              <NewsCard key={n.id} item={n} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

export default NewsDetail;
