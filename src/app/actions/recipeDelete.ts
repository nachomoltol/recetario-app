'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { removeStorageUrlsSafely } from '@/lib/supabase/storageCleanup';

export interface DeleteRecipeResult {
  success?: boolean;
  error?: string;
}

/**
 * Elimina una receta de forma segura garantizando que pertenezca al usuario autenticado.
 * Limpia también los archivos multimedia asociados en Supabase Storage (diario culinario).
 * Gracias al ON DELETE CASCADE a nivel de base de datos, se purgan de forma atómica:
 * - receta_ingredientes
 * - pasos
 * - diario_cocinados
 */
export async function deleteRecipeAction(recipeId: string): Promise<DeleteRecipeResult> {
  try {
    if (!recipeId) {
      return { success: false, error: 'Identificador de receta no válido.' };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Debes iniciar sesión para eliminar recetas.' };
    }
    // 1. Localizar fotografías vinculadas a la receta en Storage para purgarlas
    // A) Portada de la receta en el bucket 'recetas_fotos'
    const { data: recetaData } = await supabase
      .from('recetas')
      .select('foto_url, imagen_portada_url')
      .eq('id', recipeId)
      .eq('usuario_id', user.id)
      .single();

    if (recetaData) {
      await removeStorageUrlsSafely(supabase, 'recetas_fotos', [
        recetaData.foto_url,
        recetaData.imagen_portada_url,
      ]);
    }

    // B) Fotografías del diario culinario vinculadas a la receta en el bucket 'cooking-diary'
    const { data: diarioEntries } = await supabase
      .from('diario_cocinados')
      .select('foto_resultado_url')
      .eq('receta_id', recipeId)
      .eq('usuario_id', user.id);

    if (diarioEntries && diarioEntries.length > 0) {
      await removeStorageUrlsSafely(
        supabase,
        'cooking-diary',
        diarioEntries.map((entry) => entry.foto_resultado_url)
      );
    }

    // 2. Eliminar la fila en 'recetas' (las FKs en cascada eliminan ingredientes, pasos y registros del diario)
    const { error: errDelete } = await supabase
      .from('recetas')
      .delete()
      .eq('id', recipeId)
      .eq('usuario_id', user.id);

    if (errDelete) {
      console.error('Error al eliminar la receta en base de datos:', errDelete);
      return { error: `No se pudo eliminar la receta: ${errDelete.message}` };
    }

    revalidatePath('/recipes');
    return { success: true };
  } catch (err) {
    console.error('Error inesperado en deleteRecipeAction:', err);
    return {
      error: err instanceof Error ? err.message : 'Error inesperado eliminando la receta.',
    };
  }
}
