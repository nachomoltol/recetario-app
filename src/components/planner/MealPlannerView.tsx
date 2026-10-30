'use client';

import { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
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
  Calendar,
  Search,
  Clock,
  UtensilsCrossed,
  Download,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ProSubscriptionModal = dynamic(
  () => import('@/components/subscription/ProSubscriptionModal').then((m) => m.ProSubscriptionModal),
  { ssr: false }
);
import { Receta, Usuario } from '@/types/recipe';
import {
  MealSlot,
  PlannedSlotItem,
  UnifiedShoppingItem,
  assignMealSlotAction,
  removeMealSlotAction,
  clearWeeklyPlanAction,
  generateUnifiedShoppingListAction,
  getWeeklyPlanAction,
} from '@/app/actions/mealPlanner';
import { groupItemsByAisle } from '@/lib/culinary/aisles';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { TranslationKey } from '@/lib/i18n/translations';
import { formatLocalDate, parseLocalDate, getMondayOfDate } from '@/lib/dateUtils';
import {
  isFirstCourseStarter,
  getRecipeMoments,
  matchesContextualMomento,
  ContextualMomentoFilter,
} from '@/lib/mealPlanGenerator';

export type { ContextualMomentoFilter };

interface MealPlannerViewProps {
  initialPlans: PlannedSlotItem[];
  userRecipes: Receta[];
  userProfile?: Usuario | null;
  initialTargetDate?: string;
}

const SLOTS_CONFIG: { slot: MealSlot; labelKey: TranslationKey; icon: typeof Sun }[] = [
  { slot: 'desayuno', labelKey: 'slot_breakfast', icon: Sun },
  { slot: 'almuerzo_1', labelKey: 'slot_lunch_1', icon: Soup },
  { slot: 'almuerzo_2', labelKey: 'slot_lunch_2', icon: Utensils },
  { slot: 'cena', labelKey: 'slot_dinner', icon: Moon },
  { slot: 'snack_postre', labelKey: 'slot_snack_dessert', icon: Apple },
];

export function getInitialFilterForSlot(slot: MealSlot): ContextualMomentoFilter {
  switch (slot) {
    case 'desayuno':
      return 'desayuno';
    case 'almuerzo_1':
      return 'primero';
    case 'almuerzo_2':
      return 'almuerzo';
    case 'almuerzo':
      return 'almuerzo';
    case 'cena':
      return 'cena';
    case 'snack_postre':
      return 'snack_postre';
    default:
      return 'todos';
  }
}

const PICKER_FILTER_CHIPS: {
  id: ContextualMomentoFilter;
  labelEs: string;
  labelEn: string;
  icon: typeof Sun;
}[] = [
  { id: 'todos', labelEs: 'Todos', labelEn: 'All', icon: Utensils },
  { id: 'desayuno', labelEs: 'Desayuno', labelEn: 'Breakfast', icon: Sun },
  { id: 'primero', labelEs: '1er Plato / Entrante', labelEn: '1st Course', icon: Soup },
  { id: 'almuerzo', labelEs: 'Almuerzo / Principal', labelEn: 'Lunch / Main', icon: UtensilsCrossed },
  { id: 'cena', labelEs: 'Cena', labelEn: 'Dinner', icon: Moon },
  { id: 'snack_postre', labelEs: 'Snack / Postre', labelEn: 'Snack / Dessert', icon: Apple },
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

interface DaySlotItem {
  slot: MealSlot;
  label: string;
  icon: typeof Sun;
  plan?: PlannedSlotItem;
  canAddSecondCourse?: boolean;
}

function getDateStringsBetween(startStr: string, endStr: string): string[] {
  if (!startStr || !endStr) return [];
  const start = startStr <= endStr ? startStr : endStr;
  const end = startStr <= endStr ? endStr : startStr;
  const dates: string[] = [];
  const curr = parseLocalDate(start);
  const last = parseLocalDate(end);
  while (curr <= last) {
    dates.push(formatLocalDate(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export function MealPlannerView({
  initialPlans,
  userRecipes,
  userProfile,
  initialTargetDate,
}: MealPlannerViewProps) {
  const language = useLanguageStore((s) => s.language);
  const isEn = language === 'en';
  const t = useLanguageStore((s) => s.t);
  const profileStore = useProfileStore((s) => s.profile);
  const searchParams = useSearchParams();

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

  const dateParam = searchParams.get('date') || initialTargetDate;
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const openShoppingParam = searchParams.get('openShopping');

  const [currentMonday, setCurrentMonday] = useState<Date>(() => {
    if (dateParam) {
      try {
        const target = parseLocalDate(dateParam);
        return getMondayOfDate(target);
      } catch (e) {
        return getMondayOfDate(new Date());
      }
    }
    return getMondayOfDate(new Date());
  });

  const [plans, setPlans] = useState<PlannedSlotItem[]>(initialPlans);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState<number>(() => {
    if (dateParam) {
      try {
        const target = parseLocalDate(dateParam);
        const monday = getMondayOfDate(target);
        const diffDays = Math.round((target.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          return diffDays;
        }
      } catch (e) {}
    }
    return 0;
  });
  const [pickerModal, setPickerModal] = useState<{ fecha: string; slot: MealSlot; momento?: ContextualMomentoFilter } | null>(null);
  const [pickerFilterCategory, setPickerFilterCategory] = useState<ContextualMomentoFilter>('todos');
  const [pickerSearchQuery, setPickerSearchQuery] = useState<string>('');
  const [shoppingModal, setShoppingModal] = useState<UnifiedShoppingItem[] | null>(null);
  const [checkedShoppingItems, setCheckedShoppingItems] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);

  const profileFromStore = useProfileStore((s) => s.profile);
  const profile = userProfile ?? profileFromStore;
  const isPaidPlan = ['pro', 'chef', 'premium', 'admin'].includes(
    (profile?.plan_suscripcion || '').trim().toLowerCase()
  );
  const [isShoppingPending, startShoppingTransition] = useTransition();

  const [showGeneratedBanner, setShowGeneratedBanner] = useState(false);
  const [twoCourseDays, setTwoCourseDays] = useState<Set<string>>(new Set());

  // Refs y estados para navegación por chips en el modal
  const chipsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkChipsScroll = () => {
    const el = chipsScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  const scrollChips = (dir: 'left' | 'right') => {
    if (chipsScrollRef.current) {
      chipsScrollRef.current.scrollBy({
        left: dir === 'left' ? -180 : 180,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (pickerModal) {
      const timer = setTimeout(checkChipsScroll, 120);
      window.addEventListener('resize', checkChipsScroll);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', checkChipsScroll);
      };
    }
  }, [pickerModal]);

  // Sincronizar con props del servidor cuando se revalide o cambie
  useEffect(() => {
    setPlans(initialPlans);
  }, [initialPlans]);

  // Si cambia el parámetro de fecha en la URL, actualizar currentMonday y cargar datos si es necesario
  useEffect(() => {
    if (dateParam) {
      try {
        const targetDate = parseLocalDate(dateParam);
        const targetMonday = getMondayOfDate(targetDate);
        const targetStr = formatLocalDate(targetMonday);
        const currentStr = formatLocalDate(currentMonday);
        if (targetStr !== currentStr) {
          setCurrentMonday(targetMonday);
          loadPlansForMonday(targetMonday);
        }
        const diffDays = Math.round((targetDate.getTime() - targetMonday.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          setActiveDayIndex(diffDays);
        }
      } catch (err) {
        console.error('Error sincronizando fecha desde URL:', err);
      }
    }
  }, [dateParam]);

  useEffect(() => {
    if (searchParams.get('generated') === 'true') {
      setShowGeneratedBanner(true);
      const timer = setTimeout(() => setShowGeneratedBanner(false), 7000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Estados de alcance de compra (semana actual vs rango continuo)
  const [shoppingScopeMode, setShoppingScopeMode] = useState<'week' | 'range'>(() => {
    return fromParam && toParam ? 'range' : 'week';
  });
  const [rangeStartDate, setRangeStartDate] = useState<string>(() => {
    return fromParam || formatLocalDate(new Date());
  });
  const [rangeEndDate, setRangeEndDate] = useState<string>(() => {
    if (toParam) return toParam;
    const end = new Date();
    end.setDate(end.getDate() + 6);
    return formatLocalDate(end);
  });
  const [isRangeConfigOpen, setIsRangeConfigOpen] = useState(false);

  // Auto-apertura si proviene de /smart-menu con openShopping=true
  useEffect(() => {
    if (openShoppingParam === 'true') {
      const s = fromParam || startDateStr;
      const e = toParam || endDateStr;
      setShoppingScopeMode('range');
      if (fromParam) setRangeStartDate(fromParam);
      if (toParam) setRangeEndDate(toParam);
      handleGenerateShoppingList(undefined, { mode: 'range', start: s, end: e });
    }
  }, [openShoppingParam, fromParam, toParam]);

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
      day.setHours(12, 0, 0, 0);
      const locale = language === 'en' ? 'en-US' : 'es-ES';
      return {
        date: day,
        dateStr: formatLocalDate(day),
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

  // Carga asíncrona de planes al cambiar de semana
  const loadPlansForMonday = async (mondayDate: Date) => {
    const startStr = formatLocalDate(mondayDate);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    const endStr = formatLocalDate(sundayDate);

    // Actualizar URL sin recarga completa para mantener coherencia de navegación
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('date', startStr);
      window.history.replaceState({}, '', url.toString());
    }

    setIsLoadingWeek(true);
    try {
      const res = await getWeeklyPlanAction(startStr, endStr);
      if (res.success && res.data) {
        setPlans((prev) => {
          const otherWeeks = prev.filter((p) => p.fecha < startStr || p.fecha > endStr);
          return [...otherWeeks, ...res.data!];
        });
      }
    } catch (err) {
      console.error('Error fetching weekly plans for week:', startStr, err);
    } finally {
      setIsLoadingWeek(false);
    }
  };

  // Manejador centralizado para abrir el modal de asignación prefiltrado por el contexto del slot
  const handleOpenAssignModal = (fecha: string, slot: MealSlot) => {
    const initialCategory = getInitialFilterForSlot(slot);
    setPickerFilterCategory(initialCategory);
    setPickerSearchQuery('');
    setPickerModal({ fecha, slot, momento: initialCategory });
  };

  // Contadores de recetas por categoría para mostrar en cada chip del selector
  // Obedece estricta y exclusivamente al array oficial de momentos asignados
  const recipeCategoryCounts = useMemo(() => {
    const counts: Record<ContextualMomentoFilter, number> = {
      todos: userRecipes.length,
      desayuno: 0,
      primero: 0,
      almuerzo: 0,
      cena: 0,
      snack_postre: 0,
    };

    for (const r of userRecipes) {
      const moments = getRecipeMoments(r);

      // Desayuno -> receta.momentos.includes('desayuno')
      if (moments.includes('desayuno')) {
        counts.desayuno++;
      }

      // 1er Plato (Modo dos platos) -> receta.momentos.includes('almuerzo') && isFirstCourseStarter(receta)
      if (moments.includes('almuerzo') && isFirstCourseStarter(r)) {
        counts.primero++;
      }

      // Almuerzo (Plato Único / 2do Plato) -> receta.momentos.includes('almuerzo')
      if (moments.includes('almuerzo')) {
        counts.almuerzo++;
      }

      // Cena -> receta.momentos.includes('cena')
      if (moments.includes('cena')) {
        counts.cena++;
      }

      // Snack / Postre -> receta.momentos.includes('snack') || receta.momentos.includes('postre')
      if (moments.includes('snack') || moments.includes('postre')) {
        counts.snack_postre++;
      }
    }

    return counts;
  }, [userRecipes]);

  // Filtrar recetas para el selector según el filtro de categoría activo y búsqueda
  const filteredPickerRecipes = useMemo(() => {
    if (!pickerModal) return userRecipes;

    let list = userRecipes;

    // 1. Filtrado contextual estricto por momento del día oficial (sin tags ni etiquetas automáticas)
    if (pickerFilterCategory !== 'todos') {
      list = list.filter((r) => matchesContextualMomento(r, pickerFilterCategory));
    }

    // 2. Buscador en tiempo real por texto (título, descripción, etiquetas)
    if (pickerSearchQuery.trim()) {
      const q = pickerSearchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const matchTitle = (r.titulo || '').toLowerCase().includes(q);
        const matchTags = (r.etiquetas || []).some((t) => t.toLowerCase().includes(q));
        return matchTitle || matchTags;
      });
    }

    return list.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
  }, [userRecipes, pickerModal, pickerFilterCategory, pickerSearchQuery]);

  // Sincronizar fechas seleccionadas por defecto con toda la semana activa
  useEffect(() => {
    setSelectedDates(weekDays.map((d) => d.dateStr));
  }, [weekDays]);

  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(currentMonday.getDate() - 7);
    prev.setHours(12, 0, 0, 0);
    setCurrentMonday(prev);
    loadPlansForMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(currentMonday.getDate() + 7);
    next.setHours(12, 0, 0, 0);
    setCurrentMonday(next);
    loadPlansForMonday(next);
  };

  const handleCurrentWeek = () => {
    const thisMonday = getMondayOfDate(new Date());
    setCurrentMonday(thisMonday);
    loadPlansForMonday(thisMonday);
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
      ...prev.filter(
        (p) =>
          !(
            p.fecha === fecha &&
            (p.slot === slot || (slot === 'almuerzo_1' && p.slot === 'almuerzo'))
          )
      ),
      optimisticItem,
    ]);
    setPickerModal(null);

    if (slot === 'almuerzo_1' || slot === 'almuerzo_2') {
      const hasLegacyAlmuerzo = plans.some((p) => p.fecha === fecha && p.slot === 'almuerzo');
      if (hasLegacyAlmuerzo) {
        await removeMealSlotAction({ fecha, slot: 'almuerzo' });
      }
    }

    await assignMealSlotAction({ fecha, slot, recetaId, porciones: defaultDiners });
  };

  // Quitar receta de un slot
  const handleRemoveSlot = async (fecha: string, slot: MealSlot) => {
    setPlans((prev) =>
      prev.filter(
        (p) =>
          !(
            p.fecha === fecha &&
            (p.slot === slot || (slot === 'almuerzo_1' && p.slot === 'almuerzo'))
          )
      )
    );
    await removeMealSlotAction({ fecha, slot });
    if (slot === 'almuerzo_1') {
      await removeMealSlotAction({ fecha, slot: 'almuerzo' });
    }
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

  // Generar lista de la compra unificada con filtros activos y soporte de rango continuo
  const handleGenerateShoppingList = (
    datesOverride?: string[],
    scopeOverride?: { mode?: 'week' | 'range'; start?: string; end?: string }
  ) => {
    const activeMode = scopeOverride?.mode || shoppingScopeMode;
    let minDate = startDateStr;
    let maxDate = endDateStr;
    let activeDates: string[] = [];

    if (activeMode === 'range') {
      const s = scopeOverride?.start || rangeStartDate;
      const e = scopeOverride?.end || rangeEndDate;
      minDate = s <= e ? s : e;
      maxDate = s <= e ? e : s;
      activeDates =
        datesOverride && datesOverride.length > 0
          ? datesOverride
          : getDateStringsBetween(minDate, maxDate);
    } else {
      activeDates =
        datesOverride && datesOverride.length > 0
          ? datesOverride
          : selectedDates.length > 0
          ? selectedDates
          : weekDays.map((d) => d.dateStr);

      const sorted = [...activeDates].sort();
      minDate = sorted[0] || startDateStr;
      maxDate = sorted[sorted.length - 1] || endDateStr;
    }

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
      const res = await generateUnifiedShoppingListAction(minDate, maxDate, {
        selectedDates: activeDates,
        selectedSlots: activeSlots,
      });
      if (res.success && res.items) {
        setShoppingModal(res.items);
        setCheckedShoppingItems([]);
      }
    });
  };

  const handleUpdateDaysInModal = (newDates: string[]) => {
    setSelectedDates(newDates);
    handleGenerateShoppingList(newDates, { mode: 'week' });
  };

  const handleSwitchScopeMode = (newMode: 'week' | 'range') => {
    setShoppingScopeMode(newMode);
    if (newMode === 'week') {
      const currentWeekDates = selectedDates.length > 0 ? selectedDates : weekDays.map((d) => d.dateStr);
      handleGenerateShoppingList(currentWeekDates, { mode: 'week' });
    } else {
      handleGenerateShoppingList(undefined, {
        mode: 'range',
        start: rangeStartDate,
        end: rangeEndDate,
      });
    }
  };

  const handleApplyPresetDays = (numDays: number) => {
    const baseDate = parseLocalDate(rangeStartDate || formatLocalDate(new Date()));
    const endDateObj = new Date(baseDate);
    endDateObj.setDate(baseDate.getDate() + (numDays - 1));
    const newStart = formatLocalDate(baseDate);
    const newEnd = formatLocalDate(endDateObj);

    setRangeStartDate(newStart);
    setRangeEndDate(newEnd);
    handleGenerateShoppingList(undefined, {
      mode: 'range',
      start: newStart,
      end: newEnd,
    });
  };

  // Agrupar los ítems del modal por pasillo de supermercado
  const groupedShoppingAisles = useMemo(() => {
    if (!shoppingModal) return [];
    return groupItemsByAisle(shoppingModal, (item) => item.pasillo_supermercado);
  }, [shoppingModal]);

  const handleExportPdf = async () => {
    if (!isPaidPlan) {
      setIsProModalOpen(true);
      return;
    }

    setIsExportingPdf(true);
    try {
      let itemsToExport = shoppingModal;

      if (!itemsToExport || itemsToExport.length === 0) {
        let minDate = startDateStr;
        let maxDate = endDateStr;
        let activeDates: string[] = [];

        if (shoppingScopeMode === 'range') {
          minDate = rangeStartDate <= rangeEndDate ? rangeStartDate : rangeEndDate;
          maxDate = rangeStartDate <= rangeEndDate ? rangeEndDate : rangeStartDate;
          activeDates = getDateStringsBetween(minDate, maxDate);
        } else {
          activeDates = selectedDates.length > 0 ? selectedDates : weekDays.map((d) => d.dateStr);
          const sorted = [...activeDates].sort();
          minDate = sorted[0] || startDateStr;
          maxDate = sorted[sorted.length - 1] || endDateStr;
        }

        const activeSlots: MealSlot[] =
          selectedSlots.length > 0
            ? [
                ...selectedSlots,
                ...(selectedSlots.includes('almuerzo_1') || selectedSlots.includes('almuerzo_2')
                  ? (['almuerzo'] as MealSlot[])
                  : []),
              ]
            : (['desayuno', 'almuerzo', 'almuerzo_1', 'almuerzo_2', 'cena', 'snack_postre'] as MealSlot[]);

        const res = await generateUnifiedShoppingListAction(minDate, maxDate, {
          selectedDates: activeDates,
          selectedSlots: activeSlots,
        });
        if (res.success && res.items) {
          itemsToExport = res.items;
        } else {
          itemsToExport = [];
        }
      }

      const daysInfo =
        shoppingScopeMode === 'range'
          ? getDateStringsBetween(
              rangeStartDate <= rangeEndDate ? rangeStartDate : rangeEndDate,
              rangeStartDate <= rangeEndDate ? rangeEndDate : rangeStartDate
            ).map((dateStr) => {
              const d = parseLocalDate(dateStr);
              const locale = language === 'en' ? 'en-US' : 'es-ES';
              return {
                dateStr,
                dayName: d.toLocaleDateString(locale, { weekday: 'short' }),
                dayNum: d.getDate(),
              };
            })
          : weekDays.map((d) => ({
              dateStr: d.dateStr,
              dayName: d.shortName,
              dayNum: d.dayNum,
            }));

      const dateRangeLabel =
        shoppingScopeMode === 'range'
          ? `${rangeStartDate} — ${rangeEndDate}`
          : `${startDateStr} — ${endDateStr}`;

      // Obtener planes completos para el rango de días a exportar
      let plansToExport = plans;
      if (
        shoppingScopeMode === 'range' ||
        (daysInfo.length > 0 &&
          (daysInfo[0].dateStr !== startDateStr ||
            daysInfo[daysInfo.length - 1].dateStr !== endDateStr))
      ) {
        const firstDate = daysInfo[0].dateStr;
        const lastDate = daysInfo[daysInfo.length - 1].dateStr;
        const minDate = firstDate <= lastDate ? firstDate : lastDate;
        const maxDate = firstDate <= lastDate ? lastDate : firstDate;
        try {
          const plansRes = await getWeeklyPlanAction(minDate, maxDate);
          if (plansRes.success && plansRes.data) {
            plansToExport = plansRes.data;
          }
        } catch (e) {
          console.warn('Fallback a planes locales para PDF:', e);
        }
      }

      const { exportMealPlanToPdf } = await import('@/lib/pdf/exportMealPlanToPdf');

      await exportMealPlanToPdf({
        dateRangeLabel,
        days: daysInfo,
        plans: plansToExport,
        shoppingItems: itemsToExport || [],
        defaultServings: defaultDiners,
        language,
      });
    } catch (err) {
      console.error('Error exportando PDF:', err);
      alert(language === 'en' ? 'Error generating PDF' : 'Error al generar el PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

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
        const qtyStr = item.cantidadTotal > 0 ? `${item.cantidadTotal} ${item.unidad}` : item.unidad;
        lines.push(`${prefix} ${qtyStr} ${item.nombre} (${forLabel}: ${item.recetasNombres.join(', ')})`);
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

    const isTwoCourseMode = Boolean(planAlmuerzo1 || planAlmuerzo2 || twoCourseDays.has(dateStr));

    if (isTwoCourseMode) {
      // Modo dos platos: 1er plato y 2do plato
      result.push({
        slot: 'almuerzo_1',
        label: t('slot_course_1'),
        icon: Soup,
        plan: planAlmuerzo1 || planAlmuerzo,
      });
      result.push({
        slot: 'almuerzo_2',
        label: t('slot_course_2'),
        icon: Utensils,
        plan: planAlmuerzo2,
      });
    } else if (planAlmuerzo) {
      // Plato único asignado
      result.push({
        slot: 'almuerzo',
        label: t('slot_lunch_unique'),
        icon: Utensils,
        plan: planAlmuerzo,
        canAddSecondCourse: true,
      });
    } else {
      // Ningún plato asignado para almuerzo: único slot limpio con opción discreta de 2º plato
      result.push({
        slot: 'almuerzo',
        label: t('slot_lunch_short'),
        icon: Utensils,
        plan: undefined,
        canAddSecondCourse: true,
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

  // Renderizador de cada tarjeta de comida para MÓVIL (compacta, sin scroll vertical, con comensales reales)
  const renderMobileSlotCard = (dayDateStr: string, slotItem: DaySlotItem) => {
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
              href={`/recipes/${assignedPlan.receta.id}?servings=${displayDiners}&from=planner&date=${dayDateStr}`}
              className="text-xs sm:text-sm font-bold font-serif-recipe text-stone-900 hover:text-[#a86224] transition-colors block truncate leading-tight"
              title={assignedPlan.receta.titulo}
            >
              {assignedPlan.receta.titulo}
            </Link>

            {/* Número de comensales prioritario con icono 👥 */}
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
                    onClick={() => {
                      setTwoCourseDays((prev) => new Set(prev).add(dayDateStr));
                      handleOpenAssignModal(dayDateStr, 'almuerzo_2');
                    }}
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
              onClick={() => handleOpenAssignModal(dayDateStr, currentSlot)}
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

    // Slot vacío para asignar plato en móvil
    return (
      <div
        key={`${dayDateStr}-${currentSlot}`}
        className="w-full max-w-full p-2.5 sm:p-3 rounded-2xl bg-white border border-dashed border-[#d5cabb] hover:border-[#a86224] transition-all flex items-center justify-between gap-2.5"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-[#faf7f2] flex items-center justify-center text-stone-400 shrink-0">
            <SlotIcon className="w-3.5 h-3.5 text-stone-500" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-stone-600 truncate block">{slotLabel}</span>
            {slotItem.canAddSecondCourse && !assignedPlan && (
              <button
                type="button"
                onClick={() => setTwoCourseDays((prev) => new Set(prev).add(dayDateStr))}
                className="text-[10px] font-semibold text-stone-500 hover:text-[#a86224] hover:underline cursor-pointer flex items-center gap-0.5 mt-0.5 transition"
              >
                <span>{t('planner_add_second_course')}</span>
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAssignModal(dayDateStr, currentSlot)}
          className="min-h-[28px] px-2.5 py-1 rounded-xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
        >
          <Plus className="w-3 h-3" />
          <span>{t('planner_assign_btn')}</span>
        </button>
      </div>
    );
  };

  // Renderizador de cada tarjeta de comida para ESCRITORIO Y TABLET (tipografía holgada, varias líneas, botones horizontales)
  const renderDesktopSlotCard = (dayDateStr: string, slotItem: DaySlotItem) => {
    const assignedPlan = slotItem.plan;
    const currentSlot = slotItem.slot;
    const SlotIcon = slotItem.icon;
    const slotLabel = slotItem.label;
    const displayDiners = assignedPlan?.porciones ?? defaultDiners;

    if (assignedPlan && assignedPlan.receta) {
      return (
        <div
          key={`${dayDateStr}-${currentSlot}`}
          className="w-full p-3 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-2 text-left hover:border-[#a86224]/50 transition-all group shadow-2xs flex flex-col justify-between"
        >
          {/* Fila superior: Icono de comida + Nombre del slot */}
          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600">
            <span className="flex items-center gap-1.5 capitalize text-stone-600">
              <SlotIcon className="w-3.5 h-3.5 text-[#a86224] shrink-0" />
              <span className="truncate">{slotLabel}</span>
            </span>
          </div>

          {/* Título de la receta: tipografía holgada en varias líneas */}
          <div className="flex-1 py-0.5">
            <Link
              href={`/recipes/${assignedPlan.receta.id}?servings=${displayDiners}&from=planner&date=${dayDateStr}`}
              className="text-xs sm:text-sm font-bold font-serif-recipe text-stone-900 hover:text-[#a86224] transition-colors block line-clamp-2 leading-snug"
              title={assignedPlan.receta.titulo}
            >
              {assignedPlan.receta.titulo}
            </Link>
          </div>

          {/* Barra inferior: Raciones y Botones de acción ordenados horizontalmente sin comprimirse */}
          <div className="flex items-center justify-between pt-1.5 border-t border-[#e7dfd5]/60 text-[11px] font-semibold text-[#a86224]">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="flex items-center gap-1 text-[#a86224]" title={`${displayDiners} ${t('planner_servings')}`}>
                <Users className="w-3.5 h-3.5 text-[#a86224] shrink-0" />
                <span>{displayDiners}</span>
              </span>

              {slotItem.canAddSecondCourse && (
                <>
                  <span className="text-stone-300">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTwoCourseDays((prev) => new Set(prev).add(dayDateStr));
                      handleOpenAssignModal(dayDateStr, 'almuerzo_2');
                    }}
                    className="text-[10px] font-semibold text-stone-500 hover:text-[#a86224] hover:underline cursor-pointer"
                    title={t('planner_add_second_course')}
                  >
                    {t('planner_add_second_course')}
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenAssignModal(dayDateStr, currentSlot)}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-white hover:bg-[#f4efe6] border border-[#e7dfd5] text-stone-600 hover:text-[#a86224] flex items-center justify-center transition cursor-pointer shadow-2xs"
                title={t('planner_replace_dish')}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleRemoveSlot(dayDateStr, currentSlot)}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-white hover:bg-red-50 border border-[#e7dfd5] hover:border-red-200 text-stone-400 hover:text-red-600 flex items-center justify-center transition cursor-pointer shadow-2xs"
                title={t('planner_remove_recipe')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Slot vacío para asignar plato en escritorio y tablet
    return (
      <div
        key={`${dayDateStr}-${currentSlot}`}
        className="w-full p-2.5 sm:p-3 rounded-2xl bg-white border border-dashed border-[#d5cabb] hover:border-[#a86224] transition-all space-y-1.5"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500">
          <SlotIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="truncate">{slotLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => handleOpenAssignModal(dayDateStr, currentSlot)}
          className="w-full min-h-[34px] py-1 px-2 rounded-xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>{t('planner_assign_btn')}</span>
        </button>
        {slotItem.canAddSecondCourse && !assignedPlan && (
          <button
            type="button"
            onClick={() => setTwoCourseDays((prev) => new Set(prev).add(dayDateStr))}
            className="w-full text-center text-[10px] font-semibold text-stone-500 hover:text-[#a86224] transition cursor-pointer pt-0.5"
          >
            {t('planner_add_second_course')}
          </button>
        )}
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
            className="px-2.5 py-1 rounded-xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] text-[11px] font-bold font-serif-recipe text-stone-800 transition cursor-pointer leading-tight flex items-center gap-1.5"
          >
            {isLoadingWeek && <Loader2 className="w-3 h-3 animate-spin text-[#a86224]" />}
            <span>
              {language === 'en'
                ? `${weekDays[0].monthName} ${weekDays[0].dayNum}–${weekDays[6].dayNum}`
                : `${weekDays[0].dayNum}–${weekDays[6].dayNum} ${weekDays[0].monthName}`}
            </span>
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
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="w-8 h-8 rounded-xl border border-[#e7dfd5] bg-[#faf7f2] hover:bg-[#f4efe6] text-stone-700 flex items-center justify-center transition cursor-pointer shadow-2xs disabled:opacity-50"
            title={t('planner_export_pdf')}
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#a86224]" />
            ) : (
              <Download className="w-3.5 h-3.5 text-[#a86224]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleGenerateShoppingList()}
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

          <div className="pl-2 flex items-center gap-2">
            <div>
              <span className="text-xs sm:text-sm font-bold font-serif-recipe text-stone-900 block leading-tight">
                {language === 'en'
                  ? `${weekDays[0].monthName} ${weekDays[0].dayNum} – ${weekDays[6].monthName} ${weekDays[6].dayNum}`
                  : `${weekDays[0].dayNum} ${weekDays[0].monthName} – ${weekDays[6].dayNum} ${weekDays[6].monthName}`}
              </span>
              <span className="text-[10px] text-stone-500 uppercase tracking-wider font-medium">
                {t('planner_weekly_planning')}
              </span>
            </div>
            {isLoadingWeek && <Loader2 className="w-4 h-4 animate-spin text-[#a86224]" />}
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
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] text-stone-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
            title={t('planner_export_pdf')}
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#a86224]" />
            ) : (
              <Download className="w-4 h-4 text-[#a86224]" />
            )}
            <span>{t('planner_export_pdf')}</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-md ml-0.5">
              PRO
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleGenerateShoppingList()}
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
        <div className="p-3.5 sm:p-4 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-800 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-semibold">{t('smart_menu_applied_success')}</span>
              {fromParam && toParam && (
                <span className="text-[11px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md font-medium">
                  {fromParam} → {toParam}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {fromParam && toParam && (
              <button
                type="button"
                onClick={() => {
                  setShoppingScopeMode('range');
                  setRangeStartDate(fromParam);
                  setRangeEndDate(toParam);
                  handleGenerateShoppingList(undefined, { mode: 'range', start: fromParam, end: toParam });
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{t('planner_generate_shopping_list')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowGeneratedBanner(false)}
              className="text-stone-400 hover:text-stone-600 font-bold px-2 py-1 cursor-pointer"
            >
              ✕
            </button>
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
              renderMobileSlotCard(activeDay.dateStr, slotItem)
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. VISTA ESCRITORIO Y TABLET: CUADRÍCULA DE 7 COLUMNAS         */}
      {/* ============================================================== */}
      <div className="hidden sm:block w-full overflow-x-auto pb-4">
        <div className="grid grid-cols-7 gap-3 lg:gap-3.5 min-w-[840px] w-full">
          {weekDays.map((day) => {
            const slots = getDaySlots(day.dateStr);

            return (
              <div
                key={day.dateStr}
                className="rounded-3xl bg-white border border-[#e7dfd5] p-3 sm:p-3.5 space-y-3 shadow-2xs flex flex-col justify-start"
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
                <div className="space-y-2.5 flex-1">
                  {slots.map((slotItem) => renderDesktopSlotCard(day.dateStr, slotItem))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: PICKER PARA ASIGNAR RECETAS DEL USUARIO AL SLOT       */}
      {/* ============================================================== */}
      {pickerModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#e7dfd5] shadow-2xl p-4 sm:p-6 space-y-3.5 max-h-[88vh] flex flex-col">
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between border-b border-[#e7dfd5] pb-3 shrink-0">
              <div className="min-w-0 pr-2">
                <h3 className="text-base sm:text-lg font-bold font-serif-recipe text-stone-900 truncate">
                  {t('planner_assign_modal_title')}{' '}
                  {(() => {
                    if (pickerModal.slot === 'almuerzo') return t('slot_lunch_unique');
                    if (pickerModal.slot === 'almuerzo_1') return t('slot_course_1');
                    if (pickerModal.slot === 'almuerzo_2') return t('slot_course_2');
                    const found = SLOTS_CONFIG.find((s) => s.slot === pickerModal.slot);
                    return found ? t(found.labelKey) : pickerModal.slot;
                  })()}
                </h3>
                <p className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                  <span>
                    {t('planner_assign_date')}: <span className="font-medium text-stone-700">{pickerModal.fecha}</span>
                  </span>
                  <span>·</span>
                  <span className="text-[#a86224] font-semibold flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{defaultDiners} {t('home_servings')}</span>
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerModal(null)}
                className="w-8 h-8 rounded-full bg-[#f4efe6] text-stone-600 flex items-center justify-center cursor-pointer hover:bg-stone-200 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Buscador de texto interactivo */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={pickerSearchQuery}
                onChange={(e) => setPickerSearchQuery(e.target.value)}
                placeholder={isEn ? 'Search by title or tag...' : 'Buscar receta por título o etiqueta...'}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#a86224] focus:bg-white transition"
              />
              {pickerSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPickerSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Chips de filtro contextual (Desayuno, 1er Plato, Almuerzo, Cena, Snack/Postre, Todos) */}
            <div className="relative flex items-center group/chips shrink-0">
              {/* Flecha scroll izquierda (PC / Tablet) */}
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => scrollChips('left')}
                  aria-label={t('planner_scroll_left')}
                  className="hidden sm:flex absolute -left-2 z-20 w-7 h-7 rounded-full bg-white/95 border border-[#e7dfd5] text-stone-600 hover:text-stone-900 shadow-md items-center justify-center transition cursor-pointer hover:bg-stone-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              <div
                ref={chipsScrollRef}
                onScroll={checkChipsScroll}
                className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs w-full scroll-smooth"
              >
                {PICKER_FILTER_CHIPS.map((chip) => {
                  const isActive = pickerFilterCategory === chip.id;
                  const ChipIcon = chip.icon;
                  const label = isEn ? chip.labelEn : chip.labelEs;
                  const count = recipeCategoryCounts[chip.id] ?? 0;

                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => {
                        if (isActive && chip.id !== 'todos') {
                          setPickerFilterCategory('todos');
                        } else {
                          setPickerFilterCategory(chip.id);
                        }
                      }}
                      className={`min-h-[30px] px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-[#a86224] text-white border-[#a86224] shadow-xs'
                          : 'bg-[#faf7f2] hover:bg-white text-stone-600 border-[#e7dfd5]'
                      }`}
                    >
                      <ChipIcon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                      <span>{label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive ? 'bg-white/25 text-white' : 'bg-stone-200/80 text-stone-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Flecha scroll derecha (PC / Tablet) */}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => scrollChips('right')}
                  aria-label={t('planner_scroll_right')}
                  className="hidden sm:flex absolute -right-2 z-20 w-7 h-7 rounded-full bg-white/95 border border-[#e7dfd5] text-stone-600 hover:text-stone-900 shadow-md items-center justify-center transition cursor-pointer hover:bg-stone-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Sutil degradado en móvil a la derecha para señalar visualmente que la lista continúa */}
              {canScrollRight && (
                <div
                  aria-hidden="true"
                  className="sm:hidden pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-white via-white/80 to-transparent z-10"
                />
              )}
            </div>

            {/* Indicador de filtro activo con reset rápido */}
            {pickerFilterCategory !== 'todos' && (
              <div className="flex items-center justify-between text-[11px] text-stone-500 px-1 shrink-0">
                <span>
                  {isEn ? 'Filtered by' : 'Filtrando por'}:{' '}
                  <strong className="text-[#a86224]">
                    {isEn
                      ? PICKER_FILTER_CHIPS.find((c) => c.id === pickerFilterCategory)?.labelEn
                      : PICKER_FILTER_CHIPS.find((c) => c.id === pickerFilterCategory)?.labelEs}
                  </strong>{' '}
                  ({filteredPickerRecipes.length} {isEn ? 'recipes' : 'recetas'})
                </span>
                <button
                  type="button"
                  onClick={() => setPickerFilterCategory('todos')}
                  className="text-[#a86224] hover:underline font-semibold cursor-pointer"
                >
                  {isEn ? 'Show all' : 'Mostrar todas'}
                </button>
              </div>
            )}

            {/* Lista de recetas filtradas o estado vacío */}
            {filteredPickerRecipes.length === 0 ? (
              <div className="p-6 sm:p-8 text-center space-y-3 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-stone-800">
                    {pickerFilterCategory !== 'todos'
                      ? isEn
                        ? 'No recipes match this category'
                        : 'No tienes recetas en esta categoría'
                      : isEn
                      ? 'No recipes found'
                      : 'No se encontraron recetas'}
                  </h4>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">
                    {pickerFilterCategory !== 'todos'
                      ? isEn
                        ? 'You can switch to All recipes or explore your cookbook.'
                        : 'Puedes pulsar «Ver todas» para asignar cualquier plato guardado a este momento.'
                      : isEn
                      ? 'Try adjusting your search terms.'
                      : 'Prueba a cambiar el término de búsqueda o explora el recetario.'}
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  {pickerFilterCategory !== 'todos' && (
                    <button
                      type="button"
                      onClick={() => {
                        setPickerFilterCategory('todos');
                        setPickerSearchQuery('');
                      }}
                      className="px-4 py-2 rounded-xl bg-[#a86224] hover:bg-[#8e511c] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      {isEn ? `View all recipes (${userRecipes.length})` : `Ver todas mis recetas (${userRecipes.length})`}
                    </button>
                  )}
                  <Link
                    href={`/recipes/collection?momento=${pickerFilterCategory}&assignDate=${pickerModal.fecha}&assignSlot=${pickerModal.slot}`}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-[#faf7f2] border border-[#e7dfd5] text-stone-700 text-xs font-semibold transition"
                  >
                    {t('planner_go_to_cookbook')}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                {filteredPickerRecipes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleAssignRecipe(r.id)}
                    className="w-full min-h-[48px] p-2.5 sm:p-3 rounded-2xl bg-[#faf7f2] hover:bg-white border border-[#e7dfd5] hover:border-[#a86224] transition text-left flex items-center justify-between gap-3 cursor-pointer group shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-[#a86224] transition-colors line-clamp-1">
                        {r.titulo}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                        <span className="flex items-center gap-1 font-semibold text-[#a86224]">
                          <Users className="w-3 h-3" />
                          <span>{defaultDiners} {t('home_servings')}</span>
                        </span>
                        {r.tiempo_total_min && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-stone-400" />
                              <span>{r.tiempo_total_min} min</span>
                            </span>
                          </>
                        )}
                        {r.rol_plato && (
                          <>
                            <span>·</span>
                            <span className="capitalize text-stone-400">{r.rol_plato.replace('_', ' ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-white group-hover:bg-[#a86224] border border-[#e7dfd5] group-hover:border-[#a86224] flex items-center justify-center shrink-0 transition-colors">
                      <Plus className="w-4 h-4 text-stone-500 group-hover:text-white" />
                    </div>
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
          <div className="w-full max-w-xl rounded-3xl bg-white border border-[#e7dfd5] shadow-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 max-h-[90vh] flex flex-col">
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
                    {shoppingModal.length} {t('planner_ingredients_count')} ·{' '}
                    {shoppingScopeMode === 'range'
                      ? `${rangeStartDate} — ${rangeEndDate}`
                      : `${selectedDates.length || 7} ${t('planner_days_filtered')}`}
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

            {/* Pestañas de Alcance: Semana en pantalla vs Rango continuo */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1 p-1 bg-[#ede6dc] rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSwitchScopeMode('week')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      shoppingScopeMode === 'week'
                        ? 'bg-white text-stone-900 shadow-2xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {t('planner_scope_week')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchScopeMode('range')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      shoppingScopeMode === 'range'
                        ? 'bg-white text-stone-900 shadow-2xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {t('planner_scope_continuous')}
                  </button>
                </div>

                {shoppingScopeMode === 'week' && (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-600">
                    <button
                      type="button"
                      onClick={() => handleUpdateDaysInModal(weekDays.map((d) => d.dateStr))}
                      className="text-[#a86224] hover:underline cursor-pointer font-semibold"
                    >
                      {t('planner_filter_all')}
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateDaysInModal(weekDays.slice(0, 5).map((d) => d.dateStr))}
                      className="text-[#a86224] hover:underline cursor-pointer font-semibold"
                    >
                      {t('planner_filter_mon_fri')}
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateDaysInModal(weekDays.slice(0, 4).map((d) => d.dateStr))}
                      className="text-[#a86224] hover:underline cursor-pointer font-semibold"
                    >
                      {t('planner_filter_mon_thu')}
                    </button>
                  </div>
                )}
              </div>

              {shoppingScopeMode === 'week' ? (
                /* Píldoras táctiles horizontales de la semana actual */
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {weekDays.map((d) => {
                    const isSelected = selectedDates.includes(d.dateStr);
                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        onClick={() => {
                          const nextDates = isSelected
                            ? selectedDates.filter((date) => date !== d.dateStr)
                            : [...selectedDates, d.dateStr];
                          const finalDates = nextDates.length > 0 ? nextDates : [d.dateStr];
                          handleUpdateDaysInModal(finalDates);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0 ${
                          isSelected
                            ? 'bg-[#a86224] text-white shadow-2xs font-bold'
                            : 'bg-white hover:bg-stone-50 border border-[#e7dfd5] text-stone-600'
                        }`}
                      >
                        <span>{d.shortName}</span>
                        <span className="text-[10px] opacity-80">{d.dayNum}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Controles de Rango Continuo */
                !isRangeConfigOpen ? (
                  /* Píldora Resumen Compacta en Móvil/Desktop */
                  <div className="flex items-center justify-between bg-white border border-[#e7dfd5] px-3 py-2 rounded-xl text-xs shadow-2xs">
                    <div className="flex items-center gap-2 text-stone-700 min-w-0">
                      <Calendar className="w-3.5 h-3.5 text-[#a86224] shrink-0" />
                      <span className="font-semibold truncate">
                        {rangeStartDate} — {rangeEndDate}
                      </span>
                      <span className="text-[11px] text-stone-500 shrink-0">
                        ({getDateStringsBetween(rangeStartDate, rangeEndDate).length} {t('planner_days_short')})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRangeConfigOpen(true)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#a86224] hover:text-[#8e511c] ml-2 shrink-0 cursor-pointer"
                    >
                      <span>{t('planner_adjust_dates')}</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Panel Extendido de Configuración de Fechas */
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                      <span className="text-stone-600 text-[11px]">
                        {t('planner_range_continuous_desc')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-stone-500 font-medium mr-0.5">Presets:</span>
                        {[
                          { days: 3, labelKey: 'planner_preset_3_days' as const },
                          { days: 5, labelKey: 'planner_preset_5_days' as const },
                          { days: 7, labelKey: 'planner_preset_7_days' as const },
                        ].map(({ days, labelKey }) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => handleApplyPresetDays(days)}
                            className="px-2 py-0.5 rounded-lg bg-white border border-[#e7dfd5] hover:border-[#a86224] text-[#a86224] text-[11px] font-semibold transition cursor-pointer shadow-2xs"
                          >
                            {t(labelKey)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-white border border-[#e7dfd5] px-2.5 py-1.5 rounded-xl text-xs flex-1 sm:flex-initial">
                        <span className="text-stone-500 text-[11px] font-medium">{t('planner_date_from')}:</span>
                        <input
                          type="date"
                          value={rangeStartDate}
                          onChange={(e) => setRangeStartDate(e.target.value)}
                          className="bg-transparent text-stone-800 font-medium focus:outline-none text-xs cursor-pointer w-full"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 bg-white border border-[#e7dfd5] px-2.5 py-1.5 rounded-xl text-xs flex-1 sm:flex-initial">
                        <span className="text-stone-500 text-[11px] font-medium">{t('planner_date_to')}:</span>
                        <input
                          type="date"
                          value={rangeEndDate}
                          onChange={(e) => setRangeEndDate(e.target.value)}
                          className="bg-transparent text-stone-800 font-medium focus:outline-none text-xs cursor-pointer w-full"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 w-full sm:w-auto mt-1 sm:mt-0">
                        <button
                          type="button"
                          disabled={isShoppingPending}
                          onClick={() => {
                            setIsRangeConfigOpen(false);
                            handleGenerateShoppingList(undefined, {
                              mode: 'range',
                              start: rangeStartDate,
                              end: rangeEndDate,
                            });
                          }}
                          className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-[#a86224] hover:bg-[#8e511c] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                        >
                          {isShoppingPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Search className="w-3.5 h-3.5" />
                          )}
                          <span>{t('planner_update_list')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsRangeConfigOpen(false)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>{t('planner_collapse_dates')}</span>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {shoppingModal.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs sm:text-sm text-stone-600">
                  {t('planner_no_assigned_recipes')}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-row items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    className="flex-1 min-h-[36px] py-2 px-2.5 sm:px-3 rounded-xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] font-medium text-xs sm:text-sm text-stone-800 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {isExportingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#a86224] shrink-0" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-[#a86224] shrink-0" />
                    )}
                    <span className="truncate">{t('planner_export_pdf')}</span>
                    <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-md shrink-0">
                      PRO
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyShoppingList}
                    className="flex-1 min-h-[36px] py-2 px-2.5 sm:px-3 rounded-xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] font-medium text-xs sm:text-sm text-stone-800 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#a86224] shrink-0" />
                    <span className="truncate">{isCopied ? t('planner_copied') : t('planner_copy_by_aisle')}</span>
                  </button>
                </div>

                <div className="overflow-y-auto space-y-4 sm:space-y-5 pr-1 flex-1 min-h-0">
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
                          {group.items.map((item, index) => {
                            const isChecked = checkedShoppingItems.includes(item.nombre);

                            return (
                              <div
                                key={`${item.nombre}___${item.unidad || 'ud'}___${index}`}
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
                                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                  <div
                                    className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                                      isChecked
                                        ? 'bg-[#2e6b3e] border-[#2e6b3e] text-white'
                                        : 'border-[#cbbfae] bg-white'
                                    }`}
                                  >
                                    {isChecked && <Check className="w-3.5 h-3.5 stroke-3" />}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <span
                                      className={`break-words whitespace-normal text-sm sm:text-base font-medium block leading-snug ${
                                        isChecked ? 'line-through text-stone-400 font-normal' : 'text-stone-900'
                                      }`}
                                    >
                                      {item.nombre}
                                    </span>
                                    {item.recetasNombres && item.recetasNombres.length > 0 && (
                                      <span className="text-xs text-stone-500 block break-words mt-0.5 leading-tight">
                                        {t('planner_dishes')}: {item.recetasNombres.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <span
                                  className={`text-xs sm:text-sm font-bold shrink-0 text-right tabular-nums ml-2.5 ${
                                    isChecked ? 'line-through text-stone-400' : 'text-[#a86224]'
                                  }`}
                                >
                                  {item.cantidadTotal > 0 ? `${item.cantidadTotal} ${item.unidad}` : item.unidad}
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

      {/* Modal Pro para exportación a PDF y funciones avanzadas */}
      <ProSubscriptionModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
      />
    </div>
  );
}
