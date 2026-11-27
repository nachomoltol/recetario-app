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
  MonitorPlay,
  Play,
  Monitor,
  Smartphone,
  Mic,
  Square,
  Pause,
  Plus,
  RotateCcw,
  Volume2,
  ClipboardPaste,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { ingestRecipeAction } from '@/app/actions/recipeIngest';
import { checkUserBalanceAction } from '@/app/actions/checkUserBalanceAction';
import { claimAdRewardAction } from '@/app/actions/claimAdRewardAction';
import {
  showRewardVideoAdFlow,
  preloadRewardedAd,
  isNativeMobilePlatform,
} from '@/lib/admob/admobService';
import { ProSubscriptionModal } from '@/components/subscription/ProSubscriptionModal';
import { AdInterstitialModal } from '@/components/subscription/AdInterstitialModal';
import { HardLimitModal, HardLimitType } from '@/components/subscription/HardLimitModal';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { getDeviceIdentifier } from '@/lib/device/deviceIdentifier';
import { Usuario } from '@/types/recipe';
import { playCrunchFeedback } from '@/lib/utils/audioFeedback';
import { compressImageClient } from '@/lib/utils/imageCompress';
import dynamic from 'next/dynamic';
import { createClient as createSupabaseBrowserClient } from '@/lib/supabase/client';
import { updateRecipeClassificationAction } from '@/app/actions/recipeClassification';
import type { MomentoDia, RolPlato } from '@/types/database';

const RecipeCategorizeDrawer = dynamic(
  () => import('./RecipeCategorizeDrawer').then((m) => m.RecipeCategorizeDrawer),
  { ssr: false }
);

interface PostCaptureCategorizeTarget {
  receta: {
    id: string;
    titulo: string;
    calorias_por_porcion?: number | null;
    etiquetas?: string[] | null;
    descripcion?: string | null;
    momentos_dia?: MomentoDia[] | null;
    rol_plato?: RolPlato | null;
    es_favorito_menu?: boolean | null;
  };
  ingredientes: { nombre_limpio?: string; nombre_crudo?: string }[];
}

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
    title: 'Analizando con Gemini 3.1 Flash Lite',
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
    title: 'Analyzing with Gemini 3.1 Flash Lite',
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

const AUDIO_LOADING_STAGES_ES: LoadingStage[] = [
  {
    seconds: 0,
    title: 'Transmitiendo nota de voz',
    description: 'Subiendo audio comprimido de alta fidelidad al motor de IA...',
    percent: 25,
  },
  {
    seconds: 3,
    title: 'Analizando voz con Gemini 3.1 Flash Lite',
    description: 'Inferencia multimodal activa: reconociendo ingredientes, cantidades y tiempos...',
    percent: 65,
  },
  {
    seconds: 8,
    title: 'Estructurando paso a paso',
    description: 'Redactando instrucciones claras, deduciendo técnicas culinarias y normalizando medidas...',
    percent: 88,
  },
  {
    seconds: 15,
    title: 'Finalizando receta',
    description: 'Calculando alérgenos, asignando pasillos y guardando en tu recetario...',
    percent: 96,
  },
];

const AUDIO_LOADING_STAGES_EN: LoadingStage[] = [
  {
    seconds: 0,
    title: 'Streaming voice note',
    description: 'Uploading compressed high-fidelity audio to the AI engine...',
    percent: 25,
  },
  {
    seconds: 3,
    title: 'Analyzing voice with Gemini 3.1 Flash Lite',
    description: 'Active multimodal inference: recognizing ingredients, quantities, and times...',
    percent: 65,
  },
  {
    seconds: 8,
    title: 'Structuring step-by-step',
    description: 'Drafting clear instructions, deducing culinary techniques, and normalizing measures...',
    percent: 88,
  },
  {
    seconds: 15,
    title: 'Finalizing recipe',
    description: 'Calculating allergens, supermarket aisles, and saving to your cookbook...',
    percent: 96,
  },
];

const PHOTO_LOADING_STAGES_ES: LoadingStage[] = [
  {
    seconds: 0,
    title: 'Preparando foto(s) de la receta',
    description: 'Enviando imágenes optimizadas de alta nitidez al motor visual...',
    percent: 24,
  },
  {
    seconds: 3,
    title: 'Leyendo ingredientes y texto manuscrito',
    description: 'Identificando cantidades, abreviaturas, etiquetas o detalles del plato...',
    percent: 58,
  },
  {
    seconds: 8,
    title: 'Estructurando receta paso a paso',
    description: 'Uniendo páginas, normalizando medidas y ordenando la elaboración...',
    percent: 84,
  },
  {
    seconds: 14,
    title: 'Finalizando receta',
    description: 'Calculando alérgenos, asignando pasillos y guardando en tu recetario...',
    percent: 96,
  },
];

const PHOTO_LOADING_STAGES_EN: LoadingStage[] = [
  {
    seconds: 0,
    title: 'Preparing recipe photo(s)',
    description: 'Uploading crisp optimized images to the visual AI engine...',
    percent: 24,
  },
  {
    seconds: 3,
    title: 'Reading ingredients & handwritten notes',
    description: 'Detecting quantities, abbreviations, product labels, or dish details...',
    percent: 58,
  },
  {
    seconds: 8,
    title: 'Structuring recipe step-by-step',
    description: 'Combining pages, normalizing measurements, and ordering instructions...',
    percent: 84,
  },
  {
    seconds: 14,
    title: 'Finalizing recipe',
    description: 'Checking allergens, assigning aisles, and saving to your cookbook...',
    percent: 96,
  },
];

const MAX_CAPTURE_PHOTOS = 3;
const IDLE_AUDIO_BARS = Array.from({ length: 15 }, () => 14);

export interface RecipeCaptureCardProps {
  initialProfile?: Usuario | null;
}

