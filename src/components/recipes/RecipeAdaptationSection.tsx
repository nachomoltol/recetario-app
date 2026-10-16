'use client';

import { useState, useTransition } from 'react';
import {
  Sparkles,
  AlertCircle,
  X,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import {
  adaptRecipeAction,
  AdaptacionCulinaria,
  AdaptRecipeInput,
} from '@/app/actions/adaptRecipeAction';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface RecipeAdaptationSectionProps {
  recipe: AdaptRecipeInput;
  userProfile?: {
    nivel_culinario?: string | null;
    preferencias_dieteticas?: string[] | null;
    alergenos?: string[] | null;
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

  // Condiciones de visibilidad:
  // Solo visible si tiene configurada alguna preferencia dietética (alergias/intolerancias)
  // O un nivel culinario específico ('Principiante' o 'Avanzado').
  const tienePreferenciasDieteticas = Boolean(
    (userProfile?.preferencias_dieteticas && userProfile.preferencias_dieteticas.length > 0) ||
    (userProfile?.alergenos && userProfile.alergenos.length > 0)
  );

  const nivel = userProfile?.nivel_culinario;
  const tieneNivelEspecifico = nivel === 'Principiante' || nivel === 'Avanzado';
  const canAdapt = tienePreferenciasDieteticas || tieneNivelEspecifico;

  if (!canAdapt) {
    return null;
  }

  const getNivelLabel = (n: string) => {
    try {
      const nl = String(n || '').toLowerCase();
      if (nl === 'principiante' || nl === 'beginner') return language === 'en' ? 'Beginner' : 'Principiante';
      if (nl === 'avanzado' || nl === 'advanced') return language === 'en' ? 'Advanced' : 'Avanzado';
      return String(n || '');
    } catch {
      return String(n || '');
    }
  };

  const getDietaryLabel = (pref: string) => {
    if (language !== 'en') return String(pref || '');
    try {
      const p = String(pref || '').toLowerCase();
      if (p.includes('gluten')) return 'Gluten-Free';
      if (p.includes('vegan') || p.includes('vegetal')) return 'Vegan';
      if (p.includes('vegetariana')) return 'Vegetarian';
      if (p.includes('lact')) return 'Lactose-Free';
      if (p.includes('fodmap')) return 'Low-FODMAP';
      if (p.includes('histamina')) return 'Low Histamine';
      if (p.includes('keto')) return 'Keto';
      if (p.includes('paleo')) return 'Paleo';
      if (p.includes('blanda')) return 'Bland Diet';
      if (p.includes('reflujo')) return 'Anti-Reflux';
      if (p.includes('inflamatorio')) return 'Anti-Inflammatory';
      return String(pref || '');
    } catch {
      return String(pref || '');
    }
  };

  const handleAdapt = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await adaptRecipeAction({ ...recipe, idioma: language });
      if (result.success && result.data) {
        onApplyAdaptation(result.data);
      } else {
        setErrorMessage(
          result.error || t('recipe_adapt_error_fallback')
        );
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Botón trigger: visible cuando aún no está adaptada */}
      {!isAdapted && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAdapt}
            disabled={isPending}
            className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#a86224] to-[#c47732] hover:from-[#8e511c] hover:to-[#a86224] text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            title={t('recipe_adapt_tooltip')}
          >
            {isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>{t('recipe_adapting_btn')}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{t('recipe_adapt_btn')}</span>
              </>
            )}
          </button>

          {/* Badges sutiles de perfil que motivan la adaptación */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
            <span>{t('recipe_adapt_will_adjust')}</span>
            {nivel && (
              <span className="px-2 py-0.5 rounded-full bg-[#f4efe6] text-[#a86224] font-medium border border-[#e7dfd5]">
                {getNivelLabel(nivel)}
              </span>
            )}
            {userProfile?.preferencias_dieteticas?.slice(0, 2).map((pref) => (
              <span
                key={pref}
                className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-200"
              >
                {getDietaryLabel(pref)}
              </span>
            ))}
            {userProfile?.alergenos?.slice(0, 2).map((al) => (
              <span
                key={al}
                className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 font-medium border border-rose-200"
              >
                {t('recipe_adapt_without')} {getDietaryLabel(al)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Banner de receta adaptada in-line */}
      {isAdapted && (
        <div className="p-4 sm:p-5 rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-50/90 via-[#fffbf6] to-amber-50/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-[#a86224] border border-amber-200 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <CheckCircle2 className="w-5 h-5 text-[#a86224]" />
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
    </div>
  );
}
