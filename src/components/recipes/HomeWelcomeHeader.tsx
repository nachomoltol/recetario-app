'use client';

import Link from 'next/link';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface HomeWelcomeHeaderProps {
  userName: string;
}

export function HomeWelcomeHeader({ userName }: HomeWelcomeHeaderProps) {
  const t = useLanguageStore((s) => s.t);

  return (
    <section className="space-y-1 sm:space-y-2">
      <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#a86224]">
        {t('home_tag')}
      </span>
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif-recipe text-stone-900 tracking-tight">
        {t('home_greeting')}, {userName}
      </h1>
      <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light max-w-2xl">
        {t('home_subtitle')}
      </p>
    </section>
  );
}

export function HomeBrandHeader() {
  return (
    <Link
      href="/recipes"
      className="flex items-center gap-2 focus:outline-none transition opacity-95 hover:opacity-100"
      aria-label="Logo Miga"
    >
      <img
        src="/miga-logo.svg"
        alt="Logo Miga"
        className="h-8 sm:h-9 w-auto max-w-[120px] sm:max-w-[150px] object-contain"
      />
    </Link>
  );
}

export function HomeEmptyCookbookState() {
  const t = useLanguageStore((s) => s.t);

  return (
    <div className="space-y-1">
      <h3 className="text-base font-semibold text-stone-900">
        {t('capture_empty_title')}
      </h3>
      <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto">
        {t('capture_empty_desc')}
      </p>
    </div>
  );
}
