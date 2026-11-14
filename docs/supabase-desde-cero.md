# Supabase desde cero

Guía para crear la base de datos, la autenticación y el almacenamiento de
**Trinx Bolivia · Bycle Sharks** en un proyecto nuevo de Supabase.

Al terminar tendrás:

- el esquema base y las migraciones aplicadas;
- RLS activo y permisos por rol;
- los buckets públicos de imágenes y el bucket privado de comprobantes;
- el primer administrador listo para ingresar al panel.

> Si el proyecto **ya tiene datos**, no ejecutes `schema.sql` a ciegas. Haz un
> respaldo y aplica únicamente las migraciones que falten. Este documento asume
> un proyecto vacío.

## 0. Antes de empezar

- Una cuenta en <https://supabase.com>.
- Node.js 20.19+ (o 22.12+) para ejecutar el frontend.
- El repositorio del proyecto descargado.
- Acceso al **SQL Editor** del proyecto.

## 1. Crear el proyecto

1. En el dashboard de Supabase, pulsa **New project**.
2. Elige una organización, un nombre (por ejemplo `mtb-team-platform`) y una
   contraseña segura para la base. Guárdala en un gestor de contraseñas.
3. Selecciona la región más cercana a Bolivia (por ejemplo, `South America`).
4. Crea el proyecto y espera a que termine el aprovisionamiento.

## 2. Obtener la URL y la clave anónima

En el proyecto: **Project Settings → API**.

Copia:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** (o **publishable key**) → `VITE_SUPABASE_ANON_KEY`

Crea tu archivo local:

```powershell
Copy-Item .env.example .env
```

Completa `.env`:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

> La clave anónima está diseñada para el navegador. Lo que protege los datos es
> RLS, no el secreto de esa clave. **Nunca** uses la clave `service_role` en el
> frontend.

## 3. Configurar Auth

En **Authentication**:

1. Verifica que el proveedor **Email** esté habilitado.
2. Si el equipo es cerrado, desactiva **Allow new users to sign up**. Las cuentas
   las crearán los administradores.
3. Decide si usarás confirmación por correo. Para cuentas internas puedes crear
   cada usuario con **Auto Confirm User**.
4. En **URL Configuration**, define el **Site URL**:
   - desarrollo: `http://localhost:5173`;
   - producción: tu dominio de Vercel, por ejemplo
     `https://mtb-team-platform.vercel.app`.

   Agrega también las URLs de redirección que vayas a usar. Aunque el ingreso
   actual es con correo y contraseña, esta configuración es necesaria para
   recuperación de contraseña y futuros flujos de Auth.

## 4. Aplicar el esquema y las migraciones

Abre **SQL Editor → New query**. Ejecuta **un archivo por vez**, en este orden
exacto. Copia todo el contenido del archivo, pégalo y pulsa **Run**. Espera el
mensaje de éxito antes de continuar.

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `supabase/schema.sql` | Crea las 20 tablas base, índices y triggers iniciales. |
| 2 | `supabase/migrations/20261021100000_core_hardening.sql` | Refuerza integridad, crea `membership_payment_entries`, auditoría, protección del último admin y bootstrap. |
| 3 | `supabase/migrations/20261021101000_finance_and_views.sql` | RPC transaccionales de finanzas, vistas derivadas y ranking público. |
| 4 | `supabase/migrations/20261021102000_rls_and_grants.sql` | RLS por rol, permisos mínimos y políticas de Storage. |
| 5 | `supabase/migrations/20261021103000_hardening_followups.sql` | Ajustes finales de permisos, obligaciones, recálculo de puntos y vistas. |
| 6 | `supabase/seed.sql` *(opcional)* | Categorías base y reglas de puntuación. No crea datos ficticios. |

Notas importantes:

- Las migraciones son **aditivas e idempotentes**: no borran ni reinician datos.
- **No ejecutes** `supabase/rls.sql` ni `supabase/storage.sql`. Son archivos
  heredados y fueron reemplazados por la migración `20261021102000`. Ejecutarlos
  después volvería a abrir políticas que la migración cierra.
- Si una migración falla, **detente** y lee el error. No sigas con la siguiente.
- El seed es opcional. Si no lo ejecutas, crea las categorías y la puntuación
  desde el panel antes de cargar resultados.

## 5. Verificar el esquema

En **SQL Editor**:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;
```

Deben aparecer 21 tablas:

```text
achievements          gallery               race_registrations
audit_logs            members               race_results
banners               membership_payment_entries
                      membership_payments   races
cash_movements        news                  scoring_rules
categories            profiles              site_settings
contributions         race_budgets          sponsors
cyclists              expenses
```

Verifica que RLS esté activo en todas:

```sql
select c.relname as tabla, c.relrowsecurity as rls_activo
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;
```

Todas las filas deben mostrar `rls_activo = true`.

Verifica las funciones principales:

```sql
select p.proname as funcion
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'bootstrap_admin',
    'admin_set_role',
    'get_ranking',
    'register_membership_payment',
    'reverse_membership_payment',
    'register_income',
    'reverse_income',
    'register_expense',
    'reverse_expense',
    'set_opening_balance',
    'reverse_opening_balance',
    'generate_membership_obligations',
    'update_membership_obligation',
    'annul_membership_obligation'
  )
