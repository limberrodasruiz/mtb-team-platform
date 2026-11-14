import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  CircleDollarSign,
  CreditCard,
  Pencil,
  Plus,
  Power,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import {
  createMember,
  getMembers,
  setMemberStatus,
  updateMember,
  type MemberInput,
} from '../../services/members';
import { canWriteFinance } from '../../lib/permissions';
import { errorMessage } from '../../lib/errors';
import type { Member, MemberStatus, MemberType } from '../../types';
import {
  MEMBER_STATUS,
  MEMBER_STATUS_LABELS,
  MEMBER_TYPES,
  MEMBER_TYPE_LABELS,
} from '../../constants';
import { formatDate, formatMoneyBs, todayISO, toDateInput } from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button, buttonStyles } from '../../components/ui/Button';
import { Checkbox, Input, Select, Textarea } from '../../components/ui/Input';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { SearchInput } from '../../components/ui/SearchInput';
import { ReadOnlyNotice } from '../../components/admin/ReadOnlyNotice';

interface MemberForm {
  full_name: string;
  ci: string;
  phone: string;
  email: string;
  joined_at: string;
  status: MemberStatus;
  member_type: MemberType;
  monthly_amount: string;
  fee_exempt: boolean;
  left_at: string;
  notes: string;
}

function emptyForm(): MemberForm {
  return {
    full_name: '',
    ci: '',
    phone: '',
    email: '',
    joined_at: todayISO(),
    status: 'ACTIVO',
    member_type: 'CORREDOR',
    monthly_amount: '0',
    fee_exempt: false,
    left_at: '',
    notes: '',
  };
}

function formFrom(member: Member): MemberForm {
  return {
    full_name: member.full_name,
    ci: member.ci ?? '',
    phone: member.phone ?? '',
    email: member.email ?? '',
    joined_at: toDateInput(member.joined_at) || todayISO(),
    status: member.status,
    member_type: member.member_type,
    monthly_amount: String(member.monthly_amount),
    fee_exempt: member.fee_exempt,
    left_at: toDateInput(member.left_at),
    notes: member.notes ?? '',
  };
}

