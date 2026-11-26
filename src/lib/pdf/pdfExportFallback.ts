import type jsPDF from 'jspdf';
import { saveOrSharePdf, type SaveOrSharePdfOptions } from './pdfDownloadHelper';

function isUserCancellationError(err: unknown): boolean {
  const rawMsg =
    err instanceof Error
      ? err.message
      : (err as { message?: string })?.message || String(err);
  const low = rawMsg.toLowerCase();
  return (
    low.includes('cancel') ||
    low.includes('dismiss') ||
    low.includes('abort') ||
    low.includes('closed')
  );
}

function isPluginNotImplementedError(err: unknown): boolean {
  const rawMsg =
    err instanceof Error
      ? err.message
      : (err as { message?: string })?.message || String(err);
  const low = rawMsg.toLowerCase();
  return (
    low.includes('not implemented') ||
    low.includes('unimplemented') ||
    low.includes('plugin is not') ||
    low.includes('filesystem')
  );
}

async function shareOrDownloadPdfInWebView(
  doc: jsPDF,
  fileName: string,
  dialogTitle: string
): Promise<void> {
  const blob = doc.output('blob');

  // 1. Intentar Web Share API con archivo PDF (soportado en iOS WKWebView / Safari 15+)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const pdfFile = new File([blob], fileName, { type: 'application/pdf' });
      const canShareFiles =
        typeof navigator.canShare !== 'function' || navigator.canShare({ files: [pdfFile] });

      if (canShareFiles) {
        await navigator.share({
          title: dialogTitle,
          files: [pdfFile],
        });
        return;
      }
    } catch (shareErr: unknown) {
      if (isUserCancellationError(shareErr)) {
        return;
      }
      console.warn('[pdfExportFallback] Web Share API no disponible o falló, usando descarga Blob:', shareErr);
    }
  }

  // 2. Fallback seguro a descarga/apertura directa por Blob URL
  if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
    const blobUrl = URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(blobUrl);
        } catch {
          // Ignorar errores de limpieza
        }
      }, 4000);
      return;
    } catch (blobErr) {
      URL.revokeObjectURL(blobUrl);
      console.warn('[pdfExportFallback] Fallback a doc.save():', blobErr);
    }
  }

  doc.save(fileName);
}

/**
 * Envuelve saveOrSharePdf (sin modificar pdfDownloadHelper.ts) para garantizar
 * que si el binario nativo de iOS instalado aún no tiene registrado el plugin
 * Filesystem/Share en Capacitor, se degrade automáticamente al Share Sheet web
 * o descarga Blob en lugar de mostrar "Filesystem plugin is not implemented on ios".
 */
export async function saveOrSharePdfWithFallback(
  options: SaveOrSharePdfOptions
): Promise<void> {
  try {
    await saveOrSharePdf(options);
  } catch (err: unknown) {
    if (isUserCancellationError(err)) {
      return;
    }

    if (isPluginNotImplementedError(err)) {
      console.warn(
        '[pdfExportFallback] Plugin nativo Filesystem/Share no disponible en este binario iOS. Activando respaldo Web Share / Blob.'
      );
      await shareOrDownloadPdfInWebView(
        options.doc,
        options.fileName,
        options.dialogTitle || 'Guardar o compartir PDF'
      );
      return;
    }

    throw err;
  }
}
