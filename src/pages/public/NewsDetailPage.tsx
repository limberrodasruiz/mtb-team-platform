import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Facebook,
  Newspaper,
  Share2,
  UserRound,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToast } from '../../providers/ToastProvider';
import { getPublishedNews, getPublishedNewsBySlug } from '../../services/content';
import { resolveMediaUrl } from '../../services/storage';
import type { NewsItem } from '../../types';
import { formatLongDate } from '../../utils/format';
import { buttonStyles } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { PublicPageHero } from '../../components/public/PublicPageHero';
import { RichText } from '../../components/public/RichText';
import { NewsCard } from '../../components/public/NewsCard';
import { Section } from '../../components/public/SectionHeading';

interface NewsDetailData {
  item: NewsItem;
  related: NewsItem[];
}

export function NewsDetailPage() {
  const { slug = '' } = useParams();
  const { success } = useToast();
  const [copied, setCopied] = useState(false);
  const { data, loading, error, reload } = useAsync<NewsDetailData | null>(
    async () => {
      const item = await getPublishedNewsBySlug(slug);
      if (!item) return null;
      const latest = await getPublishedNews(4);
      return {
        item,
        related: latest.items.filter((news) => news.id !== item.id).slice(0, 3),
      };
    },
    [slug],
  );

  useDocumentTitle(data?.item.title ?? 'Noticias');

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <LoadingBlock message="Cargando noticia…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <ErrorState title="No se pudo cargar la noticia" message={error} onRetry={reload} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <EmptyState
          icon={Newspaper}
          title="Noticia no encontrada"
          description="La publicación que buscas no existe o ya no está disponible."
          action={
            <Link to="/noticias" className={buttonStyles('primary', 'md')}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver a noticias
            </Link>
          }
        />
      </div>
    );
  }

  const { item, related } = data;
  const cover = resolveMediaUrl(item.cover_path, item.cover_url, 'news');
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      success('Enlace copiado al portapapeles.');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      success('Copia el enlace desde la barra del navegador.');
    }
  }

  async function nativeShare() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: item.title, url: shareUrl });
      } catch {
        // The user cancelled the share sheet; no action needed.
      }
    } else {
      await copyLink();
    }
  }

  return (
    <>
      <PublicPageHero
        eyebrow={item.category || 'Noticia'}
        title={item.title}
        crumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Noticias', to: '/noticias' },
          { label: item.title },
        ]}
        compact
      />

      <Section className="pt-8 sm:pt-10">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {formatLongDate(item.published_at || item.created_at)}
              </span>
              {item.author && (
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5" aria-hidden />
                  {item.author}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                Lectura del equipo
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                )}
                {copied ? 'Copiado' : 'Copiar enlace'}
              </button>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Compartir en Facebook"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
              >
                <Facebook className="h-4 w-4" aria-hidden />
              </a>
              <button
                type="button"
                onClick={() => void nativeShare()}
                aria-label="Compartir noticia"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
              >
                <Share2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          {cover && (
            <figure className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <img
                src={cover}
                alt={item.title}
                className="max-h-[560px] w-full object-cover"
              />
            </figure>
          )}

          {item.excerpt && (
            <p className="mt-8 border-l-4 border-[var(--brand)] pl-4 font-display text-xl font-medium leading-snug text-slate-700">
              {item.excerpt}
            </p>
          )}

          <div className="mt-8">
            <RichText content={item.content} />
            {!item.content && (
              <p className="text-base leading-relaxed text-slate-500">
                El contenido completo de esta publicación se está preparando.
              </p>
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-100 px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Publicado por
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {item.author || 'Equipo Trinx Bolivia'}
              </p>
            </div>
            <Link to="/noticias" className={buttonStyles('outline', 'sm')}>
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Todas las noticias
            </Link>
          </div>
        </div>
      </Section>

      {related.length > 0 && (
        <Section className="border-t border-slate-200 bg-slate-100/60 pt-12 sm:pt-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
                Seguir leyendo
              </p>
              <h2 className="mt-1 font-display text-3xl font-bold uppercase leading-none text-slate-950">
                Más noticias
              </h2>
            </div>
            <Link
              to="/noticias"
              className="text-xs font-semibold text-[var(--brand-dark)] underline underline-offset-4"
            >
              Ver todas
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {related.map((news) => (
              <NewsCard key={news.id} item={news} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
