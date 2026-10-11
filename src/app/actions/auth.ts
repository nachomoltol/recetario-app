'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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
          : error.message,
    };
  }

  revalidatePath('/', 'layout');
  redirect(redirectTo);
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
    return { error: error.message };
  }

  // Si Supabase requiere confirmación por email y la sesión no es inmediata
  if (data.user && (!data.session || data.user.identities?.length === 0)) {
    return {
      success: true,
      message: 'Cuenta creada con éxito. Por favor, revisa tu correo electrónico para confirmar tu cuenta.',
    };
  }

  revalidatePath('/', 'layout');
  redirect('/recipes');
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

function splitEmail(email: string): string {
  return email.split('@')[0] || 'Cocinero';
}
