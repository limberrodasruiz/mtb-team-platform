import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  Eye,
  EyeOff,
  Newspaper,
  Pencil,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../providers/ToastProvider';
import {
  createNews,
  deleteNews,
  getAdminNews,
  setNewsStatus,
  updateNews,
  type NewsInput,
} from '../../services/content';
import type { NewsItem, NewsStatus } from '../../types';
import { errorMessage } from '../../lib/errors';
import { slugify } from '../../utils/slug';
import {
  formatDate,
  fromDateTimeLocal,
  toDateTimeLocal,
} from '../../utils/format';
import { resolveMediaUrl } from '../../services/storage';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { SearchInput } from '../../components/ui/SearchInput';
import { ImageUpload } from '../../components/ui/ImageUpload';

interface NewsForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  status: NewsStatus;
  featured: boolean;
  published_at: string;
  cover_path: string | null;
  cover_url: string | null;
}

function emptyForm(): NewsForm {
  return {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    author: '',
    category: '',
    status: 'BORRADOR',
    featured: false,
    published_at: '',
    cover_path: null,
    cover_url: null,
  };
}

function formFromNews(item: NewsItem): NewsForm {
  return {
    title: item.title,
    slug: item.slug,
    excerpt: item.excerpt ?? '',
    content: item.content ?? '',
    author: item.author ?? '',
    category: item.category ?? '',
    status: item.status,
    featured: item.featured,
    published_at: toDateTimeLocal(item.published_at),
    cover_path: item.cover_path,
    cover_url: item.cover_url,
  };
}

