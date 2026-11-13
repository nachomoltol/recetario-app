'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Layers,
  Sparkles,
  ChevronDown,
  Clock,
  Thermometer,
  Flame,
  ChefHat,
  Eye,
  Lock,
  Loader2,
} from 'lucide-react';
import { RecetaIngrediente, Paso } from '@/types/recipe';
import {
  scaleIngredientsWithCulinaryHeuristics,
  scaleCookingTime,
  isBakingOrPastryContext,
} from '@/lib/culinary/scaler';
import { replaceIngredientInText } from '@/lib/culinary/textReplacer';
import { scaleStepQuantities } from '@/lib/culinary/stepQuantityScaler';
import { ServingsScaler } from './ServingsScaler';
import { ShoppingListMode } from './ShoppingListMode';
import { FormattedText } from '@/components/ui/FormattedText';
import { FeatureInfoTrigger } from '@/components/ui/FeatureInfoTrigger';
import dynamic from 'next/dynamic';

const ProSubscriptionModal = dynamic(
  () => import('@/components/subscription/ProSubscriptionModal').then((m) => m.ProSubscriptionModal),
  { ssr: false }
);
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { SubstituteOption } from '@/app/actions/suggestSubstitute';
import { generateCulinaryLevelAction } from '@/app/actions/generateCulinaryLevelAction';

export type CulinaryLevel = 'principiante' | 'intermedio' | 'avanzado';
export type NivelCulinarioUI = CulinaryLevel | 'Principiante' | 'Intermedio' | 'Avanzado';

export function normalizeNivelCulinario(val?: string | null): CulinaryLevel {
  if (!val) return 'intermedio';
  const clean = val.trim().toLowerCase();
  if (clean === 'avanzado' || clean === 'advanced') return 'avanzado';
  if (clean === 'principiante' || clean === 'beginner') return 'principiante';
  return 'intermedio';
}

/**
 * Normaliza la temperatura de cocción técnica según el método (horno vs fuego directo en sartén/olla/plancha)
 */
function formatStepHeat(
  tempCelsius: number | null | undefined,
  instructionText: string,
  potenciaFuego?: string | null,
  lang: 'es' | 'en' = 'es'
): { label: string; isBaking: boolean } | null {
  const norm = instructionText.toLowerCase();

  const isBakingText =
    /\b(horno|hornear|hornea|hornealo|horneala|horneados|horneadas|precalentar|precalienta|oven|bake|baking|baked|airfryer|air\s*fryer|freidora\s+de\s+aire)\b/i.test(
      norm
    );

  const potencia = (potenciaFuego || '').trim().toLowerCase();

  if (potencia === 'horno' || isBakingText) {
    return {
      label:
        typeof tempCelsius === 'number' && tempCelsius > 0
          ? `${tempCelsius}°C`
          : lang === 'en'
          ? 'Oven'
          : 'Horno',
      isBaking: true,
    };
  }

  if (potencia === 'alto') {
    return { label: lang === 'en' ? 'High heat' : 'Fuego alto', isBaking: false };
  } else if (potencia === 'medio-alto') {
    return { label: lang === 'en' ? 'Medium-high heat' : 'Fuego medio-alto', isBaking: false };
  } else if (potencia === 'medio') {
    return { label: lang === 'en' ? 'Medium heat' : 'Fuego medio', isBaking: false };
  } else if (potencia === 'suave') {
    return { label: lang === 'en' ? 'Low heat' : 'Fuego suave / lento', isBaking: false };
  }

  // Fallback termodinámico mediante temperatura_celsius clásica
  if (typeof tempCelsius === 'number' && tempCelsius > 0) {
    if (tempCelsius >= 190) {
      return {
        label: lang === 'en' ? 'High heat' : 'Fuego alto',
        isBaking: false,
      };
    } else if (tempCelsius >= 170) {
      return {
        label: lang === 'en' ? 'Medium-high heat' : 'Fuego medio-alto',
        isBaking: false,
      };
    } else if (tempCelsius >= 130) {
      return {
        label: lang === 'en' ? 'Medium heat' : 'Fuego medio',
        isBaking: false,
      };
    } else {
      return {
        label: lang === 'en' ? 'Low heat' : 'Fuego suave / lento',
        isBaking: false,
      };
    }
  }

  return null;
}

interface RecipeInteractiveSectionsProps {
  recetaId: string;
  tituloReceta: string;
  basePorciones: number;
  tiempoCoccionMin: number | null;
  ingredientes: RecetaIngrediente[];
  pasos: Paso[];
  defaultServings?: number;
  onSubstitutePersist?: (
    currentTarget: string,
    newName: string | null,
    adaptedBaseName?: string,
    substituteOption?: SubstituteOption | null
  ) => void;
  isAdapted?: boolean;
  userProfile?: any;
  rolPlato?: string | null;
  categoriasGastronomicas?: string[] | null;
  onServingsChange?: (servings: number) => void;
  onLevelChange?: (level: NivelCulinarioUI | null) => void;
  onStepsUpdated?: (newSteps: Paso[]) => void;
}

