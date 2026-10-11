import { getGeminiClient, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODELS } from './client';
import {
  recipeExtractionSchema,
  SYSTEM_INSTRUCTION_RECIPES,
  ExtractedRecipe,
} from './schema';
import { FuenteTipoReceta } from '@/types/database';

export function detectFuenteTipo(url?: string): FuenteTipoReceta {
  if (!url) return 'manual';
  const lower = url.toLowerCase();
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  return 'web';
}

/**
 * Descarga y despoja metadatos relevantes de una URL (OpenGraph, título, descripción)
 */
async function fetchUrlMetadata(url: string): Promise<{
  titulo?: string;
  descripcion?: string;
  cuerpoTexto?: string;
}> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return {};
    }

    const html = await res.text();

    // Extraer título
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const titulo = ogTitleMatch?.[1] || titleMatch?.[1];

    // Extraer descripción / Open Graph description
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const descripcion = ogDescMatch?.[1] || metaDescMatch?.[1];

    // Limpiar cuerpo HTML para texto útil (máximo 8000 caracteres)
    const cleanedBody = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000);

    return {
      titulo,
      descripcion,
      cuerpoTexto: cleanedBody,
    };
  } catch (err) {
    console.warn('No se pudo descargar directamente la URL (posible restricción o CORS):', err);
    return {};
  }
}

/**
 * Llama al SDK oficial de Gemini con el esquema estricto de recetas y gestión de fallbacks
 */
export async function extractRecipeWithGemini({
  url,
  texto,
}: {
  url?: string;
  texto?: string;
}): Promise<ExtractedRecipe> {
  const ai = getGeminiClient();

  let contextPrompt = '';
  if (url) {
    const meta = await fetchUrlMetadata(url);
    contextPrompt += `ENLACE FUENTE: ${url}\n`;
    if (meta.titulo) contextPrompt += `TÍTULO DETECTADO: ${meta.titulo}\n`;
    if (meta.descripcion) contextPrompt += `DESCRIPCIÓN / METADATOS: ${meta.descripcion}\n`;
    if (meta.cuerpoTexto) contextPrompt += `TEXTO DE LA PÁGINA O SUBTÍTULOS:\n${meta.cuerpoTexto}\n`;
  }

  if (texto) {
    contextPrompt += `\nCONTENIDO O DESCRIPCIÓN APORTADA POR EL USUARIO:\n${texto}\n`;
  }

  if (!contextPrompt.trim()) {
    throw new Error('Debes proporcionar una URL o un texto con la receta para procesarla.');
  }

  const promptFinal = `
Por favor, analiza la siguiente receta o contenido culinario y estandarízala conforme a tus instrucciones de sistema y al esquema JSON estricto requerido:

${contextPrompt}
`.trim();

  // Probar modelo primario y si falla por compatibilidad de versión, probar los alternativos
  const candidateModels = [PRIMARY_GEMINI_MODEL, ...FALLBACK_GEMINI_MODELS];
  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: promptFinal,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_RECIPES,
          responseMimeType: 'application/json',
          responseJsonSchema: recipeExtractionSchema,
          maxOutputTokens: 8192,
        },
      });

      if (!response.text) {
        throw new Error('La respuesta de Gemini vino vacía.');
      }

      const parsed: ExtractedRecipe = JSON.parse(response.text);
      return parsed;
    } catch (err) {
      lastError = err;
      console.warn(`Intento con modelo '${model}' falló:`, err instanceof Error ? err.message : err);
      // Continuar al siguiente modelo en caso de que este no esté soportado en la API key
    }
  }

  throw new Error(
    `No se pudo estructurar la receta con Gemini. Detalle: ${
      lastError instanceof Error ? lastError.message : 'Error desconocido'
    }`
  );
}
