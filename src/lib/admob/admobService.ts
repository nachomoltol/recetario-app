import { Capacitor } from '@capacitor/core';
import {
  AdMob,
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
 * Obtiene el ID del bloque de anuncios de vídeo bonificado (Rewarded Video).
 * Si la variable de entorno indica que estamos en producción (process.env.NODE_ENV === 'production'),
 * utiliza el Ad Unit ID oficial: ca-app-pub-8525131609099761/6495393562.
 * En cualquier otro caso (desarrollo o testing), utiliza el ID oficial de pruebas de Google:
 * ca-app-pub-3940256099942544/5224354917.
 */
export function getRewardedAdUnitId(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const platform = Capacitor.getPlatform();

  if (isProduction) {
    if (platform === 'ios') {
      return (
        process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID_IOS ||
        process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID ||
        'ca-app-pub-8525131609099761/6495393562'
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

let isAdMobInitialized = false;

/**
 * Inicializa el SDK de Google Mobile Ads (AdMob) si no ha sido inicializado.
 */
export async function initializeAdMob(): Promise<void> {
  if (!isNativePlatform() || isAdMobInitialized) return;

  try {
    const isTesting = process.env.NODE_ENV !== 'production';

    await AdMob.initialize({
      initializeForTesting: isTesting,
    });
    isAdMobInitialized = true;
  } catch (error) {
    console.error('[AdMob] Error al inicializar AdMob SDK:', error);
  }
}

export interface ShowRewardedAdResult {
  rewarded: boolean;
  reward?: AdMobRewardItem;
  error?: string;
}

/**
 * Prepara y muestra un anuncio de vídeo con recompensa (Rewarded Video).
 * Solo se ejecuta si estamos en una plataforma nativa (iOS/Android).
 * Retorna true en `rewarded` si el usuario vio el vídeo completo y se le otorgó la recompensa.
 */
export async function showRewardVideoAdFlow(): Promise<ShowRewardedAdResult> {
  if (!isNativePlatform()) {
    return {
      rewarded: false,
      error: 'PLATFORM_NOT_SUPPORTED',
    };
  }

  try {
    await initializeAdMob();

    const adId = getRewardedAdUnitId();
    let earnedReward: AdMobRewardItem | null = null;

    // Escuchar el evento de recompensa
    const rewardListener = await AdMob.addListener(
      RewardAdPluginEvents.Rewarded,
      (reward: AdMobRewardItem) => {
        earnedReward = reward;
      }
    );

    try {
      // 1. Preparar el anuncio
      await AdMob.prepareRewardVideoAd({ adId });

      // 2. Mostrar el anuncio
      const resultReward = await AdMob.showRewardVideoAd();
      if (resultReward) {
        earnedReward = resultReward;
      }
    } finally {
      // Limpiar listener
      await rewardListener.remove();
    }

    if (earnedReward) {
      return {
        rewarded: true,
        reward: earnedReward,
      };
    }

    return {
      rewarded: false,
      error: 'AD_DISMISSED_WITHOUT_REWARD',
    };
  } catch (err: unknown) {
    console.error('[AdMob] Error al mostrar vídeo bonificado:', err);
    return {
      rewarded: false,
      error: err instanceof Error ? err.message : 'AD_LOAD_FAILED',
    };
  }
}
