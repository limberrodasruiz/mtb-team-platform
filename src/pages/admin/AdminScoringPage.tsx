import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, ExternalLink, Save, Trophy } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../providers/ToastProvider';
import { getScoringRules, updateScoringRules } from '../../services/results';
import type { ScoringRule } from '../../types';
import { errorMessage } from '../../lib/errors';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button, buttonStyles } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/States';

const MIN_POSITIONS = 20;

export function AdminScoringPage() {
  const { success, error: toastError } = useToast();
  const [points, setPoints] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useAsync<ScoringRule[]>(
    () => getScoringRules(),
    [],
  );
  const rules = useMemo(() => data ?? [], [data]);

  const maxPosition = useMemo(
    () => Math.max(MIN_POSITIONS, ...rules.map((rule) => rule.position), 0),
    [rules],
  );

  useEffect(() => {
    const next: Record<number, string> = {};
    for (let position = 1; position <= maxPosition; position += 1) {
      next[position] = String(rules.find((rule) => rule.position === position)?.points ?? 0);
    }
    setPoints(next);
  }, [rules, maxPosition]);

  const total = Object.values(points).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  );

  async function save() {
    setSaving(true);
    try {
      const payload = Object.entries(points).map(([position, value]) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error(`Los puntos de la posición ${position} no son válidos.`);
        }
        return { position: Number(position), points: parsed };
      });
      await updateScoringRules(payload);
      success('Tabla de puntuación guardada. Los resultados se recalcularon.');
      reload();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo guardar la puntuación.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Deportivo"
        title="Puntuación"
        description="Define cuántos puntos otorga cada posición. El servidor recalcula los resultados existentes al guardar."
        actions={
          <>
            <Link to="/ranking" target="_blank" className={buttonStyles('outline', 'md')}>
              <ExternalLink className="h-4 w-4" aria-hidden />
              Ver ranking público
            </Link>
            <Button
              onClick={() => void save()}
              loading={saving}
              startIcon={<Save className="h-4 w-4" />}
            >
              Guardar puntuación
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader
            title="Puntos por posición"
            description="Solo los resultados finalizados suman puntos. DNF, DSQ y DNS quedan en cero."
            actions={<Badge tone="brand">{Object.keys(points).length} posiciones</Badge>}
          />
          {loading ? (
            <div className="p-5">
              <LoadingBlock message="Cargando reglas…" />
            </div>
          ) : error ? (
            <div className="p-5">
              <ErrorState message={error} onRetry={reload} />
            </div>
          ) : (
            <CardBody>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: maxPosition }, (_, index) => index + 1).map(
                  (position) => (
                    <label
                      key={position}
                      className="group rounded-xl border border-slate-200 bg-white p-3 transition focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand)]/15"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                          {position <= 3 ? (
                            <Trophy
                              className={`h-3.5 w-3.5 ${
                                position === 1
                                  ? 'text-amber-500'
                                  : position === 2
                                    ? 'text-slate-400'
                                    : 'text-orange-500'
                              }`}
                              aria-hidden
                            />
                          ) : (
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-100 text-[8px] text-slate-500">
                              {position}
                            </span>
                          )}
                          Posición {position}
                        </span>
                      </span>
                      <span className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={points[position] ?? '0'}
                          onChange={(event) =>
                            setPoints((current) => ({
                              ...current,
                              [position]: event.target.value,
                            }))
                          }
                          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold tabular-nums text-slate-900 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
                          aria-label={`Puntos para la posición ${position}`}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          pts
                        </span>
                      </span>
                    </label>
                  ),
                )}
              </div>

              {maxPosition < MIN_POSITIONS && (
                <EmptyState
                  compact
                  icon={Calculator}
                  title="Configura al menos 20 posiciones"
                  description="Las posiciones sin puntos pueden quedar en cero."
                />
              )}
            </CardBody>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Resumen de la tabla" />
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Posiciones configuradas</span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {Object.keys(points).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Puntos repartidos por carrera</span>
                <span className="font-semibold tabular-nums text-slate-900">{total}</span>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
                Solo una persona por posición recibe puntos. El ranking no se guarda: se calcula
                desde los resultados cada vez que se consulta.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Cómo funciona" />
            <CardBody className="space-y-2 text-xs leading-relaxed text-slate-600">
              <p>
                1. Al registrar un resultado finalizado, el servidor copia los puntos de esta
                tabla.
              </p>
              <p>
                2. Si cambias la tabla, todos los resultados se recalculan automáticamente.
              </p>
              <p>
                3. Los resultados anulados dejan de sumar, pero se conservan para auditoría.
              </p>
              <p>
                4. Las posiciones compartidas se reflejan con el mismo puesto en el ranking
                (dense rank).
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
