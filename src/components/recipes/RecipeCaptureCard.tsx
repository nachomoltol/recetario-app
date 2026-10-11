'use client';

import { useState, useTransition, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sparkles, Link as LinkIcon, FileText, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ingestRecipeAction } from '@/app/actions/recipeIngest';

export function RecipeCaptureCard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialUrl = searchParams.get('captureUrl') || '';
  const initialText = searchParams.get('captureText') || '';

  const [mode, setMode] = useState<'url' | 'texto'>(initialText && !initialUrl ? 'texto' : 'url');
  const [url, setUrl] = useState(initialUrl);
  const [texto, setTexto] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
      setMode('url');
    } else if (initialText) {
      setTexto(initialText);
      setMode('texto');
    }
  }, [initialUrl, initialText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    if (mode === 'url') {
      if (!url.trim()) {
        setError('Por favor introduce un enlace válido.');
        return;
      }
      formData.set('url', url.trim());
    } else {
      if (!texto.trim()) {
        setError('Por favor introduce la descripción o ingredientes de la receta.');
        return;
      }
      formData.set('texto', texto.trim());
    }

    startTransition(async () => {
      const res = await ingestRecipeAction(formData);
      if (res.error) {
        setError(res.error);
      } else if (res.success) {
        setSuccess('¡Receta analizada, estandarizada y guardada con éxito en tu recetario!');
        setUrl('');
        setTexto('');
        // Limpiar query params de la URL
        router.replace('/recipes');
        router.refresh();
      }
    });
  };

  return (
    <div className="p-6 rounded-3xl bg-charcoal-900 border border-charcoal-700/80 shadow-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-serif-recipe text-stone-100">
              Captura Inteligente con IA
            </h2>
            <p className="text-xs text-stone-400">
              Ingesta multicanal (TikTok, Instagram Reels, YouTube o texto) vía Gemini Flash
            </p>
          </div>
        </div>

        {/* Selector de modo */}
        <div className="flex items-center bg-charcoal-950 p-1 rounded-xl border border-charcoal-800">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              mode === 'url'
                ? 'bg-amber-400 text-stone-950 font-semibold shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" /> Enlace
          </button>
          <button
            type="button"
            onClick={() => setMode('texto')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              mode === 'texto'
                ? 'bg-amber-400 text-stone-950 font-semibold shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Texto / Notas
          </button>
        </div>
      </div>

      {/* Alerta de notificación si vino de Web Share Target */}
      {initialUrl && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Enlace capturado nativamente desde el menú Compartir de tu móvil.</span>
        </div>
      )}

      {/* Feedback de error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Feedback de éxito */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'url' ? (
          <div className="relative">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Pega un enlace de TikTok, Instagram Reel o YouTube..."
              disabled={isPending}
              className="w-full pl-4 pr-10 py-3 rounded-xl bg-charcoal-950 border border-charcoal-700 text-stone-100 placeholder-stone-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/80 transition"
            />
            <LinkIcon className="w-4 h-4 text-stone-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        ) : (
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder="Pega transcripciones de audio, notas de voz, ingredientes o instrucciones..."
            disabled={isPending}
            className="w-full p-4 rounded-xl bg-charcoal-950 border border-charcoal-700 text-stone-100 placeholder-stone-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/80 transition resize-none"
          />
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 px-4 rounded-xl font-medium text-sm text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
              <span>Extrayendo y perfilando con Gemini...</span>
            </>
          ) : (
            <>
              <span>Procesar Receta con IA</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
