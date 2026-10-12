'use client';

import { Users, Minus, Plus, Sparkles } from 'lucide-react';

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
  const isScaled = currentServings !== baseServings;

  return (
    <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-stone-700">
          <Users className="w-4 h-4 text-[#a86224]" />
          <span className="text-xs sm:text-sm font-semibold">Comensales:</span>
        </div>

        {/* Selector táctil + / - */}
        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-2xl border border-[#e7dfd5] shadow-2xs">
          <button
            type="button"
            onClick={() => onServingsChange(Math.max(1, currentServings - 1))}
            disabled={currentServings <= 1}
            className="w-8 h-8 rounded-xl bg-[#f4efe6] text-stone-700 hover:text-stone-900 hover:bg-[#ebdcc9] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition cursor-pointer"
            title="Reducir comensales"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <span className="min-w-[40px] text-center font-bold text-sm sm:text-base font-serif-recipe text-stone-900">
            {currentServings}
          </span>

          <button
            type="button"
            onClick={() => onServingsChange(currentServings + 1)}
            disabled={currentServings >= 20}
            className="w-8 h-8 rounded-xl bg-[#f4efe6] text-stone-700 hover:text-stone-900 hover:bg-[#ebdcc9] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition cursor-pointer"
            title="Aumentar comensales"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isScaled && (
        <div className="pt-1 flex items-start gap-1.5 text-[11px] text-stone-600 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-[#a86224] shrink-0 mt-0.5" />
          <span>
            <strong>Escalado con conciencia culinaria:</strong> la sal, especias y aceite de
            sofrito no se duplican linealmente para mantener el balance gustativo real.
          </span>
        </div>
      )}
    </div>
  );
}
