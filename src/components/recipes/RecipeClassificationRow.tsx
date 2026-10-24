'use client';

import {
  Sun,
  UtensilsCrossed,
  Moon,
  Cookie,
  CakeSlice,
  SlidersHorizontal,
  Star,
  Sparkles,
} from 'lucide-react';
import { MomentoDia, RolPlato } from '@/types/database';
import { useLanguageStore } from '@/stores/useLanguageStore';

export interface RecipeClassificationRowProps {
  momentos_dia: MomentoDia[];
  rol_plato?: RolPlato | null;
  es_favorito_menu?: boolean | null;
  onOpenDrawer: () => void;
}

export function RecipeClassificationRow({
  momentos_dia,
  es_favorito_menu = false,
  onOpenDrawer,
}: RecipeClassificationRowProps) {
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);

  const hasMomentos = momentos_dia && momentos_dia.length > 0;

  const momentoConfig: Record<
    MomentoDia,
    { label: string; icon: typeof Sun; bg: string; text: string; border: string }
  > = {
    desayuno: {
      label: t('meal_moment_breakfast'),
      icon: Sun,
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
    },
    almuerzo: {
      label: t('meal_moment_lunch'),
      icon: UtensilsCrossed,
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-200',
    },
    cena: {
      label: t('meal_moment_dinner'),
      icon: Moon,
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-200',
    },
    snack: {
      label: t('meal_moment_snack'),
      icon: Cookie,
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
    },
    postre: {
      label: t('meal_moment_dessert'),
      icon: CakeSlice,
      bg: 'bg-pink-50',
      text: 'text-pink-800',
      border: 'border-pink-200',
    },
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden pt-2.5 pb-1 border-t border-[#e7dfd5]/80 flex flex-wrap items-center justify-between gap-2.5">
      {/* Grupo de Chips de Momentos y Favorito */}
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        {hasMomentos ? (
          <>
            {/* Chips de momentos del día */}
            {momentos_dia.map((momento) => {
              const cfg = momentoConfig[momento] || momentoConfig.almuerzo;
              const Icon = cfg.icon;
              return (
                <span
                  key={momento}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border} shadow-2xs shrink-0`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>{cfg.label}</span>
                </span>
              );
            })}

            {/* Badge de favorito para menús */}
            {es_favorito_menu && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs shrink-0">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                <span>{t('menu_favorite')}</span>
              </span>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-stone-500 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#a86224] shrink-0" />
            <span className="italic">{t('categorize_unclassified')}</span>
          </div>
        )}
      </div>

      {/* Botón Discreto de Edición / Apertura del Drawer */}
      <button
        type="button"
        onClick={onOpenDrawer}
        className="min-h-[34px] px-2.5 py-1 rounded-xl bg-white hover:bg-[#fbf9f5] text-stone-600 hover:text-[#a86224] border border-[#e7dfd5] hover:border-[#a86224]/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ml-auto shrink-0"
        aria-label={t('categorize_edit_btn')}
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-[#a86224]" />
        <span>
          {hasMomentos
            ? language === 'en'
              ? 'Edit times'
              : 'Editar momentos'
            : t('categorize_edit_btn')}
        </span>
      </button>
    </div>
  );
}
