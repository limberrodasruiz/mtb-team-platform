import { Link } from 'react-router-dom';
import type { Race } from '../../types';
import { Badge } from '../ui/Badge';

interface RaceCardProps {
  race: Race;
  to?: string;
}

function statusVariant(status: Race['status']): 'success' | 'info' | 'default' | 'danger' {
  switch (status) {
    case 'ABIERTA':
      return 'success';
    case 'PLANIFICADA':
      return 'info';
    case 'CANCELADA':
      return 'danger';
    case 'FINALIZADA':
    default:
      return 'default';
  }
}

export function RaceCard({ race, to }: RaceCardProps) {
  const href = to ?? `/carreras/${race.slug}`;
  const dateLabel = new Date(`${race.race_date}T00:00:00`).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Link
      to={href}
      className="card-hover block overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      {race.image_url ? (
        <img src={race.image_url} alt={race.name} className="aspect-video w-full object-cover" loading="lazy" />
      ) : (
        <span className="hero-gradient block aspect-video w-full" aria-hidden="true" />
      )}
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={statusVariant(race.status)}>{race.status}</Badge>
          <time className="text-xs text-slate-500">{dateLabel}</time>
        </div>
        <h3 className="mt-2 text-base font-bold text-slate-900">{race.name}</h3>
        {race.location ? <p className="mt-0.5 text-sm text-slate-500">{race.location}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          {race.distance_km !== null && race.distance_km !== undefined ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{race.distance_km} km</span>
          ) : null}
          {race.elevation_m !== null && race.elevation_m !== undefined ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{race.elevation_m} m+</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
