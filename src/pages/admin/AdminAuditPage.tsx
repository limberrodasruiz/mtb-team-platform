import { useMemo, useState } from 'react';
import {
  Activity,
  Download,
  Eye,
  FileClock,
  Filter,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getAuditLogs } from '../../services/audit';
import { getProfiles } from '../../services/users';
import type { AuditLog, Profile } from '../../types';
import { AUDIT_ACTIONS, AUDIT_MODULES, ROLE_LABELS } from '../../constants';
import { formatDateTime, todayISO } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { SearchInput } from '../../components/ui/SearchInput';
import { StatCard } from '../../components/ui/StatCard';

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creación',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
  LOGIN: 'Ingreso',
  LOGOUT: 'Salida',
  REVERSAL: 'Reverso',
  ROLE_CHANGE: 'Cambio de rol',
  PAYMENT: 'Pago',
  OPENING_BALANCE: 'Saldo inicial',
  GENERATE: 'Generación',
  ANNUL: 'Anulación',
};

const ACTION_TONES: Record<string, BadgeTone> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'brand',
  LOGOUT: 'neutral',
  REVERSAL: 'warning',
  ROLE_CHANGE: 'purple',
  PAYMENT: 'success',
  OPENING_BALANCE: 'brand',
  GENERATE: 'info',
  ANNUL: 'danger',
};

const MODULE_LABELS: Record<string, string> = {
  profiles: 'Usuarios',
  cyclists: 'Corredores',
  categories: 'Categorías',
  races: 'Carreras',
  race_results: 'Resultados',
  achievements: 'Logros',
  members: 'Miembros',
  membership_payments: 'Membresías',
  membership_payment_entries: 'Pagos de membresía',
  contributions: 'Aportes',
  cash_movements: 'Caja',
  expenses: 'Gastos',
  race_budgets: 'Presupuestos',
  sponsors: 'Auspiciadores',
  news: 'Noticias',
  banners: 'Banners',
  gallery: 'Galería',
  site_settings: 'Configuración',
};

const FINANCIAL_MODULES = new Set([
  'membership_payments',
  'membership_payment_entries',
  'contributions',
  'cash_movements',
  'expenses',
  'race_budgets',
]);

function describe(entry: AuditLog): string {
  const module = MODULE_LABELS[entry.module ?? ''] ?? entry.module ?? 'Sistema';
  return `${ACTION_LABELS[entry.action] ?? entry.action} · ${module}`;
}

function pretty(value: Record<string, unknown> | null): string {
  if (!value || Object.keys(value).length === 0) return 'Sin datos';
  return JSON.stringify(value, null, 2);
}

