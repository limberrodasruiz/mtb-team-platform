import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  ExternalLink,
  Medal,
  Pencil,
  Plus,
  Power,
  Star,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../providers/ToastProvider';
import {
  createAchievement,
  createCyclist,
  deleteAchievement,
  getAdminCyclists,
  getCyclistAchievements,
  updateAchievement,
  updateCyclist,
  setCyclistActive,
  setCyclistFeatured,
} from '../../services/cyclists';
import { getAdminCategories } from '../../services/categories';
import { getPublicUrl } from '../../services/storage';
import type { Achievement, Category, Cyclist } from '../../types';
import { formatDate, initials, toDateInput } from '../../utils/format';
import { errorMessage } from '../../lib/errors';
import { slugify } from '../../utils/slug';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Checkbox, Input, Select, Textarea } from '../../components/ui/Input';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { SearchInput } from '../../components/ui/SearchInput';
import { ImageUpload } from '../../components/ui/ImageUpload';

interface PageData {
  cyclists: Cyclist[];
  categories: Category[];
}

interface CyclistForm {
  full_name: string;
  slug: string;
  nickname: string;
  birth_date: string;
  category_id: string;
  specialty: string;
  number: string;
  photo_path: string | null;
  photo_url: string | null;
  bio: string;
  team_since: string;
  joined_at: string;
  featured: boolean;
  active: boolean;
  notes_private: string;
}

function emptyForm(): CyclistForm {
  return {
    full_name: '',
    slug: '',
    nickname: '',
    birth_date: '',
    category_id: '',
    specialty: '',
    number: '',
    photo_path: null,
    photo_url: null,
    bio: '',
    team_since: '',
    joined_at: '',
    featured: false,
    active: true,
    notes_private: '',
  };
}

function formFrom(cyclist: Cyclist): CyclistForm {
  return {
    full_name: cyclist.full_name,
    slug: cyclist.slug,
    nickname: cyclist.nickname ?? '',
    birth_date: toDateInput(cyclist.birth_date),
    category_id: cyclist.category_id ?? '',
    specialty: cyclist.specialty ?? '',
    number: cyclist.number !== null ? String(cyclist.number) : '',
    photo_path: cyclist.photo_path,
    photo_url: cyclist.photo_url,
    bio: cyclist.bio ?? '',
    team_since: cyclist.team_since !== null ? String(cyclist.team_since) : '',
    joined_at: toDateInput(cyclist.joined_at),
    featured: cyclist.featured,
    active: cyclist.active,
    notes_private: cyclist.notes_private ?? '',
  };
}

function avatarUrl(cyclist: Cyclist): string | null {
  if (cyclist.photo_url) return cyclist.photo_url;
  if (cyclist.photo_path) return getPublicUrl('cyclists', cyclist.photo_path);
  return null;
}

const CURRENT_YEAR = new Date().getFullYear();

