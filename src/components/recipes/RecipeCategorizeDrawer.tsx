'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { MomentoDia, RolPlato } from '@/types/database';
import { inferRecipeCategory, SuggestedCategory } from '@/lib/recipeCategorizer';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { TranslationKey } from '@/lib/i18n/translations';

export interface RecipeCategorizeDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  receta: {
    id: string;
    titulo: string;
    calorias_por_porcion?: number | null;
    etiquetas?: string[] | null;
    descripcion?: string | null;
    momentos_dia?: MomentoDia[] | string[] | null;
    rol_plato?: RolPlato | null;
    es_favorito_menu?: boolean | null;
  };
  ingredientes?: { nombre_limpio?: string; nombre_crudo?: string }[] | null;
  onSave: (data: {
    momentos_dia: MomentoDia[];
    rol_plato: RolPlato;
    es_favorito_menu: boolean;
  }) => Promise<void> | void;
}

export function RecipeCategorizeDrawer({
  isOpen,
  onOpenChange,
  receta,
  ingredientes,
  onSave,
}: RecipeCategorizeDrawerProps) {
  const t = useLanguageStore((s) => s.t);

  // Inferencia heurística calculada en segundo plano
  const suggestion = useMemo<SuggestedCategory>(() => {
    return inferRecipeCategory({
      titulo: receta.titulo,
      calorias_por_porcion: receta.calorias_por_porcion,
      etiquetas: receta.etiquetas,
      descripcion: receta.descripcion,
      ingredientes: ingredientes || [],
    });
  }, [receta.titulo, receta.calorias_por_porcion, receta.etiquetas, receta.descripcion, ingredientes]);

  const hasExistingClassification = Boolean(
    receta.momentos_dia && receta.momentos_dia.length > 0
  );

  // Estados locales del formulario
  const [selectedMomentos, setSelectedMomentos] = useState<MomentoDia[]>(() => {
    if (receta.momentos_dia && receta.momentos_dia.length > 0) {
      return receta.momentos_dia as MomentoDia[];
    }
    const initial = [...suggestion.momentos_dia];
    if (suggestion.rol_plato === 'postre' && !initial.includes('postre')) {
      initial.push('postre');
    }
    return initial.length > 0 ? initial : ['almuerzo', 'cena'];
  });

  const [isMenuFavorite, setIsMenuFavorite] = useState<boolean>(() => {
    return Boolean(receta.es_favorito_menu);
  });

  const [isSaving, setIsSaving] = useState(false);

  // Flag para apertura automática una única vez al montar si no tiene clasificación previa
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!autoOpenedRef.current && !hasExistingClassification) {
      autoOpenedRef.current = true;
      const timer = setTimeout(() => {
        onOpenChange(true);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [hasExistingClassification, onOpenChange]);

  // Sincronizar estado cuando el drawer se abre
  useEffect(() => {
    if (isOpen) {
      if (receta.momentos_dia && receta.momentos_dia.length > 0) {
        setSelectedMomentos(receta.momentos_dia as MomentoDia[]);
      } else {
        const initial = [...suggestion.momentos_dia];
        if (suggestion.rol_plato === 'postre' && !initial.includes('postre')) {
          initial.push('postre');
        }
        setSelectedMomentos(initial.length > 0 ? initial : ['almuerzo', 'cena']);
      }
      setIsMenuFavorite(Boolean(receta.es_favorito_menu));
    }
  }, [isOpen, receta.momentos_dia, receta.rol_plato, receta.es_favorito_menu, suggestion]);

  // Manejo de chips táctiles de momentos
  const toggleMomento = (momento: MomentoDia) => {
    setSelectedMomentos((prev) => {
      if (prev.includes(momento)) {
        if (prev.length === 1) return prev; // Mantener siempre al menos 1 momento
        return prev.filter((m) => m !== momento);
      } else {
        return [...prev, momento];
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Asignación automática de rol culinario en segundo plano
      let autoRol: RolPlato = suggestion.rol_plato || 'completo';

      // Si el usuario seleccionó 'postre', el rol culinario interno se fija como 'postre'
      if (selectedMomentos.includes('postre')) {
        autoRol = 'postre';
      } else if (autoRol === 'postre') {
        autoRol = 'completo';
      }

      await onSave({
        momentos_dia: selectedMomentos.length > 0 ? selectedMomentos : ['almuerzo', 'cena'],
        rol_plato: autoRol,
        es_favorito_menu: isMenuFavorite,
      });
      onOpenChange(false);
    } catch (err) {
      console.error('Error al guardar categorización en Drawer:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Los 5 momentos del día directos y táctiles
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

  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 transition-opacity" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-[#fbf9f5] rounded-t-[28px] border-t border-[#e7dfd5] shadow-2xl flex flex-col focus:outline-none max-w-lg mx-auto w-full overflow-hidden">
          {/* Tirador táctil superior */}
          <div className="w-10 h-1.5 rounded-full bg-stone-300 mx-auto mt-2.5 mb-1 shrink-0 cursor-grab active:cursor-grabbing" />

          {/* Cabecera del Drawer ultracompacta */}
          <div className="px-5 py-3 border-b border-[#e7dfd5] flex items-center justify-between shrink-0 bg-white">
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-[#a86224] shrink-0" />
                <Drawer.Title className="text-sm sm:text-base font-bold font-serif-recipe text-stone-900 leading-tight truncate">
                  {t('categorize_drawer_title')}
                </Drawer.Title>
              </div>
              <Drawer.Description className="text-[11px] text-stone-500 mt-0.5 truncate">
                {t('categorize_drawer_subtitle')}
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

          {/* Contenido sin scroll vertical interno - Ultracompacto */}
          <div className="p-4 sm:p-5 space-y-3.5 w-full">
            {/* Chips de Momentos del Día */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a86224]">
                  {t('categorize_moments_title')}
                </span>
                {!hasExistingClassification && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    <span>{t('categorize_suggested_badge')}</span>
                  </span>
                )}
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
          </div>

          {/* Pie Fijo con Botón de Guardado */}
          <div className="p-3.5 sm:p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-[#e7dfd5] bg-white shrink-0">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-[#a86224] hover:bg-[#8e511c] active:scale-95 transition-all text-white text-sm font-bold shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 touch-manipulation select-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('categorize_saving_btn')}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{t('categorize_save_btn')}</span>
                </>
              )}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
