'use server';

import { createClient, getAdminClient } from '@/lib/supabase/server';
import { ensureMonthlyResetAndPlanSync } from '@/lib/quota/ensureMonthlyResetAndPlanSync';

export type CheckUserBalanceResult =
  | {
      success: true;
      creditos_anuncio: number;
      capturas_mes_actual: number;
      antiguedad_ciclos_mes: number;
      plan_suscripcion: 'gratis' | 'pro';
      is_pro: boolean;
      limite_gratuito: number;
      puede_extraer: boolean;
      requiere_anuncio: boolean;
      solicitud_recarga_pc: boolean;
      solicitud_recarga_pc_at: string | null;
      solicitud_recarga_url: string | null;
    }
  | {
      success: false;
      error: string;
      plan_suscripcion?: never;
      creditos_anuncio?: never;
      capturas_mes_actual?: never;
      antiguedad_ciclos_mes?: never;
      is_pro?: never;
      limite_gratuito?: never;
      puede_extraer?: never;
      requiere_anuncio?: never;
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

    // Sincronización mensual y verificación de caducidad PRO (con aislamiento de errores)
    try {
      await ensureMonthlyResetAndPlanSync(user.id);
    } catch (syncErr) {
      console.warn('[checkUserBalanceAction] Error no fatal en ensureMonthlyResetAndPlanSync:', syncErr);
    }

    const adminClient = getAdminClient();
    const db = adminClient || supabase;

    const { data: profile, error: profileErr } = await db
      .from('usuarios')
      .select(
        'plan_suscripcion, capturas_mes_actual, creditos_anuncio, antiguedad_ciclos_mes, solicitud_recarga_pc, solicitud_recarga_pc_at, solicitud_recarga_url'
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
    const antiguedadCiclos = Number(profile?.antiguedad_ciclos_mes) || 0;
    const solicitudRecargaPc = Boolean(profile?.solicitud_recarga_pc);
    const solicitudRecargaPcAt = profile?.solicitud_recarga_pc_at ?? null;
    const solicitudRecargaUrl = profile?.solicitud_recarga_url ?? null;

    // Regla de Anuncios Free:
    // Mes 1 (ciclos === 0): recetas 0, 1, 2 son gratis (capturas < 3). De la 4.ª en adelante (capturas >= 3), requiere anuncio.
    // Mes 2+ (ciclos > 0): requiere anuncio desde la 1.ª receta (capturas >= 0).
    const requiereAnuncio =
      !isPro &&
      (antiguedadCiclos === 0 ? capturas >= 3 : true) &&
      capturas < 20;

    let puedeExtraer = false;
    if (isPro) {
      puedeExtraer = capturas < 100;
    } else {
      if (capturas >= 20) {
        puedeExtraer = false;
      } else if (!requiereAnuncio) {
        puedeExtraer = true;
      } else {
        puedeExtraer = creditosAnuncio > 0;
      }
    }

    return {
      success: true,
      creditos_anuncio: creditosAnuncio,
      capturas_mes_actual: capturas,
      antiguedad_ciclos_mes: antiguedadCiclos,
      plan_suscripcion: isPro ? 'pro' : 'gratis',
      is_pro: isPro,
      limite_gratuito: 20,
      puede_extraer: puedeExtraer,
      requiere_anuncio: requiereAnuncio,
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
