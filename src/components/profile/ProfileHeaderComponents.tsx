'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';

export function ProfileHeaderTitle() {
  const t = useLanguageStore((s) => s.t);
  return (
    <div>
      <span className="text-base font-bold font-serif-recipe tracking-tight text-stone-900 block">
        {t('profile_title')}
      </span>
      <span className="text-[10px] text-stone-500 tracking-wider uppercase block font-medium">
        {t('profile_subtitle')}
      </span>
    </div>
  );
}

export function ProfileSettingsBanner() {
  const t = useLanguageStore((s) => s.t);
  return (
    <div className="p-6 rounded-3xl bg-[#f4efe6] border border-[#e7dfd5] flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3 text-center sm:text-left">
        <div className="w-10 h-10 rounded-2xl bg-white border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shrink-0">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold font-serif-recipe text-stone-900">
            {t('profile_to_settings_title')}
          </h4>
          <p className="text-xs text-stone-600">
            {t('profile_to_settings_desc')}
          </p>
        </div>
      </div>

      <Link
        href="/settings"
        className="w-full sm:w-auto min-h-[42px] px-5 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-[#a86224] border border-[#e7dfd5] text-xs font-semibold flex items-center justify-center transition shadow-2xs"
      >
        {t('profile_to_settings_btn')}
      </Link>
    </div>
  );
}
