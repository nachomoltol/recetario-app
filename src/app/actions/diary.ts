'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

type DiarioUpdate = Database['public']['Tables']['diario_cocinados']['Update'];

export interface DiaryActionResult {
  success?: boolean;
  error?: string;
  entryId?: string;
}

export async function addCookEntryAction(formData: FormData): Promise<DiaryActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Debes iniciar sesión para registrar una preparación en tu diario.' };
    }

    const recetaId = formData.get('recetaId') as string;
    const fotoFile = formData.get('foto') as File | null;
    const calificacion = formData.get('calificacion')
      ? parseInt(formData.get('calificacion') as string, 10)
      : null;
    const notas = (formData.get('notas') as string)?.trim() || null;
    const modificaciones = (formData.get('modificaciones') as string)?.trim() || null;
    const tiempoEmpleado = formData.get('tiempoEmpleadoMin')
      ? parseInt(formData.get('tiempoEmpleadoMin') as string, 10)
      : null;

    if (!recetaId) {
      return { success: false, error: 'ID de receta inválido.' };
    }

    let fotoResultadoUrl: string | null = null;
    // 1. Si se adjunta fotografía, validar tamaño (máximo 10MB) y subir a Supabase Storage
    if (fotoFile && fotoFile.size > 0 && fotoFile.name) {
      if (fotoFile.size > 10 * 1024 * 1024) {
        return { error: 'La fotografía no debe superar los 10MB.' };
      }

      const fileExt = fotoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${recetaId}_${Date.now()}.${fileExt}`;
      const arrayBuffer = await fotoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('cooking-diary')
        .upload(fileName, buffer, {
          contentType: fotoFile.type || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error subiendo imagen al storage:', uploadError);
        return { error: `Error subiendo la foto: ${uploadError.message}` };
      }

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from('cooking-diary')
        .getPublicUrl(fileName);

      fotoResultadoUrl = publicUrlData.publicUrl;
    }

    // 2. Insertar en la tabla relacional 'diario_cocinados'
    const { data: newEntry, error: insertError } = await supabase
      .from('diario_cocinados')
      .insert({
        receta_id: recetaId,
        usuario_id: user.id,
        foto_resultado_url: fotoResultadoUrl,
        calificacion,
        notas_cocinero: notas,
        modificaciones_realizadas: modificaciones,
        tiempo_empleado_min: tiempoEmpleado,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error insertando en diario_cocinados:', insertError);
      return { error: `Error guardando en el diario: ${insertError.message}` };
    }

    // 3. Si se valoró con estrellas, sincronizar puntuación en la receta
    if (calificacion) {
      await supabase
        .from('recetas')
        .update({ puntuacion: calificacion })
        .eq('id', recetaId)
        .eq('usuario_id', user.id);
    }

    revalidatePath(`/recipes/${recetaId}`);
    revalidatePath('/recipes');
    revalidatePath('/recipes/collection');
    return { success: true, entryId: newEntry.id };
  } catch (err) {
    console.error('Error procesando entrada del diario:', err);
    return {
      error: err instanceof Error ? err.message : 'Error inesperado al registrar el cocinado.',
    };
  }
}

export async function deleteDiaryEntryAction(
  entryId: string,
  recetaId?: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Debes iniciar sesión para realizar esta acción.' };
    }

    if (!entryId) {
      return { success: false, error: 'ID de valoración no válido.' };
    }
    // 1. Obtener la entrada para verificar pertenencia y obtener datos
    const { data: entry, error: fetchError } = await supabase
      .from('diario_cocinados')
      .select('id, receta_id, foto_resultado_url')
      .eq('id', entryId)
      .eq('usuario_id', user.id)
      .single();

    if (fetchError || !entry) {
      return { error: 'No se encontró la valoración o no tienes permisos para eliminarla.' };
    }

    // 2. Si tenía foto asociada en cooking-diary, eliminarla del Storage
    if (entry.foto_resultado_url) {
      try {
        const urlParts = entry.foto_resultado_url.split('/cooking-diary/');
        if (urlParts.length > 1) {
          const filePath = decodeURIComponent(urlParts[1]);
          await supabase.storage.from('cooking-diary').remove([filePath]);
        }
      } catch (storageErr) {
        console.warn('Aviso: no se pudo borrar la foto de Storage (no bloqueante):', storageErr);
      }
    }

    // 3. Eliminar de la base de datos
    const { error: deleteError } = await supabase
      .from('diario_cocinados')
      .delete()
      .eq('id', entryId)
      .eq('usuario_id', user.id);

    if (deleteError) {
      console.error('Error eliminando valoración de diario_cocinados:', deleteError);
      return { error: `Error eliminando la valoración: ${deleteError.message}` };
    }

    const targetRecetaId = recetaId || entry.receta_id;
    if (targetRecetaId) {
      revalidatePath(`/recipes/${targetRecetaId}`);
    }
    revalidatePath('/recipes');
    revalidatePath('/recipes/collection');

    return { success: true };
  } catch (err) {
    console.error('Error en deleteDiaryEntryAction:', err);
    return {
      error: err instanceof Error ? err.message : 'Error inesperado al eliminar la valoración.',
    };
  }
}

/**
 * Actualiza el texto de las notas y/o modificaciones de una entrada existente del diario
 */
export async function updateDiaryEntryAction(payload: {
  entryId: string;
  recetaId: string;
  notas?: string | null;
  modificaciones?: string | null;
  calificacion?: number | null;
  tiempoEmpleadoMin?: number | null;
}): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Debes iniciar sesión para editar una valoración.' };
    }

    if (!payload.entryId) {
      return { success: false, error: 'ID de valoración no válido.' };
    }

    const updates: DiarioUpdate = {};
    if (payload.notas !== undefined) updates.notas_cocinero = payload.notas?.trim() || null;
    if (payload.modificaciones !== undefined) updates.modificaciones_realizadas = payload.modificaciones?.trim() || null;
    if (payload.calificacion !== undefined) updates.calificacion = payload.calificacion;
    if (payload.tiempoEmpleadoMin !== undefined) updates.tiempo_empleado_min = payload.tiempoEmpleadoMin;

    const { error: updateError } = await supabase
      .from('diario_cocinados')
      .update(updates)
      .eq('id', payload.entryId)
      .eq('usuario_id', user.id);

    if (updateError) {
      console.error('Error actualizando valoración:', updateError);
      return { error: `Error al actualizar la valoración: ${updateError.message}` };
    }

    // Si se actualizó la calificación, sincronizar en la receta
    if (payload.calificacion && payload.recetaId) {
      await supabase
        .from('recetas')
        .update({ puntuacion: payload.calificacion })
        .eq('id', payload.recetaId)
        .eq('usuario_id', user.id);
    }

    if (payload.recetaId) {
      revalidatePath(`/recipes/${payload.recetaId}`);
    }
    revalidatePath('/recipes');
    revalidatePath('/recipes/collection');

    return { success: true };
  } catch (err) {
    console.error('Error en updateDiaryEntryAction:', err);
    return {
      error: err instanceof Error ? err.message : 'Error inesperado al actualizar la valoración.',
    };
  }
}

