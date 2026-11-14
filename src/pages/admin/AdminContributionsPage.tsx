import { useMemo, useState, type FormEvent } from 'react';
import {
  Ban,
  Download,
  HandCoins,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import {
  getContributions,
  registerIncome,
  reverseIncome,
} from '../../services/finance';
import { getMembers } from '../../services/members';
import { canWriteFinance } from '../../lib/permissions';
import { errorMessage } from '../../lib/errors';
import type {
  ContributionRow,
  IncomeType,
  Member,
} from '../../types';
import {
  INCOME_TYPES,
  INCOME_TYPE_LABELS,
  PAYMENT_METHODS,
} from '../../constants';
import {
  currentMonth,
  formatDate,
  formatMoneyBs,
  monthKey,
  todayISO,
} from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { SearchInput } from '../../components/ui/SearchInput';
import { StatCard } from '../../components/ui/StatCard';
import { ReadOnlyNotice } from '../../components/admin/ReadOnlyNotice';

interface PageData {
  contributions: ContributionRow[];
  members: Member[];
}

interface IncomeForm {
  incomeType: IncomeType;
  date: string;
  amount: string;
  concept: string;
  memberId: string;
  entityName: string;
  method: string;
  reference: string;
}

function emptyForm(): IncomeForm {
  return {
    incomeType: 'APORTE_EXTRA',
    date: todayISO(),
    amount: '',
    concept: '',
    memberId: '',
    entityName: '',
    method: 'Efectivo',
    reference: '',
  };
}

export function AdminContributionsPage() {
  const { profile } = useAuth();
  const { success, error: toastError } = useToast();
  const writer = canWriteFinance(profile?.role);
  const period = currentMonth();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<IncomeForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [reversing, setReversing] = useState<ContributionRow | null>(null);
  const [reversalLoading, setReversalLoading] = useState(false);

  const { data, loading, error, reload } = useAsync<PageData>(async () => {
    const [contributions, members] = await Promise.all([
      getContributions(),
      getMembers(),
    ]);
    return { contributions, members };
  }, []);

  const contributions = useMemo(() => data?.contributions ?? [], [data]);
  const members = data?.members ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contributions.filter((row) => {
      if (typeFilter && row.income_type !== typeFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (from && row.date < from) return false;
      if (to && row.date > to) return false;
      if (!term) return true;
      return [
        row.concept,
        row.member_name,
        row.entity_name,
        row.reference,
        row.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [contributions, search, typeFilter, statusFilter, from, to]);

  const confirmed = contributions.filter((row) => row.status === 'CONFIRMADO');
  const currentKey = monthKey(period.year, period.month);
  const confirmedTotal = confirmed.reduce((total, row) => total + row.amount, 0);
  const currentMonthTotal = confirmed
    .filter((row) => row.date.slice(0, 7) === currentKey)
    .reduce((total, row) => total + row.amount, 0);

  function openCreate() {
    setForm(emptyForm());
    setFormError(null);
    setFormOpen(true);
  }

  function updateForm<K extends keyof IncomeForm>(key: K, value: IncomeForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!writer) return;
    setFormError(null);
    setSaving(true);
    try {
      await registerIncome({
        incomeType: form.incomeType,
        date: form.date,
        amount: Number(form.amount),
        concept: form.concept,
        memberId: form.memberId || null,
        entityName: form.entityName,
        method: form.method || null,
        reference: form.reference,
      });
      success('Ingreso registrado. El movimiento ya está en caja.');
      setFormOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo registrar el ingreso.'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmReversal(reason: string) {
    if (!reversing) return;
    setReversalLoading(true);
    try {
      await reverseIncome(reversing.id, reason);
      success('Ingreso revertido. El movimiento de caja quedó anulado.');
      setReversing(null);
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo revertir el ingreso.'));
    } finally {
      setReversalLoading(false);
    }
  }

  function exportCsv() {
    downloadCsv(
      `aportes-${todayISO()}`,
      ['Fecha', 'Tipo', 'Concepto', 'Miembro', 'Entidad', 'Método', 'Referencia', 'Monto', 'Estado', 'Motivo anulación'],
      filtered.map((row) => [
        row.date,
        INCOME_TYPE_LABELS[row.income_type],
        row.concept,
        row.member_name,
        row.entity_name,
        row.method,
        row.reference,
        row.amount,
        row.status,
        row.annul_reason,
      ]),
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Finanzas"
        title="Aportes e ingresos"
        description="Aportes extraordinarios, auspicios, donaciones y otros ingresos. Cada registro genera un movimiento de caja auditado."
        actions={
          <>
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={filtered.length === 0}
              startIcon={<Download className="h-4 w-4" />}
            >
              Exportar CSV
            </Button>
            {writer && (
              <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
                Nuevo ingreso
              </Button>
            )}
          </>
        }
      />

      {!writer && (
        <ReadOnlyNotice message="Mesa directiva puede consultar y exportar los ingresos, pero solo administración o tesorería pueden registrarlos o revertirlos." />
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ingresos confirmados"
          value={formatMoneyBs(confirmedTotal)}
          hint={`${confirmed.length} registros activos`}
          icon={Wallet}
          tone="emerald"
        />
        <StatCard
          label="Ingresos del mes"
          value={formatMoneyBs(currentMonthTotal)}
          hint={`${formatDate(todayISO())}`}
          icon={TrendingUp}
          tone="brand"
        />
        <StatCard
          label="Registros anulados"
          value={String(contributions.filter((row) => row.status === 'ANULADO').length)}
          hint="Se conservan para auditoría"
          icon={TrendingDown}
          tone="amber"
        />
        <StatCard
          label="Aportes de miembros"
          value={String(
            confirmed.filter((row) => row.income_type === 'APORTE_EXTRA').length,
          )}
          hint="Aportes extraordinarios"
          icon={HandCoins}
          tone="sky"
        />
      </div>

      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar concepto, entidad, miembro o referencia…"
            className="w-full"
          />
          <div className="flex flex-wrap gap-2">
            <Input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              aria-label="Desde"
              className="h-10 py-0"
            />
            <Input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              aria-label="Hasta"
              className="h-10 py-0"
            />
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
              aria-label="Tipo de ingreso"
            >
              <option value="">Todos los tipos</option>
              {INCOME_TYPES.map((type) => (
                <option key={type} value={type}>
                  {INCOME_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
              aria-label="Estado"
            >
              <option value="">Todos los estados</option>
              <option value="CONFIRMADO">Confirmados</option>
              <option value="ANULADO">Anulados</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-5">
            <LoadingBlock message="Cargando aportes…" />
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={HandCoins}
              title={
                contributions.length === 0
                  ? 'Todavía no hay aportes registrados'
                  : 'Sin coincidencias'
              }
              description={
                contributions.length === 0
                  ? 'Registra el primer aporte, auspicio o donación para reflejarlo en caja.'
                  : 'Ajusta el rango de fechas, el tipo o el término de búsqueda.'
              }
              action={
                contributions.length === 0 && writer ? (
                  <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
                    Nuevo ingreso
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
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Origen</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-600" data-label="Fecha">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-3" data-label="Concepto">
                      <p className="font-medium text-slate-900">{row.concept}</p>
                      <p className="text-[11px] text-slate-500">
                        {[row.method, row.reference].filter(Boolean).join(' · ') || 'Sin método'}
                      </p>
                    </td>
                    <td className="px-4 py-3" data-label="Tipo">
                      <Badge tone="info">{INCOME_TYPE_LABELS[row.income_type]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600" data-label="Origen">
                      {row.member_name || row.entity_name || '—'}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900"
                      data-label="Monto"
                    >
                      {formatMoneyBs(row.amount)}
                    </td>
                    <td className="px-4 py-3" data-label="Estado">
                      <Badge tone={row.status === 'CONFIRMADO' ? 'success' : 'neutral'}>
                        {row.status === 'CONFIRMADO' ? 'Confirmado' : 'Anulado'}
                      </Badge>
                      {row.annul_reason && (
                        <p className="mt-1 max-w-[180px] text-[10px] text-slate-400">
                          {row.annul_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3" data-label="Acciones">
                      <div className="flex items-center justify-end gap-1">
                        {row.status === 'CONFIRMADO' ? (
                          writer ? (
                            <button
                              type="button"
                              onClick={() => setReversing(row)}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                              aria-label="Revertir ingreso"
                              title="Revertir ingreso"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">Solo lectura</span>
                          )
                        ) : (
                          <Receipt className="h-4 w-4 text-slate-300" aria-hidden />
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

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Registrar ingreso"
        description="El ingreso se guarda junto con su movimiento de caja en una sola transacción."
        size="lg"
        dismissible={!saving}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="income-form" loading={saving}>
              Registrar ingreso
            </Button>
          </>
        }
      >
        <form id="income-form" onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Tipo de ingreso"
              value={form.incomeType}
              onChange={(event) => updateForm('incomeType', event.target.value as IncomeType)}
            >
              {INCOME_TYPES.map((type) => (
                <option key={type} value={type}>
                  {INCOME_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
            <Input
              label="Fecha"
              type="date"
              value={form.date}
              onChange={(event) => updateForm('date', event.target.value)}
              required
            />
            <Input
              label="Monto (Bs)"
              type="number"
              min={0.01}
              step="0.01"
              value={form.amount}
              onChange={(event) => updateForm('amount', event.target.value)}
              required
              containerClassName="sm:col-span-2"
            />
            <Input
              label="Concepto"
              value={form.concept}
              onChange={(event) => updateForm('concept', event.target.value)}
              placeholder="Aporte para inscripción, auspicio de temporada…"
              required
              containerClassName="sm:col-span-2"
            />
            <Select
              label="Miembro (opcional)"
              value={form.memberId}
              onChange={(event) => updateForm('memberId', event.target.value)}
            >
              <option value="">Sin miembro asociado</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </Select>
            <Input
              label="Entidad o auspiciador"
              value={form.entityName}
              onChange={(event) => updateForm('entityName', event.target.value)}
              placeholder="Opcional"
            />
            <Select
              label="Método"
              value={form.method}
              onChange={(event) => updateForm('method', event.target.value)}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
            <Input
              label="Referencia"
              value={form.reference}
              onChange={(event) => updateForm('reference', event.target.value)}
              placeholder="Comprobante, transferencia…"
            />
          </div>
          {formError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {formError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(reversing)}
        onClose={() => setReversing(null)}
        title="Revertir ingreso"
        description={`Se anulará “${reversing?.concept ?? ''}” por ${formatMoneyBs(
          reversing?.amount ?? 0,
        )}. El registro y su movimiento de caja se conservan como anulados, con el motivo indicado.`}
        confirmLabel="Revertir ingreso"
        requireReason
        reasonLabel="Motivo del reverso"
        loading={reversalLoading}
        onConfirm={(reason) => void confirmReversal(reason)}
      />
    </>
  );
}
