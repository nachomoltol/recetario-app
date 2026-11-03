'use client';

import { useState, useEffect } from 'react';
import { Palette, Check, Sparkles, Lock } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { ProSubscriptionModal } from '@/components/subscription/ProSubscriptionModal';

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

interface ThemeSelectorCardProps {
  isPro?: boolean;
}

export function ThemeSelectorCard({ isPro }: ThemeSelectorCardProps) {
  const language = useLanguageStore((s) => s.language);
  const isEn = language === 'en';

  const profileFromStore = useProfileStore((s) => s.profile);
  const effectiveIsPro =
    isPro !== undefined
      ? isPro
      : (profileFromStore?.plan_suscripcion || '').trim().toLowerCase() === 'pro';

  const [activeTheme, setActiveTheme] = useState<ThemeId>('terracota');
  const [mounted, setMounted] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('miga_theme') as ThemeId | null;

    if (saved && THEMES.some((t) => t.id === saved)) {
      // Si el tema guardado requiere PRO y el usuario no es PRO, revertir de forma segura a terracota
      if (!effectiveIsPro && saved !== 'terracota') {
        setActiveTheme('terracota');
        document.documentElement.setAttribute('data-theme', 'terracota');
        try {
          localStorage.setItem('miga_theme', 'terracota');
        } catch {}
      } else {
        setActiveTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
      }
    } else {
      setActiveTheme('terracota');
      document.documentElement.setAttribute('data-theme', 'terracota');
    }
  }, [effectiveIsPro]);

  const handleSelectTheme = (themeId: ThemeId) => {
    // Si la paleta requiere PRO y el usuario es Free, bloquear y abrir modal PRO
    if (!effectiveIsPro && themeId !== 'terracota') {
      setShowProModal(true);
      return;
    }

    setActiveTheme(themeId);
    try {
      localStorage.setItem('miga_theme', themeId);
      document.documentElement.setAttribute('data-theme', themeId);
    } catch (e) {
      console.warn('Error saving theme to localStorage:', e);
    }
  };

  return (
    <div className="bg-white border border-[#e7dfd5] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4 sm:space-y-5 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-brand-light text-brand-primary flex items-center justify-center border border-brand-subtle shrink-0">
            <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold font-serif-recipe text-stone-900 leading-tight">
              {isEn ? 'Editorial Color Themes' : 'Tema y Paleta Editorial'}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {isEn
                ? 'Personalize the accent colors of buttons, badges and timers'
                : 'Personaliza los colores de botones, acentos, badges y temporizadores'}
            </p>
          </div>
        </div>

        {effectiveIsPro ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-light text-brand-primary text-[10px] font-bold uppercase tracking-wider border border-brand-subtle shrink-0">
            <Sparkles className="w-3 h-3" />
            <span>PRO</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setShowProModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10px] font-bold uppercase tracking-wider transition shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-amber-700" />
            <span>PRO</span>
          </button>
        )}
      </div>

      {/* Cuadrícula móvil compacta 2x2 */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
        {THEMES.map((theme) => {
          const isLocked = !effectiveIsPro && theme.id !== 'terracota';
          const isSelected = mounted && activeTheme === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => handleSelectTheme(theme.id)}
              className={`relative p-3 sm:p-4 rounded-2xl border transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                isSelected
                  ? 'border-brand-primary bg-brand-light/40 shadow-xs ring-2 ring-brand-primary/20'
                  : isLocked
                  ? 'border-[#e7dfd5] bg-stone-50/70 hover:bg-stone-100/60 opacity-90'
                  : 'border-[#e7dfd5] hover:border-stone-400 bg-white hover:bg-stone-50/60'
              }`}
            >
              {/* Badge PRO y candado para paletas bloqueadas */}
              {isLocked && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black uppercase tracking-wider shadow-2xs">
                  <Lock className="w-2.5 h-2.5 text-amber-800" />
                  <span>PRO</span>
                </span>
              )}

              {/* Muestra circular de color con contraste */}
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow-inner flex items-center justify-center shrink-0 border border-white/50 ring-1 ring-black/10 mt-1 mb-2"
                style={{ backgroundColor: theme.colorHex }}
              >
                {isSelected ? (
                  <Check className="w-4 h-4 text-white drop-shadow-xs" />
                ) : isLocked ? (
                  <Lock className="w-3.5 h-3.5 text-white/80" />
                ) : null}
              </div>

              {/* Contenedor de texto con salto de línea asegurado y centrado */}
              <div className="break-words whitespace-normal text-center min-h-[2.5rem] flex items-center justify-center w-full px-1">
                <span className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                  {isEn ? theme.nameEn : theme.nameEs}
                </span>
              </div>

              {/* Descripción corta */}
              <span className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 leading-tight line-clamp-1">
                {isEn ? theme.descEn : theme.descEs}
              </span>
            </button>
          );
        })}
      </div>

      {/* Modal de suscripción PRO al hacer clic en un tema bloqueado */}
      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        context="feature_locked"
        title={isEn ? 'Unlock Editorial Themes' : 'Desbloquea los Temas Editoriales'}
        description={
          isEn
            ? 'Personalize MigaApp with Olive Green, Slate Blue, and Burgundy Wine palettes with Miga PRO.'
            : 'Personaliza todo tu recetario con las paletas Verde Oliva, Azul Pizarra y Borgoña Alta Cocina con Miga PRO.'
        }
      />
    </div>
  );
}
