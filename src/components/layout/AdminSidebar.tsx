import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Role } from '../../types';

export interface AdminNavItem {
  label: string;
  to: string;
  allowed: Role[];
}

export const ADMIN_LINKS: AdminNavItem[] = [
  { label: 'Dashboard', to: '/admin', allowed: ['ADMIN', 'DIRECTIVA', 'TESORERIA', 'EDITOR', 'CONSULTA'] },
  { label: 'Corredores', to: '/admin/corredores', allowed: ['ADMIN', 'DIRECTIVA', 'EDITOR'] },
  { label: 'Miembros', to: '/admin/miembros', allowed: ['ADMIN', 'DIRECTIVA', 'TESORERIA'] },
  { label: 'Membresías', to: '/admin/membresias', allowed: ['ADMIN', 'TESORERIA'] },
  { label: 'Deudores', to: '/admin/deudores', allowed: ['ADMIN', 'DIRECTIVA', 'TESORERIA'] },
  { label: 'Aportes', to: '/admin/aportes', allowed: ['ADMIN', 'TESORERIA'] },
  { label: 'Caja', to: '/admin/caja', allowed: ['ADMIN', 'TESORERIA'] },
  { label: 'Gastos', to: '/admin/gastos', allowed: ['ADMIN', 'DIRECTIVA', 'TESORERIA'] },
  { label: 'Carreras', to: '/admin/carreras', allowed: ['ADMIN', 'DIRECTIVA', 'EDITOR'] },
  { label: 'Presupuestos', to: '/admin/presupuestos', allowed: ['ADMIN', 'DIRECTIVA', 'TESORERIA'] },
  { label: 'Resultados', to: '/admin/resultados', allowed: ['ADMIN', 'DIRECTIVA', 'EDITOR'] },
  { label: 'Noticias', to: '/admin/noticias', allowed: ['ADMIN', 'EDITOR'] },
  { label: 'Galería', to: '/admin/galeria', allowed: ['ADMIN', 'EDITOR'] },
  { label: 'Banners', to: '/admin/banners', allowed: ['ADMIN', 'EDITOR'] },
  { label: 'Auspiciadores', to: '/admin/auspiciadores', allowed: ['ADMIN', 'DIRECTIVA', 'EDITOR'] },
  { label: 'Usuarios', to: '/admin/usuarios', allowed: ['ADMIN'] },
  { label: 'Auditoría', to: '/admin/auditoria', allowed: ['ADMIN', 'DIRECTIVA'] },
  { label: 'Reportes', to: '/admin/reportes', allowed: ['ADMIN', 'DIRECTIVA', 'TESORERIA'] },
  { label: 'Configuración', to: '/admin/configuracion', allowed: ['ADMIN'] },
];

interface AdminSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

function sidebarLinkClasses(isActive: boolean): string {
  return `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-brand-600 text-white'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;
}

export function AdminSidebar({ open = false, onClose }: AdminSidebarProps) {
  const { profile, hasRole } = useAuth();
  const visibleLinks = ADMIN_LINKS.filter((item) => !profile || hasRole(item.allowed));

  const nav = (
    <nav aria-label="Navegación de administración" className="flex-1 overflow-y-auto p-3">
      <ul className="space-y-1">
        {visibleLinks.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/admin'}
              onClick={onClose}
              className={({ isActive }) => sidebarLinkClasses(isActive)}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {nav}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú de administración">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 cursor-default bg-slate-900/50"
            onClick={onClose}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="text-sm font-bold text-slate-900">Panel Admin</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar menú de administración"
                className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}
    </>
  );
}
