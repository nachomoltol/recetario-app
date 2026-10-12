import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FloatingAuthCard } from '@/components/auth/FloatingAuthCard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
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
