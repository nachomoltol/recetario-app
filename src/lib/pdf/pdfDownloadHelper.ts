import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type jsPDF from 'jspdf';

export interface SaveOrSharePdfOptions {
  doc: jsPDF;
  fileName: string;
  dialogTitle?: string;
}

/**
 * Guarda o comparte un PDF de forma universal y robusta:
 * - En Capacitor Nativo (Android / iOS): Escribe el PDF en Base64 en Directory.Cache
 *   e invoca la hoja nativa de compartir (UIActivityViewController / Sharesheet),
 *   capturando cancelaciones del usuario sin fallar.
 * - En Navegadores Web: Descarga el archivo de forma directa y segura tanto en
 *   escritorio como en navegadores móviles (Safari iOS / Chrome Android).
 */
export async function saveOrSharePdf({
  doc,
  fileName,
  dialogTitle = 'Guardar o compartir PDF',
}: SaveOrSharePdfOptions): Promise<void> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      // 1. Extraer Base64 limpio sin el prefijo data:...;base64,
      const dataUri = doc.output('datauristring');
      const commaIdx = dataUri.indexOf(',');
      const base64Data = commaIdx !== -1 ? dataUri.slice(commaIdx + 1) : dataUri;

      // 2. Escribir archivo temporal en la caché privada de la aplicación
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      // 3. Resolver la URI nativa compatible con FileProvider (Android) / UIDocument (iOS)
      let fileUri = savedFile?.uri;
      if (!fileUri) {
        const uriResult = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache,
        });
        fileUri = uriResult.uri;
      }

      // 4. Presentar la hoja nativa del sistema operativo
      await Share.share({
        title: fileName,
        url: fileUri,
        dialogTitle,
      });
    } catch (shareErr: unknown) {
      // 5. Manejo limpio de cancelación voluntaria por parte del usuario
      const errMsg =
        shareErr instanceof Error
          ? shareErr.message.toLowerCase()
          : String(shareErr).toLowerCase();

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
      throw shareErr;
    }
  } else {
    // Entorno Web (Escritorio o Navegador Web Móvil)
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
