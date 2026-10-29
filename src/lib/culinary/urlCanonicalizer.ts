import crypto from 'node:crypto';

/**
 * Resuelve redirecciones HTTP de enlaces cortos (ej. vm.tiktok.com, vt.tiktok.com)
 * mediante una petición HEAD ligera con timeout acotado para no bloquear el flujo de ingesta.
 */
export async function resolveShortUrl(url: string, timeoutMs = 1500): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timer);

    if (res.url && res.url !== url) {
      return res.url;
    }
  } catch {
    // Si falla la red o expira el timeout, continuar con la URL original
  }
  return url;
}

/**
 * Calcula el hash criptográfico SHA-256 (64 caracteres hexadecimales) de la clave unívoca
 * de la fuente (ej. `tiktok:{videoId}`, `instagram:{shortcode}`, `youtube:{videoId}`).
 * Determinista e insensible a espacios en blanco extremos. NO se debe hashear la URL visible.
 */
export function computeSourceUrlHash(sourceKey: string): string {
  return crypto.createHash('sha256').update(sourceKey.trim()).digest('hex');
}

export interface CanonicalVideoSource {
  /** URL funcional y accesible para el usuario (se guarda en `fuente_url`). */
  url: string;
  /** Clave unívoca abstracta de plataforma usada únicamente para calcular `source_url_hash`. */
  key: string;
}

/**
 * Corrige URLs de TikTok rotas del tipo `https://www.tiktok.com/video/{id}` (sin username → 404)
 * insertando el segmento `@tiktok` soportado por la plataforma. Cualquier otra URL se devuelve intacta.
 */
export function repairBrokenTikTokUrl(url?: string | null): string | null | undefined {
  if (!url) return url;
  const m = url.match(/^https?:\/\/(?:www\.)?tiktok\.com\/video\/(\d+)/i);
  return m ? `https://www.tiktok.com/@tiktok/video/${m[1]}` : url;
}

/**
 * Devuelve únicamente la URL canónica funcional (sin la clave de caché).
 */
export async function normalizeCanonicalVideoUrl(rawUrl?: string | null): Promise<string | undefined> {
  return (await resolveCanonicalVideoSource(rawUrl))?.url;
}

/**
 * Normaliza una URL de vídeo/receta y devuelve:
 * - `url`: enlace funcional para el usuario (TikTok conserva `/@{username}/video/{id}`).
 * - `key`: clave abstracta por plataforma (`tiktok:{id}`, `instagram:{shortcode}`, `youtube:{id}`, `web:{url}`).
 */
export async function resolveCanonicalVideoSource(
  rawUrl?: string | null
): Promise<CanonicalVideoSource | undefined> {
  if (!rawUrl || typeof rawUrl !== 'string') return undefined;

  let urlStr = rawUrl.trim();
  if (!urlStr) return undefined;

  // Limpiar caracteres envolventes comunes como <url>, (url), "url", 'url'
  urlStr = urlStr.replace(/^[<("'[]+|[>)"'\]]+$/g, '').trim();

  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    urlStr = `https://${urlStr}`;
  }

  try {
    let parsed = new URL(urlStr);
    let hostname = parsed.hostname.toLowerCase();

    // Resolver enlaces cortos de TikTok (vm.tiktok.com, vt.tiktok.com o /t/)
    if (
      hostname === 'vm.tiktok.com' ||
      hostname === 'vt.tiktok.com' ||
      (hostname.includes('tiktok.com') && parsed.pathname.startsWith('/t/'))
    ) {
      const resolved = await resolveShortUrl(parsed.href, 1500);
      parsed = new URL(resolved);
      hostname = parsed.hostname.toLowerCase();
    }

    // 1. YOUTUBE
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      let videoId: string | null = null;

      if (hostname.includes('youtu.be')) {
        const rawId = parsed.pathname.substring(1);
        videoId = rawId.split('/')[0] || rawId;
      } else if (parsed.pathname.includes('/shorts/')) {
        videoId = parsed.pathname.split('/')[2] || null;
      } else if (parsed.pathname.includes('/watch')) {
        videoId = parsed.searchParams.get('v');
      } else if (parsed.pathname.includes('/embed/') || parsed.pathname.includes('/live/')) {
        videoId = parsed.pathname.split('/')[2] || null;
      }

      if (videoId && videoId.trim()) {
        const idMatch = videoId.match(/[a-zA-Z0-9_-]{11}/);
        const cleanVideoId = idMatch ? idMatch[0] : videoId.trim();
        if (cleanVideoId) {
          return {
            url: `https://www.youtube.com/watch?v=${cleanVideoId}`,
            key: `youtube:${cleanVideoId}`,
          };
        }
      }
    }

    // 2. INSTAGRAM
    if (hostname.includes('instagram.com')) {
      // Formatos: /reel/{shortcode}/, /p/{shortcode}/, /reels/{shortcode}/
      const match = parsed.pathname.match(/\/(?:reel|reels|p)\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        const shortcode = match[1];
        return {
          url: `https://www.instagram.com/reel/${shortcode}/`,
          key: `instagram:${shortcode}`,
        };
      }
    }

    // 3. TIKTOK
    if (hostname.includes('tiktok.com')) {
      // Formatos: /@user/video/{id}, /video/{id}, /v/{id}, /v/{id}.html
      const withUser = parsed.pathname.match(/^\/@([^/]+)\/video\/(\d+)/i);
      const idOnly = parsed.pathname.match(/\/(?:video|v)\/(\d+)/i);
      const videoId = withUser?.[2] || idOnly?.[1];
      if (videoId) {
        // TikTok exige el username en la ruta (sin él devuelve 404). Si no se conoce, '@tiktok' es válido.
        const username = withUser?.[1] || 'tiktok';
        return {
          url: `https://www.tiktok.com/@${username}/video/${videoId}`,
          key: `tiktok:${videoId}`,
        };
      }
    }

    // 4. WEB GENERAL / OTRAS PLATAFORMAS
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'igsh',
      '_t',
      '_r',
      'is_from_webapp',
      'sender_device',
      'share_app_id',
      'si',
      'feature',
    ];

    for (const p of trackingParams) {
      parsed.searchParams.delete(p);
    }

    parsed.protocol = 'https:';
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();

    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    const webUrl = parsed.toString();
    return { url: webUrl, key: `web:${webUrl.toLowerCase()}` };
  } catch {
    return { url: urlStr, key: `web:${urlStr.toLowerCase()}` };
  }
}
