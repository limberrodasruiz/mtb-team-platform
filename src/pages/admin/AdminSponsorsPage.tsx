import { useMemo, useState, type FormEvent } from 'react';
import {
  Building2,
  ExternalLink,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../providers/ToastProvider';
import {
  createSponsor,
  deleteSponsor,
  getAdminSponsors,
  updateSponsor,
} from '../../services/content';
import { resolveMediaUrl } from '../../services/storage';
import type { Sponsor, SponsorSocials } from '../../types';
import type { SponsorInput } from '../../services/content';
import { errorMessage } from '../../lib/errors';
import { formatDate, toDateInput } from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { SearchInput } from '../../components/ui/SearchInput';
import { ImageUpload } from '../../components/ui/ImageUpload';

interface SponsorForm {
  name: string;
  description: string;
  website: string;
  support_type: string;
  starts_at: string;
  ends_at: string;
  active: boolean;
  featured: boolean;
  sort_order: string;
  logo_path: string | null;
  logo_url: string | null;
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
}

function socialsFrom(form: SponsorForm): SponsorSocials {
  const socials: SponsorSocials = {};
  for (const key of ['facebook', 'instagram', 'tiktok', 'youtube'] as const) {
    const value = form[key].trim();
    if (value) socials[key] = value;
  }
  return socials;
}

function emptyForm(): SponsorForm {
  return {
    name: '',
    description: '',
    website: '',
    support_type: '',
    starts_at: '',
    ends_at: '',
    active: true,
    featured: false,
    sort_order: '0',
    logo_path: null,
    logo_url: null,
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
  };
}

function formFromSponsor(sponsor: Sponsor): SponsorForm {
  return {
    name: sponsor.name,
    description: sponsor.description ?? '',
    website: sponsor.website ?? '',
    support_type: sponsor.support_type ?? '',
    starts_at: toDateInput(sponsor.starts_at),
    ends_at: toDateInput(sponsor.ends_at),
    active: sponsor.active,
    featured: sponsor.featured,
    sort_order: String(sponsor.sort_order),
    logo_path: sponsor.logo_path,
    logo_url: sponsor.logo_url,
    facebook: sponsor.socials.facebook ?? '',
    instagram: sponsor.socials.instagram ?? '',
    tiktok: sponsor.socials.tiktok ?? '',
    youtube: sponsor.socials.youtube ?? '',
  };
}

export function AdminSponsorsPage() {
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [form, setForm] = useState<SponsorForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Sponsor | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data, loading, error, reload } = useAsync<Sponsor[]>(
    () => getAdminSponsors(),
    [],
  );
  const sponsors = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sponsors;
    return sponsors.filter((sponsor) =>
      [sponsor.name, sponsor.description, sponsor.support_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [sponsors, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(sponsor: Sponsor) {
    setEditing(sponsor);
    setForm(formFromSponsor(sponsor));
    setFormError(null);
    setFormOpen(true);
  }

  function updateForm<K extends keyof SponsorForm>(key: K, value: SponsorForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload: SponsorInput = {
        name: form.name.trim(),
        logo_path: form.logo_path,
        logo_url: form.logo_url,
        description: form.description.trim() || null,
        website: form.website.trim() || null,
        socials: socialsFrom(form),
        support_type: form.support_type.trim() || null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        active: form.active,
        sort_order: Number(form.sort_order) || 0,
        featured: form.featured,
      };
      if (!payload.name) throw new Error('El nombre del auspiciador es obligatorio.');

      if (editing) {
        await updateSponsor(editing.id, payload);
        success('Auspiciador actualizado.');
      } else {
        await createSponsor(payload);
        success('Auspiciador creado.');
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo guardar el auspiciador.'));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(sponsor: Sponsor, field: 'active' | 'featured') {
    setToggling(sponsor.id);
    try {
      await updateSponsor(sponsor.id, { [field]: !sponsor[field] });
      success(
        field === 'active'
          ? sponsor.active
            ? 'Auspiciador desactivado.'
            : 'Auspiciador activado.'
          : sponsor.featured
            ? 'Auspiciador quitado de destacados.'
            : 'Auspiciador destacado.',
      );
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo actualizar el auspiciador.'));
    } finally {
      setToggling(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteSponsor(deleting.id);
      success('Auspiciador eliminado.');
      setDeleting(null);
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo eliminar el auspiciador.'));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Contenido"
        title="Auspiciadores"
        description="Marcas y aliados que apoyan al equipo. Los activos aparecen en el sitio público."
        actions={
          <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
            Nuevo auspiciador
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar auspiciador…"
            className="w-full sm:max-w-xs"
          />
          <span className="text-xs text-slate-500 sm:ml-auto">
            {filtered.length} de {sponsors.length}
          </span>
        </div>

        {loading ? (
          <div className="p-5">
            <LoadingBlock message="Cargando auspiciadores…" />
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Building2}
              title={sponsors.length === 0 ? 'Sin auspiciadores' : 'Sin coincidencias'}
              description={
                sponsors.length === 0
                  ? 'Agrega las marcas que apoyan al equipo para mostrarlas en el sitio.'
                  : 'Prueba con otro término de búsqueda.'
              }
              action={
                sponsors.length === 0 ? (
                  <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
                    Nuevo auspiciador
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((sponsor) => {
              const logo = resolveMediaUrl(sponsor.logo_path, sponsor.logo_url, 'sponsors');
              return (
                <article
                  key={sponsor.id}
                  className="flex flex-col rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-2">
                      {logo ? (
                        <img
                          src={logo}
                          alt={sponsor.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Building2 className="h-6 w-6 text-slate-300" />
                      )}
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        onClick={() => void toggle(sponsor, 'featured')}
                        disabled={toggling === sponsor.id}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40"
                        aria-label={sponsor.featured ? 'Quitar destacado' : 'Destacar'}
                        title="Destacar"
                      >
                        <Star
                          className={`h-4 w-4 ${sponsor.featured ? 'fill-amber-400 text-amber-500' : ''}`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{sponsor.name}</h3>
                    <Badge tone={sponsor.active ? 'success' : 'neutral'}>
                      {sponsor.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  {sponsor.support_type && (
                    <p className="mt-1 text-[11px] font-medium text-[var(--brand-dark)]">
                      {sponsor.support_type}
                    </p>
                  )}
                  {sponsor.description && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {sponsor.description}
                    </p>
                  )}
                  <p className="mt-2 text-[10px] text-slate-400">
                    {sponsor.starts_at || sponsor.ends_at
                      ? `Vigencia: ${sponsor.starts_at ? formatDate(sponsor.starts_at) : '—'} a ${sponsor.ends_at ? formatDate(sponsor.ends_at) : '—'}`
                      : 'Sin vigencia definida'}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                    <Button size="sm" variant="outline" onClick={() => openEdit(sponsor)}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void toggle(sponsor, 'active')}
                      disabled={toggling === sponsor.id}
                    >
                      {sponsor.active ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => setDeleting(sponsor)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    {sponsor.website && (
                      <a
                        href={sponsor.website}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-dark)] hover:underline"
                      >
                        Web
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    )}
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
        title={editing ? 'Editar auspiciador' : 'Nuevo auspiciador'}
        size="lg"
        dismissible={!saving}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="sponsor-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear auspiciador'}
            </Button>
          </>
        }
      >
        <form id="sponsor-form" onSubmit={save} className="space-y-4">
          <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
            <ImageUpload
              bucket="sponsors"
              prefix={form.name || 'auspiciador'}
              valuePath={form.logo_path}
              valueUrl={form.logo_url}
              onChange={(value) => {
                setForm((current) => ({
                  ...current,
                  logo_path: value?.path ?? null,
                  logo_url: value?.url ?? null,
                }));
              }}
              label="Logo"
              aspect="square"
            />
            <div className="space-y-4">
              <Input
                label="Nombre"
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                required
              />
              <Input
                label="Tipo de apoyo"
                value={form.support_type}
                onChange={(event) => updateForm('support_type', event.target.value)}
                placeholder="Auspiciador principal, indumentaria, hidratación…"
              />
              <Input
                label="Sitio web"
                type="url"
                value={form.website}
                onChange={(event) => updateForm('website', event.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          <Textarea
            label="Descripción"
            value={form.description}
            onChange={(event) => updateForm('description', event.target.value)}
            rows={3}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Facebook"
              value={form.facebook}
              onChange={(event) => updateForm('facebook', event.target.value)}
              placeholder="https://facebook.com/…"
            />
            <Input
              label="Instagram"
              value={form.instagram}
              onChange={(event) => updateForm('instagram', event.target.value)}
              placeholder="https://instagram.com/…"
            />
            <Input
              label="TikTok"
              value={form.tiktok}
              onChange={(event) => updateForm('tiktok', event.target.value)}
              placeholder="https://tiktok.com/@…"
            />
            <Input
              label="YouTube"
              value={form.youtube}
              onChange={(event) => updateForm('youtube', event.target.value)}
              placeholder="https://youtube.com/…"
            />
            <Input
              label="Vigencia desde"
              type="date"
              value={form.starts_at}
              onChange={(event) => updateForm('starts_at', event.target.value)}
            />
            <Input
              label="Vigencia hasta"
              type="date"
              value={form.ends_at}
              onChange={(event) => updateForm('ends_at', event.target.value)}
            />
            <Input
              label="Orden"
              type="number"
              value={form.sort_order}
              onChange={(event) => updateForm('sort_order', event.target.value)}
            />
            <div className="grid grid-cols-2 gap-3 self-end">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => updateForm('active', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[var(--brand)]"
                />
                Activo
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(event) => updateForm('featured', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[var(--brand)]"
                />
                Destacado
              </label>
            </div>
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
        title="Eliminar auspiciador"
        description={`Se eliminará “${deleting?.name ?? ''}” del sitio. El logo permanece en Storage.`}
        confirmLabel="Eliminar"
        loading={deleteLoading}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
