const ALLOWED_IMAGE_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function isValidImageType(mime: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime);
}

export function isValidImageSize(sizeBytes: number, maxBytes = MAX_IMAGE_SIZE_BYTES): boolean {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return false;
  return sizeBytes <= maxBytes;
}
