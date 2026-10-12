'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FloatingAuthCard } from '@/components/auth/FloatingAuthCard';

function LoginContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/recipes';
  const callbackError = searchParams.get('error');

  return (
    <FloatingAuthCard
      initialTab="login"
      redirectTo={redirectTo}
      callbackError={callbackError}
    />
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#faf7f2] flex flex-col justify-center items-center px-4 py-8 sm:px-6">
      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 rounded-3xl bg-white border border-[#e7dfd5] animate-pulse text-center text-xs text-stone-400">
            Cargando acceso al recetario...
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </main>
  );
}
