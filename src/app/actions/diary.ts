'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface DiaryActionResult {
  success?: boolean;
  error?: string;
  entryId?: string;
}

export async function addCookEntryAction(formData: FormData): Promise<DiaryActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Debes iniciar sesión para registrar una preparación en tu diario.' };
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
    return { error: 'ID de receta inválido.' };
  }

  if (!fotoFile || fotoFile.size === 0) {
    return { error: 'Por favor, sube una fotografía del plato terminado.' };
  }

  // 1. Validar tamaño (máximo 10MB)
  if (fotoFile.size > 10 * 1024 * 1024) {
    return { error: 'La fotografía no debe superar los 10MB.' };
  }

  try {
    // 2. Subir imagen a Supabase Storage (bucket: cooking-diary)
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

    // 3. Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('cooking-diary')
      .getPublicUrl(fileName);

    const fotoResultadoUrl = publicUrlData.publicUrl;

    // 4. Insertar en la tabla relacional 'diario_cocinados'
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

    revalidatePath(`/recipes/${recetaId}`);
    return { success: true, entryId: newEntry.id };
  } catch (err) {
    console.error('Error procesando entrada del diario:', err);
    return {
      error: err instanceof Error ? err.message : 'Error inesperado al registrar el cocinado.',
    };
  }
}
