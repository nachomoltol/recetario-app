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
    <div className="min-h-screen bg-[#faf7f2] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Cabecera / Marca */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] shadow-xs">
            <ChefHat className="w-7 h-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 font-serif-recipe">
            Crear Cuenta
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 max-w-xs mx-auto">
            Comienza a estandarizar tus recetas y registrar tus cocinados
          </p>
        </div>

        {/* Tarjeta del formulario en lino blanco */}
        <div className="p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-6">
          {/* Mensaje de éxito si requiere verificación de email */}
          {state?.success && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-semibold">¡Registro completado!</p>
                <p className="mt-1 text-stone-600">{state.message}</p>
              </div>
            </div>
          )}

          {/* Mensajes de error */}
          {state?.error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <span>{state.error}</span>
            </div>
          )}

          {!state?.success && (
            <form action={formAction} className="space-y-4">
              {/* Campo Nombre */}
              <div className="space-y-1.5">
                <label
                  htmlFor="nombre"
                  className="block text-xs font-semibold text-stone-700 tracking-wide"
                >
                  Nombre de Cocinero / Chef
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    autoComplete="name"
                    placeholder="Ignacio Moltó"
                    className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition"
                  />
                </div>
              </div>

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
                  Contraseña (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
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
          <div className="pt-4 border-t border-[#e7dfd5] text-center">
            <p className="text-xs sm:text-sm text-stone-600">
              ¿Ya tienes una cuenta?{' '}
              <Link
                href="/login"
                className="font-semibold text-[#a86224] hover:underline"
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
            className="text-xs sm:text-sm text-stone-500 hover:text-stone-800 transition-colors"
          >
            ← Volver a la portada
          </Link>
        </div>
      </div>
    </div>
  );
}