export function RecipeCaptureCard({ initialProfile }: RecipeCaptureCardProps = {}) {
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);
  const searchParams = useSearchParams();
  const router = useRouter();

  const profileFromStore = useProfileStore((s) => s.profile);
  const currentProfile = profileFromStore || initialProfile;

  // Modales de control Freemium / Premium
  const [showInterstitialModal, setShowInterstitialModal] = useState(false);
  const [hardLimitModal, setHardLimitModal] = useState<HardLimitType | null>(null);
  const [pendingIngestParams, setPendingIngestParams] = useState<{
    mode: 'url' | 'texto' | 'audio';
    value: string;
    files?: File[] | null;
  } | null>(null);
  const skipInterstitialRef = useRef(false);

  const initialUrl = searchParams.get('url') || searchParams.get('captureUrl') || '';
  const initialText = searchParams.get('captureText') || searchParams.get('text') || '';
  const autoStart = searchParams.get('autoStart') === 'true' || searchParams.get('autoStart') === '1';

  // Si el texto entrante (sharedText) incluye "youtube.com" o "youtu.be", aislar exclusivamente la URL
  const initialSharedText = (initialUrl || initialText || '').trim();
  const isInitialYouTube =
    initialSharedText.includes('youtube.com') || initialSharedText.includes('youtu.be');
  const initialYtMatch = isInitialYouTube
    ? initialSharedText.match(/(https?:\/\/[^\s]+)/)
    : null;
  const resolvedDefaultUrl = isInitialYouTube && initialYtMatch ? initialYtMatch[0] : initialUrl;
  const resolvedDefaultText = isInitialYouTube ? '' : initialText;
  const resolvedDefaultMode: 'url' | 'texto' | 'audio' = isInitialYouTube
    ? 'url'
    : resolvedDefaultText && !resolvedDefaultUrl
      ? 'texto'
      : 'url';

  const [mode, setMode] = useState<'url' | 'texto' | 'audio'>(resolvedDefaultMode);
  const [url, setUrl] = useState(resolvedDefaultUrl);
  const [texto, setTexto] = useState(resolvedDefaultText);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdRecetaId, setCreatedRecetaId] = useState<string | null>(null);
  // Pop-up de selección de momentos tras crear/importar una receta
  const [postCaptureTarget, setPostCaptureTarget] = useState<PostCaptureCategorizeTarget | null>(null);
  const [isPostCaptureCategorizeOpen, setIsPostCaptureCategorizeOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isOptimizingPhoto, setIsOptimizingPhoto] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Estados y referencias para grabación de voz (MediaRecorder + medidor real de señal)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimFrameRef = useRef<number | null>(null);
  const hasDetectedVoiceSignalRef = useRef(false);
  const recordingSecondsRef = useRef(0);
  const isPausedRef = useRef(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(IDLE_AUDIO_BARS);
  const [noVoiceSignalWarning, setNoVoiceSignalWarning] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const captureCardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const scrolledOnceRef = useRef<string | null>(null);

  // Estados de carga progresiva
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const hasAutoStarted = useRef(false);

  // Estados de solicitud de recarga pendiente desde PC (Plataformas Móviles Nativas: Android e iOS)
  const [isNativeMobile, setIsNativeMobile] = useState(false);
  const [hasPendingPcRequest, setHasPendingPcRequest] = useState(false);
  const [isCrossDeviceModal, setIsCrossDeviceModal] = useState(false);
  const [pendingPcUrl, setPendingPcUrl] = useState<string | null>(null);
  const [isPlayingPcUnlockAd, setIsPlayingPcUnlockAd] = useState(false);
  const [pcUnlockFeedback, setPcUnlockFeedback] = useState<{
    type: 'success' | 'warning';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile =
      isNativeMobilePlatform() ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsNativeMobile(isMobile);

    const verifyPendingPcRequest = async () => {
      try {
        const res = await checkUserBalanceAction();
        if (res.success && res.solicitud_recarga_pc) {
          let isUnder30Min = true;
          if (res.solicitud_recarga_pc_at) {
            const ageMs = Date.now() - new Date(res.solicitud_recarga_pc_at).getTime();
            isUnder30Min = ageMs >= 0 && ageMs < 30 * 60 * 1000;
          }
          if (isUnder30Min) {
            setPendingPcUrl(res.solicitud_recarga_url || null);
            setHasPendingPcRequest(true);
            setIsCrossDeviceModal(true);
            setShowInterstitialModal(true);
            preloadRewardedAd().catch(() => {});
          } else {
            setHasPendingPcRequest(false);
            setIsCrossDeviceModal(false);
          }
        } else {
          setHasPendingPcRequest(false);
          setIsCrossDeviceModal(false);
        }
      } catch (err) {
        console.error('[RecipeCaptureCard] Error comprobando solicitud_recarga_pc:', err);
      }
    };

    // 1. Ejecución inmediata al montar
    verifyPendingPcRequest();

    // 2. Refresco reactivo al volver de segundo plano o recuperar foco
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        verifyPendingPcRequest();
      }
    };
    const handleWindowFocus = () => {
      verifyPendingPcRequest();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    // 3. Listener nativo de Capacitor si la app está en un contenedor móvil
    let capAppListener: { remove: () => void } | null = null;
    const win = typeof window !== 'undefined' ? (window as any) : null;
    if (win?.Capacitor?.Plugins?.App?.addListener) {
      try {
        win.Capacitor.Plugins.App.addListener('appStateChange', (state: { isActive: boolean }) => {
          if (state.isActive) {
            verifyPendingPcRequest();
          }
        }).then((handle: any) => {
          capAppListener = handle;
        }).catch(() => {});
      } catch {}
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      if (capAppListener) {
        try {
          capAppListener.remove();
        } catch {}
      }
    };
  }, [currentProfile]);

  const handleWatchAdForPc = () => {
    setIsCrossDeviceModal(true);
    setShowInterstitialModal(true);
  };

  // Previsualización ligera para miniaturas (soporta hasta 3 fotos en la misma captura)
  const filePreviewUrls = useMemo(() => {
    return selectedFiles.map((file) =>
      file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    );
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      filePreviewUrls.forEach((previewUrl) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      });
    };
  }, [filePreviewUrls]);

  // Compresión y redimensionamiento automático en cliente para fotos (hasta 3 fotos = 1 captura)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(e.target.files || []);
    e.target.value = '';
    if (incomingFiles.length === 0) return;

    const imageFiles = incomingFiles.filter((f) => f.type.startsWith('image/'));
    const otherFiles = incomingFiles.filter((f) => !f.type.startsWith('image/'));

    // Si es PDF o audio, se mantiene un único archivo
    if (imageFiles.length === 0 && otherFiles.length > 0) {
      setSelectedFiles([otherFiles[0]]);
      setError(null);
      return;
    }

    const existingImages = selectedFiles.filter((f) => f.type.startsWith('image/'));
    const availableSlots = Math.max(0, MAX_CAPTURE_PHOTOS - existingImages.length);

    if (availableSlots === 0) {
      setError(
        language === 'en'
          ? `You can attach up to ${MAX_CAPTURE_PHOTOS} photos per recipe.`
          : `Puedes añadir un máximo de ${MAX_CAPTURE_PHOTOS} fotos por receta.`
      );
      return;
    }

    const filesToProcess = imageFiles.slice(0, availableSlots);
    const exceededLimit = imageFiles.length > availableSlots;

    setIsOptimizingPhoto(true);
    setError(null);

    try {
      const optimizedImages: File[] = [];
      for (const rawFile of filesToProcess) {
        try {
          const compressedBlob = await compressImageClient(rawFile, 1600, 1600, 0.82);
          const baseName = rawFile.name.replace(/\.[^.]+$/, '') || `receta_${Date.now()}`;
          const compressedFile = new File([compressedBlob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          optimizedImages.push(compressedFile);
        } catch {
          optimizedImages.push(rawFile);
        }
      }

      // Evitar mezclar enlaces previos con fotos nuevas en la pestaña Enlace
      if (mode === 'url' && url.trim()) {
        setUrl('');
      }

      setSelectedFiles([...existingImages, ...optimizedImages]);
      if (exceededLimit) {
        setError(
          language === 'en'
            ? `Up to ${MAX_CAPTURE_PHOTOS} photos can be combined per recipe. Extra photos were skipped.`
            : `Puedes combinar hasta ${MAX_CAPTURE_PHOTOS} fotos en una misma receta. Se han mantenido las ${MAX_CAPTURE_PHOTOS} primeras.`
        );
      }
    } finally {
      setIsOptimizingPhoto(false);
    }
  };

  const handleRemoveFile = (index?: number) => {
    if (typeof index === 'number') {
      setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    } else {
      setSelectedFiles([]);
    }
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

  // Ejecutor centralizado de ingesta con validación de fricción Freemium/Premium
  // Carga los datos mínimos de la receta recién creada y abre el pop-up de momentos
  const openPostCaptureCategorize = useCallback(async (recetaId: string) => {
    if (!recetaId || typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(`categorize_dismissed_${recetaId}`) === 'true') return;
    } catch {}

    let target: PostCaptureCategorizeTarget = {
      receta: { id: recetaId, titulo: '' },
      ingredientes: [],
    };

    try {
      const supabase = createSupabaseBrowserClient();
      const [{ data: recetaRow }, { data: ingRows }] = await Promise.all([
        supabase
          .from('recetas')
          .select('id, titulo, calorias_por_porcion, etiquetas, descripcion, momentos_dia, rol_plato, es_favorito_menu')
          .eq('id', recetaId)
          .single(),
        supabase
          .from('receta_ingredientes')
          .select('nombre_limpio, nombre_crudo')
          .eq('receta_id', recetaId)
          .order('orden', { ascending: true }),
      ]);
      if (recetaRow) {
        target = {
          receta: {
            id: recetaRow.id,
            titulo: (recetaRow.titulo || '').replace(/<\/?mark>/gi, ''),
            calorias_por_porcion: recetaRow.calorias_por_porcion ?? null,
            etiquetas: recetaRow.etiquetas ?? null,
            descripcion: recetaRow.descripcion ?? null,
            momentos_dia: (recetaRow.momentos_dia as MomentoDia[] | null) ?? null,
            rol_plato: (recetaRow.rol_plato as RolPlato | null) ?? null,
            es_favorito_menu: recetaRow.es_favorito_menu ?? null,
          },
          ingredientes: (ingRows || []).map((i: any) => ({
            nombre_limpio: i?.nombre_limpio || undefined,
            nombre_crudo: i?.nombre_crudo || undefined,
          })),
        };
      }
    } catch (err) {
      console.warn('[RecipeCaptureCard] No se pudieron cargar datos para el pop-up de momentos:', err);
    }

    setPostCaptureTarget(target);
    setIsPostCaptureCategorizeOpen(true);
  }, []);

  const markPostCaptureDismissed = useCallback((recetaId?: string | null) => {
    if (!recetaId || typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(`categorize_dismissed_${recetaId}`, 'true');
      localStorage.removeItem('receta_recien_creada_id');
    } catch {}
  }, []);

  const handlePostCaptureOpenChange = useCallback(
    (open: boolean) => {
      setIsPostCaptureCategorizeOpen(open);
      if (!open) markPostCaptureDismissed(postCaptureTarget?.receta.id);
    },
    [markPostCaptureDismissed, postCaptureTarget?.receta.id]
  );

  const handlePostCaptureSave = useCallback(
    async (data: { momentos_dia: MomentoDia[]; rol_plato: RolPlato; es_favorito_menu: boolean }) => {
      const recetaId = postCaptureTarget?.receta.id;
      setIsPostCaptureCategorizeOpen(false);
      markPostCaptureDismissed(recetaId);
      if (!recetaId) return;
      try {
        const res = await updateRecipeClassificationAction({
          recetaId,
          momentos_dia: data.momentos_dia,
          rol_plato: data.rol_plato,
          es_favorito_menu: data.es_favorito_menu,
        });
        if (res.success) {
          router.refresh();
        } else if (res.error) {
          setError(res.error);
        }
      } catch (err) {
        console.error('[RecipeCaptureCard] Error guardando momentos tras captura:', err);
      }
    },
    [postCaptureTarget?.receta.id, markPostCaptureDismissed, router]
  );

  const executeIngest = useCallback(
    (targetMode: 'url' | 'texto' | 'audio', targetValue: string, overrideFiles?: File[] | null) => {
      setError(null);
      setSuccess(null);
      setCreatedRecetaId(null);

      // Bloquear cualquier foco en el input para evitar rebotes de scroll
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      urlInputRef.current?.blur();
      textInputRef.current?.blur();

      const filesToUpload = overrideFiles !== undefined ? (overrideFiles ?? []) : selectedFiles;
      const hasFiles = filesToUpload.length > 0;
      const isPhotoCapture = hasFiles && filesToUpload.every((f) => f.type.startsWith('image/'));

      if (targetMode === 'url') {
        if (!targetValue.trim() && !hasFiles) {
          setError(
            language === 'en'
              ? 'Please enter a link or upload a file/image.'
              : 'Por favor, introduce un enlace o sube un archivo/imagen de la receta.'
          );
          return;
        }
      } else if (targetMode === 'texto') {
        if (!targetValue.trim() && !hasFiles) {
          setError(
            language === 'en'
              ? 'Please enter recipe text or upload a file/image.'
              : 'Por favor, introduce el texto con la receta o sube un archivo/imagen.'
          );
          return;
        }
      } else if (targetMode === 'audio') {
        if (!hasFiles) {
          setError(
            language === 'en'
              ? 'Please record a voice note first.'
              : 'Por favor, graba primero una nota de voz.'
          );
          return;
        }
      }

      // Reglas de negocio Freemium / Premium:
      const isPro = (currentProfile?.plan_suscripcion || '').trim().toLowerCase() === 'pro';
      const capturas = Number(currentProfile?.capturas_mes_actual) || 0;
      const antiguedad = Number(currentProfile?.antiguedad_ciclos_mes) || 0;
      const esPrimerMes = antiguedad === 0;
      const creditosAnuncio = Number((currentProfile as any)?.creditos_anuncio) || 0;
      const hasAdCredit = creditosAnuncio > 0 || skipInterstitialRef.current;

      // 1. Bloqueo duro inquebrantable en cliente:
      // - Free: límite mensual absoluto de 20 recetas
      if (!isPro && capturas >= 20) {
        setHardLimitModal('FREE_LIMIT_REACHED');
        return;
      }
      // - PRO: techo de 100 recetas/mes
      if (isPro && capturas >= 100) {
        setHardLimitModal('PRO_LIMIT_REACHED');
        return;
      }

      // 2. Umbral de Anuncio Recompensado en Free:
      // - Mes 1 (esPrimerMes): Recetas 1, 2, 3 directas (capturas < 3); a partir de la 4.ª (capturas >= 3) requiere anuncio.
      // - Mes 2+ (!esPrimerMes): Requiere anuncio desde la 1.ª receta (capturas >= 0).
      const requiresInterstitial = !isPro && (!esPrimerMes || capturas >= 3);

      if (requiresInterstitial && !hasAdCredit) {
        setPendingIngestParams({ mode: targetMode, value: targetValue, files: filesToUpload });
        setShowInterstitialModal(true);
        return;
      }
      skipInterstitialRef.current = false;

      // 3. Montar payload y proceder con la extracción en el servidor
      const formData = new FormData();
      formData.set('idioma', language);

      // Si hay fotos adjuntas en modo Enlace, no mezclar ningún enlace previo
      if (targetMode === 'url' && targetValue.trim() && !isPhotoCapture) {
        formData.set('url', targetValue.trim());
      } else if (targetMode === 'texto' && targetValue.trim()) {
        formData.set('texto', targetValue.trim());
      }

      startTransition(async () => {
        try {
          if (hasFiles) {
            filesToUpload.forEach((fileItem) => {
              formData.append('archivo', fileItem);
            });
          }

          // Resolver e inyectar el ID de hardware para protección anti-fraude
          const deviceId = await getDeviceIdentifier();
          formData.set('deviceId', deviceId);

          const res = await ingestRecipeAction(formData);

          if (res?.error) {
            // Manejo en línea de bloqueos duros sin expulsar a /billing
            if (
              res.error === 'FREE_LIMIT_REACHED' ||
              res.error === 'PAYWALL_LIMIT_REACHED'
            ) {
              setHardLimitModal('FREE_LIMIT_REACHED');
              setError(null);
            } else if (res.error === 'DEVICE_LIMIT_REACHED') {
              setHardLimitModal('DEVICE_LIMIT_REACHED');
              setError(null);
            } else if (res.error === 'PRO_LIMIT_REACHED') {
              setHardLimitModal('PRO_LIMIT_REACHED');
              setError(null);
            } else if (
              res.error === 'AD_REQUIRED' ||
              res.error === 'AD_REQUIRED_FOR_EXTRACTION'
            ) {
              setPendingIngestParams({ mode: targetMode, value: targetValue, files: filesToUpload });
              setShowInterstitialModal(true);
              setError(null);
            } else {
              setError(res.error);
            }
          } else if (res?.success) {
            // Actualizar cuota reactivamente en useProfileStore
            if (currentProfile) {
              useProfileStore.getState().setProfile({
                ...currentProfile,
                capturas_mes_actual: res.nuevoConteoCapturas ?? (capturas + 1),
                creditos_anuncio: res.nuevoSaldoCreditos ?? (currentProfile as any).creditos_anuncio,
              });
            }

            // Reproducir crujido de pan al completar con éxito la generación
            playCrunchFeedback();

            setSuccess(t('capture_success'));
            setCreatedRecetaId(res.recetaId || null);
            setUrl('');
            setTexto('');
            setSelectedFiles([]);
            setAudioFile(null);
            if (audioUrl) {
              URL.revokeObjectURL(audioUrl);
              setAudioUrl(null);
            }
            setPendingIngestParams(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            // Disparar evento para que la sección de inicio salte a 'Última receta capturada'
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('home_recent_tab', 'capturada');
                if (res.recetaId) {
                  localStorage.setItem('receta_recien_creada_id', res.recetaId);
                }
                window.dispatchEvent(
                  new CustomEvent('recipe-captured', { detail: { recetaId: res.recetaId } })
                );
              } catch {}
            }

            router.refresh();

            // Abrir de forma fiable el pop-up de momentos de comida para la receta recién creada
            if (res.recetaId) {
              void openPostCaptureCategorize(res.recetaId);
            }
          }
        } catch (e: any) {
          console.error('Error al procesar la receta:', e);
          setError(e?.message || 'Error desconocido al procesar');
        }
      });
    },
    [selectedFiles, router, currentProfile, language, t, audioUrl, openPostCaptureCategorize]
  );

  // Selector MIME compatible cross-platform (Web / iOS / Android)
  const getAudioMimeType = (): { mimeType: string; ext: string } => {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
      return { mimeType: 'audio/webm', ext: 'webm' };
    }
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      return { mimeType: 'audio/webm;codecs=opus', ext: 'webm' };
    }
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      return { mimeType: 'audio/webm', ext: 'webm' };
    }
    if (MediaRecorder.isTypeSupported('audio/mp4')) {
      return { mimeType: 'audio/mp4', ext: 'mp4' };
    }
    if (MediaRecorder.isTypeSupported('audio/aac')) {
      return { mimeType: 'audio/aac', ext: 'aac' };
    }
    return { mimeType: '', ext: 'webm' };
  };

  // Detener medidor real de audio (AudioContext + requestAnimationFrame)
  const stopAudioMeter = useCallback(() => {
    if (audioAnimFrameRef.current !== null) {
      cancelAnimationFrame(audioAnimFrameRef.current);
      audioAnimFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevels(IDLE_AUDIO_BARS);
  }, []);

  // Conectar las barras visuales al nivel real de señal del micrófono
  const startAudioMeter = useCallback(
    (stream: MediaStream) => {
      stopAudioMeter();
      try {
        const AudioCtx =
          window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;

        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let lastUiUpdate = 0;

        const sampleAudio = (ts: number) => {
          if (!analyserRef.current) return;
          if (ts - lastUiUpdate >= 55) {
            lastUiUpdate = ts;
            if (isPausedRef.current) {
              setAudioLevels(IDLE_AUDIO_BARS);
            } else {
              analyserRef.current.getByteFrequencyData(dataArray);
              const bars: number[] = [];
              let energySum = 0;
              const usableBins = Math.min(dataArray.length, 24);
              for (let i = 0; i < 15; i++) {
                const binIndex = Math.min(usableBins - 1, Math.floor((i * usableBins) / 15));
                const value = dataArray[binIndex] || 0;
                energySum += value;
                const normalized = Math.min(100, Math.max(14, Math.round((value / 220) * 100)));
                bars.push(normalized);
              }
              const avgEnergy = energySum / 15;
              if (avgEnergy > 8) {
                hasDetectedVoiceSignalRef.current = true;
                setNoVoiceSignalWarning(false);
              }
              setAudioLevels(bars);
            }
          }
          audioAnimFrameRef.current = requestAnimationFrame(sampleAudio);
        };

        audioAnimFrameRef.current = requestAnimationFrame(sampleAudio);
      } catch (meterErr) {
        console.warn('[RecipeCaptureCard] No se pudo inicializar el medidor de audio:', meterErr);
      }
    },
    [stopAudioMeter]
  );

  // Limpiar recursos de micrófono y medidor si el componente se desmonta
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      stopAudioMeter();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [stopAudioMeter]);

  // Iniciar grabación de voz por micrófono con reducción de ruido de cocina
  const startVoiceRecording = async () => {
    try {
      setError(null);
      setNoVoiceSignalWarning(false);
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError(
          language === 'en'
            ? 'Audio recording is not supported in this browser'
            : 'Tu navegador no soporta grabación de audio.'
        );
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true,
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;

      const { mimeType, ext } = getAudioMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, {
          ...(mimeType ? { mimeType } : {}),
          audioBitsPerSecond: 48000,
        });
      } catch (recErr) {
        console.warn('Fallback a MediaRecorder sin audioBitsPerSecond:', recErr);
        const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
        recorder = new MediaRecorder(stream, options);
      }
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      hasDetectedVoiceSignalRef.current = false;
      recordingSecondsRef.current = 0;
      isPausedRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopAudioMeter();
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const finalMime = mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: finalMime });
        if (blob.size < 1024 || recordingSecondsRef.current < 1) {
          setAudioFile(null);
          setError(
            language === 'en'
              ? 'No audio was captured. Check your microphone and try recording again.'
              : 'No se ha detectado audio suficiente en la grabación. Comprueba el micrófono e inténtalo de nuevo.'
          );
          return;
        }

        const file = new File([blob], `receta_voz_${Date.now()}.${ext}`, { type: finalMime });
        setAudioFile(file);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
      };

      recorder.start(250);
      startAudioMeter(stream);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingSeconds(0);
      setAudioFile(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        if (isPausedRef.current) return;
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          if (next >= 4 && !hasDetectedVoiceSignalRef.current) {
            setNoVoiceSignalWarning(true);
          }
          if (prev >= 299) {
            stopVoiceRecording();
            return 300;
          }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Error al acceder al micrófono:', err);
      stopAudioMeter();
      setError(
        language === 'en'
          ? 'Could not access microphone. Please grant microphone permission.'
          : 'No se pudo acceder al micrófono. Por favor, concede permiso de micrófono.'
      );
    }
  };

  // Pausar o reanudar la grabación actual sin perder lo dictado
  const togglePauseVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state === 'recording' && typeof recorder.pause === 'function') {
      try {
        recorder.pause();
        isPausedRef.current = true;
        setIsPaused(true);
      } catch (pauseErr) {
        console.warn('[RecipeCaptureCard] Pausa de audio no soportada en este navegador:', pauseErr);
      }
    } else if (recorder.state === 'paused' && typeof recorder.resume === 'function') {
      try {
        recorder.resume();
        isPausedRef.current = false;
        setIsPaused(false);
      } catch (resumeErr) {
        console.warn('[RecipeCaptureCard] Reanudación de audio no soportada:', resumeErr);
      }
    }
  };

  // Detener grabación y pasar siempre a la tarjeta de revisión previa antes de gastar cuota o lanzar anuncio
  const stopVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    stopAudioMeter();
    isPausedRef.current = false;
    setIsPaused(false);
    setNoVoiceSignalWarning(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
  };

  // Cancelar y purgar grabación
  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    stopAudioMeter();
    isPausedRef.current = false;
    setIsPaused(false);
    setNoVoiceSignalWarning(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    audioChunksRef.current = [];
    recordingSecondsRef.current = 0;
    setIsRecording(false);
    setRecordingSeconds(0);
    setAudioFile(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  // Extraer nota de voz previamente revisada (si aparece un anuncio, el audio se conserva intacto)
  const handleExtractVoice = (fileToSend?: File | null) => {
    const target = fileToSend || audioFile;
    if (!target) {
      setError(
        language === 'en'
          ? 'Please record a voice note first.'
          : 'Por favor, graba primero una nota de voz.'
      );
      return;
    }
    executeIngest('audio', '', [target]);
  };

  // Manejador al finalizar la cuenta regresiva del anuncio intersticial de 5s o vídeo AdMob
  const handleInterstitialComplete = useCallback(() => {
    setShowInterstitialModal(false);
    setIsCrossDeviceModal(false);
    skipInterstitialRef.current = true;
    if (pendingIngestParams) {
      executeIngest(pendingIngestParams.mode, pendingIngestParams.value, pendingIngestParams.files);
    } else if (pendingPcUrl) {
      const trimmed = pendingPcUrl.trim();
      const isHttp = /^https?:\/\//i.test(trimmed);
      const targetMode: 'url' | 'texto' = isHttp ? 'url' : 'texto';
      if (targetMode === 'url') {
        setUrl(trimmed);
        executeIngest('url', trimmed);
      } else {
        setTexto(trimmed);
        executeIngest('texto', trimmed);
      }
    }
  }, [pendingIngestParams, pendingPcUrl, executeIngest]);

  const handleInterstitialCancel = useCallback(() => {
    setShowInterstitialModal(false);
    setIsCrossDeviceModal(false);
    setPendingIngestParams(null);
    skipInterstitialRef.current = false;
  }, []);

  const handleSelectProFromInterstitial = useCallback(() => {
    setShowInterstitialModal(false);
    setIsCrossDeviceModal(false);
    setShowProModal(true);
  }, []);

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

  // Soporte nativo para Autopilot post-AdMob y Web Share Target / Intent del sistema operativo
  useEffect(() => {
    const rawIncoming = initialUrl || initialText || searchParams.get('text') || '';
    const sharedText = rawIncoming.trim();

    if (sharedText) {
      // 2. Validación condicional: Si el texto entrante (sharedText) incluye "youtube.com" o "youtu.be",
      // aplica una expresión regular para aislar la URL: const urlMatch = sharedText.match(/(https?:\/\/[^\s]+)/);
      // y asigna exclusivamente urlMatch[0] al input.
      if (sharedText.includes('youtube.com') || sharedText.includes('youtu.be')) {
        const urlMatch = sharedText.match(/(https?:\/\/[^\s]+)/);
        const cleanUrl = urlMatch ? urlMatch[0] : sharedText;
        setUrl(cleanUrl);
        setMode('url');
        setTexto('');

        if (autoStart && !hasAutoStarted.current) {
          hasAutoStarted.current = true;

          // Limpiar inmediatamente los parámetros de la URL sin recargar la página
          try {
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', '/recipes');
            }
            router.replace('/recipes');
          } catch (err) {
            console.error('Error al limpiar parámetros de la URL:', err);
          }

          // Ejecutar automáticamente con la URL limpia de YouTube
          executeIngest('url', cleanUrl);
        }
        return;
      }

      // 3. Si el texto entrante NO es de YouTube, pásalo al input exactamente tal cual viene
      // (preservando el comportamiento original e intacto para TikTok, Instagram y Facebook)
      if (initialUrl) {
        setUrl(initialUrl);
        const isHttp = initialUrl.startsWith('http://') || initialUrl.startsWith('https://');
        setMode(isHttp ? 'url' : 'texto');
        if (!isHttp) setTexto(initialUrl);
      } else if (initialText) {
        setTexto(initialText);
        setMode('texto');
      }

      if (autoStart && initialUrl && !hasAutoStarted.current) {
        hasAutoStarted.current = true;

        // IMPORTANTE: Limpiar inmediatamente los parámetros de la URL sin recargar la página
        try {
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/recipes');
          }
          router.replace('/recipes');
        } catch (err) {
          console.error('Error al limpiar parámetros de la URL:', err);
        }

        // Ejecutar automáticamente la función de generación
        const isHttp = initialUrl.startsWith('http://') || initialUrl.startsWith('https://');
        executeIngest(isHttp ? 'url' : 'texto', initialUrl);
      }
    }
  }, [initialUrl, initialText, autoStart, executeIngest, router, searchParams]);

  const handleExtractHereOnMobile = () => {
    if (!pendingPcUrl) return;
    const trimmed = pendingPcUrl.trim();
    const isHttp = /^https?:\/\//i.test(trimmed);
    const targetMode: 'url' | 'texto' = isHttp ? 'url' : 'texto';
    if (targetMode === 'url') {
      setMode('url');
      setUrl(trimmed);
    } else {
      setMode('texto');
      setTexto(trimmed);
    }
    setPcUnlockFeedback(null);
    skipInterstitialRef.current = true;
    executeIngest(targetMode, trimmed);
  };

  // Extrae una URL limpia si el texto pegado incluye frases promocionales o hashtags de TikTok, Instagram, YouTube, etc.
  const extractCleanSharedUrl = useCallback((rawText: string): string | null => {
    if (!rawText) return null;
    const match = rawText.match(/https?:\/\/[^\s"'<>]+/i);
    if (!match || !match[0]) return null;
    return match[0].replace(/[.,;:!?)\]}]+$/, '').trim();
  }, []);

  // Pegar desde el portapapeles en 1 toque, limpiando texto sobrante de redes sociales
  const handlePasteFromClipboard = useCallback(
    async (autoExtract: boolean) => {
      if (isPending) return;
      setError(null);
      setSuccess(null);

      if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
        urlInputRef.current?.focus();
        setError(
          language === 'en'
            ? 'Direct clipboard access is not available here. Tap the URL box and choose Paste.'
            : 'El acceso rápido al portapapeles no está disponible aquí. Toca la casilla de enlace y pulsa Pegar.'
        );
        return;
      }

      try {
        const rawClip = await navigator.clipboard.readText();
        const trimmed = (rawClip || '').trim();

        if (!trimmed) {
          urlInputRef.current?.focus();
          setError(
            language === 'en'
              ? 'Your clipboard is empty. Copy a recipe link from TikTok, Instagram or YouTube first.'
              : 'Tu portapapeles está vacío. Copia primero el enlace de la receta en TikTok, Instagram o YouTube.'
          );
          return;
        }

        const cleanUrl = extractCleanSharedUrl(trimmed);
        if (cleanUrl) {
          setMode('url');
          setUrl(cleanUrl);
          if (autoExtract) {
            executeIngest('url', cleanUrl);
          } else {
            urlInputRef.current?.focus();
          }
          return;
        }

        // Si el usuario copió texto de una receta sin enlace, pasarlo cómodamente a modo texto
        setMode('texto');
        setTexto(trimmed);
        if (autoExtract) {
          executeIngest('texto', trimmed);
        } else {
          textInputRef.current?.focus();
        }
      } catch {
        urlInputRef.current?.focus();
        setError(
          language === 'en'
            ? 'Clipboard permission was declined. Allow pasting or paste the link directly into the box.'
            : 'No se concedió permiso para leer el portapapeles. Pulsa Permitir pegar o pega el enlace en la casilla.'
        );
      }
    },
    [isPending, language, extractCleanSharedUrl, executeIngest]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'url') {
      executeIngest('url', url);
    } else if (mode === 'texto') {
      executeIngest('texto', texto);
    } else if (mode === 'audio') {
      if (isRecording) {
        // Siempre pasar por revisión previa antes de consumir cuota o lanzar anuncio
        stopVoiceRecording();
      } else if (audioFile) {
        executeIngest('audio', '', [audioFile]);
      } else {
        startVoiceRecording();
      }
    }
  };

  // Calcular etapa actual según segundos transcurridos y tipo real de captura
  const hasPhotoAttached =
    selectedFiles.length > 0 && selectedFiles.some((f) => f.type.startsWith('image/'));

  const loadingStages = useMemo(() => {
    if (mode === 'audio') {
      return language === 'en' ? AUDIO_LOADING_STAGES_EN : AUDIO_LOADING_STAGES_ES;
    }
    if (hasPhotoAttached) {
      return language === 'en' ? PHOTO_LOADING_STAGES_EN : PHOTO_LOADING_STAGES_ES;
    }
    return language === 'en' ? LOADING_STAGES_EN : LOADING_STAGES_ES;
  }, [mode, hasPhotoAttached, language]);
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
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-brand-primary shrink-0 shadow-2xs">
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

      {/* Selector de modo Responsive en 3 columnas iguales ocupando el 100% del ancho en móvil y PC */}
      <div className="w-full grid grid-cols-3 gap-1.5 sm:gap-2 bg-[#f4efe6] p-1.5 rounded-2xl border border-[#e7dfd5]">
        <button
          type="button"
          disabled={isPending || isRecording}
          onClick={() => {
            setMode('url');
            setError(null);
          }}
          className={`min-h-[46px] sm:min-h-[50px] px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
            mode === 'url'
              ? 'bg-white text-stone-900 font-semibold shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          } disabled:opacity-50`}
        >
          <LinkIcon className="w-4 h-4 text-brand-primary shrink-0" />
          <span className="truncate">{t('capture_tab_url')}</span>
        </button>
        <button
          type="button"
          disabled={isPending || isRecording}
          onClick={() => {
            setMode('texto');
            setError(null);
          }}
          className={`min-h-[46px] sm:min-h-[50px] px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
            mode === 'texto'
              ? 'bg-white text-stone-900 font-semibold shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          } disabled:opacity-50`}
        >
          <FileText className="w-4 h-4 text-brand-primary shrink-0" />
          <span className="truncate">{t('capture_tab_text')}</span>
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setMode('audio');
            setError(null);
          }}
          className={`min-h-[46px] sm:min-h-[50px] px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
            mode === 'audio'
              ? 'bg-white text-stone-900 font-semibold shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          } disabled:opacity-50`}
        >
          <Mic className="w-4 h-4 text-brand-primary shrink-0" />
          <span className="truncate">{t('capture_tab_voice')}</span>
        </button>
      </div>

      {/* Tarjeta Banner de Solicitud de Desbloqueo Pendiente desde PC (Móvil Nativo: Android e iOS < 30 min) */}
      {isNativeMobile && hasPendingPcRequest && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50/60 to-white border-2 border-brand-primary shadow-sm space-y-3.5 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/15 text-brand-primary flex items-center justify-center shrink-0">
              <MonitorPlay className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
                {language === 'en' ? 'Pending recipe on your PC' : 'Receta pendiente en tu PC'}
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                {language === 'en'
                  ? 'Watch a short sponsored video to unlock the extraction started on your computer'
                  : 'Mira un vídeo corto patrocinado para desbloquear la extracción iniciada en tu ordenador'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleWatchAdForPc}
            disabled={isPlayingPcUnlockAd}
            className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-75 text-white font-semibold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPlayingPcUnlockAd ? (
              <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
            ) : (
              <Play className="w-4 h-4 text-amber-300 fill-current" />
            )}
            <span>
              {isPlayingPcUnlockAd
                ? (language === 'en' ? 'Loading video...' : 'Cargando vídeo...')
                : (language === 'en' ? 'Watch video and unlock on PC' : 'Ver vídeo y desbloquear en PC')}
            </span>
          </button>
        </div>
      )}

      {/* Feedback tras reproducir el vídeo para PC en Móvil Nativo */}
      {isNativeMobile && pcUnlockFeedback && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-medium space-y-3 animate-fade-in ${
            pcUnlockFeedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              : 'bg-amber-50 border border-amber-300 text-amber-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {pcUnlockFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <span>{pcUnlockFeedback.message}</span>
          </div>

          {pcUnlockFeedback.type === 'success' && pendingPcUrl && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPcUnlockFeedback(null)}
                className="w-full min-h-[44px] py-2.5 px-3.5 rounded-xl bg-white hover:bg-emerald-100/70 border border-emerald-300 text-emerald-950 font-semibold text-xs sm:text-sm shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Monitor className="w-4 h-4 text-emerald-700" />
                <span>{language === 'en' ? 'Continue on PC' : 'Continuar en el PC'}</span>
              </button>

              <button
                type="button"
                onClick={handleExtractHereOnMobile}
                className="w-full min-h-[44px] py-2.5 px-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-amber-300" />
                <span>{language === 'en' ? 'Extract here on mobile' : 'Extraer aquí en el móvil'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Aviso de captura nativa Web Share Target */}
      {autoStart && (
        <div className="p-4 rounded-2xl bg-[#f4efe6] border border-brand-primary/40 text-stone-800 text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-brand-primary shrink-0 shadow-2xs">
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
            <div className="flex items-center gap-2 text-brand-primary font-semibold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-primary"></span>
              </span>
              <span className="uppercase tracking-wider">
                {t('capture_phase_label')} {stageIndex + 1} {t('capture_of_label')} {loadingStages.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-stone-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-brand-primary" />
              <span>{elapsedSeconds}{t('capture_elapsed_seconds')}</span>
            </div>
          </div>

          {/* Barra de progreso animada */}
          <div className="w-full h-2.5 rounded-full bg-[#e7dfd5] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-primary to-brand-hover rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(currentStage.percent + (elapsedSeconds % 3) * 2, 98)}%` }}
            />
          </div>

          {/* Mensaje descriptivo dinámico con humor culinario */}
          <div className="space-y-1">
            <h4 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
              <Radio className="w-4 h-4 text-brand-primary animate-pulse" />
              {currentHumorPhrase}
            </h4>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light">
              {currentStage.description}
            </p>
          </div>

          {/* Aviso informativo de espera para la IA */}
          <div className="p-3.5 rounded-xl bg-white border border-[#e7dfd5] text-xs text-stone-600 flex items-start gap-2.5 shadow-2xs">
            <Sparkles className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
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
              onClick={() => router.push(`/recipes/${createdRecetaId}?isNew=true`)}
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
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={urlInputRef}
                  type="url"
                  autoFocus={false}
                  value={url}
                  onPaste={(e) => {
                    const pasted = e.clipboardData?.getData('text') || '';
                    const cleanUrl = extractCleanSharedUrl(pasted);
                    if (cleanUrl && cleanUrl !== pasted.trim()) {
                      e.preventDefault();
                      setUrl(cleanUrl);
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    const trimmedVal = val.trim();
                    if (
                      trimmedVal &&
                      !/^https?:\/\/\S+$/i.test(trimmedVal) &&
                      /https?:\/\/\S+/i.test(trimmedVal)
                    ) {
                      const cleanUrl = extractCleanSharedUrl(trimmedVal);
                      setUrl(cleanUrl || val);
                    } else {
                      setUrl(val);
                    }
                  }}
                  placeholder={t('capture_placeholder_url_detailed')}
                  disabled={isPending}
                  className="w-full min-h-[52px] pl-4 pr-11 py-3 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition shadow-2xs disabled:opacity-60"
                />
                {url && !isPending ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUrl('');
                      urlInputRef.current?.focus();
                    }}
                    title={language === 'en' ? 'Clear link' : 'Borrar enlace'}
                    className="w-7 h-7 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <LinkIcon className="w-5 h-5 text-stone-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
              </div>

              {/* Input nativo de archivo con accept amplio (hasta 3 fotos, o 1 PDF/audio) */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg, image/png, image/webp, image/heic, image/heif, application/pdf, audio/*"
                multiple
                className="hidden"
                disabled={isPending || isOptimizingPhoto}
              />

              {/* Botón secundario para subir archivos o fotos */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                title={t('capture_title_upload_file')}
                className="min-h-[52px] px-3.5 sm:px-4 rounded-2xl bg-[#faf7f2] hover:bg-[#f4efe6] active:scale-[0.98] border border-[#e7dfd5] text-brand-primary hover:text-[#8e511c] font-medium transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs shrink-0 disabled:opacity-50"
              >
                <Paperclip className="w-5 h-5" />
                <span className="hidden sm:inline text-xs font-semibold">{t('capture_btn_upload_file')}</span>
              </button>
            </div>

            {/* Botones rápidos de 1 toque para pegar desde TikTok, Instagram, YouTube o portapapeles */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handlePasteFromClipboard(true)}
                disabled={isPending}
                className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-2xl bg-[#f4efe6] hover:bg-[#ebe2d5] active:scale-[0.99] border border-brand-primary/35 text-stone-900 font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50"
              >
                <ClipboardPaste className="w-4 h-4 text-brand-primary shrink-0" />
                <span>
                  {language === 'en' ? 'Paste link & extract' : 'Pegar enlace y extraer'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handlePasteFromClipboard(false)}
                disabled={isPending}
                className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-[#faf7f2] hover:bg-[#f4efe6] active:scale-[0.99] border border-[#e7dfd5] text-stone-600 hover:text-stone-900 font-medium text-xs transition cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50"
              >
                <span>{language === 'en' ? 'Paste only' : 'Solo pegar'}</span>
              </button>
            </div>

            {/* Indicador de compresión rápida en cliente */}
            {isOptimizingPhoto && (
              <div className="flex items-center gap-2.5 p-3 px-4 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-xs text-stone-700 animate-fade-in">
                <Loader2 className="w-4 h-4 animate-spin text-brand-primary shrink-0" />
                <span>
                  {language === 'en'
                    ? 'Optimizing photo(s) for fast upload...'
                    : 'Optimizando foto(s) para una subida rápida...'}
                </span>
              </div>
            )}

            {/* Tarjeta de visualización de archivos/fotos adjuntas (hasta 3 fotos = 1 captura) */}
            {selectedFiles.length > 0 && (
              <div className="p-3 px-4 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-xs animate-fade-in shadow-2xs space-y-2.5">
                <div className="space-y-2">
                  {selectedFiles.map((fileItem, idx) => {
                    const previewUrl = filePreviewUrls[idx];
                    return (
                      <div key={`${fileItem.name}-${idx}`} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {previewUrl ? (
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-[#e7dfd5] shrink-0">
                              <img
                                src={previewUrl}
                                alt={fileItem.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : fileItem.type.startsWith('image/') ? (
                            <div className="w-10 h-10 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-brand-primary shrink-0">
                              <Camera className="w-5 h-5" />
                            </div>
                          ) : fileItem.type.startsWith('audio/') ? (
                            <div className="w-10 h-10 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-brand-primary shrink-0">
                              <Volume2 className="w-5 h-5" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-brand-primary shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}
                          <div className="truncate">
                            <p className="font-semibold text-stone-900 truncate">{fileItem.name}</p>
                            <p className="text-[11px] text-stone-500">
                              {(fileItem.size / 1024).toFixed(1)} KB • {t('capture_file_ready')}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          disabled={isPending}
                          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition cursor-pointer shrink-0"
                          title={language === 'en' ? 'Remove file' : 'Quitar archivo'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {hasPhotoAttached && selectedFiles.length < MAX_CAPTURE_PHOTOS && (
                  <div className="pt-2 border-t border-[#e7dfd5] flex items-center justify-between gap-2">
                    <span className="text-[11px] text-stone-500">
                      {language === 'en'
                        ? `${selectedFiles.length}/${MAX_CAPTURE_PHOTOS} photos (1 recipe)`
                        : `${selectedFiles.length}/${MAX_CAPTURE_PHOTOS} fotos (cuenta como 1 receta)`}
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isPending || isOptimizingPhoto}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#faf7f2] border border-[#e7dfd5] text-brand-primary font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {language === 'en' ? 'Add another photo' : 'Añadir otra foto'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : mode === 'texto' ? (
          <div className="space-y-3">
            <textarea
              ref={textInputRef}
              autoFocus={false}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              placeholder={t('capture_placeholder_text_detailed')}
              disabled={isPending}
              className="w-full p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition resize-none shadow-2xs disabled:opacity-60"
            />

            <div className="flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="px-3.5 py-2 rounded-xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] text-brand-primary text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Paperclip className="w-4 h-4" />
                <span>{t('capture_btn_attach_file')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('audio');
                  setError(null);
                  startVoiceRecording();
                }}
                disabled={isPending}
                className="px-3.5 py-2 rounded-xl bg-[#f4efe6] hover:bg-[#e7dfd5] text-brand-primary text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>{t('capture_voice_record_btn')}</span>
              </button>
            </div>

            {/* Input nativo de archivo con accept amplio (hasta 3 fotos, o 1 PDF/audio) */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg, image/png, image/webp, image/heic, image/heif, application/pdf, audio/*"
              multiple
              className="hidden"
              disabled={isPending || isOptimizingPhoto}
            />

            {/* Indicador de compresión rápida en cliente */}
            {isOptimizingPhoto && (
              <div className="flex items-center gap-2.5 p-3 px-4 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-xs text-stone-700 animate-fade-in">
                <Loader2 className="w-4 h-4 animate-spin text-brand-primary shrink-0" />
                <span>
                  {language === 'en'
                    ? 'Optimizing photo(s) for fast upload...'
                    : 'Optimizando foto(s) para una subida rápida...'}
                </span>
              </div>
            )}

            {/* Tarjeta de visualización de archivos/fotos adjuntas (hasta 3 fotos = 1 captura) */}
            {selectedFiles.length > 0 && (
              <div className="p-3 px-4 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-xs animate-fade-in shadow-2xs space-y-2.5">
                <div className="space-y-2">
                  {selectedFiles.map((fileItem, idx) => {
                    const previewUrl = filePreviewUrls[idx];
                    return (
                      <div key={`${fileItem.name}-${idx}`} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {previewUrl ? (
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-[#e7dfd5] shrink-0">
                              <img
                                src={previewUrl}
                                alt={fileItem.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : fileItem.type.startsWith('image/') ? (
                            <div className="w-10 h-10 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-brand-primary shrink-0">
                              <Camera className="w-5 h-5" />
                            </div>
                          ) : fileItem.type.startsWith('audio/') ? (
                            <div className="w-10 h-10 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-brand-primary shrink-0">
                              <Volume2 className="w-5 h-5" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-brand-primary shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}
                          <div className="truncate">
                            <p className="font-semibold text-stone-900 truncate">{fileItem.name}</p>
                            <p className="text-[11px] text-stone-500">
                              {(fileItem.size / 1024).toFixed(1)} KB • {t('capture_file_ready')}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          disabled={isPending}
                          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition cursor-pointer shrink-0"
                          title={language === 'en' ? 'Remove file' : 'Quitar archivo'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {hasPhotoAttached && selectedFiles.length < MAX_CAPTURE_PHOTOS && (
                  <div className="pt-2 border-t border-[#e7dfd5] flex items-center justify-between gap-2">
                    <span className="text-[11px] text-stone-500">
                      {language === 'en'
                        ? `${selectedFiles.length}/${MAX_CAPTURE_PHOTOS} photos (1 recipe)`
                        : `${selectedFiles.length}/${MAX_CAPTURE_PHOTOS} fotos (cuenta como 1 receta)`}
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isPending || isOptimizingPhoto}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#faf7f2] border border-[#e7dfd5] text-brand-primary font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {language === 'en' ? 'Add another photo' : 'Añadir otra foto'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* MODO AUDIO: ESTUDIO DE DICTADO POR VOZ CROSS-PLATFORM */
          <div className="space-y-4">
            {isRecording ? (
              /* ESTADO: GRABANDO EN DIRECTO CON MEDIDOR REAL DE MICRÓFONO, PAUSA Y REVISIÓN PREVIA */
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-rose-50/80 via-white to-amber-50/40 border-2 border-rose-400/80 shadow-md space-y-5 animate-fade-in text-center">
                <div className="flex items-center justify-center gap-2 text-rose-600 font-bold text-xs sm:text-sm uppercase tracking-wider">
                  <span className="relative flex h-3 w-3">
                    {!isPaused && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-3 w-3 ${
                        isPaused ? 'bg-amber-500' : 'bg-rose-600'
                      }`}
                    ></span>
                  </span>
                  <span>
                    {isPaused
                      ? language === 'en'
                        ? 'Recording paused'
                        : 'Grabación en pausa'
                      : t('capture_voice_recording')}
                  </span>
                </div>

                {/* Visualizador real conectado al nivel del micrófono */}
                <div className="flex items-center justify-center gap-1.5 h-12 py-2">
                  {audioLevels.map((level, i) => (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-75 ${
                        isPaused
                          ? 'bg-stone-300'
                          : 'bg-gradient-to-t from-rose-500 to-amber-500'
                      }`}
                      style={{
                        height: `${isPaused ? 16 : level}%`,
                      }}
                    />
                  ))}
                </div>

                {/* Aviso en vivo si no entra señal por el micrófono */}
                {noVoiceSignalWarning && !isPaused && (
                  <div className="mx-auto max-w-sm px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                      {language === 'en'
                        ? 'No microphone signal detected. Speak closer or check mic settings.'
                        : 'No entra señal de audio. Habla más cerca o revisa el micrófono.'}
                    </span>
                  </div>
                )}

                {/* Cronómetro en vivo: tiempo transcurrido / tiempo restante */}
                <div className="space-y-1">
                  <div className="text-3xl sm:text-4xl font-bold font-mono text-stone-900 tracking-tight">
                    {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                  </div>
                  <p className="text-xs text-stone-500 font-medium">
                    {language === 'en'
                      ? `Remaining: ${Math.floor((300 - recordingSeconds) / 60)}:${String((300 - recordingSeconds) % 60).padStart(2, '0')} (Max 5:00)`
                      : `Restante: ${Math.floor((300 - recordingSeconds) / 60)}:${String((300 - recordingSeconds) % 60).padStart(2, '0')} (Máx 5:00)`}
                  </p>
                </div>

                {/* Controles de grabación activa: Cancelar, Pausar/Reanudar y Detener para revisar */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="w-full sm:w-auto min-h-[46px] px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    <span>{t('capture_voice_cancel')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={togglePauseVoiceRecording}
                    className="w-full sm:w-auto min-h-[46px] px-5 rounded-xl bg-amber-100 hover:bg-amber-200/80 text-amber-900 text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>{language === 'en' ? 'Resume' : 'Reanudar'}</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>{language === 'en' ? 'Pause' : 'Pausar'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="w-full sm:w-auto min-h-[46px] px-6 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-rose-600/30"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>{language === 'en' ? 'Stop & review' : 'Detener y revisar'}</span>
                  </button>
                </div>
              </div>
            ) : audioFile && audioUrl ? (
              /* ESTADO: AUDIO GRABADO LISTO PARA REVISAR O EXTRAER */
              <div className="p-5 sm:p-6 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-4 animate-fade-in shadow-2xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-900">{audioFile.name}</p>
                      <p className="text-xs text-stone-500">
                        {(audioFile.size / 1024).toFixed(1)} KB • {recordingSeconds}s
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    disabled={isPending}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition cursor-pointer"
                    title="Descartar audio"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Reproductor de audio nativo para comprobación previa */}
                <audio controls src={audioUrl} className="w-full h-10 rounded-xl outline-none" />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    disabled={isPending}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 border border-[#e7dfd5] text-stone-700 text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('capture_voice_rerecord')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExtractVoice(audioFile)}
                    disabled={isPending}
                    className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{t('capture_voice_extract')}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ESTADO INICIAL: BOTÓN PRINCIPAL DE GRABACIÓN DE VOZ */
              <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-[#faf7f2] to-white border border-[#e7dfd5] text-center space-y-4 shadow-2xs">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    disabled={isPending}
                    className="relative group w-20 h-20 rounded-full bg-gradient-to-tr from-brand-primary via-amber-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-brand-primary/25 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50"
                  >
                    <span className="absolute -inset-1 rounded-full bg-brand-primary/20 group-hover:bg-brand-primary/40 animate-pulse -z-10" />
                    <Mic className="w-9 h-9" />
                  </button>
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-base sm:text-lg font-bold text-stone-900 font-serif-recipe">
                    {t('capture_voice_record_btn')}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light">
                    {language === 'en'
                      ? 'Tap to start recording. Dictate the ingredients and step-by-step instructions naturally, and our AI will structure them into a standardized recipe.'
                      : 'Presiona el botón para comenzar a hablar. Narra los ingredientes y el paso a paso con naturalidad, y nuestra IA los estructurará en una receta estandarizada.'}
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4efe6] border border-[#e7dfd5] text-[11px] text-stone-600 font-medium">
                  <Clock className="w-3.5 h-3.5 text-brand-primary" />
                  <span>{t('capture_voice_time_limit')}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full min-h-[54px] py-3.5 px-6 rounded-2xl font-semibold text-sm sm:text-base text-white bg-brand-primary hover:bg-brand-hover active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 shadow-sm shadow-brand-primary/20 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white shrink-0" />
              <span className="truncate">
                {currentHumorPhrase} ({elapsedSeconds}s)
              </span>
            </>
          ) : mode === 'audio' ? (
            isRecording ? (
              <>
                <Square className="w-5 h-5 fill-current text-white shrink-0" />
                <span>{language === 'en' ? 'Stop & review' : 'Detener y revisar'}</span>
              </>
            ) : audioFile ? (
              <>
                <Sparkles className="w-5 h-5 text-white shrink-0" />
                <span>{t('capture_voice_extract')}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 text-white shrink-0" />
                <span>{t('capture_voice_record_btn')}</span>
              </>
            )
          ) : (
            <>
              <span>
                {selectedFiles.length > 1
                  ? `${t('capture_process_recipe')} (${selectedFiles.length} ${language === 'en' ? 'photos' : 'fotos'})`
                  : selectedFiles.length === 1
                    ? `${t('capture_process_recipe')} (${selectedFiles[0].name})`
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
        pendingUrl={url || texto}
        onVipSuccess={() => {
          setShowProModal(false);
        }}
      />

      {/* Modal Intersticial de 5 Segundos (Generación Patrocinada en Línea / Desbloqueo Cruzado) */}
      <AdInterstitialModal
        isOpen={showInterstitialModal}
        onComplete={handleInterstitialComplete}
        onCancel={handleInterstitialCancel}
        onSelectPro={handleSelectProFromInterstitial}
        pendingUrl={url || texto || pendingIngestParams?.value || pendingPcUrl || ''}
        isCrossDeviceRequest={isCrossDeviceModal}
      />

      {/* Modal de Bloqueo Duro por Límite Mensual Alcanzado */}
      <HardLimitModal
        isOpen={Boolean(hardLimitModal)}
        type={hardLimitModal}
        onClose={() => setHardLimitModal(null)}
      />

      {/* Pop-up de selección de momentos de comida tras crear/importar la receta */}
      {postCaptureTarget && (
        <RecipeCategorizeDrawer
          isOpen={isPostCaptureCategorizeOpen}
          onOpenChange={handlePostCaptureOpenChange}
          isNew
          receta={postCaptureTarget.receta}
          ingredientes={postCaptureTarget.ingredientes}
          onSave={handlePostCaptureSave}
        />
      )}
    </div>
  );
}