export function AdminAuditPage() {
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [detail, setDetail] = useState<AuditLog | null>(null);

  const { data, loading, error, reload } = useAsync<AuditLog[]>(
    () =>
      getAuditLogs(
        {
          module: moduleFilter || undefined,
          action: actionFilter || undefined,
          search: debouncedSearch || undefined,
        },
        300,
      ),
    [moduleFilter, actionFilter, debouncedSearch],
  );

  const { data: profileData } = useAsync<Profile[]>(() => getProfiles(), []);
  const profiles = useMemo(() => profileData ?? [], [profileData]);
  const logs = useMemo(() => data ?? [], [data]);

  const profileMap = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const item of profiles) map.set(item.id, item);
    return map;
  }, [profiles]);

  const rows = useMemo(
    () =>
      logs.map((entry) => {
        const owner = entry.user_id ? profileMap.get(entry.user_id) : null;
        return {
          ...entry,
          user_name: owner?.display_name ?? null,
          user_email: owner?.email ?? null,
        };
      }),
    [logs, profileMap],
  );

  const stats = useMemo(() => {
    const today = todayISO();
    return {
      total: rows.length,
      roleChanges: rows.filter((row) => row.action === 'ROLE_CHANGE').length,
      financial: rows.filter((row) => FINANCIAL_MODULES.has(row.module ?? '')).length,
      today: rows.filter((row) => row.created_at.slice(0, 10) === today).length,
    };
  }, [rows]);

  function exportLogs() {
    downloadCsv(
      `auditoria-${todayISO()}`,
      ['Fecha', 'Usuario', 'Correo', 'Acción', 'Módulo', 'Registro', 'IP', 'Datos anteriores', 'Datos nuevos'],
      rows.map((row) => [
        row.created_at,
        row.user_name || row.user_id || 'Sistema',
        row.user_email,
        row.action,
        row.module,
        row.record_id,
        row.ip,
        row.old_data ? JSON.stringify(row.old_data) : '',
        row.new_data ? JSON.stringify(row.new_data) : '',
      ]),
    );
  }

  function clearFilters() {
    setModuleFilter('');
    setActionFilter('');
    setSearch('');
  }

  const hasFilters = Boolean(moduleFilter || actionFilter || search);

  return (
    <>
      <PageHeader
        eyebrow="Sistema"
        title="Auditoría"
        description="Registro append-only de las operaciones del panel. Consulta quién cambió qué y cuándo."
        actions={
          <Button
            variant="outline"
            onClick={exportLogs}
            disabled={rows.length === 0}
            startIcon={<Download className="h-4 w-4" />}
          >
            Exportar CSV
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Registros cargados"
          value={stats.total}
          hint="Últimos 300 eventos"
          icon={FileClock}
          tone="brand"
        />
        <StatCard
          label="Eventos de hoy"
          value={stats.today}
          hint="Según la fecha de Bolivia"
          icon={Activity}
          tone="emerald"
        />
        <StatCard
          label="Cambios de rol"
          value={stats.roleChanges}
          hint="En la ventana consultada"
          icon={UserCog}
          tone="violet"
        />
        <StatCard
          label="Eventos financieros"
          value={stats.financial}
          hint="Caja, aportes, gastos y membresías"
          icon={ShieldCheck}
          tone="sky"
        />
      </div>

      <Card>
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por usuario, módulo, registro o contenido…"
              className="w-full xl:max-w-md"
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={moduleFilter}
                onChange={(event) => setModuleFilter(event.target.value)}
                className="h-10 max-w-[230px] rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
                aria-label="Filtrar por módulo"
              >
                <option value="">Todos los módulos</option>
                {AUDIT_MODULES.map((module) => (
                  <option key={module} value={module}>
                    {MODULE_LABELS[module] ?? module}
                  </option>
                ))}
              </select>
              <select
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
                aria-label="Filtrar por acción"
              >
                <option value="">Todas las acciones</option>
                {AUDIT_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {ACTION_LABELS[action] ?? action}
                  </option>
                ))}
              </select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  startIcon={<Filter className="h-4 w-4" />}
                >
                  Limpiar
                </Button>
              )}
            </div>
            <span className="text-xs text-slate-500 xl:ml-auto">
              {loading ? 'Cargando…' : `${rows.length} eventos`}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            La búsqueda se aplica sobre los 300 registros más recientes que coinciden con los
            filtros de módulo y acción.
          </p>
        </div>

        {loading ? (
          <div className="p-5">
            <LoadingBlock message="Cargando auditoría…" />
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={FileClock}
              title={hasFilters ? 'Sin eventos para estos filtros' : 'Sin registros de auditoría'}
              description={
                hasFilters
                  ? 'Prueba con otro módulo, acción o término de búsqueda.'
                  : 'Las operaciones del panel aparecerán aquí automáticamente.'
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table responsive-table w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-left">Evento</th>
                  <th className="px-4 py-3 text-left">Registro</th>
                  <th className="px-4 py-3 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600" data-label="Fecha">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-4 py-3" data-label="Usuario">
                      <p className="font-medium text-slate-900">
                        {row.user_name || (row.user_id ? 'Perfil no disponible' : 'Sistema')}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {row.user_email || row.user_id || 'Proceso automático'}
                      </p>
                    </td>
                    <td className="px-4 py-3" data-label="Evento">
                      <Badge tone={ACTION_TONES[row.action] ?? 'neutral'}>
                        {ACTION_LABELS[row.action] ?? row.action}
                      </Badge>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {MODULE_LABELS[row.module ?? ''] ?? row.module ?? 'Sistema'}
                      </p>
                    </td>
                    <td className="px-4 py-3" data-label="Registro">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                        {row.record_id ? row.record_id.slice(0, 8) : '—'}
                      </code>
                    </td>
                    <td className="px-4 py-3" data-label="Detalle">
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDetail(row)}
                          startIcon={<Eye className="h-3.5 w-3.5" />}
                        >
                          Ver
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Detalle del evento"
        description={detail ? describe(detail) : undefined}
        size="lg"
        footer={<Button onClick={() => setDetail(null)}>Cerrar</Button>}
      >
        {detail && (
          <div className="space-y-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Fecha
                </dt>
                <dd className="mt-0.5 font-medium text-slate-800">
                  {formatDateTime(detail.created_at)}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Usuario
                </dt>
                <dd className="mt-0.5 truncate font-medium text-slate-800">
                  {detail.user_name || detail.user_id || 'Sistema'}
                </dd>
                <dd className="truncate text-[11px] text-slate-500">{detail.user_email}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Acción
                </dt>
                <dd className="mt-1">
                  <Badge tone={ACTION_TONES[detail.action] ?? 'neutral'}>
                    {ACTION_LABELS[detail.action] ?? detail.action}
                  </Badge>
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Módulo / registro
                </dt>
                <dd className="mt-0.5 font-medium text-slate-800">
                  {MODULE_LABELS[detail.module ?? ''] ?? detail.module ?? 'Sistema'}
                </dd>
                <dd className="break-all font-mono text-[10px] text-slate-500">
                  {detail.record_id || 'Sin identificador'}
                </dd>
              </div>
              {detail.ip && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:col-span-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    IP
                  </dt>
                  <dd className="mt-0.5 font-mono text-xs text-slate-700">{detail.ip}</dd>
                </div>
              )}
            </dl>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Datos anteriores
              </p>
              <pre className="max-h-52 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-200">
                {pretty(detail.old_data)}
              </pre>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Datos nuevos
              </p>
              <pre className="max-h-52 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-200">
                {pretty(detail.new_data)}
              </pre>
            </div>

            <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-500">
              Los registros de auditoría no se pueden editar ni eliminar desde el panel. Cada
              perfil conserva su rol actual ({ROLE_LABELS[detail.user_id ? profileMap.get(detail.user_id)?.role ?? 'CONSULTA' : 'CONSULTA']}),
              por lo que un cambio de rol posterior no altera el evento histórico.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
