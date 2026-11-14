import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Flag,
  Newspaper,
  Plus,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../providers/AuthProvider';
import { useSiteSettings } from '../../providers/SiteSettingsProvider';
import { getDashboardData } from '../../services/dashboard';
import { canEditContent, canWriteFinance } from '../../lib/permissions';
import type { DashboardData } from '../../types';
import {
  formatDate,
  formatLongDate,
  formatMoneyBs,
  formatNumber,
  todayISO,
} from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { buttonStyles } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';

const PAGE_DATE = new Date();

export function DashboardPage() {
  const { profile } = useAuth();
  const { settings } = useSiteSettings();
  const role = profile?.role ?? 'CONSULTA';
  const finance = role === 'ADMIN' || role === 'DIRECTIVA' || role === 'TESORERIA';
  const financeWriter = canWriteFinance(role);
  const contentEditor = canEditContent(role);

  const { data, loading, error, reload } = useAsync<DashboardData | null>(
    () => (profile ? getDashboardData(role) : Promise.resolve(null)),
    [profile?.id, role],
  );

  if (!profile) return null;

  const firstName = (profile.display_name || profile.email || 'equipo').split('@')[0].split(' ')[0];

  return (
    <>
      <PageHeader
        eyebrow="Resumen general"
        title={`Hola, ${firstName}`}
        description={`${formatLongDate(PAGE_DATE)} · ${settings.team_name}`}
        actions={
          <>
            {contentEditor && (
              <Link to="/admin/noticias" className={buttonStyles('outline', 'sm')}>
                <Newspaper className="h-4 w-4" aria-hidden />
                Nueva noticia
              </Link>
            )}
            {financeWriter && (
              <Link to="/admin/finanzas" className={buttonStyles('primary', 'sm')}>
                <Plus className="h-4 w-4" aria-hidden />
                Registrar movimiento
              </Link>
            )}
          </>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorState message={error} onRetry={reload} />
        </div>
      )}

      {loading ? (
        <LoadingBlock message="Cargando resumen del equipo…" />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {finance ? (
              <>
                <StatCard
                  label="Saldo de caja"
                  value={formatMoneyBs(data.balance)}
                  hint={`Incluye ${formatMoneyBs(data.openingBalance)} de saldo inicial`}
                  icon={Wallet}
                  tone={data.balance < 0 ? 'rose' : 'emerald'}
                  to="/admin/finanzas"
                />
                <StatCard
                  label="Ingresos del mes"
                  value={formatMoneyBs(data.incomeMonth)}
                  hint="Operativos, sin saldo inicial"
                  icon={TrendingUp}
                  tone="sky"
                  to="/admin/finanzas"
                />
                <StatCard
                  label="Egresos del mes"
                  value={formatMoneyBs(data.expensesMonth)}
                  hint={`${data.pendingMemberships} membresías pendientes`}
                  icon={TrendingDown}
                  tone="amber"
                  to="/admin/finanzas"
                />
                <StatCard
                  label="Deuda por cobrar"
                  value={formatMoneyBs(data.overdueAmount)}
                  hint={`${data.debtors} socios con saldo vencido`}
                  icon={AlertTriangle}
                  tone={data.overdueAmount > 0 ? 'rose' : 'emerald'}
                  to="/admin/membresias"
                />
              </>
            ) : (
              <>
                <StatCard
                  label="Corredores activos"
                  value={formatNumber(data.stats.activeCyclists)}
                  hint="Plantilla publicada"
                  icon={Users}
                  tone="brand"
                  to="/admin/corredores"
                />
                <StatCard
                  label="Carreras registradas"
                  value={formatNumber(data.stats.races)}
                  hint={`${data.upcoming.length} próximas`}
                  icon={Flag}
                  tone="sky"
                  to="/admin/carreras"
                />
                <StatCard
                  label="Podios del equipo"
                  value={formatNumber(data.stats.podiums)}
                  hint={`${data.stats.wins} victorias`}
                  icon={Trophy}
                  tone="amber"
                  to="/admin/resultados"
                />
                <StatCard
                  label="Noticias publicadas"
                  value={formatNumber(data.stats.news)}
                  hint="Contenido público"
                  icon={Newspaper}
                  tone="violet"
                  to="/admin/noticias"
                />
              </>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Miembros del equipo"
              value={finance ? formatNumber(data.members) : '—'}
              hint={finance ? `${data.activeMembers} activos` : 'Acceso restringido'}
              icon={Users}
              tone="brand"
              to={finance ? '/admin/miembros' : undefined}
            />
            <StatCard
              label="Membresías pendientes"
              value={finance ? formatNumber(data.pendingMemberships) : '—'}
              hint={finance ? `${formatMoneyBs(data.pendingAmount)} del mes` : 'Acceso restringido'}
              icon={CircleDollarSign}
              tone="amber"
              to={finance ? '/admin/membresias' : undefined}
            />
            <StatCard
              label="Próximas carreras"
              value={formatNumber(data.upcoming.length)}
              hint={data.upcoming[0]?.name || 'Sin eventos próximos'}
              icon={CalendarDays}
              tone="sky"
              to="/admin/carreras"
            />
            <StatCard
              label="Resultados cargados"
              value={formatNumber(data.latestResults.length)}
              hint="Últimos registros"
              icon={Trophy}
              tone="emerald"
              to="/admin/resultados"
            />
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Próximas carreras"
                description="Calendario inmediato del equipo"
                actions={
                  <Link to="/admin/carreras" className="text-[11px] font-semibold text-[var(--brand-dark)]">
                    Ver todas
                  </Link>
                }
              />
              {data.upcoming.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {data.upcoming.map((race) => (
                    <li key={race.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-dark)]">
                        <span className="font-display text-base font-bold leading-none">
                          {race.date.slice(8, 10)}
                        </span>
                        <span className="text-[8px] font-bold uppercase">
                          {formatDate(race.date).slice(3, 5)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{race.name}</p>
                        <p className="truncate text-[11px] text-slate-500">
                          {[race.place, race.city].filter(Boolean).join(' · ') || formatDate(race.date)}
                        </p>
                      </div>
                      <StatusBadge status={race.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-5">
                  <EmptyState
                    compact
                    icon={CalendarDays}
                    title="Sin carreras próximas"
                    description="Agrega la siguiente competencia desde el módulo de carreras."
                  />
                </div>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Últimos resultados"
                description="Registros recientes del equipo"
                actions={
                  <Link to="/admin/resultados" className="text-[11px] font-semibold text-[var(--brand-dark)]">
                    Ver todos
                  </Link>
                }
              />
              {data.latestResults.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {data.latestResults.map((result) => (
                    <li key={result.id} className="flex items-center gap-3 px-5 py-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-display text-sm font-bold text-slate-700">
                        {result.result_status === 'FINISHED' ? result.position : '—'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {result.cyclist_name || 'Corredor'}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {result.race_name || 'Carrera'} · {result.category_name || 'General'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-slate-900">
                          {result.points} pts
                        </p>
                        <StatusBadge status={result.result_status} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-5">
                  <EmptyState
                    compact
                    icon={Trophy}
                    title="Sin resultados recientes"
                    description="Carga los resultados de la última carrera."
                  />
                </div>
              )}
            </Card>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader
                title="Últimas noticias"
                description="Publicaciones del sitio"
                actions={
                  <Link to="/admin/noticias" className="text-[11px] font-semibold text-[var(--brand-dark)]">
                    Gestionar
                  </Link>
                }
              />
              {data.latestNews.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {data.latestNews.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                      <Newspaper className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                        <p className="text-[11px] text-slate-500">
                          {formatDate(item.published_at || item.created_at)}
                          {item.category ? ` · ${item.category}` : ''}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-5">
                  <EmptyState
                    compact
                    icon={Newspaper}
                    title="Sin noticias publicadas"
                    description="Crea la primera publicación del equipo."
                    action={
                      contentEditor ? (
                        <Link to="/admin/noticias" className={buttonStyles('primary', 'sm')}>
                          Crear noticia
                        </Link>
                      ) : undefined
                    }
                  />
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Accesos rápidos" description="Según tu rol" />
              <CardBody className="grid gap-2">
                {[
                  ...(financeWriter
                    ? [
                        { label: 'Registrar aporte', to: '/admin/aportes' },
                        { label: 'Cargar gasto', to: '/admin/finanzas' },
                        { label: 'Generar membresías', to: '/admin/membresias' },
                      ]
                    : []),
                  ...(contentEditor
                    ? [
                        { label: 'Publicar noticia', to: '/admin/noticias' },
                        { label: 'Subir fotos', to: '/admin/galeria' },
                      ]
                    : []),
                  { label: 'Cargar resultado', to: '/admin/resultados' },
                  { label: 'Ver auditoría', to: role === 'ADMIN' ? '/admin/auditoria' : '/admin' },
                ]
                  .filter((item) => item.to !== '/admin' || role === 'ADMIN')
                  .map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[var(--brand-mid)] hover:bg-[var(--brand-soft)]/50 hover:text-[var(--brand-dark)]"
                    >
                      {item.label}
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  ))}
              </CardBody>
              {finance && !financeWriter && (
                <div className="px-5 pb-5">
                  <Badge tone="info" dot>
                    Acceso financiero de solo lectura
                  </Badge>
                </div>
              )}
            </Card>
          </div>

          {finance && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Estado del período
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {settings.team_name} · datos al {formatDate(todayISO())}
                  </p>
                </div>
                <Link to="/admin/reportes" className={buttonStyles('outline', 'sm')}>
                  Abrir reportes
                </Link>
              </div>
            </div>
          )}
        </>
      ) : null}
    </>
  );
}
