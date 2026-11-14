import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, Images } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getPublicGallery, type Paged } from '../../services/content';
import type { GalleryItem } from '../../types';
import { resolveMediaUrl } from '../../services/storage';
import { buttonStyles } from '../../components/ui/Button';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { PublicPageHero } from '../../components/public/PublicPageHero';
import { Section } from '../../components/public/SectionHeading';
import { Lightbox, galleryToLightbox } from '../../components/public/Lightbox';

export function GalleryPage() {
  useDocumentTitle('Galería');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const { data, loading, error, reload } = useAsync<Paged<GalleryItem>>(
    () => getPublicGallery(60),
    [],
  );

  const items = data?.items ?? [];
  const photos = items.filter((item) =>
    resolveMediaUrl(item.storage_path, item.url, item.storage_bucket),
  );
  const lightboxItems = galleryToLightbox(photos);

  return (
    <>
      <PublicPageHero
        eyebrow="Imágenes del equipo"
        title="Galería"
        description="Momentos de carrera, entrenamientos y todo lo que se vive sobre la bicicleta."
        crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Galería' }]}
        compact
      />

      <Section className="pt-10 sm:pt-12">
        {loading ? (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <div
                key={item}
                className={`mb-4 animate-pulse rounded-2xl bg-slate-100 ${
                  item % 3 === 0 ? 'h-80' : item % 3 === 1 ? 'h-60' : 'h-72'
                }`}
              />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="No se pudo cargar la galería"
            message={error}
            onRetry={reload}
          />
        ) : photos.length === 0 ? (
          <EmptyState
            icon={Images}
            title="La galería está en preparación"
            description="Muy pronto compartiremos las mejores fotos del equipo en competencia y entrenamiento."
            action={
              <Link to="/noticias" className={buttonStyles('outline', 'md')}>
                Leer noticias
              </Link>
            }
          />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
                  Álbum del equipo
                </p>
                <h2 className="mt-1 font-display text-3xl font-bold uppercase leading-none text-slate-950">
                  Momentos
                </h2>
              </div>
              <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                {photos.length} fotografías
              </p>
            </div>

            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
              {lightboxItems.map((item, index) => {
                const source = photos[index];
                const ratio =
                  source?.width && source?.height
                    ? `${source.width} / ${source.height}`
                    : '4 / 3';
                return (
                  <button
                    key={`${item.src}-${index}`}
                    type="button"
                    onClick={() => setLightbox(index)}
                    className="group relative block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-left shadow-sm transition hover:border-[var(--brand-mid)] hover:shadow-lg"
                    aria-label={`Ampliar ${item.title || 'fotografía'}`}
                  >
                    <img
                      src={item.src}
                      alt={item.alt || item.title || 'Fotografía del equipo'}
                      loading="lazy"
                      style={{ aspectRatio: ratio }}
                      className="w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                    {(item.title || item.description) && (
                      <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                        {item.title && (
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                        )}
                        {item.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-white/70">
                            {item.description}
                          </p>
                        )}
                      </div>
                    )}
                    <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 opacity-0 shadow-sm transition group-hover:opacity-100">
                      <ImageIcon className="h-4 w-4" aria-hidden />
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Section>

      <Lightbox
        items={lightboxItems}
        index={lightbox}
        onIndexChange={setLightbox}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}
