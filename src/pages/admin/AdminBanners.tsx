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
import { getPublicImageUrl, uploadImage } from '../../services/supabase/storage';
import { slugify } from '../../utils/slug';
import { isValidImageSize, isValidImageType } from '../../utils/validation';
import type { Banner } from '../../types';

async function fetchAllBanners(): Promise<Banner[]> {
  const { data, error } = await supabase.from('banners').select('*').order('display_order', { ascending: true });
  if (error) throw new Error(`No se pudieron obtener los banners: ${error.message}`);
  return (data ?? []) as Banner[];
}

export function AdminBanners() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'EDITOR']);
  const { data, loading, error, reload } = useSupabaseQuery(fetchAllBanners);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [order, setOrder] = useState('0');
  const [active, setActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setSubtitle('');
    setLinkUrl('');
    setOrder('0');
    setActive(true);
    setFile(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: Banner) => {
    setEditing(row);
    setTitle(row.title);
    setSubtitle(row.subtitle ?? '');
    setLinkUrl(row.link_url ?? '');
    setOrder(String(row.display_order ?? 0));
    setActive(row.is_active);
    setFile(null);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('El título es obligatorio.');
      return;
    }
    if (!editing && !file) {
      setFormError('Selecciona una imagen para el banner.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      let imageUrl = editing?.image_url ?? '';
      if (file) {
        if (!isValidImageType(file.type)) throw new Error('Formato no válido. Usa JPG, PNG o WEBP.');
        if (!isValidImageSize(file.size)) throw new Error('La imagen supera los 5 MB.');
        const path = `${slugify(title)}-${Date.now()}.jpg`;
        await uploadImage(STORAGE_BUCKETS.BANNERS, file, path);
        imageUrl = getPublicImageUrl(STORAGE_BUCKETS.BANNERS, path);
      }
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        image_url: imageUrl,
        link_url: linkUrl.trim() || null,
        is_active: active,
        display_order: Number(order) || 0,
      };
      let recordId = editing?.id;
      if (editing) {
        const { error: upError } = await supabase.from('banners').update(payload).eq('id', editing.id);
        if (upError) throw new Error(`No se pudo actualizar: ${upError.message}`);
      } else {
        const { data: created, error: inError } = await supabase.from('banners').insert(payload).select().single();
        if (inError) throw new Error(`No se pudo crear: ${inError.message}`);
        recordId = (created as Banner).id;
      }
      try {
        await logAudit({
          user_id: user?.id ?? null,
          action: editing ? 'banner.update' : 'banner.create',
          table_name: 'banners',
          record_id: recordId ?? null,
          details: { title },
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

  const handleDelete = async (row: Banner) => {
    if (!window.confirm(`¿Eliminar banner "${row.title}"?`)) return;
    const { error: delError } = await supabase.from('banners').delete().eq('id', row.id);
    if (delError) return;
    reload();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Cargando banners…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudieron cargar los banners.'} onRetry={reload} />;
  }

  const columns: TableColumn<Banner>[] = [
    {
      key: 'img',
      header: 'Imagen',
      render: (r) => <img src={r.image_url} alt={r.title} className="h-10 w-20 rounded object-cover" loading="lazy" />,
    },
    { key: 'title', header: 'Título', render: (r) => <span className="font-medium">{r.title}</span> },
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
      <PageHeader title="Banners" subtitle={`${data.length} banners`} actions={<Button onClick={openCreate} disabled={!canEdit}>Nuevo banner</Button>} />
      {data.length === 0 ? (
        <EmptyState title="Sin banners" description="Crea el primer banner del sitio." />
      ) : (
        <Table columns={columns} data={data} keyExtractor={(r) => r.id} />
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar banner' : 'Nuevo banner'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Título *" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Input label="Subtítulo" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          <Input label="Enlace (URL)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Orden" type="number" step="1" value={order} onChange={(e) => setOrder(e.target.value)} />
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Activo
            </label>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="banner-file">Imagen {!editing ? '*' : ''} (JPG/PNG/WEBP, máx 5MB)</label>
            <input id="banner-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
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

export default AdminBanners;
