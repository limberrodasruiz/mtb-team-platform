import { useMemo, useState, type FormEvent } from 'react';
import { Layers, Pencil, Plus, Power } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../providers/ToastProvider';
import {
  createCategory,
  getAdminCategories,
  setCategoryActive,
  updateCategory,
  type CategoryInput,
} from '../../services/categories';
import type { Category } from '../../types';
import { errorMessage } from '../../lib/errors';
import { slugify } from '../../utils/slug';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { SearchInput } from '../../components/ui/SearchInput';

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  sort_order: string;
  active: boolean;
}

function emptyForm(): CategoryForm {
  return {
    name: '',
    slug: '',
    description: '',
    sort_order: '0',
    active: true,
  };
}

export function AdminCategoriesPage() {
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(emptyForm());
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsync<Category[]>(
    () => getAdminCategories(),
    [],
  );
  const categories = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((category) =>
      [category.name, category.slug, category.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [categories, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setSlugEdited(false);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      sort_order: String(category.sort_order),
      active: category.active,
    });
    setSlugEdited(true);
    setFormError(null);
    setFormOpen(true);
  }

  function onNameChange(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugEdited ? current.slug : slugify(value),
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload: CategoryInput = {
        name: form.name,
        slug: slugify(form.slug || form.name),
        description: form.description || null,
        sort_order: Number(form.sort_order) || 0,
        active: form.active,
      };
      if (editing) {
        await updateCategory(editing.id, payload);
        success('Categoría actualizada.');
      } else {
        await createCategory(payload);
        success('Categoría creada.');
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo guardar la categoría.'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category: Category) {
    setToggling(category.id);
    try {
      await setCategoryActive(category.id, !category.active);
      success(category.active ? 'Categoría desactivada.' : 'Categoría activada.');
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo cambiar el estado.'));
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Deportivo"
        title="Categorías"
        description="Las categorías activas se usan en corredores, resultados y ranking."
        actions={
          <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
            Nueva categoría
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Categorías', value: categories.length },
          { label: 'Activas', value: categories.filter((category) => category.active).length },
          { label: 'Inactivas', value: categories.filter((category) => !category.active).length },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {item.label}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-950">{item.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar categoría…"
            className="w-full sm:max-w-xs"
          />
          <span className="text-xs text-slate-500 sm:ml-auto">
            {filtered.length} de {categories.length}
          </span>
        </div>

        {loading ? (
          <div className="p-5">
            <LoadingBlock message="Cargando categorías…" />
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Layers}
              title={categories.length === 0 ? 'Sin categorías' : 'Sin coincidencias'}
              description={
                categories.length === 0
                  ? 'Crea categorías como Élite, Sub-23, Junior o Damas para organizar la plantilla.'
                  : 'Prueba con otro término de búsqueda.'
              }
              action={
                categories.length === 0 ? (
                  <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
                    Nueva categoría
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table responsive-table w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-center">Orden</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((category) => (
                  <tr key={category.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3" data-label="Categoría">
                      <p className="font-medium text-slate-900">{category.name}</p>
                      <p className="text-[11px] text-slate-400">/categorias/{category.slug}</p>
                    </td>
                    <td className="max-w-md px-4 py-3 text-slate-600" data-label="Descripción">
                      <span className="line-clamp-2">{category.description || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums" data-label="Orden">
                      {category.sort_order}
                    </td>
                    <td className="px-4 py-3" data-label="Estado">
                      <StatusBadge status={category.active ? 'ACTIVO' : 'INACTIVO'} />
                    </td>
                    <td className="px-4 py-3" data-label="Acciones">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(category)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label={`Editar ${category.name}`}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleActive(category)}
                          disabled={toggling === category.id}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                          aria-label={category.active ? 'Desactivar' : 'Activar'}
                          title={category.active ? 'Desactivar' : 'Activar'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        {!category.active && <Badge tone="neutral">Oculta</Badge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        description="El enlace se usa en filtros y navegación interna."
        dismissible={!saving}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="category-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={save} className="space-y-4">
          <Input
            label="Nombre"
            value={form.name}
            onChange={(event) => onNameChange(event.target.value)}
            required
            placeholder="Élite"
          />
          <Input
            label="Enlace"
            value={form.slug}
            onChange={(event) => {
              setSlugEdited(true);
              setForm((current) => ({ ...current, slug: slugify(event.target.value) }));
            }}
            hint={`/categorias/${form.slug || 'enlace'}`}
            required
          />
          <Textarea
            label="Descripción"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            rows={3}
            placeholder="Descripción breve de la categoría."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Orden"
              type="number"
              value={form.sort_order}
              onChange={(event) =>
                setForm((current) => ({ ...current, sort_order: event.target.value }))
              }
              hint="Menor número aparece primero."
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
              Categoría activa
            </label>
          </div>
          {formError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {formError}
            </p>
          )}
        </form>
      </Modal>
    </>
  );
}
