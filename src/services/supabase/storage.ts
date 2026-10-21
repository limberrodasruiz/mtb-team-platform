import { supabase } from '../../lib/supabaseClient';

function toFriendly(error: unknown, fallback: string): Error {
  if (error instanceof Error) return new Error(`${fallback}: ${error.message}`);
  return new Error(fallback);
}

export async function uploadImage(
  bucket: string,
  file: File,
  path: string,
): Promise<string> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  } catch (e) {
    throw toFriendly(e, 'No se pudo subir la imagen');
  }
}

export async function deleteImage(bucket: string, path: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  } catch (e) {
    throw toFriendly(e, 'No se pudo eliminar la imagen');
  }
}

export function getPublicImageUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
