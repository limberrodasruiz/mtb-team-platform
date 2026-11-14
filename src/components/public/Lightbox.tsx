import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { GalleryItem } from '../../types';
import { resolveMediaUrl } from '../../services/storage';

export interface LightboxItem {
  src: string;
  title?: string | null;
  description?: string | null;
  alt?: string | null;
}

export function galleryToLightbox(items: GalleryItem[]): LightboxItem[] {
  return items
    .map((item) => {
      const src = resolveMediaUrl(item.url ? null : item.storage_path, item.url, item.storage_bucket);
      return {
        src: src ?? '',
        title: item.title,
        description: item.description,
        alt: item.alt_text,
      };
    })
    .filter((item) => Boolean(item.src));
}

export function Lightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: LightboxItem[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const open = index !== null && items.length > 0;

  const go = useCallback(
    (direction: 1 | -1) => {
      if (index === null) return;
      onIndexChange((index + direction + items.length) % items.length);
    },
    [index, items.length, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, go, onClose]);

  if (!open || index === null) return null;
  const item = items[index];

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-slate-950/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={item.title || 'Visor de imágenes'}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-6">
        <p className="min-w-0 truncate text-sm font-medium">
          {item.title || 'Galería'}
          <span className="ml-2 text-xs text-white/40">
            {index + 1} / {items.length}
          </span>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Cerrar visor"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 sm:px-16">
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-6"
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <img
          src={item.src}
          alt={item.alt || item.title || 'Fotografía de la galería'}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        />
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6"
            aria-label="Imagen siguiente"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {(item.description || item.title) && (
        <div className="mx-auto w-full max-w-3xl px-4 pb-5 text-center sm:px-6">
          {item.title && <p className="text-sm font-semibold text-white">{item.title}</p>}
          {item.description && (
            <p className="mt-1 text-xs leading-relaxed text-white/60">{item.description}</p>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}
