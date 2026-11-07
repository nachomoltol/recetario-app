'use server';

import { createClient, getAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface RequestMobileAdUnlockParams {
  url?: string;
}

export interface RequestMobileAdUnlockResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action invocada desde PC/Web cuando el usuario solicita desbloquear
 * una extracción viendo un vídeo patrocinado en su aplicación móvil de Android.
 */
export async function requestMobileAdUnlockAction(
  params?: RequestMobileAdUnlockParams
): Promise<RequestMobileAdUnlockResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'Debes iniciar sesión para solicitar el desbloqueo en móvil.',
      };
    }

    const adminClient = getAdminClient();
    const db = adminClient || supabase;
    const nowIso = new Date().toISOString();
    const targetUrl = params?.url?.trim() || null;

    const { error: updateErr } = await db
      .from('usuarios')
      .update({
        solicitud_recarga_pc: true,
        solicitud_recarga_pc_at: nowIso,
        solicitud_recarga_url: targetUrl,
        updated_at: nowIso,
      })
      .eq('id', user.id);

    if (updateErr) {
      // Fallback en caso de que la columna solicitud_recarga_url aún no esté indexada en caché
      const { error: fallbackErr } = await db
        .from('usuarios')
        .update({
          solicitud_recarga_pc: true,
          solicitud_recarga_pc_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', user.id);

      if (fallbackErr) {
        console.error('[requestMobileAdUnlockAction] Error al activar solicitud_recarga_pc:', fallbackErr);
        return {
          success: false,
          error: 'No se pudo registrar la solicitud de desbloqueo.',
        };
      }
    }

    revalidatePath('/recipes', 'page');

    return {
      success: true,
    };
  } catch (err: unknown) {
    console.error('[requestMobileAdUnlockAction] Excepción inesperada:', err);
    return {
      success: false,
      error: 'Error inesperado al registrar la solicitud.',
    };
  }
}
