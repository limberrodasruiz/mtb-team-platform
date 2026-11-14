import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Crumb {
  label: string;
  to?: string;
}

export function PublicPageHero({
  eyebrow,
  title,
  description,
  crumbs,
  actions,
  imageUrl,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
  imageUrl?: string | null;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        'relative overflow-hidden bg-[var(--secondary)] text-white',
        compact ? 'py-12 sm:py-16' : 'py-16 sm:py-20',
      )}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
      )}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[var(--secondary)]/95 to-[var(--brand-darker)]/80"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 right-24 h-80 w-80 rounded-full border border-white/5"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Ruta de navegación" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/50">
              {crumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                  {crumb.to ? (
                    <Link to={crumb.to} className="transition hover:text-white">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-white/80">{crumb.label}</span>
                  )}
                  {index < crumbs.length - 1 && (
                    <ChevronRight className="h-3 w-3" aria-hidden />
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && (
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            {eyebrow}
          </p>
        )}
        <h1 className="max-w-4xl font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            {description}
          </p>
        )}
        {actions && <div className="mt-7 flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </section>
  );
}
