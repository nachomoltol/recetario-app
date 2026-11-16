'use server';

import { createClient, getAdminClient } from '@/lib/supabase/server';

export interface ClaimAdRewardResult {
  success: boolean;
  nuevoSaldo?: number;
  error?: string;
  message?: string;
}

/**
 * Server Action seguro para acreditar +1 crédito por anuncio bonificado (AdMob)
 * en la cuenta de usuario de Supabase.
 * - Requiere rol administrativo (service_role) o autenticación verificada.
 * - Valida que el usuario es Free y que se encuentra en el rango de cuota requerido.
 * - Limita el saldo máximo a 2 créditos para evitar acaparamiento masivo.
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

    // 1. Obtener estado actual del usuario para validar elegibilidad
    const { data: usuario, error: fetchErr } = await db
      .from('usuarios')
      .select('plan_suscripcion, capturas_mes_actual, antiguedad_ciclos_mes, creditos_anuncio')
      .eq('id', user.id)
      .single();

    if (fetchErr || !usuario) {
      console.error('[claimAdRewardAction] Error consultando perfil de usuario:', fetchErr);
      return {
        success: false,
        error: 'No se pudo consultar el estado del usuario.',
      };
    }

    const isPro = (usuario.plan_suscripcion || '').trim().toLowerCase() === 'pro';
    if (isPro) {
      return {
        success: false,
        error: 'Los usuarios PRO disfrutan de extracción directa sin necesidad de anuncios.',
      };
    }

    const capturas = Number(usuario.capturas_mes_actual) || 0;
    const antiguedadCiclos = Number(usuario.antiguedad_ciclos_mes) || 0;
    const currentCreditos = Number(usuario.creditos_anuncio) || 0;

    // A) Si ya alcanzó el límite mensual de 20 en Free, no puede acumular más créditos
    if (capturas >= 20) {
      return {
        success: false,
        error: 'Has alcanzado el límite mensual de 20 recetas gratis. Pásate a PRO para continuar.',
      };
    }

    // B) Si está en el mes 1 y aún no ha alcanzado las 3 gratuitas directas
    if (antiguedadCiclos === 0 && capturas < 3) {
      return {
        success: false,
        error: 'Aún dispones de extracciones directas sin anuncio en tu primer mes.',
      };
    }

    // C) Prevención de acaparamiento: máximo 2 créditos de anuncio acumulables
    if (currentCreditos >= 2) {
      return {
        success: false,
        error: 'Ya dispones de créditos de anuncio activos. Consúmelos antes de acumular más.',
      };
    }

    const nuevoSaldo = currentCreditos + 1;

    // 2. Persistir incremento mediante cliente administrativo o RPC atómica con SECURITY DEFINER
    let saldoFinal = nuevoSaldo;
    if (adminClient) {
      const { error: updateErr } = await adminClient
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
        console.error('[claimAdRewardAction] Error al persistir crédito de anuncio con adminClient:', updateErr);
        return {
          success: false,
          error: 'Error al persistir el crédito bonificado en la base de datos.',
        };
      }
    } else {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('claim_ad_reward_credit', {
        p_user_id: user.id,
      });

      if (rpcErr) {
        console.error('[claimAdRewardAction] Error al persistir crédito de anuncio con RPC:', rpcErr);
        return {
          success: false,
          error: rpcErr.message || 'Error al persistir el crédito bonificado en la base de datos.',
        };
      }
      if (rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        saldoFinal = Number((rpcData[0] as any).nuevo_saldo) || nuevoSaldo;
      }
    }

    console.log(
      `[claimAdRewardAction] +1 crédito de anuncio otorgado a ${user.id}. Nuevo saldo: ${saldoFinal}.`
    );

    return {
      success: true,
      nuevoSaldo: saldoFinal,
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
