export type Role = 'ADMIN' | 'DIRECTIVA' | 'TESORERIA' | 'EDITOR' | 'CONSULTA';

export type RaceStatus = 'PLANIFICADA' | 'ABIERTA' | 'FINALIZADA' | 'CANCELADA';

export type MemberType = 'CORREDOR' | 'DIRIGENTE' | 'COLABORADOR' | 'GENERAL';

export type MemberStatus = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';

export type PaymentStatus = 'PAGADO' | 'PENDIENTE' | 'PARCIAL' | 'VENCIDO';

export type CashMovementType = 'INGRESO' | 'EGRESO';

export type RegistrationStatus = 'INSCRITO' | 'CONFIRMADO' | 'CANCELADO';

export interface BaseEntity {
  id: string;
  created_at: string;
}

export interface Profile extends BaseEntity {
  email: string | null;
  full_name: string | null;
  role: Role;
  updated_at?: string | null;
}

export interface Category extends BaseEntity {
  name: string;
  slug: string;
  description?: string | null;
  min_age?: number | null;
  max_age?: number | null;
  gender?: 'M' | 'F' | 'MIXTO' | null;
}

export interface Cyclist extends BaseEntity {
  full_name: string;
  slug: string;
  nickname?: string | null;
  birth_date?: string | null;
  gender?: 'M' | 'F' | null;
  category_id?: string | null;
  photo_url?: string | null;
  bio?: string | null;
  is_active: boolean;
  is_featured: boolean;
  updated_at?: string | null;
}

export interface Race extends BaseEntity {
  name: string;
  slug: string;
  description?: string | null;
  location?: string | null;
  race_date: string;
  status: RaceStatus;
  distance_km?: number | null;
  elevation_m?: number | null;
  registration_fee?: number | null;
  max_participants?: number | null;
  image_url?: string | null;
  updated_at?: string | null;
}

export interface RaceRegistration extends BaseEntity {
  race_id: string;
  cyclist_id: string;
  status: RegistrationStatus;
}

export interface RaceResult extends BaseEntity {
  race_id: string;
  cyclist_id: string;
  position: number;
  points: number;
  time_seconds?: number | null;
  category_id?: string | null;
}

export interface ScoringRule extends BaseEntity {
  position: number;
  points: number;
  season?: number | null;
  updated_at?: string | null;
}

export interface Achievement extends BaseEntity {
  cyclist_id: string;
  title: string;
  description?: string | null;
  achieved_at?: string | null;
  icon?: string | null;
}

export interface Member extends BaseEntity {
  full_name: string;
  member_type: MemberType;
  status: MemberStatus;
  phone?: string | null;
  email?: string | null;
  join_date?: string | null;
  notes?: string | null;
  updated_at?: string | null;
}

export interface MembershipPayment extends BaseEntity {
  member_id: string;
  month_key: string;
  amount: number;
  status: PaymentStatus;
  paid_at?: string | null;
  due_date?: string | null;
  notes?: string | null;
}

export interface Contribution extends BaseEntity {
  member_id?: string | null;
  title: string;
  amount: number;
  contribution_date: string;
  notes?: string | null;
}

export interface CashMovement extends BaseEntity {
  concept: string;
  type: CashMovementType;
  amount: number;
  movement_date: string;
  category?: string | null;
  related_race_id?: string | null;
  related_member_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

export interface Expense extends BaseEntity {
  race_id?: string | null;
  title: string;
  description?: string | null;
  amount: number;
  expense_date: string;
  category?: string | null;
  receipt_url?: string | null;
}

export interface RaceBudget extends BaseEntity {
  race_id: string;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  estimated_income?: number | null;
  actual_income?: number | null;
  notes?: string | null;
  updated_at?: string | null;
}

export interface Sponsor extends BaseEntity {
  name: string;
  logo_url?: string | null;
  website_url?: string | null;
  is_active: boolean;
  display_order?: number | null;
}

export interface NewsItem extends BaseEntity {
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  cover_image_url?: string | null;
  is_published: boolean;
  published_at?: string | null;
  author_id?: string | null;
  updated_at?: string | null;
}

export interface Banner extends BaseEntity {
  title: string;
  subtitle?: string | null;
  image_url: string;
  link_url?: string | null;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  display_order?: number | null;
}

export interface GalleryItem extends BaseEntity {
  title?: string | null;
  image_url: string;
  race_id?: string | null;
  published_at?: string | null;
}

export interface AuditLog extends BaseEntity {
  user_id?: string | null;
  action: string;
  table_name?: string | null;
  record_id?: string | null;
  details?: Record<string, unknown> | null;
}

export interface SiteSettings {
  id: string;
  team_name: string;
  slogan?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  social_facebook?: string | null;
  social_instagram?: string | null;
  social_tiktok?: string | null;
  about_text?: string | null;
  updated_at?: string | null;
}

export interface CyclistStats {
  cyclist_id: string;
  total_races: number;
  total_points: number;
  wins: number;
  seconds: number;
  thirds: number;
  podiums: number;
  best_position: number | null;
}

export interface RankingRow {
  cyclist_id: string;
  full_name: string;
  slug?: string | null;
  photo_url?: string | null;
  total_points: number;
  races_count: number;
  wins: number;
  seconds: number;
  thirds: number;
  podiums: number;
}

export interface CashSummary {
  total_ingresos: number;
  total_egresos: number;
  balance: number;
  movements_count: number;
}
