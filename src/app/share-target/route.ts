import { NextResponse, type NextRequest } from 'next/server';

function extractUrl(text: string | null, urlParam: string | null): string | null {
  if (urlParam && urlParam.startsWith('http')) {
    return urlParam.trim();
  }

  if (!text) return null;

  // Buscar URLs dentro de texto compartido (TikTok, Instagram, YouTube suelen concatenar texto y enlace)
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const match = text.match(urlRegex);
  if (match && match.length > 0) {
    // Limpiar caracteres de puntuación finales si los hay
    return match[0].replace(/[.,;:!?)]+$/, '').trim();
  }

  return null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const title = searchParams.get('title') || '';
  const text = searchParams.get('text') || '';
  const rawUrl = searchParams.get('url') || '';

  const detectedUrl = extractUrl(text, rawUrl);
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = '/recipes';

  // Limpiar parámetros previos
  redirectUrl.search = '';

  if (detectedUrl) {
    redirectUrl.searchParams.set('captureUrl', detectedUrl);
    redirectUrl.searchParams.set('autoStart', '1');
    const remainingText = (text || '').replace(detectedUrl, '').trim();
    if (remainingText || title) {
      redirectUrl.searchParams.set('captureText', (remainingText || title).slice(0, 1000));
    }
  } else if (text || title) {
    redirectUrl.searchParams.set('captureText', (text || title).slice(0, 1000));
    redirectUrl.searchParams.set('autoStart', '1');
  }

  return NextResponse.redirect(redirectUrl);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = (formData.get('title') as string) || '';
    const text = (formData.get('text') as string) || '';
    const rawUrl = (formData.get('url') as string) || '';

    const detectedUrl = extractUrl(text, rawUrl);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/recipes';
    redirectUrl.search = '';

    if (detectedUrl) {
      redirectUrl.searchParams.set('captureUrl', detectedUrl);
      redirectUrl.searchParams.set('autoStart', '1');
      const remainingText = (text || '').replace(detectedUrl, '').trim();
      if (remainingText || title) {
        redirectUrl.searchParams.set('captureText', (remainingText || title).slice(0, 1000));
      }
    } else if (text || title) {
      redirectUrl.searchParams.set('captureText', (text || title).slice(0, 1000));
      redirectUrl.searchParams.set('autoStart', '1');
    }

    return NextResponse.redirect(redirectUrl);
  } catch {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/recipes';
    return NextResponse.redirect(redirectUrl);
  }
}
