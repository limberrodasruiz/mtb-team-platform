import { Link } from 'react-router-dom';
import type { Cyclist, CyclistStats } from '../../types';

interface CyclistCardProps {
  cyclist: Cyclist;
  stats?: CyclistStats | null;
  to?: string;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function CyclistCard({ cyclist, stats, to }: CyclistCardProps) {
  const href = to ?? `/corredores/${cyclist.slug}`;
  return (
    <Link
      to={href}
      className="card-hover block overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      {cyclist.photo_url ? (
        <img
          src={cyclist.photo_url}
          alt={cyclist.full_name}
          className="aspect-square w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-brand-600 to-shark-900 text-4xl font-bold text-white">
          {initials(cyclist.full_name)}
        </span>
      )}
      <div className="p-4">
        {cyclist.nickname ? (
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
            “{cyclist.nickname}”
          </p>
        ) : null}
        <h3 className="mt-0.5 text-base font-bold text-slate-900">{cyclist.full_name}</h3>
        {stats ? (
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              <dt className="text-[11px] text-slate-500">Puntos</dt>
              <dd className="text-sm font-bold text-slate-900">{stats.total_points}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              <dt className="text-[11px] text-slate-500">Podios</dt>
              <dd className="text-sm font-bold text-slate-900">{stats.podiums}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              <dt className="text-[11px] text-slate-500">Victorias</dt>
              <dd className="text-sm font-bold text-slate-900">{stats.wins}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </Link>
  );
}
