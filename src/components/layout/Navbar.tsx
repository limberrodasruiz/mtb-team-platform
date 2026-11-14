import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, LockKeyhole, Menu, X } from 'lucide-react';
import { NAV_PUBLIC } from '../../constants';
import { useAuth } from '../../providers/AuthProvider';
import { cn } from '../../utils/cn';
import { buttonStyles } from '../ui/Button';
import { Logo } from './Logo';

const PRIMARY_PATHS = ['/', '/equipo', '/corredores', '/ranking', '/carreras', '/noticias', '/contacto'];
const MORE_PATHS = ['/resultados', '/galeria', '/auspiciadores'];

const primaryLinks = NAV_PUBLIC.filter((link) => PRIMARY_PATHS.includes(link.to));
const moreLinks = NAV_PUBLIC.filter((link) => MORE_PATHS.includes(link.to));

function navClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'rounded-lg px-2.5 py-2 text-[13px] font-medium transition',
    isActive
      ? 'bg-[var(--brand-soft)] text-[var(--brand-dark)]'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { profile } = useAuth();

  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMoreOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [moreOpen]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const moreActive = MORE_PATHS.some((path) => location.pathname.startsWith(path));
  const adminTarget = profile ? '/admin' : '/admin/login';

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-white/90 backdrop-blur-xl transition',
        scrolled ? 'border-slate-200 shadow-sm' : 'border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Logo className="max-w-[56%] sm:max-w-none" onClick={() => setOpen(false)} />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navegación principal">
          {primaryLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={navClass}>
              {link.label}
            </NavLink>
          ))}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((value) => !value)}
              aria-expanded={moreOpen}
              aria-haspopup="true"
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[13px] font-medium transition',
                moreActive
                  ? 'bg-[var(--brand-soft)] text-[var(--brand-dark)]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
              )}
            >
              Más
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition', moreOpen && 'rotate-180')}
                aria-hidden
              />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
                {moreLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-lg px-3 py-2 text-sm font-medium transition',
                        isActive
                          ? 'bg-[var(--brand-soft)] text-[var(--brand-dark)]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Link to={adminTarget} className={buttonStyles('outline', 'sm')}>
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden />
            {profile ? 'Panel' : 'Acceso privado'}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 top-16 z-40 h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-200 bg-white px-4 py-5 lg:hidden"
        >
          <nav className="mx-auto flex max-w-7xl flex-col gap-1" aria-label="Navegación móvil">
            {NAV_PUBLIC.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-xl px-4 py-3 text-base font-medium transition',
                    isActive
                      ? 'bg-[var(--brand-soft)] text-[var(--brand-dark)]'
                      : 'text-slate-700 hover:bg-slate-50',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <Link
                to={adminTarget}
                onClick={() => setOpen(false)}
                className={buttonStyles('primary', 'md', true)}
              >
                <LockKeyhole className="h-4 w-4" aria-hidden />
                {profile ? 'Ir al panel' : 'Acceso privado'}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
