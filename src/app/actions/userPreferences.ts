'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update'];

export interface ActionResponse {
  success?: boolean;
  error?: string;
  message?: string;
}

/**
 * Actualiza las raciones por defecto del usuario
 */
export async function updateCookingSettingsAction(payload: {
  raciones_defecto: number;
}): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Sesión no iniciada' };
    }

    const raciones = Math.max(1, Math.min(12, Math.round(Number(payload.raciones_defecto) || 2)));

    const { error } = await supabase
      .from('usuarios')
      .update({
        raciones_defecto: raciones,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error al actualizar raciones por defecto:', error);
      return { error: 'No se pudieron guardar las raciones por defecto.' };
    }

    revalidatePath('/settings');
    revalidatePath('/recipes');
    return { success: true };
  } catch (err) {
    console.error('Error inesperado en updateCookingSettingsAction:', err);
    return { error: 'Ocurrió un error inesperado al guardar la configuración.' };
  }
}

/**
 * Actualiza el perfil culinario del usuario (nombre, nivel y preferencias dietéticas)
 */
export async function updateUserProfileAction(payload: {
  nombre?: string;
  nivel_culinario?: string;
  preferencias_dieteticas?: string[];
  alergenos?: string[];
}): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Sesión no iniciada' };
    }

    const updates: UsuarioUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (payload.nombre !== undefined) {
      updates.nombre = payload.nombre.trim();
    }

    if (payload.nivel_culinario !== undefined) {
      const nivelesValidos = ['Principiante', 'Intermedio', 'Avanzado'];
      updates.nivel_culinario = nivelesValidos.includes(payload.nivel_culinario)
        ? payload.nivel_culinario
        : 'Principiante';
    }

    if (payload.preferencias_dieteticas !== undefined) {
      updates.preferencias_dieteticas = payload.preferencias_dieteticas;
    }

    if (payload.alergenos !== undefined) {
      updates.alergenos = payload.alergenos;
    }

    const { error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('Error al actualizar perfil culinario:', error);
      return { error: 'No se pudieron guardar las preferencias del perfil.' };
    }

    revalidatePath('/profile');
    revalidatePath('/recipes');
    revalidatePath('/settings');
    return { success: true, message: 'Perfil culinario guardado con éxito' };
  } catch (err) {
    console.error('Error inesperado en updateUserProfileAction:', err);
    return { error: 'Ocurrió un error inesperado al guardar el perfil.' };
  }
}