export function AdminNewsPage() {
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [form, setForm] = useState<NewsForm>(emptyForm());
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<NewsItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data, loading, error, reload } = useAsync<NewsItem[]>(
    () => getAdminNews(),
    [],
  );
  const news = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return news.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (!term) return true;
      return [item.title, item.excerpt, item.category, item.author]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [news, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setSlugEdited(false);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(item: NewsItem) {
    setEditing(item);
    setForm(formFromNews(item));
    setSlugEdited(true);
    setFormError(null);
    setFormOpen(true);
  }

  function updateForm<K extends keyof NewsForm>(key: K, value: NewsForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onTitleChange(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: slugEdited ? current.slug : slugify(value),
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const publishedAt =
        form.status === 'PUBLICADO'
          ? fromDateTimeLocal(form.published_at) || new Date().toISOString()
          : fromDateTimeLocal(form.published_at);

      const payload: NewsInput = {
        title: form.title.trim(),
        slug: slugify(form.slug || form.title),
        cover_path: form.cover_path,
        cover_url: form.cover_url,
        excerpt: form.excerpt.trim() || null,
        content: form.content.trim() || null,
        published_at: publishedAt,
        author: form.author.trim() || null,
        category: form.category.trim() || null,
        status: form.status,
        featured: form.featured,
      };
      if (!payload.title) throw new Error('El título es obligatorio.');
      if (!payload.slug) throw new Error('El enlace público es obligatorio.');

      if (editing) {
        await updateNews(editing.id, payload);
        success('Publicación actualizada.');
      } else {
        await createNews(payload);
        success('Publicación creada.');
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo guardar la publicación.'));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(item: NewsItem, status: NewsStatus) {
    setChangingStatus(item.id);
    try {
      await setNewsStatus(item.id, status);
      success(
        status === 'PUBLICADO'
          ? 'Noticia publicada.'
          : status === 'OCULTO'
            ? 'Noticia oculta del sitio.'
            : 'Noticia devuelta a borrador.',
      );
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo cambiar el estado.'));
    } finally {
      setChangingStatus(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteNews(deleting.id);
      success('Publicación eliminada.');
      setDeleting(null);
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo eliminar la publicación.'));
    } finally {
      setDeleteLoading(false);
    }
  }

  const published = news.filter((item) => item.status === 'PUBLICADO').length;
  const drafts = news.filter((item) => item.status === 'BORRADOR').length;
  const hidden = news.filter((item) => item.status === 'OCULTO').length;

  return (
    <>
      <PageHeader
        eyebrow="Contenido"
        title="Noticias"
        description="Publica novedades del equipo. Solo las noticias publicadas y con fecha visible aparecen en el sitio."
        actions={
          <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
            Nueva noticia
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Publicaciones', value: news.length },
          { label: 'Publicadas', value: published },
          { label: 'Borradores', value: drafts },
          { label: 'Ocultas', value: hidden },
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
            placeholder="Buscar noticia…"
            className="w-full sm:max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            <option value="PUBLICADO">Publicadas</option>
            <option value="BORRADOR">Borradores</option>
            <option value="OCULTO">Ocultas</option>
          </select>
          <span className="text-xs text-slate-500 sm:ml-auto">
            {filtered.length} de {news.length}
          </span>
        </div>

        {loading ? (
          <div className="p-5">
            <LoadingBlock message="Cargando publicaciones…" />
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Newspaper}
              title={news.length === 0 ? 'Todavía no hay noticias' : 'Sin coincidencias'}
              description={
                news.length === 0
                  ? 'Escribe la primera publicación para informar a la comunidad.'
                  : 'Cambia el filtro o busca otro término.'
              }
              action={
                news.length === 0 ? (
                  <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
                    Nueva noticia
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
                  <th className="px-4 py-3 text-left">Título</th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-left">Publicación</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3" data-label="Título">
                      <div className="flex items-center gap-3">
                        {item.cover_url || item.cover_path ? (
                          <img
                            src={resolveMediaUrl(item.cover_path, item.cover_url, 'news') || ''}
                            alt=""
                            className="h-10 w-14 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <Newspaper className="h-4 w-4 text-slate-400" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-medium text-slate-900">{item.title}</p>
                            {item.featured && <Badge tone="warning">Destacada</Badge>}
                          </div>
                          <p className="truncate text-[11px] text-slate-500">
                            {item.excerpt || item.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600" data-label="Categoría">
                      {item.category || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600" data-label="Publicación">
                      <p className="text-xs">{formatDate(item.published_at || item.created_at)}</p>
                      <p className="text-[10px] text-slate-400">
                        {item.author || 'Sin autor'}
                      </p>
                    </td>
                    <td className="px-4 py-3" data-label="Estado">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3" data-label="Acciones">
                      <div className="flex items-center justify-end gap-1">
                        {item.status === 'PUBLICADO' ? (
                          <>
                            <Link
                              to={`/noticias/${item.slug}`}
                              target="_blank"
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                              aria-label="Ver noticia"
                              title="Ver en el sitio"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => void changeStatus(item, 'OCULTO')}
                              disabled={changingStatus === item.id}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                              aria-label="Ocultar noticia"
                              title="Ocultar"
                            >
                              <EyeOff className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void changeStatus(item, 'PUBLICADO')}
                            disabled={changingStatus === item.id}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
                            aria-label="Publicar noticia"
                            title="Publicar"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label="Editar noticia"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(item)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Eliminar noticia"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
        title={editing ? 'Editar noticia' : 'Nueva noticia'}
        description="El contenido admite títulos (##), listas (-), citas (>) y negritas (**texto**)."
        size="xl"
        dismissible={!saving}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="news-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear publicación'}
            </Button>
          </>
        }
      >
        <form id="news-form" onSubmit={save} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
            <ImageUpload
              bucket="news"
              prefix={form.slug || form.title || 'noticia'}
              valuePath={form.cover_path}
              valueUrl={form.cover_url}
              onChange={(value) => {
                setForm((current) => ({
                  ...current,
                  cover_path: value?.path ?? null,
                  cover_url: value?.url ?? null,
                }));
              }}
              label="Imagen de portada"
              aspect="video"
            />
            <div className="grid gap-4">
              <Input
                label="Título"
                value={form.title}
                onChange={(event) => onTitleChange(event.target.value)}
                required
              />
              <Input
                label="Enlace público"
                value={form.slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  updateForm('slug', slugify(event.target.value));
                }}
                hint={`/noticias/${form.slug || 'enlace'}`}
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Categoría"
                  value={form.category}
                  onChange={(event) => updateForm('category', event.target.value)}
                  placeholder="Competencia, equipo, comunidad…"
                />
                <Input
                  label="Autor"
                  value={form.author}
                  onChange={(event) => updateForm('author', event.target.value)}
                />
              </div>
            </div>
          </div>

          <Textarea
            label="Resumen"
            value={form.excerpt}
            onChange={(event) => updateForm('excerpt', event.target.value)}
            rows={2}
            placeholder="Texto breve que aparece en las tarjetas y resultados de búsqueda."
          />

          <Textarea
            label="Contenido"
            value={form.content}
            onChange={(event) => updateForm('content', event.target.value)}
            rows={12}
            placeholder={'Escribe la noticia…\n\n## Subtítulo\n- Punto uno\n- Punto dos'}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Estado"
              value={form.status}
              onChange={(event) => updateForm('status', event.target.value as NewsStatus)}
            >
              <option value="BORRADOR">Borrador privado</option>
              <option value="PUBLICADO">Publicada</option>
              <option value="OCULTO">Oculta del sitio</option>
            </Select>
            <Input
              label="Fecha de publicación"
              type="datetime-local"
              value={form.published_at}
              onChange={(event) => updateForm('published_at', event.target.value)}
              hint="Si se deja vacía, se usa el momento actual."
            />
            <label className="flex items-center gap-3 self-end rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => updateForm('featured', event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[var(--brand)]"
              />
              Destacar en portada
            </label>
          </div>

          {form.status === 'PUBLICADO' && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700">
              <Eye className="h-3.5 w-3.5" aria-hidden />
              La noticia será visible en el sitio si la fecha de publicación ya pasó.
            </p>
          )}
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
        title="Eliminar publicación"
        description={`Se eliminará “${deleting?.title ?? ''}” de forma permanente. Si solo quieres retirarla del sitio, usa la opción Ocultar.`}
        confirmLabel="Eliminar definitivamente"
        loading={deleteLoading}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
