import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ExternalLink,
  Flag,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../providers/ToastProvider';
import {
  addRaceRegistration,
  createRace,
  getAdminRaces,
  getRaceRegistrations,
  removeRaceRegistration,
  updateRace,
  updateRaceRegistration,
  type RegistrationWithCyclist,
} from '../../services/races';
import { getAdminCyclists } from '../../services/cyclists';
import { getAdminCategories } from '../../services/categories';
import { getPublicUrl } from '../../services/storage';
import type {
  Category,
  Cyclist,
  Race,
  RaceStatus,
  RegistrationStatus,
} from '../../types';
import {
  RACE_STATUS,
  RACE_STATUS_LABELS,
  REGISTRATION_STATUS,
  REGISTRATION_STATUS_LABELS,
} from '../../constants';
import { errorMessage } from '../../lib/errors';
import { slugify } from '../../utils/slug';
import { formatDate, todayISO, toDateInput } from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button, buttonStyles } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { SearchInput } from '../../components/ui/SearchInput';
import { ImageUpload } from '../../components/ui/ImageUpload';

interface PageData {
  races: Race[];
  cyclists: Cyclist[];
  categories: Category[];
}

interface RaceForm {
  name: string;
  slug: string;
  date: string;
  status: RaceStatus;
  season: string;
  place: string;
  city: string;
  department: string;
  organizer: string;
  race_type: string;
  description: string;
  registration_deadline: string;
  registration_url: string;
  image_path: string | null;
  image_url: string | null;
}

function emptyForm(): RaceForm {
  return {
    name: '',
    slug: '',
    date: todayISO(),
    status: 'PLANIFICADA',
    season: String(new Date().getFullYear()),
    place: '',
    city: '',
    department: '',
    organizer: '',
    race_type: '',
    description: '',
    registration_deadline: '',
    registration_url: '',
    image_path: null,
    image_url: null,
  };
}

function formFromRace(race: Race): RaceForm {
  return {
    name: race.name,
    slug: race.slug,
    date: toDateInput(race.date),
    status: race.status,
    season: race.season ? String(race.season) : '',
    place: race.place ?? '',
    city: race.city ?? '',
    department: race.department ?? '',
    organizer: race.organizer ?? '',
    race_type: race.race_type ?? '',
    description: race.description ?? '',
    registration_deadline: toDateInput(race.registration_deadline),
    registration_url: race.registration_url ?? '',
    image_path: race.image_path,
    image_url: race.image_url,
  };
}

function raceImage(race: Race): string | null {
  if (race.image_url) return race.image_url;
  if (race.image_path) return getPublicUrl('banners', race.image_path);
  return null;
}

