import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FloatingAuthCard } from '@/components/auth/FloatingAuthCard';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const code = typeof params?.code === 'string' ? params.code : undefined;
  const token_hash = typeof params?.token_hash === 'string' ? params.token_hash : undefined;
  const type = typeof params?.type === 'string' ? params.type : undefined;
  const next = typeof params?.next === 'string' ? params.next : undefined;

  // Si la raíz recibe parámetros de autenticación / recuperación (code o token_hash),
  // reenviar de inmediato a /auth/callback para que intercambie la sesión y redirija
  if (code || token_hash) {
    const callbackParams = new URLSearchParams();
    if (code) callbackParams.set('code', code);
    if (token_hash) callbackParams.set('token_hash', token_hash);
    if (type) callbackParams.set('type', type);
    if (type === 'recovery' || next === '/update-password') {
      callbackParams.set('next', '/update-password');
    } else if (next) {
      callbackParams.set('next', next);
    }
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  // Si la petición a la raíz indica recuperación directa
  if (type === 'recovery') {
    redirect('/update-password');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si ya está autenticado, redirigir directamente al panel de recetas
  if (user) {
    redirect('/recipes');
  }

  return (
    <main className="min-h-screen bg-[#faf7f2] flex flex-col justify-center items-center px-4 py-8 sm:px-6">
      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 rounded-3xl bg-white border border-[#e7dfd5] animate-pulse text-center text-xs text-stone-400">
            Cargando acceso al recetario...
          </div>
        }
      >
        <FloatingAuthCard initialTab="login" />
      </Suspense>
    </main>
  );
}
