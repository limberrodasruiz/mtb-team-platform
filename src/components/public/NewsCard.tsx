import { Link } from 'react-router-dom';
import type { NewsItem } from '../../types';

interface NewsCardProps {
  item: NewsItem;
  to?: string;
}

export function NewsCard({ item, to }: NewsCardProps) {
  const href = to ?? `/noticias/${item.slug}`;
  const dateLabel = item.published_at
    ? new Date(item.published_at).toLocaleDateString('es-BO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <Link
      to={href}
      className="card-hover block overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      {item.cover_image_url ? (
        <img
          src={item.cover_image_url}
          alt={item.title}
          className="aspect-video w-full object-cover"
          loading="lazy"
        />
      ) : null}
      <div className="p-4">
        {dateLabel ? <time className="text-xs text-slate-500">{dateLabel}</time> : null}
        <h3 className="mt-1 line-clamp-2 text-base font-bold text-slate-900">{item.title}</h3>
        {item.excerpt ? (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.excerpt}</p>
        ) : null}
        <span className="mt-3 inline-block text-sm font-medium text-brand-600">Leer más →</span>
      </div>
    </Link>
  );
}
