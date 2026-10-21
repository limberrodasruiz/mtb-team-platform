# Configuración inicial del equipo

Todo esto se hace logueado como `ADMIN` o `EDITOR`
(donde aplique), o directo en Supabase.

## 1. Nombre, colores y logo

Tabla `site_settings` (fila `id = 1`):

```sql
update public.site_settings set
  team_name = 'TRINX BOLIVIA - BYCLE SHARKS',
  slogan = 'Pasión por el MTB',
  primary_color = '#0ea5e9',
  secondary_color = '#0f172a'
where id = 1;
```

- **Logo**: sube el archivo al bucket `sponsors` (o `banners`)
  en **Storage**, copia su URL pública y guárdala en
  `site_settings.logo_path`.
- Contacto/redes: columnas `email, whatsapp, facebook, instagram,
  tiktok, youtube`. Historia: `description, history, founded_year`.

## 2. Puntuación (scoring)

Tabla `scoring_rules`. Default demo:

| Posición | Puntos |
|---|---|
| 1 | 10 |
| 2 | 8 |
| 3 | 6 |
| 4 | 5 |
| 5 | 4 |
| 6 | 3 |
| 7 | 2 |
| 8 | 1 |

Para cambiar puntos:

```sql
update public.scoring_rules set points = 12 where position = 1;
```

Al cargar resultados en `race_results`, copia los puntos
correspondientes a mano (o desde tu formulario admin).

## 3. Categorías

Tabla `categories` (`name, slug, description`).
El seed trae: Élite, Sub-23, Junior, Máster A, Máster B, Principiantes.
Puedes renombrar, agregar o borrar (si no tienen ciclistas asociados):

```sql
insert into public.categories (name, slug, description)
values ('Damas Élite','damas-elite','Rama femenina');
```

## 4. Banners del hero

Tabla `banners`, ordenados por `sort_order`:

1. Sube la imagen al bucket `banners` (Storage) → copia URL.
2. Inserta:
   ```sql
   insert into public.banners
     (title, subtitle, image_url, button_label, url, active, sort_order)
   values
     ('Temporada 2026','Vamos Sharks','https://.../img.jpg',
      'Ver carreras','/carreras', true, 1);
   ```
3. Para programar: usa `starts_at / ends_at`.
   Para ocultar sin borrar: `active = false`.
