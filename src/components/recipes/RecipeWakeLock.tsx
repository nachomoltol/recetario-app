'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Sparkles, Eye, EyeOff } from 'lucide-react';

export function RecipeWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  // Comprobar soporte y preferencia al montar
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'wakeLock' in navigator;
    setIsSupported(supported);

    const storedPref = localStorage.getItem('recetario_wake_lock_enabled');
    // Por defecto está activo a menos que el usuario lo haya desactivado expresamente
    const active = storedPref !== 'false';
    setIsEnabled(active);
  }, []);

  const requestLock = useCallback(async () => {
    if (!isSupported || !isEnabled || typeof window === 'undefined') return;

    try {
      if (sentinelRef.current && !sentinelRef.current.released) {
        return;
      }
      const sentinel = await navigator.wakeLock.request('screen');
      sentinelRef.current = sentinel;
      setIsLocked(true);

      sentinel.addEventListener('release', () => {
        setIsLocked(false);
      });
    } catch (err) {
      // Los navegadores rechazan wakeLock si la pestaña está en segundo plano o batería muy baja
      console.warn('Wake Lock no concedido:', err);
      setIsLocked(false);
    }
  }, [isSupported, isEnabled]);

  const releaseLock = useCallback(async () => {
    if (sentinelRef.current && !sentinelRef.current.released) {
      try {
        await sentinelRef.current.release();
      } catch (e) {
        console.warn('Error liberando wake lock:', e);
      }
    }
    sentinelRef.current = null;
    setIsLocked(false);
  }, []);

  // Adquisición reactiva
  useEffect(() => {
    if (isSupported && isEnabled) {
      requestLock();
    } else {
      releaseLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isEnabled && isSupported) {
        requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseLock();
    };
  }, [isSupported, isEnabled, requestLock, releaseLock]);

  // Si el navegador no lo soporta, no renderizamos nada molesto
  if (!isSupported) {
    return null;
  }

  const toggleManualWakeLock = () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('recetario_wake_lock_enabled', String(nextState));
    }
  };

  return (
    <button
      type="button"
      onClick={toggleManualWakeLock}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-2xs cursor-pointer border ${
        isLocked
          ? 'bg-amber-50 text-[#a86224] border-amber-200 hover:bg-amber-100/70'
          : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200/60'
      }`}
      title={
        isLocked
          ? 'Modo Manos en la Masa: Tu pantalla no se apagará mientras cocinas. Pulsa para pausar.'
          : 'Modo Manos en la Masa pausado. Pulsa para mantener la pantalla siempre activa.'
      }
    >
      <span
        className={`w-2 h-2 rounded-full transition-colors ${
          isLocked ? 'bg-amber-500 animate-pulse' : 'bg-stone-400'
        }`}
      />
      <span className="hidden sm:inline">
        {isLocked ? 'Manos en la Masa (Pantalla encendida)' : 'Pantalla normal'}
      </span>
      <span className="sm:hidden">
        {isLocked ? 'Pantalla activa' : 'Normal'}
      </span>
      {isLocked ? (
        <Eye className="w-3.5 h-3.5 opacity-80" />
      ) : (
        <EyeOff className="w-3.5 h-3.5 opacity-70" />
      )}
    </button>
  );
}
