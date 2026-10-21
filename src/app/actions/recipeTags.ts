'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface UpdateRecipeTagsResult {
  success: boolean;
  etiquetas?: string[];
  error?: string;
}

export async function updateRecipeTagsAction({
  recetaId,
  etiquetas,
}: {
  recetaId: string;
  etiquetas: string[];
}): Promise<UpdateRecipeTagsResult> {
  try {
    if (!recetaId) {
      return { success: false, error: 'Identificador de receta requerido.' };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Debes iniciar sesión para editar etiquetas.' };
    }
    // Normalizar y deduplicar etiquetas no vacías
    const cleanTags = Array.from(
      new Set(
        (etiquetas || [])
          .map((t) => t.trim())
          .filter((t) => t.length > 0 && t.length <= 40)
      )
    );

    const { error: updateError } = await supabase
      .from('recetas')
      .update({ etiquetas: cleanTags })
      .eq('id', recetaId)
      .eq('usuario_id', user.id);

    if (updateError) {
      console.error('Error actualizando etiquetas:', updateError);
      return { success: false, error: 'No se pudieron actualizar las etiquetas en la base de datos.' };
    }

    revalidatePath('/recipes');
    revalidatePath(`/recipes/${recetaId}`);

    return { success: true, etiquetas: cleanTags };
  } catch (err) {
    console.error('Error inesperado en updateRecipeTagsAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado.',
    };
  }
}
