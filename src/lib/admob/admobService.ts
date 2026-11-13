import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
  RewardAdPluginEvents,
  type AdMobRewardItem,
} from '@capacitor-community/admob';

/**
 * Detecta si la aplicación se está ejecutando en un entorno nativo (iOS o Android)
 * a través de Capacitor. Devuelve false en Web/PC.
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Detecta si la aplicación se está ejecutando específicamente en entorno nativo Android
 * a través de Capacitor o User-Agent embebido de la app oficial de Google Play.
 */
export function isNativeAndroidPlatform(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isCapNative = Capacitor.isNativePlatform();
    const capPlatform = Capacitor.getPlatform();
    if (isCapNative && capPlatform === 'android') return true;

    // Fallback complementario por User-Agent / WebView nativa Android de Capacitor
    const ua = navigator.userAgent || '';
    if (/Capacitor|com\.migaapp\.app/i.test(ua) && /Android/i.test(ua)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Detecta si la aplicación se está ejecutando en una plataforma móvil nativa oficial
 * (tanto Android como iOS), ya sea a través de Capacitor nativo o WebView oficial.
 */
export function isNativeMobilePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      if (platform === 'android' || platform === 'ios') {
        return true;
      }
    }

    // Fallback complementario por User-Agent / WebView nativa
    const ua = navigator.userAgent || '';
    if (/Capacitor|com\.migaapp\.app/i.test(ua) && /Android|iPhone|iPad|iPod/i.test(ua)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Detecta si la aplicación se está ejecutando específicamente en entorno nativo iOS
 * a través de Capacitor o User-Agent embebido de la app oficial de iOS.
 */
export function isNativeIosPlatform(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isCapNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    if (isCapNative && platform === 'ios') return true;

    const ua = window.navigator.userAgent || '';
    return /Capacitor|com\.migaapp\.app/i.test(ua) && /iPhone|iPad|iPod/i.test(ua);
  } catch {
    return false;
  }
}

/**
 * Obtiene el ID del bloque de anuncios de vídeo bonificado (Rewarded Video).
 * Si la variable de entorno indica que estamos en producción (process.env.NODE_ENV === 'production'),
 * utiliza el Ad Unit ID oficial para cada plataforma:
 * - Android: ca-app-pub-8525131609099761/6495393562
 * - iOS: ca-app-pub-8525131609099761/3729572928
 * En cualquier otro caso (desarrollo o testing), utiliza el ID oficial de pruebas de Google:
 * - Android: ca-app-pub-3940256099942544/5224354917
 * - iOS: ca-app-pub-3940256099942544/1712485313
 */
export function getRewardedAdUnitId(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const platform = Capacitor.getPlatform();

  if (isProduction) {
    if (platform === 'ios') {
      return (
        process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID_IOS ||
        process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID ||
        'ca-app-pub-8525131609099761/3729572928'
      );
    }

    return (
      process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID_ANDROID ||
      process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID ||
      'ca-app-pub-8525131609099761/6495393562'
    );
  }

  // En cualquier otro caso (desarrollo o testing), utiliza el ID oficial de pruebas de Google
  if (platform === 'ios') {
    return 'ca-app-pub-3940256099942544/1712485313';
  }

  return 'ca-app-pub-3940256099942544/5224354917';
}

let isUmpConsentGathered = false;
let umpPromise: Promise<boolean> | null = null;

/**
 * Solicita y gestiona el consentimiento del usuario con Google UMP antes de AdMob.
 * En la Unión Europea (RGPD) y Reino Unido, despliega el formulario oficial de AdMob si es requerido.
 */
export async function ensureUmpConsent(): Promise<boolean> {
  if (!isNativePlatform() || isUmpConsentGathered) return true;
  if (umpPromise) return umpPromise;

  umpPromise = (async () => {
    try {
      const isTesting = process.env.NODE_ENV !== 'production';

      // 1. Solicitar información de consentimiento a Google UMP
      const consentInfo = await AdMob.requestConsentInfo({
        debugGeography: isTesting ? 1 : 0, // 1 = EEA para entornos de prueba
      });

      // 2. Si se requiere consentimiento y el formulario está disponible, mostrarlo
      if (
        consentInfo.isConsentFormAvailable &&
        consentInfo.status === AdmobConsentStatus.REQUIRED
      ) {
        const updatedInfo = await AdMob.showConsentForm();
        isUmpConsentGathered = true;
        return updatedInfo.canRequestAds;
      }

      isUmpConsentGathered = true;
      return consentInfo.canRequestAds;
    } catch (err) {
      console.warn('[AdMob UMP] Error al procesar consentimiento UMP:', err);
      // En caso de fallo de red al pedir consentimiento, permitir inicialización defensiva
      return true;
    } finally {
      umpPromise = null;
    }
  })();

  return umpPromise;
}

let isAdMobInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Inicializa el SDK de Google Mobile Ads (AdMob) tras verificar el consentimiento UMP.
 */
export async function initializeAdMob(): Promise<void> {
  if (!isNativePlatform() || isAdMobInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const canRequestAds = await ensureUmpConsent();
      if (!canRequestAds) {
        console.warn('[AdMob] Consentimiento UMP denegado; no se pueden solicitar anuncios.');
        return;
      }

      const isTesting = process.env.NODE_ENV !== 'production';

      await AdMob.initialize({
        initializeForTesting: isTesting,
      });
      isAdMobInitialized = true;
    } catch (error) {
      console.error('[AdMob] Error al inicializar AdMob SDK:', error);
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

let isAdLoaded = false;
let preloadPromise: Promise<boolean> | null = null;

/**
 * Precarga el anuncio bonificado en background para reproducción instantánea.
 * Evita peticiones duplicadas mediante control de promesa activa.
 */
export async function preloadRewardedAd(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  if (isAdLoaded) return true;
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    try {
      await initializeAdMob();
      const adId = getRewardedAdUnitId();
      await AdMob.prepareRewardVideoAd({ adId });
      isAdLoaded = true;
      return true;
    } catch (err) {
      console.warn('[AdMob] Error en precarga de anuncio bonificado:', err);
      isAdLoaded = false;
      return false;
    } finally {
      preloadPromise = null;
    }
  })();

  return preloadPromise;
}

export interface ShowRewardedAdResult {
  rewarded: boolean;
  reward?: AdMobRewardItem;
  error?: string;
}

/**
 * Muestra el anuncio de vídeo bonificado gestionando de forma robusta los eventos
 * de recompensa y cierre para devolver un estado determinista.
 */
export async function showRewardVideoAdFlow(): Promise<ShowRewardedAdResult> {
  if (!isNativePlatform()) {
    return {
      rewarded: false,
      error: 'PLATFORM_NOT_SUPPORTED',
    };
  }

  try {
    // Si no está precargado, preparar ahora
    if (!isAdLoaded) {
      const ready = await preloadRewardedAd();
      if (!ready) {
        return {
          rewarded: false,
          error: 'AD_LOAD_FAILED',
        };
      }
    }

    return await new Promise<ShowRewardedAdResult>(async (resolve) => {
      let earnedReward: AdMobRewardItem | null = null;
      let isResolved = false;

      let rewardSub: { remove: () => Promise<void> } | null = null;
      let dismissSub: { remove: () => Promise<void> } | null = null;
      let failedSub: { remove: () => Promise<void> } | null = null;

      const safeResolve = async (result: ShowRewardedAdResult) => {
        if (isResolved) return;
        isResolved = true;
        isAdLoaded = false; // Marcar como consumido para forzar nueva precarga
        try {
          if (rewardSub) await rewardSub.remove();
          if (dismissSub) await dismissSub.remove();
          if (failedSub) await failedSub.remove();
        } catch {}
        resolve(result);
      };

      try {
        // 1. Escuchar evento de recompensa ganada
        rewardSub = await AdMob.addListener(
          RewardAdPluginEvents.Rewarded,
          (reward: AdMobRewardItem) => {
            earnedReward = reward;
          }
        );

        // 2. Escuchar evento de cierre/descarte del anuncio
        dismissSub = await AdMob.addListener(
          RewardAdPluginEvents.Dismissed,
          () => {
            if (earnedReward) {
              safeResolve({ rewarded: true, reward: earnedReward });
            } else {
              safeResolve({ rewarded: false, error: 'AD_DISMISSED_WITHOUT_REWARD' });
            }
          }
        );

        // 3. Escuchar evento de fallo al mostrar
        failedSub = await AdMob.addListener(
          RewardAdPluginEvents.FailedToShow,
          (err) => {
            safeResolve({ rewarded: false, error: err?.message || 'AD_FAILED_TO_SHOW' });
          }
        );

        // Invocar apertura del anuncio preparado
        AdMob.showRewardVideoAd()
          .then((res) => {
            if (res) {
              earnedReward = res;
            }
          })
          .catch((err) => {
            console.warn('[AdMob] Error al invocar showRewardVideoAd:', err);
            safeResolve({
              rewarded: false,
              error: err instanceof Error ? err.message : 'SHOW_EXCEPTION',
            });
          });
      } catch (subErr) {
        safeResolve({
          rewarded: false,
          error: subErr instanceof Error ? subErr.message : 'LISTENER_ATTACH_FAILED',
        });
      }
    });
  } catch (err: unknown) {
    console.error('[AdMob] Error al mostrar vídeo bonificado:', err);
    isAdLoaded = false;
    return {
      rewarded: false,
      error: err instanceof Error ? err.message : 'AD_LOAD_FAILED',
    };
  }
}
