'use server';

import { createClient, getAdminClient } from '@/lib/supabase/server';

export interface CheckUserBalanceResult {
  success: boolean;
  creditos_anuncio?: number;
  capturas_mes_actual?: number;
  is_pro?: boolean;
  error?: string;
}

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
      .select('plan_suscripcion, capturas_mes_actual, creditos_anuncio')
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

    return {
      success: true,
      creditos_anuncio: creditosAnuncio,
      capturas_mes_actual: capturas,
      is_pro: isPro,
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
