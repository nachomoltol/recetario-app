'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  X,
  Lock,
  ShieldCheck,
  HeartPulse,
  Infinity as InfinityIcon,
  Ticket,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  PlayCircle,
  Gift,
} from 'lucide-react';
import { redeemVipCodeAction, claimRewardCreditAction } from '@/app/actions/subscription';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { isNativePlatform, showRewardVideoAdFlow } from '@/lib/admob/admobService';

export interface ProSubscriptionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onVipSuccess?: () => void;
  onSubscribe?: () => void;
  context?: 'limit_reached' | 'feature_locked';
}

export function ProSubscriptionModal({
  isOpen = true,
  onClose,
  onVipSuccess,
  onSubscribe,
  context = 'feature_locked',
}: ProSubscriptionModalProps) {
  const router = useRouter();
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const [isNative, setIsNative] = useState(false);
  const [vipCode, setVipCode] = useState('');
  const [isVipValidating, setIsVipValidating] = useState(false);
  const [vipSuccess, setVipSuccess] = useState(false);
  const [vipError, setVipError] = useState<string | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Estados para AdMob
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [adLoadingStep, setAdLoadingStep] = useState<'loading' | 'simulating' | 'rewarding'>('loading');
  const [adSuccess, setAdSuccess] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  useEffect(() => {
    setIsNative(isNativePlatform());

    if (typeof window !== 'undefined') {
      const storedVip = localStorage.getItem('recetario_vip_active');
      if (storedVip === 'true') {
        setVipSuccess(true);
      }
    }
  }, []);

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
          if (typeof window !== 'undefined') {
            localStorage.removeItem('recetario_vip_active');
          }
          router.refresh();
        } else {
          setVipSuccess(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('recetario_vip_active', 'true');
          }
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

  // Manejador del vídeo bonificado de AdMob (con simulador en Web/PWA)
  const handleWatchAd = async () => {
    setIsAdLoading(true);
    setAdError(null);
    setAdSuccess(false);

    try {
      if (isNativePlatform()) {
        // En dispositivo nativo (iOS / Android): invocar SDK de AdMob
        setAdLoadingStep('loading');
        const adResult = await showRewardVideoAdFlow();

        if (!adResult.rewarded) {
          setIsAdLoading(false);
          if (adResult.error && adResult.error !== 'AD_DISMISSED_WITHOUT_REWARD') {
            setAdError(t('billing_ad_error'));
          }
          return;
        }
      } else {
        // En entorno Web / PWA: Simulación de anuncio durante 3 segundos
        setAdLoadingStep('simulating');
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      // Vídeo completado (o simulado): reclamar 1 crédito en el servidor
      setAdLoadingStep('rewarding');
      const creditRes = await claimRewardCreditAction();

      if (creditRes.success) {
        setAdSuccess(true);
        setIsAdLoading(false);

        setTimeout(() => {
          if (onClose) onClose();
          router.push('/recipes');
        }, 1400);
      } else {
        setIsAdLoading(false);
        setAdError(creditRes.error || t('billing_ad_error'));
      }
    } catch (err) {
      console.error('[AdMob] Error al ver anuncio bonificado:', err);
      setIsAdLoading(false);
      setAdError(t('billing_ad_error'));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-pro-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-[#faf7f2] border border-[#e7dfd5] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 max-h-[92vh] overflow-y-auto space-y-6 text-stone-900">
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
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-[#a86224]/30 shadow-xs flex items-center gap-3.5 text-left">
            <div className="w-10 h-10 rounded-xl bg-[#a86224] text-white flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#a86224] block">
                {t('billing_limit_reached_badge')}
              </span>
              <h3 className="text-sm sm:text-base font-bold font-serif-recipe text-stone-900 leading-snug">
                {t('billing_limit_reached_alert')}
              </h3>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2 pt-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] shadow-2xs mb-1">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>

            <h2
              id="modal-pro-title"
              className="text-2xl sm:text-3xl font-bold font-serif-recipe text-stone-900 tracking-tight"
            >
              {t('pro_modal_feature_title')}
            </h2>

            <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
              {t('pro_modal_feature_desc')}
            </p>
          </div>
        )}

        {/* 2º. TARJETA SECUNDARIA: OPCIÓN GRATUITA CON ADMOB (EN LÍMITE ALCANZADO) - PEGADA AL AVISO */}
        {context === 'limit_reached' && (
          <div className="p-5 sm:p-6 rounded-2xl bg-white border-2 border-[#a86224]/30 shadow-xs text-center space-y-3.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4efe6] text-[#a86224] text-[10px] font-bold tracking-wider uppercase border border-[#e7dfd5]">
              <Gift className="w-3 h-3" />
              <span>{t('billing_ad_card_badge')}</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold font-serif-recipe text-stone-900 tracking-tight">
                {t('billing_ad_card_heading')}
              </h3>
              <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                {t('billing_ad_card_desc')}
              </p>
            </div>

            {/* Botón activo para TODO el mundo (con simulador en Web/PWA) */}
            <div className="space-y-2 pt-1">
              {adSuccess ? (
                <div className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{t('billing_ad_success')}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleWatchAd}
                  disabled={isAdLoading}
                  className="w-full min-h-[48px] py-3 px-5 rounded-xl font-bold text-xs sm:text-sm text-stone-900 bg-[#f4efe6] hover:bg-[#ebdcc8] active:scale-[0.99] border-2 border-[#a86224]/30 shadow-2xs hover:border-[#a86224] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isAdLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#a86224] shrink-0" />
                      <span>
                        {adLoadingStep === 'rewarding'
                          ? t('billing_ad_rewarding')
                          : adLoadingStep === 'simulating'
                          ? t('billing_ad_simulating')
                          : t('billing_ad_loading')}
                      </span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 text-[#a86224]" />
                      <span>{t('billing_ad_watch_btn')}</span>
                    </>
                  )}
                </button>
              )}

              {adError && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-rose-600 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{adError}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SEPARADOR VISUAL DUAL */}
        {context === 'limit_reached' && (
          <div className="relative flex items-center justify-center py-0.5">
            <div className="w-full border-t border-[#e7dfd5]" />
            <span className="absolute px-3 bg-[#faf7f2] text-[10px] font-bold uppercase tracking-wider text-stone-500">
              {t('billing_dual_or')}
            </span>
          </div>
        )}

        {/* 3º. TARJETA PRINCIPAL: SUSCRIPCIÓN PRO (3,50€/mes) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e7dfd5] shadow-xs text-center space-y-4">
          <div className="inline-block px-3 py-1 rounded-full bg-[#f4efe6] text-[#a86224] text-[11px] font-bold tracking-wider uppercase border border-[#e7dfd5]">
            {t('billing_plan_name')}
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
            <div className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <span>{t('billing_vip_active_banner')}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSubscribeClick}
              disabled={isCheckoutLoading}
              className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base text-white bg-[#a86224] hover:bg-[#8e511c] active:scale-[0.99] shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isCheckoutLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white shrink-0" />
                  <span>{t('billing_connecting')}</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
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

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 pt-1">
            <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>{t('billing_cancel_anytime')}</span>
          </div>
        </div>

        {/* 4. SISTEMA DE CÓDIGO VIP */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5]/80 space-y-3">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[#a86224]" />
            <h3 className="text-xs sm:text-sm font-bold text-stone-900">
              {t('billing_vip_question')}
            </h3>
          </div>

          {vipSuccess ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
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
                  className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-white border border-[#e7dfd5] text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#a86224]/30 focus:border-[#a86224] uppercase tracking-wider font-mono font-medium transition"
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

        {/* 5. LISTA DE BENEFICIOS (VENTAJAS PRO) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e7dfd5] shadow-xs space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            {t('billing_advantages_title')}
          </h4>

          <div className="space-y-2.5">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#faf7f2] border border-[#e7dfd5]">
              <div className="w-8 h-8 rounded-lg bg-[#f4efe6] text-[#a86224] flex items-center justify-center shrink-0 mt-0.5">
                <InfinityIcon className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-stone-900">
                  {t('billing_adv_1_title')}
                </h5>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  {t('billing_adv_1_desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#faf7f2] border border-[#e7dfd5]">
              <div className="w-8 h-8 rounded-lg bg-[#f4efe6] text-[#a86224] flex items-center justify-center shrink-0 mt-0.5">
                <HeartPulse className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-stone-900">
                  {t('billing_adv_2_title')}
                </h5>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  {t('billing_adv_2_desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#faf7f2] border border-[#e7dfd5]">
              <div className="w-8 h-8 rounded-lg bg-[#f4efe6] text-[#a86224] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-stone-900">
                  {t('billing_adv_3_title')}
                </h5>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  {t('billing_adv_3_desc')}
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
