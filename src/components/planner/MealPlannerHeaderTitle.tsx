'use client';

import { useLanguageStore } from '@/stores/useLanguageStore';

export function MealPlannerHeaderTitle() {
  const t = useLanguageStore((s) => s.t);

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-base font-bold font-serif-recipe tracking-tight text-stone-900 block leading-tight">
          {t('planner_title')}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
          {t('planner_weekly_badge')}
        </span>
      </div>
      <span className="text-[10px] text-stone-500 tracking-wider uppercase block font-medium truncate max-w-[200px] sm:max-w-none">
        {t('planner_subtitle')}
      </span>
    </div>
  );
}
