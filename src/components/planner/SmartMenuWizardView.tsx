'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  RotateCcw,
  ArrowRight,
  Check,
  Users,
} from 'lucide-react';
import { Usuario, Receta } from '@/types/recipe';
import { MealSlot, PlannedSlotItem, batchAssignMealSlotsAction } from '@/app/actions/mealPlanner';
import { generateSmartMealPlan } from '@/lib/mealPlanGenerator';
import { ProSubscriptionModal } from '@/components/subscription/ProSubscriptionModal';
import { CalendarRangePicker } from './CalendarRangePicker';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useProfileStore } from '@/stores/useProfileStore';

export interface SmartMenuWizardViewProps {
  userRecipes: Receta[];
  existingPlans: PlannedSlotItem[];
  initialStartDate: string; // YYYY-MM-DD
  userProfile?: Usuario | null;
}

export type DayMealConfig = {
  desayuno: boolean;
  almuerzo: boolean;
  cena: boolean;
  snack: boolean;
};

interface DateInfo {
  dateStr: string;
  dayLetter: string;
  dayShort: string;
  dayNum: number;
  monthShort: string;
  isWeekend: boolean;
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

function getNextMondayString(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const daysUntilNextMonday = ((1 + 7 - day) % 7) || 7;
  d.setDate(d.getDate() + daysUntilNextMonday);
  return formatLocalDate(d);
}

function getDateInfoList(start: string, count: number, lang: string): DateInfo[] {
  const list: DateInfo[] = [];
  const [y, m, d] = start.split('-').map(Number);
  const cur = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);

  const dayLettersEs = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const dayShortsEs = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthsShortEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const dayLettersEn = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dayShortsEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthsShortEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const isEn = lang === 'en';
  const dayLetters = isEn ? dayLettersEn : dayLettersEs;
  const dayShorts = isEn ? dayShortsEn : dayShortsEs;
  const monthsShort = isEn ? monthsShortEn : monthsShortEs;

  for (let i = 0; i < count; i++) {
    const dateStr = formatLocalDate(cur);
    const dayOfWeek = cur.getDay();
    list.push({
      dateStr,
      dayLetter: dayLetters[dayOfWeek],
      dayShort: dayShorts[dayOfWeek],
      dayNum: cur.getDate(),
      monthShort: monthsShort[cur.getMonth()],
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return list;
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

  // Perfil del usuario y estado de plan de pago
  const profileFromStore = useProfileStore((s) => s.profile);
  const profile = userProfile ?? profileFromStore;
  const isPaidPlan = ['pro', 'chef', 'premium', 'admin'].includes(
    (profile?.plan_suscripcion || '').trim().toLowerCase()
  );

  // Paso actual del asistente (1: Duración y Fechas, 2: Cockpit Semanal Táctil)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Estados de configuración de fechas
  const [dias, setDias] = useState<number>(7);
  const [startDate, setStartDate] = useState<string>(() => {
    if (initialStartDate) return initialStartDate;
    const d = new Date();
    const day = d.getDay();
    return (day === 0 || day === 6) ? getNextMondayString() : getTodayString();
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const s = initialStartDate || ((new Date().getDay() === 0 || new Date().getDay() === 6) ? getNextMondayString() : getTodayString());
    const [y, m, d] = s.split('-').map(Number);
    const endD = new Date(y, (m || 1) - 1, (d || 1) + 6, 12, 0, 0, 0);
    return formatLocalDate(endD);
  });

  // Lista de días calculada para el rango seleccionado
  const dateList = useMemo(() => {
    return getDateInfoList(startDate, dias, language);
  }, [startDate, dias, language]);

  // Configuración granular día a día para el Cockpit Semanal
  const [slotsConfig, setSlotsConfig] = useState<Record<string, DayMealConfig>>(() => {
    const initial: Record<string, DayMealConfig> = {};
    const dates = getDateInfoList(
      initialStartDate || ((new Date().getDay() === 0 || new Date().getDay() === 6) ? getNextMondayString() : getTodayString()),
      7,
      language
    );
    for (const d of dates) {
      initial[d.dateStr] = {
        desayuno: true,
        almuerzo: true,
        cena: true,
        snack: false,
      };
    }
    return initial;
  });

  // Sincronizar slotsConfig cuando cambia el rango de fechas
  useEffect(() => {
    setSlotsConfig((prev) => {
      const next: Record<string, DayMealConfig> = {};
      for (const d of dateList) {
        if (prev[d.dateStr]) {
          next[d.dateStr] = prev[d.dateStr];
        } else {
          next[d.dateStr] = {
            desayuno: true,
            almuerzo: true,
            cena: true,
            snack: false,
          };
        }
      }
      return next;
    });
  }, [dateList]);

  // Opciones complementarias
  const [intentarPrimeroYSegundo, setIntentarPrimeroYSegundo] = useState<boolean>(false);
  const [resetRecentHistory, setResetRecentHistory] = useState<boolean>(false);

  // Estados de ejecución y feedback
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProModalOpen, setIsProModalOpen] = useState<boolean>(false);

  // Estimación de platos activos en la matriz
  const estimatedSlots = useMemo(() => {
    let count = 0;
    for (const d of dateList) {
      const cfg = slotsConfig[d.dateStr];
      if (cfg?.desayuno) count += 1;
      if (cfg?.almuerzo) count += intentarPrimeroYSegundo ? 2 : 1;
      if (cfg?.cena) count += 1;
      if (cfg?.snack) count += 1;
    }
    return count;
  }, [dateList, slotsConfig, intentarPrimeroYSegundo]);

  const hasAtLeastOneMeal = estimatedSlots > 0;

  // Sincronizar fecha de planificación activa para el botón "Ver mi Plan"
  useEffect(() => {
    if (startDate) {
      try {
        localStorage.setItem('miga_active_planner_date', startDate);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('miga:planner-date-changed', { detail: startDate })
          );
        }
      } catch (e) {}
    }
  }, [startDate]);

