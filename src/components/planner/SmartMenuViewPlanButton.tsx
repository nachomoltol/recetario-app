'use client';

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';

export function SmartMenuViewPlanButton() {
  const t = useLanguageStore((s) => s.t);

  return (
    <Link
      href="/meal-planner"
      className="h-10 px-3 sm:px-3.5 rounded-2xl bg-white hover:bg-[#faf7f2] border border-[#e7dfd5] text-[#a86224] text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer shrink-0"
      title={t('smart_menu_view_plan_btn')}
    >
      <Calendar className="w-4 h-4 text-[#a86224] shrink-0" />
      <span className="hidden sm:inline font-bold">{t('smart_menu_view_plan_btn')}</span>
      <span className="inline sm:hidden font-bold">{t('smart_menu_view_plan_btn_short')}</span>
    </Link>
  );
}
