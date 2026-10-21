import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/ui/StatCard';
import { Table } from '../../components/ui/Table';
import type { TableColumn } from '../../components/ui/Table';
import { Textarea } from '../../components/ui/Textarea';
import { useAuth } from '../../hooks/useAuth';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase } from '../../lib/supabaseClient';
import { logAudit } from '../../services/supabase/admin';
import { getCashMovements } from '../../services/supabase/finance';
import { formatDate, formatMoneyBs } from '../../utils/format';
import { summarizeByMonth, summarizeCash } from '../../utils/finance';
import type { CashMovement } from '../../types';

export function AdminCash() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'TESORERIA']);
  const { data, loading, error, reload } = useSupabaseQuery(getCashMovements);
  const [modalOpen, setModalOpen] = useState(false);
  const [concept, setConcept] = useState('');
  const [type, setType] = useState('INGRESO');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const summary = useMemo(() => (data ? summarizeCash(data) : null), [data]);
  const byMonth = useMemo(() => (data ? summarizeByMonth(data) : {}), [data]);
  const monthRows = useMemo(() => Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a)), [byMonth]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(amount);
    if (!concept.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      setFormError('Concepto y monto válido son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const { data: created, error: insertError } = await supabase
        .from('cash_movements')
        .insert({
          concept: concept.trim(),
          type,
          amount: parsed,
          movement_date: date,
          category: category.trim() || null,
          notes: notes.trim() || null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (insertError) throw new Error(`No se pudo registrar el movimiento: ${insertError.message}`);
      try {
        await logAudit({
          user_id: user?.id ?? null,
          action: 'cash.create',
          table_name: 'cash_movements',
          record_id: (created as CashMovement).id ?? null,
          details: { concept, type, amount: parsed },
        });
      } catch {
        /* noop */
      }
      setModalOpen(false);
      setConcept('');
      setAmount('');
      setCategory('');
      setNotes('');
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Cargando caja…" />
      </div>
    );
  }

  if (error || !data || !summary) {
    return <ErrorState message={error ?? 'No se pudo cargar la caja.'} onRetry={reload} />;
  }

  const columns: TableColumn<CashMovement>[] = [
    { key: 'date', header: 'Fecha', render: (r) => formatDate(r.movement_date) },
    { key: 'concept', header: 'Concepto', render: (r) => <span className="font-medium">{r.concept}</span> },
    {
      key: 'type',
      header: 'Tipo',
      render: (r) => <Badge variant={r.type === 'INGRESO' ? 'success' : 'danger'}>{r.type}</Badge>,
    },
    { key: 'amount', header: 'Monto', render: (r) => formatMoneyBs(r.amount) },
    { key: 'category', header: 'Categoría', render: (r) => r.category ?? '—' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Caja"
        subtitle={`Saldo: ${formatMoneyBs(summary.balance)} = ingresos − egresos`}
        actions={<Button onClick={() => setModalOpen(true)} disabled={!canEdit}>Nuevo movimiento</Button>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Ingresos" value={formatMoneyBs(summary.total_ingresos)} />
        <StatCard label="Egresos" value={formatMoneyBs(summary.total_egresos)} />
        <StatCard label="Saldo" value={formatMoneyBs(summary.balance)} description={`${summary.movements_count} movimientos`} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Movimientos" subtitle="Últimos registros">
          {data.length === 0 ? (
            <EmptyState title="Sin movimientos" description="Registra el primer movimiento de caja." />
          ) : (
            <Table columns={columns} data={data.slice(0, 50)} keyExtractor={(r) => r.id} />
          )}
        </Card>
        <Card title="Resumen mensual" subtitle="Ingresos vs egresos por mes">
          {monthRows.length === 0 ? (
            <EmptyState title="Sin datos" description="No hay movimientos para resumir." />
          ) : (
            <Table
              columns={[
                { key: 'm', header: 'Mes', render: (r: { month: string; ingresos: number; egresos: number; balance: number }) => r.month },
                { key: 'i', header: 'Ingresos', render: (r) => formatMoneyBs(r.ingresos) },
                { key: 'e', header: 'Egresos', render: (r) => formatMoneyBs(r.egresos) },
                { key: 'b', header: 'Saldo', render: (r) => formatMoneyBs(r.balance) },
              ]}
              data={monthRows.map(([month, v]) => ({ month, ...v }))}
              keyExtractor={(r) => r.month}
            />
          )}
        </Card>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo movimiento">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Concepto *" value={concept} onChange={(e) => setConcept(e.target.value)} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value)} options={[{ value: 'INGRESO', label: 'Ingreso' }, { value: 'EGRESO', label: 'Egreso' }]} />
            <Input label="Monto (Bs) *" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input label="Categoría" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="cuotas, aportes, logística…" />
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

export default AdminCash;
