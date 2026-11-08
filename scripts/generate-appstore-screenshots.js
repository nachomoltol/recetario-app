/**
 * Script de redimensionado estricto para Apple App Store Connect
 * Genera exactamente 4 capturas en resolución oficial 1179 x 2556 px (Dynamic Island / Pantalla mediana 6.1")
 * Manteniendo proporción, centrado perfecto y sin distorsión.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const TARGET_WIDTH = 1179;
const TARGET_HEIGHT = 2556;

const possibleSourceDirs = [
  'C:\\Users\\Nacho\\OneDrive\\Desktop\\capturas',
  'C:\\Users\\Nacho\\Desktop\\capturas',
  'C:\\Users\\Nacho\\Downloads',
];

const outDir = 'C:\\Users\\Nacho\\OneDrive\\Desktop\\capturas_apple_store';

function findSourceImages() {
  for (const dir of possibleSourceDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      // Priorizar los PNGs ya preprocesados o los JPEGs originales de WhatsApp
      const pngMatches = files
        .filter((f) => f.startsWith('appstore_') && f.endsWith('.png'))
        .map((f) => path.join(dir, f));

      if (pngMatches.length >= 4) {
        return pngMatches.slice(0, 4);
      }

      const jpegMatches = files
        .filter((f) => f.includes('WhatsApp Image') && (f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png')))
        .map((f) => path.join(dir, f));

      if (jpegMatches.length >= 4) {
        return jpegMatches.slice(0, 4);
      }
    }
  }
  throw new Error('No se encontraron al menos 4 capturas en los directorios de búsqueda.');
}

async function generateScreenshots() {
  console.log('--- Iniciando generación de capturas para Apple App Store Connect ---');
  console.log(`Resolución objetivo: ${TARGET_WIDTH} x ${TARGET_HEIGHT} píxeles`);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`Carpeta creada: ${outDir}`);
  }

  const sources = findSourceImages();
  console.log(`Imágenes de origen seleccionadas (4):`);
  sources.forEach((s, idx) => console.log(`  [${idx + 1}] ${path.basename(s)}`));

  const generatedFiles = [];

  for (let i = 0; i < sources.length; i++) {
    const srcPath = sources[i];
    const outFilename = `captura_${i + 1}_1179x2556.png`;
    const outPath = path.join(outDir, outFilename);

    await sharp(srcPath)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'contain',
        position: 'center',
        background: { r: 250, g: 247, b: 242, alpha: 1 }, // Tono lino oficial #faf7f2
      })
      .png({ compressionLevel: 9 })
      .toFile(outPath);

    const meta = await sharp(outPath).metadata();
    const stats = fs.statSync(outPath);

    console.log(`✔ Exportado: ${outFilename} (${meta.width}x${meta.height} px, ${(stats.size / 1024).toFixed(1)} KB)`);
    generatedFiles.push({
      path: outPath,
      width: meta.width,
      height: meta.height,
      sizeKb: (stats.size / 1024).toFixed(1),
    });
  }

  console.log('\n--- Proceso completado con éxito: 4 capturas listas para App Store Connect ---');
  return generatedFiles;
}

generateScreenshots().catch((err) => {
  console.error('Error generando capturas:', err);
  process.exit(1);
});
