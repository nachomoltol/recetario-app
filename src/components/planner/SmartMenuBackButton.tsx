'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';

export function SmartMenuBackButton() {
  const router = useRouter();
  const language = useLanguageStore((s) => s.language);
  const backLabel = language === 'en' ? 'Back' : 'Volver';

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/meal-planner');
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="h-10 px-3 sm:px-3.5 rounded-2xl bg-[#f4efe6] hover:bg-stone-200 border border-[#e7dfd5] flex items-center gap-1.5 text-[#a86224] transition shadow-2xs cursor-pointer font-bold text-xs sm:text-sm shrink-0 touch-manipulation"
      title={backLabel}
    >
      <ArrowLeft className="w-4 h-4 shrink-0" />
      <span>{backLabel}</span>
    </button>
  );
}
