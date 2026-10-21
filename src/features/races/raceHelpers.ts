import type { Race, RaceStatus } from '../../types';

const RACE_STATUS_LABELS: Record<RaceStatus, string> = {
  PLANIFICADA: 'Planificada',
  ABIERTA: 'Abierta',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

export function raceStatusLabel(status: RaceStatus): string {
  return RACE_STATUS_LABELS[status] ?? status;
}

export function isUpcoming(race: Pick<Race, 'race_date' | 'status'>): boolean {
  if (race.status === 'CANCELADA' || race.status === 'FINALIZADA') return false;
  const today = new Date().toISOString().slice(0, 10);
  return race.race_date >= today;
}
