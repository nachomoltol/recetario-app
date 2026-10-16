/**
 * Utilidad para comprimir y redimensionar imágenes en el cliente antes de subirlas a Storage.
 * Incluye soporte nativo para convertir fotos iPhone en formato HEIC/HEIF a JPEG estándar.
 */

/**
 * Detecta si un archivo o blob corresponde al formato HEIC/HEIF de Apple iOS.
 */
export function isHeicFile(file: File | Blob): boolean {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  const name = 'name' in file ? ((file as File).name || '').toLowerCase() : '';

  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/heic-sequence' ||
    type === 'image/heif-sequence' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

/**
 * Convierte un archivo HEIC/HEIF a JPEG estándar en el cliente mediante heic2any.
 */
export async function convertHeicToJpeg(file: File | Blob, quality = 0.88): Promise<File> {
  if (typeof window === 'undefined') {
    return file instanceof File ? file : new File([file], 'receta_foto.jpg', { type: 'image/jpeg' });
  }

  try {
    const heic2any = (await import('heic2any')).default;
    const conversionResult = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality,
    });

    const resultBlob: Blob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
    const originalName = 'name' in file ? (file as File).name : 'foto_iphone.heic';
    const cleanName = originalName.replace(/\.(heic|heif)$/i, '') + '.jpg';

    return new File([resultBlob], cleanName, { type: 'image/jpeg' });
  } catch (err) {
    console.warn('Advertencia: No se pudo convertir archivo HEIC con heic2any. Se continuará con el original:', err);
    return file instanceof File ? file : new File([file], 'receta_foto.jpg', { type: 'image/jpeg' });
  }
}

/**
 * Asegura que una imagen esté en formato compatible con navegadores y Gemini.
 * Si es HEIC/HEIF, la convierte inmediatamente a JPEG.
 */
export async function ensureStandardImage(file: File): Promise<File> {
  if (isHeicFile(file)) {
    return await convertHeicToJpeg(file);
  }
  return file;
}

/**
 * Comprime y redimensiona imágenes en el cliente. Si la imagen es HEIC,
 * la transforma previamente a JPEG para que Canvas y los decodificadores puedan procesarla.
 */
export async function compressImageClient(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<Blob> {
  let sourceFile = file;

  // Interceptar formato iOS HEIC/HEIF antes del Canvas
  if (isHeicFile(file)) {
    sourceFile = await convertHeicToJpeg(file, quality);
  }

  // Si no es imagen o es SVG, retornamos el archivo tal cual
  if (!sourceFile.type.startsWith('image/') || sourceFile.type.includes('svg')) {
    return sourceFile;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(sourceFile);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(sourceFile);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        resolve(sourceFile);
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve(sourceFile);
    };

    reader.readAsDataURL(sourceFile);
  });
}
