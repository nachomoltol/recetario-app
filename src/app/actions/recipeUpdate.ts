'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { calcularGramos } from '@/lib/nutrition/converter';
import { IngredienteMaestro } from '@/types/recipe';

export interface IngredientUpdateInput {
  id?: string;
  nombre_limpio: string;
  cantidad: number;
  unidad?: string;
  orden?: number;
  notas?: string | null;
  pasillo_supermercado?: string;
}

export interface UpdateRecipeResult {
  success?: boolean;
  error?: string;
}

export async function updateRecipeAction({
  recetaId,
  titulo,
  ingredientes,
}: {
  recetaId: string;
  titulo: string;
  ingredientes: IngredientUpdateInput[];
}): Promise<UpdateRecipeResult> {
  try {
    // 1. Verificar autenticación
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Debes iniciar sesión para editar recetas.' };
    }

    // 2. Verificar pertenencia de la receta
    const { data: recetaExistente, error: errExistente } = await supabase
      .from('recetas')
      .select('id')
      .eq('id', recetaId)
      .eq('usuario_id', user.id)
      .single();

    if (errExistente || !recetaExistente) {
      return { error: 'No se encontró la receta o no tienes permisos para editarla.' };
    }

    const cleanTitulo = (titulo || '').trim();
    if (!cleanTitulo) {
      return { error: 'El título de la receta no puede estar vacío.' };
    }

    // 3. Actualizar tabla cabecera 'recetas'
    const { error: errUpdateReceta } = await supabase
      .from('recetas')
      .update({
        titulo: cleanTitulo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recetaId)
      .eq('usuario_id', user.id);

    if (errUpdateReceta) {
      console.error('Error actualizando cabecera de la receta:', errUpdateReceta);
      return { error: `Error al actualizar receta: ${errUpdateReceta.message}` };
    }

    // 4. Preparar lista de maestros para conversiones de gramos
    const { data: maestros } = await supabase.from('ingredientes_maestro').select('*');
    const listaMaestros = (maestros as IngredienteMaestro[]) || [];

    const encontrarMaestro = (nombreLimpio: string) => {
      const norm = (nombreLimpio || '').toLowerCase().trim();
      if (!norm) return undefined;
      return listaMaestros.find(
        (m) =>
          m.nombre.toLowerCase() === norm ||
          m.nombre_normalizado === norm ||
          norm.includes(m.nombre_normalizado) ||
          m.nombre_normalizado.includes(norm)
      );
    };

    // 5. Reemplazar ingredientes de forma atómica
    const { error: errDeleteIng } = await supabase
      .from('receta_ingredientes')
      .delete()
      .eq('receta_id', recetaId);

    if (errDeleteIng) {
      console.error('Error eliminando ingredientes anteriores:', errDeleteIng);
      return { error: `Error al actualizar ingredientes: ${errDeleteIng.message}` };
    }

    if (ingredientes && ingredientes.length > 0) {
      const payloadIngredientes = ingredientes.map((ing, idx) => {
        const nombreLimpio = (ing.nombre_limpio || '').trim() || `Ingrediente ${idx + 1}`;
        const matchedMaestro = encontrarMaestro(nombreLimpio);

        const rawCantidad =
          typeof ing.cantidad === 'number' && !isNaN(ing.cantidad) && ing.cantidad > 0
            ? ing.cantidad
            : parseFloat(String(ing.cantidad)) || 1;

        let rawUnidad = (ing.unidad || 'unidad').trim();
        if (rawUnidad === 'unidad' || rawUnidad === 'unidades') {
          rawUnidad = rawCantidad > 1 ? 'unidades' : 'unidad';
        }

        const conv = calcularGramos({
          cantidad: rawCantidad,
          unidad: rawUnidad,
          ingredienteMaestro: matchedMaestro,
        });

        // Clasificar pasillo por defecto si no viene establecido
        let pasilloFinal = ing.pasillo_supermercado || 'Despensa y Especias';
        const nLower = nombreLimpio.toLowerCase();
        if (
          /manzana|platano|plátano|limon|limón|naranja|fruta|pera|fresa|aguacate|tomate|cebolla|ajo|patata|verdura/i.test(
            nLower
          )
        ) {
          pasilloFinal = 'Frutas y Verduras';
        } else if (/^agua\b|agua mineral|agua del grifo|refresco|zumo|vino|cerveza/i.test(nLower)) {
          pasilloFinal = 'Bebidas';
        }

        return {
          receta_id: recetaId,
          nombre_crudo: nombreLimpio,
          nombre_limpio: nombreLimpio,
          cantidad: Math.max(0.01, rawCantidad),
          unidad: rawUnidad,
          gramos_calculados: Math.max(0, conv.gramos || 0),
          pasillo_supermercado: pasilloFinal,
          ingrediente_maestro_id: matchedMaestro?.id || null,
          notas: ing.notas || null,
          es_opcional: false,
          orden: idx + 1,
        };
      });

      const { error: errInsertIng } = await supabase
        .from('receta_ingredientes')
        .insert(payloadIngredientes);

      if (errInsertIng) {
        console.error('Error insertando nuevos ingredientes:', errInsertIng);
        return { error: `Error guardando nuevos ingredientes: ${errInsertIng.message}` };
      }
    }

    // 6. Revalidar cachés de rutas
    revalidatePath(`/recipes/${recetaId}`, 'page');
    revalidatePath('/recipes', 'page');
    revalidatePath('/recipes/collection', 'page');
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (err) {
    console.error('Error inesperado en updateRecipeAction:', err);
    return {
      error: err instanceof Error ? err.message : 'Error inesperado al actualizar la receta.',
    };
  }
}

export async function updateRecipePhotoAction({
  recetaId,
  fotoUrl,
}: {
  recetaId: string;
  fotoUrl: string;
}): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Debes iniciar sesión para actualizar la fotografía.' };
    }

    const { error: errUpdate } = await supabase
      .from('recetas')
      .update({
        foto_url: fotoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recetaId)
      .eq('usuario_id', user.id);

    if (errUpdate) {
      console.error('Error actualizando foto_url en recetas:', errUpdate);
      return { error: `Error al guardar foto: ${errUpdate.message}` };
    }

    revalidatePath(`/recipes/${recetaId}`, 'page');
    revalidatePath('/recipes', 'page');
    revalidatePath('/recipes/collection', 'page');

    return { success: true };
  } catch (err) {
    console.error('Error inesperado al actualizar foto de receta:', err);
    return {
      error: err instanceof Error ? err.message : 'Error inesperado al guardar la fotografía.',
    };
  }
}

