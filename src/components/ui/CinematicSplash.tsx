'use client';

import React, { useState, useEffect, useCallback } from 'react';

/**
 * Componente CinematicSplash para Miga.
 * Bienvenida gastronómica estilo Netflix/Disney+:
 * - Capa fija en pantalla completa (`#FAF8F5`).
 * - Logo con zoom suave y destello (shimmer) dorado/ámbar.
 * - Tipografía editorial con animación fluida.
 * - Efecto sonoro de crujido crujiente (`/sounds/miga-crunch.mp3`, vol: 0.55).
 * - Se ejecuta solo la primera vez por sesión (`sessionStorage`).
 * - Temporizadores incondicionales: fade-out a los 1200ms, desmontaje definitivo a los 1500ms.
 * - Descarte manual inmediato por pulsación en pantalla (`onClick={dismissSplash}`).
 */
export function CinematicSplash() {
  const [isMounted, setIsMounted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // 1. Verificación inicial de sesión: solo se activa si no se ha mostrado en la sesión
  useEffect(() => {
    try {
      if (sessionStorage.getItem('miga_splash_shown')) {
        return;
      }
      setIsMounted(true);
    } catch {
      setIsMounted(true);
    }
  }, []);

  // 2. Temporizadores dedicados e incondicionales para fade out y desmontaje
  useEffect(() => {
    if (!isMounted) return;

    // Timer 1: Iniciar fade out a los 1200ms
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 1200);

    // Timer 2: Desmontar del DOM incondicionalmente a los 1500ms
    const unmountTimer = setTimeout(() => {
      setIsMounted(false);
      try {
        sessionStorage.setItem('miga_splash_shown', 'true');
      } catch {}
    }, 1500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, [isMounted]);

  // 3. Audio gastronómico completamente aislado en su propio useEffect
  useEffect(() => {
    if (!isMounted) return;

    try {
      const audio = new Audio('/sounds/miga-crunch.mp3');
      audio.volume = 0.55;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Políticas de autoplay del navegador gestionadas silenciosamente
        });
      }
    } catch {
      // Fallo de audio aislado sin afectar temporizadores
    }
  }, [isMounted]);

  const dismissSplash = useCallback(() => {
    setIsFadingOut(true);
    setIsMounted(false);
    try {
      sessionStorage.setItem('miga_splash_shown', 'true');
    } catch {}
  }, []);

  if (!isMounted) return null;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      onClick={dismissSplash}
      className={`fixed inset-0 z-[9999] bg-[#FAF8F5] flex flex-col items-center justify-center select-none cursor-pointer transition-opacity duration-300 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      <style>{`
        @keyframes cinematicZoomIn {
          0% {
            opacity: 0;
            transform: scale(0.92);
          }
          40% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes shimmerSweep {
          0% {
            transform: translateX(-150%) skewX(-20deg);
          }
          60%, 100% {
            transform: translateX(200%) skewX(-20deg);
          }
        }

        @keyframes editorialFadeIn {
          0%, 25% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-cinematic-zoom {
          animation: cinematicZoomIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-shimmer-sweep {
          animation: shimmerSweep 1s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards;
        }

        .animate-editorial-fade {
          animation: editorialFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards;
        }
      `}</style>

      {/* Halo cálido de fondo estilo proyector */}
      <div className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-amber-400/15 via-[#c27835]/10 to-transparent blur-3xl pointer-events-none -translate-y-4" />

      {/* Contenedor central animado */}
      <div className="relative flex flex-col items-center animate-cinematic-zoom">
        {/* Contenedor del Logo con Shimmer dorado/ámbar */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden shadow-2xl p-1 bg-white border border-[#e7dfd5]/80 flex items-center justify-center">
          <img
            src="/apple-touch-icon.png"
            alt="Miga"
            className="w-full h-full object-cover rounded-2xl"
          />

          {/* Destello Shimmer dorado / ámbar que recorre el icono */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/50 to-transparent -translate-x-full animate-shimmer-sweep pointer-events-none" />
        </div>

        {/* Tipografía editorial cinemática */}
        <div className="mt-6 text-center space-y-1.5 animate-editorial-fade">
          <h1 className="text-4xl sm:text-5xl font-extrabold font-serif-recipe tracking-tight text-stone-900">
            Miga
          </h1>
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.24em] text-[#a86224]">
            Guarda tus recetas de redes
          </p>
        </div>
      </div>
    </div>
  );
}
