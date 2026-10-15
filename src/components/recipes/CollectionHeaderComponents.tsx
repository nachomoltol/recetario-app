'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface CollectionHeaderTitleProps {
  total: number;
}

export function CollectionHeaderTitle({ total }: CollectionHeaderTitleProps) {
  const t = useLanguageStore((s) => s.t);

  return (
    <div>
      <span className="text-base font-bold font-serif-recipe tracking-tight text-stone-900 block leading-tight">
        {t('collection_title')}
      </span>
      <span className="text-[10px] text-stone-500 tracking-wider uppercase block font-medium">
        {t('collection_subtitle')} ({total}){' '}
        <span className="font-mono text-stone-400 font-bold ml-1">v.2.0</span>
      </span>
    </div>
  );
}

export function CollectionHeroHeader() {
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e7dfd5] pb-5">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif-recipe text-stone-900">
          {t('collection_main_title')}
        </h1>
        <p className="text-xs sm:text-sm text-stone-500">
          {t('collection_main_desc')}
        </p>
      </div>

      <Link
        href="/recipes"
        className="min-h-[44px] px-4 py-2 rounded-2xl bg-[#a86224] hover:bg-[#8e511c] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-xs transition self-start sm:self-auto"
      >
        <Sparkles className="w-4 h-4" />
        <span>{language === 'en' ? 'Capture New Recipe' : 'Capturar Nueva Receta'}</span>
      </Link>
    </div>
  );
}
