'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, Lock, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setIsPending(false);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 1500);
      }
    } catch (err: any) {
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
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
