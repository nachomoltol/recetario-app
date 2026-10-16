import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: Evitar lógica entre createServerClient y getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/register');
  const isPublicRoute =
    path === '/' ||
    path.startsWith('/auth') ||
    path.startsWith('/update-password') ||
    path.startsWith('/api/stripe/webhook') ||
    path.startsWith('/share-target') ||
    path.startsWith('/robots.txt') ||
    path.startsWith('/sitemap.xml') ||
    path.startsWith('/manifest.json') ||
    path.startsWith('/sw.js') ||
    path.startsWith('/icons');

  // Detectar si la petición contiene parámetros de recuperación de cuenta o autenticación
  const isRecoveryIntent =
    request.nextUrl.searchParams.get('type') === 'recovery' ||
    request.nextUrl.searchParams.has('token_hash') ||
    request.nextUrl.searchParams.get('next') === '/update-password';

  // 1. Si no hay usuario y no es una ruta pública ni de login/registro, redirigir a /login
  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', path);
    return NextResponse.redirect(url);
  }

  // 2. Si el usuario ya está autenticado e intenta entrar a login, registro o raíz, redirigir al recetario
  // IMPORTANTE: Si la petición tiene intención de recuperación (recovery token/code), NO interceptar para no bloquear el paso a /update-password
  if (user && (isAuthRoute || path === '/') && !isRecoveryIntent) {
    const url = request.nextUrl.clone();
    url.pathname = '/recipes';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
