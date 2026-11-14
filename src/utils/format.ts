const BOLIVIA_TZ = 'America/La_Paz';

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function formatMoneyBs(value: number | string | null | undefined): string {
  const n = toNumber(value);
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function parseDate(input: string | Date): Date | null {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  if (!input) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (dateOnly) {
    const d = new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
      12,
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return '—';
  if (typeof input === 'string') {
    // Calendar dates must not be shifted by timezone conversion. Timestamps
    // (with T/time) fall through and are formatted in Bolivia time.
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  }
  const d = parseDate(input);
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: BOLIVIA_TZ,
  }).format(d);
}

export function formatLongDate(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = parseDate(input);
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-BO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: BOLIVIA_TZ,
  }).format(d);
}

export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = parseDate(input);
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BOLIVIA_TZ,
  }).format(d);
}

export function formatMonth(month: number, year?: number): string {
  const name = MONTHS[month - 1] ?? String(month);
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  return year ? `${label} ${year}` : label;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: BOLIVIA_TZ,
  }).format(new Date());
}

export function currentMonth(): { year: number; month: number } {
  const [year, month] = todayISO().split('-').map(Number);
  return { year, month };
}

export function ordinal(position: number | null | undefined): string {
  if (position === null || position === undefined) return '—';
  return `${position}.º`;
}

export function timeAgo(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = parseDate(input);
  if (!d) return '—';
  const diff = Date.now() - d.getTime();
  if (diff < 0) return 'próximamente';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `hace ${Math.max(minutes, 1)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} m`;
  return `hace ${Math.floor(months / 12)} a`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function formatNumber(value: number | string | null | undefined): string {
  return new Intl.NumberFormat('es-BO').format(toNumber(value));
}

export function formatCompact(value: number | string | null | undefined): string {
  return new Intl.NumberFormat('es-BO', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(toNumber(value));
}

export function formatMonthYear(year: number, month: number): string {
  return formatMonth(month, year);
}

export function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: BOLIVIA_TZ,
  }).format(date);
}

export function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function yearOptions(span = 6): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: span }, (_, index) => current - index);
}

export function parseMoney(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}
