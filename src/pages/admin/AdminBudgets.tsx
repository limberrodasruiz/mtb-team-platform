import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import type { TableColumn } from '../../components/ui/Table';
import { Textarea } from '../../components/ui/Textarea';
import { useAuth } from '../../hooks/useAuth';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase } from '../../lib/supabaseClient';
import { logAudit } from '../../services/supabase/admin';
import { createRaceBudget, getExpensesByRace, getRaceBudgets } from '../../services/supabase/finance';
import { getRaces } from '../../services/supabase/races';
import { formatMoneyBs } from '../../utils/format';
import type { RaceBudget } from '../../types';

interface BudgetRow {
  budget: RaceBudget;
  raceName: string;
  spent: number;
  available: number;
}

async function fetchBudgets(): Promise<{ rows: BudgetRow[]; raceOptions: Array<{ value: string; label: string }> }> {
  const [budgets, races] = await Promise.all([getRaceBudgets(), getRaces()]);
  const raceNames = new Map(races.map((r) => [r.id, r.name]));
  const rows: BudgetRow[] = [];
  for (const b of budgets) {
    let spent = 0;
    try {
      const expenses = await getExpensesByRace(b.race_id);
      spent = expenses.reduce((acc, e) => acc + e.amount, 0);
    } catch {
      spent = 0;
    }
    const estimated = b.estimated_cost ?? 0;
    rows.push({
      budget: b,
      raceName: raceNames.get(b.race_id) ?? b.race_id.slice(0, 8),
      spent,
      available: estimated - spent,
    });
  }
  return { rows, raceOptions: races.map((r) => ({ value: r.id, label: r.name })) };
}

export function AdminBudgets() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'DIRECTIVA', 'TESORERIA']);
  const { data, loading, error, reload } = useSupabaseQuery(fetchBudgets);
  const [modalOpen, setModalOpen] = useState(false);
  const [raceId, setRaceId] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [estimatedIncome, setEstimatedIncome] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const rows = data?.rows ?? [];
    return {
      estimated: rows.reduce((a, r) => a + (r.budget.estimated_cost ?? 0), 0),
      spent: rows.reduce((a, r) => a + r.spent, 0),
      available: rows.reduce((a, r) => a + r.available, 0),
    };
  }, [data]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!raceId) {
      setFormError('Selecciona una carrera.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const created = await createRaceBudget({
        race_id: raceId,
        estimated_cost: estimatedCost ? Number(estimatedCost) : null,
        actual_cost: null,
        estimated_income: estimatedIncome ? Number(estimatedIncome) : null,
        actual_income: null,
        notes: notes.trim() || null,
      });
      try {
        await logAudit({
          user_id: user?.id ?? null,
          action: 'budget.create',
          table_name: 'race_budgets',
          record_id: created.id,
          details: { race_id: raceId },
        });
      } catch {
        /* noop */
      }
      setModalOpen(false);
      setRaceId('');
      setEstimatedCost('');
      setEstimatedIncome('');
      setNotes('');
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear el presupuesto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: BudgetRow) => {
    if (!window.confirm(`¿Eliminar presupuesto de "${row.raceName}"?`)) return;
    const { error: delError } = await supabase.from('race_budgets').delete().eq('id', row.budget.id);
    if (delError) return;
    reload();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Cargando presupuestos…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudieron cargar los presupuestos.'} onRetry={reload} />;
  }

  const columns: TableColumn<BudgetRow>[] = [
    { key: 'race', header: 'Carrera', render: (r) => <span className="font-medium">{r.raceName}</span> },
    { key: 'estimated', header: 'Presupuesto', render: (r) => formatMoneyBs(r.budget.estimated_cost ?? 0) },
    { key: 'spent', header: 'Gastado real', render: (r) => formatMoneyBs(r.spent) },
    { key: 'available', header: 'Disponible', render: (r) => formatMoneyBs(r.available) },
    {
      key: 'actions',
      header: 'Acciones',
      render: (r) => (
        <Button size="sm" variant="danger" disabled={!canEdit} onClick={() => void handleDelete(r)}>
          Eliminar
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Presupuestos"
        subtitle={`Presupuestado: ${formatMoneyBs(totals.estimated)} · Gastado: ${formatMoneyBs(totals.spent)} · Disponible: ${formatMoneyBs(totals.available)}`}
        actions={<Button onClick={() => setModalOpen(true)} disabled={!canEdit}>Nuevo presupuesto</Button>}
      />
      {data.rows.length === 0 ? (
        <EmptyState title="Sin presupuestos" description="Crea el primer presupuesto por carrera." />
      ) : (
        <Table columns={columns} data={data.rows} keyExtractor={(r) => r.budget.id} />
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo presupuesto">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Select label="Carrera *" value={raceId} onChange={(e) => setRaceId(e.target.value)} options={data.raceOptions} placeholder="Seleccionar…" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Costo estimado (Bs)" type="number" min="0" step="0.01" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
            <Input label="Ingreso estimado (Bs)" type="number" min="0" step="0.01" value={estimatedIncome} onChange={(e) => setEstimatedIncome(e.target.value)} />
          </div>
          <Textarea label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          {formError ? <p role="alert" className="text-sm text-red-600">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default AdminBudgets;
