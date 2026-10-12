'use client';

import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Sparkles,
  Link as LinkIcon,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Radio,
  Share2,
  Smartphone,
} from 'lucide-react';
import { ingestRecipeAction } from '@/app/actions/recipeIngest';
import { IosShortcutTutorialModal } from '@/components/pwa/IosShortcutTutorialModal';

interface LoadingStage {
  seconds: number;
  title: string;
  description: string;
  percent: number;
}

const CULINARY_HUMOR_PHRASES = [
  'Yendo a por papel y boli...',
  'Lavándome las manos...',
  'Poniéndome el delantal...',
  'Afilando los cuchillos...',
  'Probando el punto de sal...',
  'Precalentando los fogones...',
  'Buscando la especia perdida...',
  'Pelando las cebollas sin llorar...',
  'Decodificando la salsa secreta del chef...',
  'Estandarizando gramos y mililitros...',
  'Emplatando la receta digitalmente...',
  'Dando el toque maestro del chef...',
];

const LOADING_STAGES: LoadingStage[] = [
  {
    seconds: 0,
    title: 'Conectando con la plataforma',
    description: 'Verificando enlace y resolviendo redirecciones de TikTok, Reels o YouTube...',
    percent: 15,
  },
  {
    seconds: 4,
    title: 'Descargando y optimizando metraje',
    description: 'Extrayendo pista de audio, fotogramas clave y caption original del post...',
    percent: 38,
  },
  {
    seconds: 10,
    title: 'Analizando con Gemini 3.1 Flash',
    description: 'Inferencia multimodal activa: decodificando técnicas culinarias y speech acelerado...',
    percent: 65,
  },
  {
    seconds: 18,
    title: 'Estructurando pasos y deduciendo medidas',
    description: 'Rellenando vacíos narrativos con acciones visuales y estandarizando ingredientes...',
    percent: 85,
  },
  {
    seconds: 26,
    title: 'Finalizando estandarización y macros',
    description: 'Generando categorización doble (gastronómica + momento de consumo) y guardando...',
    percent: 96,
  },
];

