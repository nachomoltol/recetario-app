'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const SESSION_ACTIVE_KEY = 'miga_session_active';

/**
 * AppLifecycleProvider:
 * Garantiza que al abrir o reiniciar la app (móvil PWA o Capacitor Android/iOS) tras haber sido cerrada,
 * la navegación se inicie SIEMPRE en la página de inicio ('/'), en lugar de restaurar una subpágina
 * previa (ej: dentro de una receta o en perfil).
 * Durante la sesión activa, permite la navegación interna normal gracias al flag en sessionStorage.
 */
export function AppLifecycleProvider() {
  const router = useRouter();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || initializedRef.current) return;
    initializedRef.current = true;

    try {
      const isSessionActive = sessionStorage.getItem(SESSION_ACTIVE_KEY);
      const currentPath = window.location.pathname;
      const search = window.location.search;
      const params = new URLSearchParams(search);

      // Excepciones donde NO se debe redirigir: flujos de OAuth/Auth, recuperación de contraseña, share target y pagos Stripe
      const isSpecialRoute =
        currentPath.startsWith('/auth') ||
        currentPath === '/update-password' ||
        currentPath === '/share-target';

      const hasSpecialParams =
        params.has('code') ||
        params.has('token_hash') ||
        params.has('type') ||
        params.has('session_id') ||
        params.has('canceled');

      if (!isSessionActive) {
        // Marcamos la sesión como activa para permitir la navegación interna normal mientras la app esté abierta
        sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');

        if (!isSpecialRoute && !hasSpecialParams) {
          // Si al iniciar la app se abre en una página secundaria (ej: /recipes/[id] o /profile),
          // redirigir de inmediato a la ruta raíz ('/')
          if (currentPath !== '/' && currentPath !== '/recipes') {
            router.replace('/');
          }
        }
      }
    } catch (err) {
      console.warn('[AppLifecycleProvider] Error al comprobar el estado de sesión:', err);
    }
  }, [router]);

  return null;
}
