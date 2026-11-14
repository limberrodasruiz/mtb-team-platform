import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, Search, Users } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getPublicCyclists } from '../../services/cyclists';
import { getPublicCategories } from '../../services/categories';
import type { Category, PublicCyclist } from '../../types';
import { buttonStyles } from '../../components/ui/Button';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { PublicPageHero } from '../../components/public/PublicPageHero';
import { CyclistCard } from '../../components/public/CyclistCard';
import { Section } from '../../components/public/SectionHeading';
import { cn } from '../../utils/cn';

interface PageData {
  cyclists: PublicCyclist[];
  categories: Category[];
}

export function CyclistsPage() {
  useDocumentTitle('Corredores');
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const categoryParam = params.get('categoria') ?? '';

  const { data, loading, error, reload } = useAsync<PageData>(async () => {
    const [cyclists, categories] = await Promise.all([
      getPublicCyclists(),
      getPublicCategories(),
    ]);
    return { cyclists, categories };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.cyclists ?? []).filter((cyclist) => {
      if (categoryParam) {
        const category = data?.categories.find((item) => item.slug === categoryParam);
        if (category && cyclist.category_id !== category.id) return false;
        if (!category && cyclist.category_slug !== categoryParam) return false;
      }
      if (!term) return true;
      return [cyclist.full_name, cyclist.nickname, cyclist.specialty, cyclist.category_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [data, search, categoryParam]);

  const activeCategory = data?.categories.find((item) => item.slug === categoryParam);

  function setCategory(slug: string) {
    if (!slug) {
      params.delete('categoria');
    } else {
      params.set('categoria', slug);
    }
    setParams(params, { replace: true });
  }

  return (
    <>
      <PublicPageHero
        eyebrow="La escuadra"
        title="Corredores"
        description="Quiénes pedalean por el equipo. Perfiles, categorías y especialidades de nuestra plantilla."
        crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Corredores' }]}
        compact
      />

      <Section className="pt-10 sm:pt-12">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o especialidad…"
              aria-label="Buscar corredores"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <Filter className="h-3.5 w-3.5" aria-hidden />
              Categoría
            </span>
            <button
              type="button"
              onClick={() => setCategory('')}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                !categoryParam
                  ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-contrast)]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              )}
            >
              Todas
            </button>
            {(data?.categories ?? []).map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategory(category.slug)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  categoryParam === category.slug
                    ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-contrast)]'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="aspect-[4/5] animate-pulse bg-slate-100" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="No se pudo cargar la plantilla"
            message={error}
            onRetry={reload}
          />
        ) : filtered.length > 0 ? (
          <>
            <p className="mb-4 text-xs text-slate-500">
              {activeCategory ? `Categoría: ${activeCategory.name} · ` : ''}
              {filtered.length} {filtered.length === 1 ? 'corredor' : 'corredores'}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((cyclist) => (
                <CyclistCard key={cyclist.id} cyclist={cyclist} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={Users}
            title={search || categoryParam ? 'Sin resultados' : 'Plantilla en actualización'}
            description={
              search || categoryParam
                ? 'No encontramos corredores con esos filtros. Prueba con otra búsqueda o categoría.'
                : 'Los perfiles de los corredores se publicarán aquí. Consulta las categorías del equipo mientras tanto.'
            }
            action={
              search || categoryParam ? (
                <button
                  type="button"
                  className={buttonStyles('outline', 'md')}
                  onClick={() => {
                    setSearch('');
                    setCategory('');
                  }}
                >
                  Limpiar filtros
                </button>
              ) : (
                <Link to="/equipo" className={buttonStyles('primary', 'md')}>
                  Conocer el equipo
                </Link>
              )
            }
          />
        )}
      </Section>
    </>
  );
}
