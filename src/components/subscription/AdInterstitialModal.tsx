'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Clock, X, ChefHat, Volume2 } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { isNativePlatform, showRewardVideoAdFlow } from '@/lib/admob/admobService';

interface AdInterstitialModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export function AdInterstitialModal({
  isOpen,
  onComplete,
  onCancel,
}: AdInterstitialModalProps) {
  const language = useLanguageStore((s) => s.language);
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [isAdMobPlaying, setIsAdMobPlaying] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(5);
      setIsAdMobPlaying(false);
      return;
    }

    // Si es plataforma nativa móvil, intentamos mostrar el AdMob Rewarded Video
    if (isNativePlatform()) {
      let isMounted = true;
      setIsAdMobPlaying(true);
      showRewardVideoAdFlow()
        .then((res) => {
          if (!isMounted) return;
          setIsAdMobPlaying(false);
          // Si completó el anuncio o se cerró, continuamos con la generación
          onCompleteRef.current();
        })
        .catch((err) => {
          console.warn('[AdInterstitial] Error en AdMob nativo, fallback a timer:', err);
          if (isMounted) setIsAdMobPlaying(false);
        });
      return () => {
        isMounted = false;
      };
    }

    // Entorno Web / PWA: Temporizador regresivo de 5 segundos
    setSecondsRemaining(5);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => {
            onCompleteRef.current();
          }, 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const isEn = language === 'en';
  const progressPercent = Math.min(100, Math.max(0, ((5 - secondsRemaining) / 5) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md bg-white border border-[#e7dfd5] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 text-stone-900 text-center">
        {/* Botón Cerrar/Cancelar */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-[#f4efe6] hover:bg-stone-200 border border-[#e7dfd5] flex items-center justify-center text-stone-500 hover:text-stone-800 transition"
          title={isEn ? 'Cancel generation' : 'Cancelar generación'}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cabecera / Badge de Patrocinador */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[#a86224] text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isEn ? 'Sponsored Generation' : 'Generación Patrocinada'}</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900">
            {isEn ? 'Preparing your recipe with AI' : 'Preparando tu receta con IA'}
          </h3>

          <p className="text-xs sm:text-sm text-stone-600 max-w-xs mx-auto leading-relaxed">
            {isEn
              ? 'A brief sponsor wait helps keep Miga free for everyday home chefs.'
              : 'Una breve pausa patrocinada mantiene Miga gratuita para todos los cocineros.'}
          </p>
        </div>

        {/* Display del Contador Regresivo */}
        <div className="py-4 flex flex-col items-center justify-center">
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Círculo SVG de progreso */}
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="currentColor"
                strokeWidth="7"
                className="text-[#f4efe6]"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="currentColor"
                strokeWidth="7"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * progressPercent) / 100}
                strokeLinecap="round"
                className="text-[#a86224] transition-all duration-1000 ease-linear"
                fill="none"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center text-center">
              {secondsRemaining > 0 ? (
                <>
                  <span className="text-3xl font-extrabold text-[#a86224] font-mono leading-none">
                    {secondsRemaining}s
                  </span>
                  <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mt-1">
                    {isEn ? 'waiting' : 'espera'}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center text-emerald-600 animate-scale-in">
                  <ChefHat className="w-8 h-8 animate-bounce" />
                  <span className="text-[11px] font-bold mt-1">
                    {isEn ? 'Ready!' : '¡Listo!'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barra de progreso lineal sutil */}
        <div className="space-y-2">
          <div className="w-full bg-[#f4efe6] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#a86224] to-[#c27835] h-full rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-stone-400 font-medium">
            {secondsRemaining > 0
              ? isEn
                ? `Extraction will launch automatically in ${secondsRemaining}s...`
                : `La extracción comenzará automáticamente en ${secondsRemaining}s...`
              : isEn
                ? 'Starting multimodal extraction...'
                : 'Iniciando extracción multimodal...'}
          </p>
        </div>
      </div>
    </div>
  );
}
