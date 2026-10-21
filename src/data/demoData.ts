// Datos de demostración para correr la app en local SIN Supabase.
// Se usan automáticamente cuando VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// no están configuradas. Los cambios viven solo en memoria (se pierden al recargar).
// Son los mismos datos del seed (supabase/seed.sql) marcados como DEMO.

export interface DemoCredential {
  id: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'DIRECTIVA' | 'TESORERIA' | 'EDITOR' | 'CONSULTA';
  full_name: string;
}

export const DEMO_CREDENTIALS: DemoCredential[] = [
  { id: 'demo-admin-id', email: 'admin@equipo.bo', password: 'admin123', role: 'ADMIN', full_name: 'Admin Demo' },
  { id: 'demo-editor-id', email: 'editor@equipo.bo', password: 'editor123', role: 'EDITOR', full_name: 'Editor Demo' },
  { id: 'demo-tesorero-id', email: 'tesorero@equipo.bo', password: 'tesorero123', role: 'TESORERIA', full_name: 'Tesorero Demo' },
  { id: 'demo-consulta-id', email: 'consulta@equipo.bo', password: 'consulta123', role: 'CONSULTA', full_name: 'Consulta Demo' },
];

const now = new Date().toISOString();

function row(id: string, extra: Record<string, unknown>) {
  return { id, created_at: now, updated_at: now, ...extra };
}

