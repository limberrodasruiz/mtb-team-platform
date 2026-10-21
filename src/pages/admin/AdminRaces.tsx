import { useState } from 'react';
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
import { supabase } from '../../lib/supabaseClient';
import { RACE_STATUS } from '../../constants';
import { logAudit } from '../../services/supabase/admin';
import { createRace, getRaces, updateRace } from '../../services/supabase/races';
import { slugify } from '../../utils/slug';
import { formatDate } from '../../utils/format';
import type { Race } from '../../types';

interface RaceForm {
  name: string;
  description: string;
  location: string;
  race_date: string;
  status: string;
  distance_km: string;
  registration_fee: string;
}

const EMPTY: RaceForm = {
  name: '',
  description: '',
  location: '',
  race_date: '',
  status: 'PLANIFICADA',
  distance_km: '',
  registration_fee: '',
};

export function AdminRaces() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'DIRECTIVA', 'EDITOR']);
  const { data, loading, error, reload } = useSupabaseQuery(getRaces);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Race | null>(null);
  const [form, setForm] = useState<RaceForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: Race) => {
    setEditing(row);
    setForm({
      name: row.name,
      description: row.description ?? '',
      location: row.location ?? '',
      race_date: row.race_date,
      status: row.status,
      distance_km: row.distance_km?.toString() ?? '',
      registration_fee: row.registration_fee?.toString() ?? '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.race_date) {
      setFormError('Nombre y fecha son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        slug: editing?.slug ?? slugify(form.name),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        race_date: form.race_date,
        status: form.status as Race['status'],
        distance_km: form.distance_km ? Number(form.distance_km) : null,
        elevation_m: editing?.elevation_m ?? null,
        registration_fee: form.registration_fee ? Number(form.registration_fee) : null,
        max_participants: editing?.max_participants ?? null,
        image_url: editing?.image_url ?? null,
      };
      let recordId = editing?.id;
      if (editing) {
        await updateRace(editing.id, payload);
      } else {
        const created = await createRace(payload);
        recordId = created.id;
      }
      try {
        await logAudit({
          user_id: user?.id ?? null,
          action: editing ? 'race.update' : 'race.create',
          table_name: 'races',
          record_id: recordId ?? null,
          details: { name: form.name },
        });
      } catch {
        /* noop */
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar la carrera.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Race) => {
    if (!window.confirm(`¿Eliminar carrera "${row.name}"?`)) return;
    const { error: delError } = await supabase.from('races').delete().eq('id', row.id);
    if (delError) return;
    try {
      await logAudit({
        user_id: user?.id ?? null,
        action: 'race.delete',
        table_name: 'races',
        record_id: row.id,
        details: { name: row.name },
      });
    } catch {
      /* noop */
    }
    reload();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Cargando carreras…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudieron cargar las carreras.'} onRetry={reload} />;
  }

  const columns: TableColumn<Race>[] = [
    { key: 'name', header: 'Carrera', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'date', header: 'Fecha', render: (r) => formatDate(r.race_date) },
    {
      key: 'status',
      header: 'Estado',
      render: (r) => (
        <Badge variant={r.status === 'FINALIZADA' ? 'success' : r.status === 'CANCELADA' ? 'danger' : r.status === 'ABIERTA' ? 'info' : 'default'}>
          {r.status}
        </Badge>
      ),
    },
    { key: 'location', header: 'Lugar', render: (r) => r.location ?? '—' },
    {
      key: 'actions',
      header: 'Acciones',
      render: (r) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => openEdit(r)}>Editar</Button>
          <Button size="sm" variant="danger" disabled={!canEdit} onClick={() => void handleDelete(r)}>Eliminar</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Carreras" subtitle={`${data.length} carreras`} actions={<Button onClick={openCreate} disabled={!canEdit}>Nueva carrera</Button>} />
      {data.length === 0 ? (
        <EmptyState title="Sin carreras" description="Crea la primera carrera del calendario." />
      ) : (
        <Table columns={columns} data={data} keyExtractor={(r) => r.id} />
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar carrera' : 'Nueva carrera'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Fecha *" type="date" value={form.race_date} onChange={(e) => setForm({ ...form, race_date: e.target.value })} required />
            <Select label="Estado" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={RACE_STATUS.map((s) => ({ value: s, label: s }))} />
            <Input label="Lugar" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Input label="Distancia (km)" type="number" min="0" step="0.1" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} />
            <Input label="Costo inscripción (Bs)" type="number" min="0" step="0.01" value={form.registration_fee} onChange={(e) => setForm({ ...form, registration_fee: e.target.value })} />
          </div>
          <Textarea label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
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

export default AdminRaces;
