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
 * Modelo configurable por variable de entorno GEMINI_MODEL,
 * con fallback por defecto en código a gemini-2.5-flash-lite para optimizar costes.
 */
export const PRIMARY_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
export const FALLBACK_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.8-flash'];

export function getActiveGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
}
