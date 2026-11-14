import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, Home } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { buttonStyles } from '../../components/ui/Button';

export function NotFoundPage() {
  useDocumentTitle('Página no encontrada');

  return (
    <div className="relative flex min-h-[75vh] items-center justify-center overflow-hidden bg-slate-50 px-4 py-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 38px, #0f172a 39px, #0f172a 40px)',
        }}
        aria-hidden
      />
      <div className="relative max-w-lg text-center">
        <p className="font-display text-[120px] font-bold leading-none text-slate-200 sm:text-[160px]">
          404
        </p>
        <div className="-mt-8 flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand)] text-white shadow-lg">
            <Compass className="h-7 w-7" aria-hidden />
          </span>
        </div>
        <h1 className="mt-5 font-display text-4xl font-bold uppercase leading-none text-slate-950">
          Te saliste de la ruta
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
          La página que buscas no existe, cambió de dirección o fue retirada. Volvamos al
          camino principal.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className={buttonStyles('primary', 'md')}>
            <Home className="h-4 w-4" aria-hidden />
            Ir al inicio
          </Link>
          <Link to="/carreras" className={buttonStyles('outline', 'md')}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Ver carreras
          </Link>
        </div>
      </div>
    </div>
  );
}
