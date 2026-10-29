'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface AdaptedIngredientPayload {
  id?: string;
  nombre_limpio: string;
  nombre_crudo?: string;
  cantidad: number;
  unidad: string;
  gramos_calculados?: number;
  pasillo_supermercado?: string;
  notas?: string | null;
  orden?: number;
  rol_culinario?: string | null;
}

export interface AdaptedStepPayload {
  id?: string;
  orden: number;
  instruccion: string;
  tiempo_estimado_min?: number | null;
  temperatura_celsius?: number | null;
  consejo_pro?: string | null;
}

export interface SaveRecipeAdaptationParams {
  recetaId: string;
  titulo?: string;
  descripcion?: string | null;
  ingredientes: AdaptedIngredientPayload[];
  pasos: AdaptedStepPayload[];
}

export interface SaveAdaptationResult {
  success: boolean;
  error?: string;
}

export interface RevertAdaptationResult {
  success: boolean;
  error?: string;
  originalData?: {
    titulo: string;
    descripcion: string | null;
    porciones: number;
    dificultad: string;
    ingredientes: any[];
    pasos: any[];
  };
}

/**
 * Guarda y persiste en Supabase una adaptación clínica o sustitución de ingredientes.
 * Si es la primera vez que se altera la receta, crea un respaldo automático en 'receta_original' (JSONB).
 */