export function AdminRacesPage() {
  const { success } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Race | null>(null);
  const [form, setForm] = useState<RaceForm>(emptyForm());
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [registrationsFor, setRegistrationsFor] = useState<Race | null>(null);

  const { data, loading, error, reload } = useAsync<PageData>(async () => {
    const [races, cyclists, categories] = await Promise.all([
      getAdminRaces(),
      getAdminCyclists(),
      getAdminCategories(),
    ]);
    return { races, cyclists, categories };
  }, []);

  const races = useMemo(() => data?.races ?? [], [data]);
  const cyclists = data?.cyclists ?? [];
  const categories = data?.categories ?? [];

  const seasons = useMemo(() => {
    const values = new Set<number>();
    for (const race of races) {
      const year = race.season || Number(race.date.slice(0, 4));
      if (year) values.add(year);
    }
    return Array.from(values).sort((a, b) => b - a);
  }, [races]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return races.filter((race) => {
      if (statusFilter && race.status !== statusFilter) return false;
      if (seasonFilter) {
        const year = String(race.season || race.date.slice(0, 4));
        if (year !== seasonFilter) return false;
      }
      if (!term) return true;
      return [race.name, race.place, race.city, race.organizer, race.race_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [races, search, statusFilter, seasonFilter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setSlugEdited(false);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(race: Race) {
    setEditing(race);
    setForm(formFromRace(race));
    setSlugEdited(true);
    setFormError(null);
    setFormOpen(true);
  }

  function updateForm<K extends keyof RaceForm>(key: K, value: RaceForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
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
      if (!form.date) throw new Error('La fecha de la carrera es obligatoria.');
      const payload = {
        name: form.name.trim(),
        slug: slugify(form.slug || form.name),
        date: form.date,
        place: form.place.trim() || null,
        city: form.city.trim() || null,
        department: form.department.trim() || null,
        organizer: form.organizer.trim() || null,
        race_type: form.race_type.trim() || null,
        description: form.description.trim() || null,
        status: form.status,
        image_path: form.image_path,
        image_url: form.image_url,
        registration_deadline: form.registration_deadline || null,
        registration_url: form.registration_url.trim() || null,
        season: form.season ? Number(form.season) : Number(form.date.slice(0, 4)),
      };
      if (!payload.name) throw new Error('El nombre de la carrera es obligatorio.');
      if (!payload.slug) throw new Error('El enlace público es obligatorio.');

      if (editing) {
        await updateRace(editing.id, payload);
        success('Carrera actualizada.');
      } else {
        await createRace(payload);
        success('Carrera creada.');
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo guardar la carrera.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Deportivo"
        title="Carreras"
        description="Calendario, inscripciones y acceso al registro de resultados."
        actions={
          <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
            Nueva carrera
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          {
            label: 'Carreras',
            value: races.length,
          },
          {
            label: 'Inscripciones abiertas',
            value: races.filter((race) => race.status === 'ABIERTA').length,
          },
          {
            label: 'Finalizadas',
            value: races.filter((race) => race.status === 'FINALIZADA').length,
          },
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
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar carrera, lugar u organizador…"
            className="w-full lg:max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
              aria-label="Filtrar por estado"
            >
              <option value="">Todos los estados</option>
              {RACE_STATUS.map((status) => (
                <option key={status} value={status}>
                  {RACE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <select
              value={seasonFilter}
              onChange={(event) => setSeasonFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
              aria-label="Filtrar por temporada"
            >
              <option value="">Todas las temporadas</option>
              {seasons.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-slate-500 lg:ml-auto">
            {filtered.length} de {races.length}
          </span>
        </div>

        {loading ? (
          <div className="p-5">
            <LoadingBlock message="Cargando carreras…" />
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Flag}
              title={races.length === 0 ? 'Todavía no hay carreras' : 'Sin coincidencias'}
              description={
                races.length === 0
                  ? 'Agrega la primera competencia del calendario para habilitar inscripciones y resultados.'
                  : 'Prueba con otro nombre, estado o temporada.'
              }
              action={
                races.length === 0 ? (
                  <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
                    Nueva carrera
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
                  <th className="px-4 py-3 text-left">Carrera</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Lugar</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((race) => {
                  const image = raceImage(race);
                  return (
                    <tr key={race.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3" data-label="Carrera">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                            {image ? (
                              <img src={image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Flag className="h-4 w-4 text-slate-400" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{race.name}</p>
                            <p className="truncate text-[11px] text-slate-500">
                              {race.race_type || 'MTB'}
                              {race.season ? ` · ${race.season}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600" data-label="Fecha">
                        {formatDate(race.date)}
                      </td>
                      <td className="px-4 py-3 text-slate-600" data-label="Lugar">
                        {[race.place, race.city].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-4 py-3" data-label="Estado">
                        <StatusBadge
                          status={race.status}
                          label={RACE_STATUS_LABELS[race.status]}
                        />
                        {race.registration_deadline && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            Cierre: {formatDate(race.registration_deadline)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3" data-label="Acciones">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setRegistrationsFor(race)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                            aria-label={`Inscripciones de ${race.name}`}
                            title="Inscripciones"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                          <Link
                            to={`/admin/resultados?raceId=${race.id}`}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                            aria-label={`Resultados de ${race.name}`}
                            title="Resultados"
                          >
                            <Trophy className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(race)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                            aria-label={`Editar ${race.name}`}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {race.status !== 'CANCELADA' && (
                            <Link
                              to={`/carreras/${race.slug}`}
                              target="_blank"
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                              aria-label="Ver carrera pública"
                              title="Ver en el sitio"
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
        title={editing ? 'Editar carrera' : 'Nueva carrera'}
        description="La información se publica en el calendario del sitio."
        size="xl"
        dismissible={!saving}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="race-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear carrera'}
            </Button>
          </>
        }
      >
        <form id="race-form" onSubmit={save} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
            <ImageUpload
              bucket="banners"
              prefix={form.slug || form.name || 'carrera'}
              valuePath={form.image_path}
              valueUrl={form.image_url}
              onChange={(value) => {
                setForm((current) => ({
                  ...current,
                  image_path: value?.path ?? null,
                  image_url: value?.url ?? null,
                }));
              }}
              label="Imagen de portada"
              aspect="video"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nombre"
                value={form.name}
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
                hint={`/carreras/${form.slug || 'enlace'}`}
                required
              />
              <Input
                label="Fecha"
                type="date"
                value={form.date}
                onChange={(event) => updateForm('date', event.target.value)}
                required
              />
              <Select
                label="Estado"
                value={form.status}
                onChange={(event) => updateForm('status', event.target.value as RaceStatus)}
              >
                {RACE_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {RACE_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
              <Input
                label="Temporada"
                type="number"
                value={form.season}
                onChange={(event) => updateForm('season', event.target.value)}
              />
              <Input
                label="Tipo de carrera"
                value={form.race_type}
                onChange={(event) => updateForm('race_type', event.target.value)}
                placeholder="XCO, maratón, descenso…"
              />
              <Input
                label="Organizador"
                value={form.organizer}
                onChange={(event) => updateForm('organizer', event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Lugar"
              value={form.place}
              onChange={(event) => updateForm('place', event.target.value)}
              placeholder="Circuito, parque…"
            />
            <Input
              label="Ciudad"
              value={form.city}
              onChange={(event) => updateForm('city', event.target.value)}
            />
            <Input
              label="Departamento"
              value={form.department}
              onChange={(event) => updateForm('department', event.target.value)}
            />
          </div>

          <Textarea
            label="Descripción pública"
            value={form.description}
            onChange={(event) => updateForm('description', event.target.value)}
            rows={4}
            placeholder="Recorrido, categorías, horarios y detalles relevantes."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Cierre de inscripciones"
              type="date"
              value={form.registration_deadline}
              onChange={(event) => updateForm('registration_deadline', event.target.value)}
            />
            <Input
              label="Enlace de inscripción externa"
              type="url"
              value={form.registration_url}
              onChange={(event) => updateForm('registration_url', event.target.value)}
              placeholder="https://…"
            />
          </div>

          {formError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {formError}
            </p>
          )}
        </form>
      </Modal>

      {registrationsFor && (
        <RegistrationsModal
          race={registrationsFor}
          cyclists={cyclists}
          categories={categories}
          onClose={() => setRegistrationsFor(null)}
        />
      )}
    </>
  );
}

function RegistrationsModal({
  race,
  cyclists,
  categories,
  onClose,
}: {
  race: Race;
  cyclists: Cyclist[];
  categories: Category[];
  onClose: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [selectedCyclist, setSelectedCyclist] = useState('');
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [removing, setRemoving] = useState<RegistrationWithCyclist | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const { data, loading, error, reload } = useAsync<RegistrationWithCyclist[]>(
    () => getRaceRegistrations(race.id),
    [race.id],
  );
  const registrations = data ?? [];

  const registeredIds = new Set(registrations.map((item) => item.cyclist_id));
  const available = cyclists.filter(
    (cyclist) => cyclist.active && !registeredIds.has(cyclist.id),
  );

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCyclist) return;
    setAdding(true);
    try {
      await addRaceRegistration(race.id, selectedCyclist);
      success('Corredor inscrito.');
      setSelectedCyclist('');
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo inscribir al corredor.'));
    } finally {
      setAdding(false);
    }
  }

  async function changeStatus(id: string, status: RegistrationStatus) {
    setUpdating(id);
    try {
      await updateRaceRegistration(id, status);
      success('Inscripción actualizada.');
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo actualizar la inscripción.'));
    } finally {
      setUpdating(null);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setRemoveLoading(true);
    try {
      await removeRaceRegistration(removing.id);
      success('Inscripción eliminada.');
      setRemoving(null);
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo quitar la inscripción.'));
    } finally {
      setRemoveLoading(false);
    }
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={`Inscripciones · ${race.name}`}
        description={`${formatDate(race.date)} · ${race.place || 'Sin lugar definido'}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Link
              to={`/admin/resultados?raceId=${race.id}`}
              className={buttonStyles('primary', 'md')}
            >
              <Trophy className="h-4 w-4" aria-hidden />
              Cargar resultados
            </Link>
          </>
        }
      >
        <form onSubmit={add} className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Inscribir corredor</span>
            <select
              value={selectedCyclist}
              onChange={(event) => setSelectedCyclist(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
            >
              <option value="">Selecciona un corredor activo…</option>
              {available.map((cyclist) => {
                const category = categories.find((item) => item.id === cyclist.category_id);
                return (
                  <option key={cyclist.id} value={cyclist.id}>
                    {cyclist.full_name}
                    {category ? ` · ${category.name}` : ''}
                  </option>
                );
              })}
            </select>
          </label>
          <Button
            type="submit"
            loading={adding}
            disabled={!selectedCyclist}
            startIcon={<UserPlus className="h-4 w-4" />}
          >
            Inscribir
          </Button>
        </form>

        {loading ? (
          <LoadingBlock message="Cargando inscripciones…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : registrations.length === 0 ? (
          <EmptyState
            compact
            icon={ListChecks}
            title="Sin inscripciones"
            description="Inscribe a los corredores que participarán en esta carrera."
          />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {registrations.map((registration) => (
              <li key={registration.id} className="flex flex-wrap items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {registration.cyclist_name || 'Corredor'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Inscrito el {formatDate(registration.created_at)}
                  </p>
                </div>
                <select
                  value={registration.status}
                  onChange={(event) =>
                    void changeStatus(
                      registration.id,
                      event.target.value as RegistrationStatus,
                    )
                  }
                  disabled={updating === registration.id}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 focus:border-[var(--brand)] focus:outline-none disabled:opacity-50"
                  aria-label={`Estado de ${registration.cyclist_name || 'corredor'}`}
                >
                  {REGISTRATION_STATUS.map((status) => (
                    <option key={status} value={status}>
                      {REGISTRATION_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <StatusBadge
                  status={registration.status}
                  label={REGISTRATION_STATUS_LABELS[registration.status]}
                />
                <button
                  type="button"
                  onClick={() => setRemoving(registration)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Quitar inscripción"
                  title="Quitar inscripción"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {available.length === 0 && cyclists.length > 0 && registrations.length > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Todos los corredores activos ya están inscritos.
          </p>
        )}
        {cyclists.length === 0 && (
          <div className="mt-3">
            <Badge tone="warning">Primero crea corredores en la sección Corredores.</Badge>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Quitar inscripción"
        description={`Se quitará a ${removing?.cyclist_name || 'este corredor'} de la carrera. Los resultados ya cargados no se modifican.`}
        confirmLabel="Quitar"
        loading={removeLoading}
        onConfirm={() => void confirmRemove()}
      />
    </>
  );
}
