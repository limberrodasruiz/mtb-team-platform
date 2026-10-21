# MTB Team Platform — TRINX BOLIVIA · BYCLE SHARKS

Plataforma web del equipo de MTB: sitio público (ciclistas, carreras, ranking,
noticias, galería, sponsors) + panel admin por roles (deporte, finanzas,
contenido, auditoría).

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS 4 + React Router 7
- Supabase (Postgres + Auth + Storage) + Vercel (deploy)

## Requisitos

- Node.js 20+ y npm
- Cuenta Supabase (https://supabase.com)
- Cuenta Vercel (solo para deploy)

## Instalación local

```bash
npm install
cp .env.example .env
# editar .env con URL y ANON KEY de Supabase
npm run dev
```

Build / preview:

```bash
npm run build
npm run preview
```

## Configuración Supabase (resumen)

1. Crear proyecto en https://supabase.com → **New project**.
2. Obtener **Project URL** y **anon public key**:
   Project Settings → API.
3. Pegarlas en `.env`:
   `VITE_SUPABASE_URL=`, `VITE_SUPABASE_ANON_KEY=`.
4. En Supabase → **SQL Editor → New query**, ejecutar en orden:
   1. `supabase/schema.sql`
   2. `supabase/rls.sql`
   3. `supabase/storage.sql`
   4. `supabase/seed.sql` (solo demo)
5. Verificar buckets en **Storage**: `gallery, news, banners, cyclists, sponsors`
   (todos públicos).
6. Crear primer admin (ver `docs/primer-admin.md`):
   Authentication → Add user → copiar UID →
   `insert into public.profiles (id, email, role, display_name)
    values ('UID','tu@mail.com','ADMIN','Tu nombre');`
7. Entrar en `/admin/login`.

Guías paso a paso: `docs/supabase-desde-cero.md`, `docs/vercel-desde-cero.md`,
`docs/primer-admin.md`, `docs/configuracion-inicial.md`.

## Variables de entorno

| Variable | Dónde |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |

En Vercel: Project → Settings → Environment Variables (mismas dos).

## Deploy en Vercel

1. Subir repo a GitHub.
2. Vercel → Add New → Project → importar repo.
3. Framework: Vite. Build: `npm run build`. Output: `dist`.
4. Agregar las 2 env vars. Deploy.

Detalle: `docs/vercel-desde-cero.md`.

## Estructura

```
src/            # app existente (types, services, features...) — no modificar
supabase/
  schema.sql    # tablas + índices + triggers
  rls.sql       # RLS + políticas por rol
  storage.sql   # buckets + políticas
  seed.sql      # datos DEMO
docs/           # guías en español
.env.example
```

## Roles y permisos

| Rol | Acceso |
|---|---|
| `ADMIN` | Todo |
| `DIRECTIVA` | Lectura sensible (miembros, finanzas) + lectura pública |
| `TESORERIA` | CRUD finanzas (members, payments, contributions, cash, expenses, budgets) |
| `EDITOR` | CRUD deporte (cyclists, races, results, scoring...) y contenido (news, banners, sponsors, gallery, settings) |
| `CONSULTA` | Solo lectura pública |

Lectura pública (sin login): categorías, ciclistas activos, carreras,
resultados, scoring, logros, sponsors activos, noticias `PUBLICADO`,
banners activos, galería publicada, ajustes del sitio.

Tablas sensibles (requieren login + rol): `members`, `membership_payments`,
`contributions`, `cash_movements`, `expenses`, `race_budgets`, `profiles`,
`audit_logs` (solo `ADMIN` lee; insertar lo puede cualquier autenticado;
nadie puede editar/borrar).

## Reglas de negocio

- **Puntos automáticos**: al cargar un resultado, copiar `points` desde
  `scoring_rules` según `position` (1→10, 2→8, 3→6, 4→5, 5→4, 6→3, 7→2, 8→1).
- **Caja**: `balance = SUM(INGRESO) − SUM(EGRESO)` en `cash_movements`.
- **Ranking calculado**: se agrega desde `race_results`
  (puntos totales, carreras, victorias, podios); no es una tabla.
- **Auditoría**: registrar CREATE/UPDATE/DELETE/LOGIN/LOGOUT en `audit_logs`
  con `module`, `record_id`, `old_data`/`new_data`.
- **Mensualidades**: unicidad `(member_id, month, year)`;
  estados `PAGADO|PENDIENTE|PARCIAL|VENCIDO`.
- **Inscripciones**: unicidad `(race_id, cyclist_id)`.

## Usuarios demo

El seed no crea usuarios de Auth (Supabase no lo permite desde SQL).
Crea los perfiles manualmente (ver `docs/primer-admin.md`) y asigna roles:

- `admin@demo.bo` → `ADMIN`
- `tesoreria@demo.bo` → `TESORERIA`
- `editor@demo.bo` → `EDITOR`

## Cómo eliminar los datos demo

Todas las filas demo contienen `DEMO` en algún campo o son las categorías
base. Para limpiar:

```sql
-- Borra en orden por FKs
delete from public.race_results where notes = 'DEMO';
delete from public.race_registrations
where race_id in (select id from public.races where slug like '%2026');
delete from public.achievements where description like 'DEMO%';
delete from public.news where title like 'DEMO%';
delete from public.banners where title like 'DEMO%';
delete from public.sponsors where name like 'DEMO%';
delete from public.membership_payments
where member_id in (select id from public.members where notes = 'DEMO');
delete from public.members where notes = 'DEMO';
delete from public.races where slug in
  ('campeonato-departamental-mtb-2026','municipal-mtb-2026');
delete from public.cyclists where slug in
  ('german-amaya','carlos-perez','luis-rodriguez','miguel-rojas');
-- Categorías y scoring: borrar solo si no los usarás en producción
-- delete from public.categories where slug in
--   ('elite','sub-23','junior','master-a','master-b','principiantes');
update public.site_settings set slogan=null, description=null, history=null
  where id = 1;
```

> Nota: `src/types` y `src/services` usan nombres de columnas distintos a
> este esquema (p. ej. `is_active` vs `active`, `race_date` vs `date`).
> Si la app falla al leer, hay que alinear servicios/tipos con esta BD
> en una tarea aparte (no se tocó `src/` en este cambio).
