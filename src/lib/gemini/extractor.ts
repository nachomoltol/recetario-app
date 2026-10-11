import path from 'path';
import os from 'os';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import youtubedl from 'yt-dlp-exec';
import * as cheerio from 'cheerio';
import { alldl } from 'rahad-all-downloader-v2';
import { igdl, ttdl } from 'btch-downloader';
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

export interface MediaComboResult {
  mediaPath?: string;
  mimeType: string;
  title?: string;
  caption?: string;
  tags?: string[];
  cleanUp: () => Promise<void>;
}

export class NonCulinaryContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonCulinaryContentError';
  }
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

const SOCIAL_CRAWLER_HEADERS: Record<string, string> = {
  'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
};

/**
 * Descarga en streaming un archivo multimedia remoto directamente al disco local en os.tmpdir()
 */
async function streamMediaUrlToFile(
  mediaUrl: string,
  targetFilePath: string
): Promise<{ success: boolean; mimeType: string }> {
  try {
    const res = await fetch(mediaUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: '*/*',
      },
    });

    if (!res.ok || !res.body) {
      console.warn(`Error de respuesta descargando stream (${res.status}): ${res.statusText}`);
      return { success: false, mimeType: 'video/mp4' };
    }

    const contentType = res.headers.get('content-type') || 'video/mp4';
    const writeStream = fs.createWriteStream(targetFilePath);
    await pipeline(Readable.fromWeb(res.body as any), writeStream);

    const stats = fs.statSync(targetFilePath);
    if (stats.size < 1024) {
      try {
        fs.unlinkSync(targetFilePath);
      } catch {}
      return { success: false, mimeType: 'video/mp4' };
    }

    let mimeType = 'video/mp4';
    if (contentType.includes('webm')) mimeType = 'video/webm';
    else if (contentType.includes('audio') || contentType.includes('mp3') || contentType.includes('m4a')) {
      mimeType = 'audio/mp4';
    }

    return { success: true, mimeType };
  } catch (err) {
    console.warn('Fallo en streamMediaUrlToFile:', err instanceof Error ? err.message : err);
    try {
      if (fs.existsSync(targetFilePath)) fs.unlinkSync(targetFilePath);
    } catch {}
    return { success: false, mimeType: 'video/mp4' };
  }
}

/**
 * Extractor especializado y a prueba de balas para TikTok
 * Tier 1: TikWM API (directo, sin bloqueos de IP, < 2s)
 * Tier 2: rahad-all-downloader-v2
 * Tier 3: btch-downloader (ttdl)
 * Tier 4: yt-dlp-exec
 */
async function extractTikTokCombo(
  url: string,
  filePrefix: string
): Promise<MediaComboResult | null> {
  const tempDir = os.tmpdir();
  const targetFilePath = path.join(tempDir, `${filePrefix}.mp4`);
  const createdFiles: string[] = [];

  const cleanUp = async () => {
    for (const f of createdFiles) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch {}
      }
    }
  };

  // Tier 1: TikWM API
  try {
    const formData = new URLSearchParams();
    formData.append('url', url);
    formData.append('hd', '1');

    const res = await fetch('https://www.tikwm.com/api/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
      body: formData.toString(),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.code === 0 && data.data) {
        const rawPlay = data.data.play || data.data.wmplay;
        const videoPlayUrl = rawPlay
          ? rawPlay.startsWith('http')
            ? rawPlay
            : `https://www.tikwm.com${rawPlay}`
          : null;
        const title = data.data.title || '';
        const author = data.data.author?.nickname || data.data.author?.unique_id || '';
        const caption = title ? `${title} (Autor: ${author})` : '';

        if (videoPlayUrl) {
          const downloadRes = await streamMediaUrlToFile(videoPlayUrl, targetFilePath);
          if (downloadRes.success) {
            createdFiles.push(targetFilePath);
            return {
              mediaPath: targetFilePath,
              mimeType: downloadRes.mimeType,
              title,
              caption,
              cleanUp,
            };
          }
        } else if (caption) {
          return {
            mimeType: 'video/mp4',
            title,
            caption,
            cleanUp,
          };
        }
      }
    }
  } catch (err) {
    console.warn('TikWM API tier fallo, pasando al siguiente:', err instanceof Error ? err.message : err);
  }

  // Tier 2: rahad-all-downloader-v2
  try {
    const res = await alldl(url);
    if (res?.data?.videoUrl) {
      const title = res.data.title || '';
      const downloadRes = await streamMediaUrlToFile(res.data.videoUrl, targetFilePath);
      if (downloadRes.success) {
        createdFiles.push(targetFilePath);
        return {
          mediaPath: targetFilePath,
          mimeType: downloadRes.mimeType,
          title,
          caption: title,
          cleanUp,
        };
      }
    }
  } catch (err) {
    console.warn('alldl TikTok fallo:', err instanceof Error ? err.message : err);
  }

  // Tier 3: btch-downloader (ttdl)
  try {
    const res = await ttdl(url);
    const videoUrl = res?.video?.[0];
    if (videoUrl) {
      const title = res.title || '';
      const downloadRes = await streamMediaUrlToFile(videoUrl, targetFilePath);
      if (downloadRes.success) {
        createdFiles.push(targetFilePath);
        return {
          mediaPath: targetFilePath,
          mimeType: downloadRes.mimeType,
          title,
          caption: title,
          cleanUp,
        };
      }
    }
  } catch (err) {
    console.warn('btch ttdl fallo:', err instanceof Error ? err.message : err);
  }

  // Tier 4: yt-dlp-exec
  return executeYtDlpCombo(url, filePrefix);
}

