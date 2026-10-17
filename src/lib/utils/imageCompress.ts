/**
 * Utilidad para comprimir y redimensionar imágenes en el cliente antes de subirlas a Storage.
 * Utiliza Canvas nativo sin librerías pesadas en JS para garantizar máxima fluidez y evitar fugas de memoria en iOS.
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
 * Función de compatibilidad: con el bypass nativo mediante accept="image/jpeg, ...",
 * iOS realiza la conversión por hardware sin pasar por JS.
 */
export async function convertHeicToJpeg(file: File | Blob): Promise<File> {
  return file instanceof File ? file : new File([file], 'receta_foto.jpg', { type: 'image/jpeg' });
}

export async function ensureStandardImage(file: File): Promise<File> {
  return file;
}

/**
 * Comprime y redimensiona imágenes en el cliente usando Canvas nativo ligero y URL.createObjectURL.
 */
export async function compressImageClient(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<Blob> {
  // Si no es imagen o es SVG, retornamos el archivo tal cual
  if (!file.type.startsWith('image/') || file.type.includes('svg')) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
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
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          resolve(blob || file);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
