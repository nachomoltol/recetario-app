'use client';

import { useState } from 'react';
import { Share2, Smartphone, Check } from 'lucide-react';
import { IosShortcutTutorialModal } from '@/components/pwa/IosShortcutTutorialModal';
import { useLanguageStore } from '@/stores/useLanguageStore';

export function ShareAppsCard() {
  const [showTutorial, setShowTutorial] = useState(false);
  const t = useLanguageStore((s) => s.t);

  return (
    <>
      <div className="p-6 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif-recipe text-stone-900">
                {t('settings_share_title')}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {t('settings_share_desc')}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 shrink-0 flex items-center gap-1">
            <Check className="w-3 h-3" /> {t('settings_share_integrated')}
          </span>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          {t('settings_share_body')}
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#faf7f2] p-4 rounded-2xl border border-[#e7dfd5]">
          <div className="flex items-center gap-2.5 text-xs text-stone-600">
            <Smartphone className="w-4 h-4 text-[#a86224] shrink-0" />
            <span>{t('settings_share_ios_label')}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-white hover:bg-[#ebdcc9] text-[#a86224] font-semibold text-xs border border-[#e7dfd5] hover:border-[#a86224] flex items-center justify-center gap-2 transition cursor-pointer shrink-0 shadow-2xs"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{t('settings_share_ios_btn')}</span>
          </button>
        </div>
      </div>

      <IosShortcutTutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </>
  );
}
