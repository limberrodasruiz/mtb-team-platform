import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getPublishedNews, type Paged } from '../../services/content';
import type { NewsItem } from '../../types';
import { buttonStyles } from '../../components/ui/Button';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { NewsCard } from '../../components/public/NewsCard';
import { PublicPageHero } from '../../components/public/PublicPageHero';
import { Section } from '../../components/public/SectionHeading';
import { cn } from '../../utils/cn';

const PAGE_SIZE = 9;

export function NewsPage() {
  useDocumentTitle('Noticias');
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useAsync<Paged<NewsItem>>(
    () => getPublishedNews(PAGE_SIZE, page * PAGE_SIZE),
    [page],
  );

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const items = data?.items ?? [];

  return (
    <>
      <PublicPageHero
        eyebrow="Actualidad del equipo"
        title="Noticias"
        description="Competencias, entrenamientos, convocatorias y la vida del equipo contada desde adentro."
        crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Noticias' }]}
        compact
      />

      <Section className="pt-10 sm:pt-12">
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="aspect-[16/10] animate-pulse bg-slate-100" />
                <div className="space-y-3 p-5">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="No se pudieron cargar las noticias"
            message={error}
            onRetry={reload}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="Todavía no hay noticias publicadas"
            description="Estamos preparando las primeras publicaciones. Vuelve pronto para conocer las novedades del equipo."
            action={
              <Link to="/contacto" className={buttonStyles('primary', 'md')}>
                Contactar al equipo
              </Link>
            }
          />
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
                  Bitácora
                </p>
                <h2 className="mt-1 font-display text-3xl font-bold uppercase leading-none text-slate-950">
                  Lo último del equipo
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                {data?.total ?? 0} publicaciones
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                className="mt-10 flex flex-wrap items-center justify-center gap-2"
                aria-label="Paginación de noticias"
              >
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                  disabled={page === 0}
                  className={buttonStyles('outline', 'sm')}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Anterior
                </button>
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setPage(index)}
                    aria-current={index === page ? 'page' : undefined}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition',
                      index === page
                        ? 'bg-[var(--brand)] text-[var(--brand-contrast)]'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
                  disabled={page >= totalPages - 1}
                  className={buttonStyles('outline', 'sm')}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </nav>
            )}
          </>
        )}
      </Section>
    </>
  );
}
