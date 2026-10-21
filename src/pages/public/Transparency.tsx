import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { StatCard } from '../../components/ui/StatCard';
import { Table } from '../../components/ui/Table';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { getCashMovements } from '../../services/supabase/finance';
import { calculateCashBalance, summarizeByCategory, summarizeByMonth, summarizeCash } from '../../utils/finance';
import type { CashMovement, Race } from '../../types';

interface TransparencyData {
  movements: CashMovement[];
  races: Race[];
}

function normalizeMovement(raw: Record<string, unknown>): CashMovement {
  return {
    id: typeof raw.id === 'string' ? raw.id : crypto.randomUUID(),
    created_at: typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString(),
    concept: typeof raw.concept === 'string' ? raw.concept : 'Movimiento',
    type: raw.type === 'EGRESO' ? 'EGRESO' : 'INGRESO',
    amount: typeof raw.amount === 'number' ? raw.amount : Number(raw.amount ?? 0),
    movement_date:
      typeof raw.movement_date === 'string'
        ? raw.movement_date
        : typeof raw.date === 'string'
          ? raw.date
          : new Date().toISOString().slice(0, 10),
    category: typeof raw.category === 'string' ? raw.category : null,
    related_race_id:
      typeof raw.related_race_id === 'string'
        ? raw.related_race_id
        : typeof raw.race_id === 'string'
          ? raw.race_id
          : null,
    related_member_id: null,
    notes: typeof raw.notes === 'string' ? raw.notes : null,
  };
}

async function fetchTransparency(): Promise<TransparencyData> {
  const [rawMovements, { data: races }] = await Promise.all([
    getCashMovements(),
    supabase.from('races').select('id, name'),
  ]);
  const movements = (rawMovements as unknown as Array<Record<string, unknown>>).map(normalizeMovement);
  return { movements, races: ((races ?? []) as Race[]) };
}

function formatBs(n: number): string {
  return `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function Transparency() {
  const { data, loading, error, reload } = useSupabaseQuery(fetchTransparency);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState title="Supabase no configurado" description="No se puede mostrar la transparencia." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center px-4 py-16">
        <Spinner label="Cargando transparencia…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorState message={error ?? 'No se pudo cargar la transparencia.'} onRetry={reload} />
      </div>
    );
  }

  const summary = summarizeCash(data.movements);
  const balance = calculateCashBalance(data.movements);
  const byMonth = summarizeByMonth(data.movements);
  const byCategory = summarizeByCategory(data.movements);
  const monthRows = Object.entries(byMonth)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12)
    .map(([month, v]) => ({ month, ...v }));
  const categoryRows = Object.entries(byCategory).map(([category, total]) => ({ category, total }));
  const raceTotals = new Map<string, number>();
  for (const m of data.movements) {
    if (!m.related_race_id) continue;
    const signed = m.type === 'INGRESO' ? m.amount : -m.amount;
    raceTotals.set(m.related_race_id, (raceTotals.get(m.related_race_id) ?? 0) + signed);
  }
  const raceRows = [...raceTotals.entries()].map(([raceId, total]) => ({
    raceId,
    name: data.races.find((r) => r.id === raceId)?.name ?? 'Carrera',
    total,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <PageHeader
        title="Transparencia"
        subtitle="Resumen público de ingresos y gastos. Sin datos sensibles de miembros."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Ingresos" value={formatBs(summary.total_ingresos)} description={`${summary.movements_count} movimientos`} />
        <StatCard label="Gastos" value={formatBs(summary.total_egresos)} description="Egresos operativos" />
        <StatCard label="Saldo" value={formatBs(balance)} description="Ingresos menos egresos" />
      </div>

      <section>
        <h2 className="text-xl font-bold text-slate-900">Resumen mensual</h2>
        <div className="mt-3">
          <Table
            columns={[
              { key: 'month', header: 'Mes', render: (r) => r.month },
              { key: 'in', header: 'Ingresos', render: (r) => formatBs(r.ingresos) },
              { key: 'out', header: 'Gastos', render: (r) => formatBs(r.egresos) },
              { key: 'bal', header: 'Saldo', render: (r) => formatBs(r.balance) },
            ]}
            data={monthRows}
            keyExtractor={(r) => r.month}
            emptyMessage="Aún no hay movimientos registrados."
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Por categoría</h2>
          <div className="mt-3">
            <Table
              columns={[
                { key: 'cat', header: 'Categoría', render: (r) => r.category },
                { key: 'total', header: 'Neto', render: (r) => formatBs(r.total) },
              ]}
              data={categoryRows}
              keyExtractor={(r) => r.category}
              emptyMessage="Sin movimientos por categoría."
            />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Por carrera</h2>
          <div className="mt-3">
            <Table
              columns={[
                { key: 'race', header: 'Carrera', render: (r) => r.name },
                { key: 'total', header: 'Neto', render: (r) => formatBs(r.total) },
              ]}
              data={raceRows}
              keyExtractor={(r) => r.raceId}
              emptyMessage="Sin movimientos asociados a carreras."
            />
          </div>
        </div>
      </section>

      <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Nota: este resumen es informativo y no expone nombres, CIs, teléfonos ni montos individuales
        de miembros o aportes personales.
      </p>
    </div>
  );
}

export default Transparency;
