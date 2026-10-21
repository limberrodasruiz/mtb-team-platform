import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import type { TableColumn } from '../../components/ui/Table';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { getAuditLogs } from '../../services/supabase/admin';
import { downloadCSV } from '../../utils/csv';
import { formatDateTime } from '../../utils/format';
import type { AuditLog } from '../../types';

export function AdminAudit() {
  const { data, loading, error, reload } = useSupabaseQuery(() => getAuditLogs(200));
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data;
    return data.filter((l) =>
      `${l.action} ${l.table_name ?? ''} ${l.record_id ?? ''}`.toLowerCase().includes(q),
    );
  }, [data, filter]);

  const handleExport = () => {
    downloadCSV('auditoria', filtered.map((l) => ({
      fecha: l.created_at,
      accion: l.action,
      tabla: l.table_name ?? '',
      registro: l.record_id ?? '',
      usuario: l.user_id ?? '',
    })));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Cargando auditoría…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudo cargar la auditoría.'} onRetry={reload} />;
  }

  const columns: TableColumn<AuditLog>[] = [
    { key: 'date', header: 'Fecha', render: (r) => formatDateTime(r.created_at) },
    { key: 'action', header: 'Acción', render: (r) => <span className="font-medium">{r.action}</span> },
    { key: 'table', header: 'Tabla', render: (r) => r.table_name ?? '—' },
    { key: 'record', header: 'Registro', render: (r) => (r.record_id ? r.record_id.slice(0, 8) : '—') },
    { key: 'user', header: 'Usuario', render: (r) => (r.user_id ? r.user_id.slice(0, 8) : 'sistema') },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Auditoría"
        subtitle={`Últimos ${filtered.length} eventos · solo lectura`}
        actions={
          <>
            <Button variant="outline" onClick={reload}>Recargar</Button>
            <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>Exportar CSV</Button>
          </>
        }
      />
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <Input label="Filtrar" placeholder="acción, tabla…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="Sin eventos" description="No hay registros de auditoría." />
      ) : (
        <Table columns={columns} data={filtered} keyExtractor={(r) => r.id} />
      )}
    </div>
  );
}

export default AdminAudit;
