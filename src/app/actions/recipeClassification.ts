'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { MomentoDia, RolPlato } from '@/types/database';
import { inferRecipeCategory } from '@/lib/recipeCategorizer';

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

export interface ReclassifyRecipesResult {
  success: boolean;
  updatedCount?: number;
  updates?: { id: string; momentos_dia: MomentoDia[]; rol_plato: RolPlato }[];
  error?: string;
}

/**
 * Re-evalúa con la nueva jerarquía culinaria las recetas del usuario cuyo rol_plato
 * estaba mal inferido (ej. carnes clasificadas como 'primero') o sin momentos_dia,
 * preservando intactos los momentos personalizados del usuario (como 'postre').
 */
export async function reclassifyUserRecipesAction(): Promise<ReclassifyRecipesResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autenticado' };
    }

    const { data: recipes, error: fetchError } = await supabase
      .from('recetas')
      .select(`
        id,
        titulo,
        descripcion,
        calorias_por_porcion,
        etiquetas,
        momentos_dia,
        rol_plato,
        receta_ingredientes (
          nombre_limpio,
          nombre_crudo,
          rol_culinario
        )
      `)
      .eq('usuario_id', user.id);

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    const updates: { id: string; momentos_dia: MomentoDia[]; rol_plato: RolPlato }[] = [];

    for (const r of recipes || []) {
      const suggestion = inferRecipeCategory({
        titulo: r.titulo || '',
        calorias_por_porcion: r.calorias_por_porcion,
        etiquetas: r.etiquetas,
        descripcion: r.descripcion,
        ingredientes: (r as any).receta_ingredientes || [],
      });

      const currentMomentos = Array.isArray(r.momentos_dia)
        ? (r.momentos_dia.filter((m: any) => VALID_MOMENTOS.includes(m)) as MomentoDia[])
        : [];

      const nextMomentos: MomentoDia[] =
        currentMomentos.length > 0 ? currentMomentos : suggestion.momentos_dia;

      let nextRol: RolPlato = (r.rol_plato as RolPlato) || suggestion.rol_plato;

      if (nextMomentos.length === 1 && nextMomentos[0] === 'postre') {
        nextRol = 'postre';
      } else if (nextMomentos.every((m) => m === 'desayuno' || m === 'snack')) {
        nextRol = 'desayuno_snack';
      } else {
        // Si es receta de almuerzo/cena y la nueva jerarquía detecta proteína principal ('segundo')
        // o plato completo ('completo') pero estaba etiquetada como 'primero' (o viceversa), corregir
        nextRol = suggestion.rol_plato;
        if (nextRol === 'postre' && !nextMomentos.includes('postre')) {
          nextRol = 'completo';
        }
      }

      const momentsChanged =
        JSON.stringify(currentMomentos) !== JSON.stringify(nextMomentos);
      const rolChanged = r.rol_plato !== nextRol;

      if (momentsChanged || rolChanged) {
        const { error: updErr } = await supabase
          .from('recetas')
          .update({
            momentos_dia: nextMomentos,
            rol_plato: nextRol,
            updated_at: new Date().toISOString(),
          })
          .eq('id', r.id)
          .eq('usuario_id', user.id);

        if (!updErr) {
          updates.push({
            id: r.id,
            momentos_dia: nextMomentos,
            rol_plato: nextRol,
          });
        }
      }
    }

    revalidatePath('/recipes');
    revalidatePath('/recipes/collection');
    revalidatePath('/collection');
    revalidatePath('/meal-planner');
    revalidatePath('/smart-menu');

    return {
      success: true,
      updatedCount: updates.length,
      updates,
    };
  } catch (err) {
    console.error('Error en reclassifyUserRecipesAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al reclasificar recetas.',
    };
  }
}
