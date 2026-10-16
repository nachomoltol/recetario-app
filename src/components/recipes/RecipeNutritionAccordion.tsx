'use client';

import { useState } from 'react';
import { Flame, ChevronDown, Sparkles, Wheat, Beef, Droplets, Salad } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface RecipeNutritionAccordionProps {
  calorias?: number | null;
  proteinas?: number | null;
  carbohidratos?: number | null;
  grasas?: number | null;
  fibra?: number | null;
}

export function RecipeNutritionAccordion({
  calorias,
  proteinas,
  carbohidratos,
  grasas,
  fibra,
}: RecipeNutritionAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useLanguageStore((s) => s.t);

  const hasData =
    Boolean(calorias) ||
    Boolean(proteinas) ||
    Boolean(carbohidratos) ||
    Boolean(grasas);

  if (!hasData) return null;

  return (
    <div className="rounded-2xl border border-[#e7dfd5] bg-white shadow-2xs overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full min-h-[46px] px-4 py-2.5 flex items-center justify-between text-left hover:bg-[#faf7f2] transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-[#a86224]" />
          <span className="text-xs sm:text-sm font-semibold text-stone-900">
            {t('recipe_nutrition_title')}
          </span>
          <span className="text-[10px] text-stone-500 font-light hidden xs:inline">
            {t('recipe_nutrition_per_serving')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {calorias && !isOpen && (
            <span className="text-xs font-bold text-[#a86224] bg-[#f4efe6] px-2 py-0.5 rounded-lg border border-[#e7dfd5]">
              {Math.round(Number(calorias) || 0)} kcal
            </span>
          )}
          <div
            className={`w-6 h-6 rounded-full bg-[#f4efe6] text-stone-600 flex items-center justify-center transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#a86224]' : ''
            }`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 py-3 border-t border-[#f4efe6] bg-[#faf7f2]/60 animate-fade-in">
          {/* Fila única horizontal compacta con iconos para móvil */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-0.5 text-xs text-stone-700">
            {calorias !== null && calorias !== undefined && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e7dfd5] shrink-0 shadow-2xs">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-stone-500 font-medium">{t('recipe_nutrition_calories')}:</span>
                <strong className="text-stone-900 font-bold">{Math.round(Number(calorias) || 0)} kcal</strong>
              </div>
            )}

            {proteinas !== null && proteinas !== undefined && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e7dfd5] shrink-0 shadow-2xs">
                <Beef className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-stone-500 font-medium">{t('recipe_nutrition_proteins')}:</span>
                <strong className="text-stone-900 font-bold">{proteinas}g</strong>
              </div>
            )}

            {carbohidratos !== null && carbohidratos !== undefined && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e7dfd5] shrink-0 shadow-2xs">
                <Wheat className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-stone-500 font-medium">{t('recipe_nutrition_carbs')}:</span>
                <strong className="text-stone-900 font-bold">{carbohidratos}g</strong>
              </div>
            )}

            {grasas !== null && grasas !== undefined && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e7dfd5] shrink-0 shadow-2xs">
                <Droplets className="w-3.5 h-3.5 text-yellow-600" />
                <span className="text-stone-500 font-medium">{t('recipe_nutrition_fats')}:</span>
                <strong className="text-stone-900 font-bold">{grasas}g</strong>
              </div>
            )}

            {fibra !== null && fibra !== undefined && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e7dfd5] shrink-0 shadow-2xs">
                <Salad className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-stone-500 font-medium">{t('recipe_nutrition_fiber')}:</span>
                <strong className="text-stone-900 font-bold">{fibra}g</strong>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