export async function saveRecipeAdaptationAction({
  recetaId,
  titulo,
  descripcion,
  ingredientes,
  pasos,
}: SaveRecipeAdaptationParams): Promise<SaveAdaptationResult> {
  if (!recetaId || !ingredientes || !pasos) {
    return { success: false, error: 'Parámetros insuficientes para guardar la adaptación.' };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Debes haber iniciado sesión para adaptar recetas.' };
    }

    // 1. Obtener estado actual de la receta, ingredientes y pasos para verificar respaldo
    const { data: recetaActual, error: errReceta } = await supabase
      .from('recetas')
      .select('*')
      .eq('id', recetaId)
      .eq('usuario_id', user.id)
      .single();

    if (errReceta || !recetaActual) {
      return { success: false, error: 'No se encontró la receta o no tienes permisos para editarla.' };
    }

    // 2. Si no existe respaldo previo en 'receta_original', generarlo con los datos originales de la BD
    let backupOriginal = recetaActual.receta_original;

    if (!backupOriginal) {
      const [{ data: ingOriginales }, { data: pasosOriginales }] = await Promise.all([
        supabase
          .from('receta_ingredientes')
          .select('*')
          .eq('receta_id', recetaId)
          .order('orden', { ascending: true }),
        supabase
          .from('pasos')
          .select('*')
          .eq('receta_id', recetaId)
          .order('orden', { ascending: true }),
      ]);

      backupOriginal = {
        titulo: recetaActual.titulo,
        descripcion: recetaActual.descripcion,
        porciones: recetaActual.porciones,
        dificultad: recetaActual.dificultad,
        ingredientes: (ingOriginales || []).map((i) => ({
          id: i.id,
          nombre_limpio: i.nombre_limpio,
          nombre_crudo: i.nombre_crudo,
          cantidad: i.cantidad,
          unidad: i.unidad,
          gramos_calculados: i.gramos_calculados,
          pasillo_supermercado: i.pasillo_supermercado,
          notas: i.notas,
          orden: i.orden,
          rol_culinario: i.rol_culinario || null,
        })),
        pasos: (pasosOriginales || []).map((p) => ({
          id: p.id,
          orden: p.orden,
          instruccion: p.instruccion,
          instruccion_principiante: (p as any).instruccion_principiante || null,
          instruccion_avanzada: (p as any).instruccion_avanzada || null,
          descriptor_sensorial: (p as any).descriptor_sensorial || null,
          potencia_fuego: (p as any).potencia_fuego || null,
          tiempo_estimado_min: p.tiempo_estimado_min,
          temperatura_celsius: p.temperatura_celsius,
          consejo_pro: p.consejo_pro,
        })),
      };
    }

    // 3. Actualizar cabecera de la receta y asegurar el backup en 'receta_original'
    const updateRecetaPayload: any = {
      updated_at: new Date().toISOString(),
      receta_original: backupOriginal,
    };
    if (titulo) updateRecetaPayload.titulo = titulo.trim();
    if (descripcion !== undefined) updateRecetaPayload.descripcion = descripcion;

    const { error: errUpdateReceta } = await supabase
      .from('recetas')
      .update(updateRecetaPayload)
      .eq('id', recetaId)
      .eq('usuario_id', user.id);

    if (errUpdateReceta) {
      console.error('Error actualizando receta cabecera en adaptación:', errUpdateReceta);
      return { success: false, error: 'Error actualizando datos de la receta.' };
    }

    // 4. Sobrescribir ingredientes en 'receta_ingredientes'
    // Eliminamos los existentes y reinsertamos los adaptados para mantener coherencia estricta
    await supabase.from('receta_ingredientes').delete().eq('receta_id', recetaId);

    const ingredientesPayload = ingredientes.map((ing, idx) => ({
      receta_id: recetaId,
      nombre_limpio: (ing.nombre_limpio || ing.nombre_crudo || `Ingrediente ${idx + 1}`)
        .replace(/<\/?[^>]+(>|$)/g, '')
        .trim(),
      nombre_crudo: (ing.nombre_crudo || ing.nombre_limpio || `Ingrediente ${idx + 1}`)
        .replace(/<\/?[^>]+(>|$)/g, '')
        .trim(),
      cantidad: typeof ing.cantidad === 'number' && !isNaN(ing.cantidad) ? ing.cantidad : 1,
      unidad: (ing.unidad || 'unidad').trim(),
      gramos_calculados: typeof ing.gramos_calculados === 'number' ? ing.gramos_calculados : 0,
      pasillo_supermercado: ing.pasillo_supermercado || 'Despensa y Especias',
      notas: ing.notas || null,
      orden: typeof ing.orden === 'number' ? ing.orden : idx + 1,
      es_opcional: false,
      rol_culinario: ing.rol_culinario || null,
      seccion: (ing as any).seccion || null,
    }));

    let { error: errInsertIng } = await supabase
      .from('receta_ingredientes')
      .insert(ingredientesPayload);

    if (errInsertIng && /seccion/i.test(errInsertIng.message || '')) {
      console.warn(
        "Advertencia: Columna 'seccion' no disponible en schema cache al guardar adaptación. Reintentando sin 'seccion':",
        errInsertIng.message
      );
      const fallbackPayload = ingredientesPayload.map(({ seccion, ...rest }) => rest);
      const retryResult = await supabase
        .from('receta_ingredientes')
        .insert(fallbackPayload as any);
      errInsertIng = retryResult.error;
    }

    if (errInsertIng) {
      console.error('Error insertando ingredientes adaptados:', errInsertIng);
      return { success: false, error: 'Error guardando ingredientes adaptados.' };
    }

    // 5. Sobrescribir pasos en 'pasos'
    await supabase.from('pasos').delete().eq('receta_id', recetaId);

    const pasosPayload = pasos.map((p, idx) => ({
      receta_id: recetaId,
      orden: typeof p.orden === 'number' ? p.orden : idx + 1,
      instruccion: p.instruccion.trim(),
      instruccion_principiante: (p as any).instruccion_principiante ? (p as any).instruccion_principiante.trim() : null,
      instruccion_avanzada: (p as any).instruccion_avanzada ? (p as any).instruccion_avanzada.trim() : null,
      descriptor_sensorial: (p as any).descriptor_sensorial ? (p as any).descriptor_sensorial.trim() : null,
      potencia_fuego: (p as any).potencia_fuego ? (p as any).potencia_fuego.trim() : null,
      tiempo_estimado_min: typeof p.tiempo_estimado_min === 'number' && p.tiempo_estimado_min > 0 ? p.tiempo_estimado_min : null,
      temperatura_celsius: typeof p.temperatura_celsius === 'number' && p.temperatura_celsius > 0 ? p.temperatura_celsius : null,
      consejo_pro: p.consejo_pro ? p.consejo_pro.trim() : null,
      utensilios_sugeridos: [],
    }));

    let { error: errInsertPasos } = await supabase
      .from('pasos')
      .insert(pasosPayload);

    if (errInsertPasos && /instruccion_principiante|instruccion_avanzada|descriptor_sensorial|potencia_fuego/i.test(errInsertPasos.message || '')) {
      console.warn('Advertencia: Columnas de nivel culinario no disponibles en pasos al guardar adaptación, reintentando:', errInsertPasos.message);
      const fallbackPasos = pasosPayload.map(({ instruccion_principiante, instruccion_avanzada, descriptor_sensorial, potencia_fuego, ...rest }: any) => rest);
      const retryResult = await supabase.from('pasos').insert(fallbackPasos as any);
      errInsertPasos = retryResult.error;
    }

    if (errInsertPasos) {
      console.error('Error insertando pasos adaptados:', errInsertPasos);
      return { success: false, error: 'Error guardando pasos adaptados.' };
    }

    // 6. Revalidar rutas para sincronizar SSR
    revalidatePath(`/recipes/${recetaId}`);
    revalidatePath('/recipes');

    return { success: true };
  } catch (err) {
    console.error('Error inesperado en saveRecipeAdaptationAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al guardar la adaptación.',
    };
  }
}

/**
 * Revierte la receta a su versión original respaldada en 'receta_original'.
 * Restaura el título, ingredientes y pasos originales en Supabase y limpia el respaldo.
 */
