import { Capacitor } from '@capacitor/core';

/**
 * Abre enlaces externos (vídeos originales de TikTok, Instagram, YouTube o webs de recetas)
 * de forma segura según la plataforma de ejecución:
 * 
 * - En Capacitor móvil nativo (Android / iOS):
 *   Usa `window.open(url, '_system')` para delegar la apertura en la aplicación
 *   nativa correspondiente instalada en el sistema (app de YouTube, TikTok, Instagram)
 *   o el navegador predeterminado del sistema (Chrome / Safari), garantizando que
 *   la WebView principal de Miga no sea secuestrada ni reemplazada en el historial.
 * 
 * - En navegador web estándar (PC / Mac):
 *   Usa `window.open(url, '_blank', 'noopener,noreferrer')`.
 */
export async function openExternalVideoUrl(url?: string | null): Promise<void> {
  if (!url || typeof window === 'undefined') return;

  const trimmedUrl = url.trim();
  if (!trimmedUrl) return;

  if (Capacitor.isNativePlatform()) {
    try {
      // Si el plugin AppLauncher está registrado en el runtime de Capacitor, usarlo
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plugin = (window as any)?.Capacitor?.Plugins?.AppLauncher;
      if (plugin && typeof plugin.openUrl === 'function') {
        await plugin.openUrl({ url: trimmedUrl });
        return;
      }

      // Fallback nativo oficial en Capacitor: '_system' lanza el Intent en Android o UIApplication en iOS
      window.open(trimmedUrl, '_system');
    } catch (err) {
      console.warn('[externalLauncher] Error al invocar apertura nativa, ejecutando fallback _system:', err);
      window.open(trimmedUrl, '_system');
    }
  } else {
    // Entorno Web estándar
    window.open(trimmedUrl, '_blank', 'noopener,noreferrer');
  }
}