/**
 * Extractor especializado y a prueba de balas para Instagram (Reels y Posts)
 * Tier 0: RapidAPI (si se provee RAPIDAPI_KEY en entorno)
 * Tier 1: OpenGraph & Social Crawler bot simulation para descripción/receta completa
 * Tier 2: rahad-all-downloader-v2 (alldl)
 * Tier 3: btch-downloader (igdl)
 * Tier 4: yt-dlp-exec
 */
async function extractInstagramCombo(
  url: string,
  filePrefix: string
): Promise<MediaComboResult | null> {
  const tempDir = os.tmpdir();
  const targetFilePath = path.join(tempDir, `${filePrefix}.mp4`);
  const createdFiles: string[] = [];

  const cleanUp = async () => {
    for (const f of createdFiles) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch {}
      }
    }
  };

  let title = '';
  let caption = '';

  // Paso 1: Extraer descripción/receta completa de Instagram simulando User-Agents de bots de indexación
  try {
    const crawlerRes = await fetch(url, {
      headers: SOCIAL_CRAWLER_HEADERS,
      redirect: 'follow',
    });
    if (crawlerRes.ok) {
      const html = await crawlerRes.text();
      const $ = cheerio.load(html);
      const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || '';
      const ogDesc = $('meta[property="og:description"]').attr('content')?.trim() || '';
      const metaDesc = $('meta[name="description"]').attr('content')?.trim() || '';

      if (ogTitle && !ogTitle.startsWith('Instagram')) {
        title = ogTitle;
        caption = ogTitle;
      }
      if (ogDesc && ogDesc.length > caption.length) {
        caption = ogDesc;
      } else if (metaDesc && metaDesc.length > caption.length) {
        caption = metaDesc;
      }
    }
  } catch (err) {
    console.warn('Extracción de caption crawler Instagram fallo:', err instanceof Error ? err.message : err);
  }

  // Paso 2: Descargar el archivo audiovisual (Reel)
  // Tier 0: RapidAPI si existe RAPIDAPI_KEY
  const rapidApiKey = process.env.RAPIDAPI_KEY || process.env.INSTAGRAM_API_KEY;
  if (rapidApiKey) {
    try {
      const res = await fetch(
        `https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index?url=${encodeURIComponent(
          url
        )}`,
        {
          headers: {
            'x-rapidapi-key': rapidApiKey,
            'x-rapidapi-host':
              'instagram-downloader-download-instagram-videos-stories.p.rapidapi.com',
          },
        }
      );
      if (res.ok) {
        const json = await res.json();
        const mediaUrl = json.media || json.url || json.download_url;
        if (mediaUrl) {
          const downloadRes = await streamMediaUrlToFile(mediaUrl, targetFilePath);
          if (downloadRes.success) {
            createdFiles.push(targetFilePath);
            return {
              mediaPath: targetFilePath,
              mimeType: downloadRes.mimeType,
              title: title || json.title,
              caption: caption || json.description || json.title,
              cleanUp,
            };
          }
        }
      }
    } catch (err) {
      console.warn('RapidAPI Instagram intento fallo:', err instanceof Error ? err.message : err);
    }
  }

  // Tier 1: rahad-all-downloader-v2
  try {
    const res = await alldl(url);
    const videoUrl = res?.data?.videoUrl;
    if (videoUrl) {
      const downloadRes = await streamMediaUrlToFile(videoUrl, targetFilePath);
      if (downloadRes.success) {
        createdFiles.push(targetFilePath);
        return {
          mediaPath: targetFilePath,
          mimeType: downloadRes.mimeType,
          title: title || res.data.title,
          caption: caption || res.data.title,
          cleanUp,
        };
      }
    }
  } catch (err) {
    console.warn('alldl Instagram fallo:', err instanceof Error ? err.message : err);
  }

  // Tier 2: btch-downloader (igdl)
  try {
    const res = await igdl(url);
    const videoUrl = res?.result?.[0]?.url;
    if (videoUrl) {
      const downloadRes = await streamMediaUrlToFile(videoUrl, targetFilePath);
      if (downloadRes.success) {
        createdFiles.push(targetFilePath);
        return {
          mediaPath: targetFilePath,
          mimeType: downloadRes.mimeType,
          title,
          caption,
          cleanUp,
        };
      }
    }
  } catch (err) {
    console.warn('btch igdl fallo:', err instanceof Error ? err.message : err);
  }

  // Tier 3: yt-dlp-exec
  const ytdlRes = await executeYtDlpCombo(url, filePrefix);
  if (ytdlRes) {
    if (!ytdlRes.caption && caption) ytdlRes.caption = caption;
    if (!ytdlRes.title && title) ytdlRes.title = title;
    return ytdlRes;
  }

  // Si no se pudo bajar el archivo pero el crawler obtuvo la receta/caption completa, la entregamos
  if (caption && caption.length > 50) {
    return {
      mimeType: 'video/mp4',
      title,
      caption,
      cleanUp,
    };
  }

  return null;
}

