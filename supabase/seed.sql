-- ============================================================
-- MTB Team Platform — seed.sql
-- DEMO - eliminar antes de producción.
-- Ejecutar DESPUÉS de schema.sql + rls.sql + storage.sql.
-- Todos los IDs se generan con gen_random_uuid().
-- ============================================================

-- ---------- Categorías (6) ----------
insert into public.categories (id, name, slug, description) values
  (gen_random_uuid(), 'Élite', 'elite', 'DEMO - Categoría principal competitiva.'),
  (gen_random_uuid(), 'Sub-23', 'sub-23', 'DEMO - Menores de 23 años.'),
  (gen_random_uuid(), 'Junior', 'junior', 'DEMO - Juveniles.'),
  (gen_random_uuid(), 'Máster A', 'master-a', 'DEMO - Máster A.'),
  (gen_random_uuid(), 'Máster B', 'master-b', 'DEMO - Máster B.'),
  (gen_random_uuid(), 'Principiantes', 'principiantes', 'DEMO - Iniciación.')
on conflict (slug) do nothing;

-- ---------- Ciclistas (4) ----------
insert into public.cyclists (id, full_name, slug, birth_date, category_id, specialty, number, photo_path, photo_url, bio, team_since, featured, active) values
  (gen_random_uuid(), 'Germán Amaya', 'german-amaya', '1998-04-12',
    (select id from public.categories where slug = 'elite'),
    'XC Olímpico', 1, null, null, 'DEMO - Capitán y referente del equipo.', 2020, true, true),
  (gen_random_uuid(), 'Carlos Pérez', 'carlos-perez', '2001-07-03',
    (select id from public.categories where slug = 'sub-23'),
    'Maratón', 7, null, null, 'DEMO - Joven promesa sub-23.', 2023, false, true),
  (gen_random_uuid(), 'Luis Rodríguez', 'luis-rodriguez', '1995-11-20',
    (select id from public.categories where slug = 'master-a'),
    'Descenso', 13, null, null, 'DEMO - Experiencia máster.', 2021, false, true),
  (gen_random_uuid(), 'Miguel Rojas', 'miguel-rojas', '2005-02-15',
    (select id from public.categories where slug = 'junior'),
    'XC', 21, null, null, 'DEMO - Talento junior.', 2024, false, true)
on conflict (slug) do nothing;

-- ---------- Scoring 1-8: 10,8,6,5,4,3,2,1 ----------
insert into public.scoring_rules (id, position, points) values
  (gen_random_uuid(), 1, 10),
  (gen_random_uuid(), 2, 8),
  (gen_random_uuid(), 3, 6),
  (gen_random_uuid(), 4, 5),
  (gen_random_uuid(), 5, 4),
  (gen_random_uuid(), 6, 3),
  (gen_random_uuid(), 7, 2),
  (gen_random_uuid(), 8, 1)
on conflict (position) do nothing;

-- ---------- Carreras (2) ----------
insert into public.races (id, name, slug, date, place, city, department, organizer, race_type, description, status) values
  (gen_random_uuid(), 'Campeonato Departamental MTB', 'campeonato-departamental-mtb-2026', '2026-10-27',
    'Circuito El Mirador', 'Santa Cruz', 'Santa Cruz', 'Asociación Departamental', 'XC',
    'DEMO - Fecha principal del calendario.', 'FINALIZADA'),
  (gen_random_uuid(), 'Municipal MTB', 'municipal-mtb-2026', '2026-11-15',
    'Parque Municipal', 'Santa Cruz', 'Santa Cruz', 'Gobierno Municipal', 'XC',
    'DEMO - Carrera municipal abierta.', 'ABIERTA')
on conflict (slug) do nothing;

-- ---------- Inscripciones ----------
insert into public.race_registrations (id, race_id, cyclist_id)
select gen_random_uuid(), r.id, c.id
from public.races r cross join public.cyclists c
where r.slug = 'campeonato-departamental-mtb-2026'
  and c.slug in ('german-amaya','carlos-perez','luis-rodriguez','miguel-rojas')
on conflict (race_id, cyclist_id) do nothing;

insert into public.race_registrations (id, race_id, cyclist_id)
select gen_random_uuid(), r.id, c.id
from public.races r cross join public.cyclists c
where r.slug = 'municipal-mtb-2026'
  and c.slug in ('german-amaya','carlos-perez')
on conflict (race_id, cyclist_id) do nothing;

-- ---------- Resultados con puntos (según scoring) ----------
-- Departamental: Germán 1°(10), Carlos 2°(8), Luis 3°(6), Miguel 4°(5)
insert into public.race_results (id, race_id, cyclist_id, category_id, position, time_text, points, notes)
select gen_random_uuid(),
  (select id from public.races where slug = 'campeonato-departamental-mtb-2026'),
  (select id from public.cyclists where slug = 'german-amaya'),
  (select id from public.categories where slug = 'elite'),
  1, '1:32:10', 10, 'DEMO'
union all
select gen_random_uuid(),
  (select id from public.races where slug = 'campeonato-departamental-mtb-2026'),
  (select id from public.cyclists where slug = 'carlos-perez'),
  (select id from public.categories where slug = 'sub-23'),
  2, '1:33:45', 8, 'DEMO'
union all
select gen_random_uuid(),
  (select id from public.races where slug = 'campeonato-departamental-mtb-2026'),
  (select id from public.cyclists where slug = 'luis-rodriguez'),
  (select id from public.categories where slug = 'master-a'),
  3, '1:35:02', 6, 'DEMO'
