'use client';

import { CalendarClock, ArrowRight } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';

export interface QuickCategorizeBannerProps {
  unclassifiedCount: number;
  onStartCategorize: () => void;
}

export function QuickCategorizeBanner({
  unclassifiedCount,
  onStartCategorize,
}: QuickCategorizeBannerProps) {
  const t = useLanguageStore((s) => s.t);

  if (unclassifiedCount <= 0) return null;

  const titleTemplate =
    unclassifiedCount === 1
      ? t('quick_categorize_banner_title_single')
      : t('quick_categorize_banner_title');
  const title = titleTemplate.replace('{count}', String(unclassifiedCount));

  return (
    <div className="w-full max-w-full overflow-x-hidden rounded-2xl sm:rounded-3xl bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/90 p-3.5 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-fade-in">
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-[#a86224] border border-amber-300/40 flex items-center justify-center shrink-0">
          <CalendarClock className="w-5 h-5" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-xs sm:text-sm font-bold font-serif-recipe text-stone-900 leading-tight">
            {title}
          </h2>
          <p className="text-[11px] sm:text-xs text-stone-500 leading-snug line-clamp-1">
            {t('quick_categorize_banner_desc')}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onStartCategorize}
        className="min-h-[44px] sm:min-h-[40px] px-4 py-2 rounded-xl bg-[#a86224] hover:bg-[#8e511c] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0 self-stretch sm:self-auto touch-manipulation"
      >
        <span>{t('quick_categorize_banner_btn')}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