export function AdminMembersPage() {
  const { profile } = useAuth();
  const { success, error: toastError } = useToast();
  const writer = canWriteFinance(profile?.role);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<Member | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const { data, loading, error, reload } = useAsync<Member[]>(
    () => getMembers(),
    [],
  );
  const members = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members.filter((member) => {
      if (statusFilter && member.status !== statusFilter) return false;
      if (typeFilter && member.member_type !== typeFilter) return false;
      if (!term) return true;
      return [member.full_name, member.ci, member.phone, member.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [members, search, statusFilter, typeFilter]);

  const activeMembers = members.filter((member) => member.status === 'ACTIVO');
  const monthlyExpected = activeMembers
    .filter((member) => !member.fee_exempt)
    .reduce((total, member) => total + member.monthly_amount, 0);
  const exemptCount = members.filter((member) => member.fee_exempt).length;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(member: Member) {
    setEditing(member);
    setForm(formFrom(member));
    setFormError(null);
    setFormOpen(true);
  }

  function updateForm<K extends keyof MemberForm>(key: K, value: MemberForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!writer) return;
    setFormError(null);
    setSaving(true);

    try {
      const monthlyAmount = Number(form.monthly_amount);
      if (!Number.isFinite(monthlyAmount) || monthlyAmount < 0) {
        throw new Error('La cuota mensual debe ser un monto mayor o igual a cero.');
      }

      const payload: MemberInput = {
        full_name: form.full_name,
        ci: form.ci,
        phone: form.phone,
        email: form.email,
        joined_at: form.joined_at,
        status: form.status,
        member_type: form.member_type,
        monthly_amount: monthlyAmount,
        fee_exempt: form.fee_exempt,
        left_at: form.left_at || null,
        notes: form.notes,
      };

      if (editing) {
        await updateMember(editing.id, payload);
        success('Miembro actualizado.');
      } else {
        await createMember(payload);
        success('Miembro registrado.');
      }

      setFormOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo guardar el miembro.'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmStatusChange() {
    if (!statusTarget) return;
    setStatusLoading(true);
    const next: MemberStatus = statusTarget.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';

    try {
      await setMemberStatus(statusTarget.id, next, statusTarget.left_at);
      success(
        next === 'ACTIVO'
          ? 'Miembro activado. Ya puede recibir nuevas cuotas.'
          : 'Miembro desactivado. Su historial se conserva.',
      );
      setStatusTarget(null);
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo cambiar el estado del miembro.'));
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Miembros"
        description="Padrón de socios y colaboradores. La desactivación conserva el historial y no elimina deudas ni pagos."
        actions={
          writer ? (
            <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
              Nuevo miembro
            </Button>
          ) : undefined
        }
      />

      {!writer && (
        <ReadOnlyNotice message="Tu rol puede consultar el padrón de miembros, pero solo administración o tesorería pueden modificarlo." />
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Miembros registrados',
            value: String(members.length),
            icon: Users,
            tone: 'text-slate-700 bg-slate-100',
          },
          {
            label: 'Activos',
            value: String(activeMembers.length),
            icon: BadgeCheck,
            tone: 'text-emerald-700 bg-emerald-50',
          },
          {
            label: 'Cuota mensual esperada',
            value: formatMoneyBs(monthlyExpected),
            icon: CircleDollarSign,
            tone: 'text-sky-700 bg-sky-50',
          },
          {
            label: 'Exentos de cuota',
            value: String(exemptCount),
            icon: ShieldAlert,
            tone: 'text-violet-700 bg-violet-50',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-slate-950">
                  {item.value}
                </p>
              </div>
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.tone}`}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            </div>
          );
        })}
      </div>

      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre, CI, teléfono o correo…"
            className="w-full"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
              aria-label="Filtrar por tipo de miembro"
            >
              <option value="">Todos los tipos</option>
              {MEMBER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {MEMBER_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
              aria-label="Filtrar por estado"
            >
              <option value="">Todos los estados</option>
              {MEMBER_STATUS.map((status) => (
                <option key={status} value={status}>
                  {MEMBER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <span className="inline-flex items-center px-1 text-xs text-slate-500">
              {filtered.length} de {members.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-5">
            <LoadingBlock message="Cargando miembros…" />
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Users}
              title={members.length === 0 ? 'Todavía no hay miembros' : 'Sin coincidencias'}
              description={
                members.length === 0
                  ? 'Registra a los socios y colaboradores para generar sus cuotas mensuales.'
                  : 'Prueba con otro nombre, estado o tipo de miembro.'
              }
              action={
                members.length === 0 && writer ? (
                  <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
                    Nuevo miembro
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
                  <th className="px-4 py-3 text-left">Miembro</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Ingreso</th>
                  <th className="px-4 py-3 text-right">Cuota mensual</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((member) => (
                  <tr key={member.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3" data-label="Miembro">
                      <p className="font-medium text-slate-900">{member.full_name}</p>
                      <p className="text-[11px] text-slate-500">
                        {[member.ci ? `CI ${member.ci}` : null, member.phone, member.email]
                          .filter(Boolean)
                          .join(' · ') || 'Sin datos de contacto'}
                      </p>
                    </td>
                    <td className="px-4 py-3" data-label="Tipo">
                      <Badge tone="neutral">{MEMBER_TYPE_LABELS[member.member_type]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600" data-label="Ingreso">
                      {formatDate(member.joined_at)}
                      {member.left_at && (
                        <span className="block text-[11px] text-slate-400">
                          Baja: {formatDate(member.left_at)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" data-label="Cuota mensual">
                      {member.fee_exempt ? (
                        <Badge tone="purple">Exento</Badge>
                      ) : (
                        <span className="font-semibold text-slate-900">
                          {formatMoneyBs(member.monthly_amount)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3" data-label="Estado">
                      <StatusBadge
                        status={member.status}
                        label={MEMBER_STATUS_LABELS[member.status]}
                      />
                    </td>
                    <td className="px-4 py-3" data-label="Acciones">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/membresias?memberId=${member.id}`}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label={`Ver cuotas de ${member.full_name}`}
                          title="Ver cuotas"
                        >
                          <CreditCard className="h-4 w-4" />
                        </Link>
                        {writer && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(member)}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                              aria-label={`Editar ${member.full_name}`}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setStatusTarget(member)}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                              aria-label={
                                member.status === 'ACTIVO' ? 'Desactivar miembro' : 'Activar miembro'
                              }
                              title={member.status === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                            >
                              <Power className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        <span>
          Las cuotas se generan por período desde el módulo de membresías. Desactivar a un miembro
          no borra su deuda.
        </span>
        <Link to="/admin/membresias" className={buttonStyles('outline', 'sm')}>
          Ir a membresías
        </Link>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar miembro' : 'Nuevo miembro'}
        description="Los datos de contacto y la cuota son internos; no se publican en el sitio."
        size="lg"
        dismissible={!saving}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="member-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Registrar miembro'}
            </Button>
          </>
        }
      >
        <form id="member-form" onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nombre completo"
              value={form.full_name}
              onChange={(event) => updateForm('full_name', event.target.value)}
              required
              containerClassName="sm:col-span-2"
            />
            <Input
              label="Cédula de identidad"
              value={form.ci}
              onChange={(event) => updateForm('ci', event.target.value)}
              placeholder="Opcional"
            />
            <Input
              label="Teléfono"
              value={form.phone}
              onChange={(event) => updateForm('phone', event.target.value)}
              placeholder="+591 70000000"
            />
            <Input
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={(event) => updateForm('email', event.target.value)}
              placeholder="Opcional"
            />
            <Select
              label="Tipo de miembro"
              value={form.member_type}
              onChange={(event) => updateForm('member_type', event.target.value as MemberType)}
            >
              {MEMBER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {MEMBER_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
            <Select
              label="Estado"
              value={form.status}
              onChange={(event) => updateForm('status', event.target.value as MemberStatus)}
            >
              {MEMBER_STATUS.map((status) => (
                <option key={status} value={status}>
                  {MEMBER_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
            <Input
              label="Fecha de ingreso"
              type="date"
              value={form.joined_at}
              onChange={(event) => updateForm('joined_at', event.target.value)}
              required
            />
            <Input
              label="Fecha de baja"
              type="date"
              value={form.left_at}
              onChange={(event) => updateForm('left_at', event.target.value)}
              hint="Opcional. Se usa para no generar cuotas posteriores."
            />
            <Input
              label="Cuota mensual (Bs)"
              type="number"
              min={0}
              step="0.01"
              value={form.monthly_amount}
              onChange={(event) => updateForm('monthly_amount', event.target.value)}
              hint="Monto base para las obligaciones mensuales."
            />
          </div>

          <Checkbox
            label="Exento de cuota"
            description="No se le generarán obligaciones mensuales mientras esté activo."
            checked={form.fee_exempt}
            onChange={(event) => updateForm('fee_exempt', event.target.checked)}
          />

          <Textarea
            label="Notas internas"
            value={form.notes}
            onChange={(event) => updateForm('notes', event.target.value)}
            rows={3}
            placeholder="Observaciones administrativas. No se publican."
          />

          {formError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {formError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        title={statusTarget?.status === 'ACTIVO' ? 'Desactivar miembro' : 'Activar miembro'}
        description={
          statusTarget?.status === 'ACTIVO'
            ? `${statusTarget.full_name} quedará inactivo y no se generarán nuevas cuotas. Su historial y deudas pendientes se conservan.`
            : `${statusTarget?.full_name ?? 'El miembro'} volverá al estado activo y podrá recibir nuevas cuotas mensuales.`
        }
        confirmLabel={statusTarget?.status === 'ACTIVO' ? 'Desactivar' : 'Activar'}
        tone={statusTarget?.status === 'ACTIVO' ? 'danger' : 'primary'}
        loading={statusLoading}
        onConfirm={() => void confirmStatusChange()}
      />
    </>
  );
}
