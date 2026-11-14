import { useRef, useState, type DragEvent } from 'react';
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import type { StorageBucket } from '../../constants';
import { uploadPublicImage, getPublicUrl } from '../../services/storage';
import { errorMessage } from '../../lib/errors';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface ImageValue {
  path: string;
  url: string;
  width: number;
  height: number;
}

interface ImageUploadProps {
  bucket: StorageBucket;
  prefix: string;
  valuePath: string | null;
  valueUrl: string | null;
  onChange: (value: ImageValue | null) => void;
  label?: string;
  hint?: string;
  aspect?: 'square' | 'video' | 'wide' | 'portrait';
  className?: string;
  disabled?: boolean;
}

const ASPECT: Record<NonNullable<ImageUploadProps['aspect']>, string> = {
  square: 'aspect-square',
  video: 'aspect-video',
  wide: 'aspect-[16/7]',
  portrait: 'aspect-[3/4]',
};

export function ImageUpload({
  bucket,
  prefix,
  valuePath,
  valueUrl,
  onChange,
  label = 'Imagen',
  hint = 'JPG, PNG o WEBP. Se optimiza automáticamente antes de subir.',
  aspect = 'video',
  className,
  disabled = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const preview = valueUrl || (valuePath ? getPublicUrl(bucket, valuePath) : null);

  async function handleFile(file: File | undefined) {
    if (!file || disabled) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadPublicImage(bucket, file, prefix);
      onChange(uploaded);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo subir la imagen.'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'group relative overflow-hidden rounded-xl border-2 border-dashed bg-slate-50 transition',
          ASPECT[aspect],
          dragging ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-slate-200',
          disabled && 'opacity-60',
        )}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Vista previa"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-end justify-end gap-2 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent p-3 opacity-100 transition">
              <Button
                type="button"
                size="sm"
                variant="outline"
                startIcon={<Upload className="h-3.5 w-3.5" />}
                onClick={() => inputRef.current?.click()}
                disabled={disabled || uploading}
              >
                Cambiar
              </Button>
              <Button
                type="button"
                size="icon"
                variant="danger"
                aria-label="Quitar imagen"
                onClick={() => onChange(null)}
                disabled={disabled || uploading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
          >
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
                <span className="text-xs font-medium text-slate-500">Optimizando y subiendo…</span>
              </>
            ) : (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                  <ImagePlus className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-slate-700">
                  Arrastra una imagen o haz clic para elegir
                </span>
                <span className="text-xs text-slate-500">{hint}</span>
              </>
            )}
          </button>
        )}
        {uploading && preview && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
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
