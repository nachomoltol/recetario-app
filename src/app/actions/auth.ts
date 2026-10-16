'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export interface AuthActionResult {
  error?: string;
  success?: boolean;
  message?: string;
}

export async function loginAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = (formData.get('redirectTo') as string) || '/recipes';

  if (!email || !password) {
    return { error: 'Por favor, ingresa tu correo electrónico y contraseña.' };
  }

  let shouldRedirect = false;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        error:
          error.message === 'Invalid login credentials'
            ? 'Credenciales incorrectas. Verifica tu email y contraseña.'
            : String(error.message || 'Error al iniciar sesión.'),
      };
    }

    shouldRedirect = true;
  } catch (err: any) {
    console.error('Error no controlado en loginAction:', err);
    return {
      error: typeof err?.message === 'string' ? err.message : 'Error inesperado del servidor al iniciar sesión.',
    };
  }

  if (shouldRedirect) {
    revalidatePath('/', 'layout');
    redirect(redirectTo);
  }

  return {};
}

export async function registerAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const nombre = formData.get('nombre') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'El email y la contraseña son obligatorios.' };
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  let shouldRedirect = false;
  let confirmEmailMessage: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: nombre || splitEmail(email),
          full_name: nombre || splitEmail(email),
        },
      },
    });

    if (error) {
      return { error: String(error.message || 'Error al registrar la cuenta.') };
    }

    // Si Supabase requiere confirmación por email y la sesión no es inmediata
    if (data.user && (!data.session || data.user.identities?.length === 0)) {
      confirmEmailMessage =
        'Cuenta creada con éxito. Por favor, revisa tu correo electrónico para confirmar tu cuenta.';
    } else {
      shouldRedirect = true;
    }
  } catch (err: any) {
    console.error('Error no controlado en registerAction:', err);
    return {
      error: typeof err?.message === 'string' ? err.message : 'Error inesperado del servidor al registrar la cuenta.',
    };
  }

  if (confirmEmailMessage) {
    return {
      success: true,
      message: confirmEmailMessage,
    };
  }

  if (shouldRedirect) {
    revalidatePath('/', 'layout');
    redirect('/recipes');
  }

  return {};
}

export async function updatePasswordAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  try {
    const password = (formData.get('password') as string) || '';
    const confirmPassword = (formData.get('confirmPassword') as string) || '';

    if (!password || password.length < 6) {
      return { error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    if (confirmPassword && password !== confirmPassword) {
      return { error: 'Las contraseñas no coinciden.' };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        error:
          'No se encontró una sesión activa válida o el enlace ha caducado. Por favor, solicita un nuevo enlace de recuperación.',
      };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      return { error: String(updateError.message || 'No se pudo actualizar la contraseña.') };
    }

    revalidatePath('/', 'layout');
    return {
      success: true,
      message: '¡Contraseña actualizada con éxito!',
    };
  } catch (err: any) {
    console.error('Error no controlado en updatePasswordAction:', err);
    return {
      error: typeof err?.message === 'string' ? err.message : 'Error inesperado del servidor al actualizar la contraseña.',
    };
  }
}

export async function signOutAction(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (e) {
    console.error('Error al cerrar sesión:', e);
  }
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function deleteAccountAction(): Promise<AuthActionResult> {
  try {
    const userClient = await createClient();
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return { error: 'No se encontró una sesión activa.' };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Falta SUPABASE_SERVICE_ROLE_KEY para eliminar usuario.');
      return { error: 'Error de configuración del servidor al eliminar la cuenta.' };
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Eliminar datos asociados del usuario en la base de datos
    try {
      await adminClient.from('diario_cocinados').delete().eq('usuario_id', user.id);
      await adminClient.from('recetas').delete().eq('usuario_id', user.id);
      await adminClient.from('usuarios').delete().eq('id', user.id);
    } catch (cleanupErr) {
      console.warn('Advertencia durante la limpieza de datos del usuario:', cleanupErr);
    }

    // 2. Eliminar al usuario de Supabase Auth usando el API admin
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      console.error('Error al eliminar usuario en auth.admin:', deleteAuthError);
      return { error: deleteAuthError.message };
    }

    // 3. Cerrar sesión en el cliente y purgar cookies de sesión
    await userClient.auth.signOut();
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (error: any) {
    console.error('Excepción en deleteAccountAction:', error);
    return { error: error?.message || 'Error inesperado al eliminar la cuenta.' };
  }
}

function splitEmail(email: string): string {
  return email.split('@')[0] || 'Cocinero';
}
