import { useMemo, useState, type FormEvent } from 'react';
import {
  Eye,
  EyeOff,
  Images,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../providers/ToastProvider';
import {
  createGalleryItem,
  deleteGalleryItem,
  getAdminGallery,
  updateGalleryItem,
  type GalleryInput,
} from '../../services/content';
import { getAdminRaces } from '../../services/races';
import { getAdminCyclists } from '../../services/cyclists';
import { resolveMediaUrl } from '../../services/storage';
import type { Cyclist, GalleryItem, Race } from '../../types';
import { errorMessage } from '../../lib/errors';
import { formatDate, toDateInput } from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { SearchInput } from '../../components/ui/SearchInput';
import { ImageUpload } from '../../components/ui/ImageUpload';

interface PageData {
  items: GalleryItem[];
  races: Race[];
  cyclists: Cyclist[];
}

interface GalleryForm {
  title: string;
  description: string;
  date: string;
  race_id: string;
  cyclist_id: string;
  storage_path: string | null;
  url: string | null;
  alt_text: string;
  published: boolean;
  sort_order: string;
  width: number | null;
  height: number | null;
}

function emptyForm(): GalleryForm {
  return {
    title: '',
    description: '',
    date: '',
    race_id: '',
    cyclist_id: '',
    storage_path: null,
    url: null,
    alt_text: '',
    published: true,
    sort_order: '0',
    width: null,
    height: null,
  };
}

function formFromItem(item: GalleryItem): GalleryForm {
  return {
    title: item.title ?? '',
    description: item.description ?? '',
    date: toDateInput(item.date),
    race_id: item.race_id ?? '',
    cyclist_id: item.cyclist_id ?? '',
    storage_path: item.storage_path,
    url: item.url,
    alt_text: item.alt_text ?? '',
    published: item.published,
    sort_order: String(item.sort_order),
    width: item.width,
    height: item.height,
  };
}

export function AdminGalleryPage() {
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState('');
  const [publishedFilter, setPublishedFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [form, setForm] = useState<GalleryForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<GalleryItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsync<PageData>(async () => {
    const [items, races, cyclists] = await Promise.all([
      getAdminGallery(),
      getAdminRaces(),
      getAdminCyclists(),
    ]);
    return { items, races, cyclists };
  }, []);

  const items = useMemo(() => data?.items ?? [], [data]);
  const races = data?.races ?? [];
  const cyclists = data?.cyclists ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (publishedFilter === 'published' && !item.published) return false;
      if (publishedFilter === 'hidden' && item.published) return false;
      if (!term) return true;
      return [item.title, item.description, item.alt_text, item.race_name, item.cyclist_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [items, search, publishedFilter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(item: GalleryItem) {
    setEditing(item);
    setForm(formFromItem(item));
    setFormError(null);
    setFormOpen(true);
  }

  function updateForm<K extends keyof GalleryForm>(key: K, value: GalleryForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      if (!form.storage_path && !form.url) {
        throw new Error('Sube una fotografía antes de guardar.');
      }

      const payload: GalleryInput = {
        title: form.title.trim() || null,
        description: form.description.trim() || null,
        date: form.date || null,
        race_id: form.race_id || null,
        cyclist_id: form.cyclist_id || null,
        storage_bucket: 'gallery',
        storage_path: form.storage_path,
        url: form.url,
        alt_text: form.alt_text.trim() || null,
        published: form.published,
        sort_order: Number(form.sort_order) || 0,
        width: form.width,
        height: form.height,
      };

      if (editing) {
        await updateGalleryItem(editing.id, payload);
        success('Fotografía actualizada.');
      } else {
        await createGalleryItem(payload);
        success('Fotografía agregada a la galería.');
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo guardar la fotografía.'));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(item: GalleryItem) {
    setToggling(item.id);
    try {
      await updateGalleryItem(item.id, { published: !item.published });
      success(item.published ? 'Fotografía oculta.' : 'Fotografía publicada.');
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo cambiar la visibilidad.'));
    } finally {
      setToggling(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteGalleryItem(deleting.id);
      success('Fotografía eliminada de la galería.');
      setDeleting(null);
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo eliminar la fotografía.'));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Contenido"
        title="Galería"
        description="Fotografías del equipo. Las imágenes se optimizan antes de subirlas y las no publicadas quedan fuera del sitio."
        actions={
          <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
            Subir fotografía
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por título, carrera o corredor…"
            className="w-full sm:max-w-sm"
          />
          <select
            value={publishedFilter}
            onChange={(event) => setPublishedFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
            aria-label="Filtrar por visibilidad"
          >
            <option value="">Todas</option>
            <option value="published">Publicadas</option>
            <option value="hidden">Ocultas</option>
          </select>
          <span className="text-xs text-slate-500 sm:ml-auto">
            {filtered.length} de {items.length} fotografías
          </span>
        </div>

        {loading ? (
          <div className="p-5">
            <LoadingBlock message="Cargando galería…" />
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Images}
              title={items.length === 0 ? 'La galería está vacía' : 'Sin coincidencias'}
              description={
                items.length === 0
                  ? 'Sube fotografías de carreras, entrenamientos y eventos del equipo.'
                  : 'Prueba con otro término o cambia el filtro.'
              }
              action={
                items.length === 0 ? (
                  <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
                    Subir fotografía
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => {
              const src = resolveMediaUrl(item.storage_path, item.url, item.storage_bucket || 'gallery');
              return (
                <article
                  key={item.id}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {src ? (
                      <img
                        src={src}
                        alt={item.alt_text || item.title || 'Fotografía del equipo'}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Images className="h-8 w-8 text-slate-300" />
                      </div>
                    )}
                    {!item.published && (
                      <span className="absolute left-2 top-2">
                        <Badge tone="neutral">Oculta</Badge>
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {item.title || 'Sin título'}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {[item.race_name, item.cyclist_name, formatDate(item.date)]
                            .filter(Boolean)
                            .join(' · ') || 'Sin contexto'}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <button
                          type="button"
                          onClick={() => void togglePublished(item)}
                          disabled={toggling === item.id}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                          aria-label={item.published ? 'Ocultar fotografía' : 'Publicar fotografía'}
                          title={item.published ? 'Ocultar' : 'Publicar'}
                        >
                          {item.published ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label="Editar fotografía"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(item)}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Eliminar fotografía"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar fotografía' : 'Subir fotografía'}
        size="lg"
        dismissible={!saving}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="gallery-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Agregar a la galería'}
            </Button>
          </>
        }
      >
        <form id="gallery-form" onSubmit={save} className="space-y-4">
          <ImageUpload
            bucket="gallery"
            prefix={form.title || form.race_id || 'galeria'}
            valuePath={form.storage_path}
            valueUrl={form.url}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                storage_path: value?.path ?? null,
                url: value?.url ?? null,
                width: value?.width ?? null,
                height: value?.height ?? null,
              }))
            }
            label="Fotografía"
            aspect="video"
          />
          <Input
            label="Título"
            value={form.title}
            onChange={(event) => updateForm('title', event.target.value)}
            placeholder="Opcional, para accesibilidad y búsqueda."
          />
          <Textarea
            label="Descripción"
            value={form.description}
            onChange={(event) => updateForm('description', event.target.value)}
            rows={2}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Fecha"
              type="date"
              value={form.date}
              onChange={(event) => updateForm('date', event.target.value)}
            />
            <Input
              label="Orden"
              type="number"
              value={form.sort_order}
              onChange={(event) => updateForm('sort_order', event.target.value)}
            />
            <Select
              label="Carrera"
              value={form.race_id}
              onChange={(event) => updateForm('race_id', event.target.value)}
            >
              <option value="">Sin carrera</option>
              {races.map((race) => (
                <option key={race.id} value={race.id}>
                  {race.name} · {formatDate(race.date)}
                </option>
              ))}
            </Select>
            <Select
              label="Corredor"
              value={form.cyclist_id}
              onChange={(event) => updateForm('cyclist_id', event.target.value)}
            >
              <option value="">Sin corredor</option>
              {cyclists.map((cyclist) => (
                <option key={cyclist.id} value={cyclist.id}>
                  {cyclist.full_name}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label="Texto alternativo"
            value={form.alt_text}
            onChange={(event) => updateForm('alt_text', event.target.value)}
            placeholder="Describe la imagen para personas con lector de pantalla."
          />
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(event) => updateForm('published', event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[var(--brand)]"
            />
            Visible en la galería pública
          </label>
          {formError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {formError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Eliminar fotografía"
        description="Se quitará la fotografía de la galería. El archivo original permanece en Storage para no perder evidencia."
        confirmLabel="Eliminar"
        loading={deleteLoading}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
