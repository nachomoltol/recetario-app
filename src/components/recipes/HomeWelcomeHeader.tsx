'use client';

import Link from 'next/link';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface HomeWelcomeHeaderProps {
  userName: string;
}

export function HomeWelcomeHeader({ userName }: HomeWelcomeHeaderProps) {
  const t = useLanguageStore((s) => s.t);

  return (
    <section className="space-y-1 sm:space-y-1.5">
      {/* Saludo compacto para aprovechar el espacio vertical en móvil */}
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 tracking-tight font-serif-recipe">
          {t('home_greeting')}, {userName}
        </h1>
        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-brand-primary/90">
          {t('home_tag')}
        </span>
      </div>

      {/* Subtítulo breve legible */}
      <p className="text-xs sm:text-sm text-stone-500 leading-snug max-w-2xl text-left">
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
        className="h-8 sm:h-10 w-auto max-w-[105px] sm:max-w-[160px] object-contain"
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
