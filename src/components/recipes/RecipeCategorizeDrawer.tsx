'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Drawer } from 'vaul';
import {
  Sun,
  UtensilsCrossed,
  Moon,
  Cookie,
  Check,
  Sparkles,
  Star,
  X,
  Loader2,
  ChefHat,
  Info,
} from 'lucide-react';
import { MomentoDia, RolPlato } from '@/types/database';
import { inferRecipeCategory, SuggestedCategory } from '@/lib/recipeCategorizer';
import { useLanguageStore } from '@/stores/useLanguageStore';

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
  const language = useLanguageStore((s) => s.language);

  // Inferencia heurística calculada
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
    return suggestion.momentos_dia;
  });

  const [selectedRol, setSelectedRol] = useState<RolPlato>(() => {
    if (receta.rol_plato) {
      return receta.rol_plato;
    }
    return suggestion.rol_plato;
  });

  const [isMenuFavorite, setIsMenuFavorite] = useState<boolean>(() => {
    return Boolean(receta.es_favorito_menu);
  });

  const [isSaving, setIsSaving] = useState(false);

  // Flag para asegurar que la apertura automática solo ocurra una única vez al montar
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!autoOpenedRef.current && !hasExistingClassification) {
      autoOpenedRef.current = true;
      // Pequeño timeout para permitir que la vista inicial monte suavemente
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
        setSelectedRol(receta.rol_plato || 'completo');
      } else {
        // Preseleccionar sugerencia de IA
        setSelectedMomentos(suggestion.momentos_dia);
        setSelectedRol(suggestion.rol_plato);
      }
      setIsMenuFavorite(Boolean(receta.es_favorito_menu));
    }
  }, [isOpen, receta.momentos_dia, receta.rol_plato, receta.es_favorito_menu, suggestion]);

  // Manejo de chips de momentos
  const toggleMomento = (momento: MomentoDia) => {
    setSelectedMomentos((prev) => {
      if (prev.includes(momento)) {
        // Si es el único, no permitir vaciarlo por completo
        if (prev.length === 1) return prev;
        return prev.filter((m) => m !== momento);
      } else {
        return [...prev, momento];
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        momentos_dia: selectedMomentos.length > 0 ? selectedMomentos : ['almuerzo', 'cena'],
        rol_plato: selectedRol,
        es_favorito_menu: isMenuFavorite,
      });
      onOpenChange(false);
    } catch (err) {
      console.error('Error al guardar categorización en Drawer:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Opciones de momentos
  const momentosOptions: { id: MomentoDia; labelKey: string; icon: typeof Sun }[] = [
    { id: 'desayuno', labelKey: 'meal_moment_breakfast', icon: Sun },
    { id: 'almuerzo', labelKey: 'meal_moment_lunch', icon: UtensilsCrossed },
    { id: 'cena', labelKey: 'meal_moment_dinner', icon: Moon },
    { id: 'snack', labelKey: 'meal_moment_snack', icon: Cookie },
  ];

  // Opciones de roles de plato
  const rolesOptions: {
    id: RolPlato;
    label: string;
    sublabel: string;
    emoji: string;
  }[] = [
    {
      id: 'completo',
      label: t('dish_role_completo'),
      sublabel: language === 'en' ? 'Single balanced meal' : 'Plato único balanceado',
      emoji: '🍲',
    },
    {
      id: 'primero',
      label: t('dish_role_primero'),
      sublabel: language === 'en' ? 'Starter, soup or greens' : 'Entrante, sopa o verdura',
      emoji: '🥗',
    },
    {
      id: 'segundo',
      label: t('dish_role_segundo'),
      sublabel: language === 'en' ? 'Meat, fish or protein' : 'Carne, pescado o proteína',
      emoji: '🥩',
    },
    {
      id: 'desayuno_snack',
      label: t('dish_role_desayuno_snack'),
      sublabel: language === 'en' ? 'Morning bite or quick snack' : 'Bocado matutino o merienda',
      emoji: '🥞',
    },
    {
      id: 'postre',
      label: t('dish_role_postre'),
      sublabel: language === 'en' ? 'Sweet bite, bakery or dessert' : 'Dulce, repostería o postre',
      emoji: '🍰',
    },
  ];

  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 transition-opacity" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] bg-[#fbf9f5] rounded-t-[32px] border-t border-[#e7dfd5] shadow-2xl flex flex-col focus:outline-none max-w-xl mx-auto w-full max-w-full overflow-x-hidden">
          {/* Tirador táctil superior */}
          <div className="w-12 h-1.5 rounded-full bg-stone-300 mx-auto mt-3 mb-1 shrink-0 cursor-grab active:cursor-grabbing" />

          {/* Cabecera del Drawer */}
          <div className="px-5 py-3.5 border-b border-[#e7dfd5] flex items-center justify-between shrink-0 bg-white">
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-[#a86224] shrink-0" />
                <Drawer.Title className="text-base sm:text-lg font-bold font-serif-recipe text-stone-900 leading-tight truncate">
                  {t('categorize_drawer_title')}
                </Drawer.Title>
              </div>
              <Drawer.Description className="text-xs text-stone-500 mt-0.5 truncate">
                {t('categorize_drawer_subtitle')}
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-[#f4efe6] hover:bg-[#eae1d2] text-stone-600 flex items-center justify-center transition cursor-pointer shrink-0"
              aria-label="Cerrar cajón"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contenedor con scroll vertical contenido */}
          <div className="p-5 overflow-y-auto space-y-6 flex-1 w-full max-w-full overflow-x-hidden">
            {/* Banner de Preselección Inteligente (si es inferencia) */}
            {!hasExistingClassification && (
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-900">
                      {t('categorize_suggested_badge')}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-800 capitalize">
                      {suggestion.confianza} {language === 'en' ? 'confidence' : 'confianza'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/90 mt-1 leading-snug">
                    {language === 'en'
                      ? 'Pre-selected based on recipe title, ingredients, and nutrition. You can adjust anytime.'
                      : 'Precargado según el título, ingredientes y valor nutricional. Puedes modificarlo libremente.'}
                  </p>
                </div>
              </div>
            )}

            {/* SECCIÓN 1: Momentos del Día (Multiselección) */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#a86224] block">
                  {t('categorize_moments_title')}
                </label>
                <p className="text-xs text-stone-500 mt-0.5">
                  {t('categorize_moments_desc')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {momentosOptions.map((opt) => {
                  const isSelected = selectedMomentos.includes(opt.id);
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleMomento(opt.id)}
                      className={`min-h-[48px] px-3.5 py-2.5 rounded-2xl border text-left transition-all active:scale-95 transition-transform flex items-center justify-between gap-2.5 cursor-pointer select-none touch-manipulation ${
                        isSelected
                          ? 'bg-[#a86224] text-white border-[#a86224] shadow-xs'
                          : 'bg-white hover:bg-[#fbf9f5] text-stone-700 border-[#e7dfd5] hover:border-[#a86224]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-white' : 'text-[#a86224]'
                          }`}
                        />
                        <span className="text-xs sm:text-sm font-semibold truncate">
                          {t(opt.labelKey as any)}
                        </span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-white text-[#a86224] border-transparent'
                            : 'border-stone-300 bg-stone-50'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN 2: Rol Culinario en el Menú */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#a86224] block">
                  {t('categorize_role_title')}
                </label>
                <p className="text-xs text-stone-500 mt-0.5">
                  {t('categorize_role_desc')}
                </p>
              </div>

              <div className="space-y-2">
                {rolesOptions.map((role) => {
                  const isSelected = selectedRol === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRol(role.id)}
                      className={`w-full min-h-[52px] p-3 rounded-2xl border text-left transition-all active:scale-95 transition-transform flex items-center justify-between gap-3 cursor-pointer select-none touch-manipulation ${
                        isSelected
                          ? 'bg-amber-50/80 border-[#a86224] shadow-xs ring-1 ring-[#a86224]'
                          : 'bg-white hover:bg-[#fbf9f5] border-[#e7dfd5] hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl shrink-0" role="img" aria-hidden="true">
                          {role.emoji}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={`text-xs sm:text-sm font-bold truncate ${
                              isSelected ? 'text-stone-900' : 'text-stone-800'
                            }`}
                          >
                            {role.label}
                          </p>
                          <p className="text-[11px] text-stone-500 truncate">
                            {role.sublabel}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-[#a86224] bg-[#a86224] text-white'
                            : 'border-stone-300 bg-stone-50'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN 3: Favorito para Menús Semanales */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsMenuFavorite(!isMenuFavorite)}
                className={`w-full min-h-[52px] p-4 rounded-2xl border text-left transition-all active:scale-95 transition-transform flex items-center justify-between gap-3 cursor-pointer touch-manipulation ${
                  isMenuFavorite
                    ? 'bg-amber-50/90 border-amber-300 shadow-xs'
                    : 'bg-white border-[#e7dfd5] hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isMenuFavorite
                        ? 'bg-amber-400 text-stone-900 shadow-xs'
                        : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        isMenuFavorite ? 'fill-stone-900 text-stone-900' : 'text-stone-400'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                      {t('categorize_menu_fav_title')}
                    </p>
                    <p className="text-[11px] text-stone-500 truncate">
                      {t('categorize_menu_fav_desc')}
                    </p>
                  </div>
                </div>

                {/* Switch estilo iOS */}
                <div
                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                    isMenuFavorite ? 'bg-[#a86224]' : 'bg-stone-200'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${
                      isMenuFavorite ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Pie Fijo con Botón de Guardado ergonomía zona pulgar y padding seguro Android/iOS */}
          <div className="p-4 sm:p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-[#e7dfd5] bg-white shrink-0 shadow-lg">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl bg-[#a86224] hover:bg-[#8e511c] active:scale-95 transition-all text-white text-base font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 touch-manipulation select-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('categorize_saving_btn')}</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
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
