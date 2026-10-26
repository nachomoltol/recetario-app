'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface MealPlannerHeaderReplanButtonProps {
  className?: string;
  isMobileFullWidth?: boolean;
}

export function MealPlannerHeaderReplanButton({
  className = '',
  isMobileFullWidth = false,
}: MealPlannerHeaderReplanButtonProps) {
  const t = useLanguageStore((s) => s.t);
  const label = t('planner_replan_with_ai');

  return (
    <Link
      href="/smart-menu?replan=true"
      className={`min-h-[38px] px-3 sm:px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200/80 text-stone-900 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs shrink-0 ${
        isMobileFullWidth ? 'w-full' : ''
      } ${className}`}
      title={label}
    >
      <Sparkles className="w-3.5 h-3.5 text-[#a86224] shrink-0" />
      <span>{label}</span>
    </Link>
  );
}
