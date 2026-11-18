'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createServerUserClient, getAdminClient } from '@/lib/supabase/server';

export interface RedeemVipResult {
  success?: boolean;
  error?: string;
}

/**
 * Server Action para canje de códigos VIP administrativos protegidos.
 * Valida estrictamente contra la variable de entorno del servidor ADMIN_VIP_SECRET.
 * Se han eliminado todos los códigos de prueba en texto plano (NACHOVIP, RESET0, etc.).
 */
export async function redeemVipCodeAction(code: string): Promise<RedeemVipResult> {
  try {
    const userClient = await createServerUserClient();
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return { error: 'Debes iniciar sesión para canjear un código VIP.' };
    }

    const cleanCode = (code || '').trim();
    const adminVipSecret = process.env.ADMIN_VIP_SECRET?.trim();

    if (!adminVipSecret || cleanCode !== adminVipSecret) {
      return { error: 'Código inválido o no disponible.' };
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      console.error('[subscription] Falta SUPABASE_SERVICE_ROLE_KEY válida para canjear código.');
      return { error: 'Error de configuración del servidor al procesar el código.' };
    }

    const { data: updatedRows, error: updateError } = await adminClient
      .from('usuarios')
      .update({
        plan_suscripcion: 'pro',
        capturas_mes_actual: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select();

    if (updateError) {
      console.error('Error al actualizar plan en usuarios:', updateError);
      return { error: 'No se pudo actualizar el plan en el servidor.' };
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.warn('La actualización devolvió 0 filas para el usuario:', user.id);
      return { error: 'No se pudo aplicar el plan en la base de datos.' };
    }

    // Revalidar cachés de rutas afectadas
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
