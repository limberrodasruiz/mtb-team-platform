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
import { useAuth } from '../../hooks/useAuth';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase } from '../../lib/supabaseClient';
import { STORAGE_BUCKETS } from '../../constants';
import { logAudit } from '../../services/supabase/admin';
import { getGallery } from '../../services/supabase/content';
import { getPublicImageUrl, uploadImage } from '../../services/supabase/storage';
import { getRaces } from '../../services/supabase/races';
import { isValidImageSize, isValidImageType } from '../../utils/validation';
import { formatDate } from '../../utils/format';
import type { GalleryItem } from '../../types';

async function fetchGallery() {
  const [items, races] = await Promise.all([
    getGallery().catch(async () => {
      const { data, error } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(`No se pudo obtener la galería: ${error.message}`);
      return (data ?? []) as GalleryItem[];
    }),
    getRaces().catch(() => []),
  ]);
  return { items, races };
}

// NOTE: getGallery vive en content.ts en este proyecto; re-exportamos fallback local.
// Si existe services/supabase/gallery.ts se usa; si no, el catch usa supabase directo.

export function AdminGallery() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'EDITOR']);
  const { data, loading, error, reload } = useSupabaseQuery(fetchGallery);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [raceId, setRaceId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const raceNames = useMemo(() => new Map((data?.races ?? []).map((r) => [r.id, r.name])), [data]);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (!isValidImageType(f.type)) {
      setFormError('Formato no válido. Usa JPG, PNG o WEBP.');
      return;
    }
    if (!isValidImageSize(f.size)) {
      setFormError('La imagen supera los 5 MB permitidos.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setFormError('Selecciona una imagen.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const path = `gallery-${Date.now()}.jpg`;
      await uploadImage(STORAGE_BUCKETS.GALLERY, file, path);
      const url = getPublicImageUrl(STORAGE_BUCKETS.GALLERY, path);
      const { data: created, error: inError } = await supabase
        .from('gallery')
        .insert({ title: title.trim() || null, image_url: url, race_id: raceId || null })
        .select()
        .single();
      if (inError) throw new Error(`No se pudo guardar: ${inError.message}`);
      try {
        await logAudit({
          user_id: user?.id ?? null,
          action: 'gallery.create',
          table_name: 'gallery',
          record_id: (created as GalleryItem).id ?? null,
          details: { title },
        });
      } catch {
        /* noop */
      }
      setModalOpen(false);
      setTitle('');
      setRaceId('');
      setFile(null);
      setPreview(null);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo subir la imagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: GalleryItem) => {
    if (!window.confirm('¿Eliminar esta foto?')) return;
    const { error: delError } = await supabase.from('gallery').delete().eq('id', row.id);
    if (delError) return;
    reload();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Cargando galería…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudo cargar la galería.'} onRetry={reload} />;
  }

  const columns: TableColumn<GalleryItem>[] = [
    {
      key: 'img',
      header: 'Foto',
      render: (r) => <img src={r.image_url} alt={r.title ?? 'Foto'} className="h-12 w-16 rounded object-cover" loading="lazy" />,
    },
    { key: 'title', header: 'Título', render: (r) => r.title ?? '—' },
    { key: 'race', header: 'Carrera', render: (r) => (r.race_id ? (raceNames.get(r.race_id) ?? '—') : '—') },
    { key: 'date', header: 'Fecha', render: (r) => formatDate(r.published_at ?? r.created_at) },
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
      <PageHeader title="Galería" subtitle={`${data.items.length} fotos`} actions={<Button onClick={() => { setModalOpen(true); setFormError(null); }} disabled={!canEdit}>Subir foto</Button>} />
      {data.items.length === 0 ? (
        <EmptyState title="Sin fotos" description="Sube la primera foto a la galería." />
      ) : (
        <Table columns={columns} data={data.items} keyExtractor={(r) => r.id} />
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Subir foto">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select label="Carrera (opcional)" value={raceId} onChange={(e) => setRaceId(e.target.value)} options={data.races.map((r) => ({ value: r.id, label: r.name }))} placeholder="Sin carrera…" />
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="gallery-file">Imagen * (JPG/PNG/WEBP, máx 5MB)</label>
            <input id="gallery-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleFile(e.target.files?.[0])} className="mt-1 block w-full text-sm" />
            {preview ? <img src={preview} alt="Vista previa" className="mt-2 h-40 w-full rounded-lg object-cover" /> : null}
          </div>
          {formError ? <p role="alert" className="text-sm text-red-600">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Subir</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default AdminGallery;
