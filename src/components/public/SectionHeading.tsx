import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export function SectionHeading({
  eyebrow,
  title,
  description,
  linkTo,
  linkLabel = 'Ver todo',
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  linkTo?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-wrap items-end justify-between gap-4',
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-3xl font-bold uppercase leading-none tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            {description}
          </p>
        )}
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="group inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-dark)] transition hover:text-[var(--brand)]"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn('px-4 py-16 sm:px-6 sm:py-20 lg:px-8', className)}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}
