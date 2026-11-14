import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useSiteSettings } from '../../providers/SiteSettingsProvider';
import { errorMessage } from '../../lib/errors';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BrandMark } from '../../components/layout/Logo';

const CURRENT_YEAR = new Date().getFullYear();

export function LoginPage() {
  useDocumentTitle('Acceso privado');
  const { configured, session, profile, loading, signIn } = useAuth();
  const { settings } = useSiteSettings();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirect = params.get('redirect') || '/admin';

  useEffect(() => {
    if (!loading && session && profile) {
      navigate(redirect.startsWith('/admin') ? redirect : '/admin', { replace: true });
    }
  }, [loading, session, profile, navigate, redirect]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(redirect.startsWith('/admin') ? redirect : '/admin', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'No se pudo iniciar sesión.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[var(--secondary)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="topographic absolute inset-0" aria-hidden />
        <div className="grid-pattern absolute inset-0 opacity-50" aria-hidden />
        <div
          className="pointer-events-none absolute -bottom-20 -right-24 select-none font-display text-[300px] font-bold leading-none text-white/[0.04]"
          aria-hidden
        >
          MTB
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <BrandMark size="lg" />
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wide">
                {settings.team_name}
              </p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                Panel administrativo
              </p>
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">
            Gestión del equipo
          </p>
          <h1 className="mt-4 font-display text-5xl font-bold uppercase leading-[0.92] tracking-tight">
            Todo el equipo,
            <br />
            en un solo lugar.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Deportistas, carreras, resultados, contenido y finanzas con trazabilidad. El acceso
            está restringido a miembros autorizados.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Roles y permisos por función',
              'Registro financiero con auditoría',
              'Resultados y ranking automáticos',
              'Contenido público administrado desde un solo panel',
            ].map((item) => (
              <p key={item} className="flex items-start gap-2.5 text-xs text-white/60">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                {item}
              </p>
            ))}
          </div>
        </div>

        <p className="relative text-[10px] uppercase tracking-[0.2em] text-white/25">
          Acceso privado · Datos protegidos
        </p>
      </aside>

      <main className="flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between gap-3 lg:hidden">
            <div className="flex items-center gap-2.5">
              <BrandMark size="md" />
              <span className="text-xs font-extrabold uppercase leading-tight tracking-wide text-slate-950">
                {settings.team_name}
              </span>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Volver al sitio público
          </Link>

          <div className="mt-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-dark)]">
              <LockKeyhole className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-4xl font-bold uppercase leading-none tracking-tight text-slate-950">
              Ingreso privado
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Usa las credenciales asignadas por un administrador del equipo.
            </p>
          </div>

          {!configured && (
            <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Supabase no está configurado en este entorno. Define{' '}
                <code className="font-mono">VITE_SUPABASE_URL</code> y{' '}
                <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> para habilitar el
                acceso.
              </span>
            </div>
          )}

          {session && !profile && !loading && (
            <div className="mt-5 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-xs leading-relaxed text-sky-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Tu sesión está activa, pero no tienes un perfil habilitado. Pídele a un
                administrador que asigne tu rol.
              </span>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nombre@equipo.com"
              autoComplete="email"
              required
              disabled={submitting}
            />
            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={submitting}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-[30px] rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>

            {error && (
              <p
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
                role="alert"
              >
                {error}
              </p>
            )}

            <Button type="submit" loading={submitting} fullWidth size="lg" disabled={!configured}>
              Ingresar al panel
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
            <p className="font-semibold text-slate-700">¿No tienes acceso?</p>
            <p className="mt-1">
              El registro de usuarios se gestiona desde Supabase Auth. Un administrador debe
              crear la cuenta y asignarle un rol en el panel de usuarios.
            </p>
          </div>

          <p className="mt-8 text-center text-[10px] uppercase tracking-[0.2em] text-slate-300">
            © {CURRENT_YEAR} {settings.team_name}
          </p>
        </div>
      </main>
    </div>
  );
}
