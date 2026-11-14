# Vercel desde cero

Guía para publicar **Trinx Bolivia · Bycle Sharks** en Vercel. La aplicación es
un frontend Vite que se conecta directamente a Supabase; no necesita un servidor
propio ni funciones serverless.

## 0. Antes de empezar

- El proyecto compila localmente:

  ```powershell
  npm install
  npm run build
  ```

- Supabase está configurado y probado en local.
- Tienes una cuenta en <https://github.com> y otra en <https://vercel.com>.
- Tienes claro que **solo** se usan `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_ANON_KEY`. La clave `service_role` no se usa en el frontend.

## 1. Subir el código a GitHub

Si el repositorio ya existe, salta al paso 2. Si estás empezando:

```powershell
git status
git add .
git commit -m "feat: plataforma MTB completa"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/mtb-team-platform.git
git push -u origin main
```

Antes de hacer `git add`, confirma que `.env` no aparece en `git status`. El
`.gitignore` ya excluye `.env`, `.env.local`, `dist`, `node_modules` y `.vercel`.

Nunca subas credenciales, respaldos de la base ni comprobantes de gastos.

## 2. Importar el proyecto en Vercel

1. Entra a <https://vercel.com> e inicia sesión con GitHub.
2. Pulsa **Add New → Project**.
3. Importa el repositorio `mtb-team-platform`.
4. Vercel detectará **Vite** automáticamente.

Configuración esperada:

| Ajuste | Valor |
|---|---|
| Framework Preset | Vite |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js Version | 22.x (recomendado) o 20.19+ |

No necesitas cambiar el directorio raíz si el proyecto está en la raíz del
repositorio.

## 3. Configurar variables de entorno

En **Environment Variables** agrega:

| Nombre | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Tu clave anónima / publishable |

Marca los ambientes **Production**, **Preview** y **Development** para que las
vistas previas también funcionen.

> Las variables `VITE_*` se incorporan al bundle en tiempo de build. Si cambias
> una, debes volver a desplegar; no basta con editar la variable.

## 4. Desplegar

Pulsa **Deploy** y espera el build.

Si falla:

1. Abre el log del build.
2. Revisa el error de TypeScript o de variables faltantes.
3. Corrige en local, ejecuta `npm run build` y vuelve a subir.

Un build exitoso termina con la carpeta `dist` generada.

## 5. Verificar el sitio público

Abre la URL de producción, por ejemplo:

```text
https://mtb-team-platform.vercel.app
```

Comprueba:

- [ ] La portada carga el nombre, logo y colores configurados.
- [ ] Las rutas `/equipo`, `/corredores`, `/ranking`, `/carreras`, `/resultados`,
      `/noticias`, `/galeria`, `/auspiciadores` y `/contacto` responden.
- [ ] Al refrescar una ruta interna (por ejemplo `/carreras/una-carrera`) no
      aparece un 404.
- [ ] Los estados vacíos se muestran correctamente si aún no hay datos.
- [ ] Los enlaces de contacto usan `mailto:` o `wa.me` y tienen datos reales.
- [ ] Las imágenes cargadas desde Storage se ven.
- [ ] En incógnito no aparece información privada (correos internos, fechas de
      nacimiento, notas, finanzas).

El archivo `vercel.json` incluye el rewrite de SPA:

```json
{ "framework": "vite", "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

Eso permite que React Router maneje las rutas profundas al refrescar.

## 6. Verificar el panel

1. Abre `/admin/login`.
2. Ingresa con el usuario `ADMIN` creado en Supabase.
3. Revisa el dashboard.
4. Prueba una carga pequeña: una categoría, un corredor o una noticia en
   borrador.
5. Sube una imagen para comprobar Storage.
6. Cierra sesión y entra con un usuario de solo lectura si tienes uno.

Prueba los roles importantes:

- `ADMIN`: acceso completo.
- `DIRECTIVA`: lectura y exportación de finanzas, sin botones de edición.
- `TESORERIA`: operaciones financieras.
- `EDITOR`: deporte y contenido, sin finanzas.
- `CONSULTA`: solo lectura del dashboard, sin acceso a finanzas ni edición.

## 7. Ajustar Auth para producción

En Supabase: **Authentication → URL Configuration**.

- **Site URL**: tu URL de producción.
- **Redirect URLs**: agrega la URL de producción y las vistas previas que uses,
  por ejemplo:

  ```text
  https://mtb-team-platform.vercel.app
  https://mtb-team-platform.vercel.app/**
  https://*-tu-equipo.vercel.app/**
  ```

Si usas un dominio propio, agrégalo también. Esto es necesario para recuperación
de contraseña y cualquier flujo que redirija desde un correo.

## 8. Dominio propio (opcional)

1. En Vercel: **Project → Settings → Domains**.
2. Agrega tu dominio, por ejemplo `mtbteam.bo`.
3. Configura los registros DNS que indique Vercel.
4. Espera la verificación y el certificado HTTPS.
5. Actualiza el **Site URL** y las **Redirect URLs** en Supabase.

## 9. Actualizaciones

Cada `git push` a `main` genera un despliegue de producción. Los pushes a otras
ramas generan previews.

Para cambios de variables:

1. **Project → Settings → Environment Variables**.
2. Edita el valor.
3. **Deployments → Redeploy** el último despliegue.

Para revertir a una versión anterior:

1. **Deployments**.
2. Elige un despliegue exitoso.
3. **Redeploy** o **Promote to Production**.

Las migraciones de base de datos **no** se revierten solas con el frontend. Si un
cambio de código depende de una migración, aplica primero la migración y luego
despliega.

## 10. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| 404 al refrescar `/ranking` o `/admin` | Falta el rewrite de SPA. | Confirma que `vercel.json` está en la raíz y vuelve a desplegar. |
| “Supabase no está configurado” | Variables ausentes o mal escritas. | Revisa los nombres exactos y redepliega. |
| “Invalid API key” | URL o clave incorrecta. | Copia de nuevo **Project URL** y **anon public**. |
| El sitio carga pero sin datos | Proyecto Supabase vacío o RLS sin políticas. | Ejecuta las migraciones y verifica RLS. |
| El login falla | Usuario no confirmado, contraseña incorrecta o perfil ausente. | Revisa Auth y `public.profiles`. |
| “Tu rol no tiene permisos” | El perfil tiene `CONSULTA` o el rol no corresponde. | Asigna el rol desde **Usuarios y roles**. |
| Las imágenes no suben | Formato o tamaño fuera del límite, o bucket sin políticas. | Usa JPG/PNG/WEBP de hasta 8 MB y verifica Storage. |
| El panel funciona en local pero no en Vercel | Variables de producción ausentes. | Configúralas en Vercel y redepliega. |

## 11. Seguridad en producción

- Usa solo la clave anónima en el frontend.
- Mantén RLS activo; no lo desactives para resolver un error.
- No publiques el bucket `documents`.
- Revisa los usuarios y roles periódicamente.
- Rota las credenciales si sospechas una filtración.
- Haz copias de seguridad de la base desde Supabase.
- No conectes el repositorio a servicios que puedan exponer `.env`.

## 12. Checklist final

- [ ] Build de producción exitoso.
- [ ] Variables configuradas en los tres ambientes.
- [ ] Rewrite de SPA activo.
- [ ] Rutas públicas y panel probados en producción.
- [ ] Auth URL configurada en Supabase.
- [ ] Roles probados.
- [ ] Storage probado (público y privado).
- [ ] Sitio revisado en móvil.
- [ ] Copia de seguridad inicial de la base.
