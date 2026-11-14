import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Ban,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Timer,
  Trophy,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../providers/ToastProvider';
import {
  annulResult,
  createResult,
  getResults,
  updateResult,
  type ResultInput,
} from '../../services/results';
import { getAdminRaces } from '../../services/races';
import { getAdminCyclists } from '../../services/cyclists';
import { getAdminCategories } from '../../services/categories';
import type {
  Category,
  Cyclist,
  Race,
  ResultStatus,
  ResultWithRelations,
} from '../../types';
import {
  RESULT_STATUS,
  RESULT_STATUS_LABELS,
} from '../../constants';
import { errorMessage } from '../../lib/errors';
import { downloadCsv } from '../../utils/csv';
import { formatDate, ordinal } from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';
import { SearchInput } from '../../components/ui/SearchInput';

interface PageData {
  races: Race[];
  cyclists: Cyclist[];
  categories: Category[];
  results: ResultWithRelations[];
}

interface ResultForm {
  race_id: string;
  cyclist_id: string;
  category_id: string;
  result_status: ResultStatus;
  position: string;
  time_text: string;
  notes: string;
}

function emptyForm(raceId = ''): ResultForm {
  return {
    race_id: raceId,
    cyclist_id: '',
    category_id: '',
    result_status: 'FINISHED',
    position: '',
    time_text: '',
    notes: '',
  };
}

function formFromResult(result: ResultWithRelations): ResultForm {
  return {
    race_id: result.race_id,
    cyclist_id: result.cyclist_id,
    category_id: result.category_id ?? '',
    result_status: result.result_status === 'ANULADO' ? 'FINISHED' : result.result_status,
    position: result.position !== null ? String(result.position) : '',
    time_text: result.time_text ?? '',
    notes: result.notes ?? '',
  };
}

function timeToSeconds(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const parts = text.split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  if (parts.length === 1) return Math.round(parts[0]);
  if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
  if (parts.length === 3) {
    return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  }
  return null;
}

