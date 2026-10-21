# Vercel desde cero (9 pasos)

Despliega la app (Vite + React) en Vercel.

## 1. Subir el código a GitHub

```bash
git init
git add .
git commit -m "mtb team platform"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/mtb-team-platform.git
git push -u origin main
```

Verifica que `.env` NO se suba (está en `.gitignore`).

## 2. Crear cuenta en Vercel

https://vercel.com → Sign up (recomendado: con GitHub).

## 3. Importar el repositorio

**Add New → Project → Import** tu repo `mtb-team-platform` → **Import**.

## 4. Configurar el framework

Framework Preset: **Vite**. Deja por defecto:

- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## 5. Agregar variables de entorno

En **Environment Variables** agrega:

- `VITE_SUPABASE_URL` = tu Project URL
- `VITE_SUPABASE_ANON_KEY` = tu anon key

Marca los 3 ambientes (Production, Preview, Development).

## 6. Deploy

**Deploy**. Espera al build. Si falla, revisa el log
(error típico: env vars ausentes).

## 7. Verificar el sitio

Abre la URL `https://tu-proyecto.vercel.app`:

- Home carga nombre del equipo (desde `site_settings`).
- Secciones públicas visibles sin login.

## 8. Probar el admin

Ve a `/admin/login` e ingresa con tu usuario `ADMIN`
(creado en Supabase según `docs/primer-admin.md`).

## 9. Redeploy ante cambios

Cada `git push` a `main` re-despliega solo.
Para cambiar env vars: Vercel → Project → Settings →
Environment Variables → editar → **Redeploy**.
