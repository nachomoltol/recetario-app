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
        setError('Por favor, introduce un enlace de receta válido.');
        return;
      }
      formData.set('url', url.trim());
    } else {
      if (!texto.trim()) {
        setError('Por favor, introduce el texto con la receta.');
        return;
      }
      formData.set('texto', texto.trim());
    }

    startTransition(async () => {
      const res = await ingestRecipeAction(formData);
      if (res.error) {
        setError(res.error);
      } else if (res.success) {
        setSuccess('¡Receta extraída y estandarizada en tu recetario!');
        setUrl('');
        setTexto('');
        router.replace('/recipes');
        router.refresh();
      }
    });
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900 tracking-tight">
              Captura Rápida de Recetas
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Pega enlaces de TikTok, Instagram Reels, YouTube o notas
            </p>
          </div>
        </div>

        {/* Selector de modo Mobile-First con touch targets amplios */}
        <div className="flex items-center bg-[#f4efe6] p-1.5 rounded-2xl border border-[#e7dfd5] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
              mode === 'url'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <LinkIcon className="w-4 h-4 text-[#a86224]" />
            <span>Enlace</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('texto')}
            className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
              mode === 'texto'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-4 h-4 text-[#a86224]" />
            <span>Texto</span>
          </button>
        </div>
      </div>

      {/* Aviso de captura nativa Web Share Target */}
      {initialUrl && (
        <div className="p-4 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-stone-700 text-xs sm:text-sm flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-[#a86224] shrink-0" />
          <span>Enlace recibido directamente desde el menú Compartir de tu móvil.</span>
        </div>
      )}

      {/* Feedback de error */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Feedback de éxito */}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
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
              placeholder="https://vm.tiktok.com/... o enlace de YouTube / Reels"
              disabled={isPending}
              className="w-full min-h-[52px] pl-4 pr-12 py-3 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition shadow-2xs"
            />
            <LinkIcon className="w-5 h-5 text-stone-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        ) : (
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder="Pega aquí los ingredientes o la preparación de la receta..."
            disabled={isPending}
            className="w-full p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition resize-none shadow-2xs"
          />
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl font-semibold text-sm sm:text-base text-white bg-[#a86224] hover:bg-[#8e511c] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 shadow-sm shadow-[#a86224]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>Analizando y extrayendo con Gemini...</span>
            </>
          ) : (
            <>
              <span>Procesar Receta con IA</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
