import { useRef, useState } from 'react';
import { ExternalLink, FileText, Loader2, Paperclip, Trash2 } from 'lucide-react';
import { getReceiptSignedUrl, uploadReceipt } from '../../services/storage';
import { errorMessage } from '../../lib/errors';
import { Button } from './Button';

interface ReceiptUploadProps {
  valuePath: string | null;
  onChange: (path: string | null) => void;
  prefix: string;
  disabled?: boolean;
}

export function ReceiptUpload({
  valuePath,
  onChange,
  prefix,
  disabled = false,
}: ReceiptUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file || disabled) return;
    setError(null);
    setUploading(true);
    try {
      const path = await uploadReceipt(file, prefix);
      onChange(path);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo subir el comprobante.'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function openReceipt() {
    if (!valuePath) return;
    setError(null);
    setOpening(true);
    try {
      const url = await getReceiptSignedUrl(valuePath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(errorMessage(err, 'No se pudo abrir el comprobante.'));
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">Comprobante</p>
      {valuePath ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
            <FileText className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <span className="truncate">Comprobante adjunto</span>
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void openReceipt()}
              loading={opening}
              startIcon={<ExternalLink className="h-3.5 w-3.5" />}
            >
              Ver
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Quitar comprobante"
              onClick={() => onChange(null)}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4 text-rose-600" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-left transition hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] disabled:opacity-60"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </span>
          <span>
            <span className="block text-sm font-medium text-slate-700">
              {uploading ? 'Subiendo comprobante…' : 'Adjuntar imagen o PDF'}
            </span>
            <span className="block text-xs text-slate-500">
              JPG, PNG, WEBP o PDF. Máximo 10 MB. Se guarda en un bucket privado.
            </span>
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        onChange={(event) => void handleFile(event.target.files?.[0])}
        disabled={disabled || uploading}
        tabIndex={-1}
      />
      {error && (
        <p className="text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
