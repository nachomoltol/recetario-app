'use client';

import { useState, useTransition, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Paperclip,
  X,
  Camera,
} from 'lucide-react';
import { ingestRecipeAction } from '@/app/actions/recipeIngest';
import { ProSubscriptionModal } from '@/components/subscription/ProSubscriptionModal';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface LoadingStage {
  seconds: number;
  title: string;
  description: string;
  percent: number;
}

const CULINARY_HUMOR_PHRASES_ES = [
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

const CULINARY_HUMOR_PHRASES_EN = [
  'Grabbing pen and paper...',
  'Washing my hands...',
  'Putting on the apron...',
  'Sharpening the knives...',
  'Tasting for salt balance...',
  'Preheating the stovetop...',
  'Searching for the secret spice...',
  'Chopping onions without crying...',
  "Decoding the chef's secret sauce...",
  'Standardizing grams and milliliters...',
  'Plating the recipe digitally...',
  "Adding the chef's master touch...",
];

const LOADING_STAGES_ES: LoadingStage[] = [
  {
    seconds: 0,
    title: 'Conectando con la plataforma',
    description: 'Verificando enlace y resolviendo redirecciones de TikTok, Reels o Facebook...',
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

const LOADING_STAGES_EN: LoadingStage[] = [
  {
    seconds: 0,
    title: 'Connecting to platform',
    description: 'Verifying link and resolving TikTok, Reels, or Facebook redirects...',
    percent: 15,
  },
  {
    seconds: 4,
    title: 'Downloading & optimizing footage',
    description: 'Extracting audio track, keyframes, and original post caption...',
    percent: 38,
  },
  {
    seconds: 10,
    title: 'Analyzing with Gemini 3.1 Flash',
    description: 'Active multimodal inference: decoding culinary techniques and fast speech...',
    percent: 65,
  },
  {
    seconds: 18,
    title: 'Structuring steps & inferring measures',
    description: 'Filling narrative gaps with visual cues and standardizing ingredients...',
    percent: 85,
  },
  {
    seconds: 26,
    title: 'Finalizing standardization & macros',
    description: 'Generating dual categorization and saving recipe...',
    percent: 96,
  },
];

export function RecipeCaptureCard() {
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showProModal, setShowProModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const captureCardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const scrolledOnceRef = useRef<string | null>(null);

  // Estados de carga progresiva
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const hasAutoStarted = useRef(false);

  // Previsualización ligera para miniaturas sin re-renders masivos ni fugas de memoria
  const filePreviewUrl = useMemo(() => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      return URL.createObjectURL(selectedFile);
    }
    return null;
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  // Manejador "Dumb Input": iOS convierte nativamente HEIC a JPEG por hardware al usar accept estricto
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    // Resetear valor nativo del input para permitir re-selección
    e.target.value = '';

    // Guardar el archivo nativo directamente en el estado sin procesamientos pesados en JS
    setSelectedFile(rawFile);
    setError(null);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

      // Bloquear cualquier foco en el input para evitar rebotes de scroll
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      urlInputRef.current?.blur();
      textInputRef.current?.blur();

      const formData = new FormData();
      formData.set('idioma', language);

      if (targetMode === 'url') {
        if (!targetValue.trim() && !selectedFile) {
          setError('Por favor, introduce un enlace o sube un archivo/imagen de la receta.');
          return;
        }
        if (targetValue.trim()) {
          formData.set('url', targetValue.trim());
        }
      } else {
        if (!targetValue.trim() && !selectedFile) {
          setError('Por favor, introduce el texto con la receta o sube un archivo/imagen.');
          return;
        }
        if (targetValue.trim()) {
          formData.set('texto', targetValue.trim());
        }
      }

      startTransition(async () => {
        try {
          if (selectedFile) {
            formData.set('archivo', selectedFile);
          }
          const res = await ingestRecipeAction(formData);
          if (res?.error) {
            if (res.error === 'PAYWALL_LIMIT_REACHED') {
              router.push('/billing?limit=reached');
              setError(null);
            } else {
              setError(res.error);
            }
          } else if (res?.success) {
            setSuccess(t('capture_success'));
            setCreatedRecetaId(res.recetaId || null);
            setUrl('');
            setTexto('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            // Disparar evento para que la sección de inicio salte a 'Última receta capturada'
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('home_recent_tab', 'capturada');
                window.dispatchEvent(
                  new CustomEvent('recipe-captured', { detail: { recetaId: res.recetaId } })
                );
              } catch {}
            }

            router.refresh();
          }
        } catch (e: any) {
          console.error('Error al procesar la receta:', e);
          setError(e?.message || 'Error desconocido al procesar');
        }
      });
    },
    [selectedFile, router]
  );

  // Desplazamiento suave al panel de captura si el componente se monta con un parámetro URL (texto/enlace compartido)
  useEffect(() => {
    if (initialUrl || initialText) {
      const timer = setTimeout(() => {
        captureCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [initialUrl, initialText]);

  // Arreglo del rebote: Desplazamiento suave de una sola vez hacia la nueva receta tras la captura (sin robos de foco ni rebotes)
  useEffect(() => {
    if (!createdRecetaId || scrolledOnceRef.current === createdRecetaId) return;
    scrolledOnceRef.current = createdRecetaId;

    // Bloquear explícitamente el foco en los inputs para evitar que el viewport rebote hacia arriba
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    urlInputRef.current?.blur();
    textInputRef.current?.blur();

    const timer = setTimeout(() => {
      const el =
        document.getElementById('ultima-receta') ||
        document.getElementById(`receta-${createdRecetaId}`) ||
        document.getElementById('capture-success-anchor');

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [createdRecetaId]);

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
  const loadingStages = language === 'en' ? LOADING_STAGES_EN : LOADING_STAGES_ES;
  const culinaryHumorPhrases =
    language === 'en' ? CULINARY_HUMOR_PHRASES_EN : CULINARY_HUMOR_PHRASES_ES;

  const currentStage =
    [...loadingStages].reverse().find((s) => elapsedSeconds >= s.seconds) || loadingStages[0];
  const stageIndex = loadingStages.findIndex((s) => s.seconds === currentStage.seconds);

  // Calcular frase rotativa con humor culinario (rota cada 2.5 - 3 segundos)
  const humorIndex = Math.floor(elapsedSeconds / 3) % culinaryHumorPhrases.length;
  const currentHumorPhrase = culinaryHumorPhrases[humorIndex];

  return (
    <div
      ref={captureCardRef}
      id="panel-captura"
      className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-6 scroll-mt-20"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shrink-0 shadow-2xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900 tracking-tight">
              {t('capture_card_title')}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              {t('capture_card_subtitle')}
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
            <span>{t('capture_tab_url')}</span>
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
            <span>{t('capture_tab_text')}</span>
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
            <p className="font-semibold text-stone-900">{t('capture_native_share_title')}</p>
            <p className="text-xs text-stone-600">
              {t('capture_native_share_desc')}
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
                {t('capture_phase_label')} {stageIndex + 1} {t('capture_of_label')} {loadingStages.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-stone-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#a86224]" />
              <span>{elapsedSeconds}{t('capture_elapsed_seconds')}</span>
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

          {/* Aviso informativo de espera para la IA */}
          <div className="p-3.5 rounded-xl bg-white border border-[#e7dfd5] text-xs text-stone-600 flex items-start gap-2.5 shadow-2xs">
            <Sparkles className="w-4 h-4 text-[#a86224] shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              {t('capture_loading_long_video')}
            </span>
          </div>
        </div>
      )}

      {/* Feedback de error */}
      {error && !isPending && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-red-900">{t('capture_extract_notice')}</p>
            <p className="text-red-700 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Feedback de éxito */}
      {success && !isPending && (
        <div id="capture-success-anchor" className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-950">{success}</p>
              <p className="text-xs text-emerald-800">
                {t('capture_success_saved')}
              </p>
            </div>
          </div>
          {createdRecetaId && (
            <button
              type="button"
              onClick={() => router.push(`/recipes/${createdRecetaId}`)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition cursor-pointer self-start sm:self-auto shrink-0 flex items-center gap-1.5 shadow-2xs"
            >
              <span>{t('capture_open_now')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'url' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={urlInputRef}
                  type="url"
                  autoFocus={false}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t('capture_placeholder_url_detailed')}
                  disabled={isPending}
                  className="w-full min-h-[52px] pl-4 pr-12 py-3 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition shadow-2xs disabled:opacity-60"
                />
                <LinkIcon className="w-5 h-5 text-stone-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Input nativo de archivo con accept estricto para forzar conversión nativa en iOS */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg, image/png, image/webp, application/pdf"
                className="hidden"
                disabled={isPending}
              />

              {/* Botón secundario para subir archivos o fotos */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                title={t('capture_title_upload_file')}
                className="min-h-[52px] px-3.5 sm:px-4 rounded-2xl bg-[#faf7f2] hover:bg-[#f4efe6] active:scale-[0.98] border border-[#e7dfd5] text-[#a86224] hover:text-[#8e511c] font-medium transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs shrink-0 disabled:opacity-50"
              >
                <Paperclip className="w-5 h-5" />
                <span className="hidden sm:inline text-xs font-semibold">{t('capture_btn_upload_file')}</span>
              </button>
            </div>

            {/* Tarjeta de visualización de archivo adjunto con miniatura */}
            {selectedFile && (
              <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-xs animate-fade-in shadow-2xs">
                <div className="flex items-center gap-3 overflow-hidden">
                  {filePreviewUrl ? (
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-[#e7dfd5] shrink-0">
                      <img
                        src={filePreviewUrl}
                        alt={selectedFile.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : selectedFile.type.startsWith('image/') ? (
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="truncate">
                    <p className="font-semibold text-stone-900 truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-stone-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {t('capture_file_ready')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isPending}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition cursor-pointer shrink-0"
                  title="Quitar archivo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              ref={textInputRef}
              autoFocus={false}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              placeholder={t('capture_placeholder_text_detailed')}
              disabled={isPending}
              className="w-full p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] transition resize-none shadow-2xs disabled:opacity-60"
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="px-3.5 py-2 rounded-xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Paperclip className="w-4 h-4" />
                <span>{t('capture_btn_attach_file')}</span>
              </button>
            </div>

            {/* Input nativo de archivo con accept estricto para forzar conversión nativa en iOS */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg, image/png, image/webp, application/pdf"
              className="hidden"
              disabled={isPending}
            />

            {/* Tarjeta de visualización de archivo adjunto con miniatura */}
            {selectedFile && (
              <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-xs animate-fade-in shadow-2xs">
                <div className="flex items-center gap-3 overflow-hidden">
                  {filePreviewUrl ? (
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-[#e7dfd5] shrink-0">
                      <img
                        src={filePreviewUrl}
                        alt={selectedFile.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : selectedFile.type.startsWith('image/') ? (
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="truncate">
                    <p className="font-semibold text-stone-900 truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-stone-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {t('capture_file_ready')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isPending}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition cursor-pointer shrink-0"
                  title="Quitar archivo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
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
              <span>
                {selectedFile
                  ? `${t('capture_process_recipe')} (${selectedFile.name})`
                  : t('capture_btn_process')}
              </span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#f4efe6] text-xs">
        <span className="text-stone-500 text-[11px] sm:text-xs">
          {t('capture_footer_android')}
        </span>
      </div>

      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        context="limit_reached"
        onVipSuccess={() => {
          setShowProModal(false);
        }}
      />
    </div>
  );
}
