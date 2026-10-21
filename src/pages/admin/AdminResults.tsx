import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import type { TableColumn } from '../../components/ui/Table';
import { useAuth } from '../../hooks/useAuth';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase } from '../../lib/supabaseClient';
import { logAudit } from '../../services/supabase/admin';
import { getCyclists } from '../../services/supabase/cyclists';
import { getRaces } from '../../services/supabase/races';
import { getScoringRules, updateScoringRules } from '../../services/supabase/rankings';
import { createResult, getResults } from '../../services/supabase/results';
import type { RaceResult } from '../../types';

async function fetchAll() {
  const [results, races, cyclists, rules] = await Promise.all([
    getResults(),
    getRaces(),
    getCyclists(),
    getScoringRules().catch(() => []),
  ]);
  return { results, races, cyclists, rules };
}

export function AdminResults() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'DIRECTIVA', 'EDITOR']);
  const { data, loading, error, reload } = useSupabaseQuery(fetchAll);
  const [modalOpen, setModalOpen] = useState(false);
  const [raceId, setRaceId] = useState('');
  const [cyclistId, setCyclistId] = useState('');
  const [position, setPosition] = useState('1');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rulesDraft, setRulesDraft] = useState('');
  const [savingRules, setSavingRules] = useState(false);

  const names = useMemo(() => {
    if (!data) return { races: new Map<string, string>(), cyclists: new Map<string, string>() };
    return {
      races: new Map(data.races.map((r) => [r.id, r.name])),
      cyclists: new Map(data.cyclists.map((c) => [c.id, c.full_name])),
    };
  }, [data]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const pos = Number(position);
    if (!raceId || !cyclistId || !Number.isInteger(pos) || pos <= 0) {
      setFormError('Carrera, corredor y posición válida son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const created = await createResult({ race_id: raceId, cyclist_id: cyclistId, position: pos });
      try {
        await logAudit({
          user_id: user?.id ?? null,
          action: 'result.create',
          table_name: 'race_results',
          record_id: created.id,
          details: { race_id: raceId, cyclist_id: cyclistId, position: pos, points: created.points },
        });
      } catch {
        /* noop */
      }
      setModalOpen(false);
      setRaceId('');
      setCyclistId('');
      setPosition('1');
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar el resultado.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: RaceResult) => {
    if (!window.confirm('¿Eliminar este resultado?')) return;
    const { error: delError } = await supabase.from('race_results').delete().eq('id', row.id);
    if (delError) return;
    reload();
  };

  const handleSaveRules = async () => {
    const pairs = rulesDraft.split(',').map((p) => p.trim()).filter(Boolean);
    const parsed = pairs.map((p) => {
      const [pos, pts] = p.split(':').map((n) => Number(n.trim()));
      return { position: pos, points: pts };
    }).filter((r) => Number.isInteger(r.position) && Number.isFinite(r.points));
    if (parsed.length === 0) return;
    setSavingRules(true);
    try {
      await updateScoringRules(parsed);
      reload();
      setRulesDraft('');
    } catch {
      /* noop */
    } finally {
      setSavingRules(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Cargando resultados…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudieron cargar los resultados.'} onRetry={reload} />;
  }

  const columns: TableColumn<RaceResult>[] = [
    { key: 'race', header: 'Carrera', render: (r) => <span className="font-medium">{names.races.get(r.race_id) ?? '—'}</span> },
    { key: 'cyclist', header: 'Corredor', render: (r) => names.cyclists.get(r.cyclist_id) ?? '—' },
    { key: 'pos', header: 'Pos.', render: (r) => `#${r.position}` },
    { key: 'pts', header: 'Pts (auto)', render: (r) => r.points },
    {
      key: 'actions',
      header: 'Acciones',
      render: (r) => (
        <Button size="sm" variant="danger" disabled={!canEdit} onClick={() => void handleDelete(r)}>
          Eliminar
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Resultados"
        subtitle={`${data.results.length} resultados · puntos calculados automáticamente`}
        actions={<Button onClick={() => setModalOpen(true)} disabled={!canEdit}>Nuevo resultado</Button>}
      />
      {data.results.length === 0 ? (
        <EmptyState title="Sin resultados" description="Registra el primer resultado de carrera." />
      ) : (
        <Table columns={columns} data={data.results.slice(0, 100)} keyExtractor={(r) => r.id} />
      )}
      <Card title="Reglas de puntuación" subtitle="Formato posición:puntos separado por comas. Ej: 1:10, 2:8, 3:6">
        {data.rules.length > 0 ? (
          <p className="mb-3 text-sm text-slate-600">
            Actual: {data.rules.map((r) => `${r.position}:${r.points}`).join(', ')}
          </p>
        ) : (
          <p className="mb-3 text-sm text-slate-500">No hay reglas personalizadas; se usa puntuación por defecto.</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="1:10, 2:8, 3:6, 4:5…" value={rulesDraft} onChange={(e) => setRulesDraft(e.target.value)} disabled={!canEdit} />
          <Button onClick={() => void handleSaveRules} loading={savingRules} disabled={!canEdit || !rulesDraft.trim()}>
            Guardar reglas
          </Button>
        </div>
      </Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo resultado">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Select label="Carrera *" value={raceId} onChange={(e) => setRaceId(e.target.value)} options={data.races.map((r) => ({ value: r.id, label: r.name }))} placeholder="Seleccionar…" />
          <Select label="Corredor *" value={cyclistId} onChange={(e) => setCyclistId(e.target.value)} options={data.cyclists.map((c) => ({ value: c.id, label: c.full_name }))} placeholder="Seleccionar…" />
          <Input label="Posición *" type="number" min="1" step="1" value={position} onChange={(e) => setPosition(e.target.value)} required hint="Los puntos se calculan solos según las reglas." />
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

export default AdminResults;
