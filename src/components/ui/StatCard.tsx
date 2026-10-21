import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, description, icon, className = '' }: StatCardProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
    >
      {icon !== undefined ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xl text-brand-600">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {description !== undefined ? (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
