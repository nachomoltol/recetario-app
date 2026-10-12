'use client';

import { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare, Sparkles, ChefHat } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Verificar si ya está corriendo en modo standalone (instalada)
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (checkStandalone) {
      setIsStandalone(true);
      return;
    }

    // 2. Verificar si el usuario ya descartó el aviso recientemente (últimas 24 horas)
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed_at');
    if (dismissedAt) {
      const hoursSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        return;
      }
    }

    // 3. Detectar iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);

    if (isIosDevice) {
      setIsIOS(true);
      // Retrasar 1.5s para no interferir con la carga inicial
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }

    // 4. Interceptar evento nativo beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Mostrar banner flotante elegante
      setIsOpen(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Si ya se instaló mientras la app está abierta
    const handleAppInstalled = () => {
      setIsOpen(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Disparar prompt nativo del navegador
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsOpen(false);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem('pwa_prompt_dismissed_at', Date.now().toString());
  };

  if (isStandalone || !isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-fade-in">
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#e7dfd5] shadow-2xl shadow-stone-900/15 space-y-4 relative">
        {/* Botón de cerrar */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#f4efe6] text-stone-500 hover:text-stone-900 flex items-center justify-center transition cursor-pointer"
          title="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cabecera del aviso */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] flex items-center justify-center shrink-0 shadow-2xs">
            <ChefHat className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#a86224] flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Aplicación PWA
            </span>
            <h3 className="text-base font-bold text-stone-900 font-serif-recipe leading-snug">
              Instala Recetario Inteligente
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed font-light">
              Modo Cocina offline, acceso rápido en tu pantalla de inicio e integración con el menú
              Compartir de TikTok y YouTube.
            </p>
          </div>
        </div>

        {/* Guía visual específica para iOS */}
        {showIOSGuide && (
          <div className="p-3.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-2 text-xs text-stone-700 animate-fade-in">
            <p className="font-semibold text-stone-900">Pasos para instalar en iOS Safari:</p>
            <ol className="space-y-1.5 list-decimal list-inside text-stone-600">
              <li className="flex items-center gap-1.5">
                <span>1. Toca el botón</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-[#e7dfd5] font-semibold text-stone-800">
                  <Share2 className="w-3.5 h-3.5 text-[#a86224] mr-1" /> Compartir
                </span>
                <span>en Safari.</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span>2. Selecciona</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-[#e7dfd5] font-semibold text-stone-800">
                  <PlusSquare className="w-3.5 h-3.5 text-[#a86224] mr-1" /> Añadir a pantalla de inicio
                </span>
              </li>
            </ol>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex-1 min-h-[46px] py-2.5 px-4 rounded-2xl font-semibold text-xs sm:text-sm text-white bg-[#a86224] hover:bg-[#8e511c] transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isIOS ? 'Ver cómo instalar' : 'Instalar en mi móvil'}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="min-h-[46px] px-4 py-2.5 rounded-2xl text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-[#f4efe6] transition cursor-pointer"
          >
            <span>Ahora no</span>
          </button>
        </div>
      </div>
    </div>
  );
}
