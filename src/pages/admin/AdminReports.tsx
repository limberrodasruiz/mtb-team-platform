import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { getTeamRanking } from '../../services/supabase/rankings';
import { getCyclists } from '../../services/supabase/cyclists';
import { getRaces } from '../../services/supabase/races';
import { getResults } from '../../services/supabase/results';
import { getCashMovements, getDebtors, getMembers } from '../../services/supabase/finance';
import { downloadCSV } from '../../utils/csv';
import { formatMoneyBs } from '../../utils/format';
import { summarizeCash } from '../../utils/finance';

type ReportKind = 'corredores' | 'financiero' | 'membresias' | 'carrera';

async function fetchReports() {
  const [ranking, cyclists, races, results, movements, debtors, members] = await Promise.all([
    getTeamRanking().catch(() => []),
    getCyclists().catch(() => []),
    getRaces().catch(() => []),
    getResults().catch(() => []),
    getCashMovements().catch(() => []),
    getDebtors().catch(() => []),
    getMembers().catch(() => []),
  ]);
  return { ranking, cyclists, races, results, movements, debtors, members };
}

export function AdminReports() {
  const { data, loading, error, reload } = useSupabaseQuery(fetchReports);
  const [kind, setKind] = useState<ReportKind>('corredores');
  const [raceId, setRaceId] = useState('');

  const raceResults = useMemo(() => {
    if (!data || !raceId) return [];
    const names = new Map(data.cyclists.map((c) => [c.id, c.full_name]));
    return data.results
      .filter((r) => r.race_id === raceId)
      .sort((a, b) => a.position - b.position)
      .map((r) => ({
        posicion: r.position,
        corredor: names.get(r.cyclist_id) ?? r.cyclist_id.slice(0, 8),
        puntos: r.points,
      }));
  }, [data, raceId]);

  const cash = useMemo(() => (data ? summarizeCash(data.movements) : null), [data]);

  const handleExport = () => {
    if (!data) return;
    if (kind === 'corredores') {
      downloadCSV('reporte-corredores', data.ranking.map((r) => ({
        corredor: r.full_name,
        puntos: r.total_points,
        carreras: r.races_count,
        victorias: r.wins,
        podios: r.podiums,
      })));
    } else if (kind === 'financiero') {
      downloadCSV('reporte-financiero', data.movements.map((m) => ({
        fecha: m.movement_date,
        concepto: m.concept,
        tipo: m.type,
        monto: m.amount,
        categoria: m.category ?? '',
      })));
    } else if (kind === 'membresias') {
      downloadCSV('reporte-deudores', data.debtors.map((d) => ({
        miembro: d.member.full_name,
        tipo: d.member.member_type,
        estado_pago: d.payment?.status ?? 'SIN REGISTRO',
      })));
    } else {
      downloadCSV(`reporte-carrera-${raceId || 'todas'}`, raceResults);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Generando reportes…" />
      </div>
    );
  }

  if (error || !data || !cash) {
    return <ErrorState message={error ?? 'No se pudieron generar los reportes.'} onRetry={reload} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reportes"
        subtitle="Corredores · financiero · membresías · por carrera + export CSV"
        actions={<Button variant="outline" onClick={handleExport}>Exportar CSV</Button>}
      />
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <Select
          label="Tipo de reporte"
          value={kind}
          onChange={(e) => setKind(e.target.value as ReportKind)}
          options={[
            { value: 'corredores', label: 'Corredores / ranking' },
            { value: 'financiero', label: 'Financiero (caja)' },
            { value: 'membresias', label: 'Membresías / deudores' },
            { value: 'carrera', label: 'Por carrera' },
          ]}
        />
        {kind === 'carrera' ? (
          <Select
            label="Carrera"
            value={raceId}
            onChange={(e) => setRaceId(e.target.value)}
            options={data.races.map((r) => ({ value: r.id, label: r.name }))}
            placeholder="Seleccionar…"
          />
        ) : null}
      </div>

      {kind === 'corredores' ? (
        <Card title="Reporte de corredores" subtitle={`${data.ranking.length} en ranking · ${data.cyclists.length} registrados`}>
          {data.ranking.length === 0 ? (
            <EmptyState title="Sin datos" description="No hay resultados para rankear." />
          ) : (
            <Table
              columns={[
                { key: 'name', header: 'Corredor', render: (r: (typeof data.ranking)[number]) => r.full_name },
                { key: 'pts', header: 'Puntos', render: (r) => r.total_points },
                { key: 'races', header: 'Carreras', render: (r) => r.races_count },
                { key: 'wins', header: 'Victorias', render: (r) => r.wins },
                { key: 'pod', header: 'Podios', render: (r) => r.podiums },
              ]}
              data={data.ranking}
              keyExtractor={(r) => r.cyclist_id}
            />
          )}
        </Card>
      ) : null}

      {kind === 'financiero' ? (
        <Card title="Reporte financiero" subtitle={`Ingresos ${formatMoneyBs(cash.total_ingresos)} · Egresos ${formatMoneyBs(cash.total_egresos)} · Saldo ${formatMoneyBs(cash.balance)}`}>
          {data.movements.length === 0 ? (
            <EmptyState title="Sin movimientos" description="No hay datos financieros." />
          ) : (
            <Table
              columns={[
                { key: 'date', header: 'Fecha', render: (r: (typeof data.movements)[number]) => r.movement_date },
                { key: 'concept', header: 'Concepto', render: (r) => r.concept },
                { key: 'type', header: 'Tipo', render: (r) => r.type },
                { key: 'amount', header: 'Monto', render: (r) => formatMoneyBs(r.amount) },
              ]}
              data={data.movements.slice(0, 100)}
              keyExtractor={(r) => r.id}
            />
          )}
        </Card>
      ) : null}

      {kind === 'membresias' ? (
        <Card title="Reporte de membresías" subtitle={`${data.members.length} miembros · ${data.debtors.length} deudores`}>
          {data.debtors.length === 0 ? (
            <EmptyState title="Al día" description="No hay deudores." />
          ) : (
            <Table
              columns={[
                { key: 'name', header: 'Miembro', render: (r: (typeof data.debtors)[number]) => r.member.full_name },
                { key: 'type', header: 'Tipo', render: (r) => r.member.member_type },
                { key: 'status', header: 'Pago', render: (r) => r.payment?.status ?? 'SIN REGISTRO' },
              ]}
              data={data.debtors}
              keyExtractor={(r) => r.member.id}
            />
          )}
        </Card>
      ) : null}

      {kind === 'carrera' ? (
        <Card title="Reporte por carrera" subtitle={raceId ? `${raceResults.length} resultados` : 'Selecciona una carrera'}>
          {!raceId ? (
            <EmptyState title="Elige carrera" description="Selecciona una carrera para ver sus resultados." />
          ) : raceResults.length === 0 ? (
            <EmptyState title="Sin resultados" description="Esta carrera no tiene resultados." />
          ) : (
            <Table
              columns={[
                { key: 'pos', header: 'Pos.', render: (r: { posicion: number; corredor: string; puntos: number }) => `#${r.posicion}` },
                { key: 'name', header: 'Corredor', render: (r) => r.corredor },
                { key: 'pts', header: 'Puntos', render: (r) => r.puntos },
              ]}
              data={raceResults}
              keyExtractor={(_, i) => `${i}`}
            />
          )}
        </Card>
      ) : null}
    </div>
  );
}

export default AdminReports;
