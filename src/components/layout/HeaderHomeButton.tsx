'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface HeaderHomeButtonProps {
  className?: string;
}

export function HeaderHomeButton({ className = '' }: HeaderHomeButtonProps) {
  const t = useLanguageStore((s) => s.t);
  const homeLabel = t('nav_home') || 'Inicio';

  return (
    <Link
      href="/"
      className={`h-9 sm:h-10 px-3 sm:px-3.5 rounded-2xl bg-[#f4efe6] hover:bg-[#ebe3d5] border border-[#e7dfd5] inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#a86224] hover:text-[#8c4f1a] transition shadow-2xs shrink-0 touch-manipulation active:scale-95 ${className}`}
      title={homeLabel}
    >
      <Home className="w-4 h-4 text-[#a86224] shrink-0" />
      <span>{homeLabel}</span>
    </Link>
  );
}

export default HeaderHomeButton;
