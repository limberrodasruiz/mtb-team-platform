import { errorMessage } from '../lib/errors';
import { requireConfiguration, supabase } from '../lib/supabase';
import { STORAGE_BUCKETS, type StorageBucket } from '../constants';
import { optimizeImage } from '../utils/image';
import { slugify } from '../utils/slug';

export interface UploadedImage {
  path: string;
  url: string;
  width: number;
  height: number;
}

export function getPublicUrl(bucket: string, path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function resolveMediaUrl(
  path: string | null,
  url: string | null,
  bucket: string,
): string | null {
  return url || getPublicUrl(bucket, path);
}

export async function uploadPublicImage(
  bucket: StorageBucket,
  file: File,
  prefix: string,
): Promise<UploadedImage> {
  requireConfiguration();
  const optimized = await optimizeImage(file, bucket);
  const folder = slugify(prefix) || 'general';
  const year = new Date().getFullYear();
  const extension = optimized.file.name.split('.').pop() ?? 'webp';
  const path = `${folder}/${year}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, optimized.file, {
      contentType: optimized.file.type,
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) throw new Error(errorMessage(error, 'No se pudo subir la imagen.'));

  return {
    path,
    url: getPublicUrl(bucket, path) ?? '',
    width: optimized.width,
    height: optimized.height,
  };
}

export async function deletePublicImage(
  bucket: StorageBucket,
  path: string | null | undefined,
): Promise<void> {
  if (!path || /^https?:\/\//i.test(path)) return;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(errorMessage(error, 'No se pudo eliminar el archivo.'));
}

async function assertPdf(file: File): Promise<void> {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('El comprobante no puede superar los 10 MB.');
  }
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const signature = String.fromCharCode(...head);
  if (signature !== '%PDF-') {
    throw new Error('El archivo no es un PDF válido.');
  }
}

export async function uploadReceipt(file: File, prefix: string): Promise<string> {
  requireConfiguration();
  const isPdf = file.type === 'application/pdf';
  let uploadFile = file;

  if (isPdf) {
    await assertPdf(file);
  } else {
    const optimized = await optimizeImage(file, STORAGE_BUCKETS.DOCUMENTS);
    uploadFile = optimized.file;
  }

  const extension = uploadFile.name.split('.').pop() ?? (isPdf ? 'pdf' : 'webp');
  const path = `${slugify(prefix) || 'gastos'}/${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.DOCUMENTS)
    .upload(path, uploadFile, {
      contentType: uploadFile.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw new Error(errorMessage(error, 'No se pudo subir el comprobante.'));
  return path;
}

export async function getReceiptSignedUrl(path: string): Promise<string> {
  requireConfiguration();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.DOCUMENTS)
    .createSignedUrl(path, 60 * 60);

  if (error) throw new Error(errorMessage(error, 'No se pudo abrir el comprobante.'));
  return data.signedUrl;
}
