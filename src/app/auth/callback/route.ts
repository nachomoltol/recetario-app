import { NextResponse } from 'next/server';
import { type EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  // Si el tipo es recovery, redirigir por defecto a /update-password
  const defaultNext = type === 'recovery' ? '/update-password' : '/recipes';
  const next = searchParams.get('next') ?? defaultNext;

  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const targetBase = !isLocalEnv && forwardedHost ? `https://${forwardedHost}` : origin;

  // Si Supabase devuelve parámetros de error (ej. enlace expirado o acceso denegado)
  const authError = searchParams.get('error');
  const authErrorDesc = searchParams.get('error_description');
  if (authError) {
    console.warn('Error recibido en auth callback desde Supabase:', authError, authErrorDesc);
    return NextResponse.redirect(
      `${targetBase}/login?error=${encodeURIComponent(authError)}&message=${encodeURIComponent(authErrorDesc || 'El enlace es inválido o ha expirado.')}`
    );
  }

  try {
    const supabase = await createClient();

    // 1. Manejo con token_hash y type (enlaces directos de verificación y recovery de Supabase)
    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      });

      if (!error) {
        // Si el tipo es recovery, redirigir obligatoriamente a /update-password
        if (type === 'recovery') {
          return NextResponse.redirect(new URL('/update-password', request.url));
        }
        return NextResponse.redirect(`${targetBase}${next}`);
      }

      console.error('Error al verificar OTP en callback:', error.message);
      return NextResponse.redirect(
        `${targetBase}/login?error=auth_callback_failed&message=${encodeURIComponent(error.message)}`
      );
    }

    // 2. Manejo con código PKCE tradicional
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        // Si el tipo es recovery o el destino solicitado es update-password, forzar redirección
        if (type === 'recovery' || next === '/update-password') {
          return NextResponse.redirect(new URL('/update-password', request.url));
        }
        return NextResponse.redirect(`${targetBase}${next}`);
      }

      console.error('Error al intercambiar código PKCE en callback:', error.message);
      return NextResponse.redirect(
        `${targetBase}/login?error=auth_callback_failed&message=${encodeURIComponent(error.message)}`
      );
    }

    // 3. Si viene únicamente type=recovery pero ya existe sesión activa
    if (type === 'recovery') {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        return NextResponse.redirect(new URL('/update-password', request.url));
      }
    }

    // Si no vino ni code ni token_hash
    return NextResponse.redirect(`${targetBase}/login?error=auth_callback_missing_params`);
  } catch (err: any) {
    console.error('Excepción no controlada en auth callback:', err);
    return NextResponse.redirect(
      `${targetBase}/login?error=auth_callback_failed&message=${encodeURIComponent(err?.message || 'Error del servidor')}`
    );
  }
}
