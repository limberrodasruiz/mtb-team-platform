import { errorMessage } from '../lib/errors';
import { requireConfiguration, supabase } from '../lib/supabase';
import type { Category } from '../types';
import { assertSlug, required } from '../utils/validation';
import { mapCategory } from './mappers';

export interface CategoryInput {
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  active: boolean;
}

function validate(payload: CategoryInput): CategoryInput {
  return {
    name: required(payload.name, 'El nombre'),
    slug: assertSlug(required(payload.slug, 'El enlace')),
    description: payload.description?.trim() || null,
    sort_order: Number.isFinite(payload.sort_order) ? payload.sort_order : 0,
    active: Boolean(payload.active),
  };
}

export async function getPublicCategories(): Promise<Category[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar las categorías.'));
  return (data ?? []).map((row) => mapCategory(row as Record<string, unknown>));
}

export async function getAdminCategories(): Promise<Category[]> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(errorMessage(error, 'No se pudieron cargar las categorías.'));
  return (data ?? []).map((row) => mapCategory(row as Record<string, unknown>));
}

export async function createCategory(payload: CategoryInput): Promise<Category> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('categories')
    .insert(validate(payload))
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo crear la categoría.'));
  return mapCategory(data as Record<string, unknown>);
}

export async function updateCategory(
  id: string,
  payload: CategoryInput,
): Promise<Category> {
  requireConfiguration();
  const { data, error } = await supabase
    .from('categories')
    .update(validate(payload))
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(errorMessage(error, 'No se pudo actualizar la categoría.'));
  return mapCategory(data as Record<string, unknown>);
}

export async function setCategoryActive(id: string, active: boolean): Promise<void> {
  requireConfiguration();
  const { error } = await supabase.from('categories').update({ active }).eq('id', id);
  if (error) throw new Error(errorMessage(error, 'No se pudo cambiar el estado de la categoría.'));
}
