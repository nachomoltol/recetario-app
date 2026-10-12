'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  ShoppingCart,
  Check,
  Copy,
  Clock,
  Utensils,
  Sun,
  Soup,
  Moon,
  Apple,
  X,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Receta } from '@/types/recipe';
import {
  MealSlot,
  PlannedSlotItem,
  UnifiedShoppingItem,
  assignMealSlotAction,
  removeMealSlotAction,
  generateUnifiedShoppingListAction,
} from '@/app/actions/mealPlanner';

interface MealPlannerViewProps {
  initialPlans: PlannedSlotItem[];
  userRecipes: Pick<Receta, 'id' | 'titulo' | 'tiempo_total_min' | 'porciones' | 'dificultad'>[];
}

const SLOTS_CONFIG: { slot: MealSlot; label: string; icon: typeof Sun }[] = [
  { slot: 'desayuno', label: 'Desayuno', icon: Sun },
  { slot: 'almuerzo', label: 'Almuerzo', icon: Soup },
  { slot: 'cena', label: 'Cena', icon: Moon },
  { slot: 'snack', label: 'Snack', icon: Apple },
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

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function MealPlannerView({ initialPlans, userRecipes }: MealPlannerViewProps) {
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()));
  const [plans, setPlans] = useState<PlannedSlotItem[]>(initialPlans);
  const [activeDayIndex, setActiveDayIndex] = useState(0); // Para vista mobile (0 a 6)

  // Modal para seleccionar receta
  const [pickerModal, setPickerModal] = useState<{ fecha: string; slot: MealSlot } | null>(null);

  // Modal para lista de la compra unificada
  const [shoppingModal, setShoppingModal] = useState<UnifiedShoppingItem[] | null>(null);
  const [checkedShoppingItems, setCheckedShoppingItems] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isShoppingPending, startShoppingTransition] = useTransition();

  // Fechas de la semana activa
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(currentMonday);
      day.setDate(currentMonday.getDate() + i);
      return {
        date: day,
        dateStr: formatDateISO(day),
        name: DAY_NAMES[i],
        dayNum: day.getDate(),
        monthName: day.toLocaleDateString('es-ES', { month: 'short' }),
      };
    });
  }, [currentMonday]);

  const startDateStr = weekDays[0].dateStr;
  const endDateStr = weekDays[6].dateStr;

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

  // Asignar receta a un slot
  const handleAssignRecipe = async (recetaId: string) => {
    if (!pickerModal) return;
    const { fecha, slot } = pickerModal;
    const recipe = userRecipes.find((r) => r.id === recetaId);

    // Optimistic UI
    const optimisticItem: PlannedSlotItem = {
      id: `temp_${Date.now()}`,
      usuario_id: '',
      receta_id: recetaId,
      fecha,
      slot,
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

    await assignMealSlotAction({ fecha, slot, recetaId });
  };

  // Quitar receta de un slot
  const handleRemoveSlot = async (fecha: string, slot: MealSlot) => {
    setPlans((prev) => prev.filter((p) => !(p.fecha === fecha && p.slot === slot)));
    await removeMealSlotAction({ fecha, slot });
  };

  // Generar lista de la compra unificada
  const handleGenerateShoppingList = () => {
    startShoppingTransition(async () => {
      const res = await generateUnifiedShoppingListAction(startDateStr, endDateStr);
      if (res.success && res.items) {
        setShoppingModal(res.items);
        setCheckedShoppingItems([]);
      }
    });
  };

  const handleCopyShoppingList = () => {
    if (!shoppingModal) return;
    const lines = [
      `🛒 LISTA DE LA COMPRA SEMANAL (${startDateStr} al ${endDateStr})`,
      '-------------------------------------------------------',
      ...shoppingModal.map((item) => {
        const isChecked = checkedShoppingItems.includes(item.nombre);
        const prefix = isChecked ? '✓' : '☐';
        return `${prefix} ${item.cantidadTotal} ${item.unidad} ${item.nombre} (para: ${item.recetasNombres.join(', ')})`;
      }),
      '-------------------------------------------------------',
      'Creado con Recetario App',
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra de Navegación de la Semana y Acciones */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="w-10 h-10 rounded-2xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-stone-700 transition cursor-pointer"
            title="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleCurrentWeek}
            className="min-h-[40px] px-3.5 rounded-2xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] text-xs font-semibold text-stone-800 transition cursor-pointer"
          >
            Esta semana
          </button>

          <button
            type="button"
            onClick={handleNextWeek}
            className="w-10 h-10 rounded-2xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-stone-700 transition cursor-pointer"
            title="Semana siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="pl-2">
            <span className="text-xs sm:text-sm font-bold font-serif-recipe text-stone-900 block leading-tight">
              {weekDays[0].dayNum} {weekDays[0].monthName} – {weekDays[6].dayNum} {weekDays[6].monthName}
            </span>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider font-medium">
              Planificación Semanal
            </span>
          </div>
        </div>

        {/* Botón Generador de Lista de la Compra Unificada */}
        <button
          type="button"
          onClick={handleGenerateShoppingList}
          disabled={isShoppingPending}
          className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-[#a86224] hover:bg-[#8e511c] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>
            {isShoppingPending ? 'Calculando ingredientes...' : 'Generar Lista de Compra'}
          </span>
        </button>
      </div>

      {/* Selector de día para Móviles (Tabs horizontales) */}
      <div className="flex sm:hidden overflow-x-auto gap-1.5 p-1.5 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] no-scrollbar">
        {weekDays.map((d, idx) => (
          <button
            key={d.dateStr}
            type="button"
            onClick={() => setActiveDayIndex(idx)}
            className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex flex-col items-center justify-center flex-1 ${
              activeDayIndex === idx
                ? 'bg-white text-stone-900 shadow-2xs font-bold border border-[#e7dfd5]'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>{d.name.slice(0, 3)}</span>
            <span className="text-[10px] font-normal">{d.dayNum}</span>
          </button>
        ))}
      </div>

      {/* Cuadrícula de Planificación (En móvil muestra el día activo; en desktop muestra los 7 días) */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-4">
        {weekDays.map((day, idx) => {
          const isHiddenOnMobile = activeDayIndex !== idx;

          return (
            <div
              key={day.dateStr}
              className={`rounded-3xl bg-white border border-[#e7dfd5] p-4 space-y-4 shadow-2xs ${
                isHiddenOnMobile ? 'hidden sm:block' : 'block'
              }`}
            >
              {/* Encabezado del día */}
              <div className="border-b border-[#f4efe6] pb-2 text-center">
                <span className="text-xs uppercase font-bold tracking-wider text-[#a86224] block">
                  {day.name}
                </span>
                <span className="text-xl font-bold font-serif-recipe text-stone-900">
                  {day.dayNum}
                </span>
              </div>

              {/* Los 4 slots fijos diarios */}
              <div className="space-y-3">
                {SLOTS_CONFIG.map(({ slot, label, icon: SlotIcon }) => {
                  const assignedPlan = plans.find(
                    (p) => p.fecha === day.dateStr && p.slot === slot
                  );

                  return (
                    <div
                      key={slot}
                      className="p-3 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-2 text-left"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600">
                        <span className="flex items-center gap-1.5 capitalize">
                          <SlotIcon className="w-3.5 h-3.5 text-[#a86224]" />
                          {label}
                        </span>

                        {assignedPlan && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(day.dateStr, slot)}
                            className="w-6 h-6 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition cursor-pointer"
                            title="Quitar receta"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {assignedPlan && assignedPlan.receta ? (
                        <div className="space-y-1">
                          <Link
                            href={`/recipes/${assignedPlan.receta.id}`}
                            className="text-xs font-bold font-serif-recipe text-stone-900 hover:text-[#a86224] transition-colors block line-clamp-2"
                          >
                            {assignedPlan.receta.titulo}
                          </Link>
                          <div className="flex items-center gap-2 text-[10px] text-stone-500">
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5 text-[#a86224]" />
                              {assignedPlan.receta.tiempo_total_min || 15}m
                            </span>
                            <span>·</span>
                            <span>{assignedPlan.receta.porciones}p</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPickerModal({ fecha: day.dateStr, slot })}
                          className="w-full min-h-[40px] py-1.5 px-2 rounded-xl border border-dashed border-[#d5cabb] hover:border-[#a86224] text-stone-500 hover:text-[#a86224] hover:bg-white text-[11px] font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Asignar</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: SELECTOR DE RECETA PARA ASIGNAR A UN SLOT             */}
      {/* ============================================================== */}
      {pickerModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#e7dfd5] shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#e7dfd5] pb-3">
              <div>
                <h3 className="text-lg font-bold font-serif-recipe text-stone-900">
                  Selecciona una receta
                </h3>
                <p className="text-xs text-stone-500 capitalize">
                  Para {pickerModal.slot} del {pickerModal.fecha}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerModal(null)}
                className="w-8 h-8 rounded-full bg-[#f4efe6] text-stone-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {userRecipes.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <BookOpen className="w-8 h-8 text-[#a86224] mx-auto" />
                <p className="text-xs sm:text-sm text-stone-600">
                  Aún no tienes recetas en tu recetario para planificar.
                </p>
                <Link
                  href="/recipes"
                  className="inline-block px-4 py-2 rounded-xl bg-[#a86224] text-white text-xs font-semibold"
                >
                  Capturar primera receta
                </Link>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                {userRecipes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleAssignRecipe(r.id)}
                    className="w-full p-3.5 rounded-2xl border border-[#e7dfd5] hover:border-[#a86224] bg-[#faf7f2] hover:bg-white text-left transition flex items-center justify-between gap-3 cursor-pointer group shadow-2xs"
                  >
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-[#a86224] transition-colors line-clamp-1">
                        {r.titulo}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                        <span>{r.tiempo_total_min || 15} min</span>
                        <span>·</span>
                        <span>{r.porciones} porciones</span>
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
      {/* MODAL 2: LISTA DE LA COMPRA UNIFICADA CON SUMA INTELIGENTE      */}
      {/* ============================================================== */}
      {shoppingModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-white border border-[#e7dfd5] shadow-2xl p-6 space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#e7dfd5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif-recipe text-stone-900">
                    Lista de Compra Semanal Unificada
                  </h3>
                  <p className="text-xs text-stone-500">
                    Suma inteligente de {shoppingModal.length} ingredientes agregados
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShoppingModal(null)}
                className="w-8 h-8 rounded-full bg-[#f4efe6] text-stone-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {shoppingModal.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs sm:text-sm text-stone-600">
                  No hay recetas asignadas en esta semana para generar la lista de la compra.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-stone-500">
                    Toca un ingrediente para tacharlo en el supermercado:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyShoppingList}
                    className="min-h-[36px] px-3.5 rounded-xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] font-semibold text-stone-800 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#a86224]" />
                    <span>{isCopied ? '¡Copiada!' : 'Copiar texto'}</span>
                  </button>
                </div>

                <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                  {shoppingModal.map((item) => {
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
                        className={`min-h-[50px] p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
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
                              Platos: {item.recetasNombres.join(', ')}
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
