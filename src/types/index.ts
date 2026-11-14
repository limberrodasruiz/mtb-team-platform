export type Role = 'ADMIN' | 'DIRECTIVA' | 'TESORERIA' | 'EDITOR' | 'CONSULTA';

export type RaceStatus = 'PLANIFICADA' | 'ABIERTA' | 'FINALIZADA' | 'CANCELADA';

export type RegistrationStatus = 'INSCRITO' | 'CONFIRMADO' | 'CANCELADO';

export type ResultStatus = 'FINISHED' | 'DNF' | 'DSQ' | 'DNS' | 'ANULADO';

export type MemberType = 'CORREDOR' | 'DIRIGENTE' | 'COLABORADOR' | 'GENERAL';

export type MemberStatus = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';

export type PaymentStatus =
  | 'PAGADO'
  | 'PENDIENTE'
  | 'PARCIAL'
  | 'VENCIDO'
  | 'ANULADA'
  | 'EXENTA';

export type CashMovementType = 'INGRESO' | 'EGRESO';

export type CashStatus = 'CONFIRMADO' | 'ANULADO';

export type IncomeType = 'APORTE_EXTRA' | 'AUSPICIO' | 'DONACION' | 'OTRO';

export type NewsStatus = 'BORRADOR' | 'PUBLICADO' | 'OCULTO';

export type SponsorSocials = Record<string, string>;

