'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface RedeemVipResult {
  success?: boolean;
  error?: string;
}

export async function redeemVipCodeAction(code: string): Promise<RedeemVipResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Debes iniciar sesión para canjear un código VIP.' };
    }

    const cleanCode = (code || '').trim().toUpperCase();

    if (cleanCode !== 'NACHOVIP') {
      return { error: 'Código inválido' };
    }

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({
        plan_suscripcion: 'pro',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error al actualizar plan a PRO en usuarios:', updateError);
      return { error: 'No se pudo activar la suscripción en el servidor.' };
    }

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
