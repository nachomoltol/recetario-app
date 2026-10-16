'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChefHat, Lock, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updatePasswordAction } from '@/app/actions/auth';
import { useLanguageStore } from '@/stores/useLanguageStore';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Estados de verificación de sesión
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    const verifySessionOrToken = async () => {
      try {
        if (typeof window === 'undefined') return;

        const url = new URL(window.location.href);
        const token_hash = url.searchParams.get('token_hash');
        const type = url.searchParams.get('type');
        const code = url.searchParams.get('code');
        const errorParam = url.searchParams.get('error_description') || url.searchParams.get('error');

        if (errorParam) {
          if (isMounted) {
            setSessionError(decodeURIComponent(errorParam));
            setHasSession(false);
            setIsCheckingSession(false);
          }
          return;
        }

        // 1. Si la URL contiene token_hash y type, verificar OTP directamente
        if (token_hash && type) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });

          if (!otpError) {
            if (isMounted) {
              setHasSession(true);
              setIsCheckingSession(false);
            }
            return;
          }
        }

        // 2. Si la URL contiene código PKCE
        if (code) {
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!codeError) {
            if (isMounted) {
              setHasSession(true);
              setIsCheckingSession(false);
            }
            return;
          }
        }

        // 3. Comprobar sesión existente
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (isMounted) {
            setHasSession(true);
            setIsCheckingSession(false);
          }
          return;
        }

        // 4. Suscribirse a eventos por si la sesión se procesa a través del hash (#access_token=...)
        const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (newSession && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            if (isMounted) {
              setHasSession(true);
              setIsCheckingSession(false);
            }
          }
        });

        // Margen de espera para procesar fragmentos hash si existieran
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (isMounted) {
            if (retrySession) {
              setHasSession(true);
            } else {
              setHasSession(false);
              setSessionError(
                'No se encontró una sesión activa o el enlace de recuperación ha caducado. Por favor, solicita uno nuevo.'
              );
            }
            setIsCheckingSession(false);
          }
        }, 1000);

        return () => {
          authListener?.subscription?.unsubscribe?.();
        };
      } catch (err: any) {
        console.error('Error verificando sesión en update-password:', err);
        if (isMounted) {
          setHasSession(false);
          setSessionError('No se pudo verificar el enlace de recuperación.');
          setIsCheckingSession(false);
        }
      }
    };

    verifySessionOrToken();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t('auth_password_min_length'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth_passwords_mismatch'));
      return;
    }

    setIsPending(true);

    try {
      const formData = new FormData();
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);

      // 1. Invocar Server Action protegida
      const result = await updatePasswordAction(null, formData);

      if (result?.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
        return;
      }

      // 2. Si la Server Action devolvió error, intentar cliente como fallback de sesión
      const supabase = createClient();
      const { error: clientError } = await supabase.auth.updateUser({
        password,
      });

      if (!clientError) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        setError(result?.error || clientError.message || 'Error al actualizar la contraseña');
        setIsPending(false);
      }
    } catch (err: any) {
      console.error('Error en handleSubmit update-password:', err);
      setError(err?.message || 'Error inesperado al actualizar la contraseña');
      setIsPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#faf7f2] flex flex-col justify-center items-center px-4 py-8 sm:px-6">
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
              {t('auth_update_password_desc')}
            </p>
          </div>
        </div>

        {/* Tarjeta Flotante */}
        <div className="p-7 sm:p-9 rounded-[2rem] bg-white border border-[#e7dfd5] shadow-xl shadow-stone-200/60 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-stone-900 font-serif-recipe">
              {t('auth_update_password_title')}
            </h2>
            <p className="text-xs text-stone-500 font-light">
              {t('auth_update_password_desc')}
            </p>
          </div>

          {/* Estado de carga verificando sesión */}
          {isCheckingSession && (
            <div className="py-8 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#a86224] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-stone-500">
                Verificando enlace de recuperación...
              </p>
            </div>
          )}

          {/* Enlace no válido / Sin sesión activa */}
          {!isCheckingSession && !hasSession && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Enlace inválido o expirado</p>
                  <p className="text-red-700 leading-relaxed font-light">
                    {sessionError ||
                      'El enlace para restablecer la contraseña ha caducado o ya ha sido utilizado. Por favor, solicita uno nuevo.'}
                  </p>
                </div>
              </div>

              <Link
                href="/login"
                className="w-full min-h-[48px] py-2.5 px-4 rounded-2xl font-semibold text-xs sm:text-sm text-stone-700 bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <span>{t('auth_back_to_login')}</span>
                <ArrowRight className="w-4 h-4 text-[#a86224]" />
              </Link>
            </div>
          )}

          {/* Formulario habilitado si la sesión es válida */}
          {!isCheckingSession && hasSession && (
            <>
              {success ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                    <p className="font-semibold leading-relaxed">
                      {t('auth_update_password_success')}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Nueva Contraseña */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="new-password"
                      className="block text-xs font-semibold text-stone-700 tracking-wide"
                    >
                      {t('auth_new_password')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="new-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full min-h-[48px] pl-10 pr-11 py-2.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar Contraseña */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="confirm-password"
                      className="block text-xs font-semibold text-stone-700 tracking-wide"
                    >
                      {t('auth_confirm_password')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="confirm-password"
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full min-h-[50px] mt-2 py-3 px-4 rounded-2xl font-semibold text-sm sm:text-base text-white bg-[#a86224] hover:bg-[#8e511c] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('auth_updating_password')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('auth_update_password_btn')}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
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
    </main>
  );
}
