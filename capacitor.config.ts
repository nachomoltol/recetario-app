import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.migaapp.app',
  appName: 'Miga',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: 'https://www.migaapp.com',
  },
};

export default config;
