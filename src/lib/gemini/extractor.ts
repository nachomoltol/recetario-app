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
  buildRecipeSystemInstruction,
  ExtractedRecipe,
  normalizarIngredientesExtraidos,
} from './schema';
import { FuenteTipoReceta } from '@/types/database';

/**
 * Sanitiza y formatea URLs antes de pasarlas a las herramientas de extracción.
 * Aísla de forma estricta el Video ID de YouTube utilizando el objeto nativo URL
 * para enlaces youtu.be, youtube.com/shorts/ y youtube.com/watch,
 * construyendo la URL canónica exactamente como: https://www.youtube.com/watch?v=${videoId}
 */
export function sanitizeRecipeUrl(url?: string): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  let raw = url.trim();
  if (!raw) return undefined;

  // Limpiar caracteres envolventes comunes como <url>, (url), "url", 'url'
  raw = raw.replace(/^[<("'[]+|[>)"'\]]+$/g, '').trim();

  try {
    const urlEntrante = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
    const parsedUrl = new URL(urlEntrante);
    const hostname = parsedUrl.hostname.toLowerCase();
    let videoId: string | null = null;

    if (hostname.includes('youtu.be')) {
      // Si parsedUrl.hostname incluye youtu.be, el Video ID es parsedUrl.pathname.substring(1)
      const rawId = parsedUrl.pathname.substring(1);
      videoId = rawId.split('/')[0] || rawId;
    } else if (hostname.includes('youtube.com') && parsedUrl.pathname.includes('/shorts/')) {
      // Si parsedUrl.hostname incluye youtube.com y contiene /shorts/, el Video ID es parsedUrl.pathname.split('/')[2]
      videoId = parsedUrl.pathname.split('/')[2] || null;
    } else if (hostname.includes('youtube.com') && parsedUrl.pathname.includes('/watch')) {
      // Si parsedUrl.hostname incluye youtube.com y contiene /watch, el Video ID es parsedUrl.searchParams.get('v')
      videoId = parsedUrl.searchParams.get('v');
    } else if (hostname.includes('youtube.com') && (parsedUrl.pathname.includes('/embed/') || parsedUrl.pathname.includes('/live/'))) {
      videoId = parsedUrl.pathname.split('/')[2] || null;
    }

    // Valida que el Video ID extraído exista y no esté vacío
    if (videoId && videoId.trim()) {
      const idMatch = videoId.match(/[a-zA-Z0-9_-]{11}/);
      const cleanVideoId = idMatch ? idMatch[0] : videoId.trim();
      if (cleanVideoId) {
        // Construye la URL canónica EXACTAMENTE como: https://www.youtube.com/watch?v=${videoId}
        return `https://www.youtube.com/watch?v=${cleanVideoId}`;
      }
    }
  } catch {}

  return raw;
}

export function detectFuenteTipo(url?: string): FuenteTipoReceta {
  if (!url) return 'manual';
  const cleanUrl = sanitizeRecipeUrl(url) || url;
  const lower = cleanUrl.toLowerCase();
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

export interface YouTubeDetailsResult {
  videoId: string;
  url: string;
  title: string;
  author: string;
  metaDescription: string;
  transcript: string;
  concatenatedText: string;
  isMultimodalFallback?: boolean;
  videoUri?: string;
}

/**
 * Navega por el árbol del JSON de YouTube (ytInitialData o ytInitialPlayerResponse)
 * para extraer la descripción completa y sin recortes, especialmente en Shorts.
 */
function extractDeepDescriptionFromYouTubeJson(initialData: any): string {
  if (!initialData || typeof initialData !== 'object') return '';

  // 1. Ruta prioritaria en Shorts: panel desplegable de descripción estructurada
  try {
    for (const panel of initialData.engagementPanels || []) {
      if (
        panel?.engagementPanelSectionListRenderer?.panelIdentifier ===
        'engagement-panel-structured-description'
      ) {
        const items =
          panel.engagementPanelSectionListRenderer.content
            ?.structuredDescriptionContentRenderer?.items || [];
        for (const it of items) {
          const content =
            it?.expandableVideoDescriptionBodyRenderer?.attributedDescriptionBodyText
              ?.content;
          if (content && typeof content === 'string' && content.trim()) {
            return content.trim();
          }
        }
      }
    }
  } catch {}

  // 2. Rutas directas en playerResponse o en la raíz
  const pr = initialData.playerResponse || initialData;
  const microDesc =
    pr?.microformat?.playerMicroformatRenderer?.description?.simpleText;
  if (microDesc && typeof microDesc === 'string' && microDesc.trim()) {
    return microDesc.trim();
  }

  const shortDesc = pr?.videoDetails?.shortDescription;
  if (shortDesc && typeof shortDesc === 'string' && shortDesc.trim()) {
    return shortDesc.trim();
  }

  // 3. Búsqueda recursiva en profundidad buscando claves description, shortDescription o content
  let bestCandidate = '';
  function recursiveSearch(obj: any, depth = 0): void {
    if (!obj || depth > 12 || typeof obj !== 'object') return;

    if (typeof obj.shortDescription === 'string') {
      const s = obj.shortDescription.trim();
      if (s.length > bestCandidate.length) bestCandidate = s;
    }

    if (
      obj.attributedDescriptionBodyText?.content &&
      typeof obj.attributedDescriptionBodyText.content === 'string'
    ) {
      const s = obj.attributedDescriptionBodyText.content.trim();
      if (s.length > bestCandidate.length) bestCandidate = s;
    }

    if (
      obj.description?.simpleText &&
      typeof obj.description.simpleText === 'string'
    ) {
      const s = obj.description.simpleText.trim();
      if (s.length > bestCandidate.length) bestCandidate = s;
    }

    for (const key of Object.keys(obj)) {
      if (key === 'frameworkUpdates') continue;
      recursiveSearch(obj[key], depth + 1);
    }
  }

  recursiveSearch(initialData);
  return bestCandidate;
}

/**
 * Parsea bloques de datos de YouTube presentes en el HTML (ytInitialData o ytInitialPlayerResponse),
 * soportando tanto la sintaxis de escritorio (objeto literal) como la de dispositivos móviles MWEB
 * (string literal con escapes hexadecimales \x..).
 */
function parseYouTubeJsonFromHtml(html: string, varName: string): any {
  if (!html || !varName) return null;

  // 1. Literal de objeto (Desktop): varName = {...};
  const objRegex = new RegExp(
    `(?:var\\s+${varName}|window\\["${varName}"\\]|${varName})\\s*=\\s*({[\\s\\S]+?});(?:\\s*var|\\s*<\\/script>|\\s*$)`
  );
  const objMatch = html.match(objRegex);
  if (objMatch && objMatch[1]) {
    try {
      return JSON.parse(objMatch[1]);
    } catch {}
  }

  // 2. Literal de string en comillas simples (MWEB Android/iOS con escapes hex \x..):
  const singleStrRegex = new RegExp(
    `(?:var\\s+${varName}|window\\["${varName}"\\]|${varName})\\s*=\\s*'([\\s\\S]+?)';(?:\\s*var|\\s*<\\/script>|\\s*$)`
  );
  const singleStrMatch = html.match(singleStrRegex);
  if (singleStrMatch && singleStrMatch[1]) {
    try {
      const unescaped = singleStrMatch[1]
        .replace(/\\'/g, "'")
        .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        );
      return JSON.parse(unescaped);
    } catch {}
  }

  // 3. Literal de string en comillas dobles
  const doubleStrRegex = new RegExp(
    `(?:var\\s+${varName}|window\\["${varName}"\\]|${varName})\\s*=\\s*"([\\s\\S]+?)";(?:\\s*var|\\s*<\\/script>|\\s*$)`
  );
  const doubleStrMatch = html.match(doubleStrRegex);
  if (doubleStrMatch && doubleStrMatch[1]) {
    try {
      const unescaped = doubleStrMatch[1]
        .replace(/\\"/g, '"')
        .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        );
      return JSON.parse(unescaped);
    } catch {}
  }

  return null;
}

/**
 * Limpia y decodifica el archivo XML de subtítulos de YouTube (timedtext),
 * extrayendo exclusivamente el texto hablado y eliminando etiquetas XML o entidades HTML.
 */
function parseYouTubeTranscriptXml(xml: string): string {
  if (!xml || typeof xml !== 'string') return '';

  // Si YouTube devolvió una página HTML de captcha o error 429 ("Sorry..."), descartar
  if (
    xml.includes('<title>Sorry...</title>') ||
    xml.includes('g-recaptcha') ||
    xml.includes('our systems have detected unusual traffic')
  ) {
    return '';
  }

  // 1. Quitar bloque de cabecera <head>...</head> si existe
  const withoutHead = xml.replace(/<head>[\s\S]*?<\/head>/gi, '');

  // 2. Extraer cuerpo o contenido
  const bodyMatch = withoutHead.match(/<body>([\s\S]*?)<\/body>/i);
  const content = bodyMatch ? bodyMatch[1] : withoutHead;

  // 3. Buscar etiquetas de texto habladas (<text>, <p>, <s>, <w>)
  const textMatches = content.match(/<(?:text|p|s|w)[^>]*>([\s\S]*?)<\/(?:text|p|s|w)>/gi);
  if (textMatches && textMatches.length > 0) {
    const lines = textMatches
      .map((m) =>
        m
          .replace(/<[^>]+>/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&apos;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
          .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .trim()
      )
      .filter(Boolean);

    return lines.join(' ').replace(/\s+/g, ' ').trim();
  }

  // 4. Limpieza directa de cualquier etiqueta XML restante
  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae los subtítulos de forma nativa directamente desde el JSON de YouTube
 * (ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.captionTracks),
 * evitando dependencias externas como youtube-transcript que son bloqueadas en Vercel.
 */
async function extractNativeYouTubeTranscript(
  videoId: string,
  parsedPlayer?: any
): Promise<string> {
  // 1. Navegar por el árbol JSON del reproductor web: captions.playerCaptionsTracklistRenderer.captionTracks
  const tracks: Array<{ baseUrl?: string; languageCode?: string }> | undefined =
    parsedPlayer?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (Array.isArray(tracks) && tracks.length > 0) {
    // Prioriza el track que tenga languageCode 'es' o usa el primer elemento
    const targetTrack =
      tracks.find((t) => t.languageCode === 'es' || t.languageCode?.startsWith('es')) ||
      tracks[0];

    if (targetTrack?.baseUrl) {
      try {
        const res = await fetch(targetTrack.baseUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const xml = await res.text();
          if (xml && xml.trim().length > 0) {
            const parsed = parseYouTubeTranscriptXml(xml);
            if (parsed.length > 0) return parsed;
          }
        }
      } catch (err) {
        console.warn('[YouTube] Fetch a baseUrl web falló:', err instanceof Error ? err.message : err);
      }
    }
  }

  // 2. Fallback de alta disponibilidad: Endpoint nativo InnerTube (Android client context),
  // que entrega los captionTracks directamente sin requerir firmas o cookies web
  try {
    const innertubeRes = await fetch(
      'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '20.10.38',
            },
          },
          videoId,
        }),
        signal: AbortSignal.timeout(6000),
      }
    );

    if (innertubeRes.ok) {
      const data = await innertubeRes.json();
      const innerTracks: Array<{ baseUrl?: string; languageCode?: string }> | undefined =
        data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

      if (Array.isArray(innerTracks) && innerTracks.length > 0) {
        const targetTrack =
          innerTracks.find(
            (t) => t.languageCode === 'es' || t.languageCode?.startsWith('es')
          ) || innerTracks[0];

        if (targetTrack?.baseUrl) {
          const captionRes = await fetch(targetTrack.baseUrl, {
            headers: {
              'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
            },
            signal: AbortSignal.timeout(5000),
          });
          if (captionRes.ok) {
            const xml = await captionRes.text();
            if (xml && xml.trim().length > 0) {
              return parseYouTubeTranscriptXml(xml);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[YouTube] Fetch de subtítulos vía InnerTube falló:', err instanceof Error ? err.message : err);
  }

  return '';
}

/**
 * Extrae de forma exhaustiva tanto la transcripción de audio (subtítulos generados o manuales)
 * como la meta-descripción profunda (vía ytInitialData) y título de un vídeo o Short de YouTube.
 */
export async function extractYouTubeDetails(rawUrl: string): Promise<YouTubeDetailsResult> {
  const cleanUrl = sanitizeRecipeUrl(rawUrl) || rawUrl;

  // Extraer el Video ID con lógica estricta y aislamiento de 11 caracteres
  let videoId = '';
  try {
    const urlEntrante = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') ? cleanUrl : `https://${cleanUrl}`;
    const parsedUrl = new URL(urlEntrante);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname.includes('youtu.be')) {
      const rawId = parsedUrl.pathname.substring(1);
      videoId = rawId.split('/')[0] || rawId;
    } else if (hostname.includes('youtube.com') && parsedUrl.pathname.includes('/shorts/')) {
      videoId = parsedUrl.pathname.split('/')[2] || '';
    } else if (hostname.includes('youtube.com') && parsedUrl.pathname.includes('/watch')) {
      videoId = parsedUrl.searchParams.get('v') || '';
    } else if (hostname.includes('youtube.com') && (parsedUrl.pathname.includes('/embed/') || parsedUrl.pathname.includes('/live/'))) {
      videoId = parsedUrl.pathname.split('/')[2] || '';
    }
  } catch {}

  if (videoId) {
    const idMatch = videoId.match(/[a-zA-Z0-9_-]{11}/);
    if (idMatch) videoId = idMatch[0];
  }

  // 2. Valida que el Video ID extraído exista y no esté vacío
  if (!videoId || !videoId.trim()) {
    throw new NonCulinaryContentError(
      'No se pudo reconocer un ID de vídeo de YouTube válido en el enlace proporcionado.'
    );
  }

  const cleanVideoId = videoId.trim();
  // 3. Construye la URL canónica EXACTAMENTE como: https://www.youtube.com/watch?v=${videoId}
  const standardUrl = `https://www.youtube.com/watch?v=${cleanVideoId}`;

  // 2. Extraer Título, Autor y Meta-Descripción Enriquecida
  let title = '';
  let author = '';
  let metaDescription = '';
  let transcript = '';
  let playabilityReason = '';

  // 2.1. Intentar oEmbed oficial (rápido para título/autor)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(standardUrl)}&format=json`;
    const oembedRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      if (oembedData?.title) title = String(oembedData.title).trim();
      if (oembedData?.author_name) author = String(oembedData.author_name).trim();
    } else if (oembedRes.status === 404) {
      console.warn(`[YouTube] oEmbed 404 para ${cleanVideoId}: el vídeo no existe, es privado o está eliminado.`);
    }
  } catch (err) {
    console.warn('[YouTube] oEmbed opcional falló:', err instanceof Error ? err.message : err);
  }

  // 2.2. Extracción profunda de descripción vía raw HTML
  // Priorizar cabeceras completas de Escritorio (contiene tanto ytInitialData con engagementPanels como ytInitialPlayerResponse)
  const desktopHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    Cookie: 'SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg;',
  };

  const mobileHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.200 Mobile Safari/537.36',
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    Cookie: 'SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg;',
  };

  try {
    let html = '';
    let pageRes = await fetch(standardUrl, {
      headers: desktopHeaders,
      signal: AbortSignal.timeout(9000),
    });

    if (pageRes.ok) {
      html = await pageRes.text();
    } else {
      // Fallback a Mobile Headers
      const retryRes = await fetch(standardUrl, {
        headers: mobileHeaders,
        signal: AbortSignal.timeout(9000),
      });
      if (retryRes.ok) {
        html = await retryRes.text();
      }
    }

    if (html) {
      // 2.2.1. Localizar y parsear ytInitialData (desktop con engagementPanels)
      const parsedData = parseYouTubeJsonFromHtml(html, 'ytInitialData');
      if (parsedData) {
        const deepDesc = extractDeepDescriptionFromYouTubeJson(parsedData);
        if (deepDesc) {
          metaDescription = deepDesc;
        }
      }

      // 2.2.2. Localizar y parsear ytInitialPlayerResponse
      const parsedPlayer = parseYouTubeJsonFromHtml(html, 'ytInitialPlayerResponse');
      if (parsedPlayer) {
        // Comprobar estado real de reproducción devuelto por YouTube
        const playability = parsedPlayer.playabilityStatus;
        if (playability && (playability.status === 'ERROR' || playability.status === 'UNPLAYABLE')) {
          playabilityReason =
            playability.reason ||
            playability.errorScreen?.playerInterstitialRenderer?.content?.interstitialViewModel?.title?.content ||
            'Este vídeo no está disponible en YouTube';
          console.warn(`[YouTube] playabilityStatus ERROR para ${cleanVideoId}:`, playabilityReason);
        }

        if (!metaDescription) {
          const deepDesc = extractDeepDescriptionFromYouTubeJson(parsedPlayer);
          if (deepDesc) {
            metaDescription = deepDesc;
          }
        }

        if (!title && parsedPlayer.videoDetails?.title) {
          title = String(parsedPlayer.videoDetails.title).trim();
        }
        if (!author && parsedPlayer.videoDetails?.author) {
          author = String(parsedPlayer.videoDetails.author).trim();
        }
      }

      // Limpiar posibles saltos de línea escapados en strings JSON
      if (metaDescription.includes('\\n')) {
        metaDescription = metaDescription.replace(/\\n/g, '\n').replace(/\\r/g, '');
      }

      // Título y autor de respaldo si oEmbed ni playerResponse lo trajeron
      if (!title) {
        const $ = cheerio.load(html);
        title =
          $('meta[name="title"]').attr('content')?.trim() ||
          $('meta[property="og:title"]').attr('content')?.trim() ||
          $('title').text().replace(/- YouTube$/i, '').trim();
      }

      // 3. Extracción nativa de subtítulos usando los captionTracks del JSON ya descargado
      transcript = await extractNativeYouTubeTranscript(cleanVideoId, parsedPlayer);
    }
  } catch (err) {
    console.warn('[YouTube] Fallo en fetch raw HTML de YouTube:', err instanceof Error ? err.message : err);
  }

  // Si YouTube indica explícitamente que el vídeo no está disponible (privado, borrado, etc.), reportarlo con claridad
  if (playabilityReason) {
    throw new NonCulinaryContentError(
      `El vídeo de YouTube no está disponible (${playabilityReason}). Comprueba que el enlace esté activo y sea público.`
    );
  }

  // Descartar mensajes genéricos de boilerplate de YouTube si se hubieran capturado
  if (
    metaDescription.toLowerCase().includes('disfruta de los vídeos y la música') ||
    metaDescription.toLowerCase().includes('enjoy the videos and music')
  ) {
    metaDescription = '';
  }

  // 4. Verificación de Vía Principal vs Fallback Multimodal:
  const hasTranscript = transcript.trim().length > 0;
  const cleanDesc = metaDescription.trim();
  // Se considera descripción sustancial si tiene contenido relevante y no es solo autopromoción
  const hasSubstantiveDescription =
    cleanDesc.length > 30 &&
    !cleanDesc.toLowerCase().startsWith('suscríbete') &&
    !cleanDesc.toLowerCase().startsWith('subscribe');

  // Si tenemos subtítulos o una descripción con contenido culinario real, seguimos por la VÍA PRINCIPAL (texto):
  if (hasTranscript || hasSubstantiveDescription) {
    let concatenatedText = '';
    if (title) {
      concatenatedText += `TÍTULO DEL VÍDEO DE YOUTUBE:\n${title}\n\n`;
    }
    if (author) {
      concatenatedText += `CANAL / CREADOR:\n${author}\n\n`;
    }
    if (cleanDesc) {
      concatenatedText += `DESCRIPCIÓN DEL VÍDEO (META-DESCRIPCIÓN ENRIQUECIDA - INGREDIENTES Y PASOS DEL CREADOR):\n${cleanDesc}\n\n`;
    }
    if (hasTranscript) {
      concatenatedText += `TRANSCRIPCIÓN DEL AUDIO (SUBTÍTULOS / PASOS HABLADOS):\n${transcript}\n\n`;
    }

    return {
      videoId: cleanVideoId,
      url: standardUrl,
      title,
      author,
      metaDescription: cleanDesc,
      transcript,
      concatenatedText,
      isMultimodalFallback: false,
    };
  }

  // =========================================================================
  // PLAN B / FALLBACK EXCLUSIVO PARA YOUTUBE
  // Para vídeos (especialmente Shorts) sin descripción escrita ni subtítulos en código,
  // activamos el análisis multimodal directo nativo de Gemini (audio + visión de rótulos).
  // =========================================================================

  // Paso 2A opcional: Si el entorno dispone de RAPIDAPI_KEY o YOUTUBE_API_KEY,
  // intentar obtener subtítulos adicionales por proxy residencial antes de la visión directa:
  const rapidApiKey = process.env.RAPIDAPI_KEY || process.env.YOUTUBE_API_KEY;
  if (rapidApiKey) {
    try {
      const rapidRes = await fetch(
        `https://youtube-transcriptor.p.rapidapi.com/transcript?video_id=${cleanVideoId}&lang=es`,
        {
          headers: {
            'x-rapidapi-key': rapidApiKey,
            'x-rapidapi-host': 'youtube-transcriptor.p.rapidapi.com',
          },
          signal: AbortSignal.timeout(4000),
        }
      );
      if (rapidRes.ok) {
        const rapidJson = await rapidRes.json();
        const rapidLines: string[] = [];
        if (Array.isArray(rapidJson)) {
          for (const item of rapidJson) {
            if (item?.text && typeof item.text === 'string') {
              rapidLines.push(item.text.trim());
            }
          }
        }
        if (rapidLines.length > 0) {
          const rapidTranscript = rapidLines.join(' ');
          let concatenatedText = '';
          if (title) concatenatedText += `TÍTULO DEL VÍDEO DE YOUTUBE:\n${title}\n\n`;
          if (author) concatenatedText += `CANAL / CREADOR:\n${author}\n\n`;
          concatenatedText += `TRANSCRIPCIÓN DEL AUDIO (VÍA RAPIDAPI):\n${rapidTranscript}\n\n`;

          return {
            videoId: cleanVideoId,
            url: standardUrl,
            title,
            author,
            metaDescription: cleanDesc,
            transcript: rapidTranscript,
            concatenatedText,
            isMultimodalFallback: false,
          };
        }
      }
    } catch (rapidErr) {
      console.warn('[YouTube] Fallback opcional RapidAPI falló:', rapidErr instanceof Error ? rapidErr.message : rapidErr);
    }
  }

  // Paso 2B: Fallback Multimodal Nativo (Audio + Visión sobreimpreso)
  // Google Gemini API procesa URLs directas de YouTube mediante fileData: { fileUri: standardUrl }
  // sin descargar el archivo a Vercel ni sufrir bloqueos por IP de datacenter,
  // analizando tanto el habla del chef como los ingredientes rotulados sobreimpresos en pantalla.
  let concatenatedText = '';
  if (title) {
    concatenatedText += `TÍTULO DEL VÍDEO DE YOUTUBE:\n${title}\n\n`;
  }
  if (author) {
    concatenatedText += `CANAL / CREADOR:\n${author}\n\n`;
  }
  if (cleanDesc) {
    concatenatedText += `DESCRIPCIÓN DEL VÍDEO:\n${cleanDesc}\n\n`;
  }
  concatenatedText += `ANÁLISIS MULTIMODAL DE VÍDEO YOUTUBE DIRECTO:\nEste vídeo o Short carece de descripción escrita y subtítulos en código. Analiza exhaustivamente el archivo audiovisual (tanto el audio de voz hablado con las cantidades como los textos o ingredientes sobreimpresos en pantalla durante la preparación) para extraer la receta completa.\n\n`;

  return {
    videoId: cleanVideoId,
    url: standardUrl,
    title,
    author,
    metaDescription: cleanDesc,
    transcript: '',
    concatenatedText,
    isMultimodalFallback: true,
    videoUri: standardUrl,
  };
}

