'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { ChefHat, ArrowRight, Lock, Mail, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { registerAction, AuthActionResult } from '@/app/actions/auth';

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    registerAction,
    null
  );

  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Glow de ambientación gastronómica */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Cabecera / Marca */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/5">
            <ChefHat className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-serif-recipe">
            Crear Nueva Cuenta
          </h1>
          <p className="text-xs text-stone-400 max-w-xs mx-auto">
            Comienza a estandarizar tus recetas, registrar cocinados y calcular balances nutricionales.
          </p>
        </div>

        {/* Tarjeta del formulario */}
        <div className="p-8 rounded-3xl bg-charcoal-900/90 border border-charcoal-700/80 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Mensaje de éxito si requiere verificación de email */}
          {state?.success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-200">¡Registro completado!</p>
                <p className="mt-1 text-emerald-300/90">{state.message}</p>
              </div>
            </div>
          )}

          {/* Mensajes de error */}
          {state?.error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{state.error}</span>
            </div>
          )}

          {!state?.success && (
            <form action={formAction} className="space-y-4">
              {/* Campo Nombre */}
              <div className="space-y-1.5">
                <label
                  htmlFor="nombre"
                  className="block text-xs font-medium text-stone-300 tracking-wide"
                >
                  Nombre de Cocinero / Chef
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    autoComplete="name"
                    placeholder="Ignacio Moltó"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-charcoal-950 border border-charcoal-700 text-stone-100 placeholder-stone-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/80 transition duration-150"
                  />
                </div>
              </div>

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
                  Contraseña (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
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
                    <span>Creando perfil...</span>
                  </>
                ) : (
                  <>
                    <span>Registrarse y Empezar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Enlace a Login */}
          <div className="pt-4 border-t border-charcoal-700/60 text-center">
            <p className="text-xs text-stone-400">
              ¿Ya tienes una cuenta?{' '}
              <Link
                href="/login"
                className="font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                Inicia sesión aquí
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
    </div>
  );
}