order by p.proname;
```

Verifica la fila de configuración:

```sql
select id, team_name, primary_color, secondary_color, accent_color
from public.site_settings
where id = 1;
```

Debe existir **una** fila. Si no existe, la migración core no se aplicó
correctamente.

Comprueba que no haya datos de demostración:

```sql
select
  (select count(*) from public.cyclists) as corredores,
  (select count(*) from public.races) as carreras,
  (select count(*) from public.race_results) as resultados,
  (select count(*) from public.news) as noticias,
  (select count(*) from public.sponsors) as auspiciadores,
  (select count(*) from public.members) as miembros;
```

En un proyecto nuevo todos los valores deben ser `0`. El seed solo agrega
categorías y reglas de puntuación.

## 6. Verificar Storage

La migración `20261021102000` crea los buckets y sus políticas. En **Storage**
deberías ver:

| Bucket | Acceso | Uso |
|---|---|---|
| `gallery` | Público | Fotografías de la galería |
| `news` | Público | Portadas de noticias |
| `banners` | Público | Banners, logo e imagen de portada |
| `cyclists` | Público | Fotos de corredores |
| `sponsors` | Público | Logos de auspiciadores |
| `documents` | **Privado** | Comprobantes de gastos (imágenes o PDF) |

Verificación por SQL:

```sql
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('gallery', 'news', 'banners', 'cyclists', 'sponsors', 'documents')
order by id;
```

Los cinco buckets públicos deben tener `public = true`. `documents` debe tener
`public = false` y límite de 10 MB.

Las políticas permiten:

- lectura pública solo de los cinco buckets de imágenes;
- escritura de imágenes a `ADMIN` y `EDITOR`;
- lectura de `documents` a `ADMIN`, `DIRECTIVA` y `TESORERIA`;
- escritura de `documents` solo a `ADMIN` y `TESORERIA`.

No cambies `documents` a público: los comprobantes pueden contener datos
personales.

## 7. Crear el primer administrador

Sigue [`primer-admin.md`](primer-admin.md). Resumen:

1. Crea el usuario en **Authentication → Users** con **Auto Confirm User**.
2. El trigger crea el perfil con rol `CONSULTA`.
3. En **SQL Editor** ejecuta:

   ```sql
   select public.bootstrap_admin('tu-correo@equipo.com');
   ```

4. Ingresa a `/admin/login`.

## 8. Conectar el frontend

```powershell
npm install
npm run dev
```

Abre `http://localhost:5173`. Si la portada muestra los valores institucionales y
el panel permite iniciar sesión, la conexión está bien.

Si aparece “Supabase no está configurado”, revisa que `.env` exista, que las
variables tengan exactamente esos nombres y que hayas reiniciado Vite después de
editarlas.

## 9. Checklist de seguridad

- [ ] RLS activo en todas las tablas.
- [ ] Registro público desactivado (si el equipo es cerrado).
- [ ] Contraseña de la base guardada de forma segura.
- [ ] Clave `service_role` fuera del repositorio y del frontend.
- [ ] Bucket `documents` privado.
- [ ] Primer `ADMIN` creado y probado.
- [ ] Migraciones ejecutadas sin errores.
- [ ] Sitio público probado en una ventana de incógnito.
- [ ] Copias de seguridad revisadas en **Project Settings → Database**.

## 10. Problemas frecuentes

| Error | Causa probable | Solución |
|---|---|---|
| `relation "public.xxx" does not exist` | No se ejecutó `schema.sql` o se saltó una migración. | Ejecuta los archivos en el orden indicado. |
| `function public.xxx does not exist` | Migración de finanzas o hardening no aplicada. | Ejecuta las migraciones 101000, 101010 y 101030. |
| `permission denied for table ...` | Faltan grants o RLS bloquea al rol. | Verifica que la migración 103000 se ejecutó y que el perfil tiene el rol correcto. |
| `new row violates row-level security policy` | El rol no puede escribir esa tabla. | Revisa el rol en **Usuarios y roles**; no desactives RLS. |
| `Bucket not found` | La migración de Storage no se ejecutó. | Ejecuta `20261021102000_rls_and_grants.sql`. |
| `bootstrap_admin` falla | No existe perfil o ya hay un admin. | Verifica `public.profiles`; usa el panel si ya hay administrador. |
| El sitio carga vacío | No hay datos reales cargados. | Es el estado esperado. Carga contenido desde el panel. |

## 11. Siguiente paso

Continúa con:

1. [`primer-admin.md`](primer-admin.md) para crear el acceso.
2. [`configuracion-inicial.md`](configuracion-inicial.md) para cargar identidad,
   categorías, puntuación y contenido.
3. [`vercel-desde-cero.md`](vercel-desde-cero.md) para publicar el sitio.
