'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, RotateCcw, ArrowLeft } from 'lucide-react';

export default function RecipeDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('CRASH DETECTADO EN RECIPE DETAIL:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-2xl w-full bg-white rounded-3xl border-2 border-rose-200 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3 text-rose-600">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900">
              Error al visualizar la receta
            </h1>
            <p className="text-xs sm:text-sm text-stone-500">
              El componente ha capturado una excepción en tiempo de ejecución.
            </p>
          </div>
        </div>

        {/* Diagnóstico técnico exacto */}
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
              Digest ID:
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
            href="/recipes"
            className="min-h-[44px] px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al recetario</span>
          </Link>

          <button
            type="button"
            onClick={() => reset()}
            className="min-h-[44px] px-5 rounded-xl bg-[#a86224] hover:bg-[#8e511c] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reintentar carga</span>
          </button>
        </div>
      </div>
    </div>
  );
}
