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

  const handleAdapt = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await adaptRecipeAction(recipe);
      if (result.success && result.data) {
        onApplyAdaptation(result.data);
      } else {
        setErrorMessage(
          result.error || 'No se pudo generar la adaptación para tu perfil.'
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
            title="Reescribe los ingredientes y pasos in-line adaptados a tus alergias y nivel técnico"
          >
            {isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Adaptando receta a tu perfil con IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Adaptar a mi perfil</span>
              </>
            )}
          </button>

          {/* Badges sutiles de perfil que motivan la adaptación */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
            <span>Ajustará para:</span>
            {nivel && (
              <span className="px-2 py-0.5 rounded-full bg-[#f4efe6] text-[#a86224] font-medium border border-[#e7dfd5]">
                {nivel}
              </span>
            )}
            {userProfile?.preferencias_dieteticas?.slice(0, 2).map((pref) => (
              <span
                key={pref}
                className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-200"
              >
                {pref}
              </span>
            ))}
            {userProfile?.alergenos?.slice(0, 2).map((al) => (
              <span
                key={al}
                className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 font-medium border border-rose-200"
              >
                Sin {al}
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
                  Receta adaptada a tu perfil
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#a86224] text-white">
                  In-Line
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed font-light">
                {adaptationSummary || 'Ingredientes y pasos reformulados con las modificaciones destacadas visualmente.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRevertAdaptation}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white hover:bg-[#faf7f2] border border-[#e7dfd5] hover:border-[#a86224] text-xs font-semibold text-stone-700 hover:text-[#a86224] transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs self-start sm:self-auto"
            title="Volver a los ingredientes y pasos originales"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ver receta original</span>
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
