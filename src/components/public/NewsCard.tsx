import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import type { NewsItem } from '../../types';
import { resolveMediaUrl } from '../../services/storage';
import { formatDate, truncate } from '../../utils/format';
import { cn } from '../../utils/cn';

export function NewsCard({
  item,
  featured = false,
  className,
}: {
  item: NewsItem;
  featured?: boolean;
  className?: string;
}) {
  const cover = resolveMediaUrl(item.cover_path, item.cover_url, 'news');

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-[var(--brand-mid)] hover:shadow-lg',
        className,
      )}
    >
      <Link to={`/noticias/${item.slug}`} className="block overflow-hidden">
        <div className={cn('relative overflow-hidden bg-slate-900', featured ? 'aspect-[16/9]' : 'aspect-[16/10]')}>
          {cover ? (
            <img
              src={cover}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-[var(--secondary)] to-[var(--brand-darker)]">
              <span className="font-display text-4xl font-bold uppercase tracking-wider text-white/20">
                Noticias
              </span>
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {item.category && (
              <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-800 shadow-sm">
                {item.category}
              </span>
            )}
            {item.featured && (
              <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-contrast)]">
                Destacada
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {formatDate(item.published_at || item.created_at)}
          {item.author && <span className="truncate">· {item.author}</span>}
        </p>
        <h3
          className={cn(
            'mt-2 font-display font-bold uppercase leading-tight text-slate-950',
            featured ? 'text-3xl' : 'text-xl',
          )}
        >
          <Link to={`/noticias/${item.slug}`} className="transition hover:text-[var(--brand-dark)]">
            {item.title}
          </Link>
        </h3>
        {item.excerpt && (
          <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
            {truncate(item.excerpt, featured ? 220 : 150)}
          </p>
        )}
        <Link
          to={`/noticias/${item.slug}`}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--brand-dark)] transition hover:text-[var(--brand)]"
        >
          Leer noticia
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
