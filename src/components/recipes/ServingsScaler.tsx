'use client';

import { Users, Minus, Plus } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface ServingsScalerProps {
  baseServings: number;
  currentServings: number;
  onServingsChange: (servings: number) => void;
}

export function ServingsScaler({
  baseServings,
  currentServings,
  onServingsChange,
}: ServingsScalerProps) {
  const t = useLanguageStore((s) => s.t);

  return (
    <div className="p-3 sm:p-3.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-stone-700">
        <Users className="w-4 h-4 text-[#a86224]" />
        <span className="text-xs sm:text-sm font-semibold">{t('recipe_control_diners')}:</span>
      </div>

      {/* Selector táctil + / - */}
      <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-2xl border border-[#e7dfd5] shadow-2xs">
        <button
          type="button"
          onClick={() => onServingsChange(Math.max(1, currentServings - 1))}
          disabled={currentServings <= 1}
          className="w-8 h-8 rounded-xl bg-[#f4efe6] text-stone-700 hover:text-stone-900 hover:bg-[#ebdcc9] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition cursor-pointer"
          title={t('recipe_servings_decrease')}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <span className="min-w-[36px] text-center font-bold text-sm sm:text-base font-serif-recipe text-stone-900">
          {currentServings}
        </span>

        <button
          type="button"
          onClick={() => onServingsChange(currentServings + 1)}
          disabled={currentServings >= 20}
          className="w-8 h-8 rounded-xl bg-[#f4efe6] text-stone-700 hover:text-stone-900 hover:bg-[#ebdcc9] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition cursor-pointer"
          title={t('recipe_servings_increase')}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
