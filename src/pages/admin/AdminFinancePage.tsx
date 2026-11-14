import { useMemo, useState, type FormEvent } from 'react';
import {
  Ban,
  Building2,
  Download,
  FileText,
  Landmark,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import {
  deleteBudget,
  getBudgets,
  getCashLedger,
  getCashMonthly,
  getCashSummary,
  getExpenseCategories,
  getExpenses,
  getRaceFinancials,
  registerExpense,
  reverseExpense,
  reverseOpeningBalance,
  setOpeningBalance,
  updateBudget,
  upsertBudget,
  type ExpenseInput,
} from '../../services/finance';
import { getAdminRaces } from '../../services/races';
import { getReceiptSignedUrl } from '../../services/storage';
import { canWriteFinance, isAdmin } from '../../lib/permissions';
import { errorMessage } from '../../lib/errors';
import type {
  CashLedgerRow,
  CashMonthly,
  CashSummary,
  ExpenseCategorySummary,
  ExpenseDetail,
  Race,
  RaceBudget,
  RaceFinancial,
} from '../../types';
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from '../../constants';
import {
  formatDate,
  formatMonth,
  formatMoneyBs,
  todayISO,
} from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { SearchInput } from '../../components/ui/SearchInput';
import { StatCard } from '../../components/ui/StatCard';
import { Tabs } from '../../components/ui/Tabs';
import { ReceiptUpload } from '../../components/ui/ReceiptUpload';
import { ReadOnlyNotice } from '../../components/admin/ReadOnlyNotice';

interface PageData {
  summary: CashSummary;
  monthly: CashMonthly[];
  ledger: CashLedgerRow[];
  expenses: ExpenseDetail[];
  expenseCategories: ExpenseCategorySummary[];
  budgets: RaceBudget[];
  races: Race[];
  raceFinancials: RaceFinancial[];
}

interface ExpenseForm {
  date: string;
  concept: string;
  category: string;
  amount: string;
  method: string;
  raceId: string;
  beneficiary: string;
  receiptPath: string | null;
  notes: string;
}

interface BudgetForm {
  raceId: string;
  category: string;
  budgeted: string;
  notes: string;
}

function emptyExpense(): ExpenseForm {
  return {
    date: todayISO(),
    concept: '',
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    method: 'Efectivo',
    raceId: '',
    beneficiary: '',
    receiptPath: null,
    notes: '',
  };
}

function emptyBudget(): BudgetForm {
  return {
    raceId: '',
    category: EXPENSE_CATEGORIES[0],
    budgeted: '',
    notes: '',
  };
}

export function AdminFinancePage() {
  const { profile } = useAuth();
  const { success, error: toastError } = useToast();
  const writer = canWriteFinance(profile?.role);
  const admin = isAdmin(profile?.role);

  const [tab, setTab] = useState<'caja' | 'gastos' | 'presupuestos'>('caja');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [ledgerType, setLedgerType] = useState('');
  const [ledgerStatus, setLedgerStatus] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');

  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseFrom, setExpenseFrom] = useState('');
  const [expenseTo, setExpenseTo] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseRace, setExpenseRace] = useState('');
  const [expenseStatus, setExpenseStatus] = useState('');

  const [budgetRaceFilter, setBudgetRaceFilter] = useState('');

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpense());
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [reversingExpense, setReversingExpense] = useState<ExpenseDetail | null>(null);
  const [expenseReversalLoading, setExpenseReversalLoading] = useState(false);

  const [budgetOpen, setBudgetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<RaceBudget | null>(null);
  const [budgetForm, setBudgetForm] = useState<BudgetForm>(emptyBudget());
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<RaceBudget | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const [openingOpen, setOpeningOpen] = useState(false);
  const [openingForm, setOpeningForm] = useState({
    amount: '',
    date: todayISO(),
    concept: 'Saldo inicial de caja',
  });
  const [savingOpening, setSavingOpening] = useState(false);
  const [openingError, setOpeningError] = useState<string | null>(null);
  const [openingReversalOpen, setOpeningReversalOpen] = useState(false);
  const [openingReversalLoading, setOpeningReversalLoading] = useState(false);
  const [openingReceiptLoading, setOpeningReceiptLoading] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsync<PageData>(async () => {
    const [
      summary,
      monthly,
      ledger,
      expenses,
      expenseCategories,
      budgets,
      races,
      raceFinancials,
    ] = await Promise.all([
      getCashSummary(),
      getCashMonthly(),
      getCashLedger(),
      getExpenses(),
      getExpenseCategories(),
      getBudgets(),
      getAdminRaces(),
      getRaceFinancials(),
    ]);
    return {
      summary,
      monthly,
      ledger,
      expenses,
      expenseCategories,
      budgets,
      races,
      raceFinancials,
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
  const ledger = useMemo(() => data?.ledger ?? [], [data]);
  const expenses = useMemo(() => data?.expenses ?? [], [data]);
  const expenseCategories = data?.expenseCategories ?? [];
  const budgets = useMemo(() => data?.budgets ?? [], [data]);
  const races = data?.races ?? [];
  const raceFinancials = data?.raceFinancials ?? [];

  const filteredLedger = useMemo(() => {
    const term = ledgerSearch.trim().toLowerCase();
    return ledger.filter((row) => {
      if (from && row.date < from) return false;
      if (to && row.date > to) return false;
      if (ledgerType && row.type !== ledgerType) return false;
      if (ledgerStatus && row.status !== ledgerStatus) return false;
      if (!term) return true;
      return [
        row.concept,
        row.category,
        row.member_name,
        row.race_name,
        row.reference,
        row.method,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [ledger, ledgerSearch, from, to, ledgerType, ledgerStatus]);

  const filteredExpenses = useMemo(() => {
    const term = expenseSearch.trim().toLowerCase();
    return expenses.filter((row) => {
      if (expenseFrom && row.date < expenseFrom) return false;
      if (expenseTo && row.date > expenseTo) return false;
      if (expenseCategory && row.category !== expenseCategory) return false;
      if (expenseRace && row.race_id !== expenseRace) return false;
      if (expenseStatus && row.status !== expenseStatus) return false;
      if (!term) return true;
      return [row.concept, row.category, row.beneficiary, row.race_name, row.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [
    expenses,
    expenseSearch,
    expenseFrom,
    expenseTo,
    expenseCategory,
    expenseRace,
    expenseStatus,
  ]);

  const filteredBudgets = useMemo(
    () => budgets.filter((row) => !budgetRaceFilter || row.race_id === budgetRaceFilter),
    [budgets, budgetRaceFilter],
  );

  const budgetTotal = budgets.reduce((total, row) => total + row.budgeted, 0);
  const raceExpenseTotal = raceFinancials.reduce(
    (total, row) => total + row.expenses_total,
    0,
  );
  const budgetDifference = budgetTotal - raceExpenseTotal;

  const budgetCategoryOptions = useMemo(() => {
    const values = new Set<string>(EXPENSE_CATEGORIES);
    for (const row of budgets) values.add(row.category);
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [budgets]);

  function openExpense() {
    setExpenseForm(emptyExpense());
    setExpenseError(null);
    setExpenseOpen(true);
  }

  function updateExpenseForm<K extends keyof ExpenseForm>(key: K, value: ExpenseForm[K]) {
    setExpenseForm((current) => ({ ...current, [key]: value }));
  }

  async function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!writer) return;
    setExpenseError(null);
    setSavingExpense(true);
    try {
      const payload: ExpenseInput = {
        date: expenseForm.date,
        concept: expenseForm.concept,
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        method: expenseForm.method || null,
        raceId: expenseForm.raceId || null,
        beneficiary: expenseForm.beneficiary,
        receiptPath: expenseForm.receiptPath,
        notes: expenseForm.notes,
      };
      await registerExpense(payload);
      success('Gasto registrado. El egreso ya está reflejado en caja.');
      setExpenseOpen(false);
      reload();
    } catch (err) {
      setExpenseError(errorMessage(err, 'No se pudo registrar el gasto.'));
    } finally {
      setSavingExpense(false);
    }
  }

  async function confirmExpenseReversal(reason: string) {
    if (!reversingExpense) return;
    setExpenseReversalLoading(true);
    try {
      await reverseExpense(reversingExpense.id, reason);
      success('Gasto revertido. El movimiento de caja quedó anulado.');
      setReversingExpense(null);
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo revertir el gasto.'));
    } finally {
      setExpenseReversalLoading(false);
    }
  }

  function openBudgetCreate() {
    setEditingBudget(null);
    setBudgetForm(emptyBudget());
    setBudgetError(null);
    setBudgetOpen(true);
  }

  function openBudgetEdit(budget: RaceBudget) {
    setEditingBudget(budget);
    setBudgetForm({
      raceId: budget.race_id,
      category: budget.category,
      budgeted: String(budget.budgeted),
      notes: budget.notes ?? '',
    });
    setBudgetError(null);
    setBudgetOpen(true);
  }

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!writer) return;
    setBudgetError(null);
    setSavingBudget(true);
    try {
      if (!budgetForm.raceId) throw new Error('Selecciona la carrera.');
      const input = {
        race_id: budgetForm.raceId,
        category: budgetForm.category,
        budgeted: Number(budgetForm.budgeted),
        notes: budgetForm.notes,
      };

      if (editingBudget) {
        await updateBudget(editingBudget.id, input);
        success('Presupuesto actualizado.');
      } else {
        await upsertBudget(input);
        success('Presupuesto guardado.');
      }

      setBudgetOpen(false);
      reload();
    } catch (err) {
      setBudgetError(errorMessage(err, 'No se pudo guardar el presupuesto.'));
    } finally {
      setSavingBudget(false);
    }
  }

  async function confirmDeleteBudget() {
    if (!deletingBudget) return;
    setDeletingLoading(true);
    try {
      await deleteBudget(deletingBudget.id);
      success('Presupuesto eliminado.');
      setDeletingBudget(null);
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo eliminar el presupuesto.'));
    } finally {
      setDeletingLoading(false);
    }
  }

  function openOpening() {
    setOpeningForm({
      amount: '',
      date: todayISO(),
      concept: 'Saldo inicial de caja',
    });
    setOpeningError(null);
    setOpeningOpen(true);
  }

  async function saveOpening(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!admin) return;
    setOpeningError(null);
    setSavingOpening(true);
    try {
      await setOpeningBalance(
        Number(openingForm.amount),
        openingForm.date,
        openingForm.concept,
      );
      success('Saldo inicial registrado.');
      setOpeningOpen(false);
      reload();
    } catch (err) {
      setOpeningError(errorMessage(err, 'No se pudo registrar el saldo inicial.'));
    } finally {
      setSavingOpening(false);
    }
  }

  async function confirmOpeningReversal(reason: string) {
    setOpeningReversalLoading(true);
    try {
      await reverseOpeningBalance(reason);
      success('Saldo inicial revertido. Puedes registrar uno nuevo si corresponde.');
      setOpeningReversalOpen(false);
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo revertir el saldo inicial.'));
    } finally {
      setOpeningReversalLoading(false);
    }
  }

  async function openReceipt(path: string) {
    setOpeningReceiptLoading(path);
    const newTab = window.open('', '_blank', 'noopener,noreferrer');
    try {
      const url = await getReceiptSignedUrl(path);
      if (newTab) newTab.location.href = url;
      else window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      newTab?.close();
      toastError(errorMessage(err, 'No se pudo abrir el comprobante.'));
    } finally {
      setOpeningReceiptLoading(null);
    }
  }

  function exportLedger() {
    downloadCsv(
      `caja-${todayISO()}`,
      ['Fecha', 'Tipo', 'Concepto', 'Categoría', 'Monto', 'Método', 'Referencia', 'Miembro', 'Carrera', 'Origen', 'Estado'],
      filteredLedger.map((row) => [
        row.date,
        row.type,
        row.concept,
        row.category,
        row.amount,
        row.method,
        row.reference,
        row.member_name,
        row.race_name,
        row.source_type,
        row.status,
      ]),
    );
  }

  function exportExpenses() {
    downloadCsv(
      `gastos-${todayISO()}`,
      ['Fecha', 'Concepto', 'Categoría', 'Monto', 'Carrera', 'Beneficiario', 'Método', 'Estado', 'Notas', 'Motivo anulación'],
      filteredExpenses.map((row) => [
        row.date,
        row.concept,
        row.category,
        row.amount,
        row.race_name,
        row.beneficiary,
        row.method,
        row.status,
        row.notes,
        row.annul_reason,
      ]),
    );
  }

  const tabs = [
    { id: 'caja', label: 'Libro de caja', count: ledger.length },
    { id: 'gastos', label: 'Gastos', count: expenses.length },
    { id: 'presupuestos', label: 'Presupuestos', count: budgets.length },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Finanzas"
        title="Caja y gastos"
        description="Libro de caja, gastos con comprobante privado y presupuestos por carrera. Los saldos se calculan en el servidor."
        actions={
          <>
            <Button
              variant="outline"
              onClick={tab === 'gastos' ? exportExpenses : exportLedger}
              disabled={tab === 'presupuestos' || (tab === 'gastos' ? filteredExpenses.length === 0 : filteredLedger.length === 0)}
              startIcon={<Download className="h-4 w-4" />}
            >
              Exportar CSV
            </Button>
            {writer && tab !== 'presupuestos' && (
              <Button onClick={openExpense} startIcon={<Plus className="h-4 w-4" />}>
                Nuevo gasto
              </Button>
            )}
            {writer && tab === 'presupuestos' && (
              <Button onClick={openBudgetCreate} startIcon={<Plus className="h-4 w-4" />}>
                Nuevo presupuesto
              </Button>
            )}
          </>
        }
      />

      {!writer && (
        <ReadOnlyNotice message="Mesa directiva puede consultar el libro de caja, gastos y presupuestos. Solo administración o tesorería pueden registrar movimientos." />
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          hint={summary.opening_balance > 0 ? 'Apertura registrada' : 'Sin saldo inicial'}
          icon={Landmark}
          tone="sky"
        />
      </div>

      <Tabs
        className="mb-5"
        value={tab}
        onChange={(value) => setTab(value as 'caja' | 'gastos' | 'presupuestos')}
        items={tabs}
      />

      {loading ? (
        <LoadingBlock message="Cargando información financiera…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : tab === 'caja' ? (
        <div className="space-y-5">
          <Card>
            <div className="grid gap-3 border-b border-slate-100 p-4 xl:grid-cols-[minmax(0,1fr)_auto]">
              <SearchInput
                value={ledgerSearch}
                onChange={setLedgerSearch}
                placeholder="Buscar concepto, miembro, carrera o referencia…"
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
                  value={ledgerType}
                  onChange={(event) => setLedgerType(event.target.value)}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
                  aria-label="Tipo de movimiento"
                >
                  <option value="">Todos</option>
                  <option value="INGRESO">Ingresos</option>
                  <option value="EGRESO">Egresos</option>
                </select>
                <select
                  value={ledgerStatus}
                  onChange={(event) => setLedgerStatus(event.target.value)}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
                  aria-label="Estado del movimiento"
                >
                  <option value="">Todos los estados</option>
                  <option value="CONFIRMADO">Confirmados</option>
                  <option value="ANULADO">Anulados</option>
                </select>
              </div>
            </div>

            {filteredLedger.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={Wallet}
                  title={ledger.length === 0 ? 'Sin movimientos de caja' : 'Sin coincidencias'}
                  description={
                    ledger.length === 0
                      ? 'Los ingresos y gastos aparecerán aquí en cuanto se registren.'
                      : 'Ajusta los filtros o el término de búsqueda.'
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
                      <th className="px-4 py-3 text-left">Categoría</th>
                      <th className="px-4 py-3 text-left">Origen</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLedger.map((row) => (
                      <tr key={row.id} className="transition hover:bg-slate-50/70">
                        <td className="px-4 py-3 text-slate-600" data-label="Fecha">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-4 py-3" data-label="Concepto">
                          <p className="font-medium text-slate-900">{row.concept}</p>
                          <p className="text-[11px] text-slate-500">
                            {[row.method, row.reference].filter(Boolean).join(' · ') ||
                              'Sin método'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-600" data-label="Categoría">
                          {row.category || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600" data-label="Origen">
                          {row.member_name || row.race_name || row.source_type || '—'}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold tabular-nums ${
                            row.type === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                          data-label="Monto"
                        >
                          {row.type === 'INGRESO' ? '+' : '−'}
                          {formatMoneyBs(row.amount)}
                        </td>
                        <td className="px-4 py-3" data-label="Estado">
                          <Badge tone={row.status === 'CONFIRMADO' ? 'success' : 'neutral'}>
                            {row.status === 'CONFIRMADO' ? 'Confirmado' : 'Anulado'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <Card>
              <CardHeader
                title="Resumen mensual"
                description="Ingresos operativos y egresos confirmados por mes. El saldo inicial se informa aparte."
              />
              {monthly.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    compact
                    icon={Building2}
                    title="Sin historial mensual"
                    description="Los meses con movimientos confirmados aparecerán aquí."
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
                        <th className="px-4 py-3 text-right">Neto operativo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthly.slice(-12).reverse().map((row) => {
                        const [year, month] = row.month_key.split('-').map(Number);
                        return (
                          <tr key={row.month_key}>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {formatMonth(month, year)}
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

            <Card>
              <CardHeader
                title="Saldo inicial de caja"
                description="Se registra una sola vez y no se mezcla con los ingresos operativos."
              />
              <CardBody className="space-y-3">
                {summary.opening_balance > 0 ? (
                  <>
                    <p className="font-display text-3xl font-bold text-slate-950">
                      {formatMoneyBs(summary.opening_balance)}
                    </p>
                    <p className="text-xs leading-relaxed text-slate-500">
                      Ya existe un saldo inicial confirmado. Si necesitas corregirlo, revierte la
                      apertura y registra el monto correcto.
                    </p>
                    {admin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOpeningReversalOpen(true)}
                        startIcon={<Ban className="h-3.5 w-3.5" />}
                      >
                        Revertir apertura
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">
                      Aún no hay un saldo inicial confirmado. Regístralo para que el saldo de caja
                      refleje el dinero disponible al inicio del control.
                    </p>
                    {admin ? (
                      <Button
                        size="sm"
                        onClick={openOpening}
                        startIcon={<Plus className="h-3.5 w-3.5" />}
                      >
                        Registrar saldo inicial
                      </Button>
                    ) : (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Solo un administrador puede registrar el saldo inicial.
                      </p>
                    )}
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      ) : tab === 'gastos' ? (
        <Card>
          <div className="grid gap-3 border-b border-slate-100 p-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <SearchInput
              value={expenseSearch}
              onChange={setExpenseSearch}
              placeholder="Buscar gasto, beneficiario o carrera…"
              className="w-full"
            />
            <div className="flex flex-wrap gap-2">
              <Input
                type="date"
                value={expenseFrom}
                onChange={(event) => setExpenseFrom(event.target.value)}
                aria-label="Desde"
                className="h-10 py-0"
              />
              <Input
                type="date"
                value={expenseTo}
                onChange={(event) => setExpenseTo(event.target.value)}
                aria-label="Hasta"
                className="h-10 py-0"
              />
              <select
                value={expenseCategory}
                onChange={(event) => setExpenseCategory(event.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
                aria-label="Categoría"
              >
                <option value="">Todas las categorías</option>
                {expenseCategories.map((row) => (
                  <option key={row.category} value={row.category}>
                    {row.category}
                  </option>
                ))}
              </select>
              <select
                value={expenseRace}
                onChange={(event) => setExpenseRace(event.target.value)}
                className="h-10 max-w-[200px] rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
                aria-label="Carrera"
              >
                <option value="">Todas las carreras</option>
                {races.map((race) => (
                  <option key={race.id} value={race.id}>
                    {race.name}
                  </option>
                ))}
              </select>
              <select
                value={expenseStatus}
                onChange={(event) => setExpenseStatus(event.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
                aria-label="Estado"
              >
                <option value="">Todos los estados</option>
                <option value="CONFIRMADO">Confirmados</option>
                <option value="ANULADO">Anulados</option>
              </select>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Receipt}
                title={expenses.length === 0 ? 'Todavía no hay gastos' : 'Sin coincidencias'}
                description={
                  expenses.length === 0
                    ? 'Registra el primer gasto con su comprobante para mantener la caja al día.'
                    : 'Ajusta los filtros o el término de búsqueda.'
                }
                action={
                  expenses.length === 0 && writer ? (
                    <Button onClick={openExpense} startIcon={<Plus className="h-4 w-4" />}>
                      Nuevo gasto
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
                    <th className="px-4 py-3 text-left">Categoría</th>
                    <th className="px-4 py-3 text-left">Carrera</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3 text-left">Comprobante</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((row) => (
                    <tr key={row.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-slate-600" data-label="Fecha">
                        {formatDate(row.date)}
                        <span className="block text-[11px] text-slate-400">
                          {row.status === 'CONFIRMADO' ? 'Confirmado' : 'Anulado'}
                        </span>
                      </td>
                      <td className="px-4 py-3" data-label="Concepto">
                        <p className="font-medium text-slate-900">{row.concept}</p>
                        <p className="text-[11px] text-slate-500">
                          {[row.beneficiary, row.method].filter(Boolean).join(' · ') ||
                            'Sin beneficiario'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600" data-label="Categoría">
                        {row.category || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600" data-label="Carrera">
                        {row.race_name || '—'}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900"
                        data-label="Monto"
                      >
                        {formatMoneyBs(row.amount)}
                      </td>
                      <td className="px-4 py-3" data-label="Comprobante">
                        {row.receipt_path ? (
                          <button
                            type="button"
                            onClick={() => void openReceipt(row.receipt_path!)}
                            disabled={openingReceiptLoading === row.receipt_path}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-dark)] transition hover:underline disabled:opacity-50"
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden />
                            {openingReceiptLoading === row.receipt_path ? 'Abriendo…' : 'Ver'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Sin adjunto</span>
                        )}
                      </td>
                      <td className="px-4 py-3" data-label="Acciones">
                        <div className="flex items-center justify-end gap-1">
                          {row.status === 'CONFIRMADO' ? (
                            writer ? (
                              <button
                                type="button"
                                onClick={() => setReversingExpense(row)}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                                aria-label="Revertir gasto"
                                title="Revertir gasto"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">Solo lectura</span>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-400">Anulado</span>
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
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Presupuesto total
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-950">
                {formatMoneyBs(budgetTotal)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Gastos de carrera
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-950">
                {formatMoneyBs(raceExpenseTotal)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Diferencia
              </p>
              <p
                className={`mt-1 font-display text-2xl font-bold ${
                  budgetDifference < 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {formatMoneyBs(budgetDifference)}
              </p>
            </div>
          </div>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
              <select
                value={budgetRaceFilter}
                onChange={(event) => setBudgetRaceFilter(event.target.value)}
                className="h-10 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
                aria-label="Filtrar presupuestos por carrera"
              >
                <option value="">Todas las carreras</option>
                {races.map((race) => (
                  <option key={race.id} value={race.id}>
                    {race.name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">
                {filteredBudgets.length} de {budgets.length} partidas
              </span>
            </div>

            {filteredBudgets.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={Landmark}
                  title={budgets.length === 0 ? 'Sin presupuestos definidos' : 'Sin coincidencias'}
                  description={
                    budgets.length === 0
                      ? 'Asigna un presupuesto por carrera y categoría para comparar con los gastos reales.'
                      : 'Prueba con otra carrera.'
                  }
                  action={
                    budgets.length === 0 && writer ? (
                      <Button onClick={openBudgetCreate} startIcon={<Plus className="h-4 w-4" />}>
                        Nuevo presupuesto
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
                      <th className="px-4 py-3 text-left">Carrera</th>
                      <th className="px-4 py-3 text-left">Categoría</th>
                      <th className="px-4 py-3 text-right">Presupuestado</th>
                      <th className="px-4 py-3 text-right">Gastado en la carrera</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBudgets.map((row) => {
                      const race = races.find((item) => item.id === row.race_id);
                      const financial = raceFinancials.find(
                        (item) => item.race_id === row.race_id,
                      );
                      return (
                        <tr key={row.id} className="transition hover:bg-slate-50/70">
                          <td className="px-4 py-3" data-label="Carrera">
                            <p className="font-medium text-slate-900">
                              {race?.name || 'Carrera no disponible'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {race ? formatDate(race.date) : '—'}
                            </p>
                          </td>
                          <td className="px-4 py-3" data-label="Categoría">
                            <Badge tone="neutral">{row.category}</Badge>
                            {row.notes && (
                              <p className="mt-1 max-w-[240px] text-[11px] text-slate-400">
                                {row.notes}
                              </p>
                            )}
                          </td>
                          <td
                            className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900"
                            data-label="Presupuestado"
                          >
                            {formatMoneyBs(row.budgeted)}
                          </td>
                          <td
                            className="px-4 py-3 text-right tabular-nums text-slate-600"
                            data-label="Gastado en la carrera"
                          >
                            {formatMoneyBs(financial?.expenses_total ?? 0)}
                          </td>
                          <td className="px-4 py-3" data-label="Acciones">
                            <div className="flex items-center justify-end gap-1">
                              {writer ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openBudgetEdit(row)}
                                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                    aria-label="Editar presupuesto"
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingBudget(row)}
                                    className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                                    aria-label="Eliminar presupuesto"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] text-slate-400">Solo lectura</span>
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
        </div>
      )}

      <Modal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        title="Registrar gasto"
        description="El gasto y su egreso de caja se guardan en una sola operación. El comprobante es privado."
        size="lg"
        dismissible={!savingExpense}
        footer={
          <>
            <Button variant="outline" onClick={() => setExpenseOpen(false)} disabled={savingExpense}>
              Cancelar
            </Button>
            <Button type="submit" form="expense-form" loading={savingExpense}>
              Registrar gasto
            </Button>
          </>
        }
      >
        <form id="expense-form" onSubmit={saveExpense} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Fecha"
              type="date"
              value={expenseForm.date}
              onChange={(event) => updateExpenseForm('date', event.target.value)}
              required
            />
            <Input
              label="Monto (Bs)"
              type="number"
              min={0.01}
              step="0.01"
              value={expenseForm.amount}
              onChange={(event) => updateExpenseForm('amount', event.target.value)}
              required
            />
            <Input
              label="Concepto"
              value={expenseForm.concept}
              onChange={(event) => updateExpenseForm('concept', event.target.value)}
              placeholder="Inscripción, transporte, repuestos…"
              required
              containerClassName="sm:col-span-2"
            />
            <Select
              label="Categoría"
              value={expenseForm.category}
              onChange={(event) => updateExpenseForm('category', event.target.value)}
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            <Select
              label="Carrera (opcional)"
              value={expenseForm.raceId}
              onChange={(event) => updateExpenseForm('raceId', event.target.value)}
            >
              <option value="">Gasto general</option>
              {races.map((race) => (
                <option key={race.id} value={race.id}>
                  {race.name}
                </option>
              ))}
            </Select>
            <Input
              label="Beneficiario"
              value={expenseForm.beneficiary}
              onChange={(event) => updateExpenseForm('beneficiary', event.target.value)}
              placeholder="Proveedor o persona"
            />
            <Select
              label="Método de pago"
              value={expenseForm.method}
              onChange={(event) => updateExpenseForm('method', event.target.value)}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          </div>

          <ReceiptUpload
            prefix={`gastos/${expenseForm.date}`}
            valuePath={expenseForm.receiptPath}
            onChange={(path) => updateExpenseForm('receiptPath', path)}
            disabled={savingExpense}
          />

          <Textarea
            label="Notas"
            value={expenseForm.notes}
            onChange={(event) => updateExpenseForm('notes', event.target.value)}
            rows={2}
            placeholder="Detalle del gasto (opcional)."
          />

          {expenseError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {expenseError}
            </p>
          )}
        </form>
      </Modal>

      <Modal
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        title={editingBudget ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        description="Define cuánto se planea gastar por carrera y categoría."
        size="md"
        dismissible={!savingBudget}
        footer={
          <>
            <Button variant="outline" onClick={() => setBudgetOpen(false)} disabled={savingBudget}>
              Cancelar
            </Button>
            <Button type="submit" form="budget-form" loading={savingBudget}>
              Guardar presupuesto
            </Button>
          </>
        }
      >
        <form id="budget-form" onSubmit={saveBudget} className="space-y-4">
          <Select
            label="Carrera"
            value={budgetForm.raceId}
            onChange={(event) =>
              setBudgetForm((current) => ({ ...current, raceId: event.target.value }))
            }
            required
          >
            <option value="">Selecciona una carrera…</option>
            {races.map((race) => (
              <option key={race.id} value={race.id}>
                {race.name} · {formatDate(race.date)}
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Categoría"
              value={budgetForm.category}
              onChange={(event) =>
                setBudgetForm((current) => ({ ...current, category: event.target.value }))
              }
            >
              {budgetCategoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            <Input
              label="Monto presupuestado (Bs)"
              type="number"
              min={0}
              step="0.01"
              value={budgetForm.budgeted}
              onChange={(event) =>
                setBudgetForm((current) => ({ ...current, budgeted: event.target.value }))
              }
              required
            />
          </div>
          <Textarea
            label="Notas"
            value={budgetForm.notes}
            onChange={(event) =>
              setBudgetForm((current) => ({ ...current, notes: event.target.value }))
            }
            rows={2}
            placeholder="Supuestos o detalle del presupuesto (opcional)."
          />
          {budgetError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {budgetError}
            </p>
          )}
        </form>
      </Modal>

      <Modal
        open={openingOpen}
        onClose={() => setOpeningOpen(false)}
        title="Registrar saldo inicial"
        description="Solo puede existir una apertura confirmada. Este monto no se cuenta como ingreso operativo del mes."
        size="sm"
        dismissible={!savingOpening}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpeningOpen(false)} disabled={savingOpening}>
              Cancelar
            </Button>
            <Button type="submit" form="opening-form" loading={savingOpening}>
              Registrar apertura
            </Button>
          </>
        }
      >
        <form id="opening-form" onSubmit={saveOpening} className="space-y-4">
          <Input
            label="Monto (Bs)"
            type="number"
            min={0.01}
            step="0.01"
            value={openingForm.amount}
            onChange={(event) =>
              setOpeningForm((current) => ({ ...current, amount: event.target.value }))
            }
            required
          />
          <Input
            label="Fecha"
            type="date"
            value={openingForm.date}
            onChange={(event) =>
              setOpeningForm((current) => ({ ...current, date: event.target.value }))
            }
            required
          />
          <Input
            label="Concepto"
            value={openingForm.concept}
            onChange={(event) =>
              setOpeningForm((current) => ({ ...current, concept: event.target.value }))
            }
          />
          {openingError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {openingError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(reversingExpense)}
        onClose={() => setReversingExpense(null)}
        title="Revertir gasto"
        description={`Se anulará “${reversingExpense?.concept ?? ''}” por ${formatMoneyBs(
          reversingExpense?.amount ?? 0,
        )}. El comprobante y el registro original se conservan; el egreso deja de afectar la caja.`}
        confirmLabel="Revertir gasto"
        requireReason
        reasonLabel="Motivo del reverso"
        loading={expenseReversalLoading}
        onConfirm={(reason) => void confirmExpenseReversal(reason)}
      />

      <ConfirmDialog
        open={Boolean(deletingBudget)}
        onClose={() => setDeletingBudget(null)}
        title="Eliminar presupuesto"
        description={`Se eliminará la partida “${deletingBudget?.category ?? ''}” de ${
          deletingBudget?.budgeted !== undefined
            ? formatMoneyBs(deletingBudget.budgeted)
            : ''
        }. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deletingLoading}
        onConfirm={() => void confirmDeleteBudget()}
      />

      <ConfirmDialog
        open={openingReversalOpen}
        onClose={() => setOpeningReversalOpen(false)}
        title="Revertir saldo inicial"
        description={`Se anulará la apertura de ${formatMoneyBs(
          summary.opening_balance,
        )}. Después podrás registrar un nuevo saldo inicial. Los movimientos posteriores no se modifican.`}
        confirmLabel="Revertir apertura"
        requireReason
        reasonLabel="Motivo del reverso"
        loading={openingReversalLoading}
        onConfirm={(reason) => void confirmOpeningReversal(reason)}
      />
    </>
  );
}
