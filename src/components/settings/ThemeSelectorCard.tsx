'use client';

import { useState, useEffect } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';

export type ThemeId = 'terracota' | 'oliva' | 'pizarra' | 'vino';

interface ThemeOption {
  id: ThemeId;
  nameEs: string;
  nameEn: string;
  descEs: string;
  descEn: string;
  colorHex: string;
  hoverHex: string;
  bgLightHex: string;
}

const THEMES: ThemeOption[] = [
  {
    id: 'terracota',
    nameEs: 'Terracota Original',
    nameEn: 'Original Terracotta',
    descEs: 'Calidez mediterránea & lino orgánico',
    descEn: 'Mediterranean warmth & organic linen',
    colorHex: '#a86224',
    hoverHex: '#8e511c',
    bgLightHex: '#fef3e9',
  },
  {
    id: 'oliva',
    nameEs: 'Verde Oliva',
    nameEn: 'Olive Green',
    descEs: 'Huerto fresco & aceite virgen extra',
    descEn: 'Fresh garden & extra virgin olive oil',
    colorHex: '#4d7c0f',
    hoverHex: '#3f6212',
    bgLightHex: '#f7fee7',
  },
  {
    id: 'pizarra',
    nameEs: 'Azul Pizarra',
    nameEn: 'Slate Blue',
    descEs: 'Elegancia nórdica & brisa marina',
    descEn: 'Nordic elegance & ocean breeze',
    colorHex: '#334155',
    hoverHex: '#1e293b',
    bgLightHex: '#f1f5f9',
  },
  {
    id: 'vino',
    nameEs: 'Borgoña Vino',
    nameEn: 'Burgundy Wine',
    descEs: 'Enología, uva tinta & alta cocina',
    descEn: 'Enology, red grape & fine dining',
    colorHex: '#881337',
    hoverHex: '#700c2a',
    bgLightHex: '#fff1f2',
  },
];

export function ThemeSelectorCard() {
  const language = useLanguageStore((s) => s.language);
  const isEn = language === 'en';
  const [activeTheme, setActiveTheme] = useState<ThemeId>('terracota');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('miga_theme') as ThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setActiveTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      document.documentElement.setAttribute('data-theme', 'terracota');
    }
  }, []);

  const handleSelectTheme = (themeId: ThemeId) => {
    setActiveTheme(themeId);
    try {
      localStorage.setItem('miga_theme', themeId);
      document.documentElement.setAttribute('data-theme', themeId);
    } catch (e) {
      console.warn('Error saving theme to localStorage:', e);
    }
  };

  return (
    <div className="bg-white border border-[#e7dfd5] rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-light text-brand-primary flex items-center justify-center border border-brand-subtle">
            <Palette className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold font-serif-recipe text-stone-900">
              {isEn ? 'Editorial Color Themes' : 'Tema y Paleta Editorial'}
            </h2>
            <p className="text-xs text-stone-500">
              {isEn
                ? 'Personalize the accent colors of buttons, badges and timers'
                : 'Personaliza los colores de botones, acentos, badges y temporizadores'}
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-light text-brand-primary text-[10px] font-bold uppercase tracking-wider border border-brand-subtle">
          <Sparkles className="w-3 h-3" />
          <span>PRO</span>
        </span>
      </div>

      {/* Grid de 4 temas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {THEMES.map((theme) => {
          const isSelected = mounted && activeTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => handleSelectTheme(theme.id)}
              className={`relative p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                isSelected
                  ? 'border-brand-primary bg-brand-light/40 shadow-xs ring-2 ring-brand-primary/20'
                  : 'border-[#e7dfd5] hover:border-stone-400 bg-white hover:bg-stone-50/60'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Muestra circular de color con borde contrastado */}
                <div
                  className="w-8 h-8 rounded-full shadow-inner flex items-center justify-center shrink-0 border border-white/40 ring-1 ring-black/10"
                  style={{ backgroundColor: theme.colorHex }}
                >
                  {isSelected && <Check className="w-4 h-4 text-white drop-shadow-xs" />}
                </div>

                <div>
                  <span className="text-xs sm:text-sm font-bold text-stone-900 block leading-snug">
                    {isEn ? theme.nameEn : theme.nameEs}
                  </span>
                  <span className="text-[11px] text-stone-500 block leading-tight">
                    {isEn ? theme.descEn : theme.descEs}
                  </span>
                </div>
              </div>

              {/* Indicador sutil de selección */}
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                  isSelected ? 'border-brand-primary bg-brand-primary' : 'border-stone-300 bg-transparent'
                }`}
              >
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

