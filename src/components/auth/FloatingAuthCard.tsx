'use client';

import { useState, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, ArrowRight, Lock, Mail, User, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { loginAction, registerAction, AuthActionResult } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/client';
import { useLanguageStore } from '@/stores/useLanguageStore';

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
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

  // Redirigir a /update-password si se detecta un enlace o evento de recuperación
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes('type=recovery') || search.includes('type=recovery')) {
        router.replace('/update-password');
        return;
      }
    }

    const supabase = createClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/update-password');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, [router]);

  // Estados de recuperación de contraseña
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetPending, setIsResetPending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [loginState, loginFormAction, isLoginPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(loginAction, null);

  const [registerState, registerFormAction, isRegisterPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(registerAction, null);

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resetEmail) return;

    setResetError(null);
    setIsResetPending(true);

    try {
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${origin}/auth/callback?next=/update-password`,
      });

      if (error) {
        setResetError(error.message);
      } else {
        setResetSent(true);
      }
    } catch (err: any) {
      setResetError(err?.message || 'Error inesperado al enviar el correo.');
    } finally {
      setIsResetPending(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 animate-fade-in">
      {/* Cabecera / Marca */}
      <div className="text-center space-y-2.5">
        <div className="flex justify-center">
          <img
            src="/miga-logo.svg"
            alt="Logo Miga"
            className="h-12 sm:h-14 w-auto max-w-[180px] object-contain"
          />
        </div>
        <div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-light">
            Recetas de redes y estandarización culinaria con IA
          </p>
        </div>
      </div>

      {/* Tarjeta Flotante Orgánica */}
      <div className="p-7 sm:p-9 rounded-[2rem] bg-white border border-[#e7dfd5] shadow-xl shadow-stone-200/60 space-y-6">
        {/* ===================== VISTA DE RECUPERACIÓN DE CONTRASEÑA ===================== */}
        {showForgotPassword ? (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSent(false);
                  setResetError(null);
                }}
                className="p-1.5 -ml-1.5 rounded-xl hover:bg-[#faf7f2] text-stone-600 hover:text-stone-900 transition cursor-pointer"
                title={t('auth_back_to_login')}
              >
                <ArrowLeft className="w-4 h-4 text-[#a86224]" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-stone-900 font-serif-recipe">
                  {t('auth_reset_title')}
                </h2>
                <p className="text-xs text-stone-500 font-light">
                  {t('auth_reset_desc')}
                </p>
              </div>
            </div>

            {resetSent ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                  <p className="leading-relaxed">
                    {t('auth_reset_success')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSent(false);
                  }}
                  className="w-full min-h-[46px] py-2.5 px-4 rounded-2xl font-semibold text-xs sm:text-sm text-stone-700 bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] transition cursor-pointer"
                >
                  {t('auth_back_to_login')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetError && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="reset-email"
                    className="block text-xs font-semibold text-stone-700 tracking-wide"
                  >
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reset-email"
                      name="email"
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="chef@gastronomia.com"
                      className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isResetPending}
                  className="w-full min-h-[50px] mt-2 py-3 px-4 rounded-2xl font-semibold text-sm sm:text-base text-white bg-[#a86224] hover:bg-[#8e511c] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isResetPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('auth_reset_sending')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('auth_reset_btn')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
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
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-semibold text-stone-700 tracking-wide"
                      >
                        Contraseña
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs font-semibold text-[#a86224] hover:text-[#8e511c] hover:underline cursor-pointer"
                      >
                        {t('auth_forgot_password')}
                      </button>
                    </div>
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
      </>
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
