'use client';

import { useState, useEffect, useMemo } from 'react';
import { Drawer } from 'vaul';
import {
  Sun,
  UtensilsCrossed,
  Moon,
  Cookie,
  CakeSlice,
  Check,
  Star,
  X,
  Loader2,
  Sparkles,
  ChefHat,
  CheckCircle2,
} from 'lucide-react';
import { MomentoDia, RolPlato } from '@/types/database';
import { inferRecipeCategory, SuggestedCategory } from '@/lib/recipeCategorizer';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { TranslationKey } from '@/lib/i18n/translations';
import { updateRecipeClassificationAction } from '@/app/actions/recipeClassification';
import { RecetaConIngredientes } from './RecipeCollectionOrganizer';

export interface QuickCategorizeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  unclassifiedRecipes: RecetaConIngredientes[];
  onRecipeClassified?: (
    recetaId: string,
    data: {
      momentos_dia: MomentoDia[];
      rol_plato: RolPlato;
      es_favorito_menu: boolean;
    }
  ) => void;
}

export function QuickCategorizeModal({
  isOpen,
  onOpenChange,
  unclassifiedRecipes,
  onRecipeClassified,
}: QuickCategorizeModalProps) {
  const t = useLanguageStore((s) => s.t);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalInitial, setTotalInitial] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Al abrir el modal, reiniciamos el índice y congelamos el total inicial
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsCompleted(false);
      setTotalInitial(unclassifiedRecipes.length);
    }
  }, [isOpen, unclassifiedRecipes.length]);

  const currentRecipe = unclassifiedRecipes[currentIndex];

  // Inferencia heurística en segundo plano para la receta en pantalla
  const suggestion = useMemo<SuggestedCategory>(() => {
    if (!currentRecipe) {
      return { momentos_dia: ['almuerzo', 'cena'], rol_plato: 'completo', confianza: 'baja' };
    }
    return inferRecipeCategory({
      titulo: currentRecipe.titulo,
      calorias_por_porcion: currentRecipe.calorias_por_porcion,
      etiquetas: currentRecipe.etiquetas,
      descripcion: currentRecipe.descripcion,
      ingredientes: (currentRecipe.ingredientesNombres || []).map((name) => ({
        nombre_limpio: name,
        nombre_crudo: name,
      })),
    });
  }, [currentRecipe]);

  // Estados locales para la receta actual
  const [selectedMomentos, setSelectedMomentos] = useState<MomentoDia[]>(() => {
    const defaultMoments = [...suggestion.momentos_dia];
    if (suggestion.rol_plato === 'postre' && !defaultMoments.includes('postre')) {
      defaultMoments.push('postre');
    }
    return defaultMoments.length > 0 ? defaultMoments : (['almuerzo', 'cena'] as MomentoDia[]);
  });

  const [isMenuFavorite, setIsMenuFavorite] = useState<boolean>(false);

  // Sincronizar estados locales cuando cambia la receta actual o la sugerencia
  useEffect(() => {
    if (currentRecipe) {
      const defaultMoments = [...suggestion.momentos_dia];
      if (suggestion.rol_plato === 'postre' && !defaultMoments.includes('postre')) {
        defaultMoments.push('postre');
      }
      setSelectedMomentos(defaultMoments.length > 0 ? defaultMoments : (['almuerzo', 'cena'] as MomentoDia[]));
      setIsMenuFavorite(Boolean(currentRecipe.es_favorito_menu));
    }
  }, [currentRecipe, suggestion]);

  const toggleMomento = (momento: MomentoDia) => {
    setSelectedMomentos((prev) => {
      if (prev.includes(momento)) {
        if (prev.length === 1) return prev;
        return prev.filter((m) => m !== momento);
      } else {
        return [...prev, momento];
      }
    });
  };

  const advanceNext = () => {
    if (currentIndex + 1 >= unclassifiedRecipes.length) {
      setIsCompleted(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSaveAndNext = async () => {
    if (!currentRecipe) return;
    setIsSaving(true);
    try {
      // Inferencia de rol culinario en segundo plano
      let autoRol: RolPlato = suggestion.rol_plato || 'completo';
      if (selectedMomentos.includes('postre')) {
        autoRol = 'postre';
      } else if (autoRol === 'postre') {
        autoRol = 'completo';
      }

      const finalMomentos: MomentoDia[] =
        selectedMomentos.length > 0 ? selectedMomentos : (['almuerzo', 'cena'] as MomentoDia[]);

      const res = await updateRecipeClassificationAction({
        recetaId: currentRecipe.id,
        momentos_dia: finalMomentos,
        rol_plato: autoRol,
        es_favorito_menu: isMenuFavorite,
      });

      if (res.success) {
        onRecipeClassified?.(currentRecipe.id, {
          momentos_dia: finalMomentos,
          rol_plato: autoRol,
          es_favorito_menu: isMenuFavorite,
        });
      }

      advanceNext();
    } catch (err) {
      console.error('Error al clasificar receta rápida:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    advanceNext();
  };

  // 5 momentos del día directos y táctiles
  const momentosOptions: {
    id: MomentoDia;
    labelKey: TranslationKey;
    icon: typeof Sun;
  }[] = [
    { id: 'desayuno', labelKey: 'meal_moment_breakfast', icon: Sun },
    { id: 'almuerzo', labelKey: 'meal_moment_lunch', icon: UtensilsCrossed },
    { id: 'cena', labelKey: 'meal_moment_dinner', icon: Moon },
    { id: 'snack', labelKey: 'meal_moment_snack', icon: Cookie },
    { id: 'postre', labelKey: 'meal_moment_dessert', icon: CakeSlice },
  ];

  const totalCount = Math.max(totalInitial, unclassifiedRecipes.length);
  const currentStep = Math.min(currentIndex + 1, totalCount);
  const progressPercent = totalCount > 0 ? Math.round((currentStep / totalCount) * 100) : 100;

  const imageUrl = currentRecipe?.foto_url || currentRecipe?.imagen_portada_url;

  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 transition-opacity" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-[#fbf9f5] rounded-t-[28px] border-t border-[#e7dfd5] shadow-2xl flex flex-col focus:outline-none max-w-lg mx-auto w-full overflow-hidden max-w-full">
          {/* Tirador táctil superior */}
          <div className="w-10 h-1.5 rounded-full bg-stone-300 mx-auto mt-2.5 mb-1 shrink-0 cursor-grab active:cursor-grabbing" />

          {/* Cabecera del Drawer con indicador de progreso */}
          <div className="px-5 py-3 border-b border-[#e7dfd5] flex items-center justify-between shrink-0 bg-white">
            <div className="min-w-0 pr-3 flex-1">
              <div className="flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-[#a86224] shrink-0" />
                <Drawer.Title className="text-sm sm:text-base font-bold font-serif-recipe text-stone-900 leading-tight truncate">
                  {t('quick_categorize_modal_title')}
                </Drawer.Title>
              </div>
              <Drawer.Description className="text-[11px] text-stone-500 mt-0.5 truncate">
                {t('quick_categorize_modal_subtitle')}
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

          {/* Barra de progreso visual si hay recetas pendientes */}
          {!isCompleted && currentRecipe && (
            <div className="px-5 pt-3 pb-1 bg-white border-b border-[#e7dfd5]/60 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600">
                <span>
                  {t('quick_categorize_progress')
                    .replace('{current}', String(currentStep))
                    .replace('{total}', String(totalCount))}
                </span>
                <span className="text-[#a86224]">{progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#a86224] transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* CUERPO DEL DRAWER */}
          {isCompleted || !currentRecipe ? (
            /* Pantalla final de éxito cuando se clasificaron todas */
            <div className="p-6 text-center space-y-4 animate-fade-in w-full">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base sm:text-lg font-bold font-serif-recipe text-stone-900">
                  {t('quick_categorize_success_title')}
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto leading-relaxed">
                  {t('quick_categorize_success_desc')}
                </p>
              </div>
              <div className="pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="w-full min-h-[48px] py-3 px-6 rounded-2xl bg-[#a86224] hover:bg-[#8e511c] text-white font-bold text-sm transition active:scale-95 shadow-sm cursor-pointer touch-manipulation select-none"
                >
                  {t('quick_categorize_success_btn')}
                </button>
              </div>
            </div>
          ) : (
            /* Vista de Categorización de la receta actual */
            <div className="p-4 sm:p-5 space-y-3.5 w-full max-w-full overflow-x-hidden">
              {/* Tarjeta de Miniatura + Título */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#e7dfd5] shadow-2xs">
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-stone-100 border border-stone-200 flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={currentRecipe.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#f4efe6] text-[#a86224]">
                      <ChefHat className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-stone-900 font-serif-recipe text-xs sm:text-sm leading-snug line-clamp-2">
                    {currentRecipe.titulo}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] sm:text-[11px] text-stone-500">
                    <span className="capitalize">{currentRecipe.dificultad || 'Medio'}</span>
                    <span>•</span>
                    <span>{currentRecipe.tiempo_total_min || 15} min</span>
                  </div>
                </div>
              </div>

              {/* Chips de Momentos del Día */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#a86224]">
                    {t('categorize_moments_title')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    <span>{t('categorize_suggested_badge')}</span>
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {momentosOptions.map((opt) => {
                    const isSelected = selectedMomentos.includes(opt.id);
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleMomento(opt.id)}
                        className={`min-h-[42px] px-3.5 py-2 rounded-2xl border text-xs sm:text-sm font-semibold transition-all active:scale-95 flex items-center gap-2 cursor-pointer select-none touch-manipulation shadow-2xs ${
                          isSelected
                            ? 'bg-[#a86224] text-white border-[#a86224]'
                            : 'bg-white hover:bg-[#fbf9f5] text-stone-700 border-[#e7dfd5] hover:border-[#a86224]/50'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-white' : 'text-[#a86224]'
                          }`}
                        />
                        <span>{t(opt.labelKey)}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggle Favorito para menús semanales */}
              <button
                type="button"
                onClick={() => setIsMenuFavorite(!isMenuFavorite)}
                className={`w-full min-h-[46px] p-3 rounded-2xl border text-left transition-all active:scale-[0.99] flex items-center justify-between gap-2.5 cursor-pointer touch-manipulation ${
                  isMenuFavorite
                    ? 'bg-amber-50/90 border-amber-300 shadow-2xs'
                    : 'bg-white border-[#e7dfd5] hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isMenuFavorite
                        ? 'bg-amber-400 text-stone-900 shadow-2xs'
                        : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        isMenuFavorite ? 'fill-stone-900 text-stone-900' : 'text-stone-400'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                      {t('categorize_menu_fav_title')}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-stone-500 truncate">
                      {t('categorize_menu_fav_desc')}
                    </p>
                  </div>
                </div>

                {/* Switch estilo iOS */}
                <div
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 ${
                    isMenuFavorite ? 'bg-[#a86224]' : 'bg-stone-200'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
                      isMenuFavorite ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>

              {/* Botones inferiores de avance ergonomía mobile-first */}
              <div className="pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isSaving}
                  className="min-h-[48px] px-4 py-3 rounded-2xl border border-stone-200 hover:bg-stone-100 active:scale-95 text-stone-600 text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50 touch-manipulation select-none shrink-0"
                >
                  {t('quick_categorize_btn_skip')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  disabled={isSaving}
                  className="flex-1 min-h-[48px] py-3 px-5 rounded-2xl bg-[#a86224] hover:bg-[#8e511c] active:scale-95 transition-all text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 touch-manipulation select-none"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('quick_categorize_btn_saving')}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>{t('quick_categorize_btn_save_next')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
