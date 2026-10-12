'use client';

import { useState, useTransition } from 'react';
import {
  Sparkles,
  Wand2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Lightbulb,
  X,
  ChefHat,
  RotateCcw,
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
}

export function RecipeAdaptationSection({
  recipe,
  userProfile,
}: RecipeAdaptationSectionProps) {
  const [adaptation, setAdaptation] = useState<AdaptacionCulinaria | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Condiciones de visibilidad según la regla del usuario:
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
        setAdaptation(result.data);
        setIsExpanded(true);
      } else {
        setErrorMessage(
          result.error || 'No se pudo generar la adaptación para tu perfil.'
        );
      }
    });
  };

  const handleDismiss = () => {
    setAdaptation(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-4">
      {/* Botón trigger: solo visible cuando aún no hay adaptación o para re-ejecutar */}
      {!adaptation && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAdapt}
            disabled={isPending}
            className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#a86224] to-[#c47732] hover:from-[#8e511c] hover:to-[#a86224] text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            title="Adapta los ingredientes a tus alergias y los pasos a tu nivel de chef"
          >
            {isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Analizando con tu perfil culinario...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Adaptar a mi perfil</span>
              </>
            )}
          </button>

          {/* Badges sutiles de perfil que motivan la adaptación */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-500">
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
          </div>
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

      {/* ============================================================== */}
      {/* CAPA CLÍNICA Y TÉCNICA: PANEL SUPERPUESTO DE ADAPTACIÓN        */}
      {/* ============================================================== */}
      {adaptation && (
        <div className="rounded-3xl border border-amber-300/80 bg-gradient-to-br from-amber-50/70 via-white to-[#faf7f2] shadow-sm overflow-hidden animate-fade-in transition-all">
          {/* Cabecera del panel */}
          <div className="p-4 sm:p-5 border-b border-amber-200/60 flex items-start justify-between gap-3 bg-amber-50/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-amber-200 flex items-center justify-center text-[#a86224] shadow-2xs shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold font-serif-recipe text-stone-900 leading-tight">
                    Tus Adaptaciones Personalizadas
                  </h3>
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    Capa Clínica & Nivel
                  </span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed max-w-xl">
                  {adaptation.resumen_adaptacion}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-8 h-8 rounded-xl bg-white/80 hover:bg-white border border-[#e7dfd5] flex items-center justify-center text-stone-600 transition cursor-pointer"
                title={isExpanded ? 'Plegar adaptaciones' : 'Desplegar adaptaciones'}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="w-8 h-8 rounded-xl bg-white/80 hover:bg-white border border-[#e7dfd5] flex items-center justify-center text-stone-500 hover:text-stone-800 transition cursor-pointer"
                title="Cerrar panel de adaptación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Contenido desplegable */}
          {isExpanded && (
            <div className="p-4 sm:p-6 space-y-6">
              {/* SECCIÓN 1: Sustituciones Clínicas / Dietéticas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#a86224] flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Sustituciones Sugeridas para tu Salud</span>
                  </span>
                  <span className="text-[11px] text-stone-500 font-medium">
                    {adaptation.sustituciones_sugeridas.length}{' '}
                    {adaptation.sustituciones_sugeridas.length === 1
                      ? 'ajuste'
                      : 'ajustes'}
                  </span>
                </div>

                {adaptation.sustituciones_sugeridas.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {adaptation.sustituciones_sugeridas.map((sust, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-white border border-amber-200/80 shadow-2xs space-y-2.5"
                      >
                        {/* Comparación visual original -> sustituto */}
                        <div className="flex items-center justify-between gap-2 border-b border-[#f4efe6] pb-2 text-xs">
                          <span className="text-stone-500 line-through">
                            {sust.ingrediente_original}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#a86224] shrink-0" />
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                            {sust.alternativa_sugerida}
                          </span>
                        </div>

                        {/* Ratio y justificación */}
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-stone-500">Proporción:</span>
                            <span className="font-semibold text-stone-800">
                              {sust.cantidad_o_ratio}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-600 leading-snug">
                            <strong className="text-stone-700">Por qué:</strong>{' '}
                            {sust.motivo_clinico_o_dietetico}
                          </p>
                          <p className="text-[11px] text-amber-900 bg-amber-50/70 p-2 rounded-xl border border-amber-200/50 leading-snug">
                            💡 <span className="font-medium">{sust.instrucciones_uso}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      ¡Excelente! Esta receta ya es naturalmente compatible con tus preferencias y
                      alérgenos declarados. No requiere sustituciones clínicas.
                    </span>
                  </div>
                )}
              </div>

              {/* SECCIÓN 2: Tips Técnicos y Atajos según tu Nivel de Cocina */}
              <div className="space-y-3 pt-2 border-t border-amber-200/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#a86224] flex items-center gap-2">
                    <ChefHat className="w-4 h-4" />
                    <span>
                      Técnica Personalizada ({nivel || 'Tu Nivel'})
                    </span>
                  </span>
                  <span className="text-[11px] text-stone-500 font-medium">
                    {adaptation.tips_tecnicos.length} consejos
                  </span>
                </div>

                <div className="space-y-2.5">
                  {adaptation.tips_tecnicos.map((tip, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-white border border-[#e7dfd5] text-xs flex items-start gap-3 shadow-2xs"
                    >
                      <div className="w-7 h-7 rounded-xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center shrink-0 mt-0.5">
                        <Lightbulb className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="font-semibold text-stone-900">
                            {tip.paso_o_fase}
                          </strong>
                          <span className="text-[10px] font-medium text-stone-500 capitalize">
                            {tip.enfoque}
                          </span>
                        </div>
                        <p className="text-stone-600 leading-relaxed text-[11px]">
                          {tip.consejo}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pie con botón para volver a generar si el usuario actualizó perfil */}
              <div className="pt-2 flex items-center justify-between text-xs text-stone-500 border-t border-amber-200/40">
                <span className="text-[11px]">
                  Receta base conservada intacta en tu base de datos.
                </span>
                <button
                  type="button"
                  onClick={handleAdapt}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 text-[#a86224] hover:text-[#8e511c] font-semibold transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Volver a calcular</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
