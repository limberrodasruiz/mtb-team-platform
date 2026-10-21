# Crear el primer administrador

Supabase Auth no permite crear usuarios desde `seed.sql`,
así que el primer admin se crea a mano (una sola vez).

## 1. Crear el usuario en Auth

1. Supabase → **Authentication → Users → Add user → Create new user**.
2. Completa **Email** (p. ej. `admin@demo.bo`) y **Password**.
3. Activa **Auto Confirm User** → **Create user**.
4. En la lista, copia el **UID** (columna `User UID`).

## 2. Insertar el perfil ADMIN

SQL Editor → New query:

```sql
insert into public.profiles (id, email, role, display_name)
values (
  'PEGAR-AQUI-EL-UID',
  'admin@demo.bo',
  'ADMIN',
  'Administrador'
);
```

Verifica:

```sql
select id, email, role from public.profiles;
```

## 3. Entrar al panel

1. Corre la app (`npm run dev`) o abre tu URL de Vercel.
2. Ve a `/admin/login`.
3. Ingresa email + password del paso 1.

## 4. Crear más usuarios

Repite el paso 1-2 con otros roles:

```sql
insert into public.profiles (id, email, role, display_name) values
  ('UID-TESORERIA','tesoreria@demo.bo','TESORERIA','Tesorería'),
  ('UID-EDITOR','editor@demo.bo','EDITOR','Editor');
```

Roles válidos: `ADMIN | DIRECTIVA | TESORERIA | EDITOR | CONSULTA`.

## Errores comunes

- **No veo datos sensibles**: tu perfil no tiene el rol correcto
  o la RLS te bloquea. Revisa `select * from profiles where id = auth.uid();`
  con el usuario logueado.
- **Login OK pero redirige**: el perfil no existe en `public.profiles`
  (falta el insert del paso 2).
