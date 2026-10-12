'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Lock,
  Check,
  ShieldCheck,
  HeartPulse,
  Infinity as InfinityIcon,
  Ticket,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

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
  const [vipCode, setVipCode] = useState('');
  const [isVipValidating, setIsVipValidating] = useState(false);
  const [vipSuccess, setVipSuccess] = useState(false);
  const [vipError, setVipError] = useState<string | null>(null);

  // Comprobar si ya tenía VIP activo previamente en localStorage
  useEffect(() => {
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

  const handleRedeemVip = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = vipCode.trim().toUpperCase();

    if (!cleanCode) {
      setVipError('Por favor introduce un código.');
      return;
    }

    setIsVipValidating(true);
    setVipError(null);

    // Simular validación rápida del código promocional
    setTimeout(() => {
      setIsVipValidating(false);
      if (cleanCode === 'NACHOVIP') {
        setVipSuccess(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('recetario_vip_active', 'true');
        }
        if (onVipSuccess) {
          onVipSuccess();
        }
      } else {
        setVipError('Código no válido o caducado. Prueba de nuevo.');
      }
    }, 500);
  };

  const handleSubscribeClick = () => {
    if (onSubscribe) {
      onSubscribe();
    } else {
      // Redirigir a la pasarela de pago / stripe checkout
      if (typeof window !== 'undefined') {
        window.location.href = '/billing';
      }
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

        {/* 1. CABECERA Y MENSAJE DE CONTEXTO */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] shadow-2xs mb-1">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>

          <h2
            id="modal-pro-title"
            className="text-2xl sm:text-3xl font-bold font-serif-recipe text-stone-900 tracking-tight"
          >
            {context === 'limit_reached'
              ? 'Desbloquea el recetario sin límites'
              : 'Potencia tu recetario con IA'}
          </h2>

          <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
            {context === 'limit_reached'
              ? 'Has alcanzado tu límite de 10 recetas gratuitas mensuales. Pásate a PRO para seguir capturando.'
              : 'Pásate a PRO para desbloquear el motor clínico, adaptar recetas a tus intolerancias y disfrutar de capturas ilimitadas.'}
          </p>
        </div>

        {/* 2. ÚNICO PLAN Y BOTÓN CTA (STRIPE) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e7dfd5] shadow-xs text-center space-y-4">
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
            <div className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <span>Suscripción PRO Activa con Código VIP</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSubscribeClick}
              className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base text-white bg-[#a86224] hover:bg-[#8e511c] active:scale-[0.99] shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Suscribirse ahora — 3,50€/mes</span>
            </button>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 pt-1">
            <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>Cancela cuando quieras. Transacción segura procesada por Stripe</span>
          </div>
        </div>

        {/* 3. SISTEMA DE CÓDIGO VIP */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5]/80 space-y-3">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[#a86224]" />
            <h3 className="text-xs sm:text-sm font-bold text-stone-900">
              ¿Tienes un código promocional o VIP?
            </h3>
          </div>

          {vipSuccess ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-fade-in">
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
        <div className="space-y-3 pt-1">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 px-1">
            Ventajas incluidas en tu membresía
          </h4>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Beneficio 1 */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-[#e7dfd5] transition hover:border-[#a86224]/40">
              <div className="w-9 h-9 rounded-xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center shrink-0 mt-0.5">
                <InfinityIcon className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs sm:text-sm font-bold text-stone-900">
                  Capturas ilimitadas
                </h5>
                <p className="text-[11px] sm:text-xs text-stone-600 leading-snug">
                  Guarda recetas desde TikTok, Instagram, Facebook, YouTube y Reels sin límites mensuales.
                </p>
              </div>
            </div>

            {/* Beneficio 2 */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-[#e7dfd5] transition hover:border-[#a86224]/40">
              <div className="w-9 h-9 rounded-xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center shrink-0 mt-0.5">
                <HeartPulse className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs sm:text-sm font-bold text-stone-900">
                  Motor de Adaptación Clínica
                </h5>
                <p className="text-[11px] sm:text-xs text-stone-600 leading-snug">
                  Función exclusiva. Desbloquea tu perfil de salud, nivel culinario y preferencias alimentarias (alergias/dietas).
                </p>
              </div>
            </div>

            {/* Beneficio 3 */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-[#e7dfd5] transition hover:border-[#a86224]/40">
              <div className="w-9 h-9 rounded-xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs sm:text-sm font-bold text-stone-900">
                  Experiencia sin publicidad
                </h5>
                <p className="text-[11px] sm:text-xs text-stone-600 leading-snug">
                  Navegación limpia, cero interrupciones ni vídeos.
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
