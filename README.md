# Trinx Bolivia · Bycle Sharks — Plataforma MTB

Sitio público y panel interno para el equipo de mountain bike **Trinx Bolivia · Bycle Sharks**
(Santa Cruz, Bolivia).

- **Sitio público:** portada, equipo, corredores, ranking, carreras, resultados, noticias,
  galería, auspiciadores y contacto.
- **Panel privado:** deportivo, contenido, miembros, membresías, aportes, caja, gastos,
  reportes, usuarios, auditoría y configuración.
- **Datos reales:** la aplicación no incluye datos de demostración ni resultados ficticios.
  Todo el contenido se administra desde Supabase y el panel.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite 8, TypeScript |
| Estilos | Tailwind CSS 4 |
| Rutas | React Router 7 |
| Backend | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Deploy | Vercel |

## Inicio rápido

```bash
npm install
Copy-Item .env.example .env   # PowerShell
# o: cp .env.example .env
npm run dev
```

Completa `.env` con la URL y la clave anónima de tu proyecto Supabase:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

> Nunca uses ni publiques la `service_role` key. La app solo necesita la clave anónima;
> los permisos reales se aplican con RLS en PostgreSQL.

Scripts disponibles:

```bash
npm run dev      # desarrollo
npm run build    # TypeScript + build de producción
npm run preview  # previsualizar dist
npm run lint     # oxlint
```

## Base de datos

El esquema base está en `supabase/schema.sql`. Las migraciones incrementales están en
`supabase/migrations/` y deben ejecutarse **después** del esquema base, en este orden:

1. `supabase/schema.sql`
2. `supabase/migrations/20261021100000_core_hardening.sql`
3. `supabase/migrations/20261021101000_finance_and_views.sql`
4. `supabase/migrations/20261021102000_rls_and_grants.sql`
5. `supabase/migrations/20261021103000_hardening_followups.sql`
6. `supabase/seed.sql` *(opcional: categorías base y reglas de puntuación)*

Puedes ejecutar cada archivo desde **Supabase → SQL Editor → New query**. Las migraciones son
aditivas e idempotentes; no borran datos existentes.

### Qué agregan las migraciones

- Restricciones, índices y triggers de integridad para corredores, carreras y resultados.
- Cálculo de puntos del ranking a partir de `scoring_rules` y `race_results` (el ranking **no**
  se almacena como tabla).
- Tablas y RPC transaccionales para membresías, pagos parciales, aportes, caja, gastos,
  presupuestos, saldo inicial y reversos.
- Vistas de solo lectura para caja, deuda, resumen de membresías y situación por carrera.
- RLS por rol, políticas de Storage y auditoría append-only.
- Protección del último administrador y bootstrap del primer admin.

### Primer administrador

1. En Supabase → **Authentication → Users → Add user**, crea la cuenta con correo y contraseña
   (marca **Auto Confirm User**).
2. El trigger `handle_new_user` crea automáticamente su perfil con rol `CONSULTA`.
3. En **SQL Editor**, promueve el perfil a administrador:

```sql
select public.bootstrap_admin('tu-correo@equipo.com');
```

También puedes hacerlo directo en SQL:

```sql
update public.profiles
set role = 'ADMIN'
where lower(email) = lower('tu-correo@equipo.com');
```

4. Ingresa en `/admin/login`.

Las cuentas nuevas se crean **solo desde Supabase Auth**. El panel de usuarios permite
asignar roles a perfiles existentes, pero no crear credenciales con la clave anónima.

Más detalle: [`docs/primer-admin.md`](docs/primer-admin.md).

## Roles y permisos

| Rol | Alcance |
|---|---|
| `ADMIN` | Todo el sistema: configuración, usuarios, auditoría y operaciones financieras. |
| `DIRECTIVA` | Consulta de miembros, membresías y finanzas. Solo lectura; no registra ni revierte movimientos. |
| `TESORERIA` | Miembros, membresías, aportes, caja, gastos, presupuestos y reportes. |
| `EDITOR` | Corredores, categorías, carreras, resultados, puntuación y contenido. |
| `CONSULTA` | Acceso de solo lectura al dashboard; sin módulos de edición ni finanzas. |

