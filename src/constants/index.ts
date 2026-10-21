import type {
  MemberStatus,
  PaymentStatus,
  RaceStatus,
  Role,
} from '../types';

export const ROLES: readonly Role[] = [
  'ADMIN',
  'DIRECTIVA',
  'TESORERIA',
  'EDITOR',
  'CONSULTA',
] as const;

export const RACE_STATUS: readonly RaceStatus[] = [
  'PLANIFICADA',
  'ABIERTA',
  'FINALIZADA',
  'CANCELADA',
] as const;

export const MEMBER_STATUS: readonly MemberStatus[] = [
  'ACTIVO',
  'INACTIVO',
  'SUSPENDIDO',
] as const;

export const PAYMENT_STATUS: readonly PaymentStatus[] = [
  'PAGADO',
  'PENDIENTE',
  'PARCIAL',
  'VENCIDO',
] as const;

export const DEFAULT_SCORING: Readonly<Record<number, number>> = {
  1: 10,
  2: 8,
  3: 6,
  4: 5,
  5: 4,
  6: 3,
  7: 2,
  8: 1,
};

export const STORAGE_BUCKETS = {
  GALLERY: 'gallery',
  NEWS: 'news',
  BANNERS: 'banners',
  CYCLISTS: 'cyclists',
  SPONSORS: 'sponsors',
} as const;

export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export interface NavLink {
  label: string;
  to: string;
}

export const NAV_PUBLIC: readonly NavLink[] = [
  { label: 'Inicio', to: '/' },
  { label: 'Corredores', to: '/corredores' },
  { label: 'Carreras', to: '/carreras' },
  { label: 'Ranking', to: '/ranking' },
  { label: 'Galería', to: '/galeria' },
  { label: 'Noticias', to: '/noticias' },
  { label: 'Patrocinadores', to: '/patrocinadores' },
  { label: 'Contacto', to: '/contacto' },
] as const;

export const DEFAULT_TEAM_NAME = 'TRINX BOLIVIA - BYCLE SHARKS';
