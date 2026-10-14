import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt';
import { AuthInitializer } from '@/components/auth/AuthInitializer';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import './globals.css';

const serifFont = Playfair_Display({
  variable: '--font-serif',
  subsets: ['latin'],
  display: 'swap',
});

const sansFont = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Recetario Inteligente | Gestión Gastronómica & Nutricional',
  description:
    'Estandarización culinaria, ingesta multicanal de recetas y análisis nutricional clínico impulsado por IA multimodal.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Recetario',
    startupImage: '/icons/apple-touch-icon.png',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#faf7f2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${serifFont.variable} ${sansFont.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Recetario" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#faf7f2" />
      </head>
      <body className="min-h-screen bg-[#faf7f2] text-stone-900 font-sans antialiased selection:bg-amber-200 selection:text-amber-950 pb-20 md:pb-0">
        <ServiceWorkerRegister />
        <PwaInstallPrompt />
        <AuthInitializer />
        {children}
        <BottomNavigation />
      </body>
    </html>
  );
}
