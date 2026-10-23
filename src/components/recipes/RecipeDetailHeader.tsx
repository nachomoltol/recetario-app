'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface RecipeDetailHeaderProps {
  fuenteUrl?: string | null;
  fuenteTipo?: string | null;
  dificultad?: string | null;
  userName?: string;
  userEmail?: string;
}

export function RecipeDetailHeader({
  fuenteUrl,
  fuenteTipo,
  dificultad,
  userName,
  userEmail,
}: RecipeDetailHeaderProps) {
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);

  const handleBack = () => {
    if (
      typeof window !== 'undefined' &&
      (window.history.state?.idx > 0 || (document.referrer && document.referrer.includes('/recipes')))
    ) {
      router.back();
    } else {
      router.push('/recipes/collection');
    }
  };

  const getDificultadLabel = (dif?: any) => {
    if (!dif) return '';
    try {
      const raw = typeof dif === 'string' ? dif : String(dif);
      const d = raw.toLowerCase().trim();
      if (d === 'fácil' || d === 'facil' || d === 'easy' || d === 'beginner') return t('recipe_difficulty_easy');
      if (d === 'media' || d === 'medium' || d === 'intermediate') return t('recipe_difficulty_medium');
      if (
        d === 'difícil' ||
        d === 'dificil' ||
        d === 'alta' ||
        d === 'hard' ||
        d === 'advanced' ||
        d === 'experto' ||
        d === 'expert'
      ) {
        return t('recipe_difficulty_hard');
      }
      return raw;
    } catch {
      return String(dif || '');
    }
  };

  return (
    <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="min-h-[44px] px-3 -ml-3 rounded-xl inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          title={language === 'en' ? 'Back to cookbook' : 'Volver al recetario'}
        >
          <ArrowLeft className="w-5 h-5 text-[#a86224]" />
          <span>{language === 'en' ? 'Cookbook' : 'Recetario'}</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          {fuenteUrl && (
            <a
              href={fuenteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-3 py-1.5 rounded-2xl bg-white border border-[#e7dfd5] inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-700 hover:text-[#a86224] hover:border-[#a86224] transition-all shadow-2xs"
            >
              <span className="hidden xs:inline">
                {fuenteTipo === 'web' || fuenteTipo === 'manual'
                  ? t('recipe_nav_original_source')
                  : t('recipe_nav_original_video')}
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-[#a86224]" />
            </a>
          )}

          {dificultad && (
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5] capitalize">
              {getDificultadLabel(dificultad)}
            </span>
          )}

          <LanguageToggle />

          <UserDropdownMenu
            fallbackName={userName || 'Chef'}
            email={userEmail || ''}
          />
        </div>
      </div>
    </header>
  );
}