/**
 * Extractor especializado para YouTube (Videos y Shorts)
 * Extrae Transcript + Meta-descripción y concatena ambos.
 */
async function extractYouTubeCombo(
  url: string,
  filePrefix: string
): Promise<MediaComboResult | null> {
  const ytData = await extractYouTubeDetails(url);

  return {
    mimeType: 'text/plain',
    title: ytData.title,
    caption: ytData.concatenatedText,
    cleanUp: async () => {},
  };
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
export async function downloadMediaCombo(rawUrl: string): Promise<MediaComboResult | null> {
  const url = sanitizeRecipeUrl(rawUrl) || rawUrl;
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
export async function scrapeUrlContent(rawUrl: string): Promise<{
  titulo?: string;
  descripcion?: string;
  cuerpoTexto?: string;
  ingredientesDetectados?: string[];
  instruccionesDetectadas?: string[];
}> {
  const url = sanitizeRecipeUrl(rawUrl) || rawUrl;
  try {
    // Si es un enlace de YouTube, consultar endpoint oficial de oEmbed para extraer metadatos directos
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const oembedRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          if (oembedData?.title) {
            return {
              titulo: oembedData.title,
              descripcion: `Vídeo de YouTube: ${oembedData.title} por ${oembedData.author_name || 'Chef'}.`,
              cuerpoTexto: `Título del vídeo: ${oembedData.title}\nCanal/Autor: ${oembedData.author_name || ''}`,
            };
          }
        }
      } catch (oembedErr) {
        console.warn('Fallo opcional en YouTube oEmbed:', oembedErr);
      }
    }

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

function getMimeType(fileName: string, providedType?: string): string {
  if (providedType && providedType !== 'application/octet-stream' && providedType.trim().length > 0) {
    return providedType;
  }
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.txt':
      return 'text/plain';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.heic':
      return 'image/heic';
    default:
      return providedType || 'application/octet-stream';
  }
}

