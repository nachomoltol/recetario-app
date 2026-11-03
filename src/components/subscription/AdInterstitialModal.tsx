'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Clock, X, ChefHat, Crown, Play, PlayCircle, Check, Loader2 } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { isNativePlatform, showRewardVideoAdFlow } from '@/lib/admob/admobService';

export interface AdInterstitialModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onCancel: () => void;
  onSelectPro?: () => void;
}

export function AdInterstitialModal({
  isOpen,
  onComplete,
  onCancel,
  onSelectPro,
}: AdInterstitialModalProps) {
  const language = useLanguageStore((s) => s.language);
  const [viewState, setViewState] = useState<'choice' | 'playing'>('choice');
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [isAdMobPlaying, setIsAdMobPlaying] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Al abrir o cerrar el modal, reiniciar estado
  useEffect(() => {
    if (!isOpen) {
      setViewState('choice');
      setSecondsRemaining(5);
      setIsAdMobPlaying(false);
      return;
    }
    setViewState('choice');
    setSecondsRemaining(5);
    setIsAdMobPlaying(false);
  }, [isOpen]);

  // Solo cuando el usuario pasa a 'playing' se ejecuta AdMob o el contador regresivo
  useEffect(() => {
    if (!isOpen || viewState !== 'playing') {
      return;
    }

    // 1. Entorno nativo móvil: ejecutar AdMob Rewarded Video
    if (isNativePlatform()) {
      let isMounted = true;
      setIsAdMobPlaying(true);
      showRewardVideoAdFlow()
        .then(() => {
          if (!isMounted) return;
          setIsAdMobPlaying(false);
          onCompleteRef.current();
        })
        .catch((err) => {
          console.warn('[AdInterstitial] Error en AdMob nativo, fallback:', err);
          if (isMounted) {
            setIsAdMobPlaying(false);
            onCompleteRef.current();
          }
        });
      return () => {
        isMounted = false;
      };
    }

    // 2. Entorno Web / PWA: Temporizador regresivo de 5 segundos
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
  }, [isOpen, viewState]);

  if (!isOpen) return null;

  const isEn = language === 'en';
  const progressPercent = Math.min(100, Math.max(0, ((5 - secondsRemaining) / 5) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-white border border-[#e7dfd5] rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-7 space-y-5 text-stone-900 max-h-[92vh] overflow-y-auto">
        {/* Botón Cerrar/Cancelar */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-[#f4efe6] hover:bg-stone-200 border border-[#e7dfd5] flex items-center justify-center text-stone-500 hover:text-stone-800 transition cursor-pointer z-10"
          title={isEn ? 'Cancel generation' : 'Cancelar generación'}
        >
          <X className="w-4 h-4" />
        </button>

        {viewState === 'choice' ? (
          /* ========================================================================= */
          /* FASE 1: SELECTOR DUAL (HAZTE PRO VS CONTINUAR CON ANUNCIO)               */
          /* ========================================================================= */
          <div className="space-y-5">
            {/* Cabecera Editorial */}
            <div className="text-center space-y-2 pr-6 sm:pr-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-light border border-brand-subtle text-brand-primary text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isEn ? 'Smart Generation' : 'Generación Inteligente'}</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900">
                {isEn ? 'Choose how to process your recipe' : 'Elige cómo procesar tu receta'}
              </h3>

              <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto leading-relaxed">
                {isEn
                  ? 'You have used your direct recipes for this month. Choose your experience to continue:'
                  : 'Has disfrutado de tus recetas directas del mes. Elige tu experiencia para continuar:'}
              </p>
            </div>

            {/* Tarjeta A: Opción PRO (Prioritaria y destacada) */}
            <div className="relative p-4 sm:p-5 rounded-2xl border-2 border-brand-primary bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-white space-y-3.5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                    <Crown className="w-4 h-4 text-brand-primary" />
                  </div>
                  <span className="font-bold text-sm sm:text-base text-stone-900">
                    {isEn ? 'Miga PRO Experience' : 'Experiencia Miga PRO'}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-primary text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
                  {isEn ? 'Recommended' : 'Recomendado'}
                </span>
              </div>

              <ul className="text-xs text-stone-700 space-y-2 pl-0.5">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>{isEn ? 'Instant extraction' : 'Extracción instantánea'}</strong>{' '}
                    {isEn ? 'without waits or ads.' : 'sin esperas ni anuncios.'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>{isEn ? 'Up to 150 recipes/month' : 'Hasta 150 recetas/mes'}</strong>{' '}
                    {isEn ? 'and advanced technical calibration.' : 'y calibración técnica avanzada.'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>{isEn ? 'Export weekly menus to PDF' : 'Exportación de menús a PDF'}</strong>{' '}
                    {isEn ? 'with official editorial branding.' : 'editorial de alta resolución.'}
                  </span>
                </li>
              </ul>

              <button
                type="button"
                onClick={() => {
                  if (onSelectPro) {
                    onSelectPro();
                  }
                }}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>{isEn ? 'Get PRO & extract instantly' : 'Hazte PRO y extrae al instante'}</span>
              </button>
            </div>

            {/* Tarjeta B: Opción Gratuita con Anuncio */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-stone-600" />
                  <span className="font-semibold text-xs sm:text-sm text-stone-800">
                    {isEn ? 'Continue Free' : 'Continuar Gratis'}
                  </span>
                </div>
                <span className="text-[11px] text-stone-500 font-medium">
                  {isEn ? 'Short sponsor ad' : 'Un breve anuncio'}
                </span>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                {isEn
                  ? 'Watch a short video from our sponsors (or wait 5s on web) to process this recipe without charge.'
                  : 'Visualiza un breve anuncio de nuestros patrocinadores (o espera 5s en web) para procesar esta receta sin coste.'}
              </p>

              <button
                type="button"
                onClick={() => setViewState('playing')}
                className="w-full min-h-[42px] py-2 px-4 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 font-medium text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Play className="w-3.5 h-3.5 text-brand-primary fill-current" />
                <span>{isEn ? 'Watch ad and continue' : 'Ver anuncio y continuar'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* FASE 2: REPRODUCCIÓN / TEMPORIZADOR DEL ANUNCIO                           */
          /* ========================================================================= */
          <div className="space-y-6 text-center">
            {/* Cabecera / Badge de Patrocinador */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-light border border-brand-subtle text-brand-primary text-xs font-semibold tracking-wide uppercase">
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

            {isAdMobPlaying ? (
              /* Estado cargando AdMob nativo */
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                <span className="text-xs text-stone-500 font-medium">
                  {isEn ? 'Loading sponsor video...' : 'Cargando vídeo patrocinado...'}
                </span>
              </div>
            ) : (
              /* Display del Contador Regresivo en Web */
              <div className="py-4 flex flex-col items-center justify-center">
                <div className="relative w-28 h-28 flex items-center justify-center">
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
                      className="text-brand-primary transition-all duration-1000 ease-linear"
                      fill="none"
                    />
                  </svg>

                  <div className="absolute flex flex-col items-center justify-center text-center">
                    {secondsRemaining > 0 ? (
                      <>
                        <span className="text-3xl font-extrabold text-brand-primary font-mono leading-none">
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
            )}

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
        )}
      </div>
    </div>
  );
}

