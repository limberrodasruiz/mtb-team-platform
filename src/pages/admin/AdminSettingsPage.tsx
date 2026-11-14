import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Building2,
  Clock3,
  ExternalLink,
  History,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Palette,
  Phone,
  Save,
  Sparkles,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useSiteSettings } from '../../providers/SiteSettingsProvider';
import { useToast } from '../../providers/ToastProvider';
import { getSiteSettings, updateSiteSettings } from '../../services/settings';
import type { SiteSettings } from '../../types';
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  DEFAULT_SHORT_NAME,
  DEFAULT_SLOGAN,
  DEFAULT_TEAM_NAME,
} from '../../constants';
import { errorMessage } from '../../lib/errors';
import { isHexColor } from '../../utils/color';
import { isValidEmail, optionalEmail } from '../../utils/validation';
import { formatDateTime } from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { ErrorState, LoadingBlock } from '../../components/ui/States';
import { Tabs } from '../../components/ui/Tabs';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { cn } from '../../utils/cn';

interface SettingsForm {
  team_name: string;
  short_name: string;
  slogan: string;
  description: string;
  founded_year: string;
  history: string;
  mission: string;
  objectives: string;
  activities: string;
  achievements: string;
  email: string;
  contact_email: string;
  whatsapp: string;
  whatsapp_message: string;
  address: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  sponsor_info: string;
  sponsor_email: string;
  join_info: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_path: string | null;
  logo_url: string | null;
  hero_image_path: string | null;
  hero_image_url: string | null;
}

type SettingsTab = 'identidad' | 'contacto' | 'historia';

function emptyForm(): SettingsForm {
  return {
    team_name: DEFAULT_TEAM_NAME,
    short_name: DEFAULT_SHORT_NAME,
    slogan: DEFAULT_SLOGAN,
    description: '',
    founded_year: '',
    history: '',
    mission: '',
    objectives: '',
    activities: '',
    achievements: '',
    email: '',
    contact_email: '',
    whatsapp: '',
    whatsapp_message: '',
    address: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    sponsor_info: '',
    sponsor_email: '',
    join_info: '',
    primary_color: DEFAULT_PRIMARY_COLOR,
    secondary_color: DEFAULT_SECONDARY_COLOR,
    accent_color: DEFAULT_ACCENT_COLOR,
    logo_path: null,
    logo_url: null,
    hero_image_path: null,
    hero_image_url: null,
  };
}

function formFromSettings(settings: SiteSettings | null): SettingsForm {
  if (!settings) return emptyForm();
  return {
    team_name: settings.team_name ?? '',
    short_name: settings.short_name ?? '',
    slogan: settings.slogan ?? '',
    description: settings.description ?? '',
    founded_year: settings.founded_year ? String(settings.founded_year) : '',
    history: settings.history ?? '',
    mission: settings.mission ?? '',
    objectives: settings.objectives ?? '',
    activities: settings.activities ?? '',
    achievements: settings.achievements ?? '',
    email: settings.email ?? '',
    contact_email: settings.contact_email ?? '',
    whatsapp: settings.whatsapp ?? '',
    whatsapp_message: settings.whatsapp_message ?? '',
    address: settings.address ?? '',
    facebook: settings.facebook ?? '',
    instagram: settings.instagram ?? '',
    tiktok: settings.tiktok ?? '',
    youtube: settings.youtube ?? '',
    sponsor_info: settings.sponsor_info ?? '',
    sponsor_email: settings.sponsor_email ?? '',
    join_info: settings.join_info ?? '',
    primary_color: settings.primary_color || DEFAULT_PRIMARY_COLOR,
    secondary_color: settings.secondary_color || DEFAULT_SECONDARY_COLOR,
    accent_color: settings.accent_color || DEFAULT_ACCENT_COLOR,
    logo_path: settings.logo_path,
    logo_url: settings.logo_url,
    hero_image_path: settings.hero_image_path,
    hero_image_url: settings.hero_image_url,
  };
}

const PALETTES = [
  { label: 'Shark teal', primary: '#0f766e', secondary: '#0f172a', accent: '#84cc16' },
  { label: 'Tierra', primary: '#b45309', secondary: '#1c1917', accent: '#eab308' },
  { label: 'Montaña', primary: '#1d4ed8', secondary: '#0f172a', accent: '#22d3ee' },
  { label: 'Bosque', primary: '#15803d', secondary: '#052e16', accent: '#bef264' },
];

