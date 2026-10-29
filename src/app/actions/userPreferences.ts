'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update'];

export interface ActionResponse<T = any> {
  success?: boolean;
  error?: string;
  message?: string;
  data?: T;
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
 * Actualiza el perfil culinario del usuario (nombre, nivel y preferencias dietéticas / objetivos clínicos)
 */
export async function updateUserProfileAction(payload: {
  nombre?: string;
  nivel_culinario?: string;
  preferencias_dieteticas?: string[];
  patron_alimentario?: string;
  objetivos_clinicos?: string[];
  alergenos?: string[];
}): Promise<ActionResponse<Database['public']['Tables']['usuarios']['Row']>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Sesión no iniciada' };
    }

    // Consultar plan_suscripcion actual en Supabase para blindar el Muro de Pago en servidor (Fase 2.1)
    const { data: currentDbUser } = await supabase
      .from('usuarios')
      .select('plan_suscripcion')
      .eq('id', user.id)
      .maybeSingle();

    const isProServer =
      (currentDbUser?.plan_suscripcion || '').trim().toLowerCase() === 'pro';

    // Normalizar preferencias dietéticas combinando objetivos clínicos y patrón si se pasan por separado
    const combinedPrefsCheck = [
      ...(payload.preferencias_dieteticas || []),
      ...(payload.objetivos_clinicos || []),
      ...(payload.patron_alimentario ? [payload.patron_alimentario] : []),
    ]
      .map((p) => p.trim())
      .filter(Boolean);

    const hasProLevelAttempt =
      payload.nivel_culinario !== undefined &&
      payload.nivel_culinario !== null &&
      payload.nivel_culinario.trim() !== '';

    const hasProClinicalAttempt = combinedPrefsCheck.some(
      (pref) =>
        pref.toLowerCase() !== 'general' && pref.toLowerCase() !== 'omnívora' && pref.toLowerCase() !== 'omnivora'
    );

    if (!isProServer && (hasProLevelAttempt || hasProClinicalAttempt)) {
      return {
        success: false,
        error: 'PRO_SUBSCRIPTION_REQUIRED',
      };
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

    // Normalizar preferencias dietéticas combinando objetivos clínicos y patrón si se pasan por separado
    const combinedPrefs = [
      ...(payload.preferencias_dieteticas || []),
      ...(payload.objetivos_clinicos || []),
      ...(payload.patron_alimentario ? [payload.patron_alimentario] : []),
    ]
      .map((p) => p.trim())
      .filter(Boolean);

    if (
      payload.preferencias_dieteticas !== undefined ||
      payload.objetivos_clinicos !== undefined ||
      payload.patron_alimentario !== undefined
    ) {
      updates.preferencias_dieteticas = Array.from(new Set(combinedPrefs));
    }

    if (payload.alergenos !== undefined) {
      updates.alergenos = Array.from(
        new Set(payload.alergenos.map((a) => a.trim()).filter(Boolean))
      );
    }

    const { data: updatedProfile, error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
      console.error('Error al actualizar perfil culinario:', error);
      return { error: 'No se pudieron guardar las preferencias del perfil.' };
    }

    revalidatePath('/profile');
    revalidatePath('/recipes');
    revalidatePath('/settings');
    return {
      success: true,
      message: 'Perfil culinario guardado con éxito',
      data: updatedProfile,
    };
  } catch (err) {
    console.error('Error inesperado en updateUserProfileAction:', err);
    return { error: 'Ocurrió un error inesperado al guardar el perfil.' };
  }
}
