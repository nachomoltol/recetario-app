'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, ExternalLink } from 'lucide-react';
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

  const isVideoSource = fuenteTipo !== 'web' && fuenteTipo !== 'manual';

  return (
    <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-50 w-full max-w-full">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-1 sm:gap-2 relative w-full">
        {/* Izquierda: Botón de retorno compacto */}
        <div className="flex-1 flex items-center justify-start min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold text-stone-600 hover:text-stone-900 hover:bg-[#faf7f2] border border-transparent hover:border-[#e7dfd5] transition-all cursor-pointer shrink-0"
            title={language === 'en' ? 'Back to cookbook' : 'Volver al recetario'}
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#a86224] shrink-0" />
            <span className="truncate">{language === 'en' ? 'Cookbook' : 'Recetario'}</span>
          </button>
        </div>

        {/* Centro: Enlace al vídeo original en píldora compacta contenida */}
        {fuenteUrl ? (
          <div className="flex items-center justify-center shrink-0 px-1">
            <a
              href={fuenteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 sm:h-8 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-[#f4efe6] hover:bg-[#ebe3d5] border border-[#e7dfd5] inline-flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold text-stone-800 hover:text-[#a86224] transition-all shadow-2xs active:scale-95 shrink-0"
              title={isVideoSource ? t('recipe_nav_original_video') : t('recipe_nav_original_source')}
            >
              {isVideoSource ? (
                <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#a86224] fill-[#a86224] shrink-0" />
              ) : (
                <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#a86224] shrink-0" />
              )}
              <span className="whitespace-nowrap">
                {isVideoSource
                  ? language === 'en'
                    ? 'Watch video'
                    : 'Ver vídeo'
                  : language === 'en'
                  ? 'Source'
                  : 'Ver fuente'}
              </span>
            </a>
          </div>
        ) : (
          <div className="shrink-0" />
        )}

        {/* Derecha: Avatar de usuario y badge opcional de dificultad */}
        <div className="flex-1 flex items-center justify-end gap-1.5 sm:gap-2 min-w-0">
          {dificultad && (
            <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5] capitalize shrink-0">
              {dificultad}
            </span>
          )}

          <div className="relative z-[100] shrink-0 scale-90 sm:scale-100 origin-right">
            <UserDropdownMenu
              fallbackName={userName || 'Chef'}
              email={userEmail || ''}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

