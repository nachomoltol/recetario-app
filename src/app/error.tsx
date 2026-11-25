'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home, Wifi } from 'lucide-react';

function isTransientNetworkOrWebKitError(err?: Error | null): boolean {
  const msg = (err?.message || '').toLowerCase();
  const name = (err?.name || '').toLowerCase();
  if (!msg && !name) return false;

  return (
    msg.includes('load failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('the network connection was lost') ||
    msg.includes('cancelled') ||
    msg.includes('canceled') ||
    msg.includes('aborted') ||
    msg.includes('chunkloaderror') ||
    msg.includes('loading chunk') ||
    name.includes('chunkloaderror')
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isTransient = useMemo(() => isTransientNetworkOrWebKitError(error), [error]);

  useEffect(() => {
    if (isTransient) {
      console.warn('[GlobalError] Microcorte transitorio de red detectado (iOS/WebKit):', error?.message);
      try {
        const key = 'miga_last_transient_autorecover';
        const lastRecover = Number(sessionStorage.getItem(key) || '0');
        const now = Date.now();
        // Auto-recuperar de inmediato si no se ha reintentado en los últimos 4 segundos
        if (now - lastRecover > 4000) {
          sessionStorage.setItem(key, String(now));
          const timer = window.setTimeout(() => {
            reset();
          }, 120);
          return () => window.clearTimeout(timer);
        }
      } catch {
        const timer = window.setTimeout(() => {
          reset();
        }, 120);
        return () => window.clearTimeout(timer);
      }
      return;
    }

    console.error('GLOBAL APPLICATION CRASH:', error);
  }, [error, isTransient, reset]);

  if (isTransient) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#e7dfd5] p-6 sm:p-7 shadow-xl space-y-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center mx-auto text-brand-primary">
            <Wifi className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg sm:text-xl font-bold font-serif-recipe text-stone-900">
              Reconectando con Miga
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              La conexión se pausó un instante al cambiar de pantalla o abrir una ventana del móvil. Pulsa continuar para seguir donde estabas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Continuar</span>
            </button>

            <Link
              href="/recipes"
              className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl bg-[#f4efe6] hover:bg-[#e7dfd5] text-stone-800 font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition"
            >
              <Home className="w-4 h-4" />
              <span>Volver a Recetas</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-2xl w-full bg-white rounded-3xl border-2 border-rose-200 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3 text-rose-600">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900">
              Error Inesperado en la Aplicación
            </h1>
            <p className="text-xs sm:text-sm text-stone-500">
              Se ha interceptado una excepción en tiempo de ejecución.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-rose-700">
            Mensaje del Error:
          </label>
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 font-mono text-xs sm:text-sm break-words">
            {error?.message || 'Error desconocido'}
          </div>
        </div>

        {error?.digest && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Digest:
            </label>
            <div className="font-mono text-xs text-stone-600">{error.digest}</div>
          </div>
        )}

        {error?.stack && (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Stack Trace Técnico:
            </label>
            <pre className="p-4 rounded-2xl bg-stone-900 text-rose-300 font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed">
              {error.stack}
            </pre>
          </div>
        )}

        <div className="pt-4 border-t border-[#e7dfd5] flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="min-h-[44px] px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition"
          >
            <Home className="w-4 h-4" />
            <span>Ir a Inicio</span>
          </Link>

          <button
            type="button"
            onClick={() => reset()}
            className="min-h-[44px] px-5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
