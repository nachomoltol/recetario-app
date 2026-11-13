'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  X,
  Lock,
  HeartPulse,
  Ticket,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  CalendarDays,
  Palette,
  FileDown,
  Globe,
} from 'lucide-react';
import { redeemVipCodeAction } from '@/app/actions/subscription';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { isNativeMobilePlatform, isNativeIosPlatform } from '@/lib/admob/admobService';

export interface ProSubscriptionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onVipSuccess?: () => void;
  onSubscribe?: () => void;
  context?: 'limit_reached' | 'feature_locked';
  pendingUrl?: string;
  title?: string;
  description?: string;
  highlightCulinaryLevels?: boolean;
}

export function ProSubscriptionModal({
  isOpen = true,
  onClose,
  onVipSuccess,
  onSubscribe,
  context = 'feature_locked',
  title,
  description,
  highlightCulinaryLevels = false,
}: ProSubscriptionModalProps) {
  const router = useRouter();
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);
  const profileFromStore = useProfileStore((s) => s.profile);

  const [vipCode, setVipCode] = useState('');
  const [isVipValidating, setIsVipValidating] = useState(false);
  const [vipSuccess, setVipSuccess] = useState(
    (profileFromStore?.plan_suscripcion || '').trim().toLowerCase() === 'pro'
  );
  const [vipError, setVipError] = useState<string | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isNativeMobile, setIsNativeMobile] = useState(false);
  const [isNativeIos, setIsNativeIos] = useState(false);

  useEffect(() => {
    setIsNativeMobile(isNativeMobilePlatform());
    setIsNativeIos(isNativeIosPlatform());
  }, []);

  useEffect(() => {
    setVipSuccess(
      (profileFromStore?.plan_suscripcion || '').trim().toLowerCase() === 'pro'
    );
  }, [profileFromStore?.plan_suscripcion]);

  // Manejar tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRedeemVip = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = vipCode.trim().toUpperCase();

    if (!cleanCode) {
      setVipError(language === 'en' ? 'Please enter a code.' : 'Por favor introduce un código.');
      return;
    }

    setIsVipValidating(true);
    setVipError(null);

    try {
      const res = await redeemVipCodeAction(cleanCode);
      setIsVipValidating(false);

      if (res.success) {
        const isReset = cleanCode === 'RESETFREE' || cleanCode === 'FREE' || cleanCode === 'FREE5' || cleanCode === 'RESET0';
        if (isReset) {
          setVipSuccess(false);
          const curr = useProfileStore.getState().profile;
          if (curr) {
            useProfileStore.getState().setProfile({ ...curr, plan_suscripcion: 'gratis' });
          }
          router.refresh();
        } else {
          setVipSuccess(true);
          const curr = useProfileStore.getState().profile;
          if (curr) {
            useProfileStore.getState().setProfile({ ...curr, plan_suscripcion: 'pro' });
          }
          router.refresh();
        }
        if (onVipSuccess) {
          onVipSuccess();
        }
      } else {
        setVipError(
          res.error ||
            (language === 'en'
              ? 'Invalid or expired code. Please try again.'
              : 'Código no válido o caducado. Prueba de nuevo.')
        );
      }
    } catch {
      setIsVipValidating(false);
      setVipError(language === 'en' ? 'Error connecting to server.' : 'Error al conectar con el servidor.');
    }
  };

  const handleSubscribeClick = async () => {
    if (isNativeMobile) {
      return;
    }

    if (onSubscribe) {
      onSubscribe();
      return;
    }

    setIsCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setIsCheckoutLoading(false);
        setCheckoutError(
          data.error ||
            (language === 'en'
              ? 'Could not connect with Stripe.'
              : 'No se pudo conectar con Stripe.')
        );
      }
    } catch (err) {
      console.error('Error al conectar con Stripe Checkout:', err);
      setIsCheckoutLoading(false);
      setCheckoutError(
        language === 'en'
          ? 'Network error connecting to payment gateway.'
          : 'Error de red al conectar con la pasarela de pago.'
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-pro-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-[#faf7f2] border border-[#e7dfd5] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 max-h-[92vh] overflow-y-auto space-y-5 text-stone-900">
        {/* Botón de cierre en la esquina superior */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-300 text-stone-600 hover:text-stone-900 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* 1º. AVISO DESTACADO SI SE ALCANZÓ EL LÍMITE */}
        {context === 'limit_reached' ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-brand-light border-2 border-brand-primary/30 shadow-xs flex items-center gap-3.5 text-left">
            <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary block">
                {t('billing_limit_reached_badge')}
              </span>
              <h3 className="text-sm sm:text-base font-bold font-serif-recipe text-stone-900 leading-snug">
                {t('billing_limit_reached_alert')}
              </h3>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2 pt-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-brand-primary shadow-2xs mb-1">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>

            <h2
              id="modal-pro-title"
              className="text-2xl sm:text-3xl font-bold font-serif-recipe text-stone-900 tracking-tight"
            >
              {title || t('pro_modal_feature_title')}
            </h2>

            <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
              {description || t('pro_modal_feature_desc')}
            </p>

            {highlightCulinaryLevels && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-left pt-2">
                <div className="p-3 rounded-2xl bg-brand-light/90 border border-brand-subtle/90 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🌱</span>
                    <span className="text-xs font-bold font-serif-recipe text-stone-900">
                      {language === 'en' ? 'Beginner (PRO)' : 'Principiante (PRO)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-700 leading-snug font-light">
                    {language === 'en'
                      ? 'Expanded step-by-step guide, sensory cards (color, texture & aroma) and thermal safety.'
                      : 'Relato guiado paso a paso, tarjetas sensoriales (color, textura y aroma) y seguridad térmica.'}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white border border-[#e7dfd5] space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🍳</span>
                    <span className="text-xs font-bold font-serif-recipe text-stone-900">
                      {language === 'en' ? 'Intermediate (PRO)' : 'Intermedio (PRO)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-700 leading-snug font-light">
                    {language === 'en'
                      ? 'Balanced standard technical prose for agile home cooking.'
                      : 'Versión técnica equilibrada y estructurada para cocina diaria ágil.'}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white border border-[#e7dfd5] space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">👨‍🍳</span>
                    <span className="text-xs font-bold font-serif-recipe text-stone-900">
                      {language === 'en' ? 'Advanced (PRO)' : 'Avanzado (PRO)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-700 leading-snug font-light">
                    {language === 'en'
                      ? 'Synthetic, executive restaurant-grade phrasing (sear, deglaze, emulsify).'
                      : 'Prosa sintética y técnica de restaurante (marcar, desglasar, emulsionar).'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2º. TARJETA PLAN PRO MENSUAL (3,50€ / mes) */}
        <div className="p-5 sm:p-7 rounded-3xl bg-white border-2 border-brand-primary shadow-md text-center space-y-4 animate-fade-in relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4efe6] text-brand-primary text-[11px] font-bold tracking-wider uppercase border border-[#e7dfd5]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('billing_plan_name')}</span>
          </div>

          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-4xl sm:text-5xl font-extrabold font-serif-recipe text-stone-900 tracking-tight">
              3,50€
            </span>
            <span className="text-stone-500 font-medium text-sm sm:text-base">
              {t('billing_price_month')}
            </span>
          </div>

          {vipSuccess ? (
            <div className="w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <span>{t('billing_vip_active_banner')}</span>
            </div>
          ) : isNativeMobile ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/90 text-left space-y-2.5">
              <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs sm:text-sm">
                <Globe className="w-4 h-4 text-brand-primary shrink-0" />
                <span>
                  {isNativeIos
                    ? language === 'en'
                      ? 'Extended Features Access'
                      : 'Acceso a funciones ampliadas'
                    : language === 'en'
                    ? 'Subscription Management via Web'
                    : 'Gestión de suscripción vía Web'}
                </span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed font-light">
                {isNativeIos
                  ? language === 'en'
                    ? 'Your account is synced across all your devices. In this version, you can unlock additional recipe extractions for free via rewarded ads.'
                    : 'Tu cuenta está sincronizada en todos tus dispositivos. En esta versión puedes desbloquear extracciones adicionales de forma gratuita mediante anuncios recompensados.'
                  : language === 'en'
                  ? 'Manage or activate your PRO subscription on our official website migaapp.com by signing in with this account.'
                  : 'Gestiona o activa tu suscripción PRO desde nuestra web oficial migaapp.com iniciando sesión con esta misma cuenta.'}
              </p>
              {!isNativeIos && profileFromStore?.email && (
                <div className="pt-1 flex items-center gap-1.5 text-[11px] text-stone-600 font-mono bg-white/90 px-2.5 py-1 rounded-lg border border-stone-200/80 w-fit max-w-full truncate">
                  <span className="text-stone-400">Email:</span>
                  <span className="font-semibold text-stone-800 truncate">{profileFromStore.email}</span>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSubscribeClick}
              disabled={isCheckoutLoading}
              className="w-full min-h-[52px] py-4 px-6 rounded-2xl font-bold text-sm sm:text-base text-white bg-brand-primary hover:bg-brand-hover active:scale-[0.99] shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isCheckoutLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white shrink-0" />
                  <span>{t('billing_connecting')}</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>{t('billing_subscribe_btn')}</span>
                </>
              )}
            </button>
          )}

          {checkoutError && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-600 font-medium pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{checkoutError}</span>
            </div>
          )}

          {!isNativeMobile && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-stone-500 pt-0.5">
              <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>{t('billing_cancel_anytime')}</span>
            </div>
          )}
        </div>

        {/* 3º. CANJE DE CÓDIGO VIP / PROMO */}
        {!isNativeIos && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e7dfd5] space-y-2.5">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-brand-primary" />
              <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                {t('billing_vip_question')}
              </h3>
            </div>

            {vipSuccess ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('billing_vip_success')}</span>
              </div>
            ) : (
              <form onSubmit={handleRedeemVip} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={vipCode}
                    onChange={(e) => {
                      setVipCode(e.target.value);
                      if (vipError) setVipError(null);
                    }}
                    placeholder={t('billing_vip_placeholder')}
                    className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary uppercase tracking-wider font-mono font-medium transition"
                    disabled={isVipValidating}
                  />
                  <button
                    type="submit"
                    disabled={isVipValidating || !vipCode.trim()}
                    className="min-h-[42px] px-4 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center shrink-0"
                  >
                    {isVipValidating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t('billing_vip_redeem')
                    )}
                  </button>
                </div>

                {vipError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium pt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{vipError}</span>
                  </div>
                )}
              </form>
            )}
          </div>
        )}

        {/* 4º. LISTA DE BENEFICIOS (5 VENTAJAS PRO REALES) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e7dfd5] shadow-xs space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            {t('billing_advantages_title')}
          </h4>

          <div className="space-y-2.5">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#faf7f2] border border-[#e7dfd5]">
              <div className="w-8 h-8 rounded-lg bg-[#f4efe6] text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <h5 className="text-xs font-bold text-stone-900">
                  {t('billing_adv_1_title')}
                </h5>
                <p className="text-[11px] text-stone-600 leading-relaxed font-light">
                  {t('billing_adv_1_desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#faf7f2] border border-[#e7dfd5]">
              <div className="w-8 h-8 rounded-lg bg-[#f4efe6] text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <h5 className="text-xs font-bold text-stone-900">
                  {t('billing_adv_2_title')}
                </h5>
                <p className="text-[11px] text-stone-600 leading-relaxed font-light">
                  {t('billing_adv_2_desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#faf7f2] border border-[#e7dfd5]">
              <div className="w-8 h-8 rounded-lg bg-[#f4efe6] text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
                <Palette className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <h5 className="text-xs font-bold text-stone-900">
                  {t('billing_adv_3_title')}
                </h5>
                <p className="text-[11px] text-stone-600 leading-relaxed font-light">
                  {t('billing_adv_3_desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#faf7f2] border border-[#e7dfd5]">
              <div className="w-8 h-8 rounded-lg bg-[#f4efe6] text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
                <HeartPulse className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <h5 className="text-xs font-bold text-stone-900">
                  {t('billing_adv_4_title')}
                </h5>
                <p className="text-[11px] text-stone-600 leading-relaxed font-light">
                  {t('billing_adv_4_desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#faf7f2] border border-[#e7dfd5]">
              <div className="w-8 h-8 rounded-lg bg-[#f4efe6] text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
                <FileDown className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <h5 className="text-xs font-bold text-stone-900">
                  {t('billing_adv_5_title')}
                </h5>
                <p className="text-[11px] text-stone-600 leading-relaxed font-light">
                  {t('billing_adv_5_desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProSubscriptionModal;
