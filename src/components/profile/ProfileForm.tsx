'use client';

import { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import {
  ChefHat,
  BookOpen,
  Calendar,
  Heart,
  Check,
  User,
  Sparkles,
  Award,
  AlertCircle,
  Save,
  Lock,
  ShieldCheck,
  HeartPulse,
  Loader2,
  ChevronDown,
  Settings,
  X,
} from 'lucide-react';
import { Drawer } from 'vaul';
import { updateUserProfileAction } from '@/app/actions/userPreferences';
import { useProfileStore } from '@/stores/useProfileStore';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { ProSubscriptionModal } from '@/components/subscription/ProSubscriptionModal';
import { FeatureInfoTrigger } from '@/components/ui/FeatureInfoTrigger';
import {
  OBJETIVOS_CLINICOS,
  PATRONES_ALIMENTARIOS,
} from '@/lib/clinicalDictionary';

interface ChefStats {
  totalRecetas: number;
  totalPlanificadas: number;
  totalCocinados: number;
  totalFavoritas: number;
}

interface ProfileFormProps {
  initialProfile: {
    id: string;
    email: string;
    nombre: string | null;
    raciones_defecto?: number | null;
    nivel_culinario?: string | null;
    preferencias_dieteticas?: string[] | null;
    alergenos?: string[] | null;
    plan_suscripcion?: 'gratis' | 'pro' | null;
    created_at?: string;
  };
  stats: ChefStats;
}

const NIVELES_CULINARIOS = [
  {
    id: 'Principiante',
    label: 'Principiante',
    labelEn: 'Beginner',
    badge: '🌱',
    isProOnly: true,
    desc: 'Relato guiado paso a paso con tarjeta sensorial (color, textura y aroma) y alertas de seguridad térmica.',
    descEn: 'Step-by-step guided narrative with sensory card (color, texture & aroma) and thermal safety warnings.',
  },
  {
    id: 'Intermedio',
    label: 'Intermedio',
    labelEn: 'Intermediate',
    badge: '🍳',
    isProOnly: true,
    desc: 'Versión técnica equilibrada con prosa clara, directa y estructurada para cocina diaria.',
    descEn: 'Balanced technical version with clear, direct, and structured prose for everyday cooking.',
  },
  {
    id: 'Avanzado',
    label: 'Avanzado',
    labelEn: 'Advanced',
    badge: '👨‍🍳',
    isProOnly: true,
    desc: 'Prosa ejecutiva, sintética y técnicas de restaurante (marcar, desglasar, emulsionar, reducir).',
    descEn: 'Executive, concise restaurant-grade techniques (sear, deglaze, emulsify, reduce).',
  },
];

export function ProfileForm({ initialProfile, stats }: ProfileFormProps) {
  const setStoreProfile = useProfileStore((s) => s.setProfile);
  const currentStoreProfile = useProfileStore((s) => s.profile);
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const [isVipUpgraded, setIsVipUpgraded] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [isClinicalDrawerOpen, setIsClinicalDrawerOpen] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (localStorage.getItem('recetario_vip_active') === 'true') {
          setIsVipUpgraded(true);
        }
      } catch {}
    }
  }, []);

  const isPro =
    (initialProfile.plan_suscripcion || '').trim().toLowerCase() === 'pro' ||
    (currentStoreProfile?.plan_suscripcion || '').trim().toLowerCase() === 'pro' ||
    isVipUpgraded;

  const [nombre, setNombre] = useState(
    initialProfile.nombre || currentStoreProfile?.nombre || ''
  );

  // Los 3 niveles culinarios son 100% PRO:
  // - Usuario PRO: arranca con el nivel guardado en su perfil (o 'Intermedio' por defecto si es PRO).
  // - Usuario FREE: arranca sin nivel PRO activo (null); si selecciona cualquiera de los 3 e intenta guardar, se bloquea y redirige a Miga Pro.
  const resolvedInitialLevel: string | null = isPro
    ? initialProfile.nivel_culinario || currentStoreProfile?.nivel_culinario || 'Intermedio'
    : null;

  const [nivelCulinario, setNivelCulinario] = useState<string | null>(resolvedInitialLevel);

  useEffect(() => {
    if (isPro && !nivelCulinario) {
      setNivelCulinario(
        initialProfile.nivel_culinario || currentStoreProfile?.nivel_culinario || 'Intermedio'
      );
    }
  }, [isPro, initialProfile.nivel_culinario, currentStoreProfile?.nivel_culinario, nivelCulinario]);

  // Inicialización multiselección de Objetivos Clínicos y Patrón Alimentario
  const initialPrefs = isPro ? initialProfile.preferencias_dieteticas || [] : [];
  const matchedObjetivos = OBJETIVOS_CLINICOS.filter((o) =>
    initialPrefs.some(
      (p) =>
        p.toLowerCase() === o.id.toLowerCase() ||
        p.toLowerCase() === o.label.toLowerCase() ||
        p.toLowerCase() === o.key.toLowerCase()
    )
  ).map((o) => o.id);

  const foundPatron = PATRONES_ALIMENTARIOS.find((pa) =>
    initialPrefs.some(
      (p) =>
        p.toLowerCase() === pa.id.toLowerCase() ||
        p.toLowerCase() === pa.label.toLowerCase() ||
        p.toLowerCase() === pa.key.toLowerCase()
    )
  );

  const [objetivosClinicos, setObjetivosClinicos] = useState<string[]>(
    matchedObjetivos.length > 0 ? matchedObjetivos : ['General']
  );
  const [patronAlimentario, setPatronAlimentario] = useState<string>(
    foundPatron?.id || 'Omnívora'
  );

  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Detectar si el usuario ha seleccionado funciones exclusivas PRO:
  // CUALQUIER Nivel Culinario (Principiante, Intermedio o Avanzado) o cualquier patología/patrón clínico
  const hasActivePathologies = useMemo(() => {
    const hasCustomObjectives = objetivosClinicos.some((id) => id !== 'General');
    const hasCustomPattern = patronAlimentario !== 'Omnívora';
    return hasCustomObjectives || hasCustomPattern;
  }, [objetivosClinicos, patronAlimentario]);

  const hasProLevelSelected = Boolean(nivelCulinario);
  const hasSelectedProFeatures = hasProLevelSelected || hasActivePathologies;

  // Instantánea de valores guardados para determinar cambios sucios
  const [savedSnapshot, setSavedSnapshot] = useState<{
    nombre: string;
    nivelCulinario: string | null;
    patronAlimentario: string;
    objetivosClinicos: string[];
  }>({
    nombre: (initialProfile.nombre || '').trim(),
    nivelCulinario: resolvedInitialLevel,
    patronAlimentario: foundPatron?.id || 'Omnívora',
    objetivosClinicos: matchedObjetivos.length > 0 ? matchedObjetivos : ['General'],
  });

  // Detección de cambios sucios (isDirty)
  const isDirty = useMemo(() => {
    const nombreChanged = nombre.trim() !== savedSnapshot.nombre;
    const nivelChanged = nivelCulinario !== savedSnapshot.nivelCulinario;
    const patronChanged = patronAlimentario !== savedSnapshot.patronAlimentario;

    const prevObjs = savedSnapshot.objetivosClinicos.slice().sort().join(',');
    const currObjs = objetivosClinicos.slice().sort().join(',');
    const objsChanged = prevObjs !== currObjs;

    return nombreChanged || nivelChanged || patronChanged || objsChanged;
  }, [nombre, nivelCulinario, patronAlimentario, objetivosClinicos, savedSnapshot]);

  // Referencias para desmontaje seguro (NUNCA persistir funciones PRO si el usuario es FREE)
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;
  const isProRef = useRef(isPro);
  isProRef.current = isPro;
  const hasSelectedProRef = useRef(hasSelectedProFeatures);
  hasSelectedProRef.current = hasSelectedProFeatures;
  const stateRef = useRef({ nombre, nivelCulinario, objetivosClinicos, patronAlimentario });
  stateRef.current = { nombre, nivelCulinario, objetivosClinicos, patronAlimentario };

  // Sincronización proactiva con el store de Zustand si aún no está inicializado
  useEffect(() => {
    if (!currentStoreProfile && initialProfile) {
      setStoreProfile({
        id: initialProfile.id,
        email: initialProfile.email,
        nombre: initialProfile.nombre || null,
        avatar_url: null,
        preferencias_dieteticas: isPro ? initialProfile.preferencias_dieteticas || [] : [],
        alergenos: isPro ? initialProfile.alergenos || [] : [],
        objetivo_calorico_diario: null,
        raciones_defecto: initialProfile.raciones_defecto ?? 4,
        nivel_culinario: isPro ? initialProfile.nivel_culinario || 'Intermedio' : '',
        plan_suscripcion: (initialProfile.plan_suscripcion as any) || 'gratis',
        capturas_mes_actual: 0,
        fecha_ultimo_reinicio: new Date().toISOString(),
        antiguedad_ciclos_mes: 0,
        created_at: initialProfile.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }, [currentStoreProfile, initialProfile, setStoreProfile, isPro]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current && isProRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Solo auto-guardar al salir si es usuario PRO o si solo cambió el nombre sin tocar funciones PRO
      if (dirtyRef.current && (isProRef.current || !hasSelectedProRef.current)) {
        const { nombre, nivelCulinario, objetivosClinicos, patronAlimentario } = stateRef.current;
        if (isProRef.current) {
          const preferenciasActualizadas = [
            ...objetivosClinicos,
            patronAlimentario,
          ].filter(Boolean);
          updateUserProfileAction({
            nombre: nombre.trim(),
            nivel_culinario: nivelCulinario || 'Intermedio',
            preferencias_dieteticas: preferenciasActualizadas,
          })
            .then((res) => {
              if (res.success && res.data) {
                useProfileStore.getState().setProfile(res.data);
              }
            })
            .catch((err) => console.error('Error auto-saving profile on leave:', err));
        } else {
          updateUserProfileAction({
            nombre: nombre.trim(),
          })
            .then((res) => {
              if (res.success && res.data) {
                useProfileStore.getState().setProfile(res.data);
              }
            })
            .catch((err) => console.error('Error auto-saving name on leave:', err));
        }
      }
    };
  }, []);

  // Redirección directa al flujo de pago de Stripe / Miga Pro
  const handleUpgradeToPro = async () => {
    setIsCheckoutLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      console.error('Error al iniciar Checkout de Stripe:', err);
    } finally {
      setIsCheckoutLoading(false);
    }
    // Fallback al modal de Miga Pro si la llamada directa no devuelve URL
    setShowProModal(true);
  };

  const handleToggleObjetivo = (optId: string) => {
    setObjetivosClinicos((prev) => {
      if (optId === 'General') {
        return ['General'];
      }

      const withoutGeneral = prev.filter((id) => id !== 'General');

      if (withoutGeneral.includes(optId)) {
        const next = withoutGeneral.filter((id) => id !== optId);
        return next.length > 0 ? next : ['General'];
      } else {
        return [...withoutGeneral, optId];
      }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    // ==============================================================
    // MURO DE PAGO EN PERFIL (100% PRO PARA LOS 3 NIVELES Y PATOLOGÍAS):
    // Si el usuario es FREE e intenta guardar CUALQUIER nivel culinario
    // (Principiante, Intermedio o Avanzado) o cualquier patología clínica,
    // se bloquea la persistencia en Supabase y se le redirige a Stripe / Miga Pro.
    // ==============================================================
    if (!isPro && hasSelectedProFeatures) {
      handleUpgradeToPro();
      return;
    }

    const preferenciasActualizadas = isPro
      ? [...objetivosClinicos, patronAlimentario].filter(Boolean)
      : undefined;

    startTransition(async () => {
      const res = await updateUserProfileAction({
        nombre: nombre.trim(),
        ...(isPro && nivelCulinario ? { nivel_culinario: nivelCulinario } : {}),
        ...(isPro && preferenciasActualizadas
          ? { preferencias_dieteticas: preferenciasActualizadas }
          : {}),
      });

      if (res.error === 'PRO_SUBSCRIPTION_REQUIRED') {
        handleUpgradeToPro();
        return;
      }

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: t('clinical_success_msg'),
        });
        setSavedSnapshot({
          nombre: nombre.trim(),
          nivelCulinario,
          patronAlimentario,
          objetivosClinicos: [...objetivosClinicos],
        });
        if (res.data) {
          setStoreProfile(res.data);
        } else if (currentStoreProfile) {
          setStoreProfile({
            ...currentStoreProfile,
            nombre: nombre.trim(),
            ...(isPro && nivelCulinario ? { nivel_culinario: nivelCulinario } : {}),
            ...(isPro && preferenciasActualizadas
              ? { preferencias_dieteticas: preferenciasActualizadas }
              : {}),
          });
        }
        setTimeout(() => setStatusMessage(null), 3500);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Ocurrió un error al guardar los cambios.',
        });
      }
    });
  };

  // Textos informativos para los Tooltips (PC) y Botones '?' (Móvil)
  const levelFeatureInfo = useMemo(() => {
    if (language === 'en') {
      return {
        title: 'How Culinary Level Calibration Works (Miga Pro)',
        description:
          'All 3 culinary levels are a 100% Miga Pro feature that calibrates how recipe steps are written when you open any dish:',
        bullets: [
          {
            icon: '🌱',
            label: 'Beginner',
            badge: 'PRO',
            text: 'Expanded step-by-step pedagogical narrative with prominent sensory cards (color, texture & aroma cues) and thermal safety warnings.',
          },
          {
            icon: '🍳',
            label: 'Intermediate',
            badge: 'PRO',
            text: 'Balanced standard technical prose for agile home cooking without elementary warnings.',
          },
          {
            icon: '👨‍🍳',
            label: 'Advanced',
            badge: 'PRO',
            text: 'Concise restaurant-grade technical phrasing (sear, deglaze, emulsify, reduce) without elementary explanations.',
          },
        ],
        footerNote:
          'You can preview the selector here; saving any culinary level (Beginner, Intermediate, or Advanced) requires Miga Pro.',
        closeLabel: 'Got it',
      };
    }

    return {
      title: '¿Para qué sirve el Nivel Culinario? (Miga Pro)',
      description:
        'Los 3 niveles culinarios son una funcionalidad 100% Miga Pro que define cómo se redactan los pasos al abrir cualquier receta en modo cocina:',
      bullets: [
        {
          icon: '🌱',
          label: 'Principiante',
          badge: 'PRO',
          text: 'Relato pedagógico expandido paso a paso con tarjetas sensoriales (cambios de color, texturas y aromas clave) y advertencias de seguridad térmica.',
        },
        {
          icon: '🍳',
          label: 'Intermedio',
          badge: 'PRO',
          text: 'Versión técnica equilibrada con prosa directa, limpia y estructurada para cocina doméstica ágil.',
        },
        {
          icon: '👨‍🍳',
          label: 'Avanzado',
          badge: 'PRO',
          text: 'Lenguaje técnico y sintético de restaurante (marcar, reducir, desglasar, emulsionar) para cocineros experimentados.',
        },
      ],
      footerNote:
        'Puedes explorar los niveles visualmente; guardar cualquier nivel culinario (Principiante, Intermedio o Avanzado) requiere Miga Pro.',
      closeLabel: 'Entendido',
    };
  }, [language]);

  const clinicalFeatureInfo = useMemo(() => {
    if (language === 'en') {
      return {
        title: 'Clinical Model & Dietary Pattern Firewall',
        description:
          'Configure the medical AI engine to analyze every recipe against your digestive, metabolic, and dietary needs:',
        bullets: [
          {
            icon: '🍽️',
            label: 'Dietary Pattern',
            badge: 'PRO',
            text: 'Tailors protein and base ingredients to your lifestyle (Omnivore, Vegetarian, Vegan, Keto, Mediterranean, Paleo).',
          },
          {
            icon: '🛡️',
            label: 'Clinical Pathologies',
            badge: 'PRO',
            text: 'Detects conflicting ingredients (Gluten-Free, Lactose-Free, Low FODMAP, Diabetes, Hypertension, Anti-inflammatory) and replaces them in-line.',
          },
        ],
        footerNote:
          'Explore all 16 clinical conditions freely. Saving active conditions redirects to Miga Pro.',
        closeLabel: 'Got it',
      };
    }

    return {
      title: '¿Qué es el Modelo Clínico y Patrón Alimentario?',
      description:
        'Configura el cortafuegos médico de inteligencia artificial para que cada receta se adapte a tus necesidades de salud:',
      bullets: [
        {
          icon: '🍽️',
          label: 'Patrón Alimentario',
          badge: 'PRO',
          text: 'Ajusta la estructura de tus platos a tu estilo de alimentación (Omnívora, Vegetariana, Vegana, Keto, Mediterránea, Paleo).',
        },
        {
          icon: '🛡️',
          label: 'Patologías y Objetivos Clínicos',
          badge: 'PRO',
          text: 'Detecta ingredientes conflictivos (Sin Gluten, Sin Lactosa, FODMAP, Diabetes, Hipertensión, Antiinflamatoria) y los sustituye manteniendo el sabor.',
        },
      ],
      footerNote:
        'Puedes explorar y probar visualmente todas las patologías; para guardarlas en tu perfil necesitas Miga Pro.',
      closeLabel: 'Entendido',
    };
  }, [language]);

  const initials = (nombre || initialProfile.email.split('@')[0] || 'CH')
    .slice(0, 2)
    .toUpperCase();

  const formattedDate = initialProfile.created_at
    ? new Date(initialProfile.created_at).toLocaleDateString(
        language === 'en' ? 'en-US' : 'es-ES',
        {
          month: 'long',
          year: 'numeric',
        }
      )
    : '2026';

  const selectedPatternObj = PATRONES_ALIMENTARIOS.find((p) => p.id === patronAlimentario);

  return (
    <>
      <form onSubmit={handleSave} className="space-y-6">
        {/* TARJETA 1: Información básica del Chef (Compactada) */}
        <div className="p-3.5 sm:p-5 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] font-bold text-lg sm:text-xl shadow-2xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold font-serif-recipe text-stone-900 leading-tight truncate">
                  {nombre || (language === 'en' ? 'Chef' : 'Chef')}
                </h2>
                {isPro && nivelCulinario && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5] shrink-0">
                    {nivelCulinario}
                  </span>
                )}
                {isPro ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs shrink-0">
                    <Sparkles className="w-3 h-3 text-[#a86224]" /> PRO
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 shrink-0">
                    Free
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 truncate flex items-center gap-1.5">
                <span>{initialProfile.email}</span>
                <span className="text-stone-300">·</span>
                <span>
                  {t('profile_member_since')} {formattedDate}
                </span>
              </p>
            </div>
          </div>

          {/* Campo nombre editable en línea compacta */}
          <div className="pt-2 border-t border-[#f4efe6] flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <label
              htmlFor="chef-nombre"
              className="text-xs font-semibold text-stone-700 flex items-center gap-1.5 shrink-0"
            >
              <User className="w-3.5 h-3.5 text-[#a86224]" />
              <span>{t('profile_chef_name')}:</span>
            </label>
            <input
              id="chef-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={language === 'en' ? 'Your chef name' : 'Tu nombre en la cocina'}
              className="flex-1 px-3 py-1.5 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#a86224] transition"
            />
          </div>
        </div>

        {/* TARJETA 2: Estadísticas Reales de Chef */}
        <div className="p-4 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-[#a86224]" />
            <h3 className="text-lg font-bold font-serif-recipe text-stone-900">
              {t('profile_stats_title')}
            </h3>
          </div>
          <p className="text-xs text-stone-500">{t('profile_stats_desc')}</p>

          <div className="grid grid-cols-4 gap-2 p-3 sm:p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-center">
            {/* Métrica 1: Recetas Guardadas */}
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shadow-2xs">
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <span className="text-base sm:text-2xl font-bold font-serif-recipe text-stone-900 block leading-tight">
                  {stats.totalRecetas}
                </span>
                <span className="text-[9px] sm:text-[11px] font-medium text-stone-500 block truncate">
                  {t('profile_stat_recipes')}
                </span>
              </div>
            </div>

            {/* Métrica 2: Días planificados */}
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-emerald-700 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <span className="text-base sm:text-2xl font-bold font-serif-recipe text-stone-900 block leading-tight">
                  {stats.totalPlanificadas}
                </span>
                <span className="text-[9px] sm:text-[11px] font-medium text-stone-500 block truncate">
                  {t('profile_stat_planned')}
                </span>
              </div>
            </div>

            {/* Métrica 3: Platos cocinados */}
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-amber-700 shadow-2xs">
                <ChefHat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <span className="text-base sm:text-2xl font-bold font-serif-recipe text-stone-900 block leading-tight">
                  {stats.totalCocinados}
                </span>
                <span className="text-[9px] sm:text-[11px] font-medium text-stone-500 block truncate">
                  {t('profile_stat_cooked')}
                </span>
              </div>
            </div>

            {/* Métrica 4: Recetas Favoritas */}
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-rose-600 shadow-2xs">
                <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <span className="text-base sm:text-2xl font-bold font-serif-recipe text-stone-900 block leading-tight">
                  {stats.totalFavoritas}
                </span>
                <span className="text-[9px] sm:text-[11px] font-medium text-stone-500 block truncate">
                  {t('profile_stat_favorites')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TARJETA 3: Nivel Culinario (100% PRO para los 3 niveles: Principiante, Intermedio y Avanzado) */}
        <div className="p-4 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-3 sm:space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ChefHat className="w-5 h-5 text-[#a86224] shrink-0" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold font-serif-recipe text-stone-900">
                    {t('level_title')}
                  </h3>
                  <FeatureInfoTrigger {...levelFeatureInfo} align="left" />
                  {!isPro && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-[#a86224] border border-amber-300/80 text-[10px] font-extrabold uppercase flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Miga Pro</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-0.5">{t('level_desc')}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {NIVELES_CULINARIOS.map((nivel) => {
              const isSelected = nivelCulinario === nivel.id;
              return (
                <button
                  key={nivel.id}
                  type="button"
                  onClick={() => setNivelCulinario(nivel.id)}
                  className={`p-2 sm:p-3.5 rounded-xl sm:rounded-2xl text-left transition border flex flex-col justify-between gap-1 sm:gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[#f4efe6] border-[#a86224] ring-1 ring-[#a86224]/40 shadow-2xs'
                      : 'bg-[#faf7f2] border-[#e7dfd5] hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-1">
                    <span className="text-base sm:text-2xl">{nivel.badge}</span>
                    <div className="flex items-center gap-1">
                      {!isPro && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-[#a86224] border border-amber-300/80 text-[8px] sm:text-[9px] font-extrabold uppercase flex items-center gap-0.5">
                          <Lock className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                          <span>PRO</span>
                        </span>
                      )}
                      {isSelected && (
                        <span className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-[#a86224] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2 sm:w-3 h-2 sm:h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold font-serif-recipe text-stone-900 leading-tight">
                      {language === 'en' ? nivel.labelEn : nivel.label}
                    </h4>
                    <p className="text-[9px] sm:text-[11px] text-stone-600 mt-0.5 leading-snug line-clamp-2">
                      {language === 'en' ? nivel.descEn : nivel.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================== */}
        {/* TARJETA 4: ESCAPARATE PRO - MODELO CLÍNICO & PATRÓN ALIMENTARIO */}
        {/* ============================================================== */}
        <div className="p-4 sm:p-6 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-[#e7dfd5] pb-3">
            <div className="flex items-center gap-2.5">
              <HeartPulse className="w-5 h-5 text-[#a86224] shrink-0" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold font-serif-recipe text-stone-900">
                    {t('clinical_showcase_title')}
                  </h3>
                  <FeatureInfoTrigger {...clinicalFeatureInfo} align="left" />
                  {isPro && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />{' '}
                      {language === 'en' ? 'Firewall Active' : 'Cortafuegos Activo'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  {t('clinical_showcase_desc')}
                </p>
              </div>
            </div>
          </div>

          {/* Resumen de configuración actual y botón para abrir Drawer */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-1.5 flex-1 min-w-0">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  {language === 'en' ? 'Active pattern & conditions' : 'Patrón y patologías activas'}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Patrón alimentario actual */}
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-[#a86224] border border-amber-200/80 text-xs font-semibold flex items-center gap-1">
                    <span>🍽️</span>
                    <span>
                      {selectedPatternObj
                        ? language === 'en'
                          ? selectedPatternObj.labelEn
                          : selectedPatternObj.label
                        : patronAlimentario}
                    </span>
                  </span>

                  {/* Patologías seleccionadas */}
                  {objetivosClinicos.map((id) => {
                    const opt = OBJETIVOS_CLINICOS.find((o) => o.id === id);
                    if (!opt) return null;
                    const badge =
                      opt.id === 'sin_gluten'
                        ? '🌾'
                        : opt.id === 'sin_lactosa'
                        ? '🥛'
                        : opt.id === 'fodmap'
                        ? '🧅'
                        : opt.id === 'baja_histamina'
                        ? '🧀'
                        : opt.id === 'diabetes'
                        ? '🩸'
                        : opt.id === 'hipertension'
                        ? '❤️'
                        : opt.id === 'hipercolesterolemia'
                        ? '🫀'
                        : opt.id === 'enfermedad_renal'
                        ? '🫘'
                        : opt.id === 'acido_urico_gota'
                        ? '🥩'
                        : opt.id === 'reflujo_gastritis'
                        ? '🍋'
                        : opt.id === 'blanda_gastrointestinal'
                        ? '🥣'
                        : opt.id === 'antiinflamatoria'
                        ? '🌿'
                        : '✨';

                    return (
                      <span
                        key={id}
                        className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold flex items-center gap-1 shadow-2xs"
                      >
                        <span>{badge}</span>
                        <span>{language === 'en' ? opt.labelEn : opt.label}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Botón flotante para abrir el Drawer */}
              <button
                type="button"
                onClick={() => setIsClinicalDrawerOpen(true)}
                className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#f4efe6] hover:bg-[#eae1d2] border border-[#e7dfd5] text-xs font-semibold text-stone-800 hover:text-[#a86224] transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0 self-start sm:self-center"
              >
                <Settings className="w-3.5 h-3.5 text-[#a86224]" />
                <span>
                  {language === 'en'
                    ? 'Modify conditions & pattern'
                    : 'Modificar patologías y patrón'}
                </span>
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* BLOQUEO FREEMIUM / ESCAPARATE DE CONVERSIÓN PRO                */}
          {/* ============================================================== */}
          {!isPro ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/95 via-[#fbf9f5] to-amber-100/60 border border-amber-200/90 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#a86224] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-stone-900 leading-snug">
                    {t('clinical_locked_title')}
                  </h4>
                  <p className="text-xs text-stone-700 leading-relaxed font-light">
                    {t('clinical_locked_desc')}
                  </p>
                </div>
              </div>

              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#a86224]" />
                  <span>{t('profile_unlock_unlimited')}</span>
                </div>

                <button
                  type="button"
                  onClick={handleUpgradeToPro}
                  disabled={isCheckoutLoading}
                  className="min-h-[44px] px-6 py-2.5 rounded-2xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#a86224] to-[#c27835] hover:from-[#8e511c] hover:to-[#a86224] transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCheckoutLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('profile_connecting_stripe')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-200" />
                      <span>{t('clinical_upgrade_btn')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-xs font-semibold text-emerald-900">
                {language === 'en'
                  ? 'Clinical firewall active: AI recipes will strictly exclude pro-inflammatory ingredients and adapt to your health profile.'
                  : 'Cortafuegos clínico activo: Nuestro algoritmo adaptará tus recetas excluyendo de forma estricta los ingredientes proinflamatorios según tu salud.'}
              </p>
            </div>
          )}
        </div>

        {/* Mensajes de feedback */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Botón de Guardado (Intercepta y redirige a Miga Pro / Stripe si Free seleccionó cualquier nivel culinario o patologías) */}
        <div className="pt-2 space-y-2">
          {!isPro && hasSelectedProFeatures && (
            <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs flex items-center gap-2.5 animate-fade-in">
              <Lock className="w-4 h-4 text-[#a86224] shrink-0" />
              <span>
                {language === 'en'
                  ? 'You have selected Miga Pro features (culinary level or clinical conditions). Clicking "Save changes" will redirect you to Miga Pro.'
                  : 'Has seleccionado funciones exclusivas de Miga Pro (nivel culinario o patologías clínicas). Al pulsar "Guardar cambios" pasarás a la suscripción Miga Pro.'}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || isCheckoutLoading}
            className={`w-full min-h-[50px] py-3.5 px-6 rounded-2xl font-semibold text-sm text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
              !isPro && hasSelectedProFeatures
                ? 'bg-gradient-to-r from-[#a86224] to-[#c27835] hover:from-[#8e511c] hover:to-[#a86224] ring-2 ring-[#a86224]/30'
                : isDirty
                ? 'bg-[#a86224] hover:bg-[#8e511c] ring-2 ring-[#a86224]/30'
                : 'bg-stone-800 hover:bg-stone-900'
            }`}
          >
            {isPending || isCheckoutLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>
                  {isCheckoutLoading ? t('profile_connecting_stripe') : t('clinical_saving_btn')}
                </span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>
                  {isDirty
                    ? language === 'en'
                      ? 'Save changes'
                      : 'Guardar cambios'
                    : t('clinical_save_btn')}
                </span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* ============================================================== */}
      {/* DRAWER FLOTANTE PARA PATOLOGÍAS Y PATRÓN ALIMENTARIO           */}
      {/* ============================================================== */}
      <Drawer.Root open={isClinicalDrawerOpen} onOpenChange={setIsClinicalDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 transition-opacity" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] bg-[#fbf9f5] rounded-t-[32px] border-t border-[#e7dfd5] shadow-2xl flex flex-col focus:outline-none max-w-xl mx-auto overflow-hidden">
            <div className="w-12 h-1.5 rounded-full bg-stone-300 mx-auto mt-3 mb-1 shrink-0 cursor-grab active:cursor-grabbing" />

            <div className="px-5 py-3 border-b border-[#e7dfd5] flex items-center justify-between shrink-0 bg-white">
              <div>
                <Drawer.Title className="text-lg font-bold font-serif-recipe text-stone-900 leading-tight">
                  {language === 'en' ? 'Clinical Profile & Diet' : 'Perfil Clínico y Patrón'}
                </Drawer.Title>
                <Drawer.Description className="text-xs text-stone-500 mt-0.5">
                  {language === 'en'
                    ? 'Select conditions to personalize clinical firewall'
                    : 'Selecciona condiciones para adaptar tu cortafuegos clínico'}
                </Drawer.Description>
              </div>
              <button
                type="button"
                onClick={() => setIsClinicalDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f4efe6] hover:bg-[#eae1d2] text-stone-600 flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Selector de Patrón Alimentario */}
              <div className="space-y-2">
                <label
                  htmlFor="drawer-select-patron-alimentario"
                  className="text-xs font-bold text-stone-800 flex items-center gap-1.5"
                >
                  <span>{t('clinical_pattern_label')}</span>
                </label>
                <div className="relative">
                  <select
                    id="drawer-select-patron-alimentario"
                    value={patronAlimentario}
                    onChange={(e) => setPatronAlimentario(e.target.value)}
                    className="w-full appearance-none min-h-[44px] px-3.5 py-2 pr-10 rounded-xl border border-[#e7dfd5] text-stone-900 text-xs sm:text-sm font-semibold transition bg-white focus:outline-none focus:border-[#a86224] cursor-pointer"
                  >
                    {PATRONES_ALIMENTARIOS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {language === 'en' ? opt.labelEn : opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
                {selectedPatternObj && (
                  <p className="text-xs text-stone-600 font-light px-1">
                    {language === 'en' ? selectedPatternObj.descEn : selectedPatternObj.desc}
                  </p>
                )}
              </div>

              {/* Listado Completo de Patologías */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <span>{t('clinical_objective_label')}</span>
                  </label>
                  <span className="text-[11px] text-stone-500 font-medium">
                    {objetivosClinicos.filter((id) => id !== 'General').length > 0
                      ? `${objetivosClinicos.filter((id) => id !== 'General').length} seleccionados`
                      : t('profile_conditions_count')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {OBJETIVOS_CLINICOS.map((opt) => {
                    const isSelected = objetivosClinicos.includes(opt.id);
                    const badge =
                      opt.id === 'sin_gluten'
                        ? '🌾'
                        : opt.id === 'sin_lactosa'
                        ? '🥛'
                        : opt.id === 'fodmap'
                        ? '🧅'
                        : opt.id === 'baja_histamina'
                        ? '🧀'
                        : opt.id === 'diabetes'
                        ? '🩸'
                        : opt.id === 'hipertension'
                        ? '❤️'
                        : opt.id === 'hipercolesterolemia'
                        ? '🫀'
                        : opt.id === 'enfermedad_renal'
                        ? '🫘'
                        : opt.id === 'acido_urico_gota'
                        ? '🥩'
                        : opt.id === 'reflujo_gastritis'
                        ? '🍋'
                        : opt.id === 'blanda_gastrointestinal'
                        ? '🥣'
                        : opt.id === 'antiinflamatoria'
                        ? '🌿'
                        : '✨';

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleToggleObjetivo(opt.id)}
                        className={`min-h-[38px] py-1.5 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-1.5 cursor-pointer select-none active:scale-95 ${
                          isSelected
                            ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-900 shadow-2xs'
                            : 'bg-white hover:bg-[#faf7f2] border border-[#e7dfd5] text-stone-700 hover:border-stone-400 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm leading-none shrink-0">{badge}</span>
                          <span className="truncate">
                            {language === 'en' ? opt.labelEn : opt.label}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#e7dfd5] bg-white">
              <button
                type="button"
                onClick={() => setIsClinicalDrawerOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-[#a86224] hover:bg-[#8e511c] transition cursor-pointer"
              >
                {language === 'en' ? 'Done' : 'Listo'}
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Modal flotante de suscripción PRO (Renderizado fuera del <form> principal) */}
      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        context="feature_locked"
        highlightCulinaryLevels={true}
        onVipSuccess={() => {
          setIsVipUpgraded(true);
          setShowProModal(false);
        }}
      />
    </>
  );
}
