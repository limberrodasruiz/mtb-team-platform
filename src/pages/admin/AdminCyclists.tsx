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
import {
  createCyclist,
  deactivateCyclist,
  getCyclists,
  updateCyclist,
} from '../../services/supabase/cyclists';
import { getPublicImageUrl, uploadImage } from '../../services/supabase/storage';
import { STORAGE_BUCKETS } from '../../constants';
import { slugify } from '../../utils/slug';
import { isValidImageSize, isValidImageType } from '../../utils/validation';
import type { Cyclist } from '../../types';

interface CyclistForm {
  full_name: string;
  nickname: string;
  birth_date: string;
  gender: string;
  bio: string;
  is_active: boolean;
  is_featured: boolean;
}

const EMPTY_FORM: CyclistForm = {
  full_name: '',
  nickname: '',
  birth_date: '',
  gender: '',
  bio: '',
  is_active: true,
  is_featured: false,
};

export function AdminCyclists() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'DIRECTIVA', 'EDITOR']);
  const { data, loading, error, reload } = useSupabaseQuery(getCyclists);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cyclist | null>(null);
  const [form, setForm] = useState<CyclistForm>(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!data) return [];
    if (!q) return data;
    return data.filter((c) => `${c.full_name} ${c.nickname ?? ''}`.toLowerCase().includes(q));
  }, [data, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setPreview(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: Cyclist) => {
    setEditing(row);
    setForm({
      full_name: row.full_name,
      nickname: row.nickname ?? '',
      birth_date: row.birth_date ?? '',
      gender: row.gender ?? '',
      bio: row.bio ?? '',
      is_active: row.is_active,
      is_featured: row.is_featured,
    });
    setPhotoFile(null);
    setPreview(row.photo_url ?? null);
    setFormError(null);
    setModalOpen(true);
  };

  const handlePhoto = (file: File | undefined) => {
    if (!file) return;
    if (!isValidImageType(file.type)) {
      setFormError('Formato no válido. Usa JPG, PNG o WEBP.');
      return;
    }
    if (!isValidImageSize(file.size)) {
      setFormError('La imagen supera los 5 MB permitidos.');
      return;
    }
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setFormError('El nombre completo es obligatorio.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      let photoUrl = editing?.photo_url ?? null;
      if (photoFile) {
        const path = `${slugify(form.full_name)}-${Date.now()}.${photoFile.type.split('/')[1] ?? 'jpg'}`;
        await uploadImage(STORAGE_BUCKETS.CYCLISTS, photoFile, path);
        photoUrl = getPublicImageUrl(STORAGE_BUCKETS.CYCLISTS, path);
      }
      const payload = {
        full_name: form.full_name.trim(),
        slug: editing?.slug ?? slugify(form.full_name),
        nickname: form.nickname.trim() || null,
        birth_date: form.birth_date || null,
        gender: (form.gender || null) as Cyclist['gender'],
        bio: form.bio.trim() || null,
        photo_url: photoUrl,
        is_active: form.is_active,
        is_featured: form.is_featured,
      };
      let recordId = editing?.id;
      if (editing) {
        await updateCyclist(editing.id, payload);
      } else {
        const created = await createCyclist(payload);
        recordId = created.id;
      }
      try {
        await logAudit({
          user_id: user?.id ?? null,
          action: editing ? 'cyclist.update' : 'cyclist.create',
          table_name: 'cyclists',
          record_id: recordId ?? null,
          details: { full_name: form.full_name },
        });
      } catch {
        /* auditoría no bloqueante */
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar el corredor.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (row: Cyclist, field: 'is_active' | 'is_featured') => {
    try {
      await updateCyclist(row.id, { [field]: !row[field] });
      reload();
    } catch {
      /* noop */
    }
  };

  const handleDeactivate = async (row: Cyclist) => {
    if (!window.confirm(`¿Desactivar a ${row.full_name}?`)) return;
    try {
      await deactivateCyclist(row.id);
      reload();
    } catch {
      /* noop */
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Cargando corredores…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudieron cargar los corredores.'} onRetry={reload} />;
  }

  const columns: TableColumn<Cyclist>[] = [
    { key: 'name', header: 'Corredor', render: (r) => <span className="font-medium">{r.full_name}</span> },
    {
      key: 'status',
      header: 'Estado',
      render: (r) => (
        <Badge variant={r.is_active ? 'success' : 'default'}>
          {r.is_active ? 'ACTIVO' : 'INACTIVO'}
        </Badge>
      ),
    },
    {
      key: 'featured',
      header: 'Destacado',
      render: (r) => (r.is_featured ? <Badge variant="info">★</Badge> : <span className="text-slate-300">—</span>),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" onClick={() => openEdit(r)} disabled={!canEdit}>
            Editar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void handleToggle(r, 'is_featured')} disabled={!canEdit}>
            {r.is_featured ? 'Quitar ★' : 'Destacar'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void handleToggle(r, 'is_active')} disabled={!canEdit}>
            {r.is_active ? 'Desactivar' : 'Activar'}
          </Button>
          <Button size="sm" variant="danger" onClick={() => void handleDeactivate(r)} disabled={!canEdit}>
            Baja
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Corredores"
        subtitle={`${filtered.length} corredores registrados`}
        actions={
          <Button onClick={openCreate} disabled={!canEdit}>
            Nuevo corredor
          </Button>
        }
      />
      <Input label="Buscar" placeholder="Nombre o apodo…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {filtered.length === 0 ? (
        <EmptyState title="Sin corredores" description="No hay registros que coincidan." action={canEdit ? <Button onClick={openCreate}>Crear corredor</Button> : undefined} />
      ) : (
        <Table columns={columns} data={filtered} keyExtractor={(r) => r.id} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar corredor' : 'Nuevo corredor'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Nombre completo *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            <Input label="Apodo" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
            <Input label="Fecha nacimiento" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
            <Select
              label="Género"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              options={[{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Femenino' }]}
              placeholder="Seleccionar…"
            />
          </div>
          <Textarea label="Biografía" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="cyclist-photo">Foto (JPG/PNG/WEBP, máx 5MB)</label>
            <input
              id="cyclist-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handlePhoto(e.target.files?.[0])}
              className="mt-1 block w-full text-sm"
            />
            {preview ? <img src={preview} alt="Vista previa" className="mt-2 h-24 w-24 rounded-lg object-cover" /> : null}
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Activo
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> Destacado
            </label>
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

export default AdminCyclists;
