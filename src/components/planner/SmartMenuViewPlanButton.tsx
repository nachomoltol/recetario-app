'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface SmartMenuViewPlanButtonProps {
  initialDate?: string;
}

export function SmartMenuViewPlanButton({ initialDate }: SmartMenuViewPlanButtonProps) {
  const t = useLanguageStore((s) => s.t);
  const [targetDate, setTargetDate] = useState<string>(initialDate || '');

  useEffect(() => {
    // 1. Inicializar con fecha persistida en sesión / cliente si existe
    try {
      const stored = localStorage.getItem('miga_active_planner_date');
      if (stored) {
        setTargetDate(stored);
      }
    } catch (e) {
      // Ignorar restricciones de localStorage en entornos restringidos
    }

    // 2. Escuchar cambios de fecha reactivos disparados desde el asistente SmartMenuWizardView
    const handleDateChange = (event: CustomEvent<string>) => {
      if (event.detail) {
        setTargetDate(event.detail);
      }
    };

    window.addEventListener('miga:planner-date-changed' as any, handleDateChange);
    return () => {
      window.removeEventListener('miga:planner-date-changed' as any, handleDateChange);
    };
  }, []);

  const href = targetDate ? `/meal-planner?date=${targetDate}` : '/meal-planner';

  return (
    <Link
      href={href}
      className="h-10 px-3 sm:px-3.5 rounded-2xl bg-white hover:bg-[#faf7f2] border border-[#e7dfd5] text-[#a86224] text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer shrink-0 touch-manipulation"
      title={t('smart_menu_view_plan_btn')}
    >
      <Calendar className="w-4 h-4 text-[#a86224] shrink-0" />
      <span className="hidden sm:inline font-bold">{t('smart_menu_view_plan_btn')}</span>
      <span className="inline sm:hidden font-bold">{t('smart_menu_view_plan_btn_short')}</span>
    </Link>
  );
}