export async function revertRecipeAdaptationAction(recetaId: string): Promise<RevertAdaptationResult> {
  if (!recetaId) {
    return { success: false, error: 'Se requiere el identificador de la receta.' };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Debes haber iniciado sesión.' };
    }

    // 1. Obtener receta y su respaldo
    const { data: receta, error: errReceta } = await supabase
      .from('recetas')
      .select('*')
      .eq('id', recetaId)
      .eq('usuario_id', user.id)
      .single();

    if (errReceta || !receta) {
      return { success: false, error: 'No se encontró la receta.' };
    }

    const backup = receta.receta_original as any;
    if (!backup) {
      return { success: false, error: 'No hay ninguna versión original respaldada para revertir.' };
    }

    // 2. Restaurar cabecera de la receta y vaciar receta_original
    const { error: errUpdate } = await supabase
      .from('recetas')
      .update({
        titulo: backup.titulo,
        descripcion: backup.descripcion,
        porciones: backup.porciones || receta.porciones,
        dificultad: backup.dificultad || receta.dificultad,
        receta_original: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recetaId)
      .eq('usuario_id', user.id);

    if (errUpdate) {
      console.error('Error restaurando cabecera de receta original:', errUpdate);
      return { success: false, error: 'Error restaurando la receta original.' };
    }

    // 3. Restaurar ingredientes originales
    await supabase.from('receta_ingredientes').delete().eq('receta_id', recetaId);

    if (backup.ingredientes && Array.isArray(backup.ingredientes) && backup.ingredientes.length > 0) {
      const ingredientesPayload = backup.ingredientes.map((ing: any, idx: number) => ({
        receta_id: recetaId,
        nombre_limpio: (ing.nombre_limpio || ing.nombre_crudo || `Ingrediente ${idx + 1}`).trim(),
        nombre_crudo: (ing.nombre_crudo || ing.nombre_limpio || `Ingrediente ${idx + 1}`).trim(),
        cantidad: typeof ing.cantidad === 'number' && !isNaN(ing.cantidad) ? ing.cantidad : 1,
        unidad: (ing.unidad || 'unidad').trim(),
        gramos_calculados: typeof ing.gramos_calculados === 'number' ? ing.gramos_calculados : 0,
        pasillo_supermercado: ing.pasillo_supermercado || 'Despensa y Especias',
        notas: ing.notas || null,
        orden: typeof ing.orden === 'number' ? ing.orden : idx + 1,
        es_opcional: false,
        rol_culinario: ing.rol_culinario || null,
      }));

      await supabase.from('receta_ingredientes').insert(ingredientesPayload);
    }

    // 4. Restaurar pasos originales
    await supabase.from('pasos').delete().eq('receta_id', recetaId);

    if (backup.pasos && Array.isArray(backup.pasos) && backup.pasos.length > 0) {
      const pasosPayload = backup.pasos.map((p: any, idx: number) => ({
        receta_id: recetaId,
        orden: typeof p.orden === 'number' ? p.orden : idx + 1,
        instruccion: p.instruccion.trim(),
        instruccion_principiante: p.instruccion_principiante ? p.instruccion_principiante.trim() : null,
        instruccion_avanzada: p.instruccion_avanzada ? p.instruccion_avanzada.trim() : null,
        descriptor_sensorial: p.descriptor_sensorial ? p.descriptor_sensorial.trim() : null,
        potencia_fuego: p.potencia_fuego ? p.potencia_fuego.trim() : null,
        tiempo_estimado_min: typeof p.tiempo_estimado_min === 'number' && p.tiempo_estimado_min > 0 ? p.tiempo_estimado_min : null,
        temperatura_celsius: typeof p.temperatura_celsius === 'number' && p.temperatura_celsius > 0 ? p.temperatura_celsius : null,
        consejo_pro: p.consejo_pro ? p.consejo_pro.trim() : null,
        utensilios_sugeridos: [],
      }));

      let { error: errRestorePasos } = await supabase.from('pasos').insert(pasosPayload);
      if (errRestorePasos && /instruccion_principiante|instruccion_avanzada|descriptor_sensorial|potencia_fuego/i.test(errRestorePasos.message || '')) {
        const fallbackPasos = pasosPayload.map(({ instruccion_principiante, instruccion_avanzada, descriptor_sensorial, potencia_fuego, ...rest }: any) => rest);
        await supabase.from('pasos').insert(fallbackPasos as any);
      }
    }

    // 5. Revalidar rutas
    revalidatePath(`/recipes/${recetaId}`);
    revalidatePath('/recipes');

    return {
      success: true,
      originalData: backup,
    };
  } catch (err) {
    console.error('Error inesperado en revertRecipeAdaptationAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al revertir la receta.',
    };
  }
}
