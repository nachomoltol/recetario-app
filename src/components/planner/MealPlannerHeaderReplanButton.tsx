'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface MealPlannerHeaderReplanButtonProps {
  className?: string;
}

export function MealPlannerHeaderReplanButton({
  className = '',
}: MealPlannerHeaderReplanButtonProps) {
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);
  const isEn = language === 'en';
  const label = t('planner_replan_with_ai') || (isEn ? '✨ Replan with AI' : '✨ Replanificar con IA');

  return (
    <Link
      href="/smart-menu?replan=true"
      className={`min-h-[34px] sm:min-h-[38px] w-full px-2 sm:px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200/80 text-stone-900 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-2xs cursor-pointer truncate ${className}`}
      title={label}
    >
      <Sparkles className="w-3.5 h-3.5 text-[#a86224] shrink-0" />
      <span className="truncate leading-tight font-medium">
        <span>{isEn ? 'Replan' : 'Replanificar'}</span>
        <span className="hidden sm:inline"> {isEn ? 'with AI' : 'con IA'}</span>
      </span>
    </Link>
  );
}

export default MealPlannerHeaderReplanButton;
