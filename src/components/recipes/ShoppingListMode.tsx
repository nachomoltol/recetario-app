'use client';

import { useState, useEffect } from 'react';
import {
  Check,
  RotateCcw,
  Copy,
  ShoppingCart,
  ChefHat,
  Sparkles,
  Tag,
} from 'lucide-react';
import { RecetaIngrediente } from '@/types/recipe';
import { FormattedText } from '@/components/ui/FormattedText';
import { IngredientRow } from './IngredientRow';
import { groupItemsByAisle, classifyIngredientAisle, getAisleTranslationKey, formatIngredientUnit } from '@/lib/culinary/aisles';
import { formatCulinaryAmount, pluralizeCulinaryNoun } from '@/lib/nutrition/formatQuantity';
import { useLanguageStore } from '@/stores/useLanguageStore';

import { SubstituteOption } from '@/app/actions/suggestSubstitute';

export type ExtendedIngredient = RecetaIngrediente & {
  cantidad_escalada?: number;
  gramos_escalados?: number;
  explicacion_culinaria?: string;
};

interface ShoppingListModeProps {
  recetaId: string;
  tituloReceta: string;
  ingredientes: ExtendedIngredient[];
  onSubstituteChange?: (
    currentTarget: string,
    newName: string | null,
    adaptedBaseName?: string,
    substituteOption?: SubstituteOption | null
  ) => void;
  userProfile?: any;
}

