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
  rol_culinario?: string | null;
  seccion?: string | null;
  es_opcional?: boolean;
}

export interface StepUpdateInput {
  id?: string;
  orden: number;
  instruccion: string;
  instruccion_principiante?: string | null;
  instruccion_avanzada?: string | null;
  tiempo_estimado_min?: number | null;
  consejo_pro?: string | null;
  descriptor_sensorial?: string | null;
  temperatura_celsius?: number | null;
  potencia_fuego?: string | null;
}

export interface UpdateRecipeResult {
  success?: boolean;
  error?: string;
}

export async function updateRecipeAction({
  recetaId,
  titulo,
  ingredientes,
  pasos,
}: {
  recetaId: string;
  titulo: string;
  ingredientes?: IngredientUpdateInput[];
  pasos?: StepUpdateInput[];
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

      // 1. Prioridad absoluta: coincidencia exacta
      const exactMatch = listaMaestros.find(
        (m) => m.nombre.toLowerCase() === norm || m.nombre_normalizado === norm
      );
      if (exactMatch) return exactMatch;

      // 2. Coincidencia parcial segura solo con límites de palabra y longitud >= 4
      // (evita falsos positivos como "sal" en "salmón" o "salsa")
      if (norm.length < 4) return undefined;
      const escapedNorm = norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const normWordRegex = new RegExp(`(^|\\s)${escapedNorm}($|\\s)`, 'i');

      return listaMaestros.find((m) => {
        const mn = (m.nombre_normalizado || '').trim();
        if (mn.length < 4) return false;
        const escapedMn = mn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const mnWordRegex = new RegExp(`(^|\\s)${escapedMn}($|\\s)`, 'i');
        return mnWordRegex.test(norm) || normWordRegex.test(mn);
      });
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
        if (/\b(chocolate|cacao|cocoa)\b/i.test(nLower)) {
          pasilloFinal = 'Despensa y Especias';
        } else if (
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
          es_opcional: Boolean(ing.es_opcional),
          orden: idx + 1,
          rol_culinario: ing.rol_culinario || null,
          seccion: ing.seccion || null,
        };
      });

      let { error: errInsertIng } = await supabase
        .from('receta_ingredientes')
        .insert(payloadIngredientes);

      if (errInsertIng && /seccion/i.test(errInsertIng.message || '')) {
        const fallbackPayload = payloadIngredientes.map(({ seccion, ...rest }) => rest);
        const retryRes = await supabase
          .from('receta_ingredientes')
          .insert(fallbackPayload as any);
        errInsertIng = retryRes.error;
      }

      if (errInsertIng) {
        console.error('Error insertando nuevos ingredientes:', errInsertIng);
        return { error: `Error guardando nuevos ingredientes: ${errInsertIng.message}` };
      }
    }

    // 6. Reconciliación atómica de pasos (si se proporcionan)
    if (pasos !== undefined) {
      const { data: dbPasos, error: errFetchPasos } = await supabase
        .from('pasos')
        .select('id, instruccion')
        .eq('receta_id', recetaId);

      if (errFetchPasos) {
        console.error('Error consultando pasos existentes:', errFetchPasos);
        return { error: `Error al leer pasos: ${errFetchPasos.message}` };
      }

      const existingIds = (dbPasos || []).map((p) => p.id);
      const existingInstructionById = new Map<string, string>(
        (dbPasos || []).map((p) => [p.id, (p.instruccion || '').trim()])
      );
      const incomingIds = pasos
        .map((p) => p.id)
        .filter((id): id is string => Boolean(id && !id.startsWith('new-') && !id.startsWith('temp-')));

      // A) Eliminar pasos descartados
      const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));
      if (idsToDelete.length > 0) {
        const { error: errDelPasos } = await supabase
          .from('pasos')
          .delete()
          .in('id', idsToDelete);

        if (errDelPasos) {
          console.error('Error eliminando pasos descartados:', errDelPasos);
          return { error: `Error eliminando pasos: ${errDelPasos.message}` };
        }
      }

      // B) Reconciliar pasos: actualizar existentes e insertar nuevos
      const validPasos = pasos.filter((p) => (p.instruccion || '').trim().length > 0);
      for (let idx = 0; idx < validPasos.length; idx++) {
        const p = validPasos[idx];
        const ordenFinal = idx + 1;
        const cleanInstruccion = p.instruccion.trim();
        const isExisting = Boolean(p.id && existingIds.includes(p.id));

        if (isExisting && p.id) {
          const prevInstruccion = existingInstructionById.get(p.id) || '';
          const instructionChanged = cleanInstruccion !== prevInstruccion;

          const updateStepPayload: {
            orden: number;
            instruccion: string;
            instruccion_principiante?: string | null;
            instruccion_avanzada?: string | null;
            tiempo_estimado_min: number | null;
            consejo_pro: string | null;
            descriptor_sensorial: string | null;
            temperatura_celsius: number | null;
            potencia_fuego: string | null;
          } = {
            orden: ordenFinal,
            instruccion: cleanInstruccion,
            tiempo_estimado_min:
              typeof p.tiempo_estimado_min === 'number' && !isNaN(p.tiempo_estimado_min)
                ? p.tiempo_estimado_min
                : null,
            consejo_pro: p.consejo_pro?.trim() || null,
            descriptor_sensorial: p.descriptor_sensorial?.trim() || null,
            temperatura_celsius:
              typeof p.temperatura_celsius === 'number' && !isNaN(p.temperatura_celsius)
                ? p.temperatura_celsius
                : null,
            potencia_fuego: p.potencia_fuego || null,
          };

          if (p.instruccion_principiante !== undefined) {
            updateStepPayload.instruccion_principiante = p.instruccion_principiante
              ? p.instruccion_principiante.trim()
              : null;
          } else if (instructionChanged) {
            updateStepPayload.instruccion_principiante = null;
          }

          if (p.instruccion_avanzada !== undefined) {
            updateStepPayload.instruccion_avanzada = p.instruccion_avanzada
              ? p.instruccion_avanzada.trim()
              : null;
          } else if (instructionChanged) {
            updateStepPayload.instruccion_avanzada = null;
          }

          let { error: errUpdatePaso } = await supabase
            .from('pasos')
            .update(updateStepPayload)
            .eq('id', p.id);

          // Fallback defensivo: Si el schema cache de PostgREST no contiene las columnas de nivel culinario
          if (
            errUpdatePaso &&
            /instruccion_principiante|instruccion_avanzada|descriptor_sensorial|potencia_fuego|temperatura_celsius|column|schema cache|PGRST204/i.test(
              errUpdatePaso.message || ''
            )
          ) {
            console.warn(
              `[recipeUpdate] Reintentando update de paso ${p.id} sin columnas de nivel culinario:`,
              errUpdatePaso.message
            );
            const fallbackStepPayload = {
              orden: ordenFinal,
              instruccion: cleanInstruccion,
              tiempo_estimado_min: updateStepPayload.tiempo_estimado_min,
              consejo_pro: updateStepPayload.consejo_pro,
            };
            const retryUpdateRes = await supabase
              .from('pasos')
              .update(fallbackStepPayload)
              .eq('id', p.id);
            errUpdatePaso = retryUpdateRes.error;
          }

          if (errUpdatePaso) {
            console.error(`Error actualizando paso ${p.id}:`, errUpdatePaso);
            return { error: `Error actualizando paso ${ordenFinal}: ${errUpdatePaso.message}` };
          }
        } else {
          const insertPayload: any = {
            receta_id: recetaId,
            orden: ordenFinal,
            instruccion: cleanInstruccion,
            instruccion_principiante: p.instruccion_principiante?.trim() || null,
            instruccion_avanzada: p.instruccion_avanzada?.trim() || null,
            tiempo_estimado_min:
              typeof p.tiempo_estimado_min === 'number' && !isNaN(p.tiempo_estimado_min)
                ? p.tiempo_estimado_min
                : null,
            consejo_pro: p.consejo_pro?.trim() || null,
            descriptor_sensorial: p.descriptor_sensorial?.trim() || null,
            temperatura_celsius:
              typeof p.temperatura_celsius === 'number' && !isNaN(p.temperatura_celsius)
                ? p.temperatura_celsius
                : null,
            potencia_fuego: p.potencia_fuego || null,
          };

          let { error: errInsertPaso } = await supabase
            .from('pasos')
            .insert(insertPayload);

          // Fallback defensivo ante ausencia de columnas en schema cache
          if (
            errInsertPaso &&
            /instruccion_principiante|instruccion_avanzada|descriptor_sensorial|potencia_fuego|temperatura_celsius|column|schema cache|PGRST204/i.test(
              errInsertPaso.message || ''
            )
          ) {
            console.warn(
              `[recipeUpdate] Reintentando inserción básica de nuevo paso ${ordenFinal}:`,
              errInsertPaso.message
            );
            const fallbackInsertPayload = {
              receta_id: recetaId,
              orden: ordenFinal,
              instruccion: cleanInstruccion,
              tiempo_estimado_min: insertPayload.tiempo_estimado_min,
              consejo_pro: insertPayload.consejo_pro,
            };
            const retryInsertRes = await supabase
              .from('pasos')
              .insert(fallbackInsertPayload);
            errInsertPaso = retryInsertRes.error;
          }

          if (errInsertPaso) {
            console.error('Error insertando nuevo paso:', errInsertPaso);
            return { error: `Error insertando nuevo paso ${ordenFinal}: ${errInsertPaso.message}` };
          }
        }
      }
    }

    // 7. Revalidar cachés de rutas
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

    // 1. Obtener la foto previa para eliminarla si procede de 'recetas_fotos' y es distinta
    const { data: recetaActual } = await supabase
      .from('recetas')
      .select('foto_url')
      .eq('id', recetaId)
      .eq('usuario_id', user.id)
      .single();

    const fotoAnterior = recetaActual?.foto_url;
    if (
      fotoAnterior &&
      fotoAnterior !== fotoUrl &&
      fotoAnterior.includes('/recetas_fotos/')
    ) {
      try {
        const parts = fotoAnterior.split('/recetas_fotos/');
        if (parts[1]) {
          const oldFilePath = decodeURIComponent(parts[1]);
          await supabase.storage.from('recetas_fotos').remove([oldFilePath]);
        }
      } catch (storageErr) {
        console.warn('Aviso: no se pudo eliminar la foto anterior de recetas_fotos:', storageErr);
      }
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

