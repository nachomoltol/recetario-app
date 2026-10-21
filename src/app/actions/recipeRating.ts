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
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autenticado' };
    }

    const { error } = await supabase
      .from('recetas')
      .update({ es_favorita: esFavorita })
      .eq('id', recetaId)
      .eq('usuario_id', user.id);

    if (error) {
      console.error('[recipeRating] Error toggling favorite:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/recipes/${recetaId}`, 'page');
    revalidatePath('/recipes', 'page');
    revalidatePath('/recipes/collection', 'page');

    return { success: true };
  } catch (err: any) {
    console.error('[recipeRating] Error no controlado en toggleFavoriteAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al marcar favorito.',
    };
  }
}

export async function updateRatingAction(
  recetaId: string,
  puntuacion: number
): Promise<RatingActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autenticado' };
    }

    const cleanScore = Math.max(0, Math.min(5, Math.round(puntuacion)));

    const { error } = await supabase
      .from('recetas')
      .update({ puntuacion: cleanScore })
      .eq('id', recetaId)
      .eq('usuario_id', user.id);

    if (error) {
      console.error('[recipeRating] Error updating rating:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/recipes/${recetaId}`, 'page');
    revalidatePath('/recipes', 'page');
    revalidatePath('/recipes/collection', 'page');

    return { success: true };
  } catch (err: any) {
    console.error('[recipeRating] Error no controlado en updateRatingAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al calificar la receta.',
    };
  }
}
