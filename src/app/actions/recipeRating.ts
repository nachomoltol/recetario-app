'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface RatingActionResult {
  success?: boolean;
  error?: string;
}

export async function toggleFavoriteAction(
  recetaId: string,
  esFavorita: boolean
): Promise<RatingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'No autenticado' };
  }

  const { error } = await supabase
    .from('recetas')
    .update({ es_favorita: esFavorita })
    .eq('id', recetaId)
    .eq('usuario_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/recipes/${recetaId}`, 'page');
  revalidatePath('/recipes', 'page');
  revalidatePath('/recipes/collection', 'page');

  return { success: true };
}

export async function updateRatingAction(
  recetaId: string,
  puntuacion: number
): Promise<RatingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'No autenticado' };
  }

  const cleanScore = Math.max(0, Math.min(5, Math.round(puntuacion)));

  const { error } = await supabase
    .from('recetas')
    .update({ puntuacion: cleanScore })
    .eq('id', recetaId)
    .eq('usuario_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/recipes/${recetaId}`, 'page');
  revalidatePath('/recipes', 'page');
  revalidatePath('/recipes/collection', 'page');

  return { success: true };
}