/**
 * Extractor especializado para YouTube (Videos y Shorts)
 * Tier 1: yt-dlp-exec
 * Tier 2: rahad-all-downloader-v2
 */
async function extractYouTubeCombo(
  url: string,
  filePrefix: string
): Promise<MediaComboResult | null> {
  const ytdlRes = await executeYtDlpCombo(url, filePrefix);
  if (ytdlRes) return ytdlRes;

  const tempDir = os.tmpdir();
  const targetFilePath = path.join(tempDir, `${filePrefix}.mp4`);
  const createdFiles: string[] = [];

  const cleanUp = async () => {
    for (const f of createdFiles) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch {}
      }
    }
  };

  try {
    const res = await alldl(url);
    if (res?.data?.videoUrl) {
      const downloadRes = await streamMediaUrlToFile(res.data.videoUrl, targetFilePath);
      if (downloadRes.success) {
        createdFiles.push(targetFilePath);
        return {
          mediaPath: targetFilePath,
          mimeType: downloadRes.mimeType,
          title: res.data.title,
          caption: res.data.title,
          cleanUp,
        };
      }
    }
  } catch (err) {
    console.warn('alldl YouTube fallback fallo:', err instanceof Error ? err.message : err);
  }

  return null;
}

/**
 * Descarga y extracción estándar usando yt-dlp-exec
 */
