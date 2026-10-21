import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
  padded = true,
}: CardProps) {
  const hasHeader = title !== undefined || actions !== undefined;
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {hasHeader ? (
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            {title !== undefined ? (
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            ) : null}
            {subtitle !== undefined ? (
              <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          {actions !== undefined ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </header>
      ) : null}
      <div className={padded ? 'px-5 py-4' : ''}>{children}</div>
    </section>
  );
}