union all
select gen_random_uuid(),
  (select id from public.races where slug = 'campeonato-departamental-mtb-2026'),
  (select id from public.cyclists where slug = 'miguel-rojas'),
  (select id from public.categories where slug = 'junior'),
  4, '1:38:20', 5, 'DEMO';

-- ---------- Logros ----------
insert into public.achievements (id, cyclist_id, title, year, description, highlight) values
  (gen_random_uuid(), (select id from public.cyclists where slug = 'german-amaya'),
    'DEMO - Campeón Departamental', 2026, 'Primer lugar departamental MTB.', true),
  (gen_random_uuid(), (select id from public.cyclists where slug = 'carlos-perez'),
    'DEMO - Subcampeón Sub-23', 2026, 'Segundo lugar sub-23.', false),
  (gen_random_uuid(), (select id from public.cyclists where slug = 'luis-rodriguez'),
    'DEMO - Top 3 Máster', 2025, 'Podio máster temporada pasada.', false);

-- ---------- Sponsors (2) ----------
insert into public.sponsors (id, name, logo_path, logo_url, description, website, socials, support_type, starts_at, active) values
  (gen_random_uuid(), 'DEMO - Trinx Bikes', null, null, 'Bicicletas oficiales demo.',
    'https://example.com', '{"instagram":"https://instagram.com"}', 'Principal', '2026-01-01', true),
  (gen_random_uuid(), 'DEMO - Agua Pura', null, null, 'Hidratación oficial demo.',
    'https://example.com', '{}', 'Logística', '2026-02-01', true);

-- ---------- Noticias (3) ----------
insert into public.news (id, title, slug, cover_path, cover_url, content, published_at, author, category, status) values
  (gen_random_uuid(), 'DEMO - Germán Amaya campeón departamental', 'demo-german-campeon',
    null, null, 'DEMO - Crónica de la victoria en el departamental.', now(), 'Prensa', 'Carreras', 'PUBLICADO'),
  (gen_random_uuid(), 'DEMO - Convocatoria municipal MTB', 'demo-convocatoria-municipal',
    null, null, 'DEMO - Bases e inscripciones de la carrera municipal.', now(), 'Prensa', 'Convocatorias', 'PUBLICADO'),
  (gen_random_uuid(), 'DEMO - Nuevos talentos junior', 'demo-talentos-junior',
    null, null, 'DEMO - Borrador sin publicar.', null, 'Prensa', 'Equipo', 'BORRADOR')
on conflict (slug) do nothing;

-- ---------- Banners (2) ----------
insert into public.banners (id, title, subtitle, image_path, image_url, button_label, url, starts_at, ends_at, active, sort_order) values
  (gen_random_uuid(), 'DEMO - Campeonato Departamental', 'Vamos Sharks',
    null, null, 'Ver resultados', '/carreras', now() - interval '7 days', now() + interval '30 days', true, 1),
  (gen_random_uuid(), 'DEMO - Únete al equipo', 'Pedalea con nosotros',
    null, null, 'Contacto', '/contacto', now() - interval '7 days', now() + interval '60 days', true, 2);

-- ---------- Site settings ----------
insert into public.site_settings
  (id, team_name, slogan, description, history, founded_year, logo_path, email, whatsapp, facebook, instagram, tiktok, youtube, primary_color, secondary_color)
values
  (1, 'TRINX BOLIVIA - BYCLE SHARKS', 'DEMO - Pasión por el MTB',
    'DEMO - Equipo cruceño de mountain bike.', 'DEMO - Historia del equipo desde 2020.',
    2020, null, 'contacto@example.com', '+59170000000',
    'https://facebook.com', 'https://instagram.com', 'https://tiktok.com', 'https://youtube.com',
    '#0ea5e9', '#0f172a')
on conflict (id) do update set
  team_name = excluded.team_name,
  slogan = excluded.slogan,
  description = excluded.description,
  history = excluded.history,
  founded_year = excluded.founded_year,
  email = excluded.email,
  whatsapp = excluded.whatsapp,
  facebook = excluded.facebook,
  instagram = excluded.instagram,
  tiktok = excluded.tiktok,
  youtube = excluded.youtube,
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color,
  updated_at = now();

-- ---------- Miembros (3) + pagos ----------
insert into public.members (id, full_name, ci, phone, email, joined_at, status, member_type, monthly_amount, notes) values
  (gen_random_uuid(), 'Juan Pérez', '1234567', '70011111', 'juan@example.com', '2026-01-10', 'ACTIVO', 'CORREDOR', 50, 'DEMO'),
  (gen_random_uuid(), 'María Gómez', '2345678', '70022222', 'maria@example.com', '2026-02-05', 'ACTIVO', 'COLABORADOR', 50, 'DEMO'),
  (gen_random_uuid(), 'Pedro López', '3456789', '70033333', 'pedro@example.com', '2026-03-01', 'ACTIVO', 'GENERAL', 30, 'DEMO');

insert into public.membership_payments (id, member_id, month, year, expected, paid, paid_at, method, status)
select gen_random_uuid(), m.id, 10, 2026, m.monthly_amount, m.monthly_amount, now(), 'Efectivo', 'PAGADO'
from public.members m where m.full_name = 'Juan Pérez'
union all
select gen_random_uuid(), m.id, 10, 2026, m.monthly_amount, 0, null, null, 'PENDIENTE'
from public.members m where m.full_name = 'María Gómez'
union all
select gen_random_uuid(), m.id, 9, 2026, m.monthly_amount, m.monthly_amount, now(), 'QR', 'PAGADO'
from public.members m where m.full_name = 'Pedro López';
