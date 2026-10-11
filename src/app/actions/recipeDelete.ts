'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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
  if (!recipeId) {
    return { error: 'Identificador de receta no válido.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Debes iniciar sesión para eliminar recetas.' };
  }

  try {
    // 1. Localizar fotografías del diario culinario vinculadas a la receta para borrarlas del bucket
    const { data: diarioEntries } = await supabase
      .from('diario_cocinados')
      .select('foto_resultado_url')
      .eq('receta_id', recipeId)
      .eq('usuario_id', user.id);

    if (diarioEntries && diarioEntries.length > 0) {
      const storagePathsToDelete: string[] = [];
      for (const entry of diarioEntries) {
        if (entry.foto_resultado_url && entry.foto_resultado_url.includes('/cooking-diary/')) {
          const parts = entry.foto_resultado_url.split('/cooking-diary/');
          if (parts[1]) {
            // Decodificar posibles caracteres URI codificados
            storagePathsToDelete.push(decodeURIComponent(parts[1]));
          }
        }
      }

      if (storagePathsToDelete.length > 0) {
        const { error: errStorage } = await supabase.storage
          .from('cooking-diary')
          .remove(storagePathsToDelete);

        if (errStorage) {
          console.warn('Aviso: no se pudieron eliminar algunos archivos del bucket cooking-diary:', errStorage);
        }
      }
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
