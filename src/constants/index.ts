import type {
  IncomeType,
  MemberStatus,
  MemberType,
  PaymentStatus,
  RaceStatus,
  RegistrationStatus,
  ResultStatus,
  Role,
} from '../types';

export const ROLES: readonly Role[] = [
  'ADMIN',
  'DIRECTIVA',
  'TESORERIA',
  'EDITOR',
  'CONSULTA',
] as const;

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  DIRECTIVA: 'Mesa directiva',
  TESORERIA: 'Tesorería',
  EDITOR: 'Editor de contenidos',
  CONSULTA: 'Consulta',
};

export const RACE_STATUS: readonly RaceStatus[] = [
  'PLANIFICADA',
  'ABIERTA',
  'FINALIZADA',
  'CANCELADA',
] as const;

export const RACE_STATUS_LABELS: Record<RaceStatus, string> = {
  PLANIFICADA: 'Planificada',
  ABIERTA: 'Inscripciones abiertas',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

export const REGISTRATION_STATUS: readonly RegistrationStatus[] = [
  'INSCRITO',
  'CONFIRMADO',
  'CANCELADO',
] as const;

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  INSCRITO: 'Inscrito',
  CONFIRMADO: 'Confirmado',
  CANCELADO: 'Cancelado',
};

export const RESULT_STATUS: readonly ResultStatus[] = [
  'FINISHED',
  'DNF',
  'DSQ',
  'DNS',
  'ANULADO',
] as const;

export const RESULT_STATUS_LABELS: Record<ResultStatus, string> = {
  FINISHED: 'Finalizó',
  DNF: 'Abandonó',
  DSQ: 'Descalificado',
  DNS: 'No largó',
  ANULADO: 'Anulado',
};

export const MEMBER_STATUS: readonly MemberStatus[] = [
  'ACTIVO',
  'INACTIVO',
  'SUSPENDIDO',
] as const;

export const MEMBER_TYPES: readonly MemberType[] = [
  'CORREDOR',
  'DIRIGENTE',
  'COLABORADOR',
  'GENERAL',
] as const;

export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  CORREDOR: 'Corredor',
  DIRIGENTE: 'Dirigente',
  COLABORADOR: 'Colaborador',
  GENERAL: 'General',
};

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  SUSPENDIDO: 'Suspendido',
};

export const PAYMENT_STATUS: readonly PaymentStatus[] = [
  'PAGADO',
  'PENDIENTE',
  'PARCIAL',
  'VENCIDO',
  'ANULADA',
  'EXENTA',
] as const;

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PAGADO: 'Pagado',
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Parcial',
  VENCIDO: 'Vencido',
  ANULADA: 'Anulada',
  EXENTA: 'Exenta',
};

export const INCOME_TYPES: readonly IncomeType[] = [
  'APORTE_EXTRA',
  'AUSPICIO',
  'DONACION',
  'OTRO',
] as const;

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  APORTE_EXTRA: 'Aporte extraordinario',
  AUSPICIO: 'Auspicio',
  DONACION: 'Donación',
  OTRO: 'Otro ingreso',
};

export const EXPENSE_CATEGORIES = [
  'Inscripciones',
  'Transporte',
  'Combustible',
  'Alimentación',
  'Hospedaje',
  'Mecánica y repuestos',
  'Equipamiento',
  'Logística',
  'Otros',
] as const;

export const PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia',
  'QR',
  'Depósito',
  'Tarjeta',
  'Otro',
] as const;

export const STORAGE_BUCKETS = {
  GALLERY: 'gallery',
  NEWS: 'news',
  BANNERS: 'banners',
  CYCLISTS: 'cyclists',
  SPONSORS: 'sponsors',
  DOCUMENTS: 'documents',
} as const;

export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export interface NavLink {
  label: string;
  to: string;
}

export const NAV_PUBLIC: readonly NavLink[] = [
  { label: 'Inicio', to: '/' },
  { label: 'Equipo', to: '/equipo' },
  { label: 'Corredores', to: '/corredores' },
  { label: 'Ranking', to: '/ranking' },
  { label: 'Carreras', to: '/carreras' },
  { label: 'Resultados', to: '/resultados' },
  { label: 'Noticias', to: '/noticias' },
  { label: 'Galería', to: '/galeria' },
  { label: 'Auspiciadores', to: '/auspiciadores' },
  { label: 'Contacto', to: '/contacto' },
] as const;

