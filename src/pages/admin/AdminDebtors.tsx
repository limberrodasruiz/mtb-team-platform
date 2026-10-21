import { useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import type { TableColumn } from '../../components/ui/Table';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { getDebtors } from '../../services/supabase/finance';
import { downloadCSV } from '../../utils/csv';
import type { DebtorRow } from '../../utils/finance';

function defaultMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function AdminDebtors() {
  const [monthKey, setMonthKey] = useState(defaultMonthKey());
  const { data, loading, error, reload } = useSupabaseQuery(() => getDebtors(monthKey), [monthKey]);

  const handleExport = () => {
    if (!data) return;
    downloadCSV(`deudores-${monthKey}`, data.map((d) => ({
      miembro: d.member.full_name,
      tipo: d.member.member_type,
      telefono: d.member.phone ?? '',
      mes: monthKey,
      estado_pago: d.payment?.status ?? 'SIN REGISTRO',
      monto: d.payment?.amount ?? 0,
    })));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Calculando deudores…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudieron calcular los deudores.'} onRetry={reload} />;
  }

  const columns: TableColumn<DebtorRow>[] = [
    { key: 'member', header: 'Miembro', render: (r) => <span className="font-medium">{r.member.full_name}</span> },
    { key: 'type', header: 'Tipo', render: (r) => r.member.member_type },
    { key: 'phone', header: 'Teléfono', render: (r) => r.member.phone ?? '—' },
    {
      key: 'status',
      header: 'Estado pago',
      render: (r) => (
        <Badge variant={r.payment?.status === 'PARCIAL' ? 'warning' : 'danger'}>
          {r.payment?.status ?? 'SIN REGISTRO'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Deudores"
        subtitle={`Cálculo automático del período ${monthKey} · ${data.length} deudores`}
        actions={<Button variant="outline" onClick={handleExport} disabled={data.length === 0}>Exportar CSV</Button>}
      />
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <Input label="Mes (YYYY-MM)" type="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value || defaultMonthKey())} />
        <p className="mt-2 text-xs text-slate-500">
          Lista calculada vía getDebtors: miembros ACTIVO sin pago PAGADO en el mes. Solo lectura.
        </p>
      </div>
      {data.length === 0 ? (
        <EmptyState title="Sin deudores" description={`Todos los miembros están al día en ${monthKey}.`} />
      ) : (
        <Table columns={columns} data={data} keyExtractor={(r) => r.member.id} />
      )}
    </div>
  );
}

export default AdminDebtors;
