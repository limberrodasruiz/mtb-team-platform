import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { Spinner } from '../ui/States';
import type { Role } from '../../types';

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3 text-white/70">
        <Spinner className="h-7 w-7 text-white" />
        <p className="text-sm">Verificando acceso…</p>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { configured, loading, session, profileLoading, profile } = useAuth();
  const location = useLocation();

  if (!configured) {
    return <Navigate to="/admin/login" replace />;
  }

  if (loading) return <FullScreenLoader />;

  if (!session) {
    const redirect = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/admin/login?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    );
  }

  if (profileLoading && !profile) return <FullScreenLoader />;

  return <>{children}</>;
}

export function RequireRole({
  roles,
  children,
}: {
  roles: readonly Role[];
  children: ReactNode;
}) {
  const { profile } = useAuth();

  if (profile && !roles.includes(profile.role)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
