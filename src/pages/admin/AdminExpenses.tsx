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
import { createExpense } from '../../services/supabase/finance';
import { getRaces } from '../../services/supabase/races';
import { formatDate, formatMoneyBs } from '../../utils/format';
import type { Expense } from '../../types';

async function fetchExpenses(): Promise<{ items: Expense[]; raceNames: Map<string, string>; raceOptions: Array<{ value: string; label: string }> }> {
  const [{ data, error }, races] = await Promise.all([
    supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
    getRaces(),
  ]);
  if (error) throw new Error(`No se pudieron obtener los gastos: ${error.message}`);
  return {
    items: (data ?? []) as Expense[],
    raceNames: new Map(races.map((r) => [r.id, r.name])),
    raceOptions: races.map((r) => ({ value: r.id, label: r.name })),
  };
}

export function AdminExpenses() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'DIRECTIVA', 'TESORERIA']);
  const { data, loading, error, reload } = useSupabaseQuery(fetchExpenses);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('');
  const [raceId, setRaceId] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const total = useMemo(() => (data?.items ?? []).reduce((acc, e) => acc + e.amount, 0), [data]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(amount);
    if (!title.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      setFormError('Título y monto válido son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const created = await createExpense({
        title: title.trim(),
        description: description.trim() || null,
        amount: parsed,
        expense_date: date,
        category: category.trim() || null,
        race_id: raceId || null,
        receipt_url: null,
      });
      try {
        await logAudit({
          user_id: user?.id ?? null,
          action: 'expense.create',
          table_name: 'expenses',
          record_id: created.id,
          details: { title, amount: parsed, race_id: raceId || null },
        });
      } catch {
        /* noop */
      }
      setModalOpen(false);
      setTitle('');
      setAmount('');
      setCategory('');
      setRaceId('');
      setDescription('');
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo registrar el gasto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Expense) => {
    if (!window.confirm(`¿Eliminar gasto "${row.title}"?`)) return;
    const { error: delError } = await supabase.from('expenses').delete().eq('id', row.id);
    if (delError) return;
    try {
      await logAudit({
        user_id: user?.id ?? null,
        action: 'expense.delete',
        table_name: 'expenses',
        record_id: row.id,
        details: { title: row.title },
      });
    } catch {
      /* noop */
    }
    reload();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Cargando gastos…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudieron cargar los gastos.'} onRetry={reload} />;
  }

  const columns: TableColumn<Expense>[] = [
    { key: 'title', header: 'Gasto', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'amount', header: 'Monto', render: (r) => formatMoneyBs(r.amount) },
    { key: 'date', header: 'Fecha', render: (r) => formatDate(r.expense_date) },
    { key: 'race', header: 'Carrera', render: (r) => (r.race_id ? (data.raceNames.get(r.race_id) ?? '—') : '—') },
    { key: 'category', header: 'Categoría', render: (r) => r.category ?? '—' },
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
        title="Gastos"
        subtitle={`Total: ${formatMoneyBs(total)} · ${data.items.length} registros (crea movimiento EGRESO automático)`}
        actions={<Button onClick={() => setModalOpen(true)} disabled={!canEdit}>Registrar gasto</Button>}
      />
      {data.items.length === 0 ? (
        <EmptyState title="Sin gastos" description="Aún no hay gastos registrados." />
      ) : (
        <Table columns={columns} data={data.items} keyExtractor={(r) => r.id} />
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo gasto">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Título *" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Monto (Bs) *" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input label="Categoría" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="logística, inscripción…" />
            <Select label="Carrera (opcional)" value={raceId} onChange={(e) => setRaceId(e.target.value)} options={data.raceOptions} placeholder="Sin carrera…" />
          </div>
          <Textarea label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
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

export default AdminExpenses;
