import type { ReactNode } from 'react';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  action?: ReactNode;
  className?: string;
}

export function SectionTitle({
  title,
  subtitle,
  align = 'left',
  action,
  className = '',
}: SectionTitleProps) {
  const centered = align === 'center';
  return (
    <div className={`${centered ? 'text-center' : ''} ${className}`}>
      <div className={`flex items-end gap-4 ${centered ? 'justify-center' : 'justify-between'}`}>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
        {!centered && action !== undefined ? (
          <div className="shrink-0">{action}</div>
        ) : null}
      </div>
      {subtitle !== undefined ? (
        <p className={`mt-2 text-slate-500 ${centered ? 'mx-auto max-w-2xl' : 'max-w-3xl'}`}>
          {subtitle}
        </p>
      ) : null}
      {centered && action !== undefined ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
