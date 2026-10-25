'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  ShoppingCart,
  Check,
  Copy,
  Utensils,
  Sun,
  Soup,
  Moon,
  Apple,
  X,
  BookOpen,
  Filter,
  SlidersHorizontal,
  Tag,
  Users,
  Loader2,
} from 'lucide-react';
import { Receta, Usuario } from '@/types/recipe';
import {
  MealSlot,
  PlannedSlotItem,
  UnifiedShoppingItem,
  assignMealSlotAction,
  removeMealSlotAction,
  clearWeeklyPlanAction,
  generateUnifiedShoppingListAction,
} from '@/app/actions/mealPlanner';
import { groupItemsByAisle } from '@/lib/culinary/aisles';
import { isDessertExcludedFromSlot } from '@/lib/recipeCategorizer';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { TranslationKey } from '@/lib/i18n/translations';

interface MealPlannerViewProps {
  initialPlans: PlannedSlotItem[];
  userRecipes: Receta[];
  userProfile?: Usuario | null;
}

const SLOTS_CONFIG: { slot: MealSlot; labelKey: TranslationKey; icon: typeof Sun }[] = [
  { slot: 'desayuno', labelKey: 'slot_breakfast', icon: Sun },
  { slot: 'almuerzo_1', labelKey: 'slot_lunch_1', icon: Soup },
  { slot: 'almuerzo_2', labelKey: 'slot_lunch_2', icon: Utensils },
  { slot: 'cena', labelKey: 'slot_dinner', icon: Moon },
  { slot: 'snack_postre', labelKey: 'slot_snack_dessert', icon: Apple },
];

const DAY_KEYS: TranslationKey[] = [
  'day_monday',
  'day_tuesday',
  'day_wednesday',
  'day_thursday',
  'day_friday',
  'day_saturday',
  'day_sunday',
];

const DAY_SHORT_KEYS: TranslationKey[] = [
  'day_mon_short',
  'day_tue_short',
  'day_wed_short',
  'day_thu_short',
  'day_fri_short',
  'day_sat_short',
  'day_sun_short',
];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

interface DaySlotItem {
  slot: MealSlot;
  label: string;
  icon: typeof Sun;
  plan?: PlannedSlotItem;
  canAddSecondCourse?: boolean;
}

