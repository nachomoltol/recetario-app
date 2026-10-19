import { GoogleGenAI } from '@google/genai';

let geminiClientInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (geminiClientInstance) {
    return geminiClientInstance;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('No se encontró GEMINI_API_KEY en las variables de entorno.');
  }

  geminiClientInstance = new GoogleGenAI({ apiKey });
  return geminiClientInstance;
}

/**
 * Modelo fijado ESTRICTAMENTE a la versión más económica: Gemini 3.1 Flash Lite ('gemini-3.1-flash-lite').
 * Bloquea cualquier configuración residual de entorno o fallback hacia modelos pesados o Pro.
 */
export const PRIMARY_GEMINI_MODEL = 'gemini-3.1-flash-lite';
export const FALLBACK_GEMINI_MODELS: string[] = [];

export function getActiveGeminiModel(): string {
  return PRIMARY_GEMINI_MODEL;
}
