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
} from 'lucide-react';
import { RecetaIngrediente, Paso } from '@/types/recipe';
import { scaleIngredientsWithCulinaryHeuristics, scaleCookingTime } from '@/lib/culinary/scaler';
import { replaceIngredientInText } from '@/lib/culinary/textReplacer';
import { scaleStepQuantities } from '@/lib/culinary/stepQuantityScaler';
import { ServingsScaler } from './ServingsScaler';
import { ShoppingListMode } from './ShoppingListMode';
import { FormattedText } from '@/components/ui/FormattedText';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { SubstituteOption } from '@/app/actions/suggestSubstitute';

/**
 * Normaliza la temperatura de cocción técnica según el método (horno vs fuego directo en sartén/olla/plancha)
 */
function formatStepHeat(
  tempCelsius: number,
  instructionText: string,
  lang: 'es' | 'en' = 'es'
): { label: string; isBaking: boolean } {
  const norm = instructionText.toLowerCase();

  // Conservar grados (°C) con Thermometer solo si el paso incluye explícitamente términos de horneado o freidora de aire
  const isBaking =
    /\b(horno|hornear|hornea|hornealo|horneala|horneados|horneadas|precalentar|precalienta|oven|bake|baking|baked|airfryer|air\s*fryer|freidora\s+de\s+aire)\b/i.test(
      norm
    );

  if (isBaking) {
    return {
      label: `${tempCelsius}°C`,
      isBaking: true,
    };
  }

  // Mapear temperaturas de fuego directo según idioma (ES / EN):
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
}: RecipeInteractiveSectionsProps) {
  const t = useLanguageStore((s) => s.t);
  const searchParams = useSearchParams();
  const isFromPlanner = searchParams?.get('from') === 'planner';
  const plannerServings = isFromPlanner && searchParams?.get('servings')
    ? Number(searchParams.get('servings'))
    : null;

  // Solo si la URL contiene explícitamente from=planner y servings se inicializa con dicho valor;
  // al abrir la receta desde el recetario o colección, el estado inicial DEBE ser SIEMPRE la base de la receta.
  const resolvedInitialServings = (plannerServings && plannerServings > 0)
    ? plannerServings
    : (isFromPlanner && defaultServings && defaultServings > 0 ? defaultServings : (basePorciones || 2));

  const [servings, setServings] = useState(resolvedInitialServings);
  const [isIngredientsOpen, setIsIngredientsOpen] = useState(false);
  const [isStepsOpen, setIsStepsOpen] = useState(false);
  const [substitutions, setSubstitutions] = useState<Record<string, string>>({});
  const prevRecetaIdRef = useRef(recetaId);

  // Sincronizar comensales: preservar la selección activa del usuario al cambiar de modo (adaptado vs original)
  useEffect(() => {
    // Si cambió la receta (navegación a otro plato), reiniciar comensales al nuevo plato
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

    // Misma receta: solo actualizar si la URL del planificador cambia explícitamente comensales
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
    const cleanTarget = String(currentTarget || '').replace(/<\/?[^>]+(>|$)/g, '').trim();
    const cleanNew = newName ? String(newName).replace(/<\/?[^>]+(>|$)/g, '').trim() : null;
    const baseKey = String(adaptedBaseName || cleanTarget).replace(/<\/?[^>]+(>|$)/g, '').trim();

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

  const safePasos = Array.isArray(pasos) ? pasos : [];
  const safeIngredientes = Array.isArray(ingredientes) ? ingredientes : [];

  const language = useLanguageStore((s) => s.language);
  const ratio = servings / (basePorciones || 2);

  // Escalado inteligente con conciencia culinaria
  const scaledIngredientes = useMemo(() => {
    return scaleIngredientsWithCulinaryHeuristics(
      safeIngredientes,
      basePorciones || 2,
      servings
    );
  }, [safeIngredientes, basePorciones, servings]);

  const scaledTiempoCoccion = tiempoCoccionMin
    ? scaleCookingTime(tiempoCoccionMin, ratio)
    : null;

  // Reactividad dinámica: escalado métrico culinario y sustitución de ingredientes en el relato
  const reactivePasos = useMemo(() => {
    const activeSubs = Object.entries(substitutions).filter(([_, newName]) => Boolean(newName));
    const usageTracker = new Map<string, number>();

    return safePasos.map((paso) => {
      let instruccion = String(paso?.instruccion || '');
      let consejo = paso?.consejo_pro ? String(paso.consejo_pro) : undefined;

      // 1. Escalar cantidades numéricas integradas en el texto si ratio !== 1 o si es receta adaptada
      if ((ratio !== 1 || isAdapted) && scaledIngredientes.length > 0) {
        instruccion = scaleStepQuantities(instruccion, scaledIngredientes, ratio, language, servings, usageTracker);
        if (consejo) {
          consejo = scaleStepQuantities(consejo, scaledIngredientes, ratio, language, servings, usageTracker);
        }
      }

      // 2. Aplicar sustitución de ingredientes si existen
      for (const [adaptedBase, newName] of activeSubs) {
        instruccion = replaceIngredientInText(instruccion, adaptedBase, newName);
        if (consejo) {
          consejo = replaceIngredientInText(consejo, adaptedBase, newName);
        }
      }

      return {
        ...paso,
        instruccion,
        consejo_pro: consejo,
      };
    });
  }, [safePasos, substitutions, ratio, scaledIngredientes, language, isAdapted, servings]);

  return (
    <div className="space-y-8 pt-2">
      {/* ============================================================== */}
      {/* ACORDEÓN 1: INGREDIENTES CON ESCALADO CULINARIO Y MODO COMPRA  */}
      {/* ============================================================== */}
      <section className="rounded-3xl bg-white border border-[#e7dfd5] shadow-xs overflow-hidden transition-all">
        {/* Cabecera táctil colapsable */}
        <button
          type="button"
          onClick={() => setIsIngredientsOpen(!isIngredientsOpen)}
          aria-expanded={isIngredientsOpen}
          className="w-full min-h-[58px] p-5 sm:p-6 flex items-center justify-between gap-4 text-left hover:bg-[#faf7f2] transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900 leading-none">
                {t('recipe_section_ingredients')}
              </h2>
              <span className="text-xs text-stone-500 font-medium mt-1 block">
                {servings} {servings === 1 ? t('recipe_serving_single') : t('recipe_servings_plural')} · {safeIngredientes.length} {t('recipe_items')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
              {isIngredientsOpen ? t('recipe_collapse') : t('recipe_expand')}
            </span>
            <div
              className={`w-8 h-8 rounded-full bg-[#f4efe6] text-stone-600 flex items-center justify-center transition-transform duration-200 ${
                isIngredientsOpen ? 'rotate-180 text-[#a86224]' : ''
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Cuerpo desplegable */}
        {isIngredientsOpen && (
          <div className="p-5 sm:p-6 pt-0 border-t border-[#f4efe6] space-y-5 animate-fade-in">
            {/* Control de Comensales con Escalado Inteligente */}
            <div className="pt-4">
              <ServingsScaler
                baseServings={basePorciones || 2}
                currentServings={servings}
                onServingsChange={setServings}
              />
            </div>

            {/* Listado de Ingredientes / Modo Lista de Compra */}
            <ShoppingListMode
              recetaId={recetaId}
              tituloReceta={tituloReceta}
              ingredientes={scaledIngredientes}
              onSubstituteChange={handleSubstituteChange}
              userProfile={userProfile}
            />
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* ACORDEÓN 2: PREPARACIÓN Y PASOS EN MODO COCINA                */}
      {/* ============================================================== */}
      <section className="rounded-3xl bg-white border border-[#e7dfd5] shadow-xs overflow-hidden transition-all">
        {/* Cabecera táctil colapsable */}
        <button
          type="button"
          onClick={() => setIsStepsOpen(!isStepsOpen)}
          aria-expanded={isStepsOpen}
          className="w-full min-h-[58px] p-5 sm:p-6 flex items-center justify-between gap-4 text-left hover:bg-[#faf7f2] transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900 leading-none">
                {t('recipe_section_prep')}
              </h2>
              <span className="text-xs text-stone-500 font-medium mt-1 block">
                {safePasos.length} {t('recipe_steps_count')}
                {scaledTiempoCoccion ? ` · ~${scaledTiempoCoccion} ${t('recipe_min_cooking')}` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
              {isStepsOpen ? t('recipe_collapse') : t('recipe_expand')}
            </span>
            <div
              className={`w-8 h-8 rounded-full bg-[#f4efe6] text-stone-600 flex items-center justify-center transition-transform duration-200 ${
                isStepsOpen ? 'rotate-180 text-[#a86224]' : ''
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Cuerpo desplegable */}
        {isStepsOpen && (
          <div className="p-5 sm:p-6 pt-4 border-t border-[#f4efe6] animate-fade-in">
            <ol className="space-y-7">
              {reactivePasos.map((paso, idx) => (
                <li key={paso?.id || `paso-${idx}`} className="flex gap-4 sm:gap-5 group">
                  <span className="w-10 h-10 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] font-serif-recipe font-bold text-base flex items-center justify-center shrink-0 self-start mt-0.5 shadow-2xs">
                    {paso?.orden ?? (idx + 1)}
                  </span>

                  <div className="space-y-2.5 flex-1">
                    <p className="text-base sm:text-lg text-stone-800 leading-relaxed font-light">
                      <FormattedText text={paso.instruccion} />
                    </p>

                    {(paso.tiempo_estimado_min || paso.temperatura_celsius || paso.consejo_pro) && (
                      <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-stone-600">
                        {paso.tiempo_estimado_min && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-700 font-medium">
                            <Clock className="w-3.5 h-3.5 text-[#a86224]" />
                            {paso.tiempo_estimado_min} min
                          </span>
                        )}

                        {paso.temperatura_celsius && (() => {
                          const heat = formatStepHeat(
                            paso.temperatura_celsius,
                            paso.instruccion,
                            (language as 'es' | 'en') || 'es'
                          );
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-700 font-medium">
                              {heat.isBaking ? (
                                <Thermometer className="w-3.5 h-3.5 text-[#c27835]" />
                              ) : (
                                <Flame className="w-3.5 h-3.5 text-[#e05d26]" />
                              )}
                              {heat.label}
                            </span>
                          );
                        })()}

                        {paso.consejo_pro && (
                          <div className="w-full mt-2 p-3.5 rounded-2xl border border-[#e7dfd5] bg-[#faf7f2] text-stone-700 text-xs sm:text-sm font-light">
                            <span className="font-semibold text-[#a86224]">{t('recipe_chef_tip')}</span>{' '}
                            <FormattedText text={paso.consejo_pro} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}
