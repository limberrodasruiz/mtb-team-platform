# Crear el primer administrador

El panel usa **Supabase Auth** para las credenciales y la tabla `public.profiles`
para los roles. Las cuentas nuevas se crean en Supabase; la aplicación nunca
recibe ni almacena contraseñas.

> Requisitos: `supabase/schema.sql` y las cuatro migraciones de
> `supabase/migrations/` ejecutadas correctamente. Ver
> [`supabase-desde-cero.md`](supabase-desde-cero.md).

## 1. Crear la cuenta en Supabase Auth

1. Entra a tu proyecto en <https://supabase.com>.
2. Ve a **Authentication → Users → Add user → Create new user**.
3. Escribe el **correo** y una **contraseña segura**.
4. Activa **Auto Confirm User** para poder ingresar sin esperar el correo de
   confirmación.
5. Pulsa **Create user**.

> Se recomienda desactivar el registro público en
> **Authentication → Providers → Email → Allow new users to sign up**. El equipo
> es cerrado y las cuentas deben crearlas los administradores.

## 2. Verificar que el perfil se creó

La migración core instala el trigger `handle_new_user`, que crea automáticamente
un perfil con rol `CONSULTA` por cada usuario de Auth.

En **SQL Editor**, ejecuta:

```sql
select id, email, role, display_name, created_at
from public.profiles
where lower(email) = lower('tu-correo@equipo.com');
```

Debe aparecer una fila con `role = 'CONSULTA'`.

- **No aparece ninguna fila:** el trigger no está instalado o el usuario se creó
  antes de las migraciones. Vuelve a ejecutar
  `supabase/migrations/20261021100000_core_hardening.sql` y crea el usuario de
  nuevo. El paso 4 incluye un alta manual de emergencia.
- **Aparece la fila:** continúa con el paso 3.

## 3. Promover el primer administrador

En **SQL Editor**:

```sql
select public.bootstrap_admin('tu-correo@equipo.com');
```

La función:

- solo funciona si **todavía no existe ningún `ADMIN`**;
- busca el perfil por correo y le asigna el rol `ADMIN`;
- está reservada a `service_role` y al SQL Editor. **No se puede llamar desde el
  navegador** ni con la clave anónima.

Si el correo no tiene perfil, la función falla con un mensaje claro. Vuelve al
paso 2.

### Alternativa directa

Si prefieres no usar la función, o ya existe otro administrador y necesitas
recuperar el acceso, ejecuta:

```sql
update public.profiles
set role = 'ADMIN'
where lower(email) = lower('tu-correo@equipo.com')
returning id, email, role;
```

La protección del último administrador impide que se le quite el rol al único
`ADMIN` existente.

## 4. Ingresar al panel

1. Abre la aplicación (`npm run dev` o tu URL de Vercel).
2. Ve a `/admin/login`.
3. Ingresa el correo y la contraseña del paso 1.
4. Deberías llegar al dashboard con las secciones de administración visibles.

## 5. Crear el resto de las cuentas

Para cada persona del equipo:

1. Crea su usuario en **Authentication → Users** con correo individual y
   **Auto Confirm User**.
2. Verifica que el trigger haya creado su perfil (`CONSULTA`).
3. Ingresa como `ADMIN` y ve a **Admin → Usuarios y roles**.
4. Asígnale el rol que corresponda.

Roles disponibles:

| Rol | Uso recomendado |
|---|---|
| `ADMIN` | Administración completa, usuarios, auditoría y finanzas. |
| `DIRECTIVA` | Consulta y exportación, incluida la información financiera. |
| `TESORERIA` | Miembros, membresías, aportes, caja, gastos y reportes. |
| `EDITOR` | Corredores, carreras, resultados, puntuación y contenido. |
| `CONSULTA` | Solo lectura del panel. |

Los cambios de rol quedan registrados en auditoría. No compartas una misma
cuenta entre varias personas: los registros perderían trazabilidad.

## 6. Reglas de seguridad

- **Nunca** pongas la clave `service_role` en el frontend, en `.env` con prefijo
  `VITE_`, ni en un repositorio. La app solo necesita la clave anónima.
- Mantén RLS activo en todas las tablas. Las migraciones lo configuran; no lo
  desactives para “hacer que funcione”.
- Desactiva el registro público si el equipo es cerrado.
- Usa contraseñas únicas y correos reales.
- Si sospechas que una credencial se filtró, restablécala en Supabase Auth y
  revisa **Admin → Auditoría**.

## 7. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| “Tu usuario no tiene un perfil asignado” | El trigger no creó el perfil. | Reejecuta la migración core y revisa `public.profiles`. |
| “Debes confirmar tu correo antes de ingresar” | El usuario no está confirmado. | Confírmalo en Auth o crea la cuenta con **Auto Confirm User**. |
| “Correo o contraseña incorrectos” | Credenciales erróneas. | Restablece la contraseña desde Supabase Auth. |
| El login funciona pero no hay secciones | El perfil tiene rol `CONSULTA` o no tiene rol. | Asígnale rol desde **Usuarios y roles** o con SQL. |
| `bootstrap_admin` dice “Ya existe un administrador” | Ya hay un `ADMIN`. | Ingresa con ese administrador y asigna el rol desde el panel. |
| No puede quitarse el rol al último admin | Protección intencional de la base. | Primero asigna `ADMIN` a otra cuenta. |

## 8. Alta manual de emergencia

Solo si el trigger no existe y no puedes reejecutar la migración, crea el perfil
manualmente desde **SQL Editor**:

```sql
insert into public.profiles (id, email, role, display_name)
select
  u.id,
  u.email,
  'ADMIN',
  coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
from auth.users u
where lower(u.email) = lower('tu-correo@equipo.com')
on conflict (id) do update set role = 'ADMIN'
returning id, email, role;
```

Después corrige la causa: vuelve a ejecutar la migración core para que los
próximos usuarios tengan perfil automáticamente. Un alta manual sin trigger deja
al resto de las cuentas sin acceso.
