'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { MomentoDia, RolPlato } from '@/types/database';

export interface UpdateRecipeClassificationInput {
  recetaId: string;
  momentos_dia: MomentoDia[];
  rol_plato: RolPlato;
  es_favorito_menu: boolean;
}

export interface UpdateRecipeClassificationResult {
  success: boolean;
  momentos_dia?: MomentoDia[];
  rol_plato?: RolPlato;
  es_favorito_menu?: boolean;
  error?: string;
}

const VALID_MOMENTOS: MomentoDia[] = ['desayuno', 'almuerzo', 'cena', 'snack', 'postre'];
const VALID_ROLES: RolPlato[] = ['completo', 'primero', 'segundo', 'desayuno_snack', 'postre'];

export async function updateRecipeClassificationAction({
  recetaId,
  momentos_dia,
  rol_plato,
  es_favorito_menu,
}: UpdateRecipeClassificationInput): Promise<UpdateRecipeClassificationResult> {
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
      return { success: false, error: 'Debes iniciar sesión para editar la clasificación culinaria.' };
    }

    // Filtrar momentos válidos y deduplicar
    const sanitizedMomentos = Array.from(
      new Set((momentos_dia || []).filter((m): m is MomentoDia => VALID_MOMENTOS.includes(m)))
    );

    // Validar rol de plato
    const sanitizedRol: RolPlato = VALID_ROLES.includes(rol_plato) ? rol_plato : 'completo';

    const { error: updateError } = await supabase
      .from('recetas')
      .update({
        momentos_dia: sanitizedMomentos,
        rol_plato: sanitizedRol,
        es_favorito_menu: Boolean(es_favorito_menu),
        updated_at: new Date().toISOString(),
      })
      .eq('id', recetaId)
      .eq('usuario_id', user.id);

    if (updateError) {
      console.error('Error actualizando clasificación de la receta:', updateError);
      return { success: false, error: `No se pudo guardar la clasificación: ${updateError.message}` };
    }

    revalidatePath('/recipes');
    revalidatePath('/recipes/collection');
    revalidatePath('/collection');
    revalidatePath(`/recipes/${recetaId}`);
    revalidatePath('/meal-planner');

    return {
      success: true,
      momentos_dia: sanitizedMomentos,
      rol_plato: sanitizedRol,
      es_favorito_menu: Boolean(es_favorito_menu),
    };
  } catch (err) {
    console.error('Error inesperado en updateRecipeClassificationAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al guardar la clasificación.',
    };
  }
}
