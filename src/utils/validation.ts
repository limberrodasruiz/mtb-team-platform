const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/**
 * Returns an absolute http(s) URL or null. Used for links that come from the
 * database so javascript:, data: and other unsafe schemes are never rendered.
 */
export function safeExternalUrl(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function isValidImageType(type: string): boolean {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

export function isValidImageSize(bytes: number): boolean {
  return bytes > 0 && bytes <= MAX_IMAGE_BYTES;
}

export async function assertRealImage(file: File): Promise<void> {
  if (!isValidImageType(file.type)) {
    throw new Error('Formato no válido. Usa JPG, PNG o WEBP.');
  }
  if (!isValidImageSize(file.size)) {
    throw new Error('La imagen supera el límite de 8 MB.');
  }

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isPng =
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47;
  const isWebp =
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50;

  if (!isJpeg && !isPng && !isWebp) {
    throw new Error('El archivo no es una imagen JPG, PNG o WEBP válida.');
  }
}

export function required(value: string | null | undefined, label: string): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) throw new Error(`${label} es obligatorio.`);
  return trimmed;
}

export function positiveNumber(value: unknown, label: string): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${label} debe ser mayor a cero.`);
  }
  return n;
}

export function nonNegativeNumber(value: unknown, label: string): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${label} no puede ser negativo.`);
  }
  return n;
}

export function optionalEmail(value: string | null | undefined): string | null {
  const email = (value ?? '').trim();
  if (!email) return null;
  if (!isValidEmail(email)) throw new Error('El correo no tiene un formato válido.');
  return email;
}

export function assertSlug(value: string, label = 'El enlace'): string {
  const slug = value.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`${label} solo puede contener minúsculas, números y guiones.`);
  }
  return slug;
}

export function assertDateString(value: string, label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} no es una fecha válida.`);
  }
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} no es una fecha válida.`);
  return value;
}
