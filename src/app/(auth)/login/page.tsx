'use client';

import { Suspense, useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChefHat, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { loginAction, AuthActionResult } from '@/app/actions/auth';

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/recipes';
  const callbackError = searchParams.get('error');

  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    loginAction,
    null
  );

  return (
    <div className="w-full max-w-md space-y-8 relative z-10">
      {/* Cabecera / Marca */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] shadow-xs">
          <ChefHat className="w-7 h-7" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 font-serif-recipe">
          Iniciar Sesión
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-xs mx-auto">
          Accede a tu recetario inteligente y cuaderno de cocina
        </p>
      </div>

      {/* Tarjeta del formulario en lino blanco */}
      <div className="p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-6">
        {/* Mensajes de error */}
        {(state?.error || callbackError) && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>
              {state?.error ||
                (callbackError === 'auth_callback_failed'
                  ? 'No se pudo verificar el enlace de autenticación. Inténtalo de nuevo.'
                  : callbackError)}
            </span>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {/* Campo Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-stone-700 tracking-wide"
            >
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="chef@gastronomia.com"
                className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-stone-700 tracking-wide"
            >
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••••••"
                className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition"
              />
            </div>
          </div>

          {/* Botón de Enviar */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full min-h-[50px] mt-2 py-3 px-4 rounded-2xl font-semibold text-sm sm:text-base text-white bg-[#a86224] hover:bg-[#8e511c] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <span>Entrar al Recetario</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Enlace a Registro */}
        <div className="pt-4 border-t border-[#e7dfd5] text-center">
          <p className="text-xs sm:text-sm text-stone-600">
            ¿Aún no tienes cuenta?{' '}
            <Link
              href="/register"
              className="font-semibold text-[#a86224] hover:underline"
            >
              Crear cuenta de Chef
            </Link>
          </p>
        </div>
      </div>

      {/* Volver a inicio */}
      <div className="text-center">
        <Link
          href="/"
          className="text-xs sm:text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          ← Volver a la portada
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 rounded-3xl bg-white border border-[#e7dfd5] animate-pulse text-center text-xs text-stone-400">
            Cargando acceso al recetario...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