  // Atajos rápidos para configurar la semana con 1 toque
  const applyPresetAll = () => {
    const next: Record<string, DayMealConfig> = {};
    for (const d of dateList) {
      next[d.dateStr] = { desayuno: true, almuerzo: true, cena: true, snack: false };
    }
    setSlotsConfig(next);
  };

  const applyPresetWeekdays = () => {
    const next: Record<string, DayMealConfig> = {};
    for (const d of dateList) {
      if (d.isWeekend) {
        next[d.dateStr] = { desayuno: false, almuerzo: false, cena: false, snack: false };
      } else {
        next[d.dateStr] = { desayuno: true, almuerzo: true, cena: true, snack: false };
      }
    }
    setSlotsConfig(next);
  };

  const applyPresetLunchDinner = () => {
    const next: Record<string, DayMealConfig> = {};
    for (const d of dateList) {
      next[d.dateStr] = { desayuno: false, almuerzo: true, cena: true, snack: false };
    }
    setSlotsConfig(next);
  };

  const applyPresetDinnersOnly = () => {
    const next: Record<string, DayMealConfig> = {};
    for (const d of dateList) {
      next[d.dateStr] = { desayuno: false, almuerzo: false, cena: true, snack: false };
    }
    setSlotsConfig(next);
  };

  const applyPresetClearAll = () => {
    const next: Record<string, DayMealConfig> = {};
    for (const d of dateList) {
      next[d.dateStr] = { desayuno: false, almuerzo: false, cena: false, snack: false };
    }
    setSlotsConfig(next);
  };

  // Alternar toda una columna (un día completo)
  const toggleDay = (dateStr: string) => {
    setSlotsConfig((prev) => {
      const cur = prev[dateStr];
      const isAnyActive = cur?.desayuno || cur?.almuerzo || cur?.cena || cur?.snack;
      return {
        ...prev,
        [dateStr]: {
          desayuno: !isAnyActive,
          almuerzo: !isAnyActive,
          cena: !isAnyActive,
          snack: false,
        },
      };
    });
  };

