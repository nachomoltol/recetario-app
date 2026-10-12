const urls = [
  'http://localhost:3012/manifest.json',
  'http://localhost:3012/icons/icon-192.png',
  'http://localhost:3012/icons/icon-512.png',
  'http://localhost:3012/icons/android-chrome-192x192.png',
  'http://localhost:3012/icons/android-chrome-512x512.png',
  'http://localhost:3012/icons/icon-192x192.png',
  'http://localhost:3012/icons/icon-512x512.png',
  'http://localhost:3012/icons/icon-maskable-192.png',
  'http://localhost:3012/icons/icon-maskable-512.png',
  'http://localhost:3012/icons/apple-touch-icon.png',
  'http://localhost:3012/apple-touch-icon.png',
  'http://localhost:3012/favicon.png'
];

async function check() {
  for (const url of urls) {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type');
    const contentLength = res.headers.get('content-length');
    console.log(`${res.status} ${res.statusText} -> ${url} [${contentType}, ${contentLength} bytes]`);
    if (res.status !== 200) {
      throw new Error(`Failed with status ${res.status} on ${url}`);
    }
  }
  console.log('ALL ICONS RETURNED STATUS 200 OK!');
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
