import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ExternalLink,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ADMIN_NAV, ROLE_LABELS } from '../../constants';
import { useAuth } from '../../providers/AuthProvider';
import { cn } from '../../utils/cn';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/States';
import { BrandMark } from './Logo';

function pageTitle(pathname: string): string {
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      if (item.to === pathname) return item.label;
    }
  }
  if (pathname.startsWith('/admin/resultados')) return 'Resultados';
  return 'Panel administrativo';
}

function AccessPending() {
  const { error, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <BrandMark size="lg" className="mx-auto" />
        <h1 className="mt-4 text-lg font-bold text-slate-950">Acceso pendiente</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {error ||
            'Tu usuario inició sesión, pero todavía no tiene un perfil habilitado en el equipo.'}
        </p>
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Un administrador debe asignarte un rol desde Supabase o desde el panel de usuarios.
        </p>
        <button
          type="button"
          onClick={() => {
            void signOut().then(() => navigate('/admin/login', { replace: true }));
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { profile, loading, profileLoading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  if (loading || (profileLoading && !profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-white/70">
          <Spinner className="h-7 w-7 text-white" />
          <p className="text-sm">Verificando acceso…</p>
        </div>
      </div>
    );
  }

  if (!profile) return <AccessPending />;

  async function handleSignOut() {
    await signOut();
    navigate('/admin/login', { replace: true });
  }

  const nav = ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.allowed.includes(profile.role)),
  })).filter((group) => group.items.length > 0);

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-950 text-slate-300">
      <div className="flex h-16 items-center justify-between gap-3 border-b border-white/10 px-5">
        <Link to="/admin" className="flex min-w-0 items-center gap-2.5">
          <BrandMark size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-xs font-bold uppercase tracking-wide text-white">
              Panel interno
            </span>
            <span className="block truncate text-[10px] text-white/40">
              {ROLE_LABELS[profile.role]}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación administrativa">
        {nav.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white',
                    )
                  }
                >
                  <span>{item.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white">
              {profile.display_name || profile.email || 'Usuario'}
            </p>
            <p className="truncate text-[10px] text-white/40">{profile.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver sitio
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-rose-500/10 hover:text-rose-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative z-10 h-full w-72 max-w-[85vw]">{sidebar}</div>
        </div>
      )}

      <div className="lg:pl-64 print:pl-0">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {pageTitle(location.pathname)}
              </p>
              <p className="hidden text-[11px] text-slate-500 sm:block">
                Trinx Bolivia · panel privado
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone="brand" className="hidden sm:inline-flex">
              {ROLE_LABELS[profile.role]}
            </Badge>
            <div className="hidden text-right sm:block">
              <p className="max-w-[220px] truncate text-xs font-medium text-slate-700">
                {profile.display_name || 'Usuario'}
              </p>
              <p className="max-w-[220px] truncate text-[10px] text-slate-500">
                {profile.email}
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
          <Outlet />
        </main>

        <footer className="no-print mx-auto max-w-7xl px-4 pb-8 text-[11px] text-slate-400 sm:px-6 lg:px-8">
          Datos protegidos por RLS y auditoría. Las operaciones financieras quedan registradas.
        </footer>
      </div>
    </div>
  );
}