export function RecipeCaptureCard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialUrl = searchParams.get('captureUrl') || '';
  const initialText = searchParams.get('captureText') || '';
  const autoStart = searchParams.get('autoStart') === '1';

  const [mode, setMode] = useState<'url' | 'texto'>(initialText && !initialUrl ? 'texto' : 'url');
  const [url, setUrl] = useState(initialUrl);
  const [texto, setTexto] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdRecetaId, setCreatedRecetaId] = useState<string | null>(null);
  const [showIosTutorial, setShowIosTutorial] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Estados de carga progresiva
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const hasAutoStarted = useRef(false);

  // Temporizador activo durante el proceso de extracción
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPending) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPending]);

  // Ejecutor centralizado de ingesta
  const executeIngest = useCallback(
    (targetMode: 'url' | 'texto', targetValue: string) => {
      setError(null);
      setSuccess(null);
      setCreatedRecetaId(null);

      const formData = new FormData();
      if (targetMode === 'url') {
        if (!targetValue.trim()) {
          setError('Por favor, introduce un enlace de receta válido.');
          return;
        }
        formData.set('url', targetValue.trim());
      } else {
        if (!targetValue.trim()) {
          setError('Por favor, introduce el texto con la receta.');
          return;
        }
        formData.set('texto', targetValue.trim());
      }

      startTransition(async () => {
        const res = await ingestRecipeAction(formData);
        if (res.error) {
          setError(res.error);
        } else if (res.success) {
          setSuccess('¡Receta extraída, estandarizada y guardada en tu recetario!');
          setCreatedRecetaId(res.recetaId || null);
          setUrl('');
          setTexto('');
          router.refresh();
          // Desplazar suavemente a la previsualización de la última receta en el dashboard (sin abrirla a pantalla completa)
          const tryScrollToNewRecipe = (attempts = 0) => {
            const el = document.getElementById('ultima-receta');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (attempts < 12) {
              setTimeout(() => tryScrollToNewRecipe(attempts + 1), 250);
            }
          };
          setTimeout(() => tryScrollToNewRecipe(), 350);
        }
      });
    },
    [router]
  );

  // Soporte nativo para Web Share Target: disparo automático al recibir enlace
  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
      setMode('url');
    } else if (initialText) {
      setTexto(initialText);
      setMode('texto');
    }

    if (autoStart && initialUrl && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      // Limpiar query params de la URL visual para evitar re-ejecuciones al recargar
      if (typeof window !== 'undefined') {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('autoStart');
        cleanUrl.searchParams.delete('captureUrl');
        cleanUrl.searchParams.delete('captureText');
        window.history.replaceState({}, '', cleanUrl.pathname);
      }
      executeIngest('url', initialUrl);
    }
  }, [initialUrl, initialText, autoStart, executeIngest]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeIngest(mode, mode === 'url' ? url : texto);
  };

  // Calcular etapa actual según segundos transcurridos
  const currentStage =
    [...LOADING_STAGES].reverse().find((s) => elapsedSeconds >= s.seconds) || LOADING_STAGES[0];
  const stageIndex = LOADING_STAGES.findIndex((s) => s.seconds === currentStage.seconds);

  // Calcular frase rotativa con humor culinario (rota cada 2.5 - 3 segundos)
  const humorIndex = Math.floor(elapsedSeconds / 3) % CULINARY_HUMOR_PHRASES.length;
  const currentHumorPhrase = CULINARY_HUMOR_PHRASES[humorIndex];

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shrink-0 shadow-2xs">
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
            disabled={isPending}
            onClick={() => {
              setMode('url');
              setError(null);
            }}
            className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
              mode === 'url'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            } disabled:opacity-50`}
          >
            <LinkIcon className="w-4 h-4 text-[#a86224]" />
            <span>Enlace</span>
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setMode('texto');
              setError(null);
            }}
            className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
              mode === 'texto'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            } disabled:opacity-50`}
          >
            <FileText className="w-4 h-4 text-[#a86224]" />
            <span>Texto</span>
          </button>
        </div>
      </div>

      {/* Aviso de captura nativa Web Share Target */}
      {autoStart && (
        <div className="p-4 rounded-2xl bg-[#f4efe6] border border-[#c27835]/40 text-stone-800 text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#a86224] shrink-0 shadow-2xs">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-stone-900">Enlace recibido desde el menú Compartir</p>
            <p className="text-xs text-stone-600">
              Iniciando automáticamente la extracción multimodal en segundo plano...
            </p>
          </div>
        </div>
      )}

      {/* Panel de Carga Progresiva Dinámica para procesos largos */}
      {isPending && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-4 animate-fade-in shadow-2xs">
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#a86224] font-semibold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a86224] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#a86224]"></span>
              </span>
              <span className="uppercase tracking-wider">
                Fase {stageIndex + 1} de {LOADING_STAGES.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-stone-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#a86224]" />
              <span>{elapsedSeconds}s transcurridos</span>
            </div>
          </div>

          {/* Barra de progreso animada */}
          <div className="w-full h-2.5 rounded-full bg-[#e7dfd5] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#c27835] to-[#a86224] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(currentStage.percent + (elapsedSeconds % 3) * 2, 98)}%` }}
            />
          </div>

          {/* Mensaje descriptivo dinámico con humor culinario */}
          <div className="space-y-1">
            <h4 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#a86224] animate-pulse" />
              {currentHumorPhrase}
            </h4>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light">
              {currentStage.description}
            </p>
          </div>

          {/* Aviso informativo para vídeos largos de YouTube */}
          {elapsedSeconds >= 12 && (
            <div className="p-3 rounded-xl bg-white border border-[#e7dfd5] text-[11px] sm:text-xs text-stone-600 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#a86224] shrink-0 mt-0.5" />
              <span>
                Los vídeos largos de YouTube y recetas complejas requieren entre 15 y 30 segundos
                mientras la IA visualiza el metraje y estructura los pasos. Por favor, mantén la app
                abierta.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Feedback de error */}
      {error && !isPending && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-red-900">Aviso de extracción</p>
            <p className="text-red-700 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Feedback de éxito */}
      {success && !isPending && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-950">{success}</p>
              <p className="text-xs text-emerald-800">
                La receta se ha guardado en tu recetario y está disponible abajo en la vista previa.
              </p>
            </div>
          </div>
          {createdRecetaId && (
            <button
              type="button"
              onClick={() => router.push(`/recipes/${createdRecetaId}`)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition cursor-pointer self-start sm:self-auto shrink-0 flex items-center gap-1.5 shadow-2xs"
            >
              <span>Abrir ahora</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
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
              className="w-full min-h-[52px] pl-4 pr-12 py-3 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition shadow-2xs disabled:opacity-60"
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
            className="w-full p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition resize-none shadow-2xs disabled:opacity-60"
          />
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full min-h-[54px] py-3.5 px-6 rounded-2xl font-semibold text-sm sm:text-base text-white bg-[#a86224] hover:bg-[#8e511c] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 shadow-sm shadow-[#a86224]/20 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white shrink-0" />
              <span className="truncate">
                {currentHumorPhrase} ({elapsedSeconds}s)
              </span>
            </>
          ) : (
            <>
              <span>Procesar la receta</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-[#f4efe6] text-xs">
        <span className="text-stone-500 text-[11px] sm:text-xs">
          💡 En <strong>Android</strong> comparte directo desde TikTok, Reels o YouTube hacia Recetario
        </span>
        <button
          type="button"
          onClick={() => setShowIosTutorial(true)}
          className="text-[#a86224] hover:text-[#8e511c] font-semibold text-[11px] sm:text-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto hover:underline"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>¿En iPhone? Activar menú Compartir (Atajo iOS)</span>
        </button>
      </div>

      <IosShortcutTutorialModal
        isOpen={showIosTutorial}
        onClose={() => setShowIosTutorial(false)}
      />
    </div>
  );
}
