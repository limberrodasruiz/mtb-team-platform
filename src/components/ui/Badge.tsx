import type { ReactNode } from 'react';
import type { MemberStatus, PaymentStatus, RaceStatus, ResultStatus } from '../../types';
import { cn } from '../../utils/cn';

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  brand: 'bg-[var(--brand-soft)] text-[var(--brand-dark)] ring-[var(--brand-mid)]',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  purple: 'bg-violet-50 text-violet-700 ring-violet-200',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
  dot = false,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, BadgeTone> = {
  ACTIVO: 'success',
  INACTIVO: 'neutral',
  SUSPENDIDO: 'warning',
  PAGADO: 'success',
  PENDIENTE: 'warning',
  PARCIAL: 'info',
  VENCIDO: 'danger',
  ANULADA: 'neutral',
  ANULADO: 'neutral',
  EXENTA: 'purple',
  FINALIZADA: 'neutral',
  ABIERTA: 'success',
  PLANIFICADA: 'info',
  CANCELADA: 'danger',
  PUBLICADO: 'success',
  BORRADOR: 'warning',
  OCULTO: 'neutral',
  CONFIRMADO: 'success',
  INSCRITO: 'info',
  CANCELADO: 'neutral',
  FINISHED: 'success',
  DNF: 'warning',
  DSQ: 'danger',
  DNS: 'neutral',
  ADMIN: 'brand',
  DIRECTIVA: 'purple',
  TESORERIA: 'info',
  EDITOR: 'warning',
  CONSULTA: 'neutral',
};

export function statusTone(status: string): BadgeTone {
  return STATUS_TONES[status] ?? 'neutral';
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: MemberStatus | PaymentStatus | RaceStatus | ResultStatus | string;
  label?: string;
  className?: string;
}) {
  return (
    <Badge tone={statusTone(status)} className={className} dot>
      {label ?? status.replaceAll('_', ' ')}
    </Badge>
  );
}
