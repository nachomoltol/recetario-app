/**
 * Helper de audio gastronómico para Miga.
 * Reproduce el crujido característico tras completar con éxito
 * la extracción, análisis o guardado de recetas.
 */
export function playCrunchFeedback(): void {
  if (typeof window === 'undefined') return;
  try {
    const audio = new Audio('/sounds/miga-crunch.mp3');
    audio.volume = 0.65;
    audio.play().catch((err) => {
      console.warn('[AudioFeedback] No se pudo reproducir el crujido:', err);
    });
  } catch {
    // Silencioso
  }
}
