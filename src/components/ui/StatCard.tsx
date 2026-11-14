import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

export type StatTone = 'brand' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';

const TONES: Record<StatTone, { icon: string; accent: string }> = {
  brand: {
    icon: 'bg-[var(--brand-soft)] text-[var(--brand-dark)]',
    accent: 'from-[var(--brand)]/10',
  },
  emerald: { icon: 'bg-emerald-50 text-emerald-700', accent: 'from-emerald-500/10' },
  amber: { icon: 'bg-amber-50 text-amber-700', accent: 'from-amber-500/10' },
  rose: { icon: 'bg-rose-50 text-rose-700', accent: 'from-rose-500/10' },
  sky: { icon: 'bg-sky-50 text-sky-700', accent: 'from-sky-500/10' },
  violet: { icon: 'bg-violet-50 text-violet-700', accent: 'from-violet-500/10' },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
  to,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  to?: string;
  className?: string;
}) {
  const content = (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm',
        to && 'transition hover:-translate-y-0.5 hover:shadow-md',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent',
          TONES[tone].accent,
        )}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              TONES[tone].icon,
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2">
      {content}
    </Link>
  ) : (
    content
  );
}
