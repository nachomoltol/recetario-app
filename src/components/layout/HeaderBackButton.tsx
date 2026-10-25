'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface HeaderBackButtonProps {
  fallbackUrl?: string;
  className?: string;
  title?: string;
}

export function HeaderBackButton({
  fallbackUrl = '/',
  className = '',
  title,
}: HeaderBackButtonProps) {
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const backLabel = t('btn_back') || 'Volver';

  const handleBack = () => {
    router.push(fallbackUrl);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`h-9 sm:h-10 px-3 sm:px-3.5 rounded-2xl bg-[#f4efe6] hover:bg-[#ebe3d5] border border-[#e7dfd5] flex items-center gap-1.5 text-[#a86224] hover:text-[#8c4f1a] transition shadow-2xs cursor-pointer font-bold text-xs sm:text-sm shrink-0 touch-manipulation active:scale-95 ${className}`}
      title={title || backLabel}
    >
      <ArrowLeft className="w-4 h-4 shrink-0" />
      <span>{backLabel}</span>
    </button>
  );
}

export default HeaderBackButton;
