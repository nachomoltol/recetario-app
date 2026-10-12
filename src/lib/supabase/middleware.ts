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
    path.startsWith('/share-target') ||
    path.startsWith('/robots.txt') ||
    path.startsWith('/sitemap.xml') ||
    path.startsWith('/manifest.json') ||
    path.startsWith('/sw.js') ||
    path.startsWith('/icons');

  // 1. Si no hay usuario y no es una ruta pública ni de login/registro, redirigir a /login
  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', path);
    return NextResponse.redirect(url);
  }

  // 2. Si el usuario ya está autenticado e intenta entrar a login, registro o raíz, redirigir al recetario
  if (user && (isAuthRoute || path === '/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/recipes';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
