'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createServerUserClient, getAdminClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

export interface RedeemVipResult {
  success?: boolean;
  error?: string;
}

export async function redeemVipCodeAction(code: string): Promise<RedeemVipResult> {
  try {
    // 1. Seguridad Extra: Comprobar primero con el cliente normal que el usuario está autenticado
    const userClient = await createServerUserClient();
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return { error: 'Debes iniciar sesión para canjear un código VIP.' };
    }

    const cleanCode = (code || '').trim().toUpperCase();

    const isVipCode = cleanCode === 'NACHOVIP';
    const isResetFree = cleanCode === 'RESETFREE' || cleanCode === 'FREE' || cleanCode === 'FREE5';
    const isResetZero = cleanCode === 'RESET0';

    if (!isVipCode && !isResetFree && !isResetZero) {
      return { error: 'Código inválido' };
    }

    // 2. Uso de Cliente de Administrador (Service Role) para saltarse RLS
    const adminClient = getAdminClient();
    if (!adminClient) {
      console.error('[subscription] Falta SUPABASE_SERVICE_ROLE_KEY válida para canjear código.');
      return { error: 'Error de configuración del servidor al procesar el código.' };
    }

    let updatePayload: {
      plan_suscripcion: 'gratis' | 'pro';
      capturas_mes_actual?: number;
      updated_at: string;
    } = {
      plan_suscripcion: 'pro',
      updated_at: new Date().toISOString(),
    };

    if (isResetFree) {
      updatePayload = {
        plan_suscripcion: 'gratis',
        capturas_mes_actual: 5,
        updated_at: new Date().toISOString(),
      };
    } else if (isResetZero) {
      updatePayload = {
        plan_suscripcion: 'gratis',
        capturas_mes_actual: 0,
        updated_at: new Date().toISOString(),
      };
    }

    // 3. Verificación Estricta de Filas Modificadas con .select()
    const { data: updatedRows, error: updateError } = await adminClient
      .from('usuarios')
      .update(updatePayload)
      .eq('id', user.id)
      .select();

    if (updateError) {
      console.error('Error al actualizar plan en usuarios:', updateError);
      return { error: 'No se pudo actualizar el plan en el servidor.' };
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.warn('La actualización devolvió 0 filas para el usuario:', user.id);
      return { error: 'No se pudo aplicar el plan en la base de datos' };
    }

    // 4. Revalidar cachés de rutas afectadas
    revalidatePath('/', 'layout');
    revalidatePath('/recipes', 'page');
    revalidatePath('/profile', 'page');
    revalidatePath('/billing', 'page');
    revalidatePath('/settings', 'page');

    return { success: true };
  } catch (err) {
    console.error('Error inesperado en redeemVipCodeAction:', err);
    return { error: 'Error inesperado al validar el código VIP.' };
  }
}

export interface ClaimRewardCreditResult {
  success?: boolean;
  error?: string;
  remainingUsed?: number;
}

export async function claimRewardCreditAction(): Promise<ClaimRewardCreditResult> {
  try {
    const userClient = await createServerUserClient();
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return { error: 'Debes iniciar sesión para obtener créditos de receta.' };
    }

    const adminClient = getAdminClient();
    const targetClient = adminClient || userClient;

    const { data: usuario, error: fetchErr } = await targetClient
      .from('usuarios')
      .select('id, capturas_mes_actual, plan_suscripcion')
      .eq('id', user.id)
      .single();

    if (fetchErr || !usuario) {
      console.error('Error al obtener usuario en claimRewardCreditAction:', fetchErr);
      return { error: 'No se pudo obtener el perfil de usuario.' };
    }

    // Sumar 1 crédito de forma garantizada:
    // Si capturas_mes_actual >= 5, bajarlo directamente a 4 para que quede estrictamente < 5
    // y desbloquee con total certeza la siguiente generación sin que el paywall lo vuelva a atrapar en bucle.
    const cuotaActual = Number(usuario.capturas_mes_actual) || 0;
    const nuevoConteo = cuotaActual >= 5 ? 4 : Math.max(0, cuotaActual - 1);

    const { data: updatedRows, error: updateErr } = await targetClient
      .from('usuarios')
      .update({
        capturas_mes_actual: nuevoConteo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, capturas_mes_actual');

    if (updateErr) {
      console.error('Error actualizando capturas_mes_actual en claimRewardCreditAction:', updateErr);
      return { error: 'Error al aplicar el crédito de receta en la base de datos.' };
    }

    // Revalidación obligatoria de rutas según Fase 6.5
    revalidatePath('/recipes', 'page');
    revalidatePath('/billing', 'page');
    revalidatePath('/', 'layout');
    revalidatePath('/recipes', 'layout');
    revalidatePath('/settings', 'page');

    return {
      success: true,
      remainingUsed: nuevoConteo,
    };
  } catch (err) {
    console.error('Error inesperado en claimRewardCreditAction:', err);
    return { error: 'Error inesperado al reclamar el crédito publicitario.' };
  }
}

