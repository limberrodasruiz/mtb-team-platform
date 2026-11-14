import { useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Ban,
  CalendarPlus,
  CheckCircle2,
  CreditCard,
  Download,
  History,
  Pencil,
  Receipt,
  Users,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import {
  annulObligation,
  generateObligations,
  getMemberDebt,
  getMembers,
  getMembershipSummary,
  getObligations,
  getPaymentEntries,
  registerMembershipPayment,
  reverseMembershipPayment,
  updateObligation,
} from '../../services/members';
import { canWriteFinance } from '../../lib/permissions';
import { errorMessage } from '../../lib/errors';
import type {
  Member,
  MemberDebt,
  MembershipObligation,
  MembershipPaymentEntry,
  MembershipSummary,
  PaymentStatus,
} from '../../types';
import {
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABELS,
} from '../../constants';
import {
  currentMonth,
  formatDate,
  formatMonth,
  formatMoneyBs,
  todayISO,
  toDateInput,
  yearOptions,
} from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Checkbox, Input, Select, Textarea } from '../../components/ui/Input';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { SearchInput } from '../../components/ui/SearchInput';
import { StatCard } from '../../components/ui/StatCard';
import { Tabs } from '../../components/ui/Tabs';
import { ReadOnlyNotice } from '../../components/admin/ReadOnlyNotice';

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const YEARS = yearOptions(8);

interface PageData {
  obligations: MembershipObligation[];
  summary: MembershipSummary[];
  members: Member[];
  debt: MemberDebt[];
}

interface PaymentForm {
  amount: string;
  paidAt: string;
  method: string;
  reference: string;
  notes: string;
}

interface ObligationForm {
  expected: string;
  dueDate: string;
  waived: boolean;
  notes: string;
}

