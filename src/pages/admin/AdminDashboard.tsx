import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/ui/StatCard';
import { Table } from '../../components/ui/Table';
import type { TableColumn } from '../../components/ui/Table';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { getDashboardStats } from '../../services/supabase/admin';
import { getDebtors, getCashMovements } from '../../services/supabase/finance';
import { getRaces, getRaceRegistrations } from '../../services/supabase/races';
import { getResults } from '../../services/supabase/results';
import { getCyclists } from '../../services/supabase/cyclists';
import { formatDate, formatMoneyBs } from '../../utils/format';
import type { RaceResult } from '../../types';

async function fetchDashboard() {
  const [stats, debtors, movements, races, cyclists, results] = await Promise.all([
    getDashboardStats(),
    getDebtors(),
    getCashMovements(),
    getRaces(),
    getCyclists(),
    getResults(),
  ]);
  return { stats, debtors, movements, races, cyclists, results };
}

type DashboardData = Awaited<ReturnType<typeof fetchDashboard>>;

export function AdminDashboard() {
  const { data, loading, error, reload } = useSupabaseQuery(fetchDashboard);

  const derived = useMemo(() => {
    if (!data) return null;
    const monthKey = new Date().toISOString().slice(0, 7);
    const aportesMes = data.movements
      .filter((m) => m.type === 'INGRESO' && m.movement_date.slice(0, 7) === monthKey)
      .reduce((acc, m) => acc + m.amount, 0);
    const gastosMes = data.movements
      .filter((m) => m.type === 'EGRESO' && m.movement_date.slice(0, 7) === monthKey)
      .reduce((acc, m) => acc + m.amount, 0);
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = data.races
      .filter((r) => r.race_date >= today && r.status !== 'CANCELADA')
      .sort((a, b) => a.race_date.localeCompare(b.race_date))[0] ?? null;
    const cyclistNames = new Map(data.cyclists.map((c) => [c.id, c.full_name]));
    const raceNames = new Map(data.races.map((r) => [r.id, r.name]));
    const lastResults = [...data.results]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5);
    return { aportesMes, gastosMes, upcoming, cyclistNames, raceNames, lastResults };
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Cargando panel…" />
      </div>
    );
  }

  if (error || !data || !derived) {
    return <ErrorState message={error ?? 'No se pudo cargar el panel.'} onRetry={reload} />;
  }

  const resultColumns: TableColumn<RaceResult>[] = [
    {
      key: 'race',
      header: 'Carrera',
      render: (r) => derived.raceNames.get(r.race_id) ?? r.race_id.slice(0, 8),
    },
    {
      key: 'cyclist',
      header: 'Corredor',
      render: (r) => derived.cyclistNames.get(r.cyclist_id) ?? r.cyclist_id.slice(0, 8),
    },
    { key: 'position', header: 'Pos.', render: (r) => `#${r.position}` },
    { key: 'points', header: 'Pts', render: (r) => r.points },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Resumen general del equipo, finanzas y competencias"
        actions={
          <Link
            to="/admin/reportes"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Ver reportes
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Corredores activos" value={data.stats.activeCyclists} description={`Total: ${data.stats.cyclists}`} />
        <StatCard label="Miembros registrados" value={data.stats.members} description="Padrón general" />
        <StatCard label="Aportes del mes" value={formatMoneyBs(derived.aportesMes)} description="Ingresos mensuales" />
        <StatCard label="Deudores" value={data.debtors.length} description="Membresías pendientes" />
        <StatCard label="Saldo en caja" value={formatMoneyBs(data.stats.cashBalance)} description={`${data.movements.length} movimientos`} />
        <StatCard label="Gastos del mes" value={formatMoneyBs(derived.gastosMes)} description="Egresos mensuales" />
        <StatCard
          label="Próxima carrera"
          value={derived.upcoming ? derived.upcoming.name.slice(0, 18) : '—'}
          description={derived.upcoming ? formatDate(derived.upcoming.race_date) : 'Sin programar'}
        />
        <StatCard label="Carreras totales" value={data.stats.races} description={`Próximas: ${data.stats.upcomingRaces}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Próxima carrera"
          subtitle="Siguiente evento en calendario"
          actions={
            derived.upcoming ? (
              <Badge variant="info">{derived.upcoming.status}</Badge>
            ) : undefined
          }
        >
          {derived.upcoming ? (
            <div className="space-y-2 text-sm">
              <p className="text-lg font-semibold text-slate-900">{derived.upcoming.name}</p>
              <p className="text-slate-500">
                {derived.upcoming.location ?? 'Lugar por definir'} · {formatDate(derived.upcoming.race_date)}
              </p>
              <UpcomingCount raceId={derived.upcoming.id} />
            </div>
          ) : (
            <EmptyState title="Sin próximas carreras" description="No hay eventos programados." />
          )}
        </Card>

        <Card title="Últimos resultados" subtitle="5 registros más recientes">
          {derived.lastResults.length === 0 ? (
            <EmptyState title="Sin resultados" description="Aún no hay resultados registrados." />
          ) : (
            <Table columns={resultColumns} data={derived.lastResults} keyExtractor={(r) => r.id} />
          )}
        </Card>
      </div>
    </div>
  );
}

function UpcomingCount({ raceId }: { raceId: string }) {
  const { data, loading } = useSupabaseQuery(() => getRaceRegistrations(raceId), [raceId]);
  if (loading) return <Spinner size="sm" label="Contando inscritos…" />;
  const confirmed = (data ?? []).filter((r) => r.status !== 'CANCELADO').length;
  return <p className="text-sm text-slate-600"><strong>{confirmed}</strong> inscritos</p>;
}

export type { DashboardData };
export default AdminDashboard;
