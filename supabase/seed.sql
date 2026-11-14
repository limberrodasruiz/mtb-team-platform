-- ============================================================
-- MTB Team Platform — seed opcional
-- ============================================================
-- Este archivo NO publica datos ficticios: no crea corredores,
-- carreras, resultados, noticias, auspiciadores ni contactos de
-- ejemplo. La información real se carga desde el panel admin.
--
-- Ejecutar DESPUÉS de:
--   1. supabase/schema.sql
--   2. supabase/migrations/20261021100000_core_hardening.sql
--   3. supabase/migrations/20261021101000_finance_and_views.sql
--   4. supabase/migrations/20261021102000_rls_and_grants.sql
--   5. supabase/migrations/20261021103000_hardening_followups.sql
--
-- Es idempotente: se puede volver a ejecutar sin duplicar filas.
-- ============================================================

-- Categorías base. Ajústalas a la estructura real del equipo desde
-- el panel (Admin → Categorías) antes de cargar corredores.
insert into public.categories (name, slug, description, sort_order)
values
  ('Élite', 'elite', 'Categoría principal competitiva.', 10),
  ('Sub-23', 'sub-23', 'Corredores menores de 23 años.', 20),
  ('Junior', 'junior', 'Categoría juvenil.', 30),
  ('Máster A', 'master-a', 'Categoría máster A.', 40),
  ('Máster B', 'master-b', 'Categoría máster B.', 50),
  ('Principiantes', 'principiantes', 'Categoría de iniciación.', 60)
on conflict (slug) do nothing;

-- Puntuación por posición para el ranking interno.
-- El ranking se calcula a partir de los resultados; estos valores
-- solo definen cuántos puntos otorga cada posición.
insert into public.scoring_rules (position, points)
values
  (1, 10),
  (2, 8),
  (3, 6),
  (4, 5),
  (5, 4),
  (6, 3),
  (7, 2),
  (8, 1)
on conflict (position) do nothing;

-- La fila de site_settings la crea la migración core con la
-- identidad institucional. Completa logo, contacto, redes,
-- historia y colores desde Admin → Configuración.
