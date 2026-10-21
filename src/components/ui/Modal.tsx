import { useEffect } from 'react';
import type { ReactNode } from 'react';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
}

const SIZE_STYLES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Diálogo'}
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 cursor-default bg-slate-900/50"
        onClick={() => {
          if (closeOnBackdrop) onClose();
        }}
      />
      <div
        className={`relative flex max-h-[90vh] w-full ${SIZE_STYLES[size]} flex-col rounded-xl bg-white shadow-xl`}
      >
        {title !== undefined ? (
          <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar diálogo"
              className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100"
            >
              ×
            </button>
          </header>
        ) : null}
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer !== undefined ? (
          <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
