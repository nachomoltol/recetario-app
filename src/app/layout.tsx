import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt';
import { AuthInitializer } from '@/components/auth/AuthInitializer';
import { AppLifecycleProvider } from '@/components/layout/AppLifecycleProvider';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { CinematicSplash } from '@/components/ui/CinematicSplash';
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
  title: 'Miga | Recetas de Redes & Gestión Culinaria',
  description:
    'Captura recetas desde cualquier red social, imagen o texto libre, y dales tu toque personal con IA multimodal.',
  manifest: '/manifest.json?v=2',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Miga',
    startupImage: '/apple-touch-icon.png?v=2',
  },
  icons: {
    icon: [
      { url: '/miga-logo.svg?v=2', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png?v=2', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.png?v=2', sizes: '64x64', type: 'image/png' },
      { url: '/favicon.ico?v=2' },
    ],
    shortcut: '/favicon.ico?v=2',
    apple: '/apple-touch-icon.png?v=2',
  },
};

export const viewport: Viewport = {
  themeColor: '#faf7f2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="terracota" className={`${serifFont.variable} ${sansFont.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('miga_theme')||'terracota';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
        <link rel="manifest" href="/manifest.json?v=2" />
        <link rel="icon" type="image/svg+xml" href="/miga-logo.svg?v=2" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png?v=2" />
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png?v=2" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Miga" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#faf7f2" />
      </head>
      <body className="min-h-screen bg-[#faf7f2] text-stone-900 font-sans antialiased selection:bg-amber-200 selection:text-amber-950 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <CinematicSplash />
        <AppLifecycleProvider />
        <ServiceWorkerRegister />
        <PwaInstallPrompt />
        <AuthInitializer />
        {children}
        <BottomNavigation />
      </body>
    </html>
  );
}
