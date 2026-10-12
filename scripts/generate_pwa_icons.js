const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateIcons() {
  const rootDir = process.cwd();
  const svgPath = path.join(rootDir, 'public', 'icons', 'icon.svg');
  const iconsDir = path.join(rootDir, 'public', 'icons');
  const publicDir = path.join(rootDir, 'public');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const svgBuffer = fs.readFileSync(svgPath);

  const targets = [
    // public/icons/
    { path: path.join(iconsDir, 'icon-192.png'), size: 192 },
    { path: path.join(iconsDir, 'icon-512.png'), size: 512 },
    { path: path.join(iconsDir, 'icon-192x192.png'), size: 192 },
    { path: path.join(iconsDir, 'icon-512x512.png'), size: 512 },
    { path: path.join(iconsDir, 'android-chrome-192x192.png'), size: 192 },
    { path: path.join(iconsDir, 'android-chrome-512x512.png'), size: 512 },
    { path: path.join(iconsDir, 'icon-maskable-192.png'), size: 192 },
    { path: path.join(iconsDir, 'icon-maskable-512.png'), size: 512 },
    { path: path.join(iconsDir, 'apple-touch-icon.png'), size: 180 },
    { path: path.join(iconsDir, 'apple-touch-icon-180x180.png'), size: 180 },

    // public/ (root aliases)
    { path: path.join(publicDir, 'apple-touch-icon.png'), size: 180 },
    { path: path.join(publicDir, 'apple-touch-icon-precomposed.png'), size: 180 },
    { path: path.join(publicDir, 'icon-192.png'), size: 192 },
    { path: path.join(publicDir, 'icon-512.png'), size: 512 },
    { path: path.join(publicDir, 'icon-192x192.png'), size: 192 },
    { path: path.join(publicDir, 'icon-512x512.png'), size: 512 },
    { path: path.join(publicDir, 'android-chrome-192x192.png'), size: 192 },
    { path: path.join(publicDir, 'android-chrome-512x512.png'), size: 512 },
  ];

  for (const t of targets) {
    await sharp(svgBuffer)
      .resize(t.size, t.size, { fit: 'contain' })
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(t.path);

    const stats = fs.statSync(t.path);
    console.log(`Generated: ${path.relative(rootDir, t.path)} (${t.size}x${t.size}, ${stats.size} bytes)`);
  }

  console.log('All PWA icons generated successfully.');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
