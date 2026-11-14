import { useMemo, useState } from 'react';
import {
  Download,
  KeyRound,
  Search,
  Shield,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { getProfiles, setUserRole } from '../../services/users';
import type { Profile, Role } from '../../types';
import { ROLE_LABELS, ROLES } from '../../constants';
import { errorMessage } from '../../lib/errors';
import { formatDate, formatDateTime, todayISO } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge, StatusBadge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { SearchInput } from '../../components/ui/SearchInput';
import { StatCard } from '../../components/ui/StatCard';

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: 'Acceso total: configuración, usuarios, auditoría y operaciones financieras.',
  DIRECTIVA: 'Consulta de miembros, membresías y finanzas. No puede modificar movimientos.',
  TESORERIA: 'Gestiona membresías, aportes, caja, gastos y reportes financieros.',
  EDITOR: 'Administra corredores, carreras, resultados, noticias, galería y auspiciadores.',
  CONSULTA: 'Acceso de solo lectura al dashboard, sin módulos de edición ni finanzas.',
};

const ROLE_SCOPE: Record<Role, string> = {
  ADMIN: 'Todos los módulos',
  DIRECTIVA: 'Miembros y finanzas (lectura)',
  TESORERIA: 'Miembros y finanzas',
  EDITOR: 'Deportivo, contenido y puntuación',
  CONSULTA: 'Dashboard y consulta general',
};

