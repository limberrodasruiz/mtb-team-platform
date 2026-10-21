-- ============================================================
-- MTB Team Platform — schema.sql
-- Postgres / Supabase. Orden de creación por dependencias.
-- ============================================================

-- 1) Extensiones
create extension if not exists "pgcrypto";

-- 2) Función updated_at (se usa en triggers al final)
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 3) Perfiles (1 por usuario de auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'CONSULTA'
    check (role in ('ADMIN','DIRECTIVA','TESORERIA','EDITOR','CONSULTA')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Perfiles con rol de aplicación (1 por auth.users).';
comment on column public.profiles.role is 'ADMIN|DIRECTIVA|TESORERIA|EDITOR|CONSULTA';

-- ============================================================
-- 4) Categorías deportivas
-- ============================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.categories is 'Categorías deportivas (Élite, Junior, etc.).';

-- ============================================================
-- 5) Ciclistas
-- ============================================================
create table if not exists public.cyclists (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  slug text not null unique,
  birth_date date,
  category_id uuid references public.categories (id) on delete set null,
  specialty text,
  number int,
  photo_path text,
  photo_url text,
  bio text,
  team_since int,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
comment on table public.cyclists is 'Plantilla de ciclistas del equipo.';

-- ============================================================
-- 6) Carreras
-- ============================================================
create table if not exists public.races (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  date date not null,
  place text,
  city text,
  department text,
  organizer text,
  race_type text,
  description text,
  status text not null default 'PLANIFICADA'
    check (status in ('PLANIFICADA','ABIERTA','FINALIZADA','CANCELADA')),
  image_path text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
comment on table public.races is 'Calendario y detalle de carreras.';

-- ============================================================
-- 7) Inscripciones carrera ↔ ciclista
-- ============================================================
create table if not exists public.race_registrations (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races (id) on delete cascade,
  cyclist_id uuid not null references public.cyclists (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (race_id, cyclist_id)
);
comment on table public.race_registrations is 'Inscripciones únicas por (carrera, ciclista).';

-- ============================================================
-- 8) Reglas de puntuación
-- ============================================================
create table if not exists public.scoring_rules (
  id uuid primary key default gen_random_uuid(),
  position int not null unique check (position > 0),
  points int not null check (points >= 0),
  created_at timestamptz not null default now()
);
comment on table public.scoring_rules is 'Puntos por posición (1→10, 2→8, ...).';

-- ============================================================
-- 9) Resultados
-- ============================================================
create table if not exists public.race_results (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races (id) on delete cascade,
  cyclist_id uuid not null references public.cyclists (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  position int not null check (position > 0),
  time_text text,
  points int not null default 0 check (points >= 0),
  notes text,
  created_at timestamptz not null default now()
);
comment on table public.race_results is 'Resultados por carrera; points se copian de scoring_rules.';

-- ============================================================
-- 10) Logros / palmarés
-- ============================================================
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  cyclist_id uuid not null references public.cyclists (id) on delete cascade,
  title text not null,
  year int,
  description text,
  highlight boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.achievements is 'Palmarés por ciclista.';

-- ============================================================
-- 11) Socios / miembros
-- ============================================================
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  ci text,
  phone text,
  email text,
  joined_at date not null default current_date,
  status text not null default 'ACTIVO'
    check (status in ('ACTIVO','INACTIVO','SUSPENDIDO')),
  member_type text not null default 'GENERAL'
    check (member_type in ('CORREDOR','DIRIGENTE','COLABORADOR','GENERAL')),
  monthly_amount numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.members is 'Padrón de miembros del equipo (zona sensible).';

-- ============================================================
-- 12) Mensualidades
-- ============================================================
create table if not exists public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null check (year between 2000 and 2100),
  expected numeric(10,2) not null default 0,
  paid numeric(10,2) not null default 0,
  paid_at timestamptz,
  method text,
  status text not null default 'PENDIENTE'
    check (status in ('PAGADO','PENDIENTE','PARCIAL','VENCIDO')),
  created_at timestamptz not null default now(),
  unique (member_id, month, year)
);
comment on table public.membership_payments is 'Pagos mensuales únicos por (miembro, mes, año).';

-- ============================================================
-- 13) Aportes / contribuciones
-- ============================================================
create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members (id) on delete set null,
  date date not null default current_date,
  amount numeric(12,2) not null check (amount > 0),
  concept text,
  method text,
  created_at timestamptz not null default now()
);
comment on table public.contributions is 'Aportes extraordinarios.';

-- ============================================================
-- 14) Caja (ingresos / egresos operativos)
-- ============================================================
create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  type text not null check (type in ('INGRESO','EGRESO')),
  category text,
  concept text not null,
  amount numeric(12,2) not null check (amount > 0),
  race_id uuid references public.races (id) on delete set null,
  method text,
  reference text,
  created_by uuid,
  created_at timestamptz not null default now()
);
comment on table public.cash_movements is 'Caja: balance = ingresos - egresos.';

-- ============================================================
-- 15) Gastos con respaldo
-- ============================================================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  concept text not null,
  category text,
  amount numeric(12,2) not null check (amount > 0),
  race_id uuid references public.races (id) on delete set null,
  beneficiary text,
  method text,
  receipt_path text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);