async function executeYtDlpCombo(
  url: string,
  filePrefix: string
): Promise<MediaComboResult | null> {
  const tempDir = os.tmpdir();
  const outputTemplate = path.join(tempDir, `${filePrefix}.%(ext)s`);

  try {
    const flags: any = {
      output: outputTemplate,
      writeInfoJson: true,
      format: '18/worst[ext=mp4]/best[height<=480][ext=mp4]/best[height<=720]/bestaudio/best',
      jsRuntimes: 'node',
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      maxFilesize: '60M',
    };
    await youtubedl(url, flags);

    const matchingFiles = fs.readdirSync(tempDir).filter((f) => f.startsWith(filePrefix));
    const jsonFile = matchingFiles.find((f) => f.endsWith('.info.json'));
    const mediaFile = matchingFiles.find(
      (f) =>
        !f.endsWith('.info.json') &&
        !f.endsWith('.temp') &&
        !f.endsWith('.part') &&
        !f.endsWith('.ytdl')
    );

    let title = '';
    let caption = '';
    let tags: string[] = [];

    if (jsonFile) {
      try {
        const jsonContent = JSON.parse(
          fs.readFileSync(path.join(tempDir, jsonFile), 'utf-8')
        );
        title = jsonContent.title || '';
        caption = jsonContent.description || jsonContent.caption || '';
        if (Array.isArray(jsonContent.tags)) {
          tags = jsonContent.tags;
        }
      } catch (err) {
        console.warn('Error leyendo .info.json:', err);
      }
    }

    let mimeType = 'video/mp4';
    let mediaPath: string | undefined = undefined;

    if (mediaFile) {
      mediaPath = path.join(tempDir, mediaFile);
      const ext = path.extname(mediaFile).toLowerCase();
      if (ext === '.mp4') mimeType = 'video/mp4';
      else if (ext === '.webm') mimeType = 'video/webm';
      else if (ext === '.m4a' || ext === '.aac') mimeType = 'audio/mp4';
      else if (ext === '.mp3') mimeType = 'audio/mpeg';
      else if (ext === '.ogg' || ext === '.opus') mimeType = 'audio/ogg';
    }

    const cleanUp = async () => {
      for (const f of matchingFiles) {
        const full = path.join(tempDir, f);
        if (fs.existsSync(full)) {
          try {
            fs.unlinkSync(full);
          } catch {}
        }
      }
    };

    if (!mediaPath && !caption) {
      await cleanUp();
      return null;
    }

    return {
      mediaPath,
      mimeType,
      title,
      caption,
      tags,
      cleanUp,
    };
  } catch (err) {
    console.warn(
      'yt-dlp-exec no pudo descargar combo:',
      err instanceof Error ? err.message : err
    );
    try {
      const leftover = fs.readdirSync(tempDir).filter((f) => f.startsWith(filePrefix));
      for (const f of leftover) {
        fs.unlinkSync(path.join(tempDir, f));
      }
    } catch {}
    return null;
  }
}

/**
 * Orquestador principal multi-nivel para descarga de combo multimedia + descripción.
 * Rutea de forma inteligente según la plataforma para eludir activamente cualquier bloqueo anti-bot.
 */
