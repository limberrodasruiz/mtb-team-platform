import { Eye, ShieldCheck } from 'lucide-react';

export function ReadOnlyNotice({
  message = 'Tu rol tiene acceso de solo lectura. Un administrador o tesorería debe registrar los movimientos.',
}: {
  message?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
      <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">Acceso de solo lectura</p>
        <p className="mt-0.5 text-xs leading-relaxed text-sky-800">{message}</p>
      </div>
    </div>
  );
}

export function FinanceWriteNotice({ role }: { role: string }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">Operaciones auditadas</p>
        <p className="mt-0.5 text-xs leading-relaxed text-emerald-800">
          Cada movimiento queda registrado en la auditoría con tu usuario y rol ({role}). Los
          comprobantes son privados y se abren mediante enlaces firmados.
        </p>
      </div>
    </div>
  );
}