export function RecipeInteractiveSections({
  recetaId,
  tituloReceta,
  basePorciones,
  tiempoCoccionMin,
  ingredientes,
  pasos,
  defaultServings,
  onSubstitutePersist,
  isAdapted,
  userProfile,
  rolPlato,
  categoriasGastronomicas,
  onServingsChange,
  onLevelChange,
  onStepsUpdated,
}: RecipeInteractiveSectionsProps) {
  const t = useLanguageStore((s) => s.t);
  const searchParams = useSearchParams();
  const isFromPlanner = searchParams?.get('from') === 'planner';
  const plannerServings =
    isFromPlanner && searchParams?.get('servings')
      ? Number(searchParams.get('servings'))
      : null;

  // Solo si la URL contiene explícitamente from=planner y servings se inicializa con dicho valor;
  // al abrir la receta desde el recetario o colección, el estado inicial DEBE ser SIEMPRE la base de la receta.
  const resolvedInitialServings =
    plannerServings && plannerServings > 0
      ? plannerServings
      : isFromPlanner && defaultServings && defaultServings > 0
      ? defaultServings
      : basePorciones || 2;

  const [servings, setServings] = useState(resolvedInitialServings);
  const [mobileTab, setMobileTab] = useState<'ingredients' | 'steps'>('ingredients');
  const [isIngredientsOpen, setIsIngredientsOpen] = useState(true);
  const [isStepsOpen, setIsStepsOpen] = useState(true);
  const [substitutions, setSubstitutions] = useState<Record<string, string>>({});
  const [showProLevelModal, setShowProLevelModal] = useState(false);
  const prevRecetaIdRef = useRef(recetaId);

  // Sincronizar comensales: preservar la selección activa del usuario al cambiar de modo (adaptado vs original)
  useEffect(() => {
    if (prevRecetaIdRef.current !== recetaId) {
      prevRecetaIdRef.current = recetaId;
      if (isFromPlanner && plannerServings && plannerServings > 0) {
        setServings(plannerServings);
      } else if (isFromPlanner && defaultServings && defaultServings > 0) {
        setServings(defaultServings);
      } else {
        setServings(basePorciones || 2);
      }
      return;
    }

    if (isFromPlanner && plannerServings && plannerServings > 0) {
      setServings(plannerServings);
    }
  }, [recetaId, basePorciones, isFromPlanner, plannerServings, defaultServings]);

  // Limpiar sustituciones activas cuando cambia la receta o cuando se aplica/revierte una adaptación
  useEffect(() => {
    setSubstitutions({});
  }, [recetaId, isAdapted]);

  const handleSubstituteChange = (
    currentTarget: string,
    newName: string | null,
    adaptedBaseName?: string,
    substituteOption?: SubstituteOption | null
  ) => {
    const cleanTarget = String(currentTarget || '')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .trim();
    const cleanNew = newName
      ? String(newName)
          .replace(/<\/?[^>]+(>|$)/g, '')
          .trim()
      : null;
    const baseKey = String(adaptedBaseName || cleanTarget)
      .replace(/<\/?[^>]+(>|$)/g, '')
      .trim();

    setSubstitutions((prev) => {
      const next = { ...prev };
      delete next[cleanTarget];
      delete next[baseKey];

      if (cleanNew && cleanNew.toLowerCase() !== baseKey.toLowerCase()) {
        next[baseKey] = cleanNew;
      }
      return next;
    });

    onSubstitutePersist?.(cleanTarget, cleanNew, baseKey, substituteOption);
  };

  const [currentSteps, setCurrentSteps] = useState<Paso[]>(Array.isArray(pasos) ? pasos : []);
  const [isGeneratingLevel, setIsGeneratingLevel] = useState<'principiante' | 'avanzado' | null>(
    null
  );

  useEffect(() => {
    const incoming = Array.isArray(pasos) ? pasos : [];
    setCurrentSteps((prevSteps) => {
      if (!prevSteps || prevSteps.length === 0) return incoming;
      return incoming.map((inc, idx) => {
        const existing =
          prevSteps.find((p) => p.id && inc.id && p.id === inc.id) ||
          prevSteps[idx];
        if (!existing) return { ...inc, orden: idx + 1 };
        return {
          ...inc,
          orden: idx + 1,
          instruccion_principiante:
            inc.instruccion_principiante || existing.instruccion_principiante || null,
          instruccion_avanzada:
            inc.instruccion_avanzada || existing.instruccion_avanzada || null,
          descriptor_sensorial:
            inc.descriptor_sensorial || existing.descriptor_sensorial || null,
        };
      });
    });
  }, [pasos]);

  const safePasos = Array.isArray(currentSteps) ? currentSteps : [];
  const safeIngredientes = Array.isArray(ingredientes) ? ingredientes : [];

  const language = useLanguageStore((s) => s.language);
  const ratio = servings / (basePorciones || 2);

  const isBaking = useMemo(() => {
    return isBakingOrPastryContext({
      rol_plato: rolPlato,
      titulo: tituloReceta,
      categorias: categoriasGastronomicas,
      ingredientes: safeIngredientes,
    });
  }, [rolPlato, tituloReceta, categoriasGastronomicas, safeIngredientes]);

  // Escalado inteligente con conciencia culinaria (respetando 'al gusto' / 'to taste' como invariable sin número 1 previo)
  const scaledIngredientes = useMemo(() => {
    const rawScaled = scaleIngredientsWithCulinaryHeuristics(
      safeIngredientes,
      basePorciones || 2,
      servings,
      {
        rol_plato: rolPlato,
        titulo: tituloReceta,
        categorias: categoriasGastronomicas,
        isBaking,
      }
    );
    return rawScaled.map((ing) => {
      const cleanU = (ing.unidad || '').replace(/^\s*1\s+(?=(al\s+gusto|to\s+taste)\b)/i, '').trim();
      if (/^(al\s+gusto|a\s+gusto|to\s+taste|c\/n|c\.n\.|cn)$/i.test(cleanU)) {
        return {
          ...ing,
          cantidad: 1,
          cantidad_escalada: 1,
          unidad: language === 'en' ? 'to taste' : 'al gusto',
          rol_culinario: 'invariable',
        };
      }
      return ing;
    });
  }, [safeIngredientes, basePorciones, servings, language, rolPlato, tituloReceta, categoriasGastronomicas, isBaking]);

  const scaledTiempoCoccion = tiempoCoccionMin
    ? scaleCookingTime(tiempoCoccionMin, basePorciones || 2, servings, {
        titulo: tituloReceta,
        isBaking,
        pasos: safePasos,
      })
    : null;

  // ==============================================================
  // MONETIZACIÓN Y COMPORTAMIENTO POR NIVEL CULINARIO ON-DEMAND
  // ==============================================================
  const profileFromStore = useProfileStore((s) => s.profile);
  const resolvedPlan = (
    profileFromStore?.plan_suscripcion ||
    userProfile?.plan_suscripcion ||
    'gratis'
  )
    .trim()
    .toLowerCase();
  const isPro = resolvedPlan === 'pro' || Boolean(userProfile?.is_pro);

  // El nivel activo lee prioritariamente de localStorage para esta receta o del perfil del usuario
  const [activeLevel, setActiveLevel] = useState<CulinaryLevel>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`miga_recipe_level_${recetaId}`);
        if (stored) {
          const normStored = normalizeNivelCulinario(stored);
          if (normStored) return normStored;
        }
      } catch (e) {
        // Ignorar fallos de acceso a localStorage en modo privado/incógnito
      }
    }
    const profileLevel = userProfile?.nivel_culinario || profileFromStore?.nivel_culinario;
    return profileLevel ? normalizeNivelCulinario(profileLevel) : 'intermedio';
  });

  const effectiveActiveLevel: CulinaryLevel = isPro ? activeLevel : 'intermedio';

  useEffect(() => {
    onServingsChange?.(servings);
  }, [servings, onServingsChange]);

  useEffect(() => {
    onLevelChange?.(effectiveActiveLevel);
  }, [effectiveActiveLevel, onLevelChange]);

  // Manejador de clic en el microselector [ 🌱 | 🍳 | 👨‍🍳 ] con generación On-Demand
  const handleLevelSelect = async (rawTargetLevel: CulinaryLevel | NivelCulinarioUI) => {
    const targetLevel: CulinaryLevel = normalizeNivelCulinario(rawTargetLevel);

    if (!isPro && targetLevel !== 'intermedio') {
      setShowProLevelModal(true);
      return;
    }

    // Persistir elección en localStorage para que se mantenga al recargar o volver
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`miga_recipe_level_${recetaId}`, targetLevel);
      } catch (e) {
        // Ignorar
      }
    }

    if (targetLevel === 'intermedio') {
      setActiveLevel('intermedio');
      return;
    }

    // Nivel 'principiante' o 'avanzado' para usuario PRO
    const alreadyHasLevel = currentSteps.some((p) =>
      targetLevel === 'principiante'
        ? !!p.instruccion_principiante
        : !!p.instruccion_avanzada
    );

    if (alreadyHasLevel) {
      setActiveLevel(targetLevel);
      return;
    }

    setActiveLevel(targetLevel);
    setIsGeneratingLevel(targetLevel);

    try {
      const res = await generateCulinaryLevelAction({
        recetaId,
        nivel: targetLevel,
        titulo: tituloReceta,
        porciones: servings,
        ingredientes: safeIngredientes,
        pasos: currentSteps,
        idioma: (language as 'es' | 'en') || 'es',
      });

      if (res.success && Array.isArray(res.pasos)) {
        const nextSteps = res.pasos!.map((updated, idx) => {
          const prev =
            currentSteps.find((p) => p.id && updated.id && p.id === updated.id) ||
            currentSteps[idx];
          return {
            ...prev,
            ...updated,
            orden: idx + 1,
            instruccion_principiante:
              updated.instruccion_principiante || prev?.instruccion_principiante || null,
            instruccion_avanzada:
              updated.instruccion_avanzada || prev?.instruccion_avanzada || null,
            descriptor_sensorial:
              updated.descriptor_sensorial || prev?.descriptor_sensorial || null,
          };
        });

        setCurrentSteps(nextSteps);
        onStepsUpdated?.(nextSteps);
      }
    } catch (err) {
      console.error('Error generando nivel culinario on-demand:', err);
    } finally {
      setIsGeneratingLevel(null);
    }
  };

  // Textos para la Capa Informativa (Tooltip en PC y Bottom Sheet '?' en Móvil)
  const levelInfoProps = useMemo(() => {
    if (language === 'en') {
      return {
        title: 'Pedagogical Calibration & Culinary Levels (Miga Pro)',
        description:
          'Culinary levels adapt each step on demand to match your cooking experience:',
        bullets: [
          {
            icon: '🌱',
            label: 'Beginner',
            badge: 'PRO',
            text: 'Didactic step-by-step guidance with practical warnings and clear visual/sensory cues.',
          },
          {
            icon: '🍳',
            label: 'Intermediate',
            badge: 'BASE',
            text: 'Canonical, direct and clean step-by-step instructions faithful to the original creator.',
          },
          {
            icon: '👨‍🍳',
            label: 'Advanced',
            badge: 'PRO',
            text: 'Practical chef craft optimizing parallel tasks, resting times, deglazing and emulsions.',
          },
        ],
        footerNote: isPro
          ? 'Miga Pro Active: Generate and switch between Beginner, Intermediate and Advanced.'
          : 'Subscribe to Miga Pro to unlock Beginner and Advanced culinary levels.',
        closeLabel: 'Got it',
      };
    }

    return {
      title: 'Calibración Pedagógica y Niveles Culinarios (Miga Pro)',
      description:
        'Los niveles culinarios adaptan bajo demanda el relato de cada paso según tu experiencia en cocina:',
      bullets: [
        {
          icon: '🌱',
          label: 'Principiante',
          badge: 'PRO',
          text: 'Guía didáctica y cercana con prevención de errores típicos y señales visuales claras.',
        },
        {
          icon: '🍳',
          label: 'Intermedio',
          badge: 'BASE',
          text: 'Versión canónica, directa y limpia fiel a la receta original.',
        },
        {
          icon: '👨‍🍳',
          label: 'Avanzado',
          badge: 'PRO',
          text: 'Criterio de cocinero práctico: aprovecha tiempos muertos y aplica técnicas reales de sabor.',
        },
      ],
      footerNote: isPro
        ? 'Miga Pro Activo: Conmuta entre Principiante, Intermedio y Avanzado.'
        : 'Suscríbete a Miga Pro para desbloquear los niveles Principiante y Avanzado.',
      closeLabel: 'Entendido',
    };
  }, [language, isPro]);

  // Reactividad dinámica: escalado métrico, calibración pedagógica por nivel y sustitución de ingredientes
  const reactivePasos = useMemo(() => {
    const activeSubs = Object.entries(substitutions).filter(
      (entry): entry is [string, string] => Boolean(entry[1])
    );
    const usageTracker = new Map<string, number>();

    return safePasos.map((paso) => {
      const baseInstruction = String(paso?.instruccion || '');
      const rawBeginner = (paso as any)?.instruccion_principiante
        ? String((paso as any).instruccion_principiante).trim()
        : undefined;
      const rawAdvanced = (paso as any)?.instruccion_avanzada
        ? String((paso as any).instruccion_avanzada).trim()
        : undefined;
      const rawSensory = (paso as any)?.descriptor_sensorial
        ? String((paso as any).descriptor_sensorial).trim()
        : undefined;

      const stepScaledTime = paso.tiempo_estimado_min
        ? scaleCookingTime(
            paso.tiempo_estimado_min,
            basePorciones || 2,
            servings,
            {
              instruccion: baseInstruction,
              potencia_fuego: (paso as any)?.potencia_fuego,
              isBaking,
            }
          )
        : null;

      let instruccion = baseInstruction;
      let descriptorSensorial: string | undefined = undefined;

      if (!isPro || effectiveActiveLevel === 'intermedio') {
        instruccion = baseInstruction;
      } else if (effectiveActiveLevel === 'principiante') {
        instruccion = rawBeginner || baseInstruction;
        descriptorSensorial = rawSensory || undefined;
      } else if (effectiveActiveLevel === 'avanzado') {
        instruccion = rawAdvanced || baseInstruction;
      }

      let consejo = paso?.consejo_pro ? String(paso.consejo_pro).trim() : undefined;

      // 1. Escalar cantidades numéricas integradas en el texto si ratio !== 1 o si es receta adaptada
      if ((ratio !== 1 || isAdapted) && scaledIngredientes.length > 0) {
        const snapshotTracker = new Map(usageTracker);
        instruccion = scaleStepQuantities(
          instruccion,
          scaledIngredientes,
          ratio,
          language,
          servings,
          usageTracker
        );
        if (descriptorSensorial) {
          descriptorSensorial = scaleStepQuantities(
            descriptorSensorial,
            scaledIngredientes,
            ratio,
            language,
            servings,
            new Map(snapshotTracker)
          );
        }
        if (consejo) {
          consejo = scaleStepQuantities(
            consejo,
            scaledIngredientes,
            ratio,
            language,
            servings,
            new Map(snapshotTracker)
          );
        }
      }

      // 2. Aplicar sustitución de ingredientes si existen
      for (const [adaptedBase, newName] of activeSubs) {
        instruccion = replaceIngredientInText(instruccion, adaptedBase, newName);
        if (descriptorSensorial) {
          descriptorSensorial = replaceIngredientInText(
            descriptorSensorial,
            adaptedBase,
            newName
          );
        }
        if (consejo) {
          consejo = replaceIngredientInText(consejo, adaptedBase, newName);
        }
      }

      return {
        ...paso,
        instruccion,
        descriptor_sensorial: descriptorSensorial,
        potencia_fuego: (paso as any)?.potencia_fuego || null,
        tiempo_estimado_min: stepScaledTime ?? paso.tiempo_estimado_min,
        consejo_pro: consejo,
      };
    });
  }, [
    safePasos,
    substitutions,
    ratio,
    scaledIngredientes,
    language,
    isAdapted,
    servings,
    effectiveActiveLevel,
    isPro,
    basePorciones,
    isBaking,
  ]);

  // Renderizado unificado de pasos interactivos
  const renderStepsList = () => {
    if (isGeneratingLevel) {
      const levelLabel =
        isGeneratingLevel === 'principiante'
          ? language === 'en'
            ? 'Beginner'
            : 'Principiante'
          : language === 'en'
          ? 'Advanced'
          : 'Avanzado';

      return (
        <div className="py-12 px-4 sm:px-6 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex flex-col items-center justify-center text-center gap-3 animate-fade-in">
          <div className="w-11 h-11 rounded-2xl bg-white border border-[#e7dfd5] text-brand-primary flex items-center justify-center shadow-2xs">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-sm sm:text-base font-serif-recipe font-medium text-stone-800 max-w-md">
            {language === 'en'
              ? `Adapting step-by-step to ${levelLabel} level with culinary craft...`
              : `Adaptando paso a paso al nivel ${levelLabel} con criterio culinario...`}
          </p>
        </div>
      );
    }

    return (
      <ol className="space-y-5 md:space-y-7 pt-1 md:pt-0">
        {reactivePasos.map((paso, idx) => {
          const heat = formatStepHeat(
            paso.temperatura_celsius,
            paso.instruccion,
            (paso as any).potencia_fuego,
            (language as 'es' | 'en') || 'es'
          );

          return (
            <li key={paso?.id || `paso-${idx}`} className="flex gap-3 sm:gap-5 group">
              <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-brand-primary font-serif-recipe font-bold text-sm sm:text-base flex items-center justify-center shrink-0 self-start mt-0.5 shadow-2xs">
                {idx + 1}
              </span>

              <div className="space-y-2.5 sm:space-y-3 flex-1 min-w-0">
                <p
                  className={`text-sm sm:text-lg text-stone-800 leading-relaxed ${
                    effectiveActiveLevel === 'avanzado'
                      ? 'font-medium tracking-tight'
                      : effectiveActiveLevel === 'principiante'
                      ? 'font-normal text-stone-900'
                      : 'font-light'
                  }`}
                >
                  <FormattedText text={paso.instruccion} />
                </p>

                {/* MODO PRINCIPIANTE (PRO): Tarjeta / Badge Sensorial prominente si existe en BD */}
                {isPro && effectiveActiveLevel === 'principiante' && paso.descriptor_sensorial && (
                  <div className="space-y-2 animate-fade-in">
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 via-[#fffcf5] to-amber-100/70 border-2 border-amber-300/90 text-amber-950 text-xs sm:text-sm flex items-start gap-2.5 shadow-xs">
                      <div className="w-7 h-7 rounded-xl bg-brand-primary text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-200/80 text-[#8a4e1b] border border-amber-300">
                            {language === 'en'
                              ? 'Sensory Cue · Color, Texture & Aroma'
                              : 'Guía Sensorial · Color, Textura y Aroma'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-medium">
                          {paso.descriptor_sensorial}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {(paso.tiempo_estimado_min || heat || paso.consejo_pro) && (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1 text-xs text-stone-600">
                    {paso.tiempo_estimado_min && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-700 font-medium">
                        <Clock className="w-3.5 h-3.5 text-brand-primary" />
                        {paso.tiempo_estimado_min} min
                      </span>
                    )}

                    {heat && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-700 font-medium">
                        {heat.isBaking ? (
                          <Thermometer className="w-3.5 h-3.5 text-brand-primary" />
                        ) : (
                          <Flame className="w-3.5 h-3.5 text-[#e05d26]" />
                        )}
                        {heat.label}
                      </span>
                    )}

                    {paso.consejo_pro && (
                      <div className="w-full mt-1.5 sm:mt-2 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-[#e7dfd5] bg-[#faf7f2] text-stone-700 text-xs sm:text-sm font-light">
                        <span className="font-semibold text-brand-primary">{t('recipe_chef_tip')}</span>{' '}
                        <FormattedText text={paso.consejo_pro} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    );
  };

  return (
    <div className="pt-2 space-y-6 md:space-y-8">
      {/* ============================================================== */}
      {/* VISTA MÓVIL (< 768px): PESTAÑAS DIRECTAS TIPO APP NATIVA       */}
      {/* ============================================================== */}
      <div className="md:hidden sticky top-2 z-20 bg-stone-100/95 backdrop-blur-md p-1.5 rounded-2xl border border-[#e7dfd5] shadow-xs flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setMobileTab('ingredients')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-serif-recipe text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'ingredients'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
          }`}
        >
          <span>🛒</span>
          <span>{t('recipe_section_ingredients')}</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans font-semibold ${
              mobileTab === 'ingredients'
                ? 'bg-white/20 text-white'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            {safeIngredientes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('steps')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-serif-recipe text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'steps'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
          }`}
        >
          <span>🍳</span>
          <span>{t('recipe_section_prep')}</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans font-semibold ${
              mobileTab === 'steps'
                ? 'bg-white/20 text-white'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            {safePasos.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SECCIÓN 1: INGREDIENTES CON ESCALADO Y MODO COMPRA             */}
      {/* ============================================================== */}
      <section
        className={`rounded-3xl bg-white border border-[#e7dfd5] shadow-xs overflow-hidden transition-all ${
          mobileTab !== 'ingredients' ? 'hidden md:block' : 'block'
        }`}
      >
        {/* Cabecera de Acordeón para Escritorio (>= 768px) */}
        <button
          type="button"
          onClick={() => setIsIngredientsOpen(!isIngredientsOpen)}
          aria-expanded={isIngredientsOpen}
          className="hidden md:flex w-full min-h-[58px] p-5 sm:p-6 items-center justify-between gap-4 text-left hover:bg-[#faf7f2] transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f4efe6] border border-[#e7dfd5] text-brand-primary flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900 leading-none">
                {t('recipe_section_ingredients')}
              </h2>
              <span className="text-xs text-stone-500 font-medium mt-1 block">
                {servings}{' '}
                {servings === 1 ? t('recipe_serving_single') : t('recipe_servings_plural')} ·{' '}
                {safeIngredientes.length} {t('recipe_items')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f4efe6] text-brand-primary border border-[#e7dfd5]">
              {isIngredientsOpen ? t('recipe_collapse') : t('recipe_expand')}
            </span>
            <div
              className={`w-8 h-8 rounded-full bg-[#f4efe6] text-stone-600 flex items-center justify-center transition-transform duration-200 ${
                isIngredientsOpen ? 'rotate-180 text-brand-primary' : ''
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Contenido Unificado de Ingredientes */}
        <div
          className={`p-4 sm:p-6 md:pt-0 ${
            !isIngredientsOpen ? 'block md:hidden' : 'block'
          } space-y-4 md:space-y-5 animate-fade-in ${
            isIngredientsOpen ? 'md:border-t md:border-[#f4efe6]' : ''
          }`}
        >
          <div className="md:pt-4">
            <ServingsScaler
              baseServings={basePorciones || 2}
              currentServings={servings}
              onServingsChange={setServings}
            />
          </div>

          <ShoppingListMode
            recetaId={recetaId}
            tituloReceta={tituloReceta}
            ingredientes={scaledIngredientes}
            onSubstituteChange={handleSubstituteChange}
            userProfile={userProfile}
          />
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECCIÓN 2: PREPARACIÓN Y PASOS EN MODO COCINA                  */}
      {/* ============================================================== */}
      <section
        className={`rounded-3xl bg-white border border-[#e7dfd5] shadow-xs overflow-hidden transition-all ${
          mobileTab !== 'steps' ? 'hidden md:block' : 'block'
        }`}
      >
        {/* Cabecera Móvil (< 768px): Compacta con microcontrol [ 🌱 | 🍳 | 👨‍🍳 ] y botón (?) */}
        <div className="flex md:hidden items-center justify-between gap-2 p-4 pb-3 border-b border-[#f4efe6]">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold font-serif-recipe text-stone-900 leading-none truncate">
                {t('recipe_section_prep')}
              </h2>
              <FeatureInfoTrigger {...levelInfoProps} align="left" />
            </div>
            <span className="text-[11px] text-stone-500 font-medium mt-1 block truncate">
              {safePasos.length} {t('recipe_steps_count')}
              {scaledTiempoCoccion
                ? ` · ~${scaledTiempoCoccion} ${t('recipe_min_cooking')}`
                : ''}
            </span>
          </div>

          {/* Microcontrol segmentado [ 🌱 | 🍳 | 👨‍🍳 ] */}
          <div className="inline-flex items-center p-0.5 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] shrink-0 shadow-2xs">
            {/* Principiante */}
            <button
              type="button"
              onClick={() => handleLevelSelect('principiante')}
              className={`relative w-9 h-8 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                effectiveActiveLevel === 'principiante'
                  ? 'bg-brand-primary text-white shadow-xs'
                  : !isPro
                  ? 'text-stone-400 opacity-75 hover:opacity-100 hover:bg-amber-50/70'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-white/60'
              }`}
              title={
                !isPro
                  ? 'Principiante (Exclusivo Miga Pro): Guía sensorial paso a paso'
                  : 'Principiante: Relato guiado paso a paso y pistas sensoriales'
              }
            >
              <span>🌱</span>
              {!isPro && (
                <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-brand-primary text-[7px] font-extrabold leading-none flex items-center gap-0.5 shadow-2xs">
                  <Lock className="w-2 h-2 stroke-[2.5]" />
                </span>
              )}
            </button>

            {/* Intermedio */}
            <button
              type="button"
              onClick={() => handleLevelSelect('intermedio')}
              className={`relative w-9 h-8 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                effectiveActiveLevel === 'intermedio'
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-white/60'
              }`}
              title="Intermedio: Versión canónica estándar"
            >
              <span>🍳</span>
            </button>

            {/* Avanzado */}
            <button
              type="button"
              onClick={() => handleLevelSelect('avanzado')}
              className={`relative w-9 h-8 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                effectiveActiveLevel === 'avanzado'
                  ? 'bg-brand-primary text-white shadow-xs'
                  : !isPro
                  ? 'text-stone-400 opacity-75 hover:opacity-100 hover:bg-amber-50/70'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-white/60'
              }`}
              title={
                !isPro
                  ? 'Avanzado (Exclusivo Miga Pro): Técnicas de oficio'
                  : 'Avanzado: Criterio práctico y técnicas de cocina'
              }
            >
              <span>👨‍🍳</span>
              {!isPro && (
                <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-brand-primary text-[7px] font-extrabold leading-none flex items-center gap-0.5 shadow-2xs">
                  <Lock className="w-2 h-2 stroke-[2.5]" />
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Cabecera de Acordeón para Escritorio (>= 768px) */}
        <button
          type="button"
          onClick={() => setIsStepsOpen(!isStepsOpen)}
          aria-expanded={isStepsOpen}
          className="hidden md:flex w-full min-h-[58px] p-5 sm:p-6 items-center justify-between gap-4 text-left hover:bg-[#faf7f2] transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f4efe6] border border-[#e7dfd5] text-brand-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900 leading-none">
                {t('recipe_section_prep')}
              </h2>
              <span className="text-xs text-stone-500 font-medium mt-1 block">
                {safePasos.length} {t('recipe_steps_count')}
                {scaledTiempoCoccion
                  ? ` · ~${scaledTiempoCoccion} ${t('recipe_min_cooking')}`
                  : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f4efe6] text-brand-primary border border-[#e7dfd5]">
              {isStepsOpen ? t('recipe_collapse') : t('recipe_expand')}
            </span>
            <div
              className={`w-8 h-8 rounded-full bg-[#f4efe6] text-stone-600 flex items-center justify-center transition-transform duration-200 ${
                isStepsOpen ? 'rotate-180 text-brand-primary' : ''
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Contenido Unificado de Preparación */}
        <div
          className={`p-4 sm:p-6 md:pt-4 ${
            !isStepsOpen ? 'block md:hidden' : 'block'
          } space-y-4 md:space-y-6 animate-fade-in ${
            isStepsOpen ? 'md:border-t md:border-[#f4efe6]' : ''
          }`}
        >
          {/* Selector de Nivel Culinario Reactivo en Escritorio con Tooltip flotante (?) */}
          <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5]">
            <div className="flex items-center gap-2 flex-wrap">
              <ChefHat className="w-4 h-4 text-brand-primary shrink-0" />
              <span className="text-xs sm:text-sm font-semibold font-serif-recipe text-stone-900">
                {language === 'en' ? 'Culinary Level' : 'Nivel de Cocinado'}
              </span>
              <FeatureInfoTrigger {...levelInfoProps} align="left" />
              <span className="text-[11px] text-stone-500 hidden lg:inline">
                {!isPro
                  ? language === 'en'
                    ? '· Base recipe (Unlock Beginner & Advanced with Miga Pro)'
                    : '· Receta base (Desbloquea Principiante y Avanzado con Miga Pro)'
                  : effectiveActiveLevel === 'principiante'
                  ? language === 'en'
                    ? '· Expanded step-by-step guide & sensory cues'
                    : '· Relato didáctico paso a paso y guía sensorial'
                  : effectiveActiveLevel === 'intermedio'
                  ? language === 'en'
                    ? '· Standard canonical recipe prose'
                    : '· Versión canónica equilibrada estándar'
                  : language === 'en'
                  ? '· Practical chef craft & parallel efficiency'
                  : '· Criterio de oficio y eficiencia en cocina'}
              </span>
            </div>

            {/* Segmented Control de escritorio */}
            <div className="inline-flex items-center p-1 rounded-xl bg-white border border-[#e7dfd5] shadow-2xs self-start sm:self-auto">
              {/* Principiante (PRO) */}
              <button
                type="button"
                onClick={() => handleLevelSelect('principiante')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                  effectiveActiveLevel === 'principiante'
                    ? 'bg-brand-primary text-white shadow-xs font-semibold'
                    : !isPro
                    ? 'text-stone-400 opacity-80 hover:opacity-100 hover:bg-amber-50/60'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#faf7f2]'
                }`}
                title={
                  !isPro
                    ? language === 'en'
                      ? 'Beginner (Miga Pro): Step-by-step sensory guide'
                      : 'Principiante (Miga Pro): Guía sensorial paso a paso'
                    : language === 'en'
                    ? 'Beginner: Didactic step-by-step guide and sensory cues'
                    : 'Principiante: Guía didáctica paso a paso y señales sensoriales'
                }
              >
                <span>🌱</span>
                <span>{language === 'en' ? 'Beginner' : 'Principiante'}</span>
                {!isPro && (
                  <span className="ml-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-100 text-brand-primary border border-amber-300/80 text-[9px] font-extrabold uppercase">
                    <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                    <span>PRO</span>
                  </span>
                )}
              </button>

              {/* Intermedio (Estándar) */}
              <button
                type="button"
                onClick={() => handleLevelSelect('intermedio')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                  effectiveActiveLevel === 'intermedio'
                    ? 'bg-brand-primary text-white shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#faf7f2]'
                }`}
                title={
                  language === 'en'
                    ? 'Intermediate: Canonical standard version'
                    : 'Intermedio: Versión canónica equilibrada estándar'
                }
              >
                <span>🍳</span>
                <span>{language === 'en' ? 'Medium' : 'Intermedio'}</span>
              </button>

              {/* Avanzado (PRO) */}
              <button
                type="button"
                onClick={() => handleLevelSelect('avanzado')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                  effectiveActiveLevel === 'avanzado'
                    ? 'bg-brand-primary text-white shadow-xs font-semibold'
                    : !isPro
                    ? 'text-stone-400 opacity-80 hover:opacity-100 hover:bg-amber-50/60'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#faf7f2]'
                }`}
                title={
                  !isPro
                    ? language === 'en'
                      ? 'Advanced (Miga Pro): Practical chef techniques'
                      : 'Avanzado (Miga Pro): Criterio y técnicas de oficio'
                    : language === 'en'
                    ? 'Advanced: Practical chef craft & parallel workflow'
                    : 'Avanzado: Criterio de oficio y técnicas de sabor'
                }
              >
                <span>👨‍🍳</span>
                <span>{language === 'en' ? 'Advanced' : 'Avanzado'}</span>
                {!isPro && (
                  <span className="ml-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-100 text-brand-primary border border-amber-300/80 text-[9px] font-extrabold uppercase">
                    <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                    <span>PRO</span>
                  </span>
                )}
              </button>
            </div>
          </div>

          {renderStepsList()}
        </div>
      </section>

      {/* Modal de Suscripción Miga Pro al pulsar cualquiera de los 3 niveles bloqueados */}
      {showProLevelModal && (
        <ProSubscriptionModal
          isOpen={showProLevelModal}
          onClose={() => setShowProLevelModal(false)}
          context="feature_locked"
          highlightCulinaryLevels={true}
          title={
            language === 'en'
              ? 'Unlock All 3 Culinary Levels with Miga Pro'
              : 'Desbloquea los 3 Niveles Culinarios con Miga Pro'
          }
          description={
            language === 'en'
              ? 'Subscribe to Miga Pro to switch in 0 ms between Beginner (expanded step-by-step sensory guide & thermal safety), Intermediate (balanced technique), and Advanced (restaurant-grade prose).'
              : 'Suscríbete a Miga Pro para conmutar en 0 ms entre Principiante (relato guiado paso a paso, guía sensorial y alertas térmicas), Intermedio (técnica equilibrada) y Avanzado (técnicas ejecutivas de restaurante).'
          }
          onVipSuccess={() => {
            setShowProLevelModal(false);
          }}
        />
      )}
    </div>
  );
}