export async function downloadMediaCombo(url: string): Promise<MediaComboResult | null> {
  const filePrefix = `receta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tipo = detectFuenteTipo(url);

  if (tipo === 'tiktok') {
    return extractTikTokCombo(url, filePrefix);
  }

  if (tipo === 'instagram') {
    return extractInstagramCombo(url, filePrefix);
  }

  if (tipo === 'youtube') {
    return extractYouTubeCombo(url, filePrefix);
  }

  return executeYtDlpCombo(url, filePrefix);
}

/**
 * Scraping de respaldo para blogs o páginas de recetas tradicionales que no disponen de vídeo.
 */
export async function scrapeUrlContent(url: string): Promise<{
  titulo?: string;
  descripcion?: string;
  cuerpoTexto?: string;
  ingredientesDetectados?: string[];
  instruccionesDetectadas?: string[];
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      signal: controller.signal,
      next: { revalidate: 0 },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return {};
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
    const twitterTitle = $('meta[name="twitter:title"]').attr('content')?.trim();
    const docTitle = $('title').text().trim();
    const h1Title = $('h1').first().text().trim();
    const titulo = ogTitle || twitterTitle || h1Title || docTitle || '';

    const ogDesc = $('meta[property="og:description"]').attr('content')?.trim();
    const twitterDesc = $('meta[name="twitter:description"]').attr('content')?.trim();
    const metaDesc = $('meta[name="description"]').attr('content')?.trim();
    let descripcion = ogDesc || twitterDesc || metaDesc || '';

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
                }
              });
            }
          }
        };

        items.forEach(parseRecipeNode);
      } catch {}
    });

    $('script, style, noscript, nav, header, footer, iframe, svg, button, form, dialog, aside').remove();

    const articleEl = $('article, main, [role="main"]').first();
    const rawBody = (articleEl.length ? articleEl.text() : $('body').text()) || '';
    const cuerpoTexto = rawBody.replace(/\s+/g, ' ').trim().slice(0, 8000);

    return {
      titulo,
      descripcion,
      cuerpoTexto,
      ingredientesDetectados,
      instruccionesDetectadas,
    };
  } catch (err) {
    console.warn('Error en scraping fallback:', err);
    return {};
  }
}

/**
 * Extracción Multimodal con Fusión Contextual (Vídeo/Audio + Descripción/Caption)
 * usando la File API de Gemini y responseJsonSchema estricto.
 */
export async function extractRecipeWithGemini({
  url,
  texto,
}: {
  url?: string;
  texto?: string;
}): Promise<ExtractedRecipe> {
  const ai = getGeminiClient();

  let combo: MediaComboResult | null = null;
  let geminiUploadedFileName: string | null = null;

  try {
    let uploadedFilePart: any = null;
    let contextPrompt = '';

    // 1. Procesar URL con Extracción del Combo Multi-Nivel
    if (url) {
      combo = await downloadMediaCombo(url);

      if (combo?.mediaPath && fs.existsSync(combo.mediaPath)) {
        // Ingesta Multimodal: Carga mediante Gemini File API
        const uploadedFile = await ai.files.upload({
          file: combo.mediaPath,
          config: { mimeType: combo.mimeType },
        });

        if (uploadedFile.name) {
          geminiUploadedFileName = uploadedFile.name;

          // Esperar si el archivo multimedia está en estado PROCESSING
          let fileRecord = await ai.files.get({ name: uploadedFile.name });
          let attempts = 0;
          while (fileRecord.state === 'PROCESSING' && attempts < 25) {
            await new Promise((r) => setTimeout(r, 2000));
            fileRecord = await ai.files.get({ name: uploadedFile.name });
            attempts++;
          }

          if (fileRecord.state !== 'FAILED' && fileRecord.uri) {
            uploadedFilePart = {
              fileData: {
                fileUri: fileRecord.uri,
                mimeType: fileRecord.mimeType || combo.mimeType,
              },
            };
          }
        }
      }

      if (combo?.title) {
        contextPrompt += `TÍTULO DEL POST / RECETA:\n${combo.title}\n\n`;
      }
      if (combo?.caption) {
        contextPrompt += `DESCRIPCIÓN CRUDA DEL POST (CAPTION DEL CREADOR):\n${combo.caption}\n\n`;
      }

      // Si no hubo archivo ni caption por descargadores (ej. blogs de texto), acudir al scraper web
      if (!combo || (!combo.mediaPath && !combo.caption)) {
        const scraped = await scrapeUrlContent(url);
        if (scraped.titulo) contextPrompt += `TÍTULO DETECTADO:\n${scraped.titulo}\n\n`;
        if (scraped.descripcion) contextPrompt += `DESCRIPCIÓN:\n${scraped.descripcion}\n\n`;
        if (scraped.ingredientesDetectados?.length) {
          contextPrompt += `INGREDIENTES ENCONTRADOS:\n${scraped.ingredientesDetectados.join('\n')}\n\n`;
        }
        if (scraped.instruccionesDetectadas?.length) {
          contextPrompt += `PASOS ENCONTRADOS:\n${scraped.instruccionesDetectadas.join('\n')}\n\n`;
        }
        if (scraped.cuerpoTexto) {
          contextPrompt += `TEXTO DE LA RECETA / PÁGINA:\n${scraped.cuerpoTexto}\n\n`;
        }
      }
    }

    if (texto) {
      contextPrompt += `NOTAS O TEXTO ADICIONAL APORTADO POR EL USUARIO:\n${texto}\n\n`;
    }

    // Validación previa para evitar alucinaciones: si no hay vídeo, verificar que haya texto con sustancia culinaria real
    const cleanTextWithoutPlaceholders = contextPrompt
      .replace(
        /TÍTULO DETECTADO:|DESCRIPCIÓN:|TEXTO DE LA RECETA \/ PÁGINA:|NOTAS O TEXTO ADICIONAL APORTADO POR EL USUARIO:|TÍTULO DEL POST \/ RECETA:|DESCRIPCIÓN CRUDA DEL POST \(CAPTION DEL CREADOR\):/g,
        ''
      )
      .replace(/TikTok - Make Your Day|Login • Instagram|Instagram|YouTube|Sign in|Iniciar sesión/gi, '')
      .trim();

    if (!uploadedFilePart && cleanTextWithoutPlaceholders.length < 35) {
      throw new Error(
        'No se pudo extraer información culinaria ni archivo de vídeo del enlace (es posible que la red social bloquee la lectura directa o que el enlace sea privado). Por favor, pega directamente el texto o los ingredientes de la receta.'
      );
    }

    // 2. Prompt de Fusión Contextual (Multimodal)
    const promptFinal = `
Eres un Chef Ejecutivo y Nutricionista especializado en extracción culinaria multimodal y perfilado nutricional.

DIRECTIVAS CRÍTICAS DE PRECISIÓN Y TOLERANCIA CERO A LA ALUCINACIÓN:
1. Basarse única y exclusivamente en los hechos observados y escuchados en el archivo audiovisual o en el texto proporcionado.
2. Si el contenido NO corresponde a una receta de cocina ni preparación de alimentos real:
   - Establece obligatoriamente: "es_receta_valida": false
   - Especifica en "motivo_invalido" el motivo exacto (ej: "Vídeo no culinario", "Contenido sin ingredientes ni pasos de cocina").
   - NO inventes ingredientes ni pasos.
3. Si el contenido SÍ es una receta real, establece "es_receta_valida": true y cruza exhaustivamente el vídeo/audio con el texto del post para extraer cantidades, ingredientes canónicos, pasos y tiempos.

Estandariza la receta al esquema JSON estricto requerido:

${contextPrompt.trim()}
`.trim();

    // 3. Montar payload para Gemini
    const parts: any[] = [];
    if (uploadedFilePart) {
      parts.push(uploadedFilePart);
    }
    parts.push({ text: promptFinal });

    const contents = [{ role: 'user', parts }];

    // 4. Invocación con modelo parametrizable y fallback resiliente
    const primaryModel = PRIMARY_GEMINI_MODEL;
    const candidateModels = [
      primaryModel,
      ...FALLBACK_GEMINI_MODELS.filter((m) => m !== primaryModel),
    ];

    let lastError: unknown = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
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

        if (parsed.es_receta_valida === false) {
          throw new NonCulinaryContentError(
            parsed.motivo_invalido ||
              'El contenido proporcionado no contiene una receta de cocina ni elaboración culinaria identificable.'
          );
        }

        if (
          !parsed.ingredientes ||
          parsed.ingredientes.length === 0 ||
          !parsed.pasos ||
          parsed.pasos.length === 0
        ) {
          throw new NonCulinaryContentError(
            'No se identificaron ingredientes ni pasos de cocinado suficientes en el contenido analizado.'
          );
        }

        return parsed;
      } catch (err) {
        if (err instanceof NonCulinaryContentError) {
          throw err;
        }
        lastError = err;
        console.warn(`Intento con modelo '${model}' falló:`, err instanceof Error ? err.message : err);
      }
    }

    throw new Error(
      `No se pudo estructurar la receta con Gemini. Detalle: ${
        lastError instanceof Error ? lastError.message : 'Error desconocido'
      }`
    );
  } finally {
    // 5. Limpieza automática de recursos (File API y disco temporal)
    if (geminiUploadedFileName) {
      try {
        await ai.files.delete({ name: geminiUploadedFileName });
      } catch (e) {
        console.warn('No se pudo borrar el archivo en Gemini Files:', e);
      }
    }
    if (combo?.cleanUp) {
      await combo.cleanUp();
    }
  }
}
