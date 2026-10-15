'use client';

import Link from 'next/link';
import { Settings, ChefHat } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';

export function SettingsHeaderTitle() {
  const t = useLanguageStore((s) => s.t);
  return (
    <div>
      <span className="text-base font-bold font-serif-recipe tracking-tight text-stone-900 block">
        {t('settings_title')}
      </span>
      <span className="text-[10px] text-stone-500 tracking-wider uppercase block font-medium">
        {t('settings_subtitle')}
      </span>
    </div>
  );
}

export function SettingsHeroCard() {
  const t = useLanguageStore((s) => s.t);
  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shrink-0">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-serif-recipe text-stone-900">
            {t('settings_main_title')}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {t('settings_main_desc')}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SettingsProfileBanner() {
  const t = useLanguageStore((s) => s.t);
  return (
    <div className="p-6 rounded-3xl bg-[#f4efe6] border border-[#e7dfd5] flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3 text-center sm:text-left">
        <div className="w-10 h-10 rounded-2xl bg-white border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shrink-0">
          <ChefHat className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold font-serif-recipe text-stone-900">
            {t('settings_profile_link_title')}
          </h4>
          <p className="text-xs text-stone-600">
            {t('settings_profile_link_desc')}
          </p>
        </div>
      </div>

      <Link
        href="/profile"
        className="w-full sm:w-auto min-h-[42px] px-5 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-[#a86224] border border-[#e7dfd5] text-xs font-semibold flex items-center justify-center transition shadow-2xs"
      >
        {t('settings_profile_link_btn')}
      </Link>
    </div>
  );
}