export function ShoppingListMode({
  recetaId,
  tituloReceta,
  ingredientes,
  onSubstituteChange,
  userProfile,
}: ShoppingListModeProps) {
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);
  const [isShoppingMode, setIsShoppingMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Clave de persistencia en localStorage para sobrevivir a apagados de pantalla
  const storageKey = `recetario_checklist_${recetaId}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setCheckedIds(JSON.parse(saved));
      }
    } catch {}
  }, [storageKey]);

  const handleToggleItem = (id: string) => {
    const next = checkedIds.includes(id)
      ? checkedIds.filter((item) => item !== id)
      : [...checkedIds, id];
    setCheckedIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };

  const handleReset = () => {
    setCheckedIds([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  const safeIngredientes = Array.isArray(ingredientes) ? ingredientes : [];

  const handleSelectAll = () => {
    const all = safeIngredientes.map((i) => i?.id).filter(Boolean);
    setCheckedIds(all);
    try {
      localStorage.setItem(storageKey, JSON.stringify(all));
    } catch {}
  };

  const groupedAisles = groupItemsByAisle(safeIngredientes, (i) =>
    classifyIngredientAisle(i?.nombre_limpio || i?.nombre_crudo || '', i?.pasillo_supermercado)
  );

  const handleCopyList = () => {
    const safeTitle = String(tituloReceta || '').toUpperCase();
    const textLines = [
      `🛒 ${t('recipe_shopping_list_title')} - ${safeTitle}`,
      '========================================',
    ];

    for (const group of groupedAisles) {
      const aisleTitle = t(getAisleTranslationKey(group.aisle) as any);
      textLines.push(`\n📍 ${aisleTitle.toUpperCase()}`);
      textLines.push('----------------------------------------');
      for (const ing of group.items) {
        if (!ing) continue;
        const isChecked = checkedIds.includes(ing.id);
        const prefix = isChecked ? '✓' : '☐';
        const qtyNum = ing.cantidad_escalada !== undefined ? ing.cantidad_escalada : ing.cantidad;
        const name = ing.nombre_limpio || ing.nombre_crudo || '';
        const qty = formatCulinaryAmount(qtyNum, ing.unidad, language, name);
        let displayName = name;
        const uLower = (ing.unidad || '').toLowerCase().trim();
        const isCountable =
          uLower === 'unidad' ||
          uLower === 'unidades' ||
          uLower === 'unit' ||
          uLower === 'units' ||
          uLower === 'pieza' ||
          uLower === 'piezas' ||
          uLower === 'piece' ||
          uLower === 'pieces';

        if (/dientes?|cloves?/i.test(qty) && /^\s*ajos?\s*$/i.test(name.trim())) {
          displayName = language === 'en' ? 'of garlic' : 'de ajo';
        } else if (/^(media|medio|half)$/i.test(qty)) {
          displayName = displayName.charAt(0).toLowerCase() + displayName.slice(1);
        } else if (isCountable && (qtyNum || 1) > 1) {
          displayName = pluralizeCulinaryNoun(displayName, language);
        }
        textLines.push(`${prefix} ${qty} ${displayName}${ing.notas ? ` (${ing.notas})` : ''}`.replace(/\s+/g, ' '));
      }
    }

    textLines.push('\n========================================');
    textLines.push(t('recipe_shopping_list_created_with'));

    try {
      navigator.clipboard?.writeText?.(textLines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const total = safeIngredientes.length;
  const completed = checkedIds.filter((id) =>
    safeIngredientes.some((i) => i?.id === id)
  ).length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Switcher Táctil Mobile-First entre Modo Cocina y Modo Compra: Segmented Control tipo píldora */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="p-1 rounded-2xl bg-[#ebe3d5]/90 border border-[#dfd4c5] inline-flex w-full sm:w-auto relative shadow-inner">
          <button
            type="button"
            onClick={() => setIsShoppingMode(false)}
            className={`flex-1 sm:flex-none min-h-[40px] px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              !isShoppingMode
                ? 'bg-white text-stone-900 shadow-sm font-bold border border-[#e7dfd5]'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
            }`}
          >
            <ChefHat className={`w-4 h-4 ${!isShoppingMode ? 'text-[#a86224]' : 'text-stone-500'}`} />
            <span>{t('recipe_control_cook_mode')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsShoppingMode(true)}
            className={`flex-1 sm:flex-none min-h-[40px] px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isShoppingMode
                ? 'bg-white text-stone-900 shadow-sm font-bold border border-[#e7dfd5]'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
            }`}
          >
            <ShoppingCart className={`w-4 h-4 ${isShoppingMode ? 'text-[#a86224]' : 'text-stone-500'}`} />
            <span>{t('recipe_control_shopping_list')}</span>
          </button>
        </div>

        {/* Herramientas rápidas para la lista */}
        {isShoppingMode && (
          <div className="flex items-center justify-end gap-2 px-1">
            <button
              type="button"
              onClick={handleCopyList}
              title="Copiar lista de ingredientes formateada"
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-[#e7dfd5] text-stone-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5 text-[#a86224]" />
              <span>{copied ? t('planner_copied') : t('recipe_shopping_copy')}</span>
            </button>

            <button
              type="button"
              onClick={completed === total ? handleReset : handleSelectAll}
              className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs text-stone-600 hover:text-stone-900 hover:bg-white/70 transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-stone-400" />
              <span>{completed === total ? t('recipe_shopping_uncheck_all') : t('recipe_shopping_check_all')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Vista A: Modo 'Cocina' (Ingredientes con Sustituciones Inteligentes) */}
      {!isShoppingMode && (
        <div className="space-y-6">
          {(() => {
            const sectionsList: string[] = [];
            const seen = new Set<string>();
            for (const ing of safeIngredientes) {
              const sec = (ing.seccion || '').trim();
              if (sec && !seen.has(sec.toLowerCase())) {
                seen.add(sec.toLowerCase());
                sectionsList.push(sec);
              }
            }

            if (sectionsList.length > 1) {
              return sectionsList.map((secName) => {
                const secIngredients = safeIngredientes.filter(
                  (i) => (i.seccion || '').trim().toLowerCase() === secName.toLowerCase()
                );
                if (secIngredients.length === 0) return null;
                return (
                  <div key={secName} className="space-y-2">
                    <div className="flex items-center gap-2 px-1 pt-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#a86224] bg-[#f4efe6] px-2.5 py-1 rounded-lg border border-[#e7dfd5]">
                        {secName}
                      </span>
                      <div className="h-px flex-1 bg-[#e7dfd5]" />
                    </div>
                    <div className="divide-y divide-[#e7dfd5] bg-white rounded-2xl border border-[#e7dfd5] px-3 shadow-2xs">
                      {secIngredients.map((ing) => (
                        <IngredientRow
                          key={ing.id}
                          ingrediente={ing}
                          tituloReceta={tituloReceta}
                          scaledCantidad={ing.cantidad_escalada}
                          scaledGramos={ing.gramos_escalados}
                          onSubstituteChange={onSubstituteChange}
                          userProfile={userProfile}
                        />
                      ))}
                    </div>
                  </div>
                );
              });
            }

            return (
              <div className="divide-y divide-[#e7dfd5]">
                {ingredientes.map((ing) => (
                  <IngredientRow
                    key={ing.id}
                    ingrediente={ing}
                    tituloReceta={tituloReceta}
                    scaledCantidad={ing.cantidad_escalada}
                    scaledGramos={ing.gramos_escalados}
                    onSubstituteChange={onSubstituteChange}
                    userProfile={userProfile}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Vista B: Modo 'Lista de la Compra' (Checklist Táctil Mobile-First) */}
      {isShoppingMode && (
        <div className="space-y-3 animate-fade-in">
          {/* Barra de Progreso del Carrito */}
          <div className="p-4 rounded-2xl bg-white border border-[#e7dfd5] space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-800 flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-[#a86224]" />
                <span>{t('recipe_shopping_progress')}</span>
              </span>
              <span className="font-mono font-bold text-[#a86224]">
                {completed} {t('capture_of_label')} {total} {t('recipe_section_ingredients').toLowerCase()} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#f4efe6] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#c27835] to-[#2e6b3e] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-stone-500 px-1">
            {t('recipe_shopping_aisles_desc')}
          </p>

          {/* Checklist agrupado por pasillos del supermercado */}
          <div className="space-y-5">
            {groupedAisles.map((group) => {
              const groupTotal = group.items.length;
              const groupCompleted = group.items.filter((i) => checkedIds.includes(i.id)).length;
              const isGroupAllChecked = groupTotal > 0 && groupCompleted === groupTotal;

              return (
                <div key={group.aisle} className="space-y-2.5">
                  {/* Encabezado del Pasillo */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${group.config.colorBg} ${group.config.colorText} ${group.config.colorBorder}`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>{t(getAisleTranslationKey(group.aisle) as any)}</span>
                      </span>
                      <span className="text-[11px] text-stone-400 font-medium font-mono">
                        {groupCompleted}/{groupTotal}
                      </span>
                    </div>

                    {isGroupAllChecked && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-2" /> {t('planner_completed')}
                      </span>
                    )}
                  </div>

                  {/* Elementos del pasillo */}
                  <div className="space-y-2">
                    {group.items.map((ing) => {
                      const isChecked = checkedIds.includes(ing.id);
                      const qtyNum = ing.cantidad_escalada !== undefined ? ing.cantidad_escalada : ing.cantidad;

                      return (
                        <div
                          key={ing.id}
                          onClick={() => handleToggleItem(ing.id)}
                          className={`min-h-[54px] p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center gap-3.5 active:scale-[0.99] ${
                            isChecked
                              ? 'bg-[#f7f5f0] border-[#e2dbce] opacity-75'
                              : 'bg-white hover:bg-[#faf7f2] border-[#e7dfd5] shadow-2xs'
                          }`}
                        >
                          {/* Casilla táctil grande */}
                          <div
                            className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-[#2e6b3e] border-[#2e6b3e] text-white shadow-2xs'
                                : 'border-[#cbbfae] bg-[#fbf9f5]'
                            }`}
                          >
                            {isChecked && <Check className="w-4 h-4 stroke-3" />}
                          </div>

                          {/* Detalle del ingrediente */}
                          <div className="flex-1 min-w-0 flex items-baseline justify-between gap-3">
                            <div className="min-w-0">
                              <span
                                className={`text-base font-semibold block truncate ${
                                  isChecked
                                    ? 'line-through text-stone-400 font-normal'
                                    : 'text-stone-900'
                                }`}
                              >
                                <FormattedText
                                  text={
                                    /^(unidad|unidades|unit|units|pieza|piezas|piece|pieces)$/i.test(ing.unidad || '') && (qtyNum || 1) > 1
                                      ? pluralizeCulinaryNoun(ing.nombre_limpio || ing.nombre_crudo || '', language)
                                      : (ing.nombre_limpio || ing.nombre_crudo)
                                  }
                                />
                              </span>
                              {ing.explicacion_culinaria && !isChecked && (
                                <span className="text-[10px] text-[#a86224] block truncate font-medium">
                                  ✦ <FormattedText text={ing.explicacion_culinaria} />
                                </span>
                              )}
                              {ing.notas && (
                                <span
                                  className={`text-xs block truncate ${
                                    isChecked ? 'line-through text-stone-300' : 'text-stone-500 italic'
                                  }`}
                                >
                                  <FormattedText text={ing.notas} />
                                </span>
                              )}
                            </div>

                            <span
                              className={`text-sm sm:text-base font-bold shrink-0 tabular-nums ${
                                isChecked ? 'line-through text-stone-400' : 'text-[#a86224]'
                              }`}
                            >
                              {formatCulinaryAmount(qtyNum, ing.unidad, language, ing.nombre_limpio || ing.nombre_crudo)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
