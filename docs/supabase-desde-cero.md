# Supabase desde cero (11 pasos)

Crea el proyecto, la base de datos y el almacenamiento para MTB Team Platform.

## 1. Crear cuenta

Entra a https://supabase.com → Sign up (GitHub o email).

## 2. Crear proyecto

Dashboard → **New project** → nombre `mtb-team-platform` →
password segura (guárdala) → región más cercana (p. ej. `South America`) →
**Create new project**. Espera ~2 min.

## 3. Obtener URL y anon key

Project → **Settings (⚙) → API** → copia:

- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` → `VITE_SUPABASE_ANON_KEY`

Pégalas en tu `.env` local (ver `.env.example`).

## 4. Abrir SQL Editor

Menú lateral → **SQL Editor → New query**.

## 5. Ejecutar schema.sql

Abre `supabase/schema.sql`, copia todo, pégalo en el editor → **Run**.
Debe crear 20 tablas, índices y triggers `handle_updated_at`.
Si un objeto ya existe, el script usa `if not exists` y es re-ejecutable.

## 6. Ejecutar rls.sql

Igual con `supabase/rls.sql`: habilita RLS, crea `is_admin_or()` e
`is_staff()` y todas las políticas por rol. Revisa que no haya errores.

## 7. Ejecutar storage.sql

Igual con `supabase/storage.sql`: crea los buckets
`gallery, news, banners, cyclists, sponsors` (públicos) y sus políticas.

## 8. Ejecutar seed.sql (solo demo)

Igual con `supabase/seed.sql`. Carga categorías, ciclistas, scoring,
carreras, resultados, sponsors, noticias, banners, ajustes y miembros demo.
Todo marcado con `DEMO`.

## 9. Verificar tablas

**Table Editor**: debes ver `profiles, categories, cyclists, races,
race_results, scoring_rules, members, membership_payments, sponsors,
news, banners, gallery, site_settings`, etc.

## 10. Verificar Storage

**Storage**: buckets `gallery, news, banners, cyclists, sponsors`,
columna Public = true.

## 11. Crear primer admin

Ver `docs/primer-admin.md`. Resumen:

1. **Authentication → Users → Add user → Create new user**
   (email + password, Auto Confirm).
2. Copia el **UID**.
3. En SQL Editor:
   ```sql
   insert into public.profiles (id, email, role, display_name)
   values ('PEGAR-UID','tu@mail.com','ADMIN','Tu nombre');
   ```
4. Entra en tu app a `/admin/login`.

Listo: la API ya responde con RLS aplicado.
