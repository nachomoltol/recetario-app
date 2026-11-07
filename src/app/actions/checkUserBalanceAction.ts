'use server';

import { createClient, getAdminClient } from '@/lib/supabase/server';

export type CheckUserBalanceResult =
  | {
      success: true;
      creditos_anuncio: number;
      capturas_mes_actual: number;
      is_pro: boolean;
      limite_gratuito: number;
      puede_extraer: boolean;
      solicitud_recarga_pc: boolean;
      solicitud_recarga_pc_at: string | null;
      solicitud_recarga_url: string | null;
    }
  | {
      success: false;
      error: string;
      creditos_anuncio?: never;
      capturas_mes_actual?: never;
      is_pro?: never;
      limite_gratuito?: never;
      puede_extraer?: never;
      solicitud_recarga_pc?: never;
      solicitud_recarga_pc_at?: never;
      solicitud_recarga_url?: never;
    };

/**
 * Server Action que consulta y devuelve el saldo actual y estado de cuotas
 * del usuario autenticado para la sincronización cruzada PC-Móvil.
 */
export async function checkUserBalanceAction(): Promise<CheckUserBalanceResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'Debes iniciar sesión para verificar tu saldo.',
      };
    }

    const adminClient = getAdminClient();
    const db = adminClient || supabase;

    const { data: profile, error: profileErr } = await db
      .from('usuarios')
      .select(
        'plan_suscripcion, capturas_mes_actual, creditos_anuncio, solicitud_recarga_pc, solicitud_recarga_pc_at, solicitud_recarga_url'
      )
      .eq('id', user.id)
      .single();

    if (profileErr) {
      console.error('[checkUserBalanceAction] Error al obtener perfil:', profileErr);
      return {
        success: false,
        error: 'No se pudo obtener el perfil de usuario.',
      };
    }

    const isPro =
      (profile?.plan_suscripcion || '').trim().toLowerCase() === 'pro' ||
      Boolean((profile as any)?.is_pro);
    const capturas = Number(profile?.capturas_mes_actual) || 0;
    const creditosAnuncio = Number(profile?.creditos_anuncio) || 0;
    const solicitudRecargaPc = Boolean(profile?.solicitud_recarga_pc);
    const solicitudRecargaPcAt = profile?.solicitud_recarga_pc_at ?? null;
    const solicitudRecargaUrl = profile?.solicitud_recarga_url ?? null;

    return {
      success: true,
      creditos_anuncio: creditosAnuncio,
      capturas_mes_actual: capturas,
      is_pro: isPro,
      limite_gratuito: 20,
      puede_extraer: isPro || creditosAnuncio > 0 || capturas < 20,
      solicitud_recarga_pc: solicitudRecargaPc,
      solicitud_recarga_pc_at: solicitudRecargaPcAt,
      solicitud_recarga_url: solicitudRecargaUrl,
    };
  } catch (err: unknown) {
    console.error('[checkUserBalanceAction] Excepción:', err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Error inesperado al comprobar el saldo.',
    };
  }
}
