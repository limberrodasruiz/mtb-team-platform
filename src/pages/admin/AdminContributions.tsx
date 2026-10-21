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
import { createContribution, getMembers } from '../../services/supabase/finance';
import { formatDate, formatMoneyBs } from '../../utils/format';
import type { Contribution } from '../../types';

async function fetchContributions(): Promise<{ items: Contribution[]; names: Map<string, string> }> {
  const [{ data, error }, members] = await Promise.all([
    supabase.from('contributions').select('*').order('contribution_date', { ascending: false }),
    getMembers(),
  ]);
  if (error) throw new Error(`No se pudieron obtener los aportes: ${error.message}`);
  return { items: (data ?? []) as Contribution[], names: new Map(members.map((m) => [m.id, m.full_name])) };
}

export function AdminContributions() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'TESORERIA']);
  const { data, loading, error, reload } = useSupabaseQuery(fetchContributions);
  const [modalOpen, setModalOpen] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const memberOptions = useMemo(() => {
    if (!data) return [];
    return [...data.names.entries()].map(([value, label]) => ({ value, label }));
  }, [data]);

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
      const created = await createContribution({
        member_id: memberId || null,
        title: title.trim(),
        amount: parsed,
        contribution_date: date,
        notes: notes.trim() || null,
      });
      const { error: cashError } = await supabase.from('cash_movements').insert({
        concept: `Aporte: ${title.trim()}`,
        type: 'INGRESO',
        amount: parsed,
        movement_date: date,
        category: 'aportes',
        related_member_id: memberId || null,
        notes: notes.trim() || null,
      });
      if (cashError) throw new Error(`Aporte creado pero sin movimiento de caja: ${cashError.message}`);
      try {
        await logAudit({
          user_id: user?.id ?? null,
          action: 'contribution.create',
          table_name: 'contributions',
          record_id: created.id,
          details: { title, amount: parsed },
        });
      } catch {
        /* noop */
      }
      setModalOpen(false);
      setTitle('');
      setAmount('');
      setNotes('');
      setMemberId('');
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo registrar el aporte.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Cargando aportes…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudieron cargar los aportes.'} onRetry={reload} />;
  }

  const total = data.items.reduce((acc, c) => acc + c.amount, 0);

  const columns: TableColumn<Contribution>[] = [
    { key: 'title', header: 'Concepto', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'member', header: 'Miembro', render: (r) => (r.member_id ? (data.names.get(r.member_id) ?? '—') : '—') },
    { key: 'amount', header: 'Monto', render: (r) => formatMoneyBs(r.amount) },
    { key: 'date', header: 'Fecha', render: (r) => formatDate(r.contribution_date) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Aportes extraordinarios"
        subtitle={`Total: ${formatMoneyBs(total)} · ${data.items.length} aportes`}
        actions={<Button onClick={() => setModalOpen(true)} disabled={!canEdit}>Registrar aporte</Button>}
      />
      {data.items.length === 0 ? (
        <EmptyState title="Sin aportes" description="Aún no hay aportes extraordinarios." />
      ) : (
        <Table columns={columns} data={data.items} keyExtractor={(r) => r.id} />
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo aporte">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Título *" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Monto (Bs) *" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Select label="Miembro (opcional)" value={memberId} onChange={(e) => setMemberId(e.target.value)} options={memberOptions} placeholder="Sin miembro…" />
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

export default AdminContributions;