export interface AdminNavItem {
  label: string;
  to: string;
  allowed: Role[];
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: readonly AdminNavGroup[] = [
  {
    label: 'Resumen',
    items: [
      {
        label: 'Dashboard',
        to: '/admin',
        allowed: ['ADMIN', 'DIRECTIVA', 'TESORERIA', 'EDITOR', 'CONSULTA'],
      },
    ],
  },
  {
    label: 'Deportivo',
    items: [
      { label: 'Corredores', to: '/admin/corredores', allowed: ['ADMIN', 'EDITOR'] },
      { label: 'Categorías', to: '/admin/categorias', allowed: ['ADMIN', 'EDITOR'] },
      { label: 'Carreras', to: '/admin/carreras', allowed: ['ADMIN', 'EDITOR'] },
      { label: 'Resultados', to: '/admin/resultados', allowed: ['ADMIN', 'EDITOR'] },
      { label: 'Puntuación', to: '/admin/puntuacion', allowed: ['ADMIN', 'EDITOR'] },
    ],
  },
  {
    label: 'Contenido',
    items: [
      { label: 'Noticias', to: '/admin/noticias', allowed: ['ADMIN', 'EDITOR'] },
      { label: 'Galería', to: '/admin/galeria', allowed: ['ADMIN', 'EDITOR'] },
      { label: 'Banners', to: '/admin/banners', allowed: ['ADMIN', 'EDITOR'] },
      { label: 'Auspiciadores', to: '/admin/auspiciadores', allowed: ['ADMIN', 'EDITOR'] },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Miembros', to: '/admin/miembros', allowed: ['ADMIN', 'DIRECTIVA', 'TESORERIA'] },
      { label: 'Membresías', to: '/admin/membresias', allowed: ['ADMIN', 'DIRECTIVA', 'TESORERIA'] },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { label: 'Aportes e ingresos', to: '/admin/aportes', allowed: ['ADMIN', 'DIRECTIVA', 'TESORERIA'] },
      { label: 'Caja y gastos', to: '/admin/finanzas', allowed: ['ADMIN', 'DIRECTIVA', 'TESORERIA'] },
      { label: 'Reportes', to: '/admin/reportes', allowed: ['ADMIN', 'DIRECTIVA', 'TESORERIA'] },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Usuarios y roles', to: '/admin/usuarios', allowed: ['ADMIN'] },
      { label: 'Auditoría', to: '/admin/auditoria', allowed: ['ADMIN'] },
      { label: 'Configuración', to: '/admin/configuracion', allowed: ['ADMIN'] },
    ],
  },
] as const;

export const DEFAULT_TEAM_NAME = 'TRINX BOLIVIA · BYCLE SHARKS';
export const DEFAULT_SHORT_NAME = 'Bycle Sharks';
export const DEFAULT_SLOGAN = 'Pasión. Competencia. Comunidad.';
export const DEFAULT_DESCRIPTION =
  'Equipo de mountain bike de Santa Cruz, Bolivia. Formamos corredores, competimos y construimos comunidad sobre dos ruedas.';
export const DEFAULT_PRIMARY_COLOR = '#0f766e';
export const DEFAULT_SECONDARY_COLOR = '#0f172a';
export const DEFAULT_ACCENT_COLOR = '#84cc16';

export const DEFAULT_WHATSAPP_MESSAGE =
  'Hola, me gustaría recibir información sobre el equipo de MTB.';

export const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'REVERSAL',
  'ROLE_CHANGE',
  'PAYMENT',
  'OPENING_BALANCE',
  'GENERATE',
  'ANNUL',
] as const;

export const AUDIT_MODULES = [
  'profiles',
  'cyclists',
  'categories',
  'races',
  'race_results',
  'achievements',
  'members',
  'membership_payments',
  'membership_payment_entries',
  'contributions',
  'cash_movements',
  'expenses',
  'race_budgets',
  'sponsors',
  'news',
  'banners',
  'gallery',
  'site_settings',
] as const;
