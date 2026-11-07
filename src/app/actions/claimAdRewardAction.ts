'use server';

import { createClient, getAdminClient } from '@/lib/supabase/server';

export interface ClaimAdRewardResult {
  success: boolean;
  nuevoSaldo?: number;
  error?: string;
  message?: string;
}

/**
 * Server Action para acreditar +1 crédito por anuncio bonificado (AdMob)
 * en la cuenta de usuario de Supabase, habilitando el saldo cruzado PC-Móvil.
 */
export async function claimAdRewardAction(): Promise<ClaimAdRewardResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'Debes iniciar sesión para acumular créditos por anuncio.',
      };
    }

    const adminClient = getAdminClient();
    const db = adminClient || supabase;

    // 1. Intento atómico mediante RPC increment_creditos_anuncio
    try {
      const { data: rpcSaldo, error: rpcError } = await (db.rpc as any)(
        'increment_creditos_anuncio',
        {
          p_user_id: user.id,
          p_amount: 1,
        }
      );

      if (!rpcError && typeof rpcSaldo === 'number') {
        await db
          .from('usuarios')
          .update({
            solicitud_recarga_pc: false,
            solicitud_recarga_pc_at: null,
            solicitud_recarga_url: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        return {
          success: true,
          nuevoSaldo: rpcSaldo,
          message: '¡Crédito de anuncio añadido con éxito!',
        };
      }

      if (rpcError) {
        console.warn(
          '[claimAdRewardAction] RPC increment_creditos_anuncio no disponible, ejecutando fallback directo:',
          rpcError.message
        );
      }
    } catch (rpcErr) {
      console.warn('[claimAdRewardAction] Excepción al invocar RPC:', rpcErr);
    }

    // 2. Fallback resiliente: Consulta directa y actualización de usuarios
    const { data: userData, error: fetchErr } = await db
      .from('usuarios')
      .select('creditos_anuncio')
      .eq('id', user.id)
      .single();

    if (fetchErr) {
      console.error('[claimAdRewardAction] Error al consultar usuario:', fetchErr);
      return {
        success: false,
        error: 'No se pudo consultar el saldo de créditos del usuario.',
      };
    }

    const currentSaldo = Number(userData?.creditos_anuncio) || 0;
    const nuevoSaldo = currentSaldo + 1;

    const { error: updateErr } = await db
      .from('usuarios')
      .update({
        creditos_anuncio: nuevoSaldo,
        solicitud_recarga_pc: false,
        solicitud_recarga_pc_at: null,
        solicitud_recarga_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateErr) {
      console.error('[claimAdRewardAction] Error al actualizar créditos:', updateErr);
      return {
        success: false,
        error: 'Error al persistir el crédito bonificado en la base de datos.',
      };
    }

    return {
      success: true,
      nuevoSaldo,
      message: '¡Crédito de anuncio añadido con éxito!',
    };
  } catch (err: unknown) {
    console.error('[claimAdRewardAction] Excepción:', err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Error inesperado al reclamar recompensa de anuncio.',
    };
  }
}