export function AdminMembershipsPage() {
  const { profile } = useAuth();
  const { success, info, error: toastError } = useToast();
  const writer = canWriteFinance(profile?.role);
  const period = currentMonth();
  const [params] = useSearchParams();

  const [tab, setTab] = useState<'monthly' | 'debt'>('monthly');
  const [year, setYear] = useState(period.year);
  const [month, setMonth] = useState(period.month);
  const [statusFilter, setStatusFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState(params.get('memberId') ?? '');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [genYear, setGenYear] = useState(period.year);
  const [genMonth, setGenMonth] = useState(period.month);
  const [generating, setGenerating] = useState(false);

  const [paying, setPaying] = useState<MembershipObligation | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: '',
    paidAt: todayISO(),
    method: 'Efectivo',
    reference: '',
    notes: '',
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [historyFor, setHistoryFor] = useState<MembershipObligation | null>(null);
  const [editing, setEditing] = useState<MembershipObligation | null>(null);
  const [obligationForm, setObligationForm] = useState<ObligationForm>({
    expected: '0',
    dueDate: '',
    waived: false,
    notes: '',
  });
  const [savingObligation, setSavingObligation] = useState(false);
  const [obligationError, setObligationError] = useState<string | null>(null);
  const [annulling, setAnnulling] = useState<MembershipObligation | null>(null);
  const [annulLoading, setAnnulLoading] = useState(false);

  const { data, loading, error, reload } = useAsync<PageData>(async () => {
    const [obligations, summary, members, debt] = await Promise.all([
      getObligations({
        year,
        month,
        status: statusFilter ? (statusFilter as PaymentStatus) : undefined,
        memberId: memberFilter || undefined,
        search: debouncedSearch.trim() || undefined,
      }),
      getMembershipSummary(year),
      getMembers(),
      getMemberDebt(),
    ]);
    return { obligations, summary, members, debt };
  }, [year, month, statusFilter, memberFilter, debouncedSearch]);

  const obligations = data?.obligations ?? [];
  const members = data?.members ?? [];
  const debt = useMemo(() => data?.debt ?? [], [data]);
  const selectedSummary = data?.summary.find(
    (row) => row.year === year && row.month === month,
  );

  const filteredDebt = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return debt;
    return debt.filter((row) => row.full_name.toLowerCase().includes(term));
  }, [debt, search]);

  const selectedMember = members.find((member) => member.id === memberFilter);

  function openGenerate() {
    setGenYear(year);
    setGenMonth(month);
    setGenerateOpen(true);
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!writer) return;
    setGenerating(true);
    try {
      const count = await generateObligations(genYear, genMonth);
      if (count === 0) {
        info(
          `No se generaron cuotas nuevas para ${formatMonth(genMonth, genYear)}. Puede que ya existan o que no haya miembros activos con cuota.`,
        );
      } else {
        success(
          `Se generaron ${count} ${count === 1 ? 'cuota' : 'cuotas'} para ${formatMonth(genMonth, genYear)}.`,
        );
      }
      setGenerateOpen(false);
      setYear(genYear);
      setMonth(genMonth);
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudieron generar las cuotas.'));
    } finally {
      setGenerating(false);
    }
  }

  function openPayment(obligation: MembershipObligation) {
    setPaying(obligation);
    setPaymentForm({
      amount: obligation.balance > 0 ? obligation.balance.toFixed(2) : '',
      paidAt: todayISO(),
      method: 'Efectivo',
      reference: '',
      notes: '',
    });
    setPaymentError(null);
  }

  async function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paying || !writer) return;
    setPaymentError(null);
    setSavingPayment(true);
    try {
      await registerMembershipPayment(paying.id, {
        amount: Number(paymentForm.amount),
        paidAt: paymentForm.paidAt,
        method: paymentForm.method || null,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
      });
      success('Pago registrado. El ingreso se refleja automáticamente en caja.');
      setPaying(null);
      reload();
    } catch (err) {
      setPaymentError(errorMessage(err, 'No se pudo registrar el pago.'));
    } finally {
      setSavingPayment(false);
    }
  }

  function openEdit(obligation: MembershipObligation) {
    setEditing(obligation);
    setObligationForm({
      expected: String(obligation.expected),
      dueDate: toDateInput(obligation.due_date),
      waived: obligation.waived,
      notes: obligation.notes ?? '',
    });
    setObligationError(null);
  }

  async function saveObligation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !writer) return;
    setObligationError(null);
    setSavingObligation(true);
    try {
      await updateObligation(editing.id, {
        expected: Number(obligationForm.expected),
        dueDate: obligationForm.dueDate || null,
        waived: obligationForm.waived,
        notes: obligationForm.notes,
      });
      success('Obligación actualizada.');
      setEditing(null);
      reload();
    } catch (err) {
      setObligationError(errorMessage(err, 'No se pudo actualizar la obligación.'));
    } finally {
      setSavingObligation(false);
    }
  }

  async function confirmAnnul(reason: string) {
    if (!annulling) return;
    setAnnulLoading(true);
    try {
      await annulObligation(annulling.id, reason);
      success('Obligación anulada. Se conserva en el historial.');
      setAnnulling(null);
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo anular la obligación.'));
    } finally {
      setAnnulLoading(false);
    }
  }

  function exportCsv() {
    downloadCsv(
      `membresias-${year}-${String(month).padStart(2, '0')}`,
      ['Miembro', 'Tipo', 'Período', 'Esperado', 'Pagado', 'Saldo', 'Vencimiento', 'Estado', 'Notas'],
      obligations.map((row) => [
        row.full_name,
        row.member_type,
        `${year}-${String(row.month).padStart(2, '0')}`,
        row.expected,
        row.paid,
        row.balance,
        row.due_date,
        PAYMENT_STATUS_LABELS[row.status],
        row.notes,
      ]),
    );
  }

  function exportDebtCsv() {
    downloadCsv(
      `deuda-membresias-${todayISO()}`,
      ['Miembro', 'Tipo', 'Estado', 'Períodos pendientes', 'Deuda total', 'Deuda vencida'],
      filteredDebt.map((row) => [
        row.full_name,
        row.member_type,
        row.member_status,
        row.pending_periods,
        row.pending_amount,
        row.overdue_amount,
      ]),
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Membresías"
        description="Cuotas mensuales, pagos parciales e historial. Los movimientos quedan en caja y en auditoría; nunca se borran."
        actions={
          <>
            <Button
              variant="outline"
              onClick={tab === 'monthly' ? exportCsv : exportDebtCsv}
              disabled={tab === 'monthly' ? obligations.length === 0 : filteredDebt.length === 0}
              startIcon={<Download className="h-4 w-4" />}
            >
              Exportar CSV
            </Button>
            {writer && (
              <Button onClick={openGenerate} startIcon={<CalendarPlus className="h-4 w-4" />}>
                Generar cuotas
              </Button>
            )}
          </>
        }
      />

      {!writer && (
        <ReadOnlyNotice message="Mesa directiva puede consultar cuotas, pagos y deuda. Solo administración o tesorería pueden registrar pagos o modificar obligaciones." />
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Esperado del período"
          value={formatMoneyBs(selectedSummary?.expected_total ?? 0)}
          hint={formatMonth(month, year)}
          icon={Receipt}
          tone="brand"
        />
        <StatCard
          label="Cobrado"
          value={formatMoneyBs(selectedSummary?.paid_total ?? 0)}
          hint={`${selectedSummary?.paid_count ?? 0} cuotas completas`}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Pendiente del período"
          value={formatMoneyBs(selectedSummary?.pending_total ?? 0)}
          hint={`${selectedSummary?.pending_count ?? 0} cuotas por completar`}
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          label="Deuda vencida acumulada"
          value={formatMoneyBs(debt.reduce((total, row) => total + row.overdue_amount, 0))}
          hint={`${debt.filter((row) => row.overdue_amount > 0).length} miembros con atraso`}
          icon={Ban}
          tone="rose"
          to="/admin/membresias"
        />
      </div>

      <Tabs
        className="mb-5"
        value={tab}
        onChange={(value) => setTab(value as 'monthly' | 'debt')}
        items={[
          { id: 'monthly', label: 'Cuotas del período', count: obligations.length },
          { id: 'debt', label: 'Deuda acumulada', count: debt.length },
        ]}
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={
              tab === 'monthly' ? 'Buscar miembro en el período…' : 'Buscar miembro deudor…'
            }
            className="w-full"
          />
          {tab === 'monthly' && (
            <div className="flex flex-wrap gap-2">
              <select
                value={memberFilter}
                onChange={(event) => setMemberFilter(event.target.value)}
                className="h-10 max-w-[240px] rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
                aria-label="Filtrar por miembro"
              >
                <option value="">Todos los miembros</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
                aria-label="Año"
              >
                {YEARS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
                aria-label="Mes"
              >
                {MONTHS.map((option) => (
                  <option key={option} value={option}>
                    {formatMonth(option)}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
                aria-label="Estado de la cuota"
              >
                <option value="">Todos los estados</option>
                {PAYMENT_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {PAYMENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {selectedMember && tab === 'monthly' && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-[var(--brand-soft)]/50 px-4 py-2.5 text-xs text-slate-700">
            <span>
              Mostrando el historial de <strong>{selectedMember.full_name}</strong>.
            </span>
            <button
              type="button"
              onClick={() => setMemberFilter('')}
              className="font-semibold text-[var(--brand-dark)] hover:underline"
            >
              Quitar filtro
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-5">
            <LoadingBlock message="Cargando membresías…" />
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : tab === 'monthly' ? (
          obligations.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={CreditCard}
                title="Sin cuotas para este período"
                description={
                  writer
                    ? 'Genera las cuotas del mes para los miembros activos con cuota mensual.'
                    : 'No hay cuotas generadas para el período seleccionado.'
                }
                action={
                  writer ? (
                    <Button onClick={openGenerate} startIcon={<CalendarPlus className="h-4 w-4" />}>
                      Generar cuotas
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
                    <th className="px-4 py-3 text-left">Período</th>
                    <th className="px-4 py-3 text-right">Esperado</th>
                    <th className="px-4 py-3 text-right">Pagado</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {obligations.map((row) => (
                    <tr key={row.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3" data-label="Miembro">
                        <p className="font-medium text-slate-900">{row.full_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {row.member_type} · vence {formatDate(row.due_date)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600" data-label="Período">
                        {formatMonth(row.month, row.year)}
                      </td>
                      <td
                        className="px-4 py-3 text-right tabular-nums text-slate-600"
                        data-label="Esperado"
                      >
                        {formatMoneyBs(row.expected)}
                      </td>
                      <td
                        className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900"
                        data-label="Pagado"
                      >
                        {formatMoneyBs(row.paid)}
                      </td>
                      <td
                        className="px-4 py-3 text-right tabular-nums"
                        data-label="Saldo"
                      >
                        <span className={row.balance > 0 ? 'font-semibold text-rose-600' : 'text-slate-500'}>
                          {formatMoneyBs(row.balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3" data-label="Estado">
                        <StatusBadge
                          status={row.status}
                          label={PAYMENT_STATUS_LABELS[row.status]}
                        />
                      </td>
                      <td className="px-4 py-3" data-label="Acciones">
                        <div className="flex items-center justify-end gap-1">
                          {writer && row.balance > 0 && !row.annulled_at && !row.waived && (
                            <button
                              type="button"
                              onClick={() => openPayment(row)}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                              aria-label={`Registrar pago de ${row.full_name}`}
                              title="Registrar pago"
                            >
                              <CreditCard className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setHistoryFor(row)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                            aria-label={`Historial de pagos de ${row.full_name}`}
                            title="Historial de pagos"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          {writer && !row.annulled_at && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(row)}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                aria-label={`Editar cuota de ${row.full_name}`}
                                title="Editar cuota"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setAnnulling(row)}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                                aria-label={`Anular cuota de ${row.full_name}`}
                                title="Anular cuota"
                              >
                                <Ban className="h-4 w-4" />
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
          )
        ) : filteredDebt.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Users}
              title={debt.length === 0 ? 'Sin deudas pendientes' : 'Sin coincidencias'}
              description={
                debt.length === 0
                  ? 'Todos los miembros están al día con sus cuotas generadas.'
                  : 'Prueba con otro nombre de miembro.'
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
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-center">Períodos</th>
                  <th className="px-4 py-3 text-right">Deuda total</th>
                  <th className="px-4 py-3 text-right">Vencido</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDebt.map((row) => (
                  <tr key={row.member_id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900" data-label="Miembro">
                      {row.full_name}
                    </td>
                    <td className="px-4 py-3" data-label="Tipo">
                      <Badge tone="neutral">{row.member_type}</Badge>
                    </td>
                    <td className="px-4 py-3" data-label="Estado">
                      <StatusBadge status={row.member_status} />
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums" data-label="Períodos">
                      {row.pending_periods}
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900"
                      data-label="Deuda total"
                    >
                      {formatMoneyBs(row.pending_amount)}
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums text-rose-600"
                      data-label="Vencido"
                    >
                      {formatMoneyBs(row.overdue_amount)}
                    </td>
                    <td className="px-4 py-3" data-label="Acciones">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setMemberFilter(row.member_id);
                            setTab('monthly');
                            setStatusFilter('');
                          }}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--brand-dark)] transition hover:bg-[var(--brand-soft)]"
                        >
                          Ver cuotas
                        </button>
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
          Los pagos se registran por obligación y pueden ser parciales. Cada pago genera un ingreso
          en caja; los reversos conservan el registro original.
        </span>
        <Link
          to="/admin/miembros"
          className="font-semibold text-[var(--brand-dark)] hover:underline"
        >
          Gestionar miembros
        </Link>
      </div>

      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Generar cuotas mensuales"
        description="Se crean obligaciones para todos los miembros activos, con cuota mayor a cero y no exentos."
        size="sm"
        dismissible={!generating}
        footer={
          <>
            <Button variant="outline" onClick={() => setGenerateOpen(false)} disabled={generating}>
              Cancelar
            </Button>
            <Button type="submit" form="generate-form" loading={generating}>
              Generar cuotas
            </Button>
          </>
        }
      >
        <form id="generate-form" onSubmit={generate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Mes"
              value={genMonth}
              onChange={(event) => setGenMonth(Number(event.target.value))}
            >
              {MONTHS.map((option) => (
                <option key={option} value={option}>
                  {formatMonth(option)}
                </option>
              ))}
            </Select>
            <Select
              label="Año"
              value={genYear}
              onChange={(event) => setGenYear(Number(event.target.value))}
            >
              {YEARS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-900">
            La operación es idempotente: si una cuota ya existe para el miembro y el período, no se
            duplica. Puedes ajustar montos individuales después de generarlas.
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(paying)}
        onClose={() => setPaying(null)}
        title="Registrar pago de membresía"
        description={
          paying
            ? `${paying.full_name} · ${formatMonth(paying.month, paying.year)}. Saldo pendiente: ${formatMoneyBs(paying.balance)}.`
            : undefined
        }
        size="md"
        dismissible={!savingPayment}
        footer={
          <>
            <Button variant="outline" onClick={() => setPaying(null)} disabled={savingPayment}>
              Cancelar
            </Button>
            <Button type="submit" form="payment-form" loading={savingPayment}>
              Registrar pago
            </Button>
          </>
        }
      >
        <form id="payment-form" onSubmit={savePayment} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Monto (Bs)"
              type="number"
              min={0.01}
              max={paying?.balance ?? undefined}
              step="0.01"
              value={paymentForm.amount}
              onChange={(event) =>
                setPaymentForm((current) => ({ ...current, amount: event.target.value }))
              }
              required
              hint="Puede ser un pago parcial."
            />
            <Input
              label="Fecha del pago"
              type="date"
              value={paymentForm.paidAt}
              onChange={(event) =>
                setPaymentForm((current) => ({ ...current, paidAt: event.target.value }))
              }
              required
            />
            <Select
              label="Método"
              value={paymentForm.method}
              onChange={(event) =>
                setPaymentForm((current) => ({ ...current, method: event.target.value }))
              }
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
            <Input
              label="Referencia"
              value={paymentForm.reference}
              onChange={(event) =>
                setPaymentForm((current) => ({ ...current, reference: event.target.value }))
              }
              placeholder="N.º de comprobante, transferencia…"
            />
          </div>
          <Textarea
            label="Notas"
            value={paymentForm.notes}
            onChange={(event) =>
              setPaymentForm((current) => ({ ...current, notes: event.target.value }))
            }
            rows={2}
            placeholder="Observaciones del pago (opcional)."
          />
          {paymentError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {paymentError}
            </p>
          )}
        </form>
      </Modal>

      {historyFor && (
        <PaymentHistoryModal
          obligation={historyFor}
          canWrite={writer}
          onClose={() => setHistoryFor(null)}
          onChanged={reload}
        />
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Editar obligación mensual"
        description={
          editing
            ? `${editing.full_name} · ${formatMonth(editing.month, editing.year)}. El monto no puede ser menor a lo ya pagado.`
            : undefined
        }
        size="md"
        dismissible={!savingObligation}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={savingObligation}>
              Cancelar
            </Button>
            <Button type="submit" form="obligation-form" loading={savingObligation}>
              Guardar cambios
            </Button>
          </>
        }
      >
        <form id="obligation-form" onSubmit={saveObligation} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Monto esperado (Bs)"
              type="number"
              min={0}
              step="0.01"
              value={obligationForm.expected}
              onChange={(event) =>
                setObligationForm((current) => ({ ...current, expected: event.target.value }))
              }
              required
            />
            <Input
              label="Vencimiento"
              type="date"
              value={obligationForm.dueDate}
              onChange={(event) =>
                setObligationForm((current) => ({ ...current, dueDate: event.target.value }))
              }
            />
          </div>
          <Checkbox
            label="Marcar como exenta"
            description="Una obligación exenta no permite registrar pagos y no suma deuda."
            checked={obligationForm.waived}
            onChange={(event) =>
              setObligationForm((current) => ({ ...current, waived: event.target.checked }))
            }
          />
          <Textarea
            label="Notas internas"
            value={obligationForm.notes}
            onChange={(event) =>
              setObligationForm((current) => ({ ...current, notes: event.target.value }))
            }
            rows={3}
          />
          {obligationError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {obligationError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(annulling)}
        onClose={() => setAnnulling(null)}
        title="Anular obligación mensual"
        description={`${annulling?.full_name ?? 'El miembro'} · ${
          annulling ? formatMonth(annulling.month, annulling.year) : ''
        }. La obligación se conserva para auditoría, pero deja de contar como deuda. No se puede anular una cuota con pagos confirmados.`}
        confirmLabel="Anular obligación"
        requireReason
        reasonLabel="Motivo de la anulación"
        loading={annulLoading}
        onConfirm={(reason) => void confirmAnnul(reason)}
      />
    </>
  );
}

function PaymentHistoryModal({
  obligation,
  canWrite,
  onClose,
  onChanged,
}: {
  obligation: MembershipObligation;
  canWrite: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [reversing, setReversing] = useState<MembershipPaymentEntry | null>(null);
  const [reversingLoading, setReversingLoading] = useState(false);

  const { data, loading, error, reload } = useAsync<MembershipPaymentEntry[]>(
    () => getPaymentEntries(obligation.id),
    [obligation.id],
  );

  async function confirmReversal(reason: string) {
    if (!reversing) return;
    setReversingLoading(true);
    try {
      await reverseMembershipPayment(reversing.id, reason);
      success('Pago revertido. El ingreso también quedó anulado en caja.');
      setReversing(null);
      reload();
      onChanged();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo revertir el pago.'));
    } finally {
      setReversingLoading(false);
    }
  }

  const entries = data ?? [];

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={`Pagos de ${obligation.full_name}`}
        description={`${formatMonth(obligation.month, obligation.year)} · Esperado ${formatMoneyBs(
          obligation.expected,
        )} · Pagado ${formatMoneyBs(obligation.paid)}`}
        size="lg"
        footer={
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        }
      >
        {loading ? (
          <LoadingBlock message="Cargando historial de pagos…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : entries.length === 0 ? (
          <EmptyState
            compact
            icon={Receipt}
            title="Sin pagos registrados"
            description="Esta obligación todavía no tiene pagos. Puedes registrar un pago parcial o el total."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2.5 text-left">Fecha</th>
                  <th className="px-3 py-2.5 text-right">Monto</th>
                  <th className="px-3 py-2.5 text-left">Método</th>
                  <th className="px-3 py-2.5 text-left">Referencia</th>
                  <th className="px-3 py-2.5 text-left">Estado</th>
                  <th className="px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-3 text-slate-700">{formatDate(entry.paid_at)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900">
                      {formatMoneyBs(entry.amount)}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{entry.method || '—'}</td>
                    <td className="px-3 py-3 text-slate-600">{entry.reference || '—'}</td>
                    <td className="px-3 py-3">
                      <Badge tone={entry.status === 'CONFIRMADO' ? 'success' : 'neutral'}>
                        {entry.status === 'CONFIRMADO' ? 'Confirmado' : 'Anulado'}
                      </Badge>
                      {entry.annul_reason && (
                        <p className="mt-1 max-w-[180px] text-[10px] text-slate-400">
                          {entry.annul_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end">
                        {canWrite && entry.status === 'CONFIRMADO' && (
                          <button
                            type="button"
                            onClick={() => setReversing(entry)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                          >
                            Revertir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Revertir un pago anula también su movimiento de caja. El registro original y el motivo se
          conservan para auditoría.
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(reversing)}
        onClose={() => setReversing(null)}
        title="Revertir pago"
        description={`Se revertirá un pago de ${formatMoneyBs(
          reversing?.amount ?? 0,
        )} del ${formatDate(reversing?.paid_at)}. La obligación volverá a mostrar el saldo pendiente.`}
        confirmLabel="Revertir pago"
        requireReason
        reasonLabel="Motivo del reverso"
        loading={reversingLoading}
        onConfirm={(reason) => void confirmReversal(reason)}
      />
    </>
  );
}
