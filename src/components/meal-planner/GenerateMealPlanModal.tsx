'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import {
  Sparkles,
  Sun,
  UtensilsCrossed,
  Moon,
  Apple,
  Check,
  X,
  Loader2,
  Calendar,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { Receta } from '@/types/recipe';
import { MealSlot, PlannedSlotItem, batchAssignMealSlotsAction } from '@/app/actions/mealPlanner';
import { generateSmartMealPlan } from '@/lib/mealPlanGenerator';
import { useLanguageStore } from '@/stores/useLanguageStore';

export interface GenerateMealPlanModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  startDate: string; // Formato YYYY-MM-DD (fecha del día actual o inicio de semana activa)
  userRecipes: Receta[];
  existingPlans?: PlannedSlotItem[];
  onPlanGenerated: (newItems: PlannedSlotItem[], warnings: string[]) => void;
}

export function GenerateMealPlanModal({
  isOpen,
  onOpenChange,
  startDate,
  userRecipes,
  existingPlans = [],
  onPlanGenerated,
}: GenerateMealPlanModalProps) {
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);

  // Estados del asistente Wizard
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [incluirDesayunos, setIncluirDesayunos] = useState<boolean>(true);
  const [incluirAlmuerzos, setIncluirAlmuerzos] = useState<boolean>(true);
  const [intentarPrimeroYSegundo, setIntentarPrimeroYSegundo] = useState<boolean>(true);
  const [incluirCenas, setIncluirCenas] = useState<boolean>(true);
  const [incluirSnackPostre, setIncluirSnackPostre] = useState<boolean>(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validación: Al menos una comida debe estar marcada
  const hasAnyMealSelected =
    incluirDesayunos || incluirAlmuerzos || incluirCenas || incluirSnackPostre;

  const handleGenerate = async () => {
    if (!hasAnyMealSelected) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      // 1. Extraer IDs de recetas usadas recientemente para evitar repeticiones
      const recentHistoryIds = (existingPlans || [])
        .map((p) => p.receta_id)
        .filter(Boolean) as string[];

      // 2. Invocar el motor inteligente con las opciones del Wizard
      const result = generateSmartMealPlan(userRecipes, {
        dias: selectedDays,
        fechaInicio: startDate,
        incluirDesayunos,
        incluirAlmuerzos,
        intentarPrimeroYSegundo: incluirAlmuerzos && intentarPrimeroYSegundo,
        incluirCenas,
        incluirSnackPostre,
        historialRecientesIds: recentHistoryIds,
      });

      if (!result.items || result.items.length === 0) {
        setErrorMessage(
          language === 'en'
            ? 'Not enough suitable recipes found to generate the plan. Please check your collection.'
            : 'No se encontraron recetas suficientes en tu colección para generar el menú.'
        );
        setIsGenerating(false);
        return;
      }

      // 3. Persistir en Supabase en lote (upsert atómico)
      const batchItems = result.items.map((it) => ({
        fecha: it.fecha,
        slot: it.slot as MealSlot,
        recetaId: it.receta.id,
      }));

      const saveRes = await batchAssignMealSlotsAction(batchItems);

      if (!saveRes.success) {
        setErrorMessage(saveRes.error || 'Error al persistir el menú en el planificador');
        setIsGenerating(false);
        return;
      }

      // 4. Mapear a formato PlannedSlotItem para actualizar el estado del cliente inmediatamente
      const generatedMapped: PlannedSlotItem[] = result.items.map((it) => ({
        id: `gen-${it.fecha}-${it.slot}-${Date.now()}`,
        usuario_id: '',
        receta_id: it.receta.id,
        fecha: it.fecha,
        slot: it.slot as MealSlot,
        notas: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        receta: {
          id: it.receta.id,
          titulo: it.receta.titulo,
          tiempo_total_min: it.receta.tiempo_total_min,
          porciones: it.receta.porciones,
          dificultad: it.receta.dificultad,
        },
      }));

      onPlanGenerated(generatedMapped, result.estadisticas.advertencias);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error generando menú con IA:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Error inesperado durante la generación.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 transition-opacity" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-[#fbf9f5] rounded-t-[28px] border-t border-[#e7dfd5] shadow-2xl flex flex-col focus:outline-none max-w-lg mx-auto w-full max-h-[90vh] overflow-hidden max-w-full">
          {/* Tirador táctil superior */}
          <div className="w-10 h-1.5 rounded-full bg-stone-300 mx-auto mt-2.5 mb-1 shrink-0 cursor-grab active:cursor-grabbing" />

          {/* Cabecera del Wizard */}
          <div className="px-5 py-3 border-b border-[#e7dfd5] flex items-center justify-between shrink-0 bg-white">
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-100 text-[#a86224] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <Drawer.Title className="text-sm sm:text-base font-bold font-serif-recipe text-stone-900 leading-tight truncate">
                  {t('planner_wizard_title')}
                </Drawer.Title>
              </div>
              <Drawer.Description className="text-[11px] text-stone-500 mt-0.5 truncate">
                {t('planner_wizard_subtitle')}
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-7 h-7 rounded-full bg-[#f4efe6] hover:bg-[#eae1d2] text-stone-600 flex items-center justify-center transition cursor-pointer shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Contenedor desplazable con los pasos del Wizard */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 w-full max-w-full overflow-x-hidden">
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* PASO 1: ¿Cuántos días planificamos? */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-stone-900 font-serif-recipe">
                    {t('planner_wizard_step_days')}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {t('planner_wizard_step_days_desc')}
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
                  {selectedDays} {t('planner_wizard_days_unit')}
                </span>
              </div>

              {/* Selector táctil 1 a 7 días */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSelectedDays(num)}
                    className={`flex-1 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer touch-manipulation ${
                      selectedDays === num
                        ? 'bg-[#a86224] text-white shadow-xs'
                        : 'bg-white hover:bg-[#fbf9f5] text-stone-700 border border-[#e7dfd5]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Accesos rápidos */}
              <div className="flex items-center gap-2 text-[11px] text-stone-500 pt-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedDays(5)}
                  className="hover:text-[#a86224] underline cursor-pointer"
                >
                  {language === 'en' ? '5 workdays' : '5 días laborables'}
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSelectedDays(7)}
                  className="hover:text-[#a86224] underline cursor-pointer"
                >
                  {language === 'en' ? 'Full week (7 days)' : 'Semana completa (7 días)'}
                </button>
              </div>
            </div>

            {/* PASO 2: ¿Qué comidas quieres incluir? */}
            <div className="space-y-2.5 pt-1 border-t border-[#e7dfd5]/80">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-stone-900 font-serif-recipe">
                  {t('planner_wizard_step_meals')}
                </h3>
                <p className="text-[11px] text-stone-500">
                  {t('planner_wizard_step_meals_desc')}
                </p>
              </div>

              <div className="space-y-2">
                {/* Desayuno */}
                <button
                  type="button"
                  onClick={() => setIncluirDesayunos(!incluirDesayunos)}
                  className={`w-full p-3 rounded-2xl border text-left transition-all active:scale-[0.99] flex items-center justify-between gap-3 cursor-pointer touch-manipulation ${
                    incluirDesayunos
                      ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                      : 'bg-white border-[#e7dfd5] hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        incluirDesayunos
                          ? 'bg-amber-500 text-white'
                          : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                        {t('planner_wizard_meal_breakfast')}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-stone-500 truncate">
                        {t('planner_wizard_meal_breakfast_sub')}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 ${
                      incluirDesayunos ? 'bg-[#a86224]' : 'bg-stone-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
                        incluirDesayunos ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>

                {/* Almuerzo / Comida Principal */}
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setIncluirAlmuerzos(!incluirAlmuerzos)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all active:scale-[0.99] flex items-center justify-between gap-3 cursor-pointer touch-manipulation ${
                      incluirAlmuerzos
                        ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                        : 'bg-white border-[#e7dfd5] hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          incluirAlmuerzos
                            ? 'bg-orange-600 text-white'
                            : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        <UtensilsCrossed className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                          {t('planner_wizard_meal_lunch')}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-stone-500 truncate">
                          {t('planner_wizard_meal_lunch_sub')}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 ${
                        incluirAlmuerzos ? 'bg-[#a86224]' : 'bg-stone-200'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
                          incluirAlmuerzos ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </button>

                  {/* Toggle Secundario: ¿Intentar 1º y 2º plato? (Solo si almuerzo está activo) */}
                  {incluirAlmuerzos && (
                    <div className="ml-4 pl-3 border-l-2 border-[#a86224]/30 animate-fade-in">
                      <button
                        type="button"
                        onClick={() => setIntentarPrimeroYSegundo(!intentarPrimeroYSegundo)}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all active:scale-[0.99] flex items-center justify-between gap-2.5 cursor-pointer touch-manipulation ${
                          intentarPrimeroYSegundo
                            ? 'bg-white border-[#a86224]/60 shadow-2xs'
                            : 'bg-stone-50/80 border-stone-200 text-stone-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Layers
                            className={`w-4 h-4 shrink-0 ${
                              intentarPrimeroYSegundo ? 'text-[#a86224]' : 'text-stone-400'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] sm:text-xs font-bold text-stone-900 truncate">
                              {t('planner_wizard_pair_courses')}
                            </p>
                            <p className="text-[10px] text-stone-500 truncate">
                              {t('planner_wizard_pair_courses_sub')}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 ${
                            intentarPrimeroYSegundo ? 'bg-[#a86224]' : 'bg-stone-200'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
                              intentarPrimeroYSegundo ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Cenas */}
                <button
                  type="button"
                  onClick={() => setIncluirCenas(!incluirCenas)}
                  className={`w-full p-3 rounded-2xl border text-left transition-all active:scale-[0.99] flex items-center justify-between gap-3 cursor-pointer touch-manipulation ${
                    incluirCenas
                      ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                      : 'bg-white border-[#e7dfd5] hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        incluirCenas
                          ? 'bg-indigo-600 text-white'
                          : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                        {t('planner_wizard_meal_dinner')}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-stone-500 truncate">
                        {t('planner_wizard_meal_dinner_sub')}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 ${
                      incluirCenas ? 'bg-[#a86224]' : 'bg-stone-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
                        incluirCenas ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>

                {/* Snacks o Postres */}
                <button
                  type="button"
                  onClick={() => setIncluirSnackPostre(!incluirSnackPostre)}
                  className={`w-full p-3 rounded-2xl border text-left transition-all active:scale-[0.99] flex items-center justify-between gap-3 cursor-pointer touch-manipulation ${
                    incluirSnackPostre
                      ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                      : 'bg-white border-[#e7dfd5] hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        incluirSnackPostre
                          ? 'bg-pink-600 text-white'
                          : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      <Apple className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                        {t('planner_wizard_meal_snack')}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-stone-500 truncate">
                        {t('planner_wizard_meal_snack_sub')}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 ${
                      incluirSnackPostre ? 'bg-[#a86224]' : 'bg-stone-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
                        incluirSnackPostre ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>
              </div>

              {!hasAnyMealSelected && (
                <p className="text-[11px] text-rose-600 font-medium pt-1">
                  {t('planner_wizard_no_meals_warning')}
                </p>
              )}
            </div>
          </div>

          {/* Pie Fijo con Botón de Generación Mobile-First */}
          <div className="p-3.5 sm:p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-[#e7dfd5] bg-white shrink-0">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!hasAnyMealSelected || isGenerating}
              className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-[#a86224] hover:bg-[#8e511c] active:scale-95 transition-all text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation select-none"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('planner_wizard_submitting_btn')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t('planner_wizard_submit_btn')}</span>
                </>
              )}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
