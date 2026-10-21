export function formatMoneyBs(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseDate(input: string | Date): Date | null {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function formatDate(input: string | Date): string {
  const d = parseDate(input);
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/La_Paz',
  }).format(d);
}

export function formatDateTime(input: string | Date): string {
  const d = parseDate(input);
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/La_Paz',
  }).format(d);
}

export function timeAgo(input: string | Date): string {
  const d = parseDate(input);
  if (!d) return '—';
  const now = Date.now();
  const diffMs = now - d.getTime();
  if (diffMs < 0) return 'pronto';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `hace ${seconds} s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;

  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} m`;

  const years = Math.floor(months / 12);
  return `hace ${years} a`;
}
