'use client';

import Link from 'next/link';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface HomeWelcomeHeaderProps {
  userName: string;
}

export function HomeWelcomeHeader({ userName }: HomeWelcomeHeaderProps) {
  const t = useLanguageStore((s) => s.t);

  return (
    <section className="space-y-2.5 sm:space-y-3">
      {/* Contenedor horizontal: Logo de presencia aumentada + Tag Miga: recetas de redes */}
      <div className="flex flex-row items-center gap-3">
        <Link
          href="/recipes"
          className="focus:outline-none transition opacity-95 hover:opacity-100 shrink-0"
          aria-label="Logo Miga"
        >
          <img
            src="/miga-logo.svg"
            alt="Logo Miga"
            className="h-10 sm:h-12 w-auto max-w-[140px] sm:max-w-[160px] object-contain"
          />
        </Link>
        <div className="h-5 w-px bg-[#e7dfd5]" />
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#a86224]">
          {t('home_tag')}
        </span>
      </div>

      {/* Saludo con escala armónica y jerarquía equilibrada */}
      <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 tracking-tight font-serif-recipe">
        {t('home_greeting')}, {userName}
      </h1>

      {/* Tagline descriptivo legible y alineado a la izquierda */}
      <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light max-w-2xl text-left">
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
        className="h-9 sm:h-10 w-auto max-w-[130px] sm:max-w-[160px] object-contain"
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
