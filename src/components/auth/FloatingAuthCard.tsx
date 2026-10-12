'use client';

import { useState, useActionState } from 'react';
import { ChefHat, ArrowRight, Lock, Mail, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { loginAction, registerAction, AuthActionResult } from '@/app/actions/auth';

interface FloatingAuthCardProps {
  initialTab?: 'login' | 'register';
  redirectTo?: string;
  callbackError?: string | null;
}

export function FloatingAuthCard({
  initialTab = 'login',
  redirectTo = '/recipes',
  callbackError = null,
}: FloatingAuthCardProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

  const [loginState, loginFormAction, isLoginPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(loginAction, null);

  const [registerState, registerFormAction, isRegisterPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(registerAction, null);

  return (
    <div className="w-full max-w-md mx-auto space-y-6 animate-fade-in">
      {/* Cabecera / Marca */}
      <div className="text-center space-y-2.5">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-[#e7dfd5] text-[#a86224] shadow-xs">
          <ChefHat className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 font-serif-recipe">
            Recetario Inteligente
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-light">
            Estandarización culinaria y extracción con IA multimodal
          </p>
        </div>
      </div>

      {/* Tarjeta Flotante Orgánica */}
      <div className="p-7 sm:p-9 rounded-[2rem] bg-white border border-[#e7dfd5] shadow-xl shadow-stone-200/60 space-y-6">
        {/* Selector de Pestañas Iniciar Sesión / Registro */}
        <div className="flex bg-[#faf7f2] p-1.5 rounded-2xl border border-[#e7dfd5]">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-white text-stone-900 shadow-xs border border-[#e7dfd5]'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-white text-stone-900 shadow-xs border border-[#e7dfd5]'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <span>Crear Cuenta</span>
          </button>
        </div>

        {/* ===================== FORMULARIO DE LOGIN ===================== */}
        {activeTab === 'login' && (
          <div className="space-y-4 animate-fade-in">
            {/* Mensajes de error en Login */}
            {(loginState?.error || callbackError) && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>
                  {loginState?.error ||
                    (callbackError === 'auth_callback_failed'
                      ? 'No se pudo verificar la sesión. Inténtalo de nuevo.'
                      : callbackError)}
                </span>
              </div>
            )}

            <form action={loginFormAction} className="space-y-4">
              <input type="hidden" name="redirectTo" value={redirectTo} />

              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-stone-700 tracking-wide"
                >
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="chef@gastronomia.com"
                    className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-stone-700 tracking-wide"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••••"
                    className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoginPending}
                className="w-full min-h-[50px] mt-2 py-3 px-4 rounded-2xl font-semibold text-sm sm:text-base text-white bg-[#a86224] hover:bg-[#8e511c] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoginPending ? (
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
          </div>
        )}

        {/* ===================== FORMULARIO DE REGISTRO ===================== */}
        {activeTab === 'register' && (
          <div className="space-y-4 animate-fade-in">
            {registerState?.success && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-semibold">¡Registro completado!</p>
                  <p className="mt-1 text-stone-600 leading-relaxed">{registerState.message}</p>
                </div>
              </div>
            )}

            {registerState?.error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{registerState.error}</span>
              </div>
            )}

            {!registerState?.success && (
              <form action={registerFormAction} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="reg-nombre"
                    className="block text-xs font-semibold text-stone-700 tracking-wide"
                  >
                    Nombre de Chef
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-nombre"
                      name="nombre"
                      type="text"
                      autoComplete="name"
                      placeholder="Ignacio Moltó"
                      className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-semibold text-stone-700 tracking-wide"
                  >
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="chef@gastronomia.com"
                      className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-semibold text-stone-700 tracking-wide"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-password"
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

                <button
                  type="submit"
                  disabled={isRegisterPending}
                  className="w-full min-h-[50px] mt-2 py-3 px-4 rounded-2xl font-semibold text-sm sm:text-base text-white bg-[#a86224] hover:bg-[#8e511c] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isRegisterPending ? (
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
          </div>
        )}
      </div>

      {/* Pie de página discreto */}
      <div className="text-center">
        <p className="text-[11px] text-stone-400">
          Recetario App &copy; 2026 · Minimalismo Luminoso Lino/Terracotta
        </p>
      </div>
    </div>
  );
}
