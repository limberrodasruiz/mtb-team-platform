import { useMemo, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import type { TableColumn } from '../../components/ui/Table';
import { useAuth } from '../../hooks/useAuth';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { logAudit } from '../../services/supabase/admin';
import { getMembers, getMembershipPayments, updateMemberPayment } from '../../services/supabase/finance';
import { PAYMENT_STATUS } from '../../constants';
import { formatMoneyBs } from '../../utils/format';
import type { MembershipPayment } from '../../types';

function defaultMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function fetchData(monthKey: string) {
  const [payments, members] = await Promise.all([
    getMembershipPayments(monthKey),
    getMembers(),
  ]);
  return { payments, members };
}

export function AdminMemberships() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'TESORERIA']);
  const [monthKey, setMonthKey] = useState(defaultMonthKey());
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { data, loading, error, reload } = useSupabaseQuery(() => fetchData(monthKey), [monthKey]);

  const names = useMemo(
    () => new Map((data?.members ?? []).map((m) => [m.id, m.full_name])),
    [data],
  );

  const markPaid = async (row: MembershipPayment, status: 'PAGADO' | 'PARCIAL') => {
    setUpdatingId(row.id);
    try {
      await updateMemberPayment(row.id, {
        status,
        paid_at: status === 'PAGADO' ? new Date().toISOString() : row.paid_at,
      });
      try {
        await logAudit({
          user_id: user?.id ?? null,
          action: `membership.${status.toLowerCase()}`,
          table_name: 'membership_payments',
          record_id: row.id,
          details: { month_key: row.month_key, status },
        });
      } catch {
        /* noop */
      }
      reload();
    } catch {
      /* noop */
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Cargando membresías…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudieron cargar las membresías.'} onRetry={reload} />;
  }

  const columns: TableColumn<MembershipPayment>[] = [
    { key: 'member', header: 'Miembro', render: (r) => <span className="font-medium">{names.get(r.member_id) ?? r.member_id.slice(0, 8)}</span> },
    { key: 'month', header: 'Mes', render: (r) => r.month_key },
    { key: 'amount', header: 'Monto', render: (r) => formatMoneyBs(r.amount) },
    {
      key: 'status',
      header: 'Estado',
      render: (r) => (
        <Badge variant={r.status === 'PAGADO' ? 'success' : r.status === 'PARCIAL' ? 'warning' : 'danger'}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (r) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={!canEdit || updatingId === r.id} onClick={() => void markPaid(r, 'PAGADO')}>
            Pagado
          </Button>
          <Button size="sm" variant="ghost" disabled={!canEdit || updatingId === r.id} onClick={() => void markPaid(r, 'PARCIAL')}>
            Parcial
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Membresías" subtitle={`Pagos del período ${monthKey}`} />
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <Input label="Mes (YYYY-MM)" type="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value || defaultMonthKey())} />
        <Select
          label="Filtrar por estado"
          value=""
          onChange={() => undefined}
          options={PAYMENT_STATUS.map((s) => ({ value: s, label: s }))}
          placeholder="Todos (informativo)"
        />
      </div>
      {data.payments.length === 0 ? (
        <EmptyState title="Sin pagos" description={`No hay pagos registrados para ${monthKey}.`} />
      ) : (
        <Table columns={columns} data={data.payments} keyExtractor={(r) => r.id} />
      )}
    </div>
  );
}

export default AdminMemberships;
