import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

const WEB_DEVICE_KEY = 'miga_device_uuid';

/**
 * Obtiene el identificador único y persistente del dispositivo físico.
 * - En Capacitor Nativo (Android / iOS): Utiliza el hardware UUID oficial (ANDROID_ID / IDFV).
 * - En Web / PWA: Genera y persiste un identificador determinista en localStorage / cookies.
 */
export async function getDeviceIdentifier(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'server_fallback';
  }

  // 1. Intento en entorno nativo Capacitor
  try {
    if (Capacitor.isNativePlatform()) {
      const info = await Device.getId();
      if (info?.identifier) {
        return `native_${info.identifier}`;
      }
    }
  } catch (err) {
    console.warn('[deviceIdentifier] No se pudo obtener Device.getId() nativo:', err);
  }

  // 2. Fallback para Web / PWA con persistencia en localStorage
  try {
    let webId = localStorage.getItem(WEB_DEVICE_KEY);
    if (!webId) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        webId = `web_${crypto.randomUUID()}`;
      } else {
        webId = `web_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
      }
      localStorage.setItem(WEB_DEVICE_KEY, webId);
    }
    return webId;
  } catch {
    return 'web_volatile_fallback';
  }
}
