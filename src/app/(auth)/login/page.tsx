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
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/5">
          <ChefHat className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white font-serif-recipe">
          Iniciar Sesión
        </h1>
        <p className="text-xs text-stone-400 max-w-xs mx-auto">
          Accede a tu recetario inteligente, registro de cocinados y motor nutricional clínico.
        </p>
      </div>

      {/* Tarjeta del formulario */}
      <div className="p-8 rounded-3xl bg-charcoal-900/90 border border-charcoal-700/80 shadow-2xl backdrop-blur-xl space-y-6">
        {/* Mensajes de error */}
        {(state?.error || callbackError) && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
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
              className="block text-xs font-medium text-stone-300 tracking-wide"
            >
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="chef@gastronomia.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-charcoal-950 border border-charcoal-700 text-stone-100 placeholder-stone-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/80 transition duration-150"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-stone-300 tracking-wide"
            >
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-charcoal-950 border border-charcoal-700 text-stone-100 placeholder-stone-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/80 transition duration-150"
              />
            </div>
          </div>

          {/* Botón de Enviar */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-2 py-3 px-4 rounded-xl font-medium text-sm text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
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
        <div className="pt-4 border-t border-charcoal-700/60 text-center">
          <p className="text-xs text-stone-400">
            ¿Aún no tienes cuenta?{' '}
            <Link
              href="/register"
              className="font-semibold text-amber-400 hover:text-amber-300 transition-colors"
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
          className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
        >
          ← Volver a la portada
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Glow de ambientación gastronómica */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 rounded-3xl bg-charcoal-900 border border-charcoal-700 animate-pulse text-center text-xs text-stone-400">
            Cargando acceso al recetario...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
