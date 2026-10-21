import { useState } from 'react';
import type { FormEvent } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import type { TableColumn } from '../../components/ui/Table';
import { useAuth } from '../../hooks/useAuth';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase } from '../../lib/supabaseClient';
import { STORAGE_BUCKETS } from '../../constants';
import { logAudit } from '../../services/supabase/admin';
import { getSponsors } from '../../services/supabase/content';
import { getPublicImageUrl, uploadImage } from '../../services/supabase/storage';
import { slugify } from '../../utils/slug';
import { isValidImageSize, isValidImageType } from '../../utils/validation';
import type { Sponsor } from '../../types';

async function fetchAllSponsors(): Promise<Sponsor[]> {
  try {
    return await getSponsors();
  } catch {
    const { data, error } = await supabase.from('sponsors').select('*').order('display_order', { ascending: true });
    if (error) throw new Error(`No se pudieron obtener los auspiciadores: ${error.message}`);
    return (data ?? []) as Sponsor[];
  }
}

export function AdminSponsors() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'DIRECTIVA', 'EDITOR']);
  const { data, loading, error, reload } = useSupabaseQuery(fetchAllSponsors);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [order, setOrder] = useState('0');
  const [active, setActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setWebsite('');
    setOrder('0');
    setActive(true);
    setFile(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: Sponsor) => {
    setEditing(row);
    setName(row.name);
    setWebsite(row.website_url ?? '');
    setOrder(String(row.display_order ?? 0));
    setActive(row.is_active);
    setFile(null);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      let logoUrl = editing?.logo_url ?? null;
      if (file) {
        if (!isValidImageType(file.type)) throw new Error('Formato no válido. Usa JPG, PNG o WEBP.');
        if (!isValidImageSize(file.size)) throw new Error('La imagen supera los 5 MB.');
        const path = `${slugify(name)}-${Date.now()}.jpg`;
        await uploadImage(STORAGE_BUCKETS.SPONSORS, file, path);
        logoUrl = getPublicImageUrl(STORAGE_BUCKETS.SPONSORS, path);
      }
      const payload = {
        name: name.trim(),
        logo_url: logoUrl,
        website_url: website.trim() || null,
        is_active: active,
        display_order: Number(order) || 0,
      };
      let recordId = editing?.id;
      if (editing) {
        const { error: upError } = await supabase.from('sponsors').update(payload).eq('id', editing.id);
        if (upError) throw new Error(`No se pudo actualizar: ${upError.message}`);
      } else {
        const { data: created, error: inError } = await supabase.from('sponsors').insert(payload).select().single();
        if (inError) throw new Error(`No se pudo crear: ${inError.message}`);
        recordId = (created as Sponsor).id;
      }
      try {
        await logAudit({
          user_id: user?.id ?? null,
          action: editing ? 'sponsor.update' : 'sponsor.create',
          table_name: 'sponsors',
          record_id: recordId ?? null,
          details: { name },
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

  const handleDelete = async (row: Sponsor) => {
    if (!window.confirm(`¿Eliminar auspiciador "${row.name}"?`)) return;
    const { error: delError } = await supabase.from('sponsors').delete().eq('id', row.id);
    if (delError) return;
    reload();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Cargando auspiciadores…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudieron cargar los auspiciadores.'} onRetry={reload} />;
  }

  const columns: TableColumn<Sponsor>[] = [
    {
      key: 'logo',
      header: 'Logo',
      render: (r) => (r.logo_url ? <img src={r.logo_url} alt={r.name} className="h-10 w-20 rounded object-contain bg-slate-50" loading="lazy" /> : <span className="text-slate-300">—</span>),
    },
    { key: 'name', header: 'Nombre', render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: 'status',
      header: 'Estado',
      render: (r) => <Badge variant={r.is_active ? 'success' : 'default'}>{r.is_active ? 'ACTIVO' : 'INACTIVO'}</Badge>,
    },
    { key: 'order', header: 'Orden', render: (r) => r.display_order ?? 0 },
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
      <PageHeader title="Auspiciadores" subtitle={`${data.length} auspiciadores`} actions={<Button onClick={openCreate} disabled={!canEdit}>Nuevo auspiciador</Button>} />
      {data.length === 0 ? (
        <EmptyState title="Sin auspiciadores" description="Registra el primer auspiciador." />
      ) : (
        <Table columns={columns} data={data} keyExtractor={(r) => r.id} />
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar auspiciador' : 'Nuevo auspiciador'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Nombre *" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Sitio web" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Orden" type="number" step="1" value={order} onChange={(e) => setOrder(e.target.value)} />
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Activo
            </label>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="sponsor-logo">Logo (JPG/PNG/WEBP, máx 5MB)</label>
            <input id="sponsor-logo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
          </div>
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

export default AdminSponsors;
