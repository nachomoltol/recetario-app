'use client';

import { useEffect } from 'react';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  className?: string;
  showIcon?: boolean;
}

export function LanguageToggle({ className = '', showIcon = true }: LanguageToggleProps) {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const initLanguage = useLanguageStore((s) => s.initLanguage);

  useEffect(() => {
    initLanguage();
  }, [initLanguage]);

  return (
    <div
      className={`inline-flex items-center p-1 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] shadow-2xs ${className}`}
      role="group"
      aria-label="Selector de idioma / Language selector"
    >
      {showIcon && (
        <Globe className="w-3.5 h-3.5 text-stone-500 ml-1.5 mr-1 shrink-0 hidden xs:inline" />
      )}
      <button
        type="button"
        onClick={() => setLanguage('es')}
        aria-pressed={language === 'es'}
        className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
          language === 'es'
            ? 'bg-white text-[#a86224] shadow-xs ring-1 ring-[#e7dfd5]'
            : 'text-stone-500 hover:text-stone-800'
        }`}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
          language === 'en'
            ? 'bg-white text-[#a86224] shadow-xs ring-1 ring-[#e7dfd5]'
            : 'text-stone-500 hover:text-stone-800'
        }`}
      >
        EN
      </button>
    </div>
  );
}
