'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Lock,
  ShieldCheck,
  HeartPulse,
  Infinity as InfinityIcon,
  Ticket,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { redeemVipCodeAction } from '@/app/actions/subscription';
import { useLanguageStore } from '@/stores/useLanguageStore';

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
}

export function BillingPlanView({ userEmail }: BillingPlanViewProps) {
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const [vipCode, setVipCode] = useState('');
  const [isVipValidating, setIsVipValidating] = useState(false);
  const [vipSuccess, setVipSuccess] = useState(false);
  const [vipError, setVipError] = useState<string | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Leer estado VIP inicial de localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVip = localStorage.getItem('recetario_vip_active');
      if (storedVip === 'true') {
        setVipSuccess(true);
      }
    }
  }, []);

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
        setVipSuccess(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('recetario_vip_active', 'true');
        }
      } else {
        setVipError(
          res.error ||
            (language === 'en'
              ? 'Invalid or expired code. Please try again.'
              : 'Código no válido o caducado. Prueba de nuevo.')
        );
      }
    } catch (err) {
      setIsVipValidating(false);
      setVipError(language === 'en' ? 'Error connecting to server.' : 'Error al conectar con el servidor.');
    }
  };

  const handleSubscribe = async () => {
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
    <div className="space-y-6">
      {/* 1. CABECERA Y MENSAJE DE CONTEXTO */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] shadow-2xs">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold font-serif-recipe text-stone-900 tracking-tight">
          {t('billing_title')}
        </h1>

        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
          {t('billing_hero_desc')}
        </p>
      </div>

      {/* 2. ÚNICO PLAN Y BOTÓN CTA (STRIPE) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs text-center space-y-4">
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
          <div className="w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <span>{t('billing_vip_active_banner')}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isCheckoutLoading}
            className="w-full min-h-[52px] py-4 px-6 rounded-2xl font-bold text-sm sm:text-base text-white bg-[#a86224] hover:bg-[#8e511c] active:scale-[0.99] shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
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

        <div className="flex items-center justify-center gap-1.5 text-xs text-stone-500 pt-1">
          <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span>{t('billing_cancel_anytime')}</span>
        </div>
      </div>

      {/* 3. SISTEMA DE CÓDIGO VIP */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#f4efe6] border border-[#e7dfd5]/80 space-y-3">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-[#a86224]" />
          <h3 className="text-sm font-bold text-stone-900">
            {t('billing_vip_question')}
          </h3>
        </div>

        {vipSuccess ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-fade-in">
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
                className="flex-1 min-h-[44px] px-4 rounded-xl bg-white border border-[#e7dfd5] text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#a86224]/30 focus:border-[#a86224] uppercase tracking-wider font-mono font-medium transition"
                disabled={isVipValidating}
              />
              <button
                type="submit"
                disabled={isVipValidating || !vipCode.trim()}
                className="min-h-[44px] px-5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center shrink-0"
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

      {/* 4. LISTA DE BENEFICIOS (LO QUE INCLUYE EL PLAN PRO) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
          {t('billing_advantages_title')}
        </h4>

        <div className="grid grid-cols-1 gap-3">
          {/* Beneficio 1 */}
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] transition hover:border-[#a86224]/40">
            <div className="w-10 h-10 rounded-xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center shrink-0 mt-0.5">
              <InfinityIcon className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h5 className="text-sm font-bold text-stone-900">
                {t('billing_adv_1_title')}
              </h5>
              <p className="text-xs text-stone-600 leading-relaxed">
                {t('billing_adv_1_desc')}
              </p>
            </div>
          </div>

          {/* Beneficio 2 */}
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] transition hover:border-[#a86224]/40">
            <div className="w-10 h-10 rounded-xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center shrink-0 mt-0.5">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h5 className="text-sm font-bold text-stone-900">
                {t('billing_adv_2_title')}
              </h5>
              <p className="text-xs text-stone-600 leading-relaxed">
                {t('billing_adv_2_desc')}
              </p>
            </div>
          </div>

          {/* Beneficio 3 */}
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] transition hover:border-[#a86224]/40">
            <div className="w-10 h-10 rounded-xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h5 className="text-sm font-bold text-stone-900">
                {t('billing_adv_3_title')}
              </h5>
              <p className="text-xs text-stone-600 leading-relaxed">
                {t('billing_adv_3_desc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
