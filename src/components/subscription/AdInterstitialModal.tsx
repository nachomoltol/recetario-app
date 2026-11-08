'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  ChefHat,
  Crown,
  Play,
  PlayCircle,
  Check,
  Loader2,
  ExternalLink,
  Mail,
  AlertCircle,
  CheckCircle2,
  Monitor,
  Smartphone,
  RefreshCw,
  PartyPopper,
  Globe,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { createClient } from '@/lib/supabase/client';
import {
  isNativePlatform,
  isNativeMobilePlatform,
  showRewardVideoAdFlow,
  preloadRewardedAd,
} from '@/lib/admob/admobService';
import { claimAdRewardAction } from '@/app/actions/claimAdRewardAction';
import { checkUserBalanceAction } from '@/app/actions/checkUserBalanceAction';
import { requestMobileAdUnlockAction } from '@/app/actions/requestMobileAdUnlockAction';

export interface AdInterstitialModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onCancel: () => void;
  onSelectPro?: () => void;
  pendingUrl?: string;
  isCrossDeviceRequest?: boolean;
}

type PlatformType = 'android_native' | 'ios_native' | 'ios_web' | 'desktop_web';
type ViewStateType = 'choice' | 'playing' | 'reward_credited';

export function AdInterstitialModal({
  isOpen,
  onComplete,
  onCancel,
  onSelectPro,
  pendingUrl,
  isCrossDeviceRequest,
}: AdInterstitialModalProps) {
  const language = useLanguageStore((s) => s.language);
  const isEn = language === 'en';
  const profile = useProfileStore((state) => state.profile);
  const [syncedCapturas, setSyncedCapturas] = useState<number | null>(
    profile?.capturas_mes_actual != null ? Number(profile.capturas_mes_actual) : null
  );
  const [syncedCreditosAnuncio, setSyncedCreditosAnuncio] = useState<number>(
    Number((profile as any)?.creditos_anuncio) || 0
  );
  const capturas =
    syncedCapturas !== null
      ? syncedCapturas
      : profile?.capturas_mes_actual != null
      ? Number(profile.capturas_mes_actual)
      : 20;
  const recetasRestantes = Math.max(0, 20 - capturas);

  const [viewState, setViewState] = useState<ViewStateType>('choice');
  const [platform, setPlatform] = useState<PlatformType>('desktop_web');
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [isAdMobPlaying, setIsAdMobPlaying] = useState(false);
  const [dismissWarning, setDismissWarning] = useState<string | null>(null);

  // Estado del usuario y correo
  const [userEmail, setUserEmail] = useState<string>(profile?.email || '');

  // Estado de comprobación de saldo y solicitud de recarga en PC / Web
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [balanceCheckStatus, setBalanceCheckStatus] = useState<'idle' | 'success' | 'not_found' | 'error'>('idle');
  const [balanceCheckMessage, setBalanceCheckMessage] = useState<string | null>(null);
  const [isUnlockRequested, setIsUnlockRequested] = useState(Boolean((profile as any)?.solicitud_recarga_pc));
  const [isRequestingUnlock, setIsRequestingUnlock] = useState(false);

  // Notificación toast local para Android al sincronizar hacia PC
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Detección precisa de plataforma: Android Nativo vs iOS vs Desktop Web
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const isNative = Capacitor.isNativePlatform();
      const capPlatform = Capacitor.getPlatform();
      const ua = navigator.userAgent || '';
      const isApple =
        capPlatform === 'ios' ||
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      if (isNative && capPlatform === 'android') {
        setPlatform('android_native');
      } else if (isNative && capPlatform === 'ios') {
        setPlatform('ios_native');
      } else if (isApple) {
        setPlatform('ios_web');
      } else {
        setPlatform('desktop_web');
      }
    } catch {
      setPlatform('desktop_web');
    }
  }, []);

  // Carga o sincronización del email del usuario activo
  useEffect(() => {
    if (profile?.email) {
      setUserEmail(profile.email);
    } else {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setUserEmail(data.user.email);
        }
      });
    }
  }, [profile?.email]);

  const userEmailDisplay = userEmail || (isEn ? 'your account' : 'tu cuenta');
  const isNativeAndroid = platform === 'android_native';
  const isNativeMobile = platform === 'android_native' || platform === 'ios_native';

  // Precarga automática del anuncio bonificado al abrir el modal en Android nativo
  useEffect(() => {
    if (isOpen && viewState === 'choice' && isNativePlatform()) {
      preloadRewardedAd().catch(() => {});
    }
  }, [isOpen, viewState]);

  // Al abrir o cerrar el modal, reiniciar estados limpios
  useEffect(() => {
    if (!isOpen) {
      setViewState('choice');
      setSecondsRemaining(5);
      setIsAdMobPlaying(false);
      setDismissWarning(null);
      setIsCheckingBalance(false);
      setBalanceCheckStatus('idle');
      setBalanceCheckMessage(null);
      setToastNotification(null);
      return;
    }
    setViewState('choice');
    setSecondsRemaining(5);
    setIsAdMobPlaying(false);
    setDismissWarning(null);
    setIsCheckingBalance(false);
    setBalanceCheckStatus('idle');
    setBalanceCheckMessage(null);
    setToastNotification(null);

    // Sincronizar de inmediato capturas_mes_actual, creditos_anuncio y solicitud de desbloqueo reciente (< 30 min)
    checkUserBalanceAction()
      .then((res) => {
        if (res.success) {
          setSyncedCapturas(res.capturas_mes_actual);
          setSyncedCreditosAnuncio(res.creditos_anuncio);

          if (res.solicitud_recarga_pc) {
            if (res.solicitud_recarga_pc_at) {
              const diffMs = Date.now() - new Date(res.solicitud_recarga_pc_at).getTime();
              if (diffMs < 30 * 60 * 1000) {
                setIsUnlockRequested(true);
                return;
              }
            } else {
              setIsUnlockRequested(true);
              return;
            }
          }
        }
        setIsUnlockRequested(Boolean((profile as any)?.solicitud_recarga_pc));
      })
      .catch(() => {});
  }, [isOpen, profile]);

  // Lógica de reproducción cuando el usuario pasa a 'playing'
  useEffect(() => {
    if (!isOpen || viewState !== 'playing') {
      return;
    }

    let isMounted = true;
    let timerInterval: NodeJS.Timeout | null = null;

    const startFallbackCountdown = () => {
      if (!isMounted) return;
      setIsAdMobPlaying(false);
      setSecondsRemaining(5);
      timerInterval = setInterval(() => {
        if (!isMounted) return;
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            if (timerInterval) clearInterval(timerInterval);
            setTimeout(() => {
              if (isMounted) onCompleteRef.current();
            }, 300);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    // 1. Entorno nativo Android: ejecutar AdMob Rewarded Video
    if (isNativePlatform()) {
      setIsAdMobPlaying(true);
      showRewardVideoAdFlow()
        .then(async (result) => {
          if (!isMounted) return;
          setIsAdMobPlaying(false);

          if (result.rewarded) {
            // Acreditar el saldo en la base de datos de Supabase (+1 creditos_anuncio)
            try {
              await claimAdRewardAction();
            } catch (err) {
              console.error('[AdInterstitialModal] Error acreditando recompensa en Supabase:', err);
            }

            if (!isMounted) return;

            // Comprobar si el modal se abrió por una solicitud cruzada de PC
            const isCrossDevice =
              typeof isCrossDeviceRequest === 'boolean'
                ? isCrossDeviceRequest
                : Boolean(isUnlockRequested && !pendingUrl);

            if (isCrossDevice) {
              // Si y solo si proviene de una solicitud de PC pendiente, mostrar pantalla de bifurcación
              setViewState('reward_credited');
            } else {
              // Flujo normal nativo de móvil: auto-extraer de inmediato sin pantallas intermedias
              onCompleteRef.current();
            }
          } else if (result.error === 'AD_DISMISSED_WITHOUT_REWARD') {
            setViewState('choice');
            setDismissWarning(
              isEn
                ? 'You must watch the full video to unlock your free recipe.'
                : 'Debes ver el vídeo completo para desbloquear tu receta gratuita.'
            );
          } else {
            console.warn('[AdInterstitial] Fallo al cargar anuncio de AdMob, ejecutando fallback de cortesía:', result.error);
            startFallbackCountdown();
          }
        })
        .catch((err) => {
          console.warn('[AdInterstitial] Excepción en AdMob nativo, ejecutando fallback:', err);
          if (isMounted) {
            startFallbackCountdown();
          }
        });

      return () => {
        isMounted = false;
        if (timerInterval) clearInterval(timerInterval);
      };
    }

    // 2. Otros entornos (Web/PC de cortesía si entrase en playing)
    startFallbackCountdown();

    return () => {
      isMounted = false;
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isOpen, viewState, isEn]);

  // Manejador del botón "Solicitar desbloqueo en mi móvil" en PC
  const handleRequestMobileUnlock = async () => {
    if (isRequestingUnlock) return;
    setIsRequestingUnlock(true);
    try {
      const res = await requestMobileAdUnlockAction({ url: pendingUrl });
      if (res.success) {
        setIsUnlockRequested(true);
      }
    } catch (err) {
      console.error('[AdInterstitialModal] Error solicitando desbloqueo móvil:', err);
    } finally {
      setIsRequestingUnlock(false);
    }
  };

  // Manejador del botón "Comprobar saldo / Ya vi el vídeo" en PC
  const handleCheckBalance = async () => {
    if (isCheckingBalance) return;
    setIsCheckingBalance(true);
    setBalanceCheckStatus('idle');
    setBalanceCheckMessage(null);

    try {
      const res = await checkUserBalanceAction();
      if (res.success) {
        setSyncedCapturas(res.capturas_mes_actual);
        setSyncedCreditosAnuncio(res.creditos_anuncio);
      }
      if (res.success && res.creditos_anuncio > 0) {
        setBalanceCheckStatus('success');
        setBalanceCheckMessage(
          isEn
            ? `Balance detected (${res.creditos_anuncio} recipe)! Unlocking recipe...`
            : `¡Saldo detectado (${res.creditos_anuncio} receta)! Desbloqueando receta...`
        );
        setTimeout(() => {
          onCompleteRef.current();
        }, 800);
      } else {
        setBalanceCheckStatus('not_found');
        setBalanceCheckMessage(
          isEn
            ? 'No credited balance detected yet. Make sure you completed the video on your Android phone using this same account.'
            : 'Aún no se ha detectado saldo acreditado. Asegúrate de haber completado el vídeo en tu móvil con esta misma cuenta.'
        );
      }
    } catch (err) {
      setBalanceCheckStatus('error');
      setBalanceCheckMessage(
        isEn ? 'Error checking balance. Please try again.' : 'Error al comprobar saldo. Por favor, reinténtalo.'
      );
    } finally {
      setIsCheckingBalance(false);
    }
  };

  // Manejador para Android: Continuar en el PC
  const handleContinueOnPC = () => {
    setToastNotification(
      isEn
        ? 'Balance ready in cloud! You can unlock your recipe on your PC now.'
        : '¡Saldo listo en la nube! Ya puedes desbloquear tu receta en el PC.'
    );
    setTimeout(() => {
      onCancel();
    }, 1200);
  };

  // Manejador para Android: Procesar en este móvil
  const handleProcessOnMobile = () => {
    onCompleteRef.current();
  };

  if (!isOpen) return null;

  const progressPercent = Math.min(100, Math.max(0, ((5 - secondsRemaining) / 5) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-white border border-[#e7dfd5] rounded-3xl shadow-2xl overflow-hidden p-3.5 sm:p-6 space-y-3 text-stone-900 max-h-[95vh] overflow-y-auto">
        {/* Botón Cerrar/Cancelar */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-[#f4efe6] hover:bg-stone-200 border border-[#e7dfd5] flex items-center justify-center text-stone-500 hover:text-stone-800 transition cursor-pointer z-10"
          title={isEn ? 'Cancel generation' : 'Cancelar generación'}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Notificación Toast Flotante */}
        {toastNotification && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-sm px-3.5 py-2.5 bg-stone-900 text-white rounded-2xl shadow-xl flex items-center gap-2 text-xs font-medium animate-fade-in border border-stone-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastNotification}</span>
          </div>
        )}

        {viewState === 'reward_credited' ? (
          /* ========================================================================= */
          /* PANTALLA DE ÉXITO DE ACREDITACIÓN (EXCLUSIVO TRAS ADMOB EN ANDROID NATIVO)*/
          /* ========================================================================= */
          <div className="space-y-4 text-center py-2 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <PartyPopper className="w-7 h-7 text-emerald-600 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold tracking-wide uppercase">
                <CheckCircle2 className="w-3 h-3" />
                <span>{isEn ? 'Reward Confirmed' : 'Recompensa Confirmada'}</span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold font-serif-recipe text-stone-900">
                {isEn ? 'Credit Added Successfully! (+1 Recipe)' : '¡Crédito Acreditado con Éxito! (+1 Receta)'}
              </h3>

              <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                {isEn
                  ? `Your balance is now synced in the cloud for your account (${userEmailDisplay}). Where would you prefer to continue?`
                  : `Tu saldo ya está sincronizado en la nube para tu cuenta (${userEmailDisplay}). ¿Dónde prefieres continuar?`}
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Botón Principal: Continuar en el PC */}
              <button
                type="button"
                onClick={handleContinueOnPC}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-hover active:scale-[0.99] text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Monitor className="w-4 h-4 text-amber-200" />
                <span>{isEn ? 'Continue on PC' : 'Continuar en el PC'}</span>
              </button>

              {/* Botón Secundario: Procesar en este móvil */}
              <button
                type="button"
                onClick={handleProcessOnMobile}
                className="w-full min-h-[42px] py-2 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-300 active:scale-[0.99] text-stone-800 font-semibold text-xs sm:text-sm shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-stone-600" />
                <span>{isEn ? 'Process on this phone' : 'Procesar en este móvil'}</span>
              </button>
            </div>
          </div>
        ) : viewState === 'choice' ? (
          /* ========================================================================= */
          /* FASE 1: SELECTOR DUAL (HAZTE PRO VS CONTINUAR CON ANUNCIO SEGMENTADO)     */
          /* ========================================================================= */
          <div className="space-y-2.5">
            {/* Cabecera Editorial */}
            <div className="text-center space-y-1 pr-6 sm:pr-0">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-light border border-brand-subtle text-brand-primary text-[10px] sm:text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="w-3 h-3" />
                <span>{isEn ? 'Smart Generation' : 'Generación Inteligente'}</span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold font-serif-recipe text-stone-900 leading-snug">
                {isEn ? 'Choose how to process your recipe' : 'Elige cómo procesar tu receta'}
              </h3>

              <p className="text-xs text-stone-600 max-w-sm mx-auto leading-tight">
                {isEn
                  ? 'You have used your direct recipes this month. Choose your experience to continue:'
                  : 'Has disfrutado de tus recetas directas del mes. Elige tu experiencia para continuar:'}
              </p>
            </div>

            {/* Aviso en caso de descarte anticipado del vídeo bonificado */}
            {dismissWarning && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium flex items-center gap-2 animate-fade-in text-left">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{dismissWarning}</span>
              </div>
            )}

            {/* Tarjeta A: Opción PRO (Prioritaria y destacada) */}
            <div className="relative p-3 sm:p-3.5 rounded-2xl border-2 border-brand-primary bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-white space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                    <Crown className="w-3.5 h-3.5 text-brand-primary" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-stone-900">
                    {isEn ? 'Miga PRO Experience' : 'Experiencia Miga PRO'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-brand-primary text-white text-[9px] font-bold uppercase tracking-wider shadow-2xs">
                  {isEn ? 'Recommended' : 'Recomendado'}
                </span>
              </div>

              {/* 3 líneas ultra compactas */}
              <div className="space-y-1 text-xs text-stone-700 font-medium pl-0.5">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <span>{isEn ? 'Unlimited instant extraction' : 'Extracción ilimitada e instantánea'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <span>{isEn ? 'Up to 150 recipes/month with advanced AI' : 'Hasta 150 recetas/mes con IA avanzada'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <span>{isEn ? 'Weekly planner & PDF export' : 'Planificador semanal y exportación PDF'}</span>
                </div>
              </div>

              {!isNativeMobile ? (
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectPro) {
                      onSelectPro();
                    }
                  }}
                  className="w-full min-h-[40px] py-2 px-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-semibold text-xs shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>{isEn ? 'Get PRO & extract instantly' : 'Hazte PRO y extrae al instante'}</span>
                </button>
              ) : (
                /* Bloque informativo de soporte (Cumplimiento de Políticas de Google Play y Apple App Store Guideline 3.1.1) */
                <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-stone-700 space-y-1 text-left animate-fade-in">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-900 text-xs">
                    <Globe className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    <span>{isEn ? 'Web Subscription' : 'Suscripción en Web'}</span>
                  </div>
                  <p className="text-stone-600 leading-tight text-xs">
                    {isEn
                      ? 'Gestiona tu suscripción en migaapp.com iniciando con:'
                      : 'Gestiona tu suscripción en migaapp.com iniciando con:'}
                  </p>
                  <div className="font-mono text-xs font-semibold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200 w-fit break-all shadow-2xs">
                    {userEmailDisplay}
                  </div>
                </div>
              )}
            </div>

            {/* Tarjeta B: Opción Gratuita según plataforma */}
            <div className="relative p-3 sm:p-3.5 rounded-2xl border-2 border-[#e7dfd5] bg-gradient-to-br from-white via-[#faf7f2] to-[#f4efe6]/60 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center">
                    <PlayCircle className="w-3.5 h-3.5 text-stone-700" />
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-stone-900 block leading-tight">
                      {isEn ? 'Free Option' : 'Opción Gratuita'}
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium">
                      {isNativeMobile
                        ? (isEn ? 'Sponsored short ad' : 'Vídeo patrocinado')
                        : platform === 'ios_web'
                        ? (isEn ? 'iOS Web' : 'iOS Web')
                        : (isEn ? 'Via Mobile App' : 'Vía App Móvil')}
                    </span>
                  </div>
                </div>

                {/* Badge visible de recetas restantes */}
                <span className="px-2 py-0.5 rounded-full bg-emerald-100/90 border border-emerald-300 text-emerald-950 text-[10px] sm:text-[11px] font-bold tracking-tight whitespace-nowrap shadow-2xs">
                  {isEn
                    ? `${recetasRestantes} of 20 left`
                    : `${recetasRestantes} de 20 restantes`}
                </span>
              </div>

              {/* Banner explicativo de cupo mensual */}
              <div className="p-2 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-950 text-xs font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                <span className="leading-tight">
                  {isEn
                    ? `You have ${recetasRestantes} free recipes left this month (out of 20).`
                    : `Te quedan ${recetasRestantes} recetas gratis este mes (de 20).`}
                </span>
              </div>

              {/* Caso 1: Android Nativo o iOS Nativo (Botón sólido para ver anuncio de AdMob) */}
              {isNativeMobile && (
                <div className="space-y-1.5 pt-0.5">
                  <p className="text-xs text-stone-600 leading-tight">
                    {isEn
                      ? 'Watch a short sponsored video to process this recipe without charge.'
                      : 'Visualiza un breve anuncio para procesar esta receta sin coste.'}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setDismissWarning(null);
                      setViewState('playing');
                    }}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 text-amber-300 fill-current" />
                    <span>{isEn ? 'Watch ad and continue' : 'Ver anuncio y continuar'}</span>
                  </button>
                </div>
              )}

              {/* Caso 2: PC / Navegador Web de Escritorio (!isNativeMobile) */}
              {!isNativeMobile && platform === 'desktop_web' && (
                <div className="space-y-3 pt-0.5 text-left">
                  {/* Paso Previo Interactivo: Solicitud de Desbloqueo en Móvil */}
                  {!isUnlockRequested ? (
                    <button
                      type="button"
                      onClick={handleRequestMobileUnlock}
                      disabled={isRequestingUnlock}
                      className="w-full min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs sm:text-sm shadow-sm py-2 px-3.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-70"
                    >
                      {isRequestingUnlock ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <Smartphone className="w-4 h-4 text-white" />
                      )}
                      <span>
                        {isRequestingUnlock
                          ? (isEn ? 'Sending request to mobile...' : 'Enviando solicitud al móvil...')
                          : (isEn ? 'Request unlock on my phone' : 'Solicitar desbloqueo en mi móvil')}
                      </span>
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {isEn
                          ? 'Request sent! Open the Miga app on your phone to watch the ad.'
                          : '¡Solicitud enviada! Abre la app Miga en tu móvil para ver el anuncio'}
                      </span>
                    </div>
                  )}

                  {/* Guía Numerada Clara */}
                  <div className="space-y-1.5 text-xs text-stone-700 bg-[#f4efe6] p-2.5 rounded-xl border border-[#e7dfd5]">
                    <p className="font-semibold text-stone-900 text-xs flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-brand-primary" />
                      <span>{isEn ? 'Steps to unlock from mobile:' : 'Pasos para desbloquear desde el móvil:'}</span>
                    </p>
                    <ol className="space-y-1 list-decimal list-inside pl-0.5 leading-relaxed text-stone-700 text-[11px] sm:text-xs">
                      <li>
                        <span>{isEn ? 'Open MigaApp on your Android phone with this account: ' : 'Abre MigaApp en tu móvil Android con esta cuenta: '}</span>
                        <strong className="text-stone-900 break-all font-mono text-[10px] sm:text-[11px] bg-white px-1.5 py-0.2 rounded border border-stone-200">
                          {userEmailDisplay}
                        </strong>
                      </li>
                      <li>
                        <span>{isEn ? 'On your phone, tap to watch a short sponsored video.' : 'En tu móvil, pulsa ver un vídeo corto patrocinado.'}</span>
                      </li>
                      <li>
                        <span>{isEn ? 'After watching the ad, click the button below to unlock your extraction here.' : 'Tras ver el anuncio, pulsa el botón inferior para desbloquear tu extracción aquí.'}</span>
                      </li>
                    </ol>
                  </div>

                  {/* Alerta de Estado del Chequeo de Saldo */}
                  {balanceCheckStatus === 'success' && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{balanceCheckMessage || (isEn ? 'Balance detected! Unlocking recipe...' : '¡Saldo detectado! Desbloqueando receta...')}</span>
                    </div>
                  )}

                  {(balanceCheckStatus === 'not_found' || balanceCheckStatus === 'error') && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium flex items-center gap-2 animate-fade-in">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{balanceCheckMessage}</span>
                    </div>
                  )}

                  {/* Botón Interactivo de Verificación */}
                  <button
                    type="button"
                    onClick={handleCheckBalance}
                    disabled={isCheckingBalance || balanceCheckStatus === 'success'}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-75 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 text-amber-300 ${isCheckingBalance ? 'animate-spin' : ''}`} />
                    <span>
                      {isCheckingBalance
                        ? (isEn ? 'Checking balance...' : 'Comprobando saldo...')
                        : (isEn ? 'Check balance / I watched the video' : 'Comprobar saldo / Ya vi el vídeo')}
                    </span>
                  </button>

                  {/* Enlace Secundario: Google Play */}
                  <div className="text-center pt-0.5">
                    <a
                      href="https://play.google.com/store/apps/details?id=com.migaapp.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium underline underline-offset-4 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isEn ? "Don't have the app yet? Download on Google Play" : '¿Aún no tienes la app? Descargar en Google Play'}</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Caso 3: iPhone / iOS Web (Safari o PWA) */}
              {!isNativeMobile && platform === 'ios_web' && (
                <div className="space-y-3 pt-0.5">
                  <div className="p-3.5 rounded-xl bg-[#f4efe6] border border-[#e7dfd5] text-xs text-stone-700 leading-relaxed space-y-1 text-left">
                    <p className="font-medium text-stone-900">
                      {isEn ? 'Apple iOS' : 'Dispositivos Apple iOS'}
                    </p>
                    <p className="text-stone-600">
                      {isEn
                        ? 'Rewarded ads are currently only available on the Android App. We are preparing the launch on the Apple App Store.'
                        : 'Actualmente los anuncios bonificados solo están disponibles en la App de Android. Estamos preparando el lanzamiento en la App Store de Apple.'}
                    </p>
                  </div>

                  <a
                    href="mailto:migarecetasredes@gmail.com?subject=Avisadme%20cuando%20este%20en%20App%20Store"
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4 text-amber-300" />
                    <span>{isEn ? 'Notify me when available on iPhone' : 'Avísame cuando esté disponible en iPhone'}</span>
                  </a>
                </div>
              )}
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
                  className="bg-brand-primary h-full rounded-full transition-all duration-1000 ease-linear"
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
