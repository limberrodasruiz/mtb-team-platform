import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react';
import type { Race } from '../../types';
import { formatDate, parseDate } from '../../utils/format';
import { StatusBadge } from '../ui/Badge';
import { cn } from '../../utils/cn';

function dateParts(value: string): { day: string; month: string; year: string } {
  const date = parseDate(value);
  if (!date) return { day: '—', month: '—', year: '' };
  return {
    day: new Intl.DateTimeFormat('es-BO', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('es-BO', { month: 'short' })
      .format(date)
      .replace('.', '')
      .toUpperCase(),
    year: String(date.getFullYear()),
  };
}

export function RaceCard({ race, past = false }: { race: Race; past?: boolean }) {
  const { day, month, year } = dateParts(race.date);
  const location = [race.place, race.city].filter(Boolean).join(' · ');

  return (
    <article className="group relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[var(--brand-mid)] hover:shadow-md sm:p-5">
      <div
        className={cn(
          'flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl text-white',
          past ? 'bg-slate-800' : 'bg-[var(--brand)]',
        )}
      >
        <span className="font-display text-3xl font-bold leading-none">{day}</span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] opacity-90">
          {month} {year}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={race.status} />
          {race.race_type && (
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {race.race_type}
            </span>
          )}
        </div>
        <h3 className="mt-2 font-display text-xl font-bold uppercase leading-tight text-slate-950">
          <Link to={`/carreras/${race.slug}`} className="transition hover:text-[var(--brand-dark)]">
            {race.name}
          </Link>
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {location}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            {formatDate(race.date)}
          </span>
        </div>
        {race.registration_deadline && !past && race.status !== 'CANCELADA' && (
          <p className="mt-2 text-xs font-medium text-[var(--brand-dark)]">
            Inscripciones hasta el {formatDate(race.registration_deadline)}
          </p>
        )}
      </div>
      <Link
        to={`/carreras/${race.slug}`}
        aria-label={`Ver ${race.name}`}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition group-hover:border-[var(--brand)] group-hover:bg-[var(--brand)] group-hover:text-white"
      >
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
    </article>
  );
}