export function AdminSettingsPage() {
  const { success } = useToast();
  const { refresh } = useSiteSettings();
  const [tab, setTab] = useState<SettingsTab>('identidad');
  const [form, setForm] = useState<SettingsForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, loading, error, reload, setData } = useAsync<SiteSettings | null>(
    () => getSiteSettings(),
    [],
  );

  useEffect(() => {
    setForm(formFromSettings(data));
  }, [data]);

  const initial = useMemo(() => formFromSettings(data), [data]);
  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial],
  );

  function update<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyPalette(palette: (typeof PALETTES)[number]) {
    setForm((current) => ({
      ...current,
      primary_color: palette.primary,
      secondary_color: palette.secondary,
      accent_color: palette.accent,
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!form.team_name.trim()) {
      setFormError('El nombre del equipo es obligatorio.');
      return;
    }

    for (const [label, value] of [
      ['Color principal', form.primary_color],
      ['Color secundario', form.secondary_color],
      ['Color de acento', form.accent_color],
    ] as const) {
      if (!isHexColor(value)) {
        setFormError(`${label} debe tener el formato hexadecimal #RRGGBB.`);
        return;
      }
    }

    if (form.email.trim() && !isValidEmail(form.email)) {
      setFormError('El correo general no tiene un formato válido.');
      return;
    }
    if (form.contact_email.trim() && !isValidEmail(form.contact_email)) {
      setFormError('El correo de contacto no tiene un formato válido.');
      return;
    }
    if (form.sponsor_email.trim() && !isValidEmail(form.sponsor_email)) {
      setFormError('El correo de auspicios no tiene un formato válido.');
      return;
    }

    const founded = form.founded_year.trim() ? Number(form.founded_year) : null;
    if (founded !== null && (!Number.isInteger(founded) || founded < 1900 || founded > 2100)) {
      setFormError('El año de fundación debe estar entre 1900 y 2100.');
      return;
    }

    setSaving(true);
    try {
      const saved = await updateSiteSettings({
        team_name: form.team_name.trim(),
        short_name: form.short_name.trim() || null,
        slogan: form.slogan.trim() || null,
        description: form.description.trim() || null,
        founded_year: founded,
        history: form.history.trim() || null,
        mission: form.mission.trim() || null,
        objectives: form.objectives.trim() || null,
        activities: form.activities.trim() || null,
        achievements: form.achievements.trim() || null,
        email: optionalEmail(form.email),
        contact_email: optionalEmail(form.contact_email),
        whatsapp: form.whatsapp.trim() || null,
        whatsapp_message: form.whatsapp_message.trim() || null,
        address: form.address.trim() || null,
        facebook: form.facebook.trim() || null,
        instagram: form.instagram.trim() || null,
        tiktok: form.tiktok.trim() || null,
        youtube: form.youtube.trim() || null,
        sponsor_info: form.sponsor_info.trim() || null,
        sponsor_email: optionalEmail(form.sponsor_email),
        join_info: form.join_info.trim() || null,
        primary_color: form.primary_color.toLowerCase(),
        secondary_color: form.secondary_color.toLowerCase(),
        accent_color: form.accent_color.toLowerCase(),
        logo_path: form.logo_path,
        logo_url: form.logo_url,
        hero_image_path: form.hero_image_path,
        hero_image_url: form.hero_image_url,
      });

      setData(saved);
      setForm(formFromSettings(saved));
      await refresh();
      success('Configuración guardada. El sitio público ya usa estos datos.');
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo guardar la configuración.'));
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: 'identidad', label: 'Identidad' },
    { id: 'contacto', label: 'Contacto y redes' },
    { id: 'historia', label: 'Historia y misión' },
  ];

  if (loading) return <LoadingBlock message="Cargando configuración…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <form onSubmit={save}>
      <PageHeader
        eyebrow="Sistema"
        title="Configuración del sitio"
        description="Identidad, contacto, historia y colores institucionales. Estos datos alimentan el sitio público y el panel."
        actions={
          <>
            {data?.updated_at && (
              <span className="hidden items-center gap-1.5 text-[11px] text-slate-400 sm:inline-flex">
                <Clock3 className="h-3.5 w-3.5" aria-hidden />
                Actualizado {formatDateTime(data.updated_at)}
              </span>
            )}
            <Button
              type="submit"
              loading={saving}
              disabled={!dirty}
              startIcon={<Save className="h-4 w-4" />}
            >
              Guardar cambios
            </Button>
          </>
        }
      />

      {!data && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No existe la fila de configuración. Las migraciones crean una fila inicial con los
          valores del equipo; revisa que las migraciones se hayan ejecutado antes de guardar.
        </div>
      )}

      <Tabs
        className="mb-5"
        value={tab}
        onChange={(value) => setTab(value as SettingsTab)}
        items={tabs}
        ariaLabel="Secciones de configuración"
      />

      {tab === 'identidad' ? (
        <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
          <div className="space-y-5">
            <Card>
              <CardHeader
                title="Datos del equipo"
                description="Nombre, lema y presentación que se muestran en la cabecera, el pie y las páginas públicas."
              />
              <CardBody className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Nombre completo"
                    value={form.team_name}
                    onChange={(event) => update('team_name', event.target.value)}
                    placeholder={DEFAULT_TEAM_NAME}
                    required
                    containerClassName="sm:col-span-2"
                  />
                  <Input
                    label="Nombre corto"
                    value={form.short_name}
                    onChange={(event) => update('short_name', event.target.value)}
                    placeholder={DEFAULT_SHORT_NAME}
                  />
                  <Input
                    label="Año de fundación"
                    type="number"
                    min={1900}
                    max={2100}
                    value={form.founded_year}
                    onChange={(event) => update('founded_year', event.target.value)}
                    placeholder="2018"
                  />
                  <Input
                    label="Lema"
                    value={form.slogan}
                    onChange={(event) => update('slogan', event.target.value)}
                    placeholder={DEFAULT_SLOGAN}
                    containerClassName="sm:col-span-2"
                  />
                </div>
                <Textarea
                  label="Descripción breve"
                  value={form.description}
                  onChange={(event) => update('description', event.target.value)}
                  rows={3}
                  hint="Se usa en la portada, el pie y las vistas previas para redes sociales."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Imágenes institucionales"
                description="Logo y fotografía principal de la portada. Se optimizan antes de subirlas a Storage."
              />
              <CardBody className="grid gap-5 sm:grid-cols-[170px_1fr]">
                <ImageUpload
                  bucket="banners"
                  prefix="logo"
                  valuePath={form.logo_path}
                  valueUrl={form.logo_url}
                  onChange={(value) => {
                    update('logo_path', value?.path ?? null);
                    update('logo_url', value?.url ?? null);
                  }}
                  label="Logo"
                  aspect="square"
                  hint="PNG o WEBP con fondo transparente."
                  disabled={saving}
                />
                <ImageUpload
                  bucket="banners"
                  prefix="hero"
                  valuePath={form.hero_image_path}
                  valueUrl={form.hero_image_url}
                  onChange={(value) => {
                    update('hero_image_path', value?.path ?? null);
                    update('hero_image_url', value?.url ?? null);
                  }}
                  label="Imagen de portada"
                  aspect="wide"
                  disabled={saving}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Colores institucionales"
                description="El tema completo del sitio se deriva de estos tres colores. Usa hexadecimales de seis dígitos."
              />
              <CardBody className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  {(
                    [
                      ['primary_color', 'Color principal'],
                      ['secondary_color', 'Color secundario'],
                      ['accent_color', 'Color de acento'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <label
                        htmlFor={`color-${key}`}
                        className="block text-sm font-medium text-slate-700"
                      >
                        {label}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={isHexColor(form[key]) ? form[key] : '#000000'}
                          onChange={(event) => update(key, event.target.value)}
                          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                          aria-label={`Selector ${label.toLowerCase()}`}
                        />
                        <input
                          id={`color-${key}`}
                          value={form[key]}
                          onChange={(event) => update(key, event.target.value)}
                          className={cn(
                            'h-10 w-full rounded-lg border bg-white px-3 font-mono text-xs uppercase text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20',
                            isHexColor(form[key])
                              ? 'border-slate-300 focus:border-[var(--brand)]'
                              : 'border-rose-400 focus:border-rose-500',
                          )}
                          placeholder="#0f766e"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Paletas sugeridas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PALETTES.map((palette) => (
                      <button
                        key={palette.label}
                        type="button"
                        onClick={() => applyPalette(palette)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <span className="flex gap-0.5" aria-hidden>
                          {[palette.primary, palette.secondary, palette.accent].map((color) => (
                            <span
                              key={color}
                              className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/10"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </span>
                        {palette.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="overflow-hidden">
              <div
                className="relative px-5 py-8 text-white"
                style={{ backgroundColor: form.secondary_color }}
              >
                <div className="topographic absolute inset-0 opacity-70" aria-hidden />
                <div className="relative">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] opacity-60">
                    Vista previa
                  </p>
                  <p className="mt-3 font-display text-3xl font-bold uppercase leading-none">
                    {form.team_name || DEFAULT_TEAM_NAME}
                  </p>
                  <p className="mt-2 text-xs opacity-70">
                    {form.slogan || DEFAULT_SLOGAN}
                  </p>
                </div>
              </div>
              <CardBody className="space-y-3">
                <p className="text-xs leading-relaxed text-slate-500">
                  {form.description ||
                    'La descripción del equipo aparecerá aquí y en las páginas públicas.'}
                </p>
                <div className="flex gap-2">
                  <span
                    className="flex h-9 flex-1 items-center justify-center rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: form.primary_color,
                      color: '#ffffff',
                    }}
                  >
                    Acción principal
                  </span>
                  <span
                    className="flex h-9 flex-1 items-center justify-center rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: form.accent_color,
                      color: form.secondary_color,
                    }}
                  >
                    Acento
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Palette className="h-3.5 w-3.5" aria-hidden />
                  Los bordes, fondos suaves y contrastes se calculan automáticamente.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Buenas prácticas" />
              <CardBody className="space-y-3 text-xs leading-relaxed text-slate-600">
                <p className="flex gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
                  Usa el logo con fondo transparente para que se adapte al pie y a la cabecera.
                </p>
                <p className="flex gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
                  Los campos vacíos se muestran con los valores institucionales por defecto.
                </p>
                <p className="flex gap-2">
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
                  Después de guardar, revisa el sitio público para confirmar el resultado.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      ) : tab === 'contacto' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Contacto directo"
              description="Se muestran en Contacto y en el pie del sitio. No se publican datos inventados."
            />
            <CardBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Correo de contacto"
                  type="email"
                  value={form.contact_email}
                  onChange={(event) => update('contact_email', event.target.value)}
                  placeholder="contacto@equipo.com"
                  hint="Prioritario para el botón de contacto."
                />
                <Input
                  label="Correo general"
                  type="email"
                  value={form.email}
                  onChange={(event) => update('email', event.target.value)}
                  placeholder="info@equipo.com"
                  hint="Alternativa si no hay correo de contacto."
                />
              </div>
              <Input
                label="WhatsApp"
                value={form.whatsapp}
                onChange={(event) => update('whatsapp', event.target.value)}
                placeholder="+591 70000000"
                hint="Incluye el código de país. Solo dígitos y + para el enlace directo."
              />
              <Textarea
                label="Mensaje predeterminado de WhatsApp"
                value={form.whatsapp_message}
                onChange={(event) => update('whatsapp_message', event.target.value)}
                rows={2}
                placeholder="Hola, me gustaría recibir información sobre el equipo de MTB."
              />
              <Input
                label="Dirección"
                value={form.address}
                onChange={(event) => update('address', event.target.value)}
                placeholder="Santa Cruz de la Sierra, Bolivia"
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Redes sociales"
              description="Enlaces completos. Los que queden vacíos no se muestran en el sitio."
            />
            <CardBody className="space-y-4">
              <Input
                label="Facebook"
                value={form.facebook}
                onChange={(event) => update('facebook', event.target.value)}
                placeholder="https://facebook.com/…"
              />
              <Input
                label="Instagram"
                value={form.instagram}
                onChange={(event) => update('instagram', event.target.value)}
                placeholder="https://instagram.com/…"
              />
              <Input
                label="TikTok"
                value={form.tiktok}
                onChange={(event) => update('tiktok', event.target.value)}
                placeholder="https://tiktok.com/@…"
              />
              <Input
                label="YouTube"
                value={form.youtube}
                onChange={(event) => update('youtube', event.target.value)}
                placeholder="https://youtube.com/…"
              />
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader
              title="Auspicios y nuevos integrantes"
              description="Textos y correos específicos para marcas y personas interesadas en sumarse."
            />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Textarea
                label="Información para auspiciadores"
                value={form.sponsor_info}
                onChange={(event) => update('sponsor_info', event.target.value)}
                rows={4}
                placeholder="Qué ofrece el equipo a las marcas, alcance, activaciones…"
              />
              <div className="space-y-4">
                <Input
                  label="Correo de auspicios"
                  type="email"
                  value={form.sponsor_email}
                  onChange={(event) => update('sponsor_email', event.target.value)}
                  placeholder="auspicios@equipo.com"
                />
                <Textarea
                  label="Información para unirse al equipo"
                  value={form.join_info}
                  onChange={(event) => update('join_info', event.target.value)}
                  rows={3}
                  placeholder="Requisitos, categorías, proceso de inscripción…"
                />
              </div>
            </CardBody>
          </Card>

          <div className="lg:col-span-2">
            <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" aria-hidden />
                {form.contact_email || form.email || 'Sin correo configurado'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {form.whatsapp || 'Sin WhatsApp configurado'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {form.address || 'Sin dirección configurada'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Instagram className="h-3.5 w-3.5" aria-hidden />
                {form.instagram ? 'Instagram configurado' : 'Sin Instagram'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                {form.whatsapp ? 'Botón de WhatsApp activo' : 'Botón de WhatsApp inactivo'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
          <div className="space-y-5">
            <Card>
              <CardHeader
                title="Historia del equipo"
                description="Relato institucional que aparece en la página Equipo."
              />
              <CardBody>
                <Textarea
                  label="Historia"
                  value={form.history}
                  onChange={(event) => update('history', event.target.value)}
                  rows={10}
                  placeholder="Cómo nació el equipo, sus etapas y sus logros más importantes…"
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Misión y objetivos"
                description="Texto breve y claro sobre el propósito deportivo y comunitario."
              />
              <CardBody className="space-y-4">
                <Textarea
                  label="Misión"
                  value={form.mission}
                  onChange={(event) => update('mission', event.target.value)}
                  rows={3}
                  placeholder="Formar corredores y promover el mountain bike en Santa Cruz…"
                />
                <Textarea
                  label="Objetivos"
                  value={form.objectives}
                  onChange={(event) => update('objectives', event.target.value)}
                  rows={4}
                  placeholder="Uno por línea o en párrafos breves."
                />
              </CardBody>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader
                title="Actividades"
                description="Entrenamientos, competencias y actividades comunitarias."
              />
              <CardBody>
                <Textarea
                  label="Actividades"
                  value={form.activities}
                  onChange={(event) => update('activities', event.target.value)}
                  rows={6}
                  placeholder="Entrenamientos semanales, participación en carreras nacionales…"
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Logros"
                description="Resumen de resultados y reconocimientos del equipo."
              />
              <CardBody>
                <Textarea
                  label="Logros"
                  value={form.achievements}
                  onChange={(event) => update('achievements', event.target.value)}
                  rows={6}
                  placeholder="Podios, títulos departamentales, crecimiento del equipo…"
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Vista pública" />
              <CardBody className="space-y-2 text-xs leading-relaxed text-slate-600">
                <p className="flex gap-2">
                  <History className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
                  El contenido se muestra en la página Equipo con formato de lectura y párrafos.
                </p>
                <p className="flex gap-2">
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
                  Si dejas un campo vacío, la sección correspondiente no se muestra. No se
                  rellenan textos ficticios.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {formError && (
        <p
          className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
          role="alert"
        >
          {formError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <p className="text-[11px] text-slate-400">
          {dirty
            ? 'Hay cambios sin guardar.'
            : 'La configuración está sincronizada con el sitio público.'}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setForm(formFromSettings(data));
              setFormError(null);
            }}
            disabled={!dirty || saving}
          >
            Descartar cambios
          </Button>
          <Button
            type="submit"
            loading={saving}
            disabled={!dirty}
            startIcon={<Save className="h-4 w-4" />}
          >
            Guardar configuración
          </Button>
        </div>
      </div>

    </form>
  );
}