export function AdminUsersPage() {
  const { profile } = useAuth();
  const { success } = useToast();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editing, setEditing] = useState<Profile | null>(null);
  const [nextRole, setNextRole] = useState<Role>('CONSULTA');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsync<Profile[]>(() => getProfiles(), []);
  const profiles = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return profiles.filter((item) => {
      if (roleFilter && item.role !== roleFilter) return false;
      if (!term) return true;
      return [item.display_name, item.email, item.role, item.id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [profiles, roleFilter, search]);

  const roleCounts = useMemo(() => {
    const counts = Object.fromEntries(ROLES.map((role) => [role, 0])) as Record<Role, number>;
    for (const item of profiles) counts[item.role] += 1;
    return counts;
  }, [profiles]);

  const financeCount = roleCounts.ADMIN + roleCounts.DIRECTIVA + roleCounts.TESORERIA;

  const isSelf = editing?.id === profile?.id;

  function openRoleChange(item: Profile) {
    setEditing(item);
    setNextRole(item.role);
    setFormError(null);
  }

  async function saveRole() {
    if (!editing) return;
    if (editing.id === profile?.id) {
      setFormError('No puedes cambiar tu propio rol. Pide a otro administrador que lo haga.');
      return;
    }
    if (nextRole === editing.role) {
      setEditing(null);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await setUserRole(editing.id, nextRole);
      success(
        `Rol actualizado: ${editing.display_name || editing.email || 'usuario'} ahora es ${
          ROLE_LABELS[nextRole]
        }.`,
      );
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo cambiar el rol.'));
    } finally {
      setSaving(false);
    }
  }

  function exportUsers() {
    downloadCsv(
      `usuarios-${todayISO()}`,
      ['Nombre', 'Correo', 'Rol', 'Alcance', 'Creado', 'ID'],
      filtered.map((item) => [
        item.display_name,
        item.email,
        item.role,
        ROLE_SCOPE[item.role],
        item.created_at,
        item.id,
      ]),
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Sistema"
        title="Usuarios y roles"
        description="Asigna el rol de cada persona con perfil en el panel. Los usuarios nuevos se crean desde Supabase Auth; aquí solo se habilitan sus permisos."
        actions={
          <Button
            variant="outline"
            onClick={exportUsers}
            disabled={filtered.length === 0}
            startIcon={<Download className="h-4 w-4" />}
          >
            Exportar CSV
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Usuarios con perfil"
          value={profiles.length}
          hint="Cuentas habilitadas en el panel"
          icon={Users}
          tone="brand"
        />
        <StatCard
          label="Administradores"
          value={roleCounts.ADMIN}
          hint="Acceso total al sistema"
          icon={ShieldCheck}
          tone="emerald"
        />
        <StatCard
          label="Perfiles financieros"
          value={financeCount}
          hint="Admin, directiva y tesorería"
          icon={KeyRound}
          tone="sky"
        />
        <StatCard
          label="Editores"
          value={roleCounts.EDITOR}
          hint="Gestión deportiva y de contenidos"
          icon={UserCog}
          tone="amber"
        />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <Card>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre o correo…"
              className="w-full sm:max-w-xs"
            />
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
              aria-label="Filtrar por rol"
            >
              <option value="">Todos los roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500 sm:ml-auto">
              {filtered.length} de {profiles.length}
            </span>
          </div>

          {loading ? (
            <div className="p-5">
              <LoadingBlock message="Cargando usuarios…" />
            </div>
          ) : error ? (
            <div className="p-5">
              <ErrorState message={error} onRetry={reload} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Search}
                title={profiles.length === 0 ? 'Sin perfiles registrados' : 'Sin coincidencias'}
                description={
                  profiles.length === 0
                    ? 'Crea la cuenta en Supabase Auth y luego asigna un rol desde esta pantalla.'
                    : 'Ajusta el término de búsqueda o el filtro de rol.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table responsive-table w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 text-left">Usuario</th>
                    <th className="px-4 py-3 text-left">Rol</th>
                    <th className="px-4 py-3 text-left">Creado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item) => {
                    const self = item.id === profile?.id;
                    return (
                      <tr key={item.id} className="transition hover:bg-slate-50/70">
                        <td className="px-4 py-3" data-label="Usuario">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {(item.display_name || item.email || '?')
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">
                                {item.display_name || 'Sin nombre'}
                                {self && (
                                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)]">
                                    Tú
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-[11px] text-slate-500">
                                {item.email || 'Sin correo registrado'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3" data-label="Rol">
                          <StatusBadge status={item.role} label={ROLE_LABELS[item.role]} />
                          <p className="mt-1 text-[10px] text-slate-400">{ROLE_SCOPE[item.role]}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600" data-label="Creado">
                          {formatDate(item.created_at)}
                          <span className="block text-[10px] text-slate-400">
                            {formatDateTime(item.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3" data-label="Acciones">
                          <div className="flex justify-end">
                            {self ? (
                              <span className="text-[11px] text-slate-400">Tu propia cuenta</span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openRoleChange(item)}
                                startIcon={<UserCog className="h-3.5 w-3.5" />}
                              >
                                Cambiar rol
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Roles y alcance</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Los permisos también se aplican en la base de datos mediante RLS. Cambiar el rol
              aquí no otorga acceso si las políticas no lo permiten.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {ROLES.map((role) => (
              <div key={role} className="flex gap-3 px-5 py-3.5">
                <span className="mt-0.5">
                  <Badge tone={statusTone(role)}>{role}</Badge>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800">{ROLE_LABELS[role]}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                    {ROLE_DESCRIPTIONS[role]}
                  </p>
                </div>
                <span className="ml-auto shrink-0 text-right text-[10px] font-medium text-slate-400">
                  {roleCounts[role]}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xs leading-relaxed text-slate-600">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <div>
          <p className="font-semibold text-slate-800">Crear una cuenta nueva</p>
          <p className="mt-0.5">
            Un administrador debe crear la persona en <strong>Supabase → Authentication →
            Users</strong> con correo y contraseña. El sistema crea el perfil automáticamente;
            luego asígnale un rol desde esta pantalla. No es posible crear cuentas de acceso
            directamente desde el panel público con la clave anónima.
          </p>
        </div>
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Cambiar rol de usuario"
        description="El cambio queda registrado en la auditoría con tu usuario y la fecha."
        size="sm"
        dismissible={!saving}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={() => void saveRole()}
              loading={saving}
              disabled={isSelf || nextRole === editing?.role}
            >
              Guardar rol
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Usuario
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {editing?.display_name || 'Sin nombre'}
            </p>
            <p className="text-xs text-slate-500">{editing?.email || 'Sin correo'}</p>
          </div>

          <Select
            label="Nuevo rol"
            value={nextRole}
            onChange={(event) => setNextRole(event.target.value as Role)}
            disabled={saving || isSelf}
            hint={ROLE_SCOPE[nextRole]}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>

          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-slate-600">
            {ROLE_DESCRIPTIONS[nextRole]}
          </p>

          {isSelf && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
              No puedes cambiar tu propio rol. Otro administrador debe hacerlo.
            </p>
          )}

          {formError && (
            <p
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
              role="alert"
            >
              {formError}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
