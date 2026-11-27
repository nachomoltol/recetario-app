'use client';

import { Globe } from 'lucide-react';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { useLanguageStore } from '@/stores/useLanguageStore';

export function LanguageSettingsCard() {
  const language = useLanguageStore((s) => s.language);

  return (
    <section className="p-5 sm:p-6 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs flex items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-brand-primary shrink-0">
          <Globe className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold font-serif-recipe text-stone-900 leading-tight">
            {language === 'en' ? 'App language' : 'Idioma de la aplicación'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            {language === 'en'
              ? 'Choose Spanish or English for menus and captured recipes.'
              : 'Elige español o inglés para los menús y tus recetas.'}
          </p>
        </div>
      </div>

      <LanguageToggle alwaysShow className="shrink-0" />
    </section>
  );
}