Los permisos se aplican dos veces: en la interfaz y en PostgreSQL mediante RLS y RPCs
`SECURITY DEFINER` con validación de rol. Ocultar un botón no es la única protección.

## Integridad financiera

- Los montos usan `numeric(12,2)`, no `float`.
- Cada operación financiera se ejecuta en una transacción de base de datos.
- Las membresías admiten pagos parciales; el estado (`PENDIENTE`, `PARCIAL`, `PAGADO`,
  `VENCIDO`) se deriva del monto pagado y la fecha de vencimiento.
- Los movimientos no se eliminan: se **anulan o revierten** con motivo y quedan en auditoría.
- El saldo inicial se registra una sola vez y se informa aparte de los ingresos operativos.
- Los comprobantes de gastos se guardan en el bucket privado `documents` y se abren con
  enlaces firmados temporales.
- Solo `ADMIN` y `TESORERIA` pueden registrar o revertir movimientos. `DIRECTIVA` puede
  consultar y exportar.

## Ranking

El ranking público se obtiene de la función `get_ranking(p_year, p_category_id)`, que suma los
puntos de `race_results` según `scoring_rules`. No existe una tabla de posiciones que pueda
quedar desactualizada.

- Los puntos se recalculan al cambiar las reglas de puntuación.
- `DNF`, `DSQ`, `DNS` y resultados anulados no suman puntos.
- Se admiten posiciones compartidas.
- La configuración de puntos se administra en **Admin → Puntuación**.

## Storage

| Bucket | Uso | Acceso |
|---|---|---|
| `gallery` | Galería pública | Público |
| `news` | Portadas de noticias | Público |
| `banners` | Banners, logo y hero | Público |
| `cyclists` | Fotos de corredores | Público |
| `sponsors` | Logos de auspiciadores | Público |
| `documents` | Comprobantes de gastos | Privado, enlaces firmados |

Las imágenes se validan por tipo real y tamaño, se redimensionan/comprimen en el navegador y se
suben con nombres aleatorios. La base de datos guarda la referencia (`path`), no el archivo.

## Deploy en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel: **Add New → Project → Import**.
3. Framework: **Vite**. Build: `npm run build`. Output: `dist`.
4. Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en **Environment Variables**
   (Production, Preview y Development).
5. Deploy.

`vercel.json` incluye el rewrite de SPA para que las rutas de React Router funcionen al
refrescar. Más detalle: [`docs/vercel-desde-cero.md`](docs/vercel-desde-cero.md).

## Estructura

```text
src/
  components/        # UI, layouts y componentes públicos
  constants/         # roles, navegación, catálogos y valores por defecto
  hooks/             # useAsync, debounce, título de página
  lib/               # cliente Supabase, errores y permisos
  pages/
    public/          # sitio público
    admin/           # panel privado
  providers/         # Auth, SiteSettings y Toast
  routes/            # AppRoutes con lazy loading y guards
  services/          # acceso a datos y RPCs
  types/             # tipos del dominio
  utils/             # formato, CSV, validación, imágenes, colores
supabase/
  schema.sql         # esquema base
  migrations/        # hardening, finanzas, RLS y ajustes
  seed.sql           # seed opcional sin datos ficticios
docs/                # guías de configuración y deploy
```

## Documentación

- [`docs/supabase-desde-cero.md`](docs/supabase-desde-cero.md)
- [`docs/primer-admin.md`](docs/primer-admin.md)
- [`docs/configuracion-inicial.md`](docs/configuracion-inicial.md)
- [`docs/vercel-desde-cero.md`](docs/vercel-desde-cero.md)

## Notas de operación

- El sitio muestra estados vacíos honestos cuando todavía no hay datos cargados.
- El contacto público usa enlaces `mailto:` y `wa.me`; no hay un endpoint de formulario falso.
- Los cambios de rol, pagos, reversos y operaciones de caja quedan registrados en auditoría.
- Antes de publicar, revisa la configuración del sitio, las políticas de Storage y que las
  migraciones se hayan ejecutado sin errores en tu proyecto.
