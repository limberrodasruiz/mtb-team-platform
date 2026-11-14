import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Image, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../providers/ToastProvider';
import {
  createBanner,
  deleteBanner,
  getAdminBanners,
  updateBanner,
  type BannerInput,
} from '../../services/content';
import { resolveMediaUrl } from '../../services/storage';
import type { Banner } from '../../types';
import { errorMessage } from '../../lib/errors';
import {
  formatDateTime,
  fromDateTimeLocal,
  toDateTimeLocal,
} from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { ImageUpload } from '../../components/ui/ImageUpload';

interface BannerForm {
  title: string;
  subtitle: string;
  image_path: string | null;
  image_url: string | null;
  button_label: string;
  url: string;
  starts_at: string;
  ends_at: string;
  active: boolean;
  sort_order: string;
}

function emptyForm(): BannerForm {
  return {
    title: '',
    subtitle: '',
    image_path: null,
    image_url: null,
    button_label: '',
    url: '',
    starts_at: '',
    ends_at: '',
    active: true,
    sort_order: '0',
  };
}

function formFromBanner(banner: Banner): BannerForm {
  return {
    title: banner.title,
    subtitle: banner.subtitle ?? '',
    image_path: banner.image_path,
    image_url: banner.image_url,
    button_label: banner.button_label ?? '',
    url: banner.url ?? '',
    starts_at: toDateTimeLocal(banner.starts_at),
    ends_at: toDateTimeLocal(banner.ends_at),
    active: banner.active,
    sort_order: String(banner.sort_order),
  };
}

const PAGE_LOADED_AT = Date.now();

export function AdminBannersPage() {
  const { success, error: toastError } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data, loading, error, reload } = useAsync<Banner[]>(
    () => getAdminBanners(),
    [],
  );
  const banners = data ?? [];

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(banner: Banner) {
    setEditing(banner);
    setForm(formFromBanner(banner));
    setFormError(null);
    setFormOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      if (!form.image_path && !form.image_url) {
        throw new Error('El banner necesita una imagen.');
      }
      const payload: BannerInput = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        image_path: form.image_path,
        image_url: form.image_url,
        button_label: form.button_label.trim() || null,
        url: form.url.trim() || null,
        starts_at: fromDateTimeLocal(form.starts_at),
        ends_at: fromDateTimeLocal(form.ends_at),
        active: form.active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (!payload.title) throw new Error('El título es obligatorio.');

      if (editing) {
        await updateBanner(editing.id, payload);
        success('Banner actualizado.');
      } else {
        await createBanner(payload);
        success('Banner creado.');
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo guardar el banner.'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(banner: Banner) {
    setToggling(banner.id);
    try {
      await updateBanner(banner.id, { active: !banner.active });
      success(banner.active ? 'Banner desactivado.' : 'Banner activado.');
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo cambiar el estado del banner.'));
    } finally {
      setToggling(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteBanner(deleting.id);
      success('Banner eliminado.');
      setDeleting(null);
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo eliminar el banner.'));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Contenido"
        title="Banners"
        description="Imágenes principales del sitio. Los banners activos y vigentes se muestran en la portada."
        actions={
          <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
            Nuevo banner
          </Button>
        }
      />

      {loading ? (
        <LoadingBlock message="Cargando banners…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : banners.length === 0 ? (
        <EmptyState
          icon={Image}
          title="Sin banners"
          description="Sube una imagen con título y, si quieres, un botón hacia una noticia o página."
          action={
            <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
              Nuevo banner
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {banners.map((banner) => {
            const src = resolveMediaUrl(banner.image_path, banner.image_url, 'banners');
            const expired =
              banner.ends_at && new Date(banner.ends_at).getTime() < PAGE_LOADED_AT;
            const scheduled =
              banner.starts_at && new Date(banner.starts_at).getTime() > PAGE_LOADED_AT;
            return (
              <Card key={banner.id} className="overflow-hidden">
                <div className="grid md:grid-cols-[260px_1fr]">
                  <div className="relative aspect-[16/7] bg-slate-100 md:aspect-auto md:min-h-[150px]">
                    {src ? (
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Image className="h-8 w-8 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {banner.title}
                          </h3>
                          <Badge tone={banner.active ? 'success' : 'neutral'}>
                            {banner.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                          {expired && <Badge tone="danger">Vencido</Badge>}
                          {scheduled && <Badge tone="info">Programado</Badge>}
                        </div>
                        {banner.subtitle && (
                          <p className="mt-1 text-xs text-slate-500">{banner.subtitle}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Orden {banner.sort_order}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-500">
                      <span>Desde: {banner.starts_at ? formatDateTime(banner.starts_at) : 'sin límite'}</span>
                      <span>Hasta: {banner.ends_at ? formatDateTime(banner.ends_at) : 'sin límite'}</span>
                      {banner.button_label && (
                        <span>Botón: {banner.button_label}</span>
                      )}
                    </div>

                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(banner)}
                        startIcon={<Pencil className="h-3.5 w-3.5" />}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void toggleActive(banner)}
                        loading={toggling === banner.id}
                        startIcon={
                          banner.active ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )
                        }
                      >
                        {banner.active ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setDeleting(banner)}
                        startIcon={<Trash2 className="h-3.5 w-3.5" />}
                      >
                        Eliminar
                      </Button>
                      {banner.url && (
                        <a
                          href={banner.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto text-[11px] font-semibold text-[var(--brand-dark)] hover:underline"
                        >
                          Ver enlace
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar banner' : 'Nuevo banner'}
        description="La imagen se muestra en formato panorámico."
        size="lg"
        dismissible={!saving}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="banner-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear banner'}
            </Button>
          </>
        }
      >
        <form id="banner-form" onSubmit={save} className="space-y-4">
          <ImageUpload
            bucket="banners"
            prefix={form.title || 'banner'}
            valuePath={form.image_path}
            valueUrl={form.image_url}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                image_path: value?.path ?? null,
                image_url: value?.url ?? null,
              }))
            }
            label="Imagen del banner"
            aspect="wide"
          />
          <Input
            label="Título"
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            required
          />
          <Input
            label="Subtítulo"
            value={form.subtitle}
            onChange={(event) =>
              setForm((current) => ({ ...current, subtitle: event.target.value }))
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Texto del botón"
              value={form.button_label}
              onChange={(event) =>
                setForm((current) => ({ ...current, button_label: event.target.value }))
              }
              placeholder="Ver más"
            />
            <Input
              label="Enlace del botón"
              type="url"
              value={form.url}
              onChange={(event) =>
                setForm((current) => ({ ...current, url: event.target.value }))
              }
              placeholder="https://… o /noticias"
            />
            <Input
              label="Inicio"
              type="datetime-local"
              value={form.starts_at}
              onChange={(event) =>
                setForm((current) => ({ ...current, starts_at: event.target.value }))
              }
            />
            <Input
              label="Fin"
              type="datetime-local"
              value={form.ends_at}
              onChange={(event) =>
                setForm((current) => ({ ...current, ends_at: event.target.value }))
              }
            />
            <Input
              label="Orden"
              type="number"
              value={form.sort_order}
              onChange={(event) =>
                setForm((current) => ({ ...current, sort_order: event.target.value }))
              }
            />
            <label className="flex items-center gap-3 self-end rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({ ...current, active: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-[var(--brand)]"
              />
              Banner activo
            </label>
          </div>
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
        title="Eliminar banner"
        description={`Se eliminará “${deleting?.title ?? ''}”. La imagen permanece en Storage.`}
        confirmLabel="Eliminar"
        loading={deleteLoading}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
