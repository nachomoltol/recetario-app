import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type jsPDF from 'jspdf';
import { hasActiveNativeBridge, isNativeAndroidPlatform } from '@/lib/admob/admobService';

export interface SaveOrSharePdfOptions {
  doc: jsPDF;
  fileName: string;
  dialogTitle?: string;
}

/**
 * Sanitiza un nombre de archivo PDF eliminando barras ("/"), tildes, espacios y caracteres especiales
 * que provocarían errores de subdirectorio inexistente en iOS o fallos de URI en Android.
 */
function buildSafePdfFileName(rawFileName: string): string {
  const nameWithoutExt = (rawFileName || '').replace(/\.pdf$/i, '');
  const cleanBase = nameWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `${cleanBase || 'miga_receta'}.pdf`;
}

/**
 * Guarda o comparte un PDF de forma universal y robusta:
 * - En Android (Capacitor Nativo): Sanitiza el nombre de archivo, escribe en caché y
 *   pasa exclusivamente el array `files: [fileUri]` para abrir el Sharesheet sin cerrarse.
 * - En iOS (Apple Capacitor Nativo): Sanitiza igualmente el nombre de archivo (`safeFileName`)
 *   y mantiene el flujo validado con `url: fileUri`.
 * - En Navegadores Web: Descarga directa y segura para escritorio y navegadores móviles.
 */
export async function saveOrSharePdf({
  doc,
  fileName,
  dialogTitle = 'Guardar o compartir PDF',
}: SaveOrSharePdfOptions): Promise<void> {
  const isNative = Capacitor.isNativePlatform() || hasActiveNativeBridge();

  if (isNative) {
    try {
      // 1. Extraer Base64 limpio sin el prefijo data:...;base64,
      const dataUri = doc.output('datauristring');
      const commaIdx = dataUri.indexOf(',');
      const base64Data = commaIdx !== -1 ? dataUri.slice(commaIdx + 1) : dataUri;

      const safeFileName = buildSafePdfFileName(fileName);
      const isAndroid = Capacitor.getPlatform() === 'android' || isNativeAndroidPlatform();

      if (isAndroid) {
        // 1. Escribir archivo temporal en la caché privada de la aplicación
        try {
          await Filesystem.writeFile({
            path: safeFileName,
            data: base64Data,
            directory: Directory.Cache,
          });
        } catch (writeErr: unknown) {
          const msg =
            writeErr instanceof Error
              ? writeErr.message
              : (writeErr as { message?: string })?.message || String(writeErr);
          throw new Error(`Filesystem.writeFile fallo: ${msg}`);
        }

        // 2. Obtener URI nativa con Filesystem.getUri
        let fileUri: string;
        try {
          const uriResult = await Filesystem.getUri({
            path: safeFileName,
            directory: Directory.Cache,
          });
          fileUri = uriResult.uri;
        } catch (uriErr: unknown) {
          const msg =
            uriErr instanceof Error
              ? uriErr.message
              : (uriErr as { message?: string })?.message || String(uriErr);
          throw new Error(`Filesystem.getUri fallo: ${msg}`);
        }

        // 3. Presentar hoja nativa en Android usando el array estándar de archivos 'files'
        try {
          await Share.share({
            title: safeFileName,
            files: [fileUri],
            dialogTitle,
          });
        } catch (shareCallErr: unknown) {
          const msg =
            shareCallErr instanceof Error
              ? shareCallErr.message
              : (shareCallErr as { message?: string })?.message || String(shareCallErr);
          const lowMsg = msg.toLowerCase();
          if (
            lowMsg.includes('cancel') ||
            lowMsg.includes('dismiss') ||
            lowMsg.includes('abort') ||
            lowMsg.includes('closed')
          ) {
            return;
          }
          throw new Error(`Share.share fallo: ${msg}`);
        }
      } else {
        // Flujo iOS (Apple) con safeFileName para evitar errores si el título contiene "/" u otros símbolos
        const savedFile = await Filesystem.writeFile({
          path: safeFileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        let fileUri = savedFile?.uri;
        if (!fileUri) {
          const uriResult = await Filesystem.getUri({
            path: safeFileName,
            directory: Directory.Cache,
          });
          fileUri = uriResult.uri;
        }

        await Share.share({
          title: safeFileName,
          url: fileUri,
          dialogTitle,
        });
      }
    } catch (shareErr: unknown) {
      // Manejo limpio de cancelación voluntaria por parte del usuario
      const rawMsg =
        shareErr instanceof Error
          ? shareErr.message
          : (shareErr as { message?: string })?.message || String(shareErr);
      const errMsg = rawMsg.toLowerCase();

      if (
        errMsg.includes('cancel') ||
        errMsg.includes('dismiss') ||
        errMsg.includes('abort') ||
        errMsg.includes('closed')
      ) {
        // El usuario descartó o cerró voluntariamente la hoja de compartir
        return;
      }

      console.error('[pdfDownloadHelper] Error al compartir PDF nativo:', shareErr);
      throw new Error(rawMsg);
    }
  } else {
    // Entorno Web (Escritorio o Navegador Web Móvil) - 100% Intacto
    const isMobileWeb =
      typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');

    if (isMobileWeb && typeof document !== 'undefined') {
      try {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
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
            // Ignorar errores menores de limpieza en navegadores antiguos
          }
        }, 4000);
      } catch (webErr) {
        console.warn('[pdfDownloadHelper] Fallback a doc.save() en móvil web:', webErr);
        doc.save(fileName);
      }
    } else {
      doc.save(fileName);
    }
  }
}
