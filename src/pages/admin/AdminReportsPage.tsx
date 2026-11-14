import { useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Download,
  Landmark,
  Printer,
  Receipt,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import {
  getCashMonthly,
  getCashSummary,
  getExpenseCategories,
  getRaceFinancials,
} from '../../services/finance';
import { getMemberDebt, getMembershipSummary } from '../../services/members';
import type {
  CashMonthly,
  CashSummary,
  ExpenseCategorySummary,
  MemberDebt,
  MembershipSummary,
  RaceFinancial,
} from '../../types';
import {
  currentMonth,
  formatDate,
  formatDateTime,
  formatMonth,
  formatMoneyBs,
  monthKey,
  todayISO,
  yearOptions,
} from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { SearchInput } from '../../components/ui/SearchInput';
import { StatCard } from '../../components/ui/StatCard';
import { Tabs } from '../../components/ui/Tabs';

interface PageData {
  summary: CashSummary;
  monthly: CashMonthly[];
  expenseCategories: ExpenseCategorySummary[];
  raceFinancials: RaceFinancial[];
  membershipSummary: MembershipSummary[];
  debt: MemberDebt[];
}

type ReportTab = 'caja' | 'membresias' | 'carreras';

const YEARS = yearOptions(8);

const REPORT_DATE = new Date();

export function AdminReportsPage() {
  const period = currentMonth();
  const [tab, setTab] = useState<ReportTab>('caja');
  const [year, setYear] = useState(period.year);
  const [debtSearch, setDebtSearch] = useState('');
  const [raceSearch, setRaceSearch] = useState('');

  const { data, loading, error, reload } = useAsync<PageData>(async () => {
    const [summary, monthly, expenseCategories, raceFinancials, membershipSummary, debt] =
      await Promise.all([
        getCashSummary(),
        getCashMonthly(),
        getExpenseCategories(),
        getRaceFinancials(),
        getMembershipSummary(),
        getMemberDebt(),
      ]);
    return {
      summary,
      monthly,
      expenseCategories,
      raceFinancials,
      membershipSummary,
      debt,
    };
  }, []);

  const summary = data?.summary ?? {
    total_income: 0,
    total_expenses: 0,
    balance: 0,
    opening_balance: 0,
    movements_count: 0,
  };
  const monthly = data?.monthly ?? [];
  const expenseCategories = data?.expenseCategories ?? [];
  const raceFinancials = useMemo(() => data?.raceFinancials ?? [], [data]);
  const membershipSummary = useMemo(() => data?.membershipSummary ?? [], [data]);
  const debt = useMemo(() => data?.debt ?? [], [data]);

  const yearSummary = useMemo(
    () => membershipSummary.filter((row) => row.year === year),
    [membershipSummary, year],
  );

  const membershipTotals = useMemo(
    () =>
      yearSummary.reduce(
        (totals, row) => ({
          obligations: totals.obligations + row.obligations,
          expected: totals.expected + row.expected_total,
          paid: totals.paid + row.paid_total,
          pending: totals.pending + row.pending_total,
          overdue: totals.overdue + row.overdue_count,
        }),
        { obligations: 0, expected: 0, paid: 0, pending: 0, overdue: 0 },
      ),
    [yearSummary],
  );

  const collectionRate =
    membershipTotals.expected > 0
      ? Math.round((membershipTotals.paid / membershipTotals.expected) * 100)
      : 0;

  const filteredDebt = useMemo(() => {
    const term = debtSearch.trim().toLowerCase();
    if (!term) return debt;
    return debt.filter((row) =>
      [row.full_name, row.member_type, row.member_status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [debt, debtSearch]);

  const filteredRaces = useMemo(() => {
    const term = raceSearch.trim().toLowerCase();
    if (!term) return raceFinancials;
    return raceFinancials.filter((row) =>
      [row.name, row.status, row.date]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [raceFinancials, raceSearch]);

  const raceTotals = useMemo(
    () =>
      filteredRaces.reduce(
        (totals, row) => ({
          expenses: totals.expenses + row.expenses_total,
          income: totals.income + row.income_total,
          budget: totals.budget + row.budget_total,
          difference: totals.difference + row.budget_difference,
        }),
        { expenses: 0, income: 0, budget: 0, difference: 0 },
      ),
    [filteredRaces],
  );

  const expenseTotal = expenseCategories.reduce((total, row) => total + row.total, 0);
  const pendingDebt = debt.reduce((total, row) => total + row.pending_amount, 0);
  const overdueDebt = debt.reduce((total, row) => total + row.overdue_amount, 0);

  function exportCaja() {
    downloadCsv(
      `reporte-caja-${todayISO()}`,
      ['Mes', 'Ingresos operativos', 'Egresos', 'Neto operativo'],
      monthly.map((row) => [
        row.month_key,
        row.operating_income,
        row.expenses,
        row.net,
      ]),
    );
  }

  function exportExpenseCategories() {
    downloadCsv(
      `reporte-gastos-categoria-${todayISO()}`,
      ['Categoría', 'Cantidad', 'Total'],
      expenseCategories.map((row) => [row.category, row.count, row.total]),
    );
  }

  function exportMembresias() {
    downloadCsv(
      `reporte-membresias-${year}`,
      [
        'Mes',
        'Obligaciones',
        'Esperado',
        'Pagado',
        'Pendiente',
        'Pagadas',
        'Pendientes',
        'Vencidas',
      ],
      yearSummary.map((row) => [
        monthKey(row.year, row.month),
        row.obligations,
        row.expected_total,
        row.paid_total,
        row.pending_total,
        row.paid_count,
        row.pending_count,
        row.overdue_count,
      ]),
    );
  }

  function exportDebt() {
    downloadCsv(
      `reporte-deuda-${todayISO()}`,
      ['Miembro', 'Tipo', 'Estado', 'Periodos pendientes', 'Monto pendiente', 'Monto vencido'],
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

  function exportRaces() {
    downloadCsv(
      `reporte-carreras-${todayISO()}`,
      [
        'Carrera',
        'Fecha',
        'Estado',
        'Ingresos',
        'Gastos',
        'Presupuesto',
        'Diferencia presupuesto',
      ],
      filteredRaces.map((row) => [
        row.name,
        row.date,
        row.status,
        row.income_total,
        row.expenses_total,
        row.budget_total,
        row.budget_difference,
      ]),
    );
  }

  function exportCurrent() {
    if (tab === 'caja') {
      exportCaja();
      exportExpenseCategories();
    } else if (tab === 'membresias') {
      exportMembresias();
      exportDebt();
    } else {
      exportRaces();
    }
  }

  function currentExportDisabled(): boolean {
    if (tab === 'caja') return monthly.length === 0 && expenseCategories.length === 0;
    if (tab === 'membresias') return yearSummary.length === 0 && filteredDebt.length === 0;
    return filteredRaces.length === 0;
  }

  const tabs = [
    { id: 'caja', label: 'Caja y gastos' },
    { id: 'membresias', label: 'Membresías' },
    { id: 'carreras', label: 'Carreras' },
  ];

  return (
    <>
      <div className="hidden print:mb-6 print:block">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Trinx Bolivia · Reporte interno
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">
          Reporte de {tab === 'caja' ? 'caja y gastos' : tab === 'membresias' ? 'membresías' : 'carreras'}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Generado el {formatDateTime(REPORT_DATE)} · Información sujeta a auditoría
        </p>
      </div>

      <PageHeader
        className="no-print"
        eyebrow="Finanzas"
        title="Reportes"
        description="Consolidado de caja, membresías y carreras. Exporta la sección activa en CSV o imprime el reporte."
        actions={
          <>
            <Button
              variant="outline"
              onClick={exportCurrent}
              disabled={currentExportDisabled()}
              startIcon={<Download className="h-4 w-4" />}
            >
              Exportar CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.print()}
              startIcon={<Printer className="h-4 w-4" />}
            >
              Imprimir
            </Button>
          </>
        }
      />

      <Tabs
        className="no-print mb-5"
        value={tab}
        onChange={(value) => setTab(value as ReportTab)}
        items={tabs}
        ariaLabel="Reportes disponibles"
      />

      {loading ? (
        <LoadingBlock message="Consolidando reportes…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : tab === 'caja' ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Saldo de caja"
              value={formatMoneyBs(summary.balance)}
              hint={`${summary.movements_count} movimientos confirmados`}
              icon={Wallet}
              tone={summary.balance < 0 ? 'rose' : 'emerald'}
            />
            <StatCard
              label="Ingresos confirmados"
              value={formatMoneyBs(summary.total_income)}
              hint={`Incluye ${formatMoneyBs(summary.opening_balance)} de apertura`}
              icon={TrendingUp}
              tone="brand"
            />
            <StatCard
              label="Egresos confirmados"
              value={formatMoneyBs(summary.total_expenses)}
              hint="Gastos operativos y de carrera"
              icon={TrendingDown}
              tone="amber"
            />
            <StatCard
              label="Saldo inicial"
              value={formatMoneyBs(summary.opening_balance)}
              hint="No se cuenta como ingreso operativo"
              icon={Landmark}
              tone="sky"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
            <Card className="print-break">
              <CardHeader
                title="Evolución mensual de caja"
                description="Ingresos operativos, egresos y neto. El saldo inicial se muestra por separado."
                actions={<Badge tone="neutral">{monthly.length} meses</Badge>}
              />
              {monthly.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    compact
                    icon={BarChart3}
                    title="Sin movimientos confirmados"
                    description="Cuando registres ingresos o gastos, el consolidado mensual aparecerá aquí."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3 text-left">Mes</th>
                        <th className="px-4 py-3 text-right">Ingresos</th>
                        <th className="px-4 py-3 text-right">Egresos</th>
                        <th className="px-4 py-3 text-right">Neto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthly.slice(-12).reverse().map((row) => {
                        const [rowYear, rowMonth] = row.month_key.split('-').map(Number);
                        return (
                          <tr key={row.month_key}>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {formatMonth(rowMonth, rowYear)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                              {formatMoneyBs(row.operating_income)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-rose-700">
                              {formatMoneyBs(row.expenses)}
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-semibold tabular-nums ${
                                row.net < 0 ? 'text-rose-700' : 'text-slate-900'
                              }`}
                            >
                              {formatMoneyBs(row.net)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="print-break">
              <CardHeader
                title="Gastos por categoría"
                description="Acumulado histórico de egresos confirmados."
              />
              <CardBody className="space-y-3">
                {expenseCategories.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Receipt}
                    title="Sin gastos registrados"
                    description="Las categorías aparecerán al registrar el primer gasto."
                  />
                ) : (
                  <>
                    {expenseCategories.map((row) => {
                      const share =
                        expenseTotal > 0 ? Math.round((row.total / expenseTotal) * 100) : 0;
                      return (
                        <div key={row.category}>
                          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                            <span className="truncate font-medium text-slate-700">
                              {row.category}
                            </span>
                            <span className="shrink-0 tabular-nums text-slate-500">
                              {formatMoneyBs(row.total)} · {share}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[var(--brand)]"
                              style={{ width: `${Math.max(share, 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                      Total histórico: <strong>{formatMoneyBs(expenseTotal)}</strong>
                    </p>
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      ) : tab === 'membresias' ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
                aria-label="Año del reporte"
              >
                {YEARS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">{yearSummary.length} meses con cuotas</span>
            </div>
            <span className="text-xs text-slate-500">
              Deuda pendiente total: <strong>{formatMoneyBs(pendingDebt)}</strong> · vencida:{' '}
              <strong className="text-rose-700">{formatMoneyBs(overdueDebt)}</strong>
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total esperado"
              value={formatMoneyBs(membershipTotals.expected)}
              hint={`${membershipTotals.obligations} obligaciones en ${year}`}
              icon={CircleDollarSign}
              tone="brand"
            />
            <StatCard
              label="Total cobrado"
              value={formatMoneyBs(membershipTotals.paid)}
              hint={`${collectionRate}% de recaudación`}
              icon={TrendingUp}
              tone="emerald"
            />
            <StatCard
              label="Saldo pendiente"
              value={formatMoneyBs(membershipTotals.pending)}
              hint="Incluye cuotas parciales y vencidas"
              icon={Wallet}
              tone={membershipTotals.pending > 0 ? 'amber' : 'emerald'}
            />
            <StatCard
              label="Cuotas vencidas"
              value={membershipTotals.overdue}
              hint={`${filteredDebt.length} miembros con deuda`}
              icon={Users}
              tone={membershipTotals.overdue > 0 ? 'rose' : 'emerald'}
            />
          </div>

          <Card className="print-break">
            <CardHeader
              title={`Resumen mensual ${year}`}
              description="Consolidado de obligaciones generadas, cobradas y pendientes por mes."
            />
            {yearSummary.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  compact
                  icon={BarChart3}
                  title="Sin cuotas en este año"
                  description="Genera obligaciones desde Membresías para ver el consolidado anual."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 text-left">Mes</th>
                      <th className="px-4 py-3 text-right">Obligaciones</th>
                      <th className="px-4 py-3 text-right">Esperado</th>
                      <th className="px-4 py-3 text-right">Pagado</th>
                      <th className="px-4 py-3 text-right">Pendiente</th>
                      <th className="px-4 py-3 text-right">Cobradas</th>
                      <th className="px-4 py-3 text-right">Vencidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {yearSummary.map((row) => (
                      <tr key={`${row.year}-${row.month}`}>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {formatMonth(row.month, row.year)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                          {row.obligations}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          {formatMoneyBs(row.expected_total)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                          {formatMoneyBs(row.paid_total)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right tabular-nums ${
                            row.pending_total > 0 ? 'text-amber-700' : 'text-slate-500'
                          }`}
                        >
                          {formatMoneyBs(row.pending_total)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                          {row.paid_count}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span
                            className={
                              row.overdue_count > 0
                                ? 'font-semibold text-rose-700'
                                : 'text-slate-500'
                            }
                          >
                            {row.overdue_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="print-break">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Deuda por miembro</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Saldos pendientes y vencidos de todo el historial. No incluye obligaciones anuladas.
                </p>
              </div>
              <SearchInput
                value={debtSearch}
                onChange={setDebtSearch}
                placeholder="Buscar miembro…"
                className="w-full sm:ml-auto sm:max-w-xs"
              />
            </div>
            {filteredDebt.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  compact
                  icon={Users}
                  title={debt.length === 0 ? 'Sin deudas pendientes' : 'Sin coincidencias'}
                  description={
                    debt.length === 0
                      ? 'Todas las cuotas registradas están pagadas o exentas.'
                      : 'Prueba con otro nombre o tipo de miembro.'
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
                      <th className="px-4 py-3 text-right">Periodos</th>
                      <th className="px-4 py-3 text-right">Pendiente</th>
                      <th className="px-4 py-3 text-right">Vencido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDebt.map((row) => (
                      <tr key={row.member_id}>
                        <td className="px-4 py-3" data-label="Miembro">
                          <p className="font-medium text-slate-900">{row.full_name}</p>
                          <p className="text-[11px] text-slate-500">{row.member_status}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600" data-label="Tipo">
                          {row.member_type}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums" data-label="Periodos">
                          {row.pending_periods}
                        </td>
                        <td
                          className="px-4 py-3 text-right font-semibold tabular-nums text-amber-700"
                          data-label="Pendiente"
                        >
                          {formatMoneyBs(row.pending_amount)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right tabular-nums ${
                            row.overdue_amount > 0
                              ? 'font-semibold text-rose-700'
                              : 'text-slate-400'
                          }`}
                          data-label="Vencido"
                        >
                          {formatMoneyBs(row.overdue_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Carreras con finanzas"
              value={filteredRaces.length}
              hint="Incluye todas las carreras registradas"
              icon={CalendarDays}
              tone="brand"
            />
            <StatCard
              label="Gastos de carrera"
              value={formatMoneyBs(raceTotals.expenses)}
              hint="Egresos confirmados asignados"
              icon={TrendingDown}
              tone="amber"
            />
            <StatCard
              label="Ingresos de carrera"
              value={formatMoneyBs(raceTotals.income)}
              hint="Ingresos vinculados a carreras"
              icon={TrendingUp}
              tone="emerald"
            />
            <StatCard
              label="Diferencia presupuestaria"
              value={formatMoneyBs(raceTotals.difference)}
              hint={`Presupuesto: ${formatMoneyBs(raceTotals.budget)}`}
              icon={Landmark}
              tone={raceTotals.difference < 0 ? 'rose' : 'sky'}
            />
          </div>

          <Card className="print-break">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Resultado por carrera</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Comparación entre presupuesto, gasto real e ingresos vinculados.
                </p>
              </div>
              <SearchInput
                value={raceSearch}
                onChange={setRaceSearch}
                placeholder="Buscar carrera…"
                className="w-full sm:ml-auto sm:max-w-xs"
              />
            </div>
            {filteredRaces.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={BarChart3}
                  title={
                    raceFinancials.length === 0 ? 'Sin carreras registradas' : 'Sin coincidencias'
                  }
                  description={
                    raceFinancials.length === 0
                      ? 'Crea carreras y registra gastos para obtener el consolidado financiero.'
                      : 'Prueba con otro nombre o estado.'
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table responsive-table w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 text-left">Carrera</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-right">Ingresos</th>
                      <th className="px-4 py-3 text-right">Gastos</th>
                      <th className="px-4 py-3 text-right">Presupuesto</th>
                      <th className="px-4 py-3 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRaces.map((row) => (
                      <tr key={row.race_id}>
                        <td className="px-4 py-3 font-medium text-slate-900" data-label="Carrera">
                          {row.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600" data-label="Fecha">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-4 py-3" data-label="Estado">
                          <Badge tone="neutral">{row.status.replaceAll('_', ' ')}</Badge>
                        </td>
                        <td
                          className="px-4 py-3 text-right tabular-nums text-emerald-700"
                          data-label="Ingresos"
                        >
                          {formatMoneyBs(row.income_total)}
                        </td>
                        <td
                          className="px-4 py-3 text-right tabular-nums text-rose-700"
                          data-label="Gastos"
                        >
                          {formatMoneyBs(row.expenses_total)}
                        </td>
                        <td
                          className="px-4 py-3 text-right tabular-nums text-slate-600"
                          data-label="Presupuesto"
                        >
                          {formatMoneyBs(row.budget_total)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold tabular-nums ${
                            row.budget_difference < 0 ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                          data-label="Diferencia"
                        >
                          {formatMoneyBs(row.budget_difference)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50/70 text-sm font-semibold text-slate-900">
                      <td className="px-4 py-3" colSpan={3}>
                        Totales ({filteredRaces.length} carreras)
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoneyBs(raceTotals.income)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoneyBs(raceTotals.expenses)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoneyBs(raceTotals.budget)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${
                          raceTotals.difference < 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {formatMoneyBs(raceTotals.difference)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      <p className="no-print mt-6 text-[11px] leading-relaxed text-slate-400">
        Los reportes se calculan con las vistas de Supabase y solo incluyen movimientos
        confirmados. Las obligaciones anuladas y los movimientos revertidos quedan excluidos de
        los totales, pero permanecen en la auditoría.
      </p>
    </>
  );
}
