'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface RecipeDetailHeaderProps {
  fuenteUrl?: string | null;
  fuenteTipo?: string | null;
  dificultad?: string | null;
}

export function RecipeDetailHeader({
  fuenteUrl,
  fuenteTipo,
  dificultad,
}: RecipeDetailHeaderProps) {
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);

  const getDificultadLabel = (dif?: string | null) => {
    if (!dif) return '';
    const d = dif.toLowerCase();
    if (d === 'fácil' || d === 'facil') return t('recipe_difficulty_easy');
    if (d === 'media') return t('recipe_difficulty_medium');
    if (d === 'difícil' || d === 'dificil' || d === 'alta') return t('recipe_difficulty_hard');
    return dif;
  };

  return (
    <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="min-h-[44px] px-3 -ml-3 rounded-xl inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-[#a86224]" />
          <span>{t('recipe_nav_home')}</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {fuenteUrl && (
            <a
              href={fuenteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white border border-[#e7dfd5] inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-700 hover:text-[#a86224] hover:border-[#a86224] transition-all shadow-2xs"
            >
              <span>
                {fuenteTipo === 'web' || fuenteTipo === 'manual'
                  ? t('recipe_nav_original_source')
                  : t('recipe_nav_original_video')}
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-[#a86224]" />
            </a>
          )}

          {dificultad && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5] capitalize">
              {getDificultadLabel(dificultad)}
            </span>
          )}

          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