export interface Profile {
  id: string;
  email: string | null;
  role: Role;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cyclist {
  id: string;
  full_name: string;
  slug: string;
  nickname: string | null;
  birth_date: string | null;
  category_id: string | null;
  specialty: string | null;
  number: number | null;
  photo_path: string | null;
  photo_url: string | null;
  bio: string | null;
  team_since: number | null;
  joined_at: string | null;
  featured: boolean;
  active: boolean;
  notes_private?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicCyclist {
  id: string;
  full_name: string;
  slug: string;
  nickname: string | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  specialty: string | null;
  number: number | null;
  photo_path: string | null;
  photo_url: string | null;
  bio: string | null;
  team_since: number | null;
  joined_at: string | null;
  featured: boolean;
  active: boolean;
  age: number | null;
  created_at: string;
  updated_at: string;
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

export interface Race {
  id: string;
  name: string;
  slug: string;
  date: string;
  place: string | null;
  city: string | null;
  department: string | null;
  organizer: string | null;
  race_type: string | null;
  description: string | null;
  status: RaceStatus;
  image_path: string | null;
  image_url: string | null;
  registration_deadline: string | null;
  registration_url: string | null;
  season: number | null;
  created_at: string;
  updated_at: string;
}

export interface RaceRegistration {
  id: string;
  race_id: string;
  cyclist_id: string;
  status: RegistrationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScoringRule {
  id: string;
  position: number;
  points: number;
  created_at: string;
  updated_at: string;
}

export interface RaceResult {
  id: string;
  race_id: string;
  cyclist_id: string;
  category_id: string | null;
  position: number | null;
  time_text: string | null;
  time_seconds: number | null;
  points: number;
  notes: string | null;
  result_status: ResultStatus;
  annulled_at: string | null;
  annul_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResultWithRelations extends RaceResult {
  race_name: string | null;
  race_date: string | null;
  cyclist_name: string | null;
  cyclist_slug: string | null;
  category_name: string | null;
}

export interface Achievement {
  id: string;
  cyclist_id: string;
  title: string;
  year: number | null;
  description: string | null;
  highlight: boolean;
  achieved_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  full_name: string;
  ci: string | null;
  phone: string | null;
  email: string | null;
  joined_at: string;
  status: MemberStatus;
  member_type: MemberType;
  monthly_amount: number;
  fee_exempt: boolean;
  left_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipObligation {
  id: string;
  member_id: string;
  full_name: string;
  member_type: MemberType;
  member_status: MemberStatus;
  month: number;
  year: number;
  expected: number;
  paid: number;
  balance: number;
  due_date: string;
  waived: boolean;
  annulled_at: string | null;
  annul_reason: string | null;
  notes: string | null;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface MembershipPaymentEntry {
  id: string;
  obligation_id: string;
  amount: number;
  paid_at: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  status: CashStatus;
  annulled_at: string | null;
  annul_reason: string | null;
  idempotency_key: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Contribution {
  id: string;
  member_id: string | null;
  date: string;
  amount: number;
  concept: string | null;
  method: string | null;
  entity_name: string | null;
  income_type: IncomeType;
  reference: string | null;
  notes: string | null;
  status: CashStatus;
  idempotency_key: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  annulled_at: string | null;
  annul_reason: string | null;
}

export interface ContributionRow extends Contribution {
  member_name: string | null;
  created_by_name: string | null;
}

export type CashSourceType =
  | 'APERTURA'
  | 'MEMBRESIA'
  | 'CONTRIBUCION'
  | 'GASTO'
  | 'AJUSTE';

export interface CashMovement {
  id: string;
  date: string;
  type: CashMovementType;
  category: string | null;
  concept: string;
  amount: number;
  race_id: string | null;
  method: string | null;
  reference: string | null;
  status: CashStatus;
  source_type: CashSourceType | null;
  source_id: string | null;
  member_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  annulled_at: string | null;
  annul_reason: string | null;
}

export interface CashLedgerRow extends CashMovement {
  race_name: string | null;
  member_name: string | null;
  created_by_name: string | null;
}

export interface Expense {
  id: string;
  date: string;
  concept: string;
  category: string | null;
  amount: number;
  race_id: string | null;
  beneficiary: string | null;
  method: string | null;
  receipt_path: string | null;
  notes: string | null;
  status: CashStatus;
  idempotency_key: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  annulled_at: string | null;
  annul_reason: string | null;
}

export interface ExpenseDetail extends Expense {
  race_name: string | null;
  created_by_name: string | null;
}

export interface RaceBudget {
  id: string;
  race_id: string;
  category: string;
  budgeted: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RaceFinancial {
  race_id: string;
  name: string;
  date: string;
  status: RaceStatus;
  expenses_total: number;
  income_total: number;
  budget_total: number;
  budget_difference: number;
}

export interface RaceExpenseCategory {
  race_id: string;
  category: string;
  count: number;
  total: number;
}

export interface Sponsor {
  id: string;
  name: string;
  logo_path: string | null;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  socials: SponsorSocials;
  support_type: string | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  sort_order: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewsItem {
  id: string;
  title: string;
  slug: string;
  cover_path: string | null;
  cover_url: string | null;
  excerpt: string | null;
  content: string | null;
  published_at: string | null;
  author: string | null;
  category: string | null;
  status: NewsStatus;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_path: string | null;
  image_url: string | null;
  button_label: string | null;
  url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface GalleryItem {
  id: string;
  title: string | null;
  description: string | null;
  date: string | null;
  race_id: string | null;
  cyclist_id: string | null;
  storage_bucket: string;
  storage_path: string | null;
  url: string | null;
  alt_text: string | null;
  published: boolean;
  sort_order: number;
  width: number | null;
  height: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  race_name?: string | null;
  cyclist_name?: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  module: string | null;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  ip: string | null;
  user_name?: string | null;
  user_email?: string | null;
}

export interface SiteSettings {
  id: number;
  team_name: string;
  short_name: string | null;
  slogan: string | null;
  description: string | null;
  history: string | null;
  founded_year: number | null;
  logo_path: string | null;
  logo_url: string | null;
  email: string | null;
  contact_email: string | null;
  whatsapp: string | null;
  whatsapp_message: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  mission: string | null;
  objectives: string | null;
  activities: string | null;
  achievements: string | null;
  address: string | null;
  hero_image_path: string | null;
  hero_image_url: string | null;
  sponsor_info: string | null;
  sponsor_email: string | null;
  join_info: string | null;
  updated_at: string;
}

export interface RankingRow {
  cyclist_id: string;
  full_name: string;
  slug: string | null;
  photo_url: string | null;
  category_name: string | null;
  total_points: number;
  races_count: number;
  wins: number;
  seconds: number;
  thirds: number;
  podiums: number;
  best_position: number | null;
  position_rank: number;
}

export interface CashSummary {
  total_income: number;
  total_expenses: number;
  balance: number;
  opening_balance: number;
  movements_count: number;
}

export interface CashMonthly {
  month_key: string;
  operating_income: number;
  expenses: number;
  net: number;
}

export interface ExpenseCategorySummary {
  category: string;
  count: number;
  total: number;
}

export interface MemberDebt {
  member_id: string;
  full_name: string;
  member_type: MemberType;
  member_status: MemberStatus;
  pending_periods: number;
  pending_amount: number;
  overdue_amount: number;
}

export interface MembershipSummary {
  year: number;
  month: number;
  obligations: number;
  expected_total: number;
  paid_total: number;
  pending_total: number;
  paid_count: number;
  pending_count: number;
  overdue_count: number;
}

export interface PublicStats {
  activeCyclists: number;
  races: number;
  podiums: number;
  wins: number;
  news: number;
  upcomingRaces: number;
}

export interface DashboardData {
  stats: PublicStats;
  members: number;
  activeMembers: number;
  pendingMemberships: number;
  pendingAmount: number;
  overdueAmount: number;
  debtors: number;
  incomeMonth: number;
  expensesMonth: number;
  balance: number;
  openingBalance: number;
  upcoming: Race[];
  latestNews: NewsItem[];
  latestResults: ResultWithRelations[];
  cashSummary: CashSummary | null;
}