  // Alternar toda una fila (un momento para todos los días)
  const toggleRow = (meal: keyof DayMealConfig) => {
    setSlotsConfig((prev) => {
      const allActive = dateList.every((d) => prev[d.dateStr]?.[meal]);
      const nextVal = !allActive;
      const next: Record<string, DayMealConfig> = { ...prev };
      for (const d of dateList) {
        next[d.dateStr] = {
          ...(next[d.dateStr] || { desayuno: false, almuerzo: false, cena: false, snack: false }),
          [meal]: nextVal,
        };
      }
      return next;
    });
  };

  // Alternar una celda individual (un momento en un día específico)
  const toggleCell = (dateStr: string, meal: keyof DayMealConfig) => {
    setSlotsConfig((prev) => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || { desayuno: false, almuerzo: false, cena: false, snack: false }),
        [meal]: !prev[dateStr]?.[meal],
      },
    }));
  };

  // Ejecución de la generación inteligente
  const handleGeneratePlan = async () => {
    setErrorMessage(null);

    // 1. Blindaje Freemium: si el usuario no es de pago, abre el modal de suscripción
    if (!isPaidPlan) {
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
      const historialRecientesIds = resetRecentHistory
        ? []
        : Array.from(
            new Set(
              (existingPlans || [])
                .map((p) => p.receta_id)
                .filter((id): id is string => Boolean(id))
            )
          );

      const anyDesayuno = dateList.some((d) => slotsConfig[d.dateStr]?.desayuno);
      const anyAlmuerzo = dateList.some((d) => slotsConfig[d.dateStr]?.almuerzo);
      const anyCena = dateList.some((d) => slotsConfig[d.dateStr]?.cena);
      const anySnack = dateList.some((d) => slotsConfig[d.dateStr]?.snack);

      // Invocar motor inteligente de generación de menús con granularidad por día
      const result = generateSmartMealPlan(userRecipes, {
        dias,
        fechaInicio: startDate,
        incluirDesayunos: anyDesayuno,
        incluirAlmuerzos: anyAlmuerzo,
        intentarPrimeroYSegundo: anyAlmuerzo && intentarPrimeroYSegundo,
        incluirCenas: anyCena,
        incluirSnackPostre: anySnack,
        historialRecientesIds,
        slotsPorDia: slotsConfig,
      });

      if (!result.items || result.items.length === 0) {
        setErrorMessage(t('smart_menu_no_recipes_warning'));
        setIsGenerating(false);
        return;
      }

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

      // Redirección inmediata a /meal-planner con la fecha de inicio del menú generado y flag de éxito
      router.push(`/meal-planner?date=${startDate}&from=${startDate}&to=${endDate}&openShopping=true&generated=true`);
      router.refresh();
    } catch (err: any) {
      console.error('Error generando menú semanal con IA:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Error inesperado durante la generación.'
      );
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-2.5 sm:space-y-3 animate-fade-in w-full max-w-full overflow-x-hidden">
      {/* Cabecera Gourmet Minimalista Miga PRO */}
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold font-serif-recipe text-stone-900 tracking-tight truncate">
              {t('smart_menu_title')}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-2xs shrink-0">
              PRO
            </span>
          </div>
          <p className="text-[11px] text-stone-600 truncate">
            {t('smart_menu_subtitle')}
          </p>
        </div>

        {/* Acceso directo a cambiar fechas cuando se está en el paso 2 */}
        {currentStep === 2 && (
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="text-[11px] font-bold text-brand-primary hover:text-brand-hover bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1 transition shrink-0"
          >
            <Calendar className="w-3 h-3" />
            <span className="hidden xs:inline">{language === 'en' ? 'Dates' : 'Fechas'}</span>
          </button>
        )}
      </div>

      {/* Alerta de Error si ocurre */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 font-bold px-1.5 py-0.5 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stepper gastronómico compacto Miga PRO */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#f4efe6] border border-[#e7dfd5]">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation ${
            currentStep === 1
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="truncate">{language === 'en' ? '1. Dates' : '1. Fechas y Días'}</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation ${
            currentStep === 2
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
          <span className="truncate">{language === 'en' ? '2. Week Cockpit' : '2. Cockpit Semanal'}</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* PASO 1: Selector de Rango Calendario Booking/Airbnb             */}
      {/* ============================================================== */}
      {currentStep === 1 && (
        <section className="space-y-2.5 animate-fade-in">
          <CalendarRangePicker
            startDate={startDate}
            endDate={endDate}
            minDays={1}
            maxDays={31}
            onChangeRange={(newStart, newEnd, newDays) => {
              setStartDate(newStart);
              setEndDate(newEnd);
              setDias(newDays);
            }}
          />

          {/* Botón claro y táctil para avanzar al Paso 2 */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="w-full min-h-[44px] rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition active:scale-[0.99] cursor-pointer touch-manipulation"
            >
              <span>{language === 'en' ? 'Next: Configure Meals' : 'Siguiente: Personalizar Comidas'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* PASO 2: EL COCKPIT SEMANAL TÁCTIL (SIN SCROLL MÓVIL)           */}
      {/* ============================================================== */}
      {currentStep === 2 && (
        <section className="space-y-2 animate-fade-in">
          {/* 1. Barra de atajos rápidos de un toque */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider shrink-0 mr-0.5">
              {language === 'en' ? 'Presets:' : 'Atajos:'}
            </span>
            <button
              type="button"
              onClick={applyPresetAll}
              className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition active:scale-95 shrink-0 touch-manipulation"
            >
              ✨ {language === 'en' ? 'All week' : 'Toda la semana'}
            </button>
            <button
              type="button"
              onClick={applyPresetWeekdays}
              className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200 transition active:scale-95 shrink-0 touch-manipulation"
            >
              💼 {language === 'en' ? 'Mon-Fri' : 'Lun a Vie'}
            </button>
            <button
              type="button"
              onClick={applyPresetLunchDinner}
              className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200 transition active:scale-95 shrink-0 touch-manipulation"
            >
              🍲 {language === 'en' ? 'Lunch + Dinner' : 'Comida + Cena'}
            </button>
            <button
              type="button"
              onClick={applyPresetDinnersOnly}
              className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200 transition active:scale-95 shrink-0 touch-manipulation"
            >
              🌙 {language === 'en' ? 'Dinners only' : 'Solo Cenas'}
            </button>
            <button
              type="button"
              onClick={applyPresetClearAll}
              className="px-1.5 py-0.5 rounded-full text-[10.5px] font-medium text-stone-500 hover:text-stone-800 transition active:scale-95 shrink-0 touch-manipulation"
              title={language === 'en' ? 'Clear all' : 'Desmarcar todo'}
            >
              ✕ {language === 'en' ? 'Clear' : 'Limpiar'}
            </button>
          </div>

          {/* 2. Matriz Semanal Interactiva (El Cockpit) */}
          <div className="w-full bg-white rounded-xl border border-[#e7dfd5] shadow-2xs p-1.5 sm:p-2">
            <div className="w-full overflow-x-auto no-scrollbar">
              <table className="w-full border-collapse table-fixed select-none">
                <thead>
                  <tr>
                    <th className="w-14 sm:w-16 text-left pb-1 text-[10px] font-bold text-stone-600 uppercase tracking-wider">
                      {language === 'en' ? 'Meal' : 'Comida'}
                    </th>
                    {dateList.map((d) => {
                      const cur = slotsConfig[d.dateStr];
                      const isAnyActive = cur?.desayuno || cur?.almuerzo || cur?.cena || cur?.snack;
                      return (
                        <th key={d.dateStr} className="text-center pb-1 px-0.5">
                          <button
                            type="button"
                            onClick={() => toggleDay(d.dateStr)}
                            title={language === 'en' ? `Toggle ${d.dayShort}` : `Activar/desactivar ${d.dayShort}`}
                            className={`w-full py-0.5 rounded-md flex flex-col items-center justify-center transition active:scale-95 touch-manipulation ${
                              isAnyActive
                                ? 'bg-amber-100/90 text-amber-900 border border-amber-300'
                                : 'bg-stone-100 text-stone-600 border border-stone-200'
                            }`}
                          >
                            <span className="text-[11px] font-black leading-tight">{d.dayLetter}</span>
                            <span className="text-[9px] font-semibold opacity-75 leading-none">{d.dayNum}</span>
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {/* Fila: Desayuno */}
                  <tr>
                    <td className="py-1 pr-1">
                      <button
                        type="button"
                        onClick={() => toggleRow('desayuno')}
                        title={language === 'en' ? 'Toggle all breakfasts' : 'Alternar desayunos toda la semana'}
                        className="w-full text-left flex items-center gap-1 text-[11px] font-bold text-stone-800 hover:text-amber-800 transition touch-manipulation"
                      >
                        <span className="text-xs">☀️</span>
                        <span className="truncate">{language === 'en' ? 'Brk' : 'Des.'}</span>
                      </button>
                    </td>
                    {dateList.map((d) => {
                      const active = Boolean(slotsConfig[d.dateStr]?.desayuno);
                      return (
                        <td key={d.dateStr} className="py-1 px-0.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleCell(d.dateStr, 'desayuno')}
                            className={`w-full h-8 sm:h-8.5 rounded-lg flex items-center justify-center transition active:scale-90 touch-manipulation font-bold text-xs ${
                              active
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-stone-100 text-stone-300 hover:bg-stone-200/60 border border-stone-200/60'
                            }`}
                          >
                            {active ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '·'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Fila: Almuerzo */}
                  <tr>
                    <td className="py-1 pr-1">
                      <button
                        type="button"
                        onClick={() => toggleRow('almuerzo')}
                        title={language === 'en' ? 'Toggle all lunches' : 'Alternar comidas toda la semana'}
                        className="w-full text-left flex items-center gap-1 text-[11px] font-bold text-stone-800 hover:text-amber-800 transition touch-manipulation"
                      >
                        <span className="text-xs">🍲</span>
                        <span className="truncate">{language === 'en' ? 'Lunch' : 'Com.'}</span>
                      </button>
                    </td>
                    {dateList.map((d) => {
                      const active = Boolean(slotsConfig[d.dateStr]?.almuerzo);
                      return (
                        <td key={d.dateStr} className="py-1 px-0.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleCell(d.dateStr, 'almuerzo')}
                            className={`w-full h-8 sm:h-8.5 rounded-lg flex items-center justify-center transition active:scale-90 touch-manipulation font-bold text-xs ${
                              active
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-stone-100 text-stone-300 hover:bg-stone-200/60 border border-stone-200/60'
                            }`}
                          >
                            {active ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '·'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Fila: Cena */}
                  <tr>
                    <td className="py-1 pr-1">
                      <button
                        type="button"
                        onClick={() => toggleRow('cena')}
                        title={language === 'en' ? 'Toggle all dinners' : 'Alternar cenas toda la semana'}
                        className="w-full text-left flex items-center gap-1 text-[11px] font-bold text-stone-800 hover:text-amber-800 transition touch-manipulation"
                      >
                        <span className="text-xs">🌙</span>
                        <span className="truncate">{language === 'en' ? 'Dinner' : 'Cen.'}</span>
                      </button>
                    </td>
                    {dateList.map((d) => {
                      const active = Boolean(slotsConfig[d.dateStr]?.cena);
                      return (
                        <td key={d.dateStr} className="py-1 px-0.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleCell(d.dateStr, 'cena')}
                            className={`w-full h-8 sm:h-8.5 rounded-lg flex items-center justify-center transition active:scale-90 touch-manipulation font-bold text-xs ${
                              active
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-stone-100 text-stone-300 hover:bg-stone-200/60 border border-stone-200/60'
                            }`}
                          >
                            {active ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '·'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Fila: Snack o Postre */}
                  <tr>
                    <td className="py-1 pr-1">
                      <button
                        type="button"
                        onClick={() => toggleRow('snack')}
                        title={language === 'en' ? 'Toggle all snacks' : 'Alternar snacks toda la semana'}
                        className="w-full text-left flex items-center gap-1 text-[11px] font-bold text-stone-800 hover:text-amber-800 transition touch-manipulation"
                      >
                        <span className="text-xs">🍏</span>
                        <span className="truncate">{language === 'en' ? 'Snk' : 'Snk.'}</span>
                      </button>
                    </td>
                    {dateList.map((d) => {
                      const active = Boolean(slotsConfig[d.dateStr]?.snack);
                      return (
                        <td key={d.dateStr} className="py-1 px-0.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleCell(d.dateStr, 'snack')}
                            className={`w-full h-8 sm:h-8.5 rounded-lg flex items-center justify-center transition active:scale-90 touch-manipulation font-bold text-xs ${
                              active
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-stone-100 text-stone-300 hover:bg-stone-200/60 border border-stone-200/60'
                            }`}
                          >
                            {active ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '·'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Aclaración permanente de Cenas (Sopas, cremas y ensaladas son cenas completas) */}
          <div className="flex items-center gap-1.5 text-[10px] bg-amber-50/90 border border-amber-200/70 rounded-lg px-2.5 py-1 text-amber-900 leading-tight">
            <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="font-medium truncate">
              {language === 'en'
                ? '✨ Soups, creams and salads are 100% complete dinners'
                : '✨ Sopas, cremas y ensaladas son cenas 100% completas y válidas'}
            </span>
          </div>

          {/* 4. Opciones secundarias compactas en una sola fila */}
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={() => setIntentarPrimeroYSegundo(!intentarPrimeroYSegundo)}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition flex items-center gap-1.5 active:scale-95 touch-manipulation ${
                intentarPrimeroYSegundo
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <span>🍲 {language === 'en' ? '1st & 2nd Course' : '1º y 2º Plato en comida'}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  intentarPrimeroYSegundo ? 'bg-brand-primary' : 'bg-stone-300'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => setResetRecentHistory(!resetRecentHistory)}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition flex items-center gap-1.5 active:scale-95 touch-manipulation ${
                resetRecentHistory
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <RotateCcw className="w-3 h-3 text-stone-500" />
              <span>{language === 'en' ? 'Ignore recent' : 'Alternar recientes'}</span>
            </button>
          </div>

          {/* 5. Resumen en vivo condensado */}
          <div className="flex items-center justify-between px-1 text-[11px] font-medium text-stone-600">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-stone-400" />
              <span>
                {(profile as any)?.porciones_por_defecto ?? profile?.raciones_defecto ?? 4}{' '}
                {language === 'en' ? 'servings' : 'raciones'}
              </span>
              <span className="text-stone-300">·</span>
              <span>
                {dias} {dias === 1 ? (language === 'en' ? 'day' : 'día') : (language === 'en' ? 'days' : 'días')}
              </span>
            </div>
            <div className="font-bold text-brand-primary bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full text-[10.5px]">
              ~{estimatedSlots} {language === 'en' ? 'dishes selected' : 'platos a planificar'}
            </div>
          </div>

          {/* 6. Botonera Inferior Ergonómica */}
          <div className="space-y-1 pt-0.5">
            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={!hasAtLeastOneMeal || isGenerating}
              className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-[#a86224] via-[#bd722e] to-[#8e511c] hover:opacity-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('smart_menu_generating_btn')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>{t('smart_menu_generate_btn')}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider bg-amber-400 text-stone-900 shadow-2xs">
                    PRO
                  </span>
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-stone-500 leading-tight">
              {language === 'en'
                ? 'Only meals for selected dates and slots will be updated. Other existing meals remain untouched.'
                : 'Solo se reemplazarán las comidas de los momentos y días seleccionados. Las demás comidas existentes se conservan.'}
            </p>
          </div>
        </section>
      )}

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
