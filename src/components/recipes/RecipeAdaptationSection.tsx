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
    <div className="space-y-3">
      {/* ============================================================== */}
      {/* 1. RECETA YA ADAPTADA: Banner de éxito y reversión            */}
      {/* ============================================================== */}
      {isAdapted ? (
        <div className="p-4 sm:p-5 rounded-3xl border border-emerald-300 bg-gradient-to-r from-emerald-50/90 via-[#f8fdf9] to-emerald-50/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-stone-900 font-serif-recipe">
                  {t('recipe_adapted_badge')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#a86224] text-white">
                  In-Line
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed font-light">
                {adaptationSummary || t('recipe_adapt_summary_fallback')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRevertAdaptation}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white hover:bg-[#faf7f2] border border-[#e7dfd5] hover:border-[#a86224] text-xs font-semibold text-stone-700 hover:text-[#a86224] transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs self-start sm:self-auto"
            title={t('recipe_adapt_revert_tooltip')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('recipe_view_original')}</span>
          </button>
        </div>
      ) : (
        /* ============================================================== */
        /* 2. RECETA NO ADAPTADA: Tarjeta Semáforo de Diagnóstico Clínico  */
        /* ============================================================== */
        <div className="space-y-2">
          {hasConflicts ? (
            /* SEMÁFORO ADVERTENCIA: Hay ingredientes en conflicto */
            <div
              className={`p-4 sm:p-5 rounded-3xl border shadow-xs animate-fade-in transition-all ${
                isCritical
                  ? 'bg-gradient-to-r from-rose-50/95 via-[#fff8f8] to-rose-50/80 border-rose-300'
                  : 'bg-gradient-to-r from-amber-50/95 via-[#fffbf6] to-amber-50/80 border-amber-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 border ${
                      isCritical
                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    {isCritical ? (
                      <ShieldAlert className="w-5 h-5 text-rose-700" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-700" />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-stone-900 font-serif-recipe">
                        {isCritical
                          ? language === 'en'
                            ? 'Critical Allergen Conflict'
                            : 'Alerta de Incompatibilidad Clínica'
                          : language === 'en'
                          ? 'Dietary Conflicts Detected'
                          : 'Ingredientes no compatibles con tu perfil'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isCritical
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {isCritical ? 'Crítico' : 'Moderado'}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed font-light">
                      {isCritical
                        ? language === 'en'
                          ? 'This recipe contains ingredients that trigger strict exclusions for your health profile:'
                          : 'Esta receta contiene ingredientes que suponen una exclusión crítica para tu salud:'
                        : language === 'en'
                        ? 'This recipe uses ingredients that do not match your active dietary profile:'
                        : 'Esta receta incluye ingredientes que no se ajustan a tus patologías o preferencias activas:'}
                    </p>

                    {/* Chips de ingredientes en conflicto */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {compatibilityReport.conflicts.map((c, idx) => (
                        <span
                          key={`${c.ingredienteOriginal}-${idx}`}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold border flex items-center gap-1 ${
                            c.severidad === 'critica'
                              ? 'bg-rose-100/80 text-rose-900 border-rose-200'
                              : 'bg-amber-100/80 text-amber-900 border-amber-200'
                          }`}
                        >
                          <span className="capitalize">{c.ingredienteOriginal}</span>
                          <span className="text-[10px] opacity-75 font-normal">({c.patologia})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Botón Prominente: Adaptar a mi perfil */}
                <button
                  type="button"
                  onClick={handleAdaptClick}
                  disabled={isPending}
                  className={`min-h-[46px] px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm text-white shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto shrink-0 active:scale-95 disabled:opacity-50 ${
                    isCritical
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800'
                      : 'bg-gradient-to-r from-[#a86224] to-[#c47732] hover:from-[#8e511c] hover:to-[#a86224]'
                  }`}
                >
                  {isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>{t('recipe_adapting_btn')}</span>
                    </>
                  ) : (
                    <>
                      {!isPro ? (
                        <>
                          <Lock className="w-4 h-4 text-white/90" />
                          <span>Adaptar a mi perfil (PRO)</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Adaptar a mi perfil</span>
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* SEMÁFORO COMPATIBLE: No hay conflictos */
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-900 animate-fade-in shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="font-bold">
                    {language === 'en'
                      ? '100% Compatible with your profile'
                      : 'Receta compatible con tu perfil clínico'}
                  </span>
                  {compatibilityReport.patologiasEvaluadas.length > 0 && (
                    <span className="text-emerald-700 text-xs ml-1.5 hidden sm:inline font-light">
                      ({compatibilityReport.patologiasEvaluadas.slice(0, 3).join(', ')})
                    </span>
                  )}
                </div>
              </div>

              {/* Si tiene nivel culinario particular, permite adaptar técnicas si desea */}
              {tieneNivelEspecifico && (
                <button
                  type="button"
                  onClick={handleAdaptClick}
                  disabled={isPending}
                  className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-100/50 border border-emerald-300 text-xs font-semibold text-emerald-900 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#a86224]" />
                  <span>
                    {isPending
                      ? t('recipe_adapting_btn')
                      : `${t('recipe_adapt_btn')} (${nivel})`}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mensaje de error si falla la inferencia */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 font-bold"
          >
            <X className="w-4 h-4" />
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
