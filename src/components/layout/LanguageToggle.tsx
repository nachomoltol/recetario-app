'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface LanguageToggleProps {
  className?: string;
  showIcon?: boolean;
  alwaysShow?: boolean;
}

function FlagES() {
  return (
    <svg
      viewBox="0 0 18 12"
      aria-hidden="true"
      className="w-4 h-[11px] rounded-[2px] shrink-0 shadow-[0_0_0_0.5px_rgba(0,0,0,0.12)]"
    >
      <rect width="18" height="12" fill="#AA151B" />
      <rect y="3" width="18" height="6" fill="#F1BF00" />
    </svg>
  );
}

function FlagEN() {
  return (
    <svg
      viewBox="0 0 18 12"
      aria-hidden="true"
      className="w-4 h-[11px] rounded-[2px] shrink-0 shadow-[0_0_0_0.5px_rgba(0,0,0,0.12)]"
    >
      <rect width="18" height="12" fill="#012169" />
      <path d="M0 0L18 12M18 0L0 12" stroke="#FFFFFF" strokeWidth="2.2" />
      <path d="M0 0L18 12M18 0L0 12" stroke="#C8102E" strokeWidth="1" />
      <path d="M9 0V12M0 6H18" stroke="#FFFFFF" strokeWidth="3.4" />
      <path d="M9 0V12M0 6H18" stroke="#C8102E" strokeWidth="2" />
    </svg>
  );
}

export function LanguageToggle({ className = '', alwaysShow = false }: LanguageToggleProps) {
  const pathname = usePathname();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const initLanguage = useLanguageStore((s) => s.initLanguage);

  useEffect(() => {
    initLanguage();
  }, [initLanguage]);

  // Mostrar en la cabecera de Inicio ('/' o '/recipes') y en Ajustes ('/settings'), o cuando alwaysShow=true
  const isHome = pathname === '/' || pathname === '/recipes';
  const isSettings = pathname.startsWith('/settings');
  if (!alwaysShow && !isHome && !isSettings) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-xl bg-[#f4efe6] border border-[#e7dfd5] shadow-2xs shrink-0 ${className}`}
      role="group"
      aria-label="Selector de idioma / Language selector"
    >
      <button
        type="button"
        onClick={() => setLanguage('es')}
        aria-pressed={language === 'es'}
        className={`px-1.5 sm:px-2 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer select-none ${
          language === 'es'
            ? 'bg-white text-brand-primary font-bold shadow-2xs ring-1 ring-[#e7dfd5]'
            : 'text-stone-500 hover:text-stone-800'
        }`}
        title="Español"
      >
        <FlagES />
        <span className="text-[10px] sm:text-[11px] font-bold tracking-tight leading-none">ES</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className={`px-1.5 sm:px-2 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer select-none ${
          language === 'en'
            ? 'bg-white text-brand-primary font-bold shadow-2xs ring-1 ring-[#e7dfd5]'
            : 'text-stone-500 hover:text-stone-800'
        }`}
        title="English"
      >
        <FlagEN />
        <span className="text-[10px] sm:text-[11px] font-bold tracking-tight leading-none">EN</span>
      </button>
    </div>
  );
}