comment on table public.expenses is 'Gastos con beneficiario y comprobante.';

-- ============================================================
-- 16) Presupuesto por carrera
-- ============================================================
create table if not exists public.race_budgets (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races (id) on delete cascade,
  category text not null,
  budgeted numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (race_id, category)
);
comment on table public.race_budgets is 'Presupuesto por (carrera, categoría de gasto).';

-- ============================================================
-- 17) Patrocinadores
-- ============================================================
create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_path text,
  logo_url text,
  description text,
  website text,
  socials jsonb not null default '{}'::jsonb,
  support_type text,
  starts_at date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.sponsors is 'Patrocinadores del equipo.';

-- ============================================================
-- 18) Noticias
-- ============================================================
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  cover_path text,
  cover_url text,
  content text,
  published_at timestamptz,
  author text,
  category text,
  status text not null default 'BORRADOR'
    check (status in ('BORRADOR','PUBLICADO')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
comment on table public.news is 'Noticias: solo PUBLICADO es visible.';

-- ============================================================
-- 19) Banners / hero
-- ============================================================
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_path text,
  image_url text,
  button_label text,
  url text,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.banners is 'Banners del hero, ordenados por sort_order.';

-- ============================================================
-- 20) Galería
-- ============================================================
create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  date date,
  race_id uuid references public.races (id) on delete set null,
  cyclist_id uuid references public.cyclists (id) on delete set null,
  storage_path text,
  url text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.gallery is 'Fotos en Storage + metadatos.';

-- ============================================================
-- 21) Auditoría
-- ============================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null
    check (action in ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT')),
  module text,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now(),
  ip text
);
comment on table public.audit_logs is 'Auditoría append-only (sin update/delete vía RLS).';

-- ============================================================
-- 22) Ajustes del sitio (fila única id=1)
-- ============================================================
create table if not exists public.site_settings (
  id int primary key,
  team_name text not null default 'MTB Team',
  slogan text,
  description text,
  history text,
  founded_year int,
  logo_path text,
  email text,
  whatsapp text,
  facebook text,
  instagram text,
  tiktok text,
  youtube text,
  primary_color text,
  secondary_color text,
  updated_at timestamptz not null default now()
);
comment on table public.site_settings is 'Configuración global (una sola fila id=1).';

-- ============================================================
-- 23) Índices (FKs, slugs, fechas)
-- ============================================================
create index if not exists idx_cyclists_category on public.cyclists (category_id);
create index if not exists idx_cyclists_slug on public.cyclists (slug);
create index if not exists idx_cyclists_active on public.cyclists (active);
create index if not exists idx_races_slug on public.races (slug);
create index if not exists idx_races_date on public.races (date desc);
create index if not exists idx_races_status on public.races (status);
create index if not exists idx_reg_race on public.race_registrations (race_id);
create index if not exists idx_reg_cyclist on public.race_registrations (cyclist_id);
create index if not exists idx_results_race on public.race_results (race_id);
create index if not exists idx_results_cyclist on public.race_results (cyclist_id);
create index if not exists idx_results_category on public.race_results (category_id);
create index if not exists idx_results_position on public.race_results (position);
create index if not exists idx_ach_cyclist on public.achievements (cyclist_id);
create index if not exists idx_pay_member on public.membership_payments (member_id);
create index if not exists idx_pay_period on public.membership_payments (year, month);
create index if not exists idx_contrib_member on public.contributions (member_id);
create index if not exists idx_contrib_date on public.contributions (date desc);
create index if not exists idx_cash_date on public.cash_movements (date desc);
create index if not exists idx_cash_type on public.cash_movements (type);
create index if not exists idx_cash_race on public.cash_movements (race_id);
create index if not exists idx_exp_date on public.expenses (date desc);
create index if not exists idx_exp_race on public.expenses (race_id);
create index if not exists idx_budget_race on public.race_budgets (race_id);
create index if not exists idx_news_slug on public.news (slug);
create index if not exists idx_news_status on public.news (status);
create index if not exists idx_banners_active on public.banners (active);
create index if not exists idx_gallery_race on public.gallery (race_id);
create index if not exists idx_gallery_cyclist on public.gallery (cyclist_id);
create index if not exists idx_gallery_date on public.gallery (date desc);
create index if not exists idx_audit_user on public.audit_logs (user_id);
create index if not exists idx_audit_created on public.audit_logs (created_at desc);
create index if not exists idx_members_status on public.members (status);

-- ============================================================
-- 24) Triggers updated_at
-- ============================================================
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_categories_updated on public.categories;
create trigger trg_categories_updated
  before update on public.categories
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_cyclists_updated on public.cyclists;
create trigger trg_cyclists_updated
  before update on public.cyclists
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_races_updated on public.races;
create trigger trg_races_updated
  before update on public.races
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_members_updated on public.members;
create trigger trg_members_updated
  before update on public.members
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_sponsors_updated on public.sponsors;
create trigger trg_sponsors_updated
  before update on public.sponsors
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_news_updated on public.news;
create trigger trg_news_updated
  before update on public.news
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_banners_updated on public.banners;
create trigger trg_banners_updated
  before update on public.banners
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_site_settings_updated on public.site_settings;
create trigger trg_site_settings_updated
  before update on public.site_settings
  for each row execute function public.handle_updated_at();