export function MealPlannerView({ initialPlans, userRecipes, userProfile }: MealPlannerViewProps) {
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);
  const profileStore = useProfileStore((s) => s.profile);

  // 2. Consulta de forma prioritaria la configuración de raciones del perfil del usuario
  const defaultDiners = useMemo(() => {
    return (
      (userProfile as any)?.porciones_por_defecto ??
      userProfile?.raciones_defecto ??
      (profileStore as any)?.porciones_por_defecto ??
      profileStore?.raciones_defecto ??
      4
    );
  }, [userProfile, profileStore]);

  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()));
  const [plans, setPlans] = useState<PlannedSlotItem[]>(initialPlans);
  const [activeDayIndex, setActiveDayIndex] = useState(0); // Para vista móvil por día
  const [pickerModal, setPickerModal] = useState<{ fecha: string; slot: MealSlot } | null>(null);
  const [shoppingModal, setShoppingModal] = useState<UnifiedShoppingItem[] | null>(null);
  const [checkedShoppingItems, setCheckedShoppingItems] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isShoppingPending, startShoppingTransition] = useTransition();

  const searchParams = useSearchParams();
  const [showGeneratedBanner, setShowGeneratedBanner] = useState(false);

  useEffect(() => {
    if (searchParams.get('generated') === 'true') {
      setShowGeneratedBanner(true);
      const timer = setTimeout(() => setShowGeneratedBanner(false), 7000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Estados de filtros interactivos para exportación de compra
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<MealSlot[]>([
    'desayuno',
    'almuerzo_1',
    'almuerzo_2',
    'cena',
    'snack_postre',
  ]);

  // Fechas de la semana activa con locale dinámico y traducción
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(currentMonday);
      day.setDate(currentMonday.getDate() + i);
      const locale = language === 'en' ? 'en-US' : 'es-ES';
      return {
        date: day,
        dateStr: formatDateISO(day),
        name: t(DAY_KEYS[i]),
        shortName: t(DAY_SHORT_KEYS[i]),
        dayNum: day.getDate(),
        monthName: day.toLocaleDateString(locale, { month: 'short' }),
        fullDateLabel: day.toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }),
      };
    });
  }, [currentMonday, language, t]);

  const startDateStr = weekDays[0].dateStr;
  const endDateStr = weekDays[6].dateStr;

  // Filtrar recetas para el selector según el slot (los postres se excluyen de platos principales y primeros)
  const filteredPickerRecipes = useMemo(() => {
    if (!pickerModal) return userRecipes;
    return userRecipes
      .filter((r) => !isDessertExcludedFromSlot(r.rol_plato, pickerModal.slot))
      .sort((a, b) => {
        if (pickerModal.slot === 'snack_postre') {
          if (a.rol_plato === 'postre' && b.rol_plato !== 'postre') return -1;
          if (b.rol_plato === 'postre' && a.rol_plato !== 'postre') return 1;
        }
        return a.titulo.localeCompare(b.titulo, 'es');
      });
  }, [userRecipes, pickerModal]);

  // Sincronizar fechas seleccionadas por defecto con toda la semana activa
  useEffect(() => {
    setSelectedDates(weekDays.map((d) => d.dateStr));
  }, [weekDays]);

  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(currentMonday.getDate() - 7);
    setCurrentMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(currentMonday.getDate() + 7);
    setCurrentMonday(next);
  };

  const handleCurrentWeek = () => {
    setCurrentMonday(getMonday(new Date()));
  };

  // Presets de selección de días
  const handleSelectAllDays = () => {
    setSelectedDates(weekDays.map((d) => d.dateStr));
  };

  const handleSelectWorkdays = () => {
    setSelectedDates(weekDays.slice(0, 5).map((d) => d.dateStr));
  };

  const handleSelectMonToThu = () => {
    setSelectedDates(weekDays.slice(0, 4).map((d) => d.dateStr));
  };

  const handleSelectWeekend = () => {
    setSelectedDates(weekDays.slice(5, 7).map((d) => d.dateStr));
  };

  const handleToggleDay = (dateStr: string) => {
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  };

  // Presets de selección de slots
  const handleSelectAllSlots = () => {
    setSelectedSlots(['desayuno', 'almuerzo_1', 'almuerzo_2', 'cena', 'snack_postre']);
  };

  const handleSelectMainMeals = () => {
    setSelectedSlots(['almuerzo_1', 'almuerzo_2', 'cena']);
  };

  const handleToggleSlot = (slot: MealSlot) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  // Asignar receta a un slot
  const handleAssignRecipe = async (recetaId: string) => {
    if (!pickerModal) return;
    const { fecha, slot } = pickerModal;
    const recipe = userRecipes.find((r) => r.id === recetaId);

    // Optimistic UI con porciones del perfil del usuario
    const optimisticItem: PlannedSlotItem = {
      id: `temp-${Date.now()}`,
      usuario_id: '',
      receta_id: recetaId,
      fecha,
      slot,
      porciones: defaultDiners,
      notas: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      receta: recipe || null,
    };

    setPlans((prev) => [
      ...prev.filter((p) => !(p.fecha === fecha && p.slot === slot)),
      optimisticItem,
    ]);
    setPickerModal(null);

    await assignMealSlotAction({ fecha, slot, recetaId, porciones: defaultDiners });
  };

  // Quitar receta de un slot
  const handleRemoveSlot = async (fecha: string, slot: MealSlot) => {
    setPlans((prev) => prev.filter((p) => !(p.fecha === fecha && p.slot === slot)));
    await removeMealSlotAction({ fecha, slot });
  };

  // Herramienta de Reseteo / Limpieza de Menús
  const [isClearingWeek, setIsClearingWeek] = useState(false);
  const handleClearWeek = async () => {
    if (!window.confirm(t('planner_clear_week_confirm'))) return;
    setIsClearingWeek(true);
    try {
      const res = await clearWeeklyPlanAction(startDateStr, endDateStr);
      if (res.success) {
        setPlans((prev) => prev.filter((p) => p.fecha < startDateStr || p.fecha > endDateStr));
      } else {
        alert(res.error || 'Error al vaciar la semana');
      }
    } catch (err: any) {
      console.error('Error clearing weekly plan:', err);
    } finally {
      setIsClearingWeek(false);
    }
  };

  // Generar lista de la compra unificada con filtros activos
  const handleGenerateShoppingList = () => {
    const activeDates = selectedDates.length > 0 ? selectedDates : weekDays.map((d) => d.dateStr);
    const activeSlots: MealSlot[] =
      selectedSlots.length > 0
        ? [
            ...selectedSlots,
            ...(selectedSlots.includes('almuerzo_1') || selectedSlots.includes('almuerzo_2')
              ? (['almuerzo'] as MealSlot[])
              : []),
          ]
        : (['desayuno', 'almuerzo', 'almuerzo_1', 'almuerzo_2', 'cena', 'snack_postre'] as MealSlot[]);

    startShoppingTransition(async () => {
      const res = await generateUnifiedShoppingListAction(startDateStr, endDateStr, {
        selectedDates: activeDates,
        selectedSlots: activeSlots,
      });
      if (res.success && res.items) {
        setShoppingModal(res.items);
        setCheckedShoppingItems([]);
      }
    });
  };

  // Agrupar los ítems del modal por pasillo de supermercado
  const groupedShoppingAisles = useMemo(() => {
    if (!shoppingModal) return [];
    return groupItemsByAisle(shoppingModal, (item) => item.pasillo_supermercado);
  }, [shoppingModal]);

  const handleCopyShoppingList = () => {
    if (!shoppingModal) return;

    const isEn = language === 'en';
    const daysCount = selectedDates.length;
    const slotsCount = selectedSlots.length;
    const lines = [
      isEn ? `🛒 UNIFIED WEEKLY SHOPPING LIST` : `🛒 LISTA DE LA COMPRA SEMANAL UNIFICADA`,
      isEn
        ? `📅 Range: ${startDateStr} to ${endDateStr} (${daysCount} days · ${slotsCount} meals/day)`
        : `📅 Rango: ${startDateStr} al ${endDateStr} (${daysCount} días · ${slotsCount} comidas/día)`,
      '=======================================================',
    ];

    for (const group of groupedShoppingAisles) {
      lines.push(`\n📍 ${group.aisle.toUpperCase()}`);
      lines.push('-------------------------------------------------------');
      for (const item of group.items) {
        const isChecked = checkedShoppingItems.includes(item.nombre);
        const prefix = isChecked ? '✓' : '☐';
        const forLabel = isEn ? 'for' : 'para';
        lines.push(`${prefix} ${item.cantidadTotal} ${item.unidad} ${item.nombre} (${forLabel}: ${item.recetasNombres.join(', ')})`);
      }
    }

    lines.push('\n=======================================================');
    lines.push(isEn ? 'Created with Miga (Organized by Aisles)' : 'Creado con Miga (Organización por Pasillos)');

    navigator.clipboard.writeText(lines.join('\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // 3. Corrección Lógica de Almuerzos (1º + 2º vs Plato Único):
  // Helper dinámico para calcular los slots a renderizar por día
  const getDaySlots = (dateStr: string): DaySlotItem[] => {
    const dayPlans = plans.filter((p) => p.fecha === dateStr);
    const result: DaySlotItem[] = [];

    // 1. Desayuno
    const desayuno = dayPlans.find((p) => p.slot === 'desayuno');
    result.push({
      slot: 'desayuno',
      label: t('slot_breakfast'),
      icon: Sun,
      plan: desayuno,
    });

    // 2. Almuerzo
    const planAlmuerzo = dayPlans.find((p) => p.slot === 'almuerzo');
    const planAlmuerzo1 = dayPlans.find((p) => p.slot === 'almuerzo_1');
    const planAlmuerzo2 = dayPlans.find((p) => p.slot === 'almuerzo_2');

    if (planAlmuerzo1 && planAlmuerzo2) {
      // 1º y 2º plato complementarios asignados
      result.push({
        slot: 'almuerzo_1',
        label: t('slot_course_1'),
        icon: Soup,
        plan: planAlmuerzo1,
      });
      result.push({
        slot: 'almuerzo_2',
        label: t('slot_course_2'),
        icon: Utensils,
        plan: planAlmuerzo2,
      });
    } else if (planAlmuerzo) {
      // Plato único explícito asignado por algoritmo o usuario
      result.push({
        slot: 'almuerzo',
        label: t('slot_lunch_unique'),
        icon: Utensils,
        plan: planAlmuerzo,
        canAddSecondCourse: !planAlmuerzo2,
      });
    } else if (planAlmuerzo1 && !planAlmuerzo2) {
      // Solo almuerzo_1 asignado -> Etiquetar como Plato Único y ocultar el 2º
      result.push({
        slot: 'almuerzo_1',
        label: t('slot_lunch_unique'),
        icon: Utensils,
        plan: planAlmuerzo1,
        canAddSecondCourse: true,
      });
    } else if (planAlmuerzo2 && !planAlmuerzo1) {
      // Solo almuerzo_2 asignado
      result.push({
        slot: 'almuerzo_2',
        label: t('slot_lunch_unique'),
        icon: Utensils,
        plan: planAlmuerzo2,
      });
    } else {
      // Ningún plato asignado para almuerzo: único slot limpio (ocultando 2º plato)
      result.push({
        slot: 'almuerzo',
        label: t('slot_lunch_short'),
        icon: Utensils,
        plan: undefined,
      });
    }

    // 3. Cena
    const cena = dayPlans.find((p) => p.slot === 'cena');
    result.push({
      slot: 'cena',
      label: t('slot_dinner'),
      icon: Moon,
      plan: cena,
    });

    // 4. Snack / Postre
    const snack = dayPlans.find((p) => p.slot === 'snack_postre');
    result.push({
      slot: 'snack_postre',
      label: t('slot_snack_dessert'),
      icon: Apple,
      plan: snack,
    });

    return result;
  };

  // Renderizador de cada tarjeta de comida (compacta, sin scroll vertical, sin tiempo, con comensales reales)
  const renderSlotCard = (dayDateStr: string, slotItem: DaySlotItem) => {
    const assignedPlan = slotItem.plan;
    const currentSlot = slotItem.slot;
    const SlotIcon = slotItem.icon;
    const slotLabel = slotItem.label;
    const displayDiners = assignedPlan?.porciones ?? defaultDiners;

    if (assignedPlan && assignedPlan.receta) {
      return (
        <div
          key={`${dayDateStr}-${currentSlot}`}
          className="w-full max-w-full p-2.5 sm:p-3 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex items-center justify-between gap-2.5 transition-all hover:border-[#a86224]/50 group shadow-2xs"
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            {/* Micro header: Icono + Nombre del momento/rol */}
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              <SlotIcon className="w-3 h-3 text-[#a86224] shrink-0" />
              <span className="truncate">{slotLabel}</span>
            </div>

            {/* Título de la receta en font-serif-recipe */}
            <Link
              href={`/recipes/${assignedPlan.receta.id}`}
              className="text-xs sm:text-sm font-bold font-serif-recipe text-stone-900 hover:text-[#a86224] transition-colors block truncate leading-tight"
              title={assignedPlan.receta.titulo}
            >
              {assignedPlan.receta.titulo}
            </Link>

            {/* Número de comensales prioritario con icono 👥 (tiempo de cocción eliminado) */}
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#a86224]">
              <span className="flex items-center gap-1 shrink-0">
                <Users className="w-3.5 h-3.5 text-[#a86224] shrink-0" />
                <span>{displayDiners}</span>
              </span>

              {slotItem.canAddSecondCourse && (
                <>
                  <span className="text-stone-300">·</span>
                  <button
                    type="button"
                    onClick={() => setPickerModal({ fecha: dayDateStr, slot: 'almuerzo_2' })}
                    className="text-[10px] font-semibold text-stone-500 hover:text-[#a86224] hover:underline cursor-pointer"
                  >
                    {t('planner_add_second_course')}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Botones discretos de sustituir y eliminar plato */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setPickerModal({ fecha: dayDateStr, slot: currentSlot })}
              className="w-7 h-7 rounded-xl bg-white hover:bg-[#f4efe6] border border-[#e7dfd5] text-stone-600 hover:text-[#a86224] flex items-center justify-center transition cursor-pointer shadow-2xs"
              title={t('planner_replace_dish')}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleRemoveSlot(dayDateStr, currentSlot)}
              className="w-7 h-7 rounded-xl bg-white hover:bg-red-50 border border-[#e7dfd5] hover:border-red-200 text-stone-400 hover:text-red-600 flex items-center justify-center transition cursor-pointer shadow-2xs"
              title={t('planner_remove_recipe')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }

    // Slot vacío para asignar plato
    return (
      <div
        key={`${dayDateStr}-${currentSlot}`}
        className="w-full max-w-full p-2.5 sm:p-3 rounded-2xl bg-white border border-dashed border-[#d5cabb] hover:border-[#a86224] transition-all flex items-center justify-between gap-2.5"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-[#faf7f2] flex items-center justify-center text-stone-400 shrink-0">
            <SlotIcon className="w-3.5 h-3.5 text-stone-500" />
          </div>
          <span className="text-xs font-semibold text-stone-600 truncate">{slotLabel}</span>
        </div>

        <button
          type="button"
          onClick={() => setPickerModal({ fecha: dayDateStr, slot: currentSlot })}
          className="min-h-[28px] px-2.5 py-1 rounded-xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
        >
          <Plus className="w-3 h-3" />
          <span>{t('planner_assign_btn')}</span>
        </button>
      </div>
    );
  };

  const activeDay = weekDays[activeDayIndex];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full max-w-full overflow-x-hidden">
      {/* ============================================================== */}
      {/* 1. CABECERA MÓVIL MINIMALISTA (sm:hidden)                       */}
      {/* ============================================================== */}
      <div className="flex sm:hidden items-center justify-between gap-2 p-2.5 rounded-2xl bg-white border border-[#e7dfd5] shadow-xs">
        {/* Selector de semana compacto */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="w-8 h-8 rounded-xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-stone-700 transition cursor-pointer"
            title={t('planner_prev_week')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCurrentWeek}
            className="px-2.5 py-1 rounded-xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] text-[11px] font-bold font-serif-recipe text-stone-800 transition cursor-pointer leading-tight"
          >
            {language === 'en'
              ? `${weekDays[0].monthName} ${weekDays[0].dayNum}–${weekDays[6].dayNum}`
              : `${weekDays[0].dayNum}–${weekDays[6].dayNum} ${weekDays[0].monthName}`}
          </button>
          <button
            type="button"
            onClick={handleNextWeek}
            className="w-8 h-8 rounded-xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-stone-700 transition cursor-pointer"
            title={t('planner_next_week')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Acciones discretas en móvil */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleClearWeek}
            disabled={isClearingWeek || plans.length === 0}
            className="w-8 h-8 rounded-xl border border-[#e7dfd5] bg-white text-stone-500 hover:text-red-600 flex items-center justify-center transition cursor-pointer disabled:opacity-30"
            title={t('planner_clear_week_btn')}
          >
            {isClearingWeek ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer ${
              isFilterPanelOpen
                ? 'bg-[#f4efe6] border-[#a86224] text-[#a86224]'
                : 'bg-white border-[#e7dfd5] text-stone-600'
            }`}
            title={t('planner_shopping_filters')}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleGenerateShoppingList}
            disabled={isShoppingPending}
            className="h-8 px-2.5 rounded-xl bg-[#a86224] hover:bg-[#8e511c] text-white font-semibold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer disabled:opacity-50"
            title={t('planner_generate_shopping_list')}
          >
            {isShoppingPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShoppingCart className="w-3.5 h-3.5" />
            )}
            <span className="text-[11px] font-bold">{t('planner_shopping_btn_short')}</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. CABECERA COMPLETA PARA DESKTOP (hidden sm:flex)             */}
      {/* ============================================================== */}
      <div className="hidden sm:flex items-center justify-between gap-4 p-4 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="w-10 h-10 rounded-2xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-stone-700 transition cursor-pointer"
            title={t('planner_prev_week')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleCurrentWeek}
            className="min-h-[40px] px-3.5 rounded-2xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] text-xs font-semibold text-stone-800 transition cursor-pointer"
          >
            {t('planner_this_week')}
          </button>

          <button
            type="button"
            onClick={handleNextWeek}
            className="w-10 h-10 rounded-2xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-stone-700 transition cursor-pointer"
            title={t('planner_next_week')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="pl-2">
            <span className="text-xs sm:text-sm font-bold font-serif-recipe text-stone-900 block leading-tight">
              {language === 'en'
                ? `${weekDays[0].monthName} ${weekDays[0].dayNum} – ${weekDays[6].monthName} ${weekDays[6].dayNum}`
                : `${weekDays[0].dayNum} ${weekDays[0].monthName} – ${weekDays[6].dayNum} ${weekDays[6].monthName}`}
            </span>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider font-medium">
              {t('planner_weekly_planning')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearWeek}
            disabled={isClearingWeek || plans.length === 0}
            className="min-h-[46px] px-3.5 rounded-2xl border border-[#e7dfd5] bg-white hover:bg-red-50 hover:border-red-200 text-stone-600 hover:text-red-600 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
            title={t('planner_clear_week_btn')}
          >
            {isClearingWeek ? (
              <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>{isClearingWeek ? t('planner_clearing_week') : t('planner_clear_week_btn')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`min-h-[46px] px-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs ${
              isFilterPanelOpen
                ? 'bg-[#f4efe6] border-[#a86224] text-[#a86224]'
                : 'bg-white hover:bg-[#faf7f2] border-[#e7dfd5] text-stone-700'
            }`}
            title={t('planner_customize_export_desc')}
          >
            <SlidersHorizontal className="w-4 h-4 text-[#a86224]" />
            <span>{t('planner_shopping_filters')}</span>
            <span className="w-5 h-5 rounded-full bg-[#a86224] text-white text-[10px] flex items-center justify-center font-bold">
              {selectedDates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={handleGenerateShoppingList}
            disabled={isShoppingPending}
            className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-[#a86224] hover:bg-[#8e511c] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>
              {isShoppingPending ? t('planner_calculating_ingredients') : t('planner_generate_shopping_list')}
            </span>
          </button>
        </div>
      </div>

      {/* Banner de confirmación cuando llega desde /smart-menu */}
      {showGeneratedBanner && (
        <div className="p-3.5 sm:p-4 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-800 flex items-center justify-between gap-3 text-xs sm:text-sm animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{t('smart_menu_applied_success')}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowGeneratedBanner(false)}
            className="text-stone-400 hover:text-stone-600 font-bold px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* PANEL DE FILTROS INTERACTIVOS DE EXPORTACIÓN */}
      {isFilterPanelOpen && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#f4efe6] pb-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#a86224]" />
              <h3 className="text-sm font-bold text-stone-900 font-serif-recipe">
                {t('planner_customize_export_title')}
              </h3>
            </div>
            <span className="text-xs text-stone-500">
              {t('planner_customize_export_desc')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Control 1: Días de la semana */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700">
                  {t('planner_days_to_include')} ({selectedDates.length} / 7):
                </span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAllDays}
                    className="text-[#a86224] hover:underline cursor-pointer"
                  >
                    {t('planner_filter_all')}
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={handleSelectMonToThu}
                    className="text-[#a86224] hover:underline cursor-pointer"
                  >
                    {t('planner_filter_mon_thu')}
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={handleSelectWorkdays}
                    className="text-[#a86224] hover:underline cursor-pointer"
                  >
                    {t('planner_filter_mon_fri')}
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={handleSelectWeekend}
                    className="text-[#a86224] hover:underline cursor-pointer"
                  >
                    {t('planner_filter_weekend')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((d) => {
                  const isSelected = selectedDates.includes(d.dateStr);
                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => handleToggleDay(d.dateStr)}
                      className={`min-h-[46px] p-1 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-[#f4efe6] border-[#a86224] text-[#a86224] font-bold shadow-2xs'
                          : 'bg-white border-[#e7dfd5] text-stone-500 hover:bg-stone-50'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-semibold leading-none">{d.shortName}</span>
                      <span className="text-xs font-bold leading-tight mt-0.5">{d.dayNum}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Control 2: Bloques de Comida / Slots */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700">
                  {t('planner_meal_slots')} ({selectedSlots.length} / 5):
                </span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAllSlots}
                    className="text-[#a86224] hover:underline cursor-pointer"
                  >
                    {t('planner_filter_all')}
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={handleSelectMainMeals}
                    className="text-[#a86224] hover:underline cursor-pointer"
                  >
                    {t('planner_filter_lunches_dinners')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
                {SLOTS_CONFIG.map(({ slot, labelKey, icon: SlotIcon }) => {
                  const isSelected = selectedSlots.includes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => handleToggleSlot(slot)}
                      className={`min-h-[46px] px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#f4efe6] border-[#a86224] text-[#a86224] font-bold shadow-2xs'
                          : 'bg-white border-[#e7dfd5] text-stone-500 hover:bg-stone-50'
                      }`}
                    >
                      <SlotIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t(labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. CARRUSEL HORIZONTAL COMPACTO DE DÍAS (MÓVIL)                */}
      {/* ============================================================== */}
      <div className="flex sm:hidden overflow-x-auto gap-1.5 p-1 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] no-scrollbar">
        {weekDays.map((d, idx) => (
          <button
            key={d.dateStr}
            type="button"
            onClick={() => setActiveDayIndex(idx)}
            className={`min-h-[42px] px-2 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex flex-col items-center justify-center flex-1 ${
              activeDayIndex === idx
                ? 'bg-white text-stone-900 shadow-2xs font-bold border border-[#e7dfd5]'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span className="text-[9px] uppercase font-bold leading-none tracking-tight">{d.shortName}</span>
            <span className="text-xs font-bold leading-tight mt-0.5">{d.dayNum}</span>
          </button>
        ))}
      </div>

      {/* ============================================================== */}
      {/* 4. VISTA MÓVIL POR DÍA SIN SCROLL VERTICAL                     */}
      {/* ============================================================== */}
      <div className="block sm:hidden w-full max-w-full">
        <div className="rounded-3xl bg-white border border-[#e7dfd5] p-3 space-y-3 shadow-2xs w-full max-w-full overflow-hidden">
          {/* Cabecera del día activo */}
          <div className="border-b border-[#f4efe6] pb-2 flex items-center justify-between">
            <span className="text-sm font-bold font-serif-recipe text-stone-900 capitalize">
              {activeDay.fullDateLabel}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#a86224] px-2 py-0.5 rounded-lg bg-[#faf7f2] border border-[#e7dfd5]">
              {activeDay.shortName} {activeDay.dayNum}
            </span>
          </div>

          {/* Tarjetas compactas de las comidas de ese día */}
          <div className="space-y-2 w-full max-w-full">
            {getDaySlots(activeDay.dateStr).map((slotItem) =>
              renderSlotCard(activeDay.dateStr, slotItem)
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. VISTA DESKTOP: CUADRÍCULA DE 7 COLUMNAS                     */}
      {/* ============================================================== */}
      <div className="hidden sm:grid sm:grid-cols-7 gap-3.5 w-full max-w-full">
        {weekDays.map((day) => {
          const slots = getDaySlots(day.dateStr);

          return (
            <div
              key={day.dateStr}
              className="rounded-3xl bg-white border border-[#e7dfd5] p-3 space-y-3 shadow-2xs w-full max-w-full overflow-hidden"
            >
              {/* Encabezado del día */}
              <div className="border-b border-[#f4efe6] pb-2 text-center">
                <span className="text-xs uppercase font-bold tracking-wider text-[#a86224] block truncate">
                  {day.name}
                </span>
                <span className="text-xl font-bold font-serif-recipe text-stone-900">
                  {day.dayNum}
                </span>
              </div>

              {/* Slots calculados para el día */}
              <div className="space-y-2.5 w-full max-w-full">
                {slots.map((slotItem) => renderSlotCard(day.dateStr, slotItem))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: PICKER PARA ASIGNAR RECETAS DEL USUARIO AL SLOT       */}
      {/* ============================================================== */}
      {pickerModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#e7dfd5] shadow-2xl p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#e7dfd5] pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold font-serif-recipe text-stone-900">
                  {t('planner_assign_modal_title')}{' '}
                  {(() => {
                    if (pickerModal.slot === 'almuerzo') return t('slot_lunch_unique');
                    if (pickerModal.slot === 'almuerzo_1') return t('slot_course_1');
                    if (pickerModal.slot === 'almuerzo_2') return t('slot_course_2');
                    const found = SLOTS_CONFIG.find((s) => s.slot === pickerModal.slot);
                    return found ? t(found.labelKey) : pickerModal.slot;
                  })()}
                </h3>
                <p className="text-xs text-stone-500">
                  {t('planner_assign_date')}: {pickerModal.fecha} · <span className="text-[#a86224] font-semibold">👥 {defaultDiners}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerModal(null)}
                className="w-8 h-8 rounded-full bg-[#f4efe6] text-stone-600 flex items-center justify-center cursor-pointer hover:bg-stone-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {filteredPickerRecipes.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
                <p className="text-xs text-stone-500">
                  {userRecipes.length === 0
                    ? t('planner_no_recipes_title')
                    : language === 'en'
                    ? 'No matching recipes available for this meal course (e.g. desserts are excluded from main courses).'
                    : 'No hay recetas compatibles con este rol (los postres están excluidos de primeros y segundos platos).'}
                </p>
                <Link
                  href="/recipes"
                  className="inline-block px-4 py-2 rounded-xl bg-[#a86224] text-white text-xs font-semibold"
                >
                  {t('planner_go_to_cookbook')}
                </Link>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                {filteredPickerRecipes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleAssignRecipe(r.id)}
                    className="w-full min-h-[48px] p-2.5 sm:p-3 rounded-2xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] hover:border-[#a86224] transition text-left flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-[#a86224] transition-colors line-clamp-1">
                        {r.titulo}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 whitespace-nowrap overflow-hidden text-ellipsis mt-0.5">
                        <span className="flex items-center gap-1 shrink-0 font-semibold text-[#a86224]">
                          <Users className="w-3 h-3 text-[#a86224]" />
                          <span>{defaultDiners}</span>
                        </span>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-stone-400 group-hover:text-[#a86224] shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: LISTA DE LA COMPRA UNIFICADA CON AGRUPACIÓN POR PASILLO*/}
      {/* ============================================================== */}
      {shoppingModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-white border border-[#e7dfd5] shadow-2xl p-5 sm:p-6 space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#e7dfd5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-serif-recipe text-stone-900">
                    {t('planner_shopping_modal_title')}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {shoppingModal.length} {t('planner_ingredients_count')} · {selectedDates.length}{' '}
                    {t('planner_days_filtered')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShoppingModal(null)}
                className="w-8 h-8 rounded-full bg-[#f4efe6] text-stone-600 flex items-center justify-center cursor-pointer hover:bg-stone-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {shoppingModal.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs sm:text-sm text-stone-600">
                  {t('planner_no_assigned_recipes')}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-stone-500">
                    {t('planner_organized_by_aisle')}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyShoppingList}
                    className="min-h-[36px] px-3.5 rounded-xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] font-semibold text-stone-800 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#a86224]" />
                    <span>{isCopied ? t('planner_copied') : t('planner_copy_by_aisle')}</span>
                  </button>
                </div>

                <div className="overflow-y-auto space-y-5 pr-1 flex-1">
                  {groupedShoppingAisles.map((group) => {
                    const groupTotal = group.items.length;
                    const groupCompleted = group.items.filter((i) =>
                      checkedShoppingItems.includes(i.nombre)
                    ).length;
                    const isGroupCompleted = groupTotal > 0 && groupCompleted === groupTotal;

                    return (
                      <div key={group.aisle} className="space-y-2">
                        {/* Cabecera del Pasillo */}
                        <div className="flex items-center justify-between px-1">
                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${group.config.colorBg} ${group.config.colorText} ${group.config.colorBorder}`}
                          >
                            <Tag className="w-3.5 h-3.5" />
                            <span>{group.aisle}</span>
                            <span className="text-[11px] font-mono opacity-80">
                              ({groupCompleted}/{groupTotal})
                            </span>
                          </span>

                          {isGroupCompleted && (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              {t('planner_completed')} ✓
                            </span>
                          )}
                        </div>

                        {/* Lista de ítems en este pasillo */}
                        <div className="space-y-1.5">
                          {group.items.map((item) => {
                            const isChecked = checkedShoppingItems.includes(item.nombre);

                            return (
                              <div
                                key={item.nombre}
                                onClick={() => {
                                  setCheckedShoppingItems((prev) =>
                                    prev.includes(item.nombre)
                                      ? prev.filter((n) => n !== item.nombre)
                                      : [...prev, item.nombre]
                                  );
                                }}
                                className={`min-h-[48px] p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                  isChecked
                                    ? 'bg-[#f7f5f0] border-[#e2dbce] opacity-75'
                                    : 'bg-[#faf7f2] hover:bg-white border-[#e7dfd5]'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${
                                      isChecked
                                        ? 'bg-[#2e6b3e] border-[#2e6b3e] text-white'
                                        : 'border-[#cbbfae] bg-white'
                                    }`}
                                  >
                                    {isChecked && <Check className="w-3.5 h-3.5 stroke-3" />}
                                  </div>

                                  <div className="min-w-0">
                                    <span
                                      className={`text-xs sm:text-sm font-semibold block truncate ${
                                        isChecked ? 'line-through text-stone-400 font-normal' : 'text-stone-900'
                                      }`}
                                    >
                                      {item.nombre}
                                    </span>
                                    <span className="text-[10px] text-stone-400 block truncate">
                                      {t('planner_dishes')}: {item.recetasNombres.join(', ')}
                                    </span>
                                  </div>
                                </div>

                                <span
                                  className={`text-xs sm:text-sm font-bold shrink-0 tabular-nums ${
                                    isChecked ? 'line-through text-stone-400' : 'text-[#a86224]'
                                  }`}
                                >
                                  {item.cantidadTotal} {item.unidad}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
