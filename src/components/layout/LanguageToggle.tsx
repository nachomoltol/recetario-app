'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface LanguageToggleProps {
  className?: string;
  showIcon?: boolean;
  alwaysShow?: boolean;
}

export function LanguageToggle({ className = '', alwaysShow = false }: LanguageToggleProps) {
  const pathname = usePathname();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const initLanguage = useLanguageStore((s) => s.initLanguage);

  useEffect(() => {
    initLanguage();
  }, [initLanguage]);

  // Por defecto solo se muestra en Ajustes (o cuando se indica alwaysShow) para mantener limpias las cabeceras
  const isSettings = pathname.startsWith('/settings');
  if (!alwaysShow && !isSettings) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-xl bg-[#f4efe6] border border-[#e7dfd5] shadow-2xs ${className}`}
      role="group"
      aria-label="Selector de idioma / Language selector"
    >
      <button
        type="button"
        onClick={() => setLanguage('es')}
        aria-pressed={language === 'es'}
        className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer select-none ${
          language === 'es'
            ? 'bg-white text-brand-primary font-bold shadow-2xs ring-1 ring-[#e7dfd5]'
            : 'text-stone-500 hover:text-stone-800'
        }`}
        title="Español"
      >
        <span className="text-xs leading-none">🇪🇸</span>
        <span className="text-[11px] font-bold tracking-tight">ES</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer select-none ${
          language === 'en'
            ? 'bg-white text-brand-primary font-bold shadow-2xs ring-1 ring-[#e7dfd5]'
            : 'text-stone-500 hover:text-stone-800'
        }`}
        title="English"
      >
        <span className="text-xs leading-none">🇬🇧</span>
        <span className="text-[11px] font-bold tracking-tight">EN</span>
      </button>
    </div>
  );
}
