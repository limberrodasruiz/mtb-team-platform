import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { NAV_PUBLIC } from '../../constants';
import { useSiteSettings } from '../../hooks/useSiteSettings';

function linkClasses(isActive: boolean): string {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;
}

export function Navbar() {
  const { settings } = useSiteSettings();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.team_name}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {settings.team_name.charAt(0)}
            </span>
          )}
          <span className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">
            {settings.team_name}
          </span>
        </Link>

        <nav aria-label="Navegación principal" className="hidden items-center gap-1 lg:flex">
          {NAV_PUBLIC.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => linkClasses(isActive)}>
              {item.label}
            </NavLink>
          ))}
          <Link
            to="/admin"
            className="ml-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Admin
          </Link>
        </nav>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-expanded={open}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true" className="block text-xl leading-none">
            {open ? '×' : '☰'}
          </span>
        </button>
      </div>

      {open ? (
        <nav
          aria-label="Navegación móvil"
          className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV_PUBLIC.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `block ${linkClasses(isActive)}`}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li>
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="block rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
              >
                Admin
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
