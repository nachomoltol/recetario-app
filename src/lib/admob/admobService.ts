import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
  RewardAdPluginEvents,
  type AdMobRewardItem,
} from '@capacitor-community/admob';

interface NativeWindowBridge {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
    PluginHeaders?: unknown[];
  };
  WEBVIEW_SERVER_URL?: string;
  webkit?: {
    messageHandlers?: {
      bridge?: unknown;
      [key: string]: unknown;
    };
  };
  androidBridge?: unknown;
}

function getNativeWindow(): NativeWindowBridge | null {
  if (typeof window === 'undefined') return null;
  return window as unknown as NativeWindowBridge;
}

function isAppleTouchDevice(ua: string): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Puente nativo REAL de Capacitor: devuelve true únicamente cuando Capacitor ha inyectado
 * de verdad su puente en la WebView (Capacitor.isNativePlatform(), webkit.messageHandlers.bridge
 * en iOS o androidBridge en Android). NUNCA devuelve true solo por ser un iPhone/iPad o por
 * tener un objeto `window.webkit` genérico (Safari iOS), para no activar el stub AdMobWeb.
 */
export function hasRealCapacitorBridge(): boolean {
  const win = getNativeWindow();
  if (!win) return false;
  try {
    if (Capacitor.isNativePlatform()) return true;
    if (win.Capacitor?.isNativePlatform?.()) return true;
    if (Boolean(win.webkit?.messageHandlers?.bridge)) return true;
    if (Boolean(win.androidBridge)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Alias retrocompatible: puente nativo realmente activo para invocar plugins nativos.
 */
export function hasActiveNativeBridge(): boolean {
  return hasRealCapacitorBridge();
}

/**
 * Detecta si la aplicación se ejecuta en un entorno nativo (iOS o Android)
 * con puente real de Capacitor. Devuelve false en Web/PC/Safari iOS.
 */
export function isNativePlatform(): boolean {
  return hasRealCapacitorBridge();
}

/**
 * Detecta específicamente entorno nativo Android (Capacitor, androidBridge o User-Agent de la app).
 */
export function isNativeAndroidPlatform(): boolean {
  const win = getNativeWindow();
  if (!win) return false;
  try {
    const isCapNative = Capacitor.isNativePlatform() || Boolean(win.Capacitor?.isNativePlatform?.());
    const capPlatform = Capacitor.getPlatform() || win.Capacitor?.getPlatform?.() || 'web';
    if ((isCapNative && capPlatform === 'android') || Boolean(win.androidBridge)) {
      return true;
    }

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
 * Detecta si se ejecuta dentro de la APP nativa de iOS (para reglas visuales / Apple 3.1.1).
 * - true si hay puente real de Capacitor en iOS, o
 * - true si el User-Agent identifica la app (MigaAppIOS, Capacitor, com.migaapp.app), o
 * - true si es un WKWebView embebido en iPhone/iPad (sin "Safari/" ni PWA standalone).
 * Safari iPhone (con "Safari/") se comporta como Web normal.
 */
export function isNativeIosPlatform(): boolean {
  const win = getNativeWindow();
  if (!win) return false;
  try {
    const capPlatform = Capacitor.getPlatform();
    const winCapPlatform = win.Capacitor?.getPlatform?.();
    const iosPlatformFlag = capPlatform === 'ios' || winCapPlatform === 'ios';

    // 1. Puente real de Capacitor en iOS
    if (hasRealCapacitorBridge() && (iosPlatformFlag || Boolean(win.webkit?.messageHandlers?.bridge))) {
      return true;
    }

    const ua = window.navigator.userAgent || '';
    if (!isAppleTouchDevice(ua)) return false;

    // 2. Firma explícita de la app nativa
    if (/MigaAppIOS|Capacitor|com\.migaapp\.app/i.test(ua)) {
      return true;
    }

    // 3. WKWebView embebido: sin "Safari/", sin navegadores de terceros y sin PWA standalone
    const isIosStandalonePwa = Boolean(
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
    const isThirdPartyIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|DuckDuckGo/i.test(ua);
    const hasSafariToken = /Safari\//i.test(ua);

    if (/AppleWebKit/i.test(ua) && !isIosStandalonePwa && !isThirdPartyIosBrowser && !hasSafariToken) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Alias semántico: app nativa iOS (reglas visuales / Apple 3.1.1).
 */
export function isNativeIosApp(): boolean {
  return isNativeIosPlatform();
}

/**
 * Detecta si la aplicación se ejecuta en una plataforma móvil nativa oficial (Android o iOS).
 */
export function isNativeMobilePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return isNativeIosPlatform() || isNativeAndroidPlatform() || hasRealCapacitorBridge();
  } catch {
    return false;
  }
}

const IOS_PROD_REWARDED_AD_UNIT_ID = 'ca-app-pub-8525131609099761/3729572928';
const ANDROID_PROD_REWARDED_AD_UNIT_ID = 'ca-app-pub-8525131609099761/6495393562';
const IOS_TEST_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/1712485313';
const ANDROID_TEST_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

const UMP_INFO_TIMEOUT_MS = 8000;
const UMP_FORM_TIMEOUT_MS = 45000;
const ADMOB_INIT_TIMEOUT_MS = 10000;
const PREPARE_AD_TIMEOUT_MS = 12000;
const SHOW_START_TIMEOUT_MS = 15000;
const SHOW_GLOBAL_TIMEOUT_MS = 5 * 60 * 1000;
const SILENT_RESOLVE_GRACE_MS = 1500;

class AdMobTimeoutError extends Error {
  constructor(label: string) {
    super(`${label}_TIMEOUT`);
    this.name = 'AdMobTimeoutError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AdMobTimeoutError(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function classifyAdError(err: unknown, fallbackCode: string): string {
  if (err instanceof AdMobTimeoutError) return 'AD_LOAD_TIMEOUT';
  const msg = (
    err instanceof Error ? err.message : (err as { message?: string })?.message || String(err ?? '')
  ).toLowerCase();
  if (/no ad|no fill|no_fill|not available|inventory/.test(msg)) return 'AD_NO_FILL';
  if (/timeout/.test(msg)) return 'AD_LOAD_TIMEOUT';
  return fallbackCode;
}

/**
 * Obtiene el ID del bloque de anuncios de vídeo bonificado (Rewarded Video).
 * En producción usa el Ad Unit ID oficial de cada plataforma; en otros entornos el ID de pruebas de Google.
 */
export function getRewardedAdUnitId(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const isIos = Capacitor.getPlatform() === 'ios' || isNativeIosPlatform();

  if (isProduction) {
    if (isIos) {
      return (
        process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID_IOS?.trim() ||
        IOS_PROD_REWARDED_AD_UNIT_ID
      );
    }

    return (
      process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID_ANDROID?.trim() ||
      process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID?.trim() ||
      ANDROID_PROD_REWARDED_AD_UNIT_ID
    );
  }

  if (isIos) {
    return IOS_TEST_REWARDED_AD_UNIT_ID;
  }

  return ANDROID_TEST_REWARDED_AD_UNIT_ID;
}

let isUmpConsentGathered = false;
let umpPromise: Promise<boolean> | null = null;
let useNonPersonalizedAds = false;

/**
 * Solicita el consentimiento Google UMP con estrategia fail-open: ante timeout, error o
 * ausencia de formulario nunca bloquea; devuelve siempre un booleano (canRequestAds).
 * El consentimiento IDFA/GDPR lo gestiona UMP (sin ATT manual).
 */
export async function ensureUmpConsent(): Promise<boolean> {
  if (!hasRealCapacitorBridge() || isUmpConsentGathered) return true;
  if (umpPromise) return umpPromise;

  umpPromise = (async () => {
    try {
      const isTesting = process.env.NODE_ENV !== 'production';

      const consentInfo = await withTimeout(
        AdMob.requestConsentInfo({
          debugGeography: isTesting ? 1 : 0,
        }),
        UMP_INFO_TIMEOUT_MS,
        'UMP_INFO'
      );

      if (
        consentInfo.isConsentFormAvailable &&
        consentInfo.status === AdmobConsentStatus.REQUIRED
      ) {
        const updatedInfo = await withTimeout(
          AdMob.showConsentForm(),
          UMP_FORM_TIMEOUT_MS,
          'UMP_FORM'
        );
        isUmpConsentGathered = true;
        return updatedInfo.canRequestAds;
      }

      isUmpConsentGathered = true;
      return consentInfo.canRequestAds;
    } catch (err) {
      console.warn('[AdMob UMP] Consentimiento no disponible o con timeout (fail-open):', err);
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
 * Inicializa SIEMPRE el SDK de Google Mobile Ads tras intentar el consentimiento UMP.
 * No hay retorno prematuro: si UMP no permite anuncios personalizados se solicitan
 * anuncios no personalizados (npa), pero AdMob.initialize() se ejecuta siempre para que el
 * plugin nativo asigne sus executors.
 */
export async function initializeAdMob(): Promise<void> {
  if (!hasRealCapacitorBridge()) {
    throw new Error('NATIVE_BRIDGE_UNAVAILABLE');
  }
  if (isAdMobInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const canRequestAds = await ensureUmpConsent();
      if (!canRequestAds) {
        useNonPersonalizedAds = true;
        console.warn('[AdMob] UMP sin permiso de personalización; se inicializa igualmente con anuncios no personalizados.');
      }

      const isTesting = process.env.NODE_ENV !== 'production';
      const isIos = Capacitor.getPlatform() === 'ios' || isNativeIosPlatform();

      await withTimeout(
        AdMob.initialize({
          initializeForTesting: isTesting,
        }),
        ADMOB_INIT_TIMEOUT_MS,
        'ADMOB_INIT'
      );

      // Margen para que los adaptadores nativos del SDK completen su arranque
      await new Promise((resolve) => setTimeout(resolve, isIos ? 500 : 200));

      isAdMobInitialized = true;
    } catch (error) {
      console.error('[AdMob] Error al inicializar AdMob SDK:', error);
      throw error;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

let isAdLoaded = false;
let preloadPromise: Promise<PreloadOutcome> | null = null;

interface PreloadOutcome {
  ok: boolean;
  error?: string;
}

async function runPreload(): Promise<PreloadOutcome> {
  if (!hasRealCapacitorBridge()) {
    return { ok: false, error: 'NATIVE_BRIDGE_UNAVAILABLE' };
  }
  if (isAdLoaded) return { ok: true };

  const isIos = Capacitor.getPlatform() === 'ios' || isNativeIosPlatform();
  const adId = getRewardedAdUnitId();

  try {
    if (!isAdMobInitialized) {
      await initializeAdMob();
    }
    if (!isAdMobInitialized) {
      return { ok: false, error: 'ADMOB_NOT_INITIALIZED' };
    }

    await withTimeout(
      AdMob.prepareRewardVideoAd({ adId, ...(useNonPersonalizedAds ? { npa: true } : {}) }),
      PREPARE_AD_TIMEOUT_MS,
      'PREPARE_AD'
    );
    isAdLoaded = true;
    return { ok: true };
  } catch (err) {
    console.warn('[AdMob] Error en precarga de anuncio bonificado primario:', err);
    const primaryError = classifyAdError(err, 'AD_LOAD_FAILED');

    // Respaldo automático al bloque oficial de prueba de Google si el bloque comercial falla
    const fallbackAdId = isIos ? IOS_TEST_REWARDED_AD_UNIT_ID : ANDROID_TEST_REWARDED_AD_UNIT_ID;
    if (adId !== fallbackAdId && hasRealCapacitorBridge() && isAdMobInitialized) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await withTimeout(
          AdMob.prepareRewardVideoAd({
            adId: fallbackAdId,
            isTesting: true,
            ...(useNonPersonalizedAds ? { npa: true } : {}),
          }),
          PREPARE_AD_TIMEOUT_MS,
          'PREPARE_AD'
        );
        isAdLoaded = true;
        return { ok: true };
      } catch (fallbackErr) {
        console.warn('[AdMob] Falló también el bloque de respaldo de prueba:', fallbackErr);
      }
    }

    isAdLoaded = false;
    return { ok: false, error: primaryError };
  }
}

/**
 * Precarga el anuncio bonificado. Nunca se queda colgada: todas las llamadas nativas
 * tienen timeout y sin puente real de Capacitor aborta sin invocar el stub AdMobWeb.
 */
export async function preloadRewardedAd(): Promise<boolean> {
  const outcome = await preloadRewardedAdDetailed();
  return outcome.ok;
}

async function preloadRewardedAdDetailed(): Promise<PreloadOutcome> {
  if (!hasRealCapacitorBridge()) {
    return { ok: false, error: 'NATIVE_BRIDGE_UNAVAILABLE' };
  }
  if (isAdLoaded) return { ok: true };
  if (preloadPromise) return preloadPromise;

  preloadPromise = runPreload().finally(() => {
    preloadPromise = null;
  });

  return preloadPromise;
}

export interface ShowRewardedAdResult {
  rewarded: boolean;
  reward?: AdMobRewardItem;
  error?: string;
}

/**
 * Muestra el anuncio de vídeo bonificado devolviendo siempre un estado determinista
 * (nunca queda pendiente indefinidamente) y limpiando listeners y temporizadores.
 */
export async function showRewardVideoAdFlow(): Promise<ShowRewardedAdResult> {
  if (!hasRealCapacitorBridge()) {
    return { rewarded: false, error: 'NATIVE_BRIDGE_UNAVAILABLE' };
  }

  try {
    if (!isAdLoaded) {
      const outcome = await preloadRewardedAdDetailed();
      if (!outcome.ok) {
        return { rewarded: false, error: outcome.error || 'AD_LOAD_FAILED' };
      }
    }

    return await new Promise<ShowRewardedAdResult>((resolve) => {
      let earnedReward: AdMobRewardItem | null = null;
      let isResolved = false;
      let showedFired = false;
      let rewardedFired = false;

      let rewardSub: { remove: () => Promise<void> } | null = null;
      let dismissSub: { remove: () => Promise<void> } | null = null;
      let failedSub: { remove: () => Promise<void> } | null = null;
      let showedSub: { remove: () => Promise<void> } | null = null;

      let showStartTimer: ReturnType<typeof setTimeout> | null = null;
      let globalTimer: ReturnType<typeof setTimeout> | null = null;
      let graceTimer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = async () => {
        if (showStartTimer) clearTimeout(showStartTimer);
        if (globalTimer) clearTimeout(globalTimer);
        if (graceTimer) clearTimeout(graceTimer);
        const subs = [rewardSub, dismissSub, failedSub, showedSub];
        for (const sub of subs) {
          try {
            if (sub) await sub.remove();
          } catch {}
        }
      };

      const safeResolve = (result: ShowRewardedAdResult) => {
        if (isResolved) return;
        isResolved = true;
        isAdLoaded = false; // Anuncio consumido: forzar nueva precarga
        cleanup()
          .catch(() => {})
          .finally(() => resolve(result));
      };

      const attach = async () => {
        try {
          rewardSub = await AdMob.addListener(
            RewardAdPluginEvents.Rewarded,
            (reward: AdMobRewardItem) => {
              rewardedFired = true;
              earnedReward = reward;
            }
          );

          showedSub = await AdMob.addListener(RewardAdPluginEvents.Showed, () => {
            showedFired = true;
            if (showStartTimer) {
              clearTimeout(showStartTimer);
              showStartTimer = null;
            }
          });

          dismissSub = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
            if (earnedReward) {
              safeResolve({ rewarded: true, reward: earnedReward });
            } else {
              safeResolve({ rewarded: false, error: 'AD_DISMISSED_WITHOUT_REWARD' });
            }
          });

          failedSub = await AdMob.addListener(RewardAdPluginEvents.FailedToShow, (err) => {
            safeResolve({ rewarded: false, error: err?.message || 'AD_FAILED_TO_SHOW' });
          });

          // Si el anuncio no llega a mostrarse en el tiempo previsto, salir de forma controlada
          showStartTimer = setTimeout(() => {
            if (!showedFired && !rewardedFired) {
              safeResolve({ rewarded: false, error: 'AD_NOT_SHOWN' });
            }
          }, SHOW_START_TIMEOUT_MS);

          // Tope global de seguridad
          globalTimer = setTimeout(() => {
            safeResolve({
              rewarded: false,
              error: earnedReward ? 'AD_DISMISS_TIMEOUT' : 'AD_SHOW_TIMEOUT',
            });
          }, SHOW_GLOBAL_TIMEOUT_MS);

          AdMob.showRewardVideoAd()
            .then((res) => {
              if (res && (res.type || res.amount)) {
                earnedReward = res;
                rewardedFired = true;
              }
              // Resolvió sin eventos nativos válidos (p. ej. stub web): salida controlada
              if (!showedFired && !rewardedFired) {
                graceTimer = setTimeout(() => {
                  if (!showedFired && !rewardedFired) {
                    safeResolve({ rewarded: false, error: 'AD_NOT_SHOWN' });
                  }
                }, SILENT_RESOLVE_GRACE_MS);
              }
            })
            .catch((err) => {
              console.warn('[AdMob] Error al invocar showRewardVideoAd:', err);
              safeResolve({
                rewarded: false,
                error: classifyAdError(err, 'SHOW_EXCEPTION'),
              });
            });
        } catch (subErr) {
          safeResolve({
            rewarded: false,
            error: subErr instanceof Error ? subErr.message : 'LISTENER_ATTACH_FAILED',
          });
        }
      };

      void attach();
    });
  } catch (err: unknown) {
    console.error('[AdMob] Error al mostrar vídeo bonificado:', err);
    isAdLoaded = false;
    return {
      rewarded: false,
      error: classifyAdError(err, 'AD_LOAD_FAILED'),
    };
  }
}