/**
 * Extracción Multimodal con Fusión Contextual (Vídeo/Audio, Archivos/Documentos + Descripción/Caption)
 * usando la File API de Gemini y responseJsonSchema estricto.
 */
export async function extractRecipeWithGemini({
  url: rawUrl,
  texto,
  file,
  porcionesUsuario,
  idioma = 'es',
  alertasClinicas,
  exclusionesClinicas,
}: {
  url?: string;
  texto?: string;
  file?: File;
  porcionesUsuario?: number;
  idioma?: 'es' | 'en';
  alertasClinicas?: string[];
  exclusionesClinicas?: string[];
}): Promise<ExtractedRecipe> {
  const clinicalAlerts = alertasClinicas || exclusionesClinicas || [];
  const url = sanitizeRecipeUrl(rawUrl);
  const ai = getGeminiClient();

  let combo: MediaComboResult | null = null;
  let geminiUploadedFileName: string | null = null;
  let tempUploadedFilePath: string | null = null;

  try {
    let uploadedFilePart: any = null;
    let contextPrompt = '';

    // 0. Procesar Archivo / Imagen subido directamente por el usuario (Multimodal)
    if (file && file.size > 0) {
      const fileName = file.name || 'documento_receta';
      const ext = path.extname(fileName).toLowerCase();
      const mimeType = getMimeType(fileName, file.type);

      if (ext === '.txt' || mimeType === 'text/plain') {
        const textContent = await file.text();
        contextPrompt += `DOCUMENTO DE TEXTO SUBIDO POR EL USUARIO (${fileName}):\n${textContent}\n\n`;
      } else {
        const buffer = Buffer.from(await file.arrayBuffer());
        const tempFileName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext || '.bin'}`;
        tempUploadedFilePath = path.join(os.tmpdir(), tempFileName);
        fs.writeFileSync(tempUploadedFilePath, buffer);

        // Subida mediante Gemini Files API
        const uploadedFile = await ai.files.upload({
          file: tempUploadedFilePath,
          config: {
            mimeType: mimeType,
          },
        });

        if (uploadedFile.name) {
          geminiUploadedFileName = uploadedFile.name;

          let fileRecord = await ai.files.get({ name: uploadedFile.name });
          let attempts = 0;
          while (fileRecord.state === 'PROCESSING' && attempts < 25) {
            await new Promise((r) => setTimeout(r, 1500));
            fileRecord = await ai.files.get({ name: uploadedFile.name });
            attempts++;
          }

          if (fileRecord.state !== 'FAILED' && fileRecord.uri) {
            uploadedFilePart = {
              fileData: {
                fileUri: fileRecord.uri,
                mimeType: fileRecord.mimeType || mimeType,
              },
            };
            contextPrompt += `ARCHIVO / DOCUMENTO ADJUNTO POR EL USUARIO (${fileName}, ${mimeType}). Analiza minuciosamente el contenido de este archivo (texto, imágenes o datos) para extraer la receta completa.\n\n`;
          } else {
            console.warn('El archivo subido a Gemini Files falló o no está listo:', fileRecord.state);
          }
        }
      }
    }

    // 1. Procesar URL con Extracción del Combo Multi-Nivel
    if (url) {
      const tipo = detectFuenteTipo(url);

      if (tipo === 'youtube') {
        // En YouTube: Extraer Vía Principal (descripción profunda + CC). Si carece de descripción/CC, activar Plan B multimodal
        const ytData = await extractYouTubeDetails(url);
        contextPrompt += ytData.concatenatedText;

        if (ytData.isMultimodalFallback && ytData.videoUri) {
          uploadedFilePart = {
            fileData: {
              fileUri: ytData.videoUri,
            },
          };
        }
      } else {
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
    }

    if (texto) {
      contextPrompt += `NOTAS O TEXTO ADICIONAL APORTADO POR EL USUARIO:\n${texto}\n\n`;
    }

    if (porcionesUsuario && porcionesUsuario > 0) {
      contextPrompt += `PORCIONES / RACIONES OBJETIVO DEL USUARIO: ${porcionesUsuario} raciones.
DIRECTIVA ESTRICTA DE ESCALADO MATEMÁTICO Y PROSA CULINARIA NATURAL: Si las raciones originales del metraje difieren de las raciones objetivo del usuario (${porcionesUsuario} raciones), DEBES aplicar obligatoriamente un factor de conversión matemático a TODOS los ingredientes. Plasma estas cantidades ya calculadas (escaladas) tanto en el array de 'ingredientes' como integradas en la redacción fluida y natural de 'preparación' (ej: "Añade media cebolla picada", "Vierte una cucharada de aceite (15 ml)", "Incorpora los 200 g de pollo"), prohibiéndose tajantemente decimales de laboratorio como "0.5 unidades de cebolla", y establece 'porciones': ${porcionesUsuario}.\n\n`;
    }

    // Validación previa para evitar alucinaciones: si no hay archivo multimodal, verificar que haya texto con sustancia culinaria real
    const cleanTextWithoutPlaceholders = contextPrompt
      .replace(
        /TÍTULO DETECTADO:|DESCRIPCIÓN:|TEXTO DE LA RECETA \/ PÁGINA:|NOTAS O TEXTO ADICIONAL APORTADO POR EL USUARIO:|TÍTULO DEL POST \/ RECETA:|DESCRIPCIÓN CRUDA DEL POST \(CAPTION DEL CREADOR\):|DOCUMENTO DE TEXTO SUBIDO POR EL USUARIO \(.*?\):|ARCHIVO \/ DOCUMENTO ADJUNTO POR EL USUARIO \(.*?\):|TÍTULO DEL VÍDEO DE YOUTUBE:|CANAL \/ CREADOR:|DESCRIPCIÓN DEL VÍDEO \(DETALLES Y MEDIDAS DEL CREADOR\):|TRANSCRIPCIÓN DEL AUDIO \(SUBTÍTULOS \/ PASOS HABLADOS\):/g,
        ''
      )
      .replace(/TikTok - Make Your Day|Login • Instagram|Instagram|YouTube|Sign in|Iniciar sesión/gi, '')
      .trim();

    if (!uploadedFilePart && cleanTextWithoutPlaceholders.length < 35) {
      if (url && detectFuenteTipo(url) === 'youtube') {
        throw new NonCulinaryContentError(
          'Este vídeo no contiene transcripción ni detalles de receta legibles. Prueba con otro enlace.'
        );
      }
      throw new Error(
        'No se pudo extraer información culinaria del enlace ni del archivo proporcionado. Por favor, sube un documento o imagen con la receta o pega directamente el texto de los ingredientes.'
      );
    }

    // 2. Prompt de Fusión Contextual (Multimodal)
    const langName = idioma === 'en' ? 'English' : 'Spanish';
    const compatibilidadDirective =
      clinicalAlerts.length > 0
        ? `\n4. ALERTAS INFORMATIVAS DE COMPATIBILIDAD (FIDELIDAD 100% AL VÍDEO / FUENTE ORIGINAL):
- La receta extraída DEBE conservar al 100% todos los ingredientes y pasos originales empleados por el creador. Queda TERMINANTEMENTE PROHIBIDO sustituir o eliminar ingredientes (como ajo o cebolla) durante la ingesta.
- Comprueba si los ingredientes originales entran en conflicto con las restricciones clínicas o alérgenos del usuario: [${clinicalAlerts.join(', ')}].
- Si detectas incompatibilidades, señálalas ÚNICAMENTE de forma informativa en el array "alertas_compatibilidad" (ej: "Contiene ajo (FODMAP)", "Contiene gluten"). Si no hay conflictos, devuelve un array vacío [].`
        : '';

    const langDirective =
      idioma === 'en'
        ? `5. ADVERTENCIA CRÍTICA DE IDIOMA (EL FIN DEL SPANGLISH):
ADVERTENCIA CRÍTICA DE IDIOMA: Si el idioma solicitado es Inglés ('en'), estás ESTRICTAMENTE PROHIBIDO de usar la palabra 'unidades', 'cucharadas', 'gramos' en español. Debes usar sus equivalentes en inglés ('units/pieces', 'tbsp/tsp', 'grams'). Las etiquetas de dificultad ('Fácil', 'Principiante') DEBEN traducirse al inglés ('Easy', 'Beginner'). TODO EL JSON DEBE SER INGLÉS NATIVO. NUNCA mezcles idiomas.`
        : `5. GESTIÓN DINÁMICA DE IDIOMA (VITAL): Traduce el audio/texto del vídeo original y redacta el JSON de la receta estrictamente en Spanish. NUNCA mezcles idiomas.`;

    const garlicDirective =
      idioma === 'en'
        ? `6. MANDATORY CULINARY EXCEPTION FOR GARLIC: For peeled or separated garlic cloves, the mandatory unit in 'ingredientes' MUST be "clove" (singular) or "cloves" (plural). NEVER use "unit", "units", or "head" unless cooking the entire whole head roasted.`
        : `6. EXCEPCIÓN CULINARIA OBLIGATORIA PARA EL AJO: Para ajo desgranado, la unidad obligatoria en 'ingredientes' DEBE ser "diente" o "dientes". Queda TERMINANTEMENTE PROHIBIDO usar "unidad", "unidades" o "cabeza" a menos que la receta use la cabeza entera asada.`;

    const promptFinal = `
Eres un Chef Ejecutivo y Nutricionista especializado en extracción culinaria multimodal y perfilado nutricional.

DIRECTIVAS CRÍTICAS DE PRECISIÓN Y TOLERANCIA CERO A LA ALUCINACIÓN:
1. Basarse única y exclusivamente en los hechos observados y escuchados en el archivo audiovisual o en el texto proporcionado.
2. Si el contenido NO corresponde a una receta de cocina ni preparación de alimentos real:
   - Establece obligatoriamente: "es_receta_valida": false
   - Especifica en "motivo_invalido" el motivo exacto (ej: "Vídeo no culinario", "Contenido sin ingredientes ni pasos de cocina").
   - NO inventes ingredientes ni pasos.
3. Si el contenido SÍ es una receta real, establece "es_receta_valida": true y cruza exhaustivamente el vídeo/audio con el texto del post para extraer cantidades, ingredientes canónicos, pasos en prosa culinaria natural y tiempos.
4. INFERENCIA RIGUROSA DE PORCIONES BASE: Si el creador no verbaliza ni escribe el número exacto de raciones, NUNCA asumas 1 ración por defecto ni valores al azar. Calcula obligatoriamente 'porciones' deduciendo el volumen del ingrediente principal o base de la receta según la Tabla Maestra de Referencia Nutricional del sistema.
${compatibilidadDirective}
${langDirective}
${garlicDirective}

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

    const dynamicSystemInstruction = buildRecipeSystemInstruction({
      idioma,
      alertasClinicas: clinicalAlerts,
    });

    let lastError: unknown = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: dynamicSystemInstruction,
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

        parsed.ingredientes = normalizarIngredientesExtraidos(parsed.ingredientes, {
          idioma,
          rolPlato: parsed.rol_plato,
          titulo: parsed.titulo,
          categorias: parsed.categorias_gastronomicas,
          momentos: parsed.momentos_consumo,
          etiquetas: parsed.etiquetas,
        });

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
    if (tempUploadedFilePath && fs.existsSync(tempUploadedFilePath)) {
      try {
        fs.unlinkSync(tempUploadedFilePath);
      } catch (e) {
        console.warn('No se pudo borrar el archivo temporal local:', e);
      }
    }
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
