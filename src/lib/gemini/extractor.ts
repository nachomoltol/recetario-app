import * as cheerio from 'cheerio';
import { getGeminiClient, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODELS } from './client';
import {
  recipeExtractionSchema,
  SYSTEM_INSTRUCTION_RECIPES,
  ExtractedRecipe,
} from './schema';
import { FuenteTipoReceta } from '@/types/database';

export const BOT_BLOCK_ERROR_MESSAGE =
  'No hemos podido leer el enlace porque esta red social bloquea el acceso automático. Por favor, copia y pega el texto de la receta o los ingredientes.';

export interface ScrapedContent {
  titulo?: string;
  descripcion?: string;
  cuerpoTexto?: string;
  ingredientesDetectados?: string[];
  instruccionesDetectadas?: string[];
  esUtil: boolean;
  esBloqueoBot: boolean;
}

export function detectFuenteTipo(url?: string): FuenteTipoReceta {
  if (!url) return 'manual';
  const lower = url.toLowerCase();
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  return 'web';
}

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
};

/**
 * Realiza un scraping real en el servidor simulando cabeceras de navegador.
 * Extrae metadatos, microformatos Schema.org (JSON-LD) y texto limpio con cheerio.
 * Detecta de forma estricta si el sitio ha bloqueado el acceso o carece de información útil.
 */
export async function scrapeUrlContent(url: string): Promise<ScrapedContent> {
  const isSocialDomain = /tiktok\.com|instagram\.com|facebook\.com/i.test(url);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      signal: controller.signal,
      next: { revalidate: 0 },
    });

    clearTimeout(timeout);

    // Detección directa de bloqueo anti-bot por código HTTP
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      return {
        esUtil: false,
        esBloqueoBot: true,
      };
    }

    if (!res.ok) {
      return {
        esUtil: false,
        esBloqueoBot: isSocialDomain,
      };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // 1. Títulos
    const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
    const twitterTitle = $('meta[name="twitter:title"]').attr('content')?.trim();
    const docTitle = $('title').text().trim();
    const h1Title = $('h1').first().text().trim();
    const titulo = ogTitle || twitterTitle || h1Title || docTitle || '';

    // 2. Descripciones y metadatos
    const ogDesc = $('meta[property="og:description"]').attr('content')?.trim();
    const twitterDesc = $('meta[name="twitter:description"]').attr('content')?.trim();
    const metaDesc = $('meta[name="description"]').attr('content')?.trim();
    let descripcion = ogDesc || twitterDesc || metaDesc || '';

    // 3. Extracción de microdatos Schema.org Recipe (JSON-LD)
    const ingredientesDetectados: string[] = [];
    const instruccionesDetectadas: string[] = [];

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).text();
        if (!text) return;
        const parsed = JSON.parse(text);
        const items = Array.isArray(parsed) ? parsed : [parsed];

        const parseRecipeNode = (item: any) => {
          if (!item || typeof item !== 'object') return;
          if (item['@graph'] && Array.isArray(item['@graph'])) {
            item['@graph'].forEach(parseRecipeNode);
            return;
          }
          const itemType = item['@type'];
          const isRecipe =
            itemType === 'Recipe' || (Array.isArray(itemType) && itemType.includes('Recipe'));

          if (isRecipe) {
            if (!descripcion && item.description) {
              descripcion = String(item.description);
            }
            if (Array.isArray(item.recipeIngredient)) {
              item.recipeIngredient.forEach((ing: any) => {
                if (typeof ing === 'string' && ing.trim()) {
                  ingredientesDetectados.push(ing.trim());
                }
              });
            }
            if (Array.isArray(item.recipeInstructions)) {
              item.recipeInstructions.forEach((inst: any) => {
                if (typeof inst === 'string' && inst.trim()) {
                  instruccionesDetectadas.push(inst.trim());
                } else if (inst?.text && typeof inst.text === 'string') {
                  instruccionesDetectadas.push(inst.text.trim());
                } else if (Array.isArray(inst?.itemListElement)) {
                  inst.itemListElement.forEach((sub: any) => {
                    if (sub?.text && typeof sub.text === 'string') {
                      instruccionesDetectadas.push(sub.text.trim());
                    }
                  });
                }
              });
            }
          }
        };

        items.forEach(parseRecipeNode);
      } catch {
        // Ignorar bloques JSON-LD con sintaxis corrupta
      }
    });

    // 4. Extracción de datos universales o rehidratación (TikTok)
    const universalData = $('script#__UNIVERSAL_DATA_FOR_REHYDRATION__').text();
    if (universalData) {
      try {
        const parsed = JSON.parse(universalData);
        const item =
          parsed?.['__DEFAULT_SCOPE__']?.['webapp.video-detail']?.['itemInfo']?.['itemStruct'];
        if (item?.desc) {
          descripcion = [descripcion, item.desc].filter(Boolean).join(' - ');
        }
      } catch {}
    }

    // 5. Limpieza del cuerpo para aislar el texto real
    $('script, style, noscript, nav, header, footer, iframe, svg, button, form, dialog, aside').remove();

    const articleEl = $('article, main, [role="main"]').first();
    const rawBody = (articleEl.length ? articleEl.text() : $('body').text()) || '';
    const cuerpoTexto = rawBody
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000);

    // 6. Diagnóstico de bloqueo bot o contenido insuficiente
    const cleanLowerTitle = (titulo || docTitle).toLowerCase();
    const cleanLowerDesc = descripcion.toLowerCase();

    const isGenericPlaceholderTitle =
      cleanLowerTitle === 'tiktok - make your day' ||
      cleanLowerTitle === 'tiktok' ||
      cleanLowerTitle === 'instagram' ||
      cleanLowerTitle.includes('login') ||
      cleanLowerTitle.includes('iniciar sesión') ||
      cleanLowerTitle.includes('just a moment') ||
      cleanLowerTitle.includes('attention required') ||
      cleanLowerTitle.includes('access denied') ||
      cleanLowerTitle.includes('cloudflare') ||
      cleanLowerTitle.includes('robot');

    const totalUsefulLength =
      titulo.length +
      descripcion.length +
      ingredientesDetectados.join(' ').length +
      instruccionesDetectadas.join(' ').length +
      cuerpoTexto.length;

    // Bloqueo típico en TikTok/Instagram sin cookies de sesión
    if (isSocialDomain && (isGenericPlaceholderTitle || totalUsefulLength < 80)) {
      return {
        titulo,
        descripcion,
        cuerpoTexto,
        esUtil: false,
        esBloqueoBot: true,
      };
    }

    // Página genérica sin contenido culinario o bloqueada
    if (totalUsefulLength < 60 && ingredientesDetectados.length === 0) {
      return {
        titulo,
        descripcion,
        cuerpoTexto,
        esUtil: false,
        esBloqueoBot: isSocialDomain || isGenericPlaceholderTitle,
      };
    }

    return {
      titulo,
      descripcion,
      cuerpoTexto,
      ingredientesDetectados,
      instruccionesDetectadas,
      esUtil: true,
      esBloqueoBot: false,
    };
  } catch (err) {
    console.warn('Error durante el scraping en servidor:', err);
    return {
      esUtil: false,
      esBloqueoBot: isSocialDomain,
    };
  }
}

