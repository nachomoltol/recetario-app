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
 * con valor por defecto en código: gemini-3.1-flash-lite.
 */
export const PRIMARY_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
export const FALLBACK_GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];

export function getActiveGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
}
