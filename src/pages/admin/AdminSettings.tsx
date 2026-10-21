import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { Textarea } from '../../components/ui/Textarea';
import { useAuth } from '../../hooks/useAuth';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { logAudit } from '../../services/supabase/admin';
import { getSiteSettings, updateSiteSettings } from '../../services/supabase/content';
import { getPublicImageUrl, uploadImage } from '../../services/supabase/storage';
import { isValidImageSize, isValidImageType } from '../../utils/validation';
import type { SiteSettings } from '../../types';

async function fetchSettings(): Promise<SiteSettings | null> {
  return getSiteSettings();
}

export function AdminSettings() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN']);
  const { data, loading, error, reload } = useSupabaseQuery(fetchSettings);
  const [form, setForm] = useState<Partial<SiteSettings> | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const current: Partial<SiteSettings> = form ?? data ?? {};

  const set = (patch: Partial<SiteSettings>) => setForm({ ...current, ...patch });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!data) {
      setFormError('No hay configuración base para actualizar.');
      return;
    }
    if (!current.team_name?.trim()) {
      setFormError('El nombre del equipo es obligatorio.');
      return;
    }
    setSaving(true);
    setFormError(null);
    setMessage(null);
    try {
      let logoUrl = current.logo_url ?? null;
      if (logoFile) {
        if (!isValidImageType(logoFile.type)) throw new Error('Formato de logo no válido. Usa JPG, PNG o WEBP.');
        if (!isValidImageSize(logoFile.size)) throw new Error('El logo supera los 5 MB.');
        const logoPath = `logo-${Date.now()}.jpg`;
        await uploadImage('logos', logoFile, logoPath);
        logoUrl = getPublicImageUrl('logos', logoPath);
      }
      await updateSiteSettings(data.id, {
        team_name: current.team_name?.trim() ?? data.team_name,
        slogan: current.slogan ?? null,
        logo_url: logoUrl,
        primary_color: current.primary_color ?? null,
        contact_email: current.contact_email ?? null,
        contact_phone: current.contact_phone ?? null,
        address: current.address ?? null,
        social_facebook: current.social_facebook ?? null,
        social_instagram: current.social_instagram ?? null,
        social_tiktok: current.social_tiktok ?? null,
        about_text: current.about_text ?? null,
      });
      try {
        await logAudit({
          user_id: user?.id ?? null,
          action: 'settings.update',
          table_name: 'site_settings',
          record_id: data.id,
          details: { team_name: current.team_name },
        });
      } catch {
        /* noop */
      }
      setMessage('Configuración guardada correctamente.');
      setForm(null);
      setLogoFile(null);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Cargando configuración…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudo cargar la configuración.'} onRetry={reload} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Configuración" subtitle="Nombre, colores, redes y logo del sitio (solo ADMIN)" />
      <Card title="Ajustes generales">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Nombre del equipo *" value={current.team_name ?? ''} onChange={(e) => set({ team_name: e.target.value })} disabled={!canEdit} required />
            <Input label="Eslogan" value={current.slogan ?? ''} onChange={(e) => set({ slogan: e.target.value })} disabled={!canEdit} />
            <Input label="Color principal" type="color" value={current.primary_color ?? '#000000'} onChange={(e) => set({ primary_color: e.target.value })} disabled={!canEdit} />
            <Input label="Correo contacto" type="email" value={current.contact_email ?? ''} onChange={(e) => set({ contact_email: e.target.value })} disabled={!canEdit} />
            <Input label="Teléfono" value={current.contact_phone ?? ''} onChange={(e) => set({ contact_phone: e.target.value })} disabled={!canEdit} />
            <Input label="Dirección" value={current.address ?? ''} onChange={(e) => set({ address: e.target.value })} disabled={!canEdit} />
            <Input label="Facebook (URL)" value={current.social_facebook ?? ''} onChange={(e) => set({ social_facebook: e.target.value })} disabled={!canEdit} />
            <Input label="Instagram (URL)" value={current.social_instagram ?? ''} onChange={(e) => set({ social_instagram: e.target.value })} disabled={!canEdit} />
            <Input label="TikTok (URL)" value={current.social_tiktok ?? ''} onChange={(e) => set({ social_tiktok: e.target.value })} disabled={!canEdit} />
          </div>
          <Textarea label="Nosotros (about)" value={current.about_text ?? ''} onChange={(e) => set({ about_text: e.target.value })} rows={3} disabled={!canEdit} />
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="settings-logo">Logo (JPG/PNG/WEBP, máx 5MB)</label>
            {current.logo_url ? <img src={current.logo_url} alt="Logo actual" className="mt-2 h-16 w-auto rounded border border-slate-200 bg-white p-1" /> : null}
            <input id="settings-logo" type="file" accept="image/jpeg,image/png,image/webp" disabled={!canEdit} onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
          </div>
          {formError ? <p role="alert" className="text-sm text-red-600">{formError}</p> : null}
          {message ? <p role="status" className="text-sm text-green-700">{message}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" loading={saving} disabled={!canEdit}>Guardar cambios</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default AdminSettings;