/**
 * Llama al SDK oficial de Gemini con el esquema estricto de recetas.
 * REGLA ESTRICTA: NUNCA se pasa la URL cruda al modelo para evitar el rechazo
 * genérico ("no tengo la capacidad de acceder a enlaces externos").
 */
export async function extractRecipeWithGemini({
  scraped,
  texto,
}: {
  scraped?: ScrapedContent;
  texto?: string;
}): Promise<ExtractedRecipe> {
  const ai = getGeminiClient();

  let contextPrompt = '';

  if (scraped && scraped.esUtil) {
    if (scraped.titulo) {
      contextPrompt += `TÍTULO EXTRAÍDO DE LA RECETA:\n${scraped.titulo}\n\n`;
    }
    if (scraped.descripcion) {
      contextPrompt += `DESCRIPCIÓN Y METADATOS DEL PLATO:\n${scraped.descripcion}\n\n`;
    }
    if (scraped.ingredientesDetectados && scraped.ingredientesDetectados.length > 0) {
      contextPrompt += `INGREDIENTES DETECTADOS EN LA FUENTE:\n${scraped.ingredientesDetectados.join('\n')}\n\n`;
    }
    if (scraped.instruccionesDetectadas && scraped.instruccionesDetectadas.length > 0) {
      contextPrompt += `PASOS O ELABORACIÓN DETECTADA:\n${scraped.instruccionesDetectadas.join('\n')}\n\n`;
    }
    if (scraped.cuerpoTexto) {
      contextPrompt += `TEXTO O ARTÍCULO DE LA RECETA:\n${scraped.cuerpoTexto}\n\n`;
    }
  }

  if (texto) {
    contextPrompt += `CONTENIDO O DETALLES APORTADOS POR EL USUARIO:\n${texto}\n\n`;
  }

  if (!contextPrompt.trim()) {
    throw new Error('Debes proporcionar información o texto de la receta para procesarla.');
  }

  const promptFinal = `
Por favor, analiza la siguiente receta o contenido culinario y estandarízala conforme a tus instrucciones de sistema y al esquema JSON estricto requerido:

${contextPrompt.trim()}
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
    }
  }

  throw new Error(
    `No se pudo estructurar la receta con Gemini. Detalle: ${
      lastError instanceof Error ? lastError.message : 'Error desconocido'
    }`
  );
}
