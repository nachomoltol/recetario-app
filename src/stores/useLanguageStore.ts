'use client';

import { create } from 'zustand';
import { Language, TranslationKey, getTranslation } from '@/lib/i18n/translations';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
}

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'es';

  // 1. Prioridad: LocalStorage
  const stored = localStorage.getItem('recetario_lang');
  if (stored === 'es' || stored === 'en') {
    return stored;
  }

  // 2. Comprobar cookie
  const match = document.cookie.match(/(?:^|;\s*)recetario_lang=([^;]+)/);
  if (match && (match[1] === 'es' || match[1] === 'en')) {
    return match[1] as Language;
  }

  // 3. Comprobar idioma del navegador
  if (navigator.language && navigator.language.toLowerCase().startsWith('en')) {
    return 'en';
  }

  return 'es';
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: typeof window !== 'undefined' ? getInitialLanguage() : 'es',

  setLanguage: (lang: Language) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('recetario_lang', lang);
        document.cookie = `recetario_lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
        // Disparar evento para componentes que escuchen cambios globales
        window.dispatchEvent(new CustomEvent('language-change', { detail: { lang } }));
      } catch {}
    }
    set({ language: lang });
  },

  toggleLanguage: () => {
    const nextLang = get().language === 'es' ? 'en' : 'es';
    get().setLanguage(nextLang);
  },

  t: (key: TranslationKey) => {
    return getTranslation(get().language, key);
  },
}));
