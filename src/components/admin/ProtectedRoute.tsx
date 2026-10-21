import type { ReactNode } from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Role } from '../../types';
import { Spinner } from '../ui/Spinner';

interface ProtectedRouteProps {
  allowed: Role[];
  children?: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  allowed,
  children,
  redirectTo = '/admin/login',
}: ProtectedRouteProps) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Spinner size="lg" label="Verificando permisos…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!hasRole(allowed)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Sin permiso</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tu rol no tiene acceso a esta sección. Si crees que es un error, contacta al
            administrador.
          </p>
          <Link
            to="/admin"
            className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  return <>{children ?? <Outlet />}</>;
}
