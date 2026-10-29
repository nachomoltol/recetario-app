'use client';

import { useState, useTransition, useMemo } from 'react';
import {
  Sparkles,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  X,
  RotateCcw,
  CheckCircle2,
  Lock,
  ChevronDown,
} from 'lucide-react';
import {
  adaptRecipeAction,
  AdaptacionCulinaria,
  AdaptRecipeInput,
} from '@/app/actions/adaptRecipeAction';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { checkRecipeClinicalCompatibility } from '@/lib/clinicalDictionary';
import { ProSubscriptionModal } from '@/components/subscription/ProSubscriptionModal';

interface RecipeAdaptationSectionProps {
  recipe: AdaptRecipeInput;
  userProfile?: {
    nivel_culinario?: string | null;
    preferencias_dieteticas?: string[] | null;
    alergenos?: string[] | null;
    plan_suscripcion?: 'gratis' | 'pro' | null;
  } | null;
  isAdapted: boolean;
  adaptationSummary?: string | null;
  onApplyAdaptation: (data: AdaptacionCulinaria) => void;
  onRevertAdaptation: () => void;
}

export function RecipeAdaptationSection({
  recipe,
  userProfile,
  isAdapted,
  adaptationSummary,
  onApplyAdaptation,
  onRevertAdaptation,
}: RecipeAdaptationSectionProps) {
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showProModal, setShowProModal] = useState(false);
  const [isAlertExpanded, setIsAlertExpanded] = useState(false);

  const isPro = (userProfile?.plan_suscripcion || '').trim().toLowerCase() === 'pro';

  // Preferencias clínicas o alérgicas configuradas
  const tienePreferenciasDieteticas = Boolean(
    (userProfile?.preferencias_dieteticas && userProfile.preferencias_dieteticas.length > 0) ||
    (userProfile?.alergenos && userProfile.alergenos.length > 0)
  );

  const nivel = userProfile?.nivel_culinario;
  const tieneNivelEspecifico = nivel === 'Principiante' || nivel === 'Avanzado';

  // Reporte clínico cruzando ingredientes de la receta con perfil
  const compatibilityReport = useMemo(() => {
    if (!tienePreferenciasDieteticas) {
      return {
        isCompatible: true,
        conflicts: [],
        totalExclusiones: 0,
        patologiasEvaluadas: [],
      };
    }

    return checkRecipeClinicalCompatibility(
      (recipe.ingredientes || []).map((i) => ({
        nombre_limpio: i.nombre_limpio,
        nombre_crudo: i.nombre_limpio,
      })),
      {
        objetivoClinico: userProfile?.preferencias_dieteticas || undefined,
        alergenos: userProfile?.alergenos || undefined,
        idioma: language,
      }
    );
  }, [recipe.ingredientes, userProfile, tienePreferenciasDieteticas, language]);

  // Si no tiene ninguna restricción configurada y tampoco nivel específico, no interrumpe la UI
  if (!tienePreferenciasDieteticas && !tieneNivelEspecifico && !isAdapted) {
    return null;
  }

  const handleAdaptClick = () => {
    if (!isPro) {
      setShowProModal(true);
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const result = await adaptRecipeAction({ ...recipe, idioma: language });
      if (result.success && result.data) {
        onApplyAdaptation(result.data);
      } else {
        setErrorMessage(result.error || t('recipe_adapt_error_fallback'));
      }
    });
  };

  const hasConflicts = compatibilityReport.conflicts.length > 0;
  const isCritical = compatibilityReport.severidadMaxima === 'critica';

  return (
    <div className="inline-block">
      {/* ============================================================== */}
      {/* 1. RECETA YA ADAPTADA: Badge minimalista e In-Line             */}
      {/* ============================================================== */}
      {isAdapted ? (
        <div className="inline-flex items-center gap-2 flex-wrap animate-fade-in">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold font-serif-recipe">{t('recipe_adapted_badge')}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md font-bold bg-[#a86224] text-white">
              In-Line
            </span>
          </div>

          <button
            type="button"
            onClick={onRevertAdaptation}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-stone-600 hover:text-[#a86224] hover:bg-[#faf7f2] border border-transparent hover:border-[#e7dfd5] transition cursor-pointer"
            title={t('recipe_adapt_revert_tooltip')}
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t('recipe_view_original')}</span>
          </button>
        </div>
      ) : (
        /* ============================================================== */
        /* 2. RECETA NO ADAPTADA: Badge Semáforo Minimalista              */
        /* ============================================================== */
        <div className="inline-flex flex-col gap-1.5">
          {hasConflicts ? (
            /* SEMÁFORO ADVERTENCIA: Badge ultra-compacto con botón de adaptar */
            <div className="inline-flex items-center gap-2 flex-wrap">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-2xs ${
                  isCritical
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                {isCritical ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 animate-pulse" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
                <span className="font-bold">
                  {compatibilityReport.conflicts.length}{' '}
                  {compatibilityReport.conflicts.length === 1 ? 'conflicto' : 'conflictos'}
                </span>
                <span className="text-[10px] opacity-75 font-semibold uppercase">
                  ({isCritical ? 'Crítico' : 'Ajustable'})
                </span>
                <button
                  type="button"
                  onClick={() => setIsAlertExpanded(!isAlertExpanded)}
                  className="ml-1 text-[11px] font-bold underline hover:opacity-80 cursor-pointer flex items-center gap-0.5"
                >
                  <span>{isAlertExpanded ? 'Ocultar' : 'Ver'}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${isAlertExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {/* Botón de acción rápida: Adaptar a mi perfil */}
              <button
                type="button"
                onClick={handleAdaptClick}
                disabled={isPending}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white shadow-2xs transition cursor-pointer active:scale-95 disabled:opacity-50 ${
                  isCritical
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#a86224] hover:bg-[#8e511c]'
                }`}
              >
                {isPending ? (
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {!isPro ? (
                      <Lock className="w-3 h-3 text-white/90" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                  </>
                )}
                <span>
                  {isPending
                    ? t('recipe_adapting_btn')
                    : isPro
                    ? 'Adaptar'
                    : 'Adaptar (PRO)'}
                </span>
              </button>
            </div>
          ) : (
            /* SEMÁFORO COMPATIBLE: Badge verde de una sola línea */
            <div className="inline-flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  {language === 'en'
                    ? '100% Compatible'
                    : '100% compatible con tu perfil'}
                </span>
                {compatibilityReport.patologiasEvaluadas.length > 0 && (
                  <span className="text-[10px] text-emerald-700 opacity-80 hidden sm:inline">
                    ({compatibilityReport.patologiasEvaluadas.slice(0, 2).join(', ')})
                  </span>
                )}
              </div>

              {tieneNivelEspecifico && (
                <button
                  type="button"
                  onClick={handleAdaptClick}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#faf7f2] border border-[#e7dfd5] text-xs font-semibold text-stone-700 hover:text-[#a86224] transition shadow-2xs cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[#a86224]" />
                  <span>
                    {isPending ? t('recipe_adapting_btn') : `Adaptar a ${nivel}`}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Chips expandibles de conflictos clínicos */}
          {hasConflicts && isAlertExpanded && (
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] text-[11px] animate-fade-in mt-1">
              {compatibilityReport.conflicts.map((c, idx) => (
                <span
                  key={`${c.ingredienteOriginal}-${idx}`}
                  className={`px-2 py-0.5 rounded-lg border font-medium ${
                    c.severidad === 'critica'
                      ? 'bg-rose-100/90 text-rose-900 border-rose-200'
                      : 'bg-amber-100/90 text-amber-900 border-amber-200'
                  }`}
                >
                  <span className="capitalize">{c.ingredienteOriginal}</span>
                  <span className="opacity-75 ml-1">({c.patologia})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mensaje de error si falla la inferencia */}
      {errorMessage && (
        <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 font-bold"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modal de suscripción PRO para usuarios gratuitos */}
      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        context="feature_locked"
      />
    </div>
  );
}
