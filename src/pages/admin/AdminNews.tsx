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
import { Textarea } from '../../components/ui/Textarea';
import { useAuth } from '../../hooks/useAuth';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase } from '../../lib/supabaseClient';
import { STORAGE_BUCKETS } from '../../constants';
import { logAudit } from '../../services/supabase/admin';
import { getPublicImageUrl, uploadImage } from '../../services/supabase/storage';
import { slugify } from '../../utils/slug';
import { isValidImageSize, isValidImageType } from '../../utils/validation';
import { formatDate } from '../../utils/format';
import type { NewsItem } from '../../types';

async function fetchAllNews(): Promise<NewsItem[]> {
  const { data, error } = await supabase.from('news').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`No se pudieron obtener las noticias: ${error.message}`);
  return (data ?? []) as NewsItem[];
}

export function AdminNews() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'EDITOR']);
  const { data, loading, error, reload } = useSupabaseQuery(fetchAllNews);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [published, setPublished] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setExcerpt('');
    setContent('');
    setPublished(false);
    setCoverFile(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: NewsItem) => {
    setEditing(row);
    setTitle(row.title);
    setExcerpt(row.excerpt ?? '');
    setContent(row.content);
    setPublished(row.is_published);
    setCoverFile(null);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setFormError('Título y contenido son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      let coverUrl = editing?.cover_image_url ?? null;
      if (coverFile) {
        if (!isValidImageType(coverFile.type)) throw new Error('Formato no válido. Usa JPG, PNG o WEBP.');
        if (!isValidImageSize(coverFile.size)) throw new Error('La imagen supera los 5 MB.');
        const path = `${slugify(title)}-${Date.now()}.jpg`;
        await uploadImage(STORAGE_BUCKETS.NEWS, coverFile, path);
        coverUrl = getPublicImageUrl(STORAGE_BUCKETS.NEWS, path);
      }
      const payload = {
        title: title.trim(),
        slug: editing?.slug ?? slugify(title),
        excerpt: excerpt.trim() || null,
        content: content.trim(),
        cover_image_url: coverUrl,
        is_published: published,
        published_at: published ? (editing?.published_at ?? new Date().toISOString()) : null,
        author_id: editing?.author_id ?? user?.id ?? null,
      };
      let recordId = editing?.id;
      if (editing) {
        const { error: upError } = await supabase.from('news').update(payload).eq('id', editing.id);
        if (upError) throw new Error(`No se pudo actualizar: ${upError.message}`);
      } else {
        const { data: created, error: inError } = await supabase.from('news').insert(payload).select().single();
        if (inError) throw new Error(`No se pudo crear: ${inError.message}`);
        recordId = (created as NewsItem).id;
      }
      try {
        await logAudit({
          user_id: user?.id ?? null,
          action: editing ? 'news.update' : 'news.create',
          table_name: 'news',
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

  const handleDelete = async (row: NewsItem) => {
    if (!window.confirm(`¿Eliminar noticia "${row.title}"?`)) return;
    const { error: delError } = await supabase.from('news').delete().eq('id', row.id);
    if (delError) return;
    reload();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Cargando noticias…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudieron cargar las noticias.'} onRetry={reload} />;
  }

  const columns: TableColumn<NewsItem>[] = [
    { key: 'title', header: 'Título', render: (r) => <span className="font-medium">{r.title}</span> },
    {
      key: 'status',
      header: 'Estado',
      render: (r) => <Badge variant={r.is_published ? 'success' : 'default'}>{r.is_published ? 'PUBLICADA' : 'BORRADOR'}</Badge>,
    },
    { key: 'date', header: 'Fecha', render: (r) => formatDate(r.published_at ?? r.created_at) },
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
      <PageHeader title="Noticias" subtitle={`${data.length} noticias`} actions={<Button onClick={openCreate} disabled={!canEdit}>Nueva noticia</Button>} />
      {data.length === 0 ? (
        <EmptyState title="Sin noticias" description="Crea la primera noticia del equipo." />
      ) : (
        <Table columns={columns} data={data} keyExtractor={(r) => r.id} />
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar noticia' : 'Nueva noticia'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Título *" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Input label="Extracto" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          <Textarea label="Contenido *" value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="news-cover">Portada (JPG/PNG/WEBP, máx 5MB)</label>
            <input id="news-cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Publicada
          </label>
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

export default AdminNews;
