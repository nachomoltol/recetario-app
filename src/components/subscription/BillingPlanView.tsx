'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
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
import { isNativeAndroidPlatform } from '@/lib/admob/admobService';

export function BillingHeaderTitle() {
  const t = useLanguageStore((s) => s.t);

  return (
    <div>
      <span className="text-base font-bold font-serif-recipe tracking-tight text-stone-900 block">
        {t('billing_title')}
      </span>
      <span className="text-[10px] text-stone-500 tracking-wider uppercase block font-medium">
        {t('billing_subtitle')}
      </span>
    </div>
  );
}

interface BillingPlanViewProps {
  userEmail?: string;
  initialLimitReached?: boolean;
}

export function BillingPlanView({ userEmail, initialLimitReached = false }: BillingPlanViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);
  const profileFromStore = useProfileStore((s) => s.profile);

  // Detección de límite mensual alcanzado (por prop o por query param ?limit=reached)
  const isLimitReached = initialLimitReached || searchParams.get('limit') === 'reached';

  // Estados de checkout y VIP
  const [vipCode, setVipCode] = useState('');
  const [isVipValidating, setIsVipValidating] = useState(false);
  const [vipSuccess, setVipSuccess] = useState(
    (profileFromStore?.plan_suscripcion || '').trim().toLowerCase() === 'pro'
  );
  const [vipError, setVipError] = useState<string | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isNativeAndroid, setIsNativeAndroid] = useState(false);

  useEffect(() => {
    setIsNativeAndroid(isNativeAndroidPlatform());
  }, []);

  useEffect(() => {
    setVipSuccess(
      (profileFromStore?.plan_suscripcion || '').trim().toLowerCase() === 'pro'
    );
  }, [profileFromStore?.plan_suscripcion]);

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

  const handleSubscribe = async () => {
    if (isNativeAndroid) {
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
    <div className="space-y-4 sm:space-y-5">
      {/* AVISO CONDICIONAL: LÍMITE MENSUAL ALCANZADO (Solo si el usuario agotó su cuota) */}
      {isLimitReached && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-brand-primary/30 shadow-xs flex items-center gap-3.5 text-left animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center shrink-0 shadow-sm">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="inline-block px-2 py-0.5 rounded-full bg-brand-primary/15 text-brand-primary text-[9px] font-bold tracking-wider uppercase">
              {t('billing_limit_reached_badge')}
            </div>
            <h2 className="text-sm sm:text-base font-bold font-serif-recipe text-stone-900 tracking-tight leading-snug">
              {t('billing_limit_reached_alert')}
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              {t('billing_limit_reached_desc')}
            </p>
          </div>
        </div>
      )}

      {/* 1º LUGAR: TARJETA PRINCIPAL PLAN PRO MENSUAL (3,50€ / mes) */}
      <div className="p-5 sm:p-7 rounded-3xl bg-white border-2 border-brand-primary shadow-md text-center space-y-4 animate-fade-in relative overflow-hidden">
        {/* Glow sutil de fondo */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none" />

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
        ) : isNativeAndroid ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/90 text-left space-y-2.5">
            <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs sm:text-sm">
              <Globe className="w-4 h-4 text-brand-primary shrink-0" />
              <span>
                {language === 'en'
                  ? 'Subscription Management via Web'
                  : 'Gestión de suscripción vía Web'}
              </span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed font-light">
              {language === 'en'
                ? 'Manage or activate your PRO subscription on our official website migaapp.com by signing in with this account.'
                : 'Gestiona o activa tu suscripción PRO desde nuestra web oficial migaapp.com iniciando sesión con esta misma cuenta.'}
            </p>
            {(userEmail || profileFromStore?.email) && (
              <div className="pt-1 flex items-center gap-1.5 text-[11px] text-stone-600 font-mono bg-white/90 px-2.5 py-1 rounded-lg border border-stone-200/80 w-fit max-w-full truncate">
                <span className="text-stone-400">Email:</span>
                <span className="font-semibold text-stone-800 truncate">{userEmail || profileFromStore?.email}</span>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSubscribe}
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

        {!isNativeAndroid && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-stone-500 pt-0.5">
            <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>{t('billing_cancel_anytime')}</span>
          </div>
        )}
      </div>

      {/* 2º LUGAR: MÓDULO CÓDIGO PROMOCIONAL O VIP */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#f4efe6] border border-[#e7dfd5]/80 space-y-2.5">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-brand-primary" />
          <h3 className="text-xs sm:text-sm font-bold text-stone-900">
            {t('billing_vip_question')}
          </h3>
        </div>

        {vipSuccess ? (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-fade-in">
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
                className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-white border border-[#e7dfd5] text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary uppercase tracking-wider font-mono font-medium transition"
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

      {/* 3º LUGAR: BLOQUE INFORMATIVO DE VENTAJAS DE LA MEMBRESÍA PRO */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            {t('billing_advantages_title')}
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {/* Ventaja 1: Hasta 150 recetas */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] transition hover:border-brand-primary/40">
            <div className="w-9 h-9 rounded-xl bg-[#f4efe6] text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <h5 className="text-xs sm:text-sm font-bold text-stone-900">
                {t('billing_adv_1_title')}
              </h5>
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                {t('billing_adv_1_desc')}
              </p>
            </div>
          </div>

          {/* Ventaja 2: Planificador Semanal y Generador de Menús */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] transition hover:border-brand-primary/40">
            <div className="w-9 h-9 rounded-xl bg-[#f4efe6] text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <h5 className="text-xs sm:text-sm font-bold text-stone-900">
                {t('billing_adv_2_title')}
              </h5>
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                {t('billing_adv_2_desc')}
              </p>
            </div>
          </div>

          {/* Ventaja 3: Paletas y Estilos Visuales Gourmet */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] transition hover:border-brand-primary/40">
            <div className="w-9 h-9 rounded-xl bg-[#f4efe6] text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
              <Palette className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <h5 className="text-xs sm:text-sm font-bold text-stone-900">
                {t('billing_adv_3_title')}
              </h5>
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                {t('billing_adv_3_desc')}
              </p>
            </div>
          </div>

          {/* Ventaja 4: Motor de Adaptación Culinaria */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] transition hover:border-brand-primary/40">
            <div className="w-9 h-9 rounded-xl bg-[#f4efe6] text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <h5 className="text-xs sm:text-sm font-bold text-stone-900">
                {t('billing_adv_4_title')}
              </h5>
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                {t('billing_adv_4_desc')}
              </p>
            </div>
          </div>

          {/* Ventaja 5: Exportación Editorial a PDF */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] transition hover:border-brand-primary/40">
            <div className="w-9 h-9 rounded-xl bg-[#f4efe6] text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
              <FileDown className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <h5 className="text-xs sm:text-sm font-bold text-stone-900">
                {t('billing_adv_5_title')}
              </h5>
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                {t('billing_adv_5_desc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
