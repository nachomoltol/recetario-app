'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Calendar,
  Sun,
  Soup,
  Moon,
  Apple,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { Usuario, Receta } from '@/types/recipe';
import { MealSlot, PlannedSlotItem, batchAssignMealSlotsAction } from '@/app/actions/mealPlanner';
import { generateSmartMealPlan } from '@/lib/mealPlanGenerator';
import { ProSubscriptionModal } from '@/components/subscription/ProSubscriptionModal';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useProfileStore } from '@/stores/useProfileStore';

export interface SmartMenuWizardViewProps {
  userRecipes: Receta[];
  existingPlans: PlannedSlotItem[];
  initialStartDate: string; // YYYY-MM-DD
  userProfile?: Usuario | null;
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayString(): string {
  return formatLocalDate(new Date());
}

function getTomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatLocalDate(d);
}

function getNextMondayString(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilNextMonday = ((1 + 7 - day) % 7) || 7;
  d.setDate(d.getDate() + daysUntilNextMonday);
  return formatLocalDate(d);
}

export function SmartMenuWizardView({
  userRecipes,
  existingPlans,
  initialStartDate,
  userProfile,
}: SmartMenuWizardViewProps) {
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);

  // Perfil del usuario y estado PRO
  const profileFromStore = useProfileStore((s) => s.profile);
  const profile = userProfile ?? profileFromStore;
  const isPro = profile?.plan_suscripcion === 'pro';

  // 3. Selector y Corrección Dinámica de Fechas en /smart-menu:
  // Se calculan las fechas de forma dinámica en el cliente
  const todayStr = useMemo(() => getTodayString(), []);
  const tomorrowStr = useMemo(() => getTomorrowString(), []);
  const nextMondayStr = useMemo(() => getNextMondayString(), []);

  // Estados de configuración del Wizard
  const [dias, setDias] = useState<number>(7);
  const [startDate, setStartDate] = useState<string>(() => getTodayString());
  const [incluirDesayunos, setIncluirDesayunos] = useState<boolean>(true);
  const [incluirAlmuerzos, setIncluirAlmuerzos] = useState<boolean>(true);
  const [intentarPrimeroYSegundo, setIntentarPrimeroYSegundo] = useState<boolean>(false);
  const [incluirCenas, setIncluirCenas] = useState<boolean>(true);
  const [incluirSnackPostre, setIncluirSnackPostre] = useState<boolean>(false);

  // 5. Herramienta de Reseteo / Limpieza de Historial
  const [resetRecentHistory, setResetRecentHistory] = useState<boolean>(false);

  // Estados de ejecución y feedback
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProModalOpen, setIsProModalOpen] = useState<boolean>(false);

  // Validación: Al menos una comida debe estar activa
  const hasAtLeastOneMeal = useMemo(() => {
    return incluirDesayunos || incluirAlmuerzos || incluirCenas || incluirSnackPostre;
  }, [incluirDesayunos, incluirAlmuerzos, incluirCenas, incluirSnackPostre]);

  // Cálculo de fechas cubiertas para la vista previa en tiempo real
  const datesPreview = useMemo(() => {
    if (!startDate) return { startText: '', endText: '' };
    const [year, month, day] = startDate.split('-').map(Number);
    const start = new Date(year, (month || 1) - 1, day || 1);
    const end = new Date(year, (month || 1) - 1, (day || 1) + (dias - 1));

    const locale = language === 'en' ? 'en-US' : 'es-ES';
    const startFormatted = start.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const endFormatted = end.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    return {
      startText: startFormatted,
      endText: endFormatted,
    };
  }, [startDate, dias, language]);

  // Estimación de platos a generar
  const estimatedSlots = useMemo(() => {
    let slotsPerDay = 0;
    if (incluirDesayunos) slotsPerDay += 1;
    if (incluirAlmuerzos) slotsPerDay += intentarPrimeroYSegundo ? 2 : 1;
    if (incluirCenas) slotsPerDay += 1;
    if (incluirSnackPostre) slotsPerDay += 1;
    return slotsPerDay * dias;
  }, [dias, incluirDesayunos, incluirAlmuerzos, intentarPrimeroYSegundo, incluirCenas, incluirSnackPostre]);

  // Ejecución de la generación inteligente
  const handleGeneratePlan = async () => {
    setErrorMessage(null);

    // 1. Blindaje Freemium: si el usuario no es PRO, abre el modal de suscripción
    if (!isPro) {
      setIsProModalOpen(true);
      return;
    }

    // 2. Validación de configuración
    if (!hasAtLeastOneMeal) {
      setErrorMessage(t('planner_wizard_no_meals_warning'));
      return;
    }

    if (!userRecipes || userRecipes.length === 0) {
      setErrorMessage(t('smart_menu_no_recipes_warning'));
      return;
    }

    setIsGenerating(true);

    try {
      // 5. Historial de IDs de recetas usadas recientemente para evitar repeticiones excesivas,
      // o reseteo completo (vacío) si el usuario decide ignorarlo para desbloquear el 100% del recetario
      const historialRecientesIds = resetRecentHistory
        ? []
        : Array.from(
            new Set(
              (existingPlans || [])
                .map((p) => p.receta_id)
                .filter((id): id is string => Boolean(id))
            )
          );

      // Invocar motor inteligente de generación de menús
      const result = generateSmartMealPlan(userRecipes, {
        dias,
        fechaInicio: startDate,
        incluirDesayunos,
        incluirAlmuerzos,
        intentarPrimeroYSegundo: incluirAlmuerzos && intentarPrimeroYSegundo,
        incluirCenas,
        incluirSnackPostre,
        historialRecientesIds,
      });

      if (!result.items || result.items.length === 0) {
        setErrorMessage(t('smart_menu_no_recipes_warning'));
        setIsGenerating(false);
        return;
      }

      // 2. Respeto Estricto de los Comensales del Usuario (porciones):
      // Lee el número de porciones configurado en el perfil del usuario (perfil.raciones_defecto o porciones_por_defecto)
      const defaultServings = (profile as any)?.porciones_por_defecto ?? profile?.raciones_defecto ?? 4;

      // Persistir ítems generados en Supabase mediante Server Action atómica en lote
      const batchItems = result.items.map((it) => ({
        fecha: it.fecha,
        slot: it.slot as MealSlot,
        recetaId: it.receta.id,
        porciones: defaultServings,
      }));

      const saveRes = await batchAssignMealSlotsAction(batchItems);

      if (!saveRes.success) {
        setErrorMessage(saveRes.error || 'Error al persistir el menú generado.');
        setIsGenerating(false);
        return;
      }

      // Redirección inmediata a /meal-planner con flag de éxito
      router.push('/meal-planner?generated=true');
    } catch (err: any) {
      console.error('Error generando menú semanal con IA:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Error inesperado durante la generación.'
      );
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full max-w-full overflow-x-hidden">
      {/* Cabecera Minimalista Limpia */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900 tracking-tight">
          {t('smart_menu_title')}
        </h1>
        <p className="text-xs sm:text-sm text-stone-600">
          {t('smart_menu_subtitle')}
        </p>
      </div>

      {/* Alerta de Error si ocurre */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 font-bold px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* PASO 1: ¿Cuántos días planificamos? */}
      <section className="p-4 sm:p-6 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold font-serif-recipe text-stone-900">
              {t('planner_wizard_step_days')}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {t('planner_wizard_step_days_desc')}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
            {dias} {t('planner_wizard_days_unit')}
          </span>
        </div>

        {/* 3. Selector táctil de fecha de inicio (fechaInicio) */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#a86224]" />
              <span>{t('smart_menu_start_date_label')}</span>
            </label>
            <span className="text-[11px] text-stone-500">
              {t('smart_menu_start_date_desc')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStartDate(todayStr)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                startDate === todayStr
                  ? 'bg-[#a86224] text-white border-[#a86224] shadow-2xs font-bold'
                  : 'bg-[#faf7f2] hover:bg-[#f4efe6] text-stone-700 border-[#e7dfd5]'
              }`}
            >
              {t('smart_menu_date_today')}
            </button>

            <button
              type="button"
              onClick={() => setStartDate(tomorrowStr)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                startDate === tomorrowStr
                  ? 'bg-[#a86224] text-white border-[#a86224] shadow-2xs font-bold'
                  : 'bg-[#faf7f2] hover:bg-[#f4efe6] text-stone-700 border-[#e7dfd5]'
              }`}
            >
              {t('smart_menu_date_tomorrow')}
            </button>

            <button
              type="button"
              onClick={() => setStartDate(nextMondayStr)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                startDate === nextMondayStr
                  ? 'bg-[#a86224] text-white border-[#a86224] shadow-2xs font-bold'
                  : 'bg-[#faf7f2] hover:bg-[#f4efe6] text-stone-700 border-[#e7dfd5]'
              }`}
            >
              {t('smart_menu_date_next_monday')}
            </button>

            <div className="flex-1 min-w-[140px]">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  if (e.target.value) setStartDate(e.target.value);
                }}
                className="w-full h-9 px-3 rounded-xl border border-[#e7dfd5] bg-white text-xs font-medium text-stone-800 focus:outline-none focus:border-[#a86224] focus:ring-1 focus:ring-[#a86224] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Botones rápidos de selección */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setDias(5)}
            className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-2 ${
              dias === 5
                ? 'bg-[#a86224] text-white border-[#a86224] shadow-xs'
                : 'bg-[#faf7f2] hover:bg-[#f4efe6] text-stone-700 border-[#e7dfd5]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t('smart_menu_quick_5_days')}</span>
          </button>

          <button
            type="button"
            onClick={() => setDias(7)}
            className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-2 ${
              dias === 7
                ? 'bg-[#a86224] text-white border-[#a86224] shadow-xs'
                : 'bg-[#faf7f2] hover:bg-[#f4efe6] text-stone-700 border-[#e7dfd5]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t('smart_menu_quick_7_days')}</span>
          </button>
        </div>

        {/* Selector táctil de 1 a 7 días */}
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((num) => {
            const isSelected = dias === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => setDias(num)}
                className={`h-11 sm:h-12 rounded-2xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center transition cursor-pointer touch-manipulation border ${
                  isSelected
                    ? 'bg-[#a86224] text-white border-[#a86224] shadow-xs scale-[1.03]'
                    : 'bg-[#faf7f2] hover:bg-[#f4efe6] text-stone-800 border-[#e7dfd5]'
                }`}
              >
                <span>{num}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-80 font-normal">
                  {num === 1 ? (language === 'en' ? 'day' : 'día') : (language === 'en' ? 'days' : 'días')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Vista previa de fechas cubiertas */}
        <div className="p-3.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex items-center justify-between text-xs text-stone-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#a86224]" />
            <span className="font-semibold">{t('smart_menu_period_planned')}</span>
          </div>
          <span className="font-bold text-stone-900">
            {datesPreview.startText} → {datesPreview.endText}
          </span>
        </div>
      </section>

      {/* PASO 2: ¿Qué comidas quieres incluir? */}
      <section className="p-6 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold font-serif-recipe text-stone-900">
            {t('planner_wizard_step_meals')}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            {t('planner_wizard_step_meals_desc')}
          </p>
        </div>

        <div className="space-y-3">
          {/* Tarjeta: Desayunos */}
          <div
            onClick={() => setIncluirDesayunos(!incluirDesayunos)}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
              incluirDesayunos
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-[#faf7f2] border-[#e7dfd5] opacity-75'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  incluirDesayunos ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-500'
                }`}
              >
                <Sun className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-stone-900 block truncate">
                  {t('planner_wizard_meal_breakfast')}
                </span>
                <span className="text-[11px] text-stone-500 block truncate">
                  {t('planner_wizard_meal_breakfast_sub')}
                </span>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={incluirDesayunos}
              onClick={(e) => {
                e.stopPropagation();
                setIncluirDesayunos(!incluirDesayunos);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                incluirDesayunos ? 'bg-[#a86224]' : 'bg-stone-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  incluirDesayunos ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Tarjeta: Almuerzos / Comidas */}
          <div
            onClick={() => setIncluirAlmuerzos(!incluirAlmuerzos)}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
              incluirAlmuerzos
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-[#faf7f2] border-[#e7dfd5] opacity-75'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  incluirAlmuerzos ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-500'
                }`}
              >
                <Soup className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-stone-900 block truncate">
                  {t('planner_wizard_meal_lunch')}
                </span>
                <span className="text-[11px] text-stone-500 block truncate">
                  {t('planner_wizard_meal_lunch_sub')}
                </span>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={incluirAlmuerzos}
              onClick={(e) => {
                e.stopPropagation();
                setIncluirAlmuerzos(!incluirAlmuerzos);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                incluirAlmuerzos ? 'bg-[#a86224]' : 'bg-stone-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  incluirAlmuerzos ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Sub-toggle anidado condicional para 1º y 2º plato en Almuerzos */}
          {incluirAlmuerzos && (
            <div className="ml-4 pl-4 border-l-2 border-amber-300 py-1 animate-fade-in">
              <div
                onClick={() => setIntentarPrimeroYSegundo(!intentarPrimeroYSegundo)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                  intentarPrimeroYSegundo
                    ? 'bg-white border-[#a86224] shadow-2xs'
                    : 'bg-[#faf7f2]/90 border-[#e7dfd5]'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <span className="text-xs font-bold text-stone-900 block">
                    {t('planner_wizard_pair_courses')}
                  </span>
                  <span className="text-[11px] text-stone-500 block mt-0.5">
                    {t('planner_wizard_pair_courses_sub')}
                  </span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={intentarPrimeroYSegundo}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIntentarPrimeroYSegundo(!intentarPrimeroYSegundo);
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    intentarPrimeroYSegundo ? 'bg-[#a86224]' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      intentarPrimeroYSegundo ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Tarjeta: Cenas */}
          <div
            onClick={() => setIncluirCenas(!incluirCenas)}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
              incluirCenas
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-[#faf7f2] border-[#e7dfd5] opacity-75'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  incluirCenas ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-500'
                }`}
              >
                <Moon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-stone-900 block truncate">
                  {t('planner_wizard_meal_dinner')}
                </span>
                <span className="text-[11px] text-stone-500 block truncate">
                  {t('planner_wizard_meal_dinner_sub')}
                </span>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={incluirCenas}
              onClick={(e) => {
                e.stopPropagation();
                setIncluirCenas(!incluirCenas);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                incluirCenas ? 'bg-[#a86224]' : 'bg-stone-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  incluirCenas ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Tarjeta: Snacks o Postres */}
          <div
            onClick={() => setIncluirSnackPostre(!incluirSnackPostre)}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
              incluirSnackPostre
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-[#faf7f2] border-[#e7dfd5] opacity-75'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  incluirSnackPostre ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-500'
                }`}
              >
                <Apple className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-stone-900 block truncate">
                  {t('planner_wizard_meal_snack')}
                </span>
                <span className="text-[11px] text-stone-500 block truncate">
                  {t('planner_wizard_meal_snack_sub')}
                </span>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={incluirSnackPostre}
              onClick={(e) => {
                e.stopPropagation();
                setIncluirSnackPostre(!incluirSnackPostre);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                incluirSnackPostre ? 'bg-[#a86224]' : 'bg-stone-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  incluirSnackPostre ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 5. Toggle para Resetear Historial Reciente */}
        <div
          onClick={() => setResetRecentHistory(!resetRecentHistory)}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
            resetRecentHistory
              ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
              : 'bg-[#faf7f2] border-[#e7dfd5] hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                resetRecentHistory ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-500'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-stone-900 block">
                {t('smart_menu_reset_history_title')}
              </span>
              <span className="text-[11px] text-stone-500 block">
                {t('smart_menu_reset_history_desc')}
              </span>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={resetRecentHistory}
            onClick={(e) => {
              e.stopPropagation();
              setResetRecentHistory(!resetRecentHistory);
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              resetRecentHistory ? 'bg-[#a86224]' : 'bg-stone-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                resetRecentHistory ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Botón Principal de Acción Inferior */}
      <div className="pt-2 pb-6 space-y-3">
        <button
          type="button"
          onClick={handleGeneratePlan}
          disabled={!hasAtLeastOneMeal || isGenerating}
          className="w-full min-h-[54px] rounded-2xl bg-gradient-to-r from-[#a86224] via-[#bd722e] to-[#8e511c] hover:opacity-95 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t('smart_menu_generating_btn')}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-amber-200" />
              <span>{t('smart_menu_generate_btn')}</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-400 text-stone-900 shadow-2xs">
                PRO
              </span>
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-stone-500">
          {t('smart_menu_overwrite_notice')}
        </p>
      </div>

      {/* Modal Cortafuegos PRO */}
      <ProSubscriptionModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        context="feature_locked"
        title={t('planner_pro_required_title')}
        description={t('planner_pro_required_desc')}
      />
    </div>
  );
}
