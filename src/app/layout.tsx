import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { AuthInitializer } from '@/components/auth/AuthInitializer';
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
    statusBarStyle: 'black-translucent',
    title: 'Recetario',
  },
};

export const viewport: Viewport = {
  themeColor: '#0c0d12',
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
    <html lang="es" className={`${serifFont.variable} ${sansFont.variable} dark`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen bg-charcoal-950 text-stone-100 font-sans antialiased selection:bg-amber-600/30 selection:text-amber-200">
        <ServiceWorkerRegister />
        <AuthInitializer />
        {children}
      </body>
    </html>
  );
}
