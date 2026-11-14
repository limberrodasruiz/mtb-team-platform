import { Link } from 'react-router-dom';
import { ArrowUpRight, Bike } from 'lucide-react';
import type { PublicCyclist } from '../../types';
import { resolveMediaUrl } from '../../services/storage';
import { initials } from '../../utils/format';
import { cn } from '../../utils/cn';

export function CyclistCard({
  cyclist,
  className,
}: {
  cyclist: PublicCyclist;
  className?: string;
}) {
  const photo = resolveMediaUrl(cyclist.photo_path, cyclist.photo_url, 'cyclists');

  return (
    <Link
      to={`/corredores/${cyclist.slug}`}
      className={cn(
        'group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[var(--brand-mid)] hover:shadow-xl hover:shadow-slate-900/10',
        className,
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--secondary)]">
        {photo ? (
          <img
            src={photo}
            alt={cyclist.full_name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-[var(--secondary)] to-[var(--brand-darker)]">
            <div
              className="absolute -right-10 top-0 font-display text-[150px] font-bold leading-none text-white/5"
              aria-hidden
            >
              {cyclist.number ?? 'MTB'}
            </div>
            <span className="font-display text-6xl font-bold text-white/90">
              {initials(cyclist.full_name)}
            </span>
            <Bike className="mt-3 h-6 w-6 text-[var(--accent)]" aria-hidden />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/90 to-transparent" />

        {cyclist.number !== null && (
          <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-2 py-1 font-display text-sm font-bold tabular-nums text-slate-950 shadow-sm">
            #{cyclist.number}
          </span>
        )}
        {cyclist.featured && (
          <span className="absolute right-3 top-3 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-contrast)] shadow-sm">
            Destacado
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <div className="min-w-0">
            {cyclist.category_name && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                {cyclist.category_name}
              </p>
            )}
            <h3 className="truncate font-display text-xl font-bold uppercase leading-tight text-white">
              {cyclist.full_name}
            </h3>
            {cyclist.nickname && (
              <p className="truncate text-xs text-white/60">“{cyclist.nickname}”</p>
            )}
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition group-hover:bg-[var(--brand)]">
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="truncate text-xs text-slate-500">
          {cyclist.specialty || 'Ciclista del equipo'}
        </p>
        {cyclist.team_since && (
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Desde {cyclist.team_since}
          </p>
        )}
      </div>
    </Link>
  );
}
