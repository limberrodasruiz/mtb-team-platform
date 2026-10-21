import { useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import type { TableColumn } from '../../components/ui/Table';
import { useAuth } from '../../hooks/useAuth';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { ROLES } from '../../constants';
import { getProfiles, logAudit, updateUserRole } from '../../services/supabase/admin';
import { formatDate } from '../../utils/format';
import type { Profile, Role } from '../../types';

export function AdminUsers() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole(['ADMIN']);
  const { data, loading, error, reload } = useSupabaseQuery(getProfiles);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleRoleChange = async (row: Profile, role: Role) => {
    if (row.id === user?.id && role !== 'ADMIN') {
      if (!window.confirm('Te quitarás el rol ADMIN. ¿Continuar?')) return;
    }
    setUpdatingId(row.id);
    try {
      await updateUserRole(row.id, role);
      try {
        await logAudit({
          user_id: user?.id ?? null,
          action: 'user.role.update',
          table_name: 'profiles',
          record_id: row.id,
          details: { email: row.email, from: row.role, to: role },
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
        <Spinner label="Cargando usuarios…" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No se pudieron cargar los usuarios.'} onRetry={reload} />;
  }

  const columns: TableColumn<Profile>[] = [
    { key: 'name', header: 'Usuario', render: (r) => <span className="font-medium">{r.full_name ?? r.email ?? r.id.slice(0, 8)}</span> },
    { key: 'email', header: 'Correo', render: (r) => r.email ?? '—' },
    {
      key: 'role',
      header: 'Rol',
      render: (r) => <Badge variant={r.role === 'ADMIN' ? 'danger' : r.role === 'CONSULTA' ? 'default' : 'info'}>{r.role}</Badge>,
    },
    { key: 'date', header: 'Creado', render: (r) => formatDate(r.created_at) },
    {
      key: 'actions',
      header: 'Cambiar rol (solo ADMIN)',
      render: (r) => (
        <Select
          aria-label={`Rol de ${r.email ?? r.id}`}
          value={r.role}
          disabled={!isAdmin || updatingId === r.id}
          onChange={(e) => void handleRoleChange(r, e.target.value as Role)}
          options={ROLES.map((role) => ({ value: role, label: role }))}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Usuarios"
        subtitle={`${data.length} cuentas · solo ADMIN puede cambiar roles`}
        actions={<Button variant="outline" onClick={reload}>Recargar</Button>}
      />
      {!isAdmin ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Tu rol no permite modificar usuarios. Vista de solo lectura.
        </p>
      ) : null}
      {data.length === 0 ? (
        <EmptyState title="Sin usuarios" description="No hay perfiles registrados." />
      ) : (
        <Table columns={columns} data={data} keyExtractor={(r) => r.id} />
      )}
    </div>
  );
}

export default AdminUsers;