export function AdminCyclistsPage() {
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Cyclist | null>(null);
  const [form, setForm] = useState<CyclistForm>(emptyForm());
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [achievementsFor, setAchievementsFor] = useState<Cyclist | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsync<PageData>(async () => {
    const [cyclists, categories] = await Promise.all([
      getAdminCyclists(),
      getAdminCategories(),
    ]);
    return { cyclists, categories };
  }, []);

  const cyclists = useMemo(() => data?.cyclists ?? [], [data]);
  const categories = useMemo(() => data?.categories ?? [], [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return cyclists.filter((cyclist) => {
      if (categoryFilter && cyclist.category_id !== categoryFilter) return false;
      if (statusFilter === 'activos' && !cyclist.active) return false;
      if (statusFilter === 'inactivos' && cyclist.active) return false;
      if (statusFilter === 'destacados' && !cyclist.featured) return false;
      if (!term) return true;
      return [cyclist.full_name, cyclist.nickname, cyclist.specialty]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [cyclists, search, categoryFilter, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setSlugEdited(false);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(cyclist: Cyclist) {
    setEditing(cyclist);
    setForm(formFrom(cyclist));
    setSlugEdited(true);
    setFormError(null);
    setFormOpen(true);
  }

  function updateForm<K extends keyof CyclistForm>(key: K, value: CyclistForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onNameChange(value: string) {
    setForm((current) => ({
      ...current,
      full_name: value,
      slug: slugEdited ? current.slug : slugify(value),
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const number = form.number.trim() ? Number(form.number) : null;
      const teamSince = form.team_since.trim() ? Number(form.team_since) : null;

      if (number !== null && (!Number.isInteger(number) || number < 0)) {
        throw new Error('El dorsal debe ser un número entero positivo.');
      }
      if (teamSince !== null && (!Number.isInteger(teamSince) || teamSince < 1900)) {
        throw new Error('El año de ingreso no es válido.');
      }

      const payload = {
        full_name: form.full_name.trim(),
        slug: slugify(form.slug || form.full_name),
        nickname: form.nickname.trim() || null,
        birth_date: form.birth_date || null,
        category_id: form.category_id || null,
        specialty: form.specialty.trim() || null,
        number,
        photo_path: form.photo_path,
        photo_url: form.photo_url,
        bio: form.bio.trim() || null,
        team_since: teamSince,
        joined_at: form.joined_at || null,
        featured: form.featured,
        active: form.active,
        notes_private: form.notes_private.trim() || null,
      };

      if (!payload.full_name) throw new Error('El nombre es obligatorio.');
      if (!payload.slug) throw new Error('El enlace público es obligatorio.');

      if (editing) {
        await updateCyclist(editing.id, payload);
        success('Corredor actualizado.');
      } else {
        await createCyclist(payload as Parameters<typeof createCyclist>[0]);
        success('Corredor creado.');
      }

      setFormOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo guardar el corredor.'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(cyclist: Cyclist) {
    setToggling(cyclist.id);
    try {
      await setCyclistActive(cyclist.id, !cyclist.active);
      success(cyclist.active ? 'Corredor desactivado.' : 'Corredor activado.');
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo cambiar el estado.'));
    } finally {
      setToggling(null);
    }
  }

  async function toggleFeatured(cyclist: Cyclist) {
    setToggling(cyclist.id);
    try {
      await setCyclistFeatured(cyclist.id, !cyclist.featured);
      success(
        cyclist.featured ? 'Corredor quitado de destacados.' : 'Corredor marcado como destacado.',
      );
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo actualizar el destacado.'));
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Deportivo"
        title="Corredores"
        description="Plantilla del equipo, datos públicos, categorías y palmarés."
        actions={
          <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
            Nuevo corredor
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Plantilla total
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-950">{cyclists.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Activos en el sitio
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-950">
            {cyclists.filter((cyclist) => cyclist.active).length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Destacados
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-950">
            {cyclists.filter((cyclist) => cyclist.featured).length}
          </p>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar corredor…"
            className="w-full lg:max-w-xs"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
              aria-label="Filtrar por categoría"
            >
              <option value="">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
              aria-label="Filtrar por estado"
            >
              <option value="">Todos los estados</option>
              <option value="activos">Solo activos</option>
              <option value="inactivos">Solo inactivos</option>
              <option value="destacados">Solo destacados</option>
            </select>
          </div>
          <span className="ml-auto text-xs text-slate-500">
            {filtered.length} de {cyclists.length}
          </span>
        </div>

        {loading ? (
          <div className="p-5">
            <LoadingBlock message="Cargando corredores…" />
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={UserRound}
              title={cyclists.length === 0 ? 'Todavía no hay corredores' : 'Sin coincidencias'}
              description={
                cyclists.length === 0
                  ? 'Crea el primer perfil de la plantilla para que aparezca en el sitio público.'
                  : 'Prueba con otro nombre, categoría o estado.'
              }
              action={
                cyclists.length === 0 ? (
                  <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
                    Nuevo corredor
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-left">Corredor</th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-center">Dorsal</th>
                  <th className="px-4 py-3 text-center">Edad</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((cyclist) => {
                  const photo = avatarUrl(cyclist);
                  const category = categories.find((item) => item.id === cyclist.category_id);
                  return (
                    <tr key={cyclist.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3" data-label="Corredor">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                            {photo ? (
                              <img
                                src={photo}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-slate-500">
                                {initials(cyclist.full_name)}
                              </span>
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate font-medium text-slate-900">
                                {cyclist.full_name}
                              </p>
                              {cyclist.featured && (
                                <Star
                                  className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400"
                                  aria-label="Destacado"
                                />
                              )}
                            </div>
                            <p className="truncate text-[11px] text-slate-500">
                              {cyclist.nickname ? `“${cyclist.nickname}” · ` : ''}
                              {cyclist.specialty || category?.name || 'Sin especialidad'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600" data-label="Categoría">
                        {category?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-center" data-label="Dorsal">
                        {cyclist.number ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center" data-label="Edad">
                        {cyclist.birth_date
                          ? Math.max(
                              0,
                              CURRENT_YEAR - Number(cyclist.birth_date.slice(0, 4)),
                            )
                          : '—'}
                      </td>
                      <td className="px-4 py-3" data-label="Estado">
                        <StatusBadge status={cyclist.active ? 'ACTIVO' : 'INACTIVO'} />
                      </td>
                      <td className="px-4 py-3" data-label="Acciones">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(cyclist)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                            aria-label={`Editar ${cyclist.full_name}`}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAchievementsFor(cyclist)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                            aria-label={`Logros de ${cyclist.full_name}`}
                            title="Logros"
                          >
                            <Award className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleFeatured(cyclist)}
                            disabled={toggling === cyclist.id}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40"
                            aria-label={cyclist.featured ? 'Quitar de destacados' : 'Destacar'}
                            title="Destacar"
                          >
                            <Star
                              className={`h-4 w-4 ${cyclist.featured ? 'fill-amber-400 text-amber-500' : ''}`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleActive(cyclist)}
                            disabled={toggling === cyclist.id}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                            aria-label={cyclist.active ? 'Desactivar' : 'Activar'}
                            title={cyclist.active ? 'Desactivar' : 'Activar'}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          {cyclist.active && (
                            <Link
                              to={`/corredores/${cyclist.slug}`}
                              target="_blank"
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                              aria-label="Ver perfil público"
                              title="Ver perfil público"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar corredor' : 'Nuevo corredor'}
        description="Los datos marcados como privados no se publican en el sitio."
        size="xl"
        dismissible={!saving}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="cyclist-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear corredor'}
            </Button>
          </>
        }
      >
        <form id="cyclist-form" onSubmit={save} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
            <ImageUpload
              bucket="cyclists"
              prefix={form.slug || form.full_name || 'corredor'}
              valuePath={form.photo_path}
              valueUrl={form.photo_url}
              onChange={(value) => {
                setForm((current) => ({
                  ...current,
                  photo_path: value?.path ?? null,
                  photo_url: value?.url ?? null,
                }));
              }}
              label="Fotografía"
              aspect="portrait"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nombre completo"
                value={form.full_name}
                onChange={(event) => onNameChange(event.target.value)}
                required
                containerClassName="sm:col-span-2"
              />
              <Input
                label="Enlace público"
                value={form.slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  updateForm('slug', slugify(event.target.value));
                }}
                hint={`/corredores/${form.slug || 'enlace'}`}
                required
              />
              <Input
                label="Apodo"
                value={form.nickname}
                onChange={(event) => updateForm('nickname', event.target.value)}
                placeholder="Opcional"
              />
              <Select
                label="Categoría"
                value={form.category_id}
                onChange={(event) => updateForm('category_id', event.target.value)}
              >
                <option value="">Sin categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Especialidad"
                value={form.specialty}
                onChange={(event) => updateForm('specialty', event.target.value)}
                placeholder="Descenso, XCO, maratón…"
              />
              <Input
                label="Dorsal"
                type="number"
                min={0}
                value={form.number}
                onChange={(event) => updateForm('number', event.target.value)}
              />
              <Input
                label="Año de ingreso"
                type="number"
                min={1900}
                max={2100}
                value={form.team_since}
                onChange={(event) => updateForm('team_since', event.target.value)}
              />
              <Input
                label="Fecha de nacimiento"
                type="date"
                value={form.birth_date}
                onChange={(event) => updateForm('birth_date', event.target.value)}
                hint="Dato privado; solo se publica la edad."
              />
              <Input
                label="Miembro desde"
                type="date"
                value={form.joined_at}
                onChange={(event) => updateForm('joined_at', event.target.value)}
              />
            </div>
          </div>

          <Textarea
            label="Biografía pública"
            value={form.bio}
            onChange={(event) => updateForm('bio', event.target.value)}
            rows={4}
            placeholder="Trayectoria, logros y estilo de carrera…"
          />

          <Textarea
            label="Notas internas"
            value={form.notes_private}
            onChange={(event) => updateForm('notes_private', event.target.value)}
            rows={2}
            placeholder="Solo visible para el staff. No se publica."
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Checkbox
              label="Publicar en el sitio"
              description="Solo los corredores activos aparecen en la web."
              checked={form.active}
              onChange={(event) => updateForm('active', event.target.checked)}
            />
            <Checkbox
              label="Destacar en la portada"
              description="Se muestra en la selección principal."
              checked={form.featured}
              onChange={(event) => updateForm('featured', event.target.checked)}
            />
          </div>

          {formError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700" role="alert">
              {formError}
            </p>
          )}
        </form>
      </Modal>

      {achievementsFor && (
        <AchievementsModal
          cyclist={achievementsFor}
          onClose={() => setAchievementsFor(null)}
        />
      )}
    </>
  );
}

interface AchievementForm {
  title: string;
  year: string;
  description: string;
  achieved_at: string;
  highlight: boolean;
  sort_order: string;
}

function emptyAchievement(): AchievementForm {
  return {
    title: '',
    year: String(new Date().getFullYear()),
    description: '',
    achieved_at: '',
    highlight: false,
    sort_order: '0',
  };
}

function AchievementsModal({
  cyclist,
  onClose,
}: {
  cyclist: Cyclist;
  onClose: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [form, setForm] = useState<AchievementForm>(emptyAchievement());
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Achievement | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data, loading, error, reload } = useAsync<Achievement[]>(
    () => getCyclistAchievements(cyclist.id),
    [cyclist.id],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyAchievement());
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(achievement: Achievement) {
    setEditing(achievement);
    setForm({
      title: achievement.title,
      year: achievement.year ? String(achievement.year) : '',
      description: achievement.description ?? '',
      achieved_at: toDateInput(achievement.achieved_at),
      highlight: achievement.highlight,
      sort_order: String(achievement.sort_order),
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        cyclist_id: cyclist.id,
        title: form.title.trim(),
        year: form.year ? Number(form.year) : null,
        description: form.description.trim() || null,
        achieved_at: form.achieved_at || null,
        highlight: form.highlight,
        sort_order: Number(form.sort_order) || 0,
      };
      if (!payload.title) throw new Error('El título es obligatorio.');

      if (editing) {
        await updateAchievement(editing.id, payload);
        success('Logro actualizado.');
      } else {
        await createAchievement(payload);
        success('Logro agregado.');
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo guardar el logro.'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteAchievement(deleting.id);
      success('Logro eliminado.');
      setDeleting(null);
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo eliminar el logro.'));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={`Logros de ${cyclist.full_name}`}
        description="Palmarés que aparece en el perfil público del corredor."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
              Agregar logro
            </Button>
          </>
        }
      >
        {loading ? (
          <LoadingBlock message="Cargando logros…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            compact
            icon={Medal}
            title="Sin logros registrados"
            description="Agrega campeonatos, podios o reconocimientos para destacar la trayectoria."
            action={
              <Button size="sm" onClick={openCreate}>
                Agregar logro
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {(data ?? []).map((achievement) => (
              <li
                key={achievement.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{achievement.title}</p>
                    {achievement.highlight && (
                      <Badge tone="warning">Destacado</Badge>
                    )}
                    {achievement.year && (
                      <span className="text-[11px] font-semibold text-slate-400">
                        {achievement.year}
                      </span>
                    )}
                  </div>
                  {achievement.description && (
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      {achievement.description}
                    </p>
                  )}
                  {achievement.achieved_at && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatDate(achievement.achieved_at)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(achievement)}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Editar logro"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(achievement)}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Eliminar logro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar logro' : 'Nuevo logro'}
        size="md"
        dismissible={!saving}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="achievement-form" loading={saving}>
              Guardar
            </Button>
          </>
        }
      >
        <form id="achievement-form" onSubmit={save} className="space-y-4">
          <Input
            label="Título"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            required
            placeholder="Campeón departamental XCO"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Año"
              type="number"
              value={form.year}
              onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
            />
            <Input
              label="Fecha"
              type="date"
              value={form.achieved_at}
              onChange={(event) =>
                setForm((current) => ({ ...current, achieved_at: event.target.value }))
              }
            />
          </div>
          <Textarea
            label="Descripción"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            rows={3}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Orden"
              type="number"
              value={form.sort_order}
              onChange={(event) =>
                setForm((current) => ({ ...current, sort_order: event.target.value }))
              }
            />
            <Checkbox
              label="Destacar logro"
              description="Se muestra con énfasis en el perfil."
              checked={form.highlight}
              onChange={(event) =>
                setForm((current) => ({ ...current, highlight: event.target.checked }))
              }
            />
          </div>
          {formError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {formError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Eliminar logro"
        description={`Se eliminará “${deleting?.title ?? ''}” del palmarés. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleteLoading}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
