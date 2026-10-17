'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createServerUserClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
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

    if (cleanCode !== 'NACHOVIP') {
      return { error: 'Código inválido' };
    }

    // 2. Uso de Cliente de Administrador (Service Role) para saltarse RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Faltan variables de entorno para el cliente Administrador de Supabase.');
      return { error: 'Error de configuración del servidor' };
    }

    const adminClient = createAdminClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 3. Verificación Estricta de Filas Modificadas con .select()
    const { data: updatedRows, error: updateError } = await adminClient
      .from('usuarios')
      .update({
        plan_suscripcion: 'pro',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select();

    if (updateError) {
      console.error('Error al actualizar plan a PRO en usuarios:', updateError);
      return { error: 'No se pudo activar la suscripción en el servidor.' };
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let targetClient = userClient;
    if (supabaseUrl && serviceRoleKey) {
      targetClient = createAdminClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }) as any;
    }

    const { data: usuario, error: fetchErr } = await targetClient
      .from('usuarios')
      .select('id, capturas_mes_actual, plan_suscripcion')
      .eq('id', user.id)
      .single();

    if (fetchErr || !usuario) {
      console.error('Error al obtener usuario en claimRewardCreditAction:', fetchErr);
      return { error: 'No se pudo obtener el perfil de usuario.' };
    }

    // Sumar 1 crédito: al restar 1 a capturas_mes_actual, se permite generar 1 receta adicional
    const nuevoConteo = Math.max(0, (usuario.capturas_mes_actual || 0) - 1);

    const { error: updateErr } = await targetClient
      .from('usuarios')
      .update({
        capturas_mes_actual: nuevoConteo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateErr) {
      console.error('Error actualizando capturas_mes_actual en claimRewardCreditAction:', updateErr);
      return { error: 'Error al aplicar el crédito de receta en la base de datos.' };
    }

    // Revalidar cachés de rutas
    revalidatePath('/', 'layout');
    revalidatePath('/recipes', 'page');
    revalidatePath('/billing', 'page');
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

