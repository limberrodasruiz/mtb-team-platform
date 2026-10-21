import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Badge } from '../../components/ui/Badge';
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
import { logAudit } from '../../services/supabase/admin';
import { createMember, getMembers, updateMember } from '../../services/supabase/finance';
import { MEMBER_STATUS } from '../../constants';
import type { Member } from '../../types';

interface MemberForm {
  full_name: string;
  member_type: string;
  status: string;
  phone: string;
  email: string;
  join_date: string;
  notes: string;
}

const EMPTY: MemberForm = {
  full_name: '',
  member_type: 'GENERAL',
  status: 'ACTIVO',
  phone: '',
  email: '',
  join_date: '',
  notes: '',
};

export function AdminMembers() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'TESORERIA']);
  const { data, loading, error, reload } = useSupabaseQuery(getMembers);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState<MemberForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((m) => `${m.full_name} ${m.email ?? ''}`.toLowerCase().includes(q));
  }, [data, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: Member) => {
    setEditing(row);
    setForm({
      full_name: row.full_name,
      member_type: row.member_type,
      status: row.status,
      phone: row.phone ?? '',
      email: row.email ?? '',
      join_date: row.join_date ?? '',
      notes: row.notes ?? '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        member_type: form.member_type as Member['member_type'],
        status: form.status as Member['status'],
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        join_date: form.join_date || null,
        notes: form.notes.trim() || null,
      };
      let recordId = editing?.id;
      if (editing) {
        await updateMember(editing.id, payload);
      } else {
        const created = await createMember(payload);
        recordId = created.id;
      }
      try {
        await logAudit({
          user_id: user?.id ?? null,
          action: editing ? 'member.update' : 'member.create',
          table_name: 'members',
          record_id: recordId ?? null,
          details: { full_name: form.full_name },
        });
      } catch {
        /* noop */
      }
      setModalOpen(false);
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
        <Spinner label="Cargando miembros…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudieron cargar los miembros.'} onRetry={reload} />;
  }

  const columns: TableColumn<Member>[] = [
    { key: 'name', header: 'Nombre', render: (r) => <span className="font-medium">{r.full_name}</span> },
    { key: 'type', header: 'Tipo', render: (r) => <Badge variant="outline">{r.member_type}</Badge> },
    {
      key: 'status',
      header: 'Estado',
      render: (r) => (
        <Badge variant={r.status === 'ACTIVO' ? 'success' : r.status === 'SUSPENDIDO' ? 'danger' : 'default'}>
          {r.status}
        </Badge>
      ),
    },
    { key: 'phone', header: 'Teléfono', render: (r) => r.phone ?? '—' },
    {
      key: 'actions',
      header: 'Acciones',
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => openEdit(r)} disabled={!canEdit}>
          Editar
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Miembros" subtitle={`${filtered.length} miembros`} actions={<Button onClick={openCreate} disabled={!canEdit}>Nuevo miembro</Button>} />
      <Input label="Buscar" placeholder="Nombre o correo…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {filtered.length === 0 ? (
        <EmptyState title="Sin miembros" description="No hay registros." />
      ) : (
        <Table columns={columns} data={filtered} keyExtractor={(r) => r.id} />
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar miembro' : 'Nuevo miembro'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Nombre completo *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Tipo"
              value={form.member_type}
              onChange={(e) => setForm({ ...form, member_type: e.target.value })}
              options={[
                { value: 'CORREDOR', label: 'Corredor' },
                { value: 'DIRIGENTE', label: 'Dirigente' },
                { value: 'COLABORADOR', label: 'Colaborador' },
                { value: 'GENERAL', label: 'General' },
              ]}
            />
            <Select
              label="Estado"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={MEMBER_STATUS.map((s) => ({ value: s, label: s }))}
            />
            <Input label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Correo" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <Input label="Fecha ingreso" type="date" value={form.join_date} onChange={(e) => setForm({ ...form, join_date: e.target.value })} />
          <Textarea label="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
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

export default AdminMembers;