export function buildDemoStore(): Record<string, Array<Record<string, unknown>>> {
  const categories = [
    row('cat-elite', { name: 'Élite', slug: 'elite', description: 'Categoría Élite (demo)' }),
    row('cat-sub23', { name: 'Sub-23', slug: 'sub-23', description: 'Sub-23 (demo)' }),
    row('cat-junior', { name: 'Junior', slug: 'junior', description: 'Junior (demo)' }),
    row('cat-master-a', { name: 'Máster A', slug: 'master-a', description: 'Máster A (demo)' }),
    row('cat-master-b', { name: 'Máster B', slug: 'master-b', description: 'Máster B (demo)' }),
    row('cat-princ', { name: 'Principiantes', slug: 'principiantes', description: 'Principiantes (demo)' }),
  ];

  const cyclists = [
    row('cyc-german', { full_name: 'Germán Amaya', slug: 'german-amaya', nickname: 'El Tiburón', birth_date: '2005-03-14', category_id: 'cat-elite', photo_url: null, bio: 'Corredor Élite del equipo, especialista en XC. (demo)', is_active: true, active: true, is_featured: true }),
    row('cyc-carlos', { full_name: 'Carlos Pérez', slug: 'carlos-perez', nickname: null, birth_date: '2003-07-02', category_id: 'cat-elite', photo_url: null, bio: 'Corredor Élite. (demo)', is_active: true, active: true, is_featured: true }),
    row('cyc-luis', { full_name: 'Luis Rodríguez', slug: 'luis-rodriguez', nickname: null, birth_date: '1990-11-25', category_id: 'cat-master-a', photo_url: null, bio: 'Máster A. (demo)', is_active: true, active: true, is_featured: false }),
    row('cyc-miguel', { full_name: 'Miguel Rojas', slug: 'miguel-rojas', nickname: null, birth_date: '2008-01-30', category_id: 'cat-junior', photo_url: null, bio: 'Junior. (demo)', is_active: true, active: true, is_featured: false }),
  ];

  const races = [
    row('race-dept', { name: 'Campeonato Departamental MTB', slug: 'campeonato-departamental-mtb', description: 'Fecha departamental en Santa Cruz. (demo)', location: 'Santa Cruz', race_date: '2026-10-27', date: '2026-10-27', status: 'PLANIFICADA', distance_km: 42, image_url: null }),
    row('race-muni', { name: 'Municipal MTB Santa Cruz', slug: 'municipal-mtb-santa-cruz', description: 'Fecha municipal. (demo)', location: 'Santa Cruz', race_date: '2026-09-20', date: '2026-09-20', status: 'FINALIZADA', distance_km: 35, image_url: null }),
    row('race-copa', { name: 'Copa Santa Cruz', slug: 'copa-santa-cruz', description: 'Copa local. (demo)', location: 'Porongo', race_date: '2026-08-15', date: '2026-08-15', status: 'FINALIZADA', distance_km: 30, image_url: null }),
  ];

  const scoring_rules = [10, 8, 6, 5, 4, 3, 2, 1].map((points, i) =>
    row(`score-${i + 1}`, { position: i + 1, points }),
  );

  const race_results = [
    row('res-1', { race_id: 'race-muni', cyclist_id: 'cyc-german', category_id: 'cat-elite', position: 1, points: 10, time_seconds: 5400 }),
    row('res-2', { race_id: 'race-muni', cyclist_id: 'cyc-carlos', category_id: 'cat-elite', position: 2, points: 8, time_seconds: 5520 }),
    row('res-3', { race_id: 'race-muni', cyclist_id: 'cyc-luis', category_id: 'cat-master-a', position: 3, points: 6, time_seconds: 5700 }),
    row('res-4', { race_id: 'race-copa', cyclist_id: 'cyc-german', category_id: 'cat-elite', position: 2, points: 8, time_seconds: 4800 }),
    row('res-5', { race_id: 'race-copa', cyclist_id: 'cyc-miguel', category_id: 'cat-junior', position: 1, points: 10, time_seconds: 4950 }),
    row('res-6', { race_id: 'race-copa', cyclist_id: 'cyc-carlos', category_id: 'cat-elite', position: 4, points: 5, time_seconds: 5010 }),
  ];

  const race_registrations = [
    row('reg-1', { race_id: 'race-dept', cyclist_id: 'cyc-german', status: 'INSCRITO' }),
    row('reg-2', { race_id: 'race-dept', cyclist_id: 'cyc-carlos', status: 'INSCRITO' }),
    row('reg-3', { race_id: 'race-dept', cyclist_id: 'cyc-luis', status: 'INSCRITO' }),
    row('reg-4', { race_id: 'race-dept', cyclist_id: 'cyc-miguel', status: 'INSCRITO' }),
  ];

  const achievements = [
    row('ach-1', { cyclist_id: 'cyc-german', title: 'Campeón Municipal MTB 2026', description: 'Primer lugar Élite. (demo)', achieved_at: '2026-09-20', icon: '🏆' }),
    row('ach-2', { cyclist_id: 'cyc-miguel', title: 'Ganador Copa Santa Cruz Junior', description: 'Primer lugar Junior. (demo)', achieved_at: '2026-08-15', icon: '🥇' }),
    row('ach-3', { cyclist_id: 'cyc-carlos', title: 'Subcampeón Municipal MTB 2026', description: 'Segundo lugar Élite. (demo)', achieved_at: '2026-09-20', icon: '🥈' }),
  ];

  const members = [
    row('mem-german', { full_name: 'Germán Amaya', member_type: 'CORREDOR', status: 'ACTIVO', phone: null, email: null, join_date: '2024-01-15', notes: 'Demo' }),
    row('mem-carlos', { full_name: 'Carlos Pérez', member_type: 'CORREDOR', status: 'ACTIVO', phone: null, email: null, join_date: '2024-02-01', notes: 'Demo' }),
    row('mem-dir', { full_name: 'Dirigente Demo', member_type: 'DIRIGENTE', status: 'ACTIVO', phone: null, email: null, join_date: '2023-05-10', notes: 'Demo' }),
  ];

  const membership_payments = [
    row('pay-1', { member_id: 'mem-german', month_key: '2026-08', amount: 50, status: 'PAGADO', paid_at: '2026-08-05', due_date: '2026-08-31', notes: null }),
    row('pay-2', { member_id: 'mem-german', month_key: '2026-09', amount: 50, status: 'PAGADO', paid_at: '2026-09-04', due_date: '2026-09-30', notes: null }),
    row('pay-3', { member_id: 'mem-german', month_key: '2026-10', amount: 50, status: 'PENDIENTE', paid_at: null, due_date: '2026-10-31', notes: null }),
    row('pay-4', { member_id: 'mem-carlos', month_key: '2026-10', amount: 50, status: 'PENDIENTE', paid_at: null, due_date: '2026-10-31', notes: null }),
  ];

  const contributions = [
    row('con-1', { member_id: 'mem-carlos', title: 'Apoyo Campeonato Departamental', amount: 200, contribution_date: '2026-10-02', notes: 'Demo' }),
  ];

  const cash_movements = [
    row('cash-1', { concept: 'Membresías septiembre', type: 'INGRESO', amount: 400, movement_date: '2026-09-05', date: '2026-09-05', category: 'Membresías', related_race_id: null, race_id: null, related_member_id: null, notes: 'Demo' }),
    row('cash-2', { concept: 'Aporte extraordinario', type: 'INGRESO', amount: 200, movement_date: '2026-10-02', date: '2026-10-02', category: 'Aportes', related_race_id: null, race_id: null, related_member_id: 'mem-carlos', notes: 'Demo' }),
    row('cash-3', { concept: 'Inscripciones Copa Santa Cruz', type: 'EGRESO', amount: 300, movement_date: '2026-08-14', date: '2026-08-14', category: 'Inscripciones', related_race_id: 'race-copa', race_id: 'race-copa', related_member_id: null, notes: 'Demo' }),
    row('cash-4', { concept: 'Transporte Municipal', type: 'EGRESO', amount: 250, movement_date: '2026-09-19', date: '2026-09-19', category: 'Transporte', related_race_id: 'race-muni', race_id: 'race-muni', related_member_id: null, notes: 'Demo' }),
  ];

  const expenses = [
    row('exp-1', { race_id: 'race-copa', title: 'Inscripciones Copa', description: 'Demo', amount: 300, expense_date: '2026-08-14', date: '2026-08-14', category: 'Inscripciones', receipt_url: null }),
    row('exp-2', { race_id: 'race-muni', title: 'Transporte Municipal', description: 'Demo', amount: 250, expense_date: '2026-09-19', date: '2026-09-19', category: 'Transporte', receipt_url: null }),
  ];

  const race_budgets = [
    row('bud-1', { race_id: 'race-dept', estimated_cost: 1600, actual_cost: 0, estimated_income: 500, actual_income: 200, notes: 'Demo' }),
  ];

  const sponsors = [
    row('spo-1', { name: 'Trinx Bolivia', logo_url: null, website_url: 'https://example.com', is_active: true, display_order: 1 }),
    row('spo-2', { name: 'Bycle Sharks', logo_url: null, website_url: 'https://example.com', is_active: true, display_order: 2 }),
  ];

  const news = [
    row('news-1', { title: 'Victoria en el Municipal MTB', slug: 'victoria-municipal-mtb', excerpt: 'Germán Amaya ganó en Élite. (demo)', content: 'Crónica completa de la victoria del equipo en el Municipal MTB de Santa Cruz. (demo)', cover_image_url: null, is_published: true, status: 'PUBLICADO', published_at: '2026-09-21', author_id: null }),
    row('news-2', { title: 'Convocatoria Campeonato Departamental', slug: 'convocatoria-departamental', excerpt: '15 corredores inscritos. (demo)', content: 'Detalles de la convocatoria al Campeonato Departamental MTB del 27 de octubre. (demo)', cover_image_url: null, is_published: true, status: 'PUBLICADO', published_at: '2026-10-01', author_id: null }),
  ];

  const banners = [
    row('ban-1', { title: 'Próxima carrera: Departamental MTB', subtitle: '27 de octubre · Santa Cruz', image_url: '', link_url: '/carreras/campeonato-departamental-mtb', is_active: true, start_date: null, end_date: null, display_order: 1 }),
  ];

  const gallery = [
    row('gal-1', { title: 'Entrenamiento en Porongo', image_url: '', race_id: null, published_at: '2026-09-10' }),
    row('gal-2', { title: 'Podio Municipal MTB', image_url: '', race_id: 'race-muni', published_at: '2026-09-20' }),
    row('gal-3', { title: 'Copa Santa Cruz', image_url: '', race_id: 'race-copa', published_at: '2026-08-15' }),
  ];

  const profiles = DEMO_CREDENTIALS.map((c) =>
    row(c.id, { email: c.email, full_name: c.full_name, role: c.role }),
  );

  const audit_logs = [
    row('aud-1', { user_id: 'demo-admin-id', action: 'LOGIN', table_name: null, record_id: null, details: { demo: true } }),
  ];

  const site_settings = [
    { id: 'default', team_name: 'TRINX BOLIVIA - BYCLE SHARKS', slogan: 'Pasión. Competencia. Comunidad.', logo_url: null, primary_color: '#0284c7', contact_email: 'contacto@equipo.bo', contact_phone: '+591 70000000', address: 'Santa Cruz, Bolivia', social_facebook: null, social_instagram: null, social_tiktok: null, about_text: 'Equipo de ciclismo MTB de Santa Cruz, Bolivia. (demo)', updated_at: now },
  ];

  return {
    categories, cyclists, races, race_registrations, scoring_rules,
    race_results, achievements, members, membership_payments,
    contributions, cash_movements, expenses, race_budgets, sponsors,
    news, banners, gallery, profiles, audit_logs, site_settings,
  };
}