export function AdminResultsPage() {
  const { success, error: toastError } = useToast();
  const [params] = useSearchParams();
  const [raceFilter, setRaceFilter] = useState(params.get('raceId') ?? '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ResultWithRelations | null>(null);
  const [form, setForm] = useState<ResultForm>(emptyForm(params.get('raceId') ?? ''));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [annulling, setAnnulling] = useState<ResultWithRelations | null>(null);
  const [annulLoading, setAnnulLoading] = useState(false);

  const { data, loading, error, reload } = useAsync<PageData>(async () => {
    const [races, cyclists, categories, results] = await Promise.all([
      getAdminRaces(),
      getAdminCyclists(),
      getAdminCategories(),
      getResults({ includeAnnulled: true }),
    ]);
    return { races, cyclists, categories, results };
  }, []);

  const races = data?.races ?? [];
  const cyclists = data?.cyclists ?? [];
  const categories = data?.categories ?? [];
  const results = useMemo(() => data?.results ?? [], [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return results.filter((result) => {
      if (raceFilter && result.race_id !== raceFilter) return false;
      if (categoryFilter && result.category_id !== categoryFilter) return false;
      if (statusFilter && result.result_status !== statusFilter) return false;
      if (!term) return true;
      return [result.cyclist_name, result.race_name, result.category_name, result.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [results, raceFilter, categoryFilter, statusFilter, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(raceFilter));
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(result: ResultWithRelations) {
    setEditing(result);
    setForm(formFromResult(result));
    setFormError(null);
    setFormOpen(true);
  }

  function updateForm<K extends keyof ResultForm>(key: K, value: ResultForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onCyclistChange(cyclistId: string) {
    const cyclist = cyclists.find((item) => item.id === cyclistId);
    setForm((current) => ({
      ...current,
      cyclist_id: cyclistId,
      category_id: current.category_id || cyclist?.category_id || '',
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      if (!form.race_id) throw new Error('Selecciona la carrera.');
      if (!form.cyclist_id) throw new Error('Selecciona el corredor.');

      const isFinished = form.result_status === 'FINISHED';
      const position = isFinished ? Number(form.position) : null;
      if (isFinished && (!Number.isInteger(position) || (position ?? 0) <= 0)) {
        throw new Error('Un resultado finalizado necesita una posición válida.');
      }

      const payload: ResultInput = {
        race_id: form.race_id,
        cyclist_id: form.cyclist_id,
        category_id: form.category_id || null,
        position,
        result_status: form.result_status,
        time_text: form.time_text.trim() || null,
        time_seconds: timeToSeconds(form.time_text),
        notes: form.notes.trim() || null,
      };

      if (editing) {
        await updateResult(editing.id, payload);
        success('Resultado actualizado.');
      } else {
        await createResult(payload);
        success('Resultado registrado.');
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err, 'No se pudo guardar el resultado.'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmAnnul(reason: string) {
    if (!annulling) return;
    setAnnulLoading(true);
    try {
      await annulResult(annulling.id, reason);
      success('Resultado anulado. El ranking se recalcula automáticamente.');
      setAnnulling(null);
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo anular el resultado.'));
    } finally {
      setAnnulLoading(false);
    }
  }

  function exportCsv() {
    downloadCsv(
      `resultados-${new Date().toISOString().slice(0, 10)}`,
      [
        'Carrera',
        'Fecha',
        'Corredor',
        'Categoría',
        'Estado',
        'Posición',
        'Puntos',
        'Tiempo',
        'Notas',
      ],
      filtered.map((result) => [
        result.race_name,
        result.race_date,
        result.cyclist_name,
        result.category_name,
        result.result_status,
        result.position,
        result.points,
        result.time_text,
        result.notes,
      ]),
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Deportivo"
        title="Resultados"
        description="Los puntos se calculan en el servidor según la tabla de puntuación. Anular un resultado lo retira del ranking sin borrar el historial."
        actions={
          <>
            <Button
              variant="outline"
              onClick={exportCsv}
              startIcon={<Download className="h-4 w-4" />}
              disabled={filtered.length === 0}
            >
              Exportar CSV
            </Button>
            <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
              Nuevo resultado
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Registros', value: results.length },
          {
            label: 'Finalizados',
            value: results.filter((result) => result.result_status === 'FINISHED').length,
          },
          { label: 'Podios', value: results.filter((result) => result.position !== null && result.position <= 3 && result.result_status === 'FINISHED').length },
          {
            label: 'Anulados',
            value: results.filter((result) => result.result_status === 'ANULADO').length,
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
        <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar corredor, carrera o nota…"
            className="w-full"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={raceFilter}
              onChange={(event) => setRaceFilter(event.target.value)}
              className="h-10 max-w-[240px] rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[var(--brand)] focus:outline-none"
              aria-label="Filtrar por carrera"
            >
              <option value="">Todas las carreras</option>
              {races.map((race) => (
                <option key={race.id} value={race.id}>
                  {race.name}
                </option>
              ))}
            </select>
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
              {RESULT_STATUS.map((status) => (
                <option key={status} value={status}>
                  {RESULT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-5">
            <LoadingBlock message="Cargando resultados…" />
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Trophy}
              title={results.length === 0 ? 'Sin resultados cargados' : 'Sin coincidencias'}
              description={
                results.length === 0
                  ? 'Registra el primer resultado para que aparezca en el ranking y en el perfil del corredor.'
                  : 'Ajusta los filtros o el término de búsqueda.'
              }
              action={
                results.length === 0 ? (
                  <Button onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
                    Nuevo resultado
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
                  <th className="px-4 py-3 text-left">Corredor</th>
                  <th className="px-4 py-3 text-left">Carrera</th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-center">Posición</th>
                  <th className="px-4 py-3 text-center">Puntos</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((result) => (
                  <tr key={result.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3" data-label="Corredor">
                      <p className="font-medium text-slate-900">{result.cyclist_name || '—'}</p>
                      <p className="text-[11px] text-slate-500">
                        {result.time_text || 'Sin tiempo registrado'}
                      </p>
                    </td>
                    <td className="px-4 py-3" data-label="Carrera">
                      <p className="text-slate-700">{result.race_name || '—'}</p>
                      <p className="text-[11px] text-slate-400">{formatDate(result.race_date)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600" data-label="Categoría">
                      {result.category_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums" data-label="Posición">
                      {result.result_status === 'FINISHED' ? ordinal(result.position) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums" data-label="Puntos">
                      <span className="font-semibold text-slate-900">{result.points}</span>
                    </td>
                    <td className="px-4 py-3" data-label="Estado">
                      <StatusBadge
                        status={result.result_status}
                        label={RESULT_STATUS_LABELS[result.result_status]}
                      />
                    </td>
                    <td className="px-4 py-3" data-label="Acciones">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(result)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label="Editar resultado"
                          title="Editar"
                        >
                          {result.result_status === 'ANULADO' ? (
                            <RotateCcw className="h-4 w-4" />
                          ) : (
                            <Pencil className="h-4 w-4" />
                          )}
                        </button>
                        {result.result_status !== 'ANULADO' && (
                          <button
                            type="button"
                            onClick={() => setAnnulling(result)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Anular resultado"
                            title="Anular"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
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
        title={editing ? 'Editar resultado' : 'Nuevo resultado'}
        description="La posición y los puntos se validan en el servidor."
        dismissible={!saving}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="result-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Registrar resultado'}
            </Button>
          </>
        }
      >
        <form id="result-form" onSubmit={save} className="space-y-4">
          <Select
            label="Carrera"
            value={form.race_id}
            onChange={(event) => updateForm('race_id', event.target.value)}
            required
          >
            <option value="">Selecciona una carrera…</option>
            {races.map((race) => (
              <option key={race.id} value={race.id}>
                {race.name} · {formatDate(race.date)}
              </option>
            ))}
          </Select>
          <Select
            label="Corredor"
            value={form.cyclist_id}
            onChange={(event) => onCyclistChange(event.target.value)}
            required
          >
            <option value="">Selecciona un corredor…</option>
            {cyclists.map((cyclist) => (
              <option key={cyclist.id} value={cyclist.id}>
                {cyclist.full_name}
                {cyclist.active ? '' : ' (inactivo)'}
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Categoría"
              value={form.category_id}
              onChange={(event) => updateForm('category_id', event.target.value)}
            >
              <option value="">Usar categoría del corredor</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select
              label="Estado"
              value={form.result_status}
              onChange={(event) =>
                updateForm('result_status', event.target.value as ResultStatus)
              }
            >
              {RESULT_STATUS.filter((status) => status !== 'ANULADO').map((status) => (
                <option key={status} value={status}>
                  {RESULT_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </div>
          {form.result_status === 'FINISHED' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Posición"
                type="number"
                min={1}
                value={form.position}
                onChange={(event) => updateForm('position', event.target.value)}
                required
              />
              <Input
                label="Tiempo"
                value={form.time_text}
                onChange={(event) => updateForm('time_text', event.target.value)}
                placeholder="1:23:45 o 83:45"
                hint="Formato hh:mm:ss, mm:ss o segundos."
              />
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <Timer className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Los estados DNF, DSQ y DNS no otorgan puntos y no requieren posición.
            </div>
          )}
          <Textarea
            label="Notas"
            value={form.notes}
            onChange={(event) => updateForm('notes', event.target.value)}
            rows={2}
            placeholder="Observaciones del resultado (opcional)."
          />
          {editing?.result_status === 'ANULADO' && (
            <Badge tone="info">
              Este resultado está anulado. Guardar con estado “Finalizó” lo reactiva.
            </Badge>
          )}
          {formError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {formError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(annulling)}
        onClose={() => setAnnulling(null)}
        title="Anular resultado"
        description={`${annulling?.cyclist_name || 'El corredor'} · ${annulling?.race_name || 'Carrera'}. El registro se conserva con estado anulado y deja de sumar puntos.`}
        confirmLabel="Anular resultado"
        requireReason
        reasonLabel="Motivo de la anulación"
        loading={annulLoading}
        onConfirm={(reason) => void confirmAnnul(reason)}
      />
    </>
  );
}
