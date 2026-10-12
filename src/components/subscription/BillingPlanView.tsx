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

interface BillingPlanViewProps {
  userEmail?: string;
}

export function BillingPlanView({ userEmail }: BillingPlanViewProps) {
  const [vipCode, setVipCode] = useState('');
  const [isVipValidating, setIsVipValidating] = useState(false);
  const [vipSuccess, setVipSuccess] = useState(false);
  const [vipError, setVipError] = useState<string | null>(null);

  // Leer estado VIP inicial de localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVip = localStorage.getItem('recetario_vip_active');
      if (storedVip === 'true') {
        setVipSuccess(true);
      }
    }
  }, []);

  const handleRedeemVip = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = vipCode.trim().toUpperCase();

    if (!cleanCode) {
      setVipError('Por favor introduce un código.');
      return;
    }

    setIsVipValidating(true);
    setVipError(null);

    setTimeout(() => {
      setIsVipValidating(false);
      if (cleanCode === 'NACHOVIP') {
        setVipSuccess(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('recetario_vip_active', 'true');
        }
      } else {
        setVipError('Código no válido o caducado. Prueba de nuevo.');
      }
    }, 500);
  };

  const handleSubscribe = () => {
    // Simular inicio de checkout de Stripe o acción futura
    alert('Redirigiendo a la pasarela segura de pago con Stripe...');
  };

  return (
    <div className="space-y-6">
      {/* 1. CABECERA Y MENSAJE DE CONTEXTO */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] shadow-2xs">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold font-serif-recipe text-stone-900 tracking-tight">
          Desbloquea el recetario sin límites
        </h1>

        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
          Has alcanzado tu límite de 10 recetas gratuitas mensuales. Pásate a PRO para seguir capturando.
        </p>
      </div>

      {/* 2. ÚNICO PLAN Y BOTÓN CTA (STRIPE) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs text-center space-y-4">
        <div className="inline-block px-3 py-1 rounded-full bg-[#f4efe6] text-[#a86224] text-[11px] font-bold tracking-wider uppercase border border-[#e7dfd5]">
          Plan PRO Mensual
        </div>

        <div className="flex items-baseline justify-center gap-1.5">
          <span className="text-4xl sm:text-5xl font-extrabold font-serif-recipe text-stone-900 tracking-tight">
            3,50€
          </span>
          <span className="text-stone-500 font-medium text-sm sm:text-base">/ mes</span>
        </div>

        {vipSuccess ? (
          <div className="w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <span>Suscripción PRO Activa con Código VIP</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSubscribe}
            className="w-full min-h-[52px] py-4 px-6 rounded-2xl font-bold text-sm sm:text-base text-white bg-[#a86224] hover:bg-[#8e511c] active:scale-[0.99] shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>Suscribirse ahora — 3,50€/mes</span>
          </button>
        )}

        <div className="flex items-center justify-center gap-1.5 text-xs text-stone-500 pt-1">
          <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span>Cancela cuando quieras. Transacción segura procesada por Stripe</span>
        </div>
      </div>

      {/* 3. SISTEMA DE CÓDIGO VIP */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#f4efe6] border border-[#e7dfd5]/80 space-y-3">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-[#a86224]" />
          <h3 className="text-sm font-bold text-stone-900">
            ¿Tienes un código promocional o VIP?
          </h3>
        </div>

        {vipSuccess ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>¡Nivel VIP desbloqueado! Generaciones ilimitadas activas.</span>
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
                placeholder="Introduce tu código (ej. NACHOVIP)"
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
                  'Canjear'
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
          Ventajas incluidas en tu membresía PRO
        </h4>

        <div className="grid grid-cols-1 gap-3">
          {/* Beneficio 1 */}
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] transition hover:border-[#a86224]/40">
            <div className="w-10 h-10 rounded-xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center shrink-0 mt-0.5">
              <InfinityIcon className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h5 className="text-sm font-bold text-stone-900">
                Capturas ilimitadas
              </h5>
              <p className="text-xs text-stone-600 leading-relaxed">
                Guarda recetas desde TikTok, Instagram, Facebook, YouTube y Reels sin límites mensuales.
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
                Motor de Adaptación Clínica
              </h5>
              <p className="text-xs text-stone-600 leading-relaxed">
                Función exclusiva. Desbloquea tu perfil de salud, nivel culinario y preferencias alimentarias (alergias/dietas).
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
                Experiencia sin publicidad
              </h5>
              <p className="text-xs text-stone-600 leading-relaxed">
                Navegación limpia, cero interrupciones ni vídeos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
