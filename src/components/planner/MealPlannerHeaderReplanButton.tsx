'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { ProSubscriptionModal } from '@/components/subscription/ProSubscriptionModal';

interface MealPlannerHeaderReplanButtonProps {
  className?: string;
  isPro?: boolean;
}

export function MealPlannerHeaderReplanButton({
  className = '',
  isPro,
}: MealPlannerHeaderReplanButtonProps) {
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);
  const isEn = language === 'en';

  const profile = useProfileStore((s) => s.profile);
  const effectiveIsPro =
    isPro !== undefined
      ? isPro
      : (profile?.plan_suscripcion || '').trim().toLowerCase() === 'pro';

  const [isProModalOpen, setIsProModalOpen] = useState(false);

  const buttonInner = (
    <>
      <Sparkles className="w-3.5 h-3.5 text-[#a86224] shrink-0" />
      <span className="truncate leading-tight font-medium">
        <span>{isEn ? 'Replan' : 'Replanificar'}</span>
        <span className="hidden min-[400px]:inline"> {isEn ? 'with AI' : 'con IA'}</span>
      </span>
      {!effectiveIsPro && (
        <span className="ml-0.5 px-1.5 py-0.2 rounded-md bg-[#a86224] text-[9px] font-black text-white uppercase tracking-wider shrink-0 shadow-2xs">
          PRO
        </span>
      )}
    </>
  );

  const baseClasses = `min-h-[34px] sm:min-h-[38px] w-full px-2 sm:px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200/80 text-stone-900 text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition active:scale-[0.98] shadow-2xs cursor-pointer ${className}`;

  return (
    <>
      {effectiveIsPro ? (
        <Link
          href="/smart-menu?replan=true"
          className={baseClasses}
          title={t('planner_replan_with_ai')}
        >
          {buttonInner}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setIsProModalOpen(true)}
          className={baseClasses}
          title={t('planner_pro_required_title')}
        >
          {buttonInner}
        </button>
      )}

      {/* Paywall / Modal de Suscripción PRO para usuarios gratuitos */}
      <ProSubscriptionModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        context="feature_locked"
        title={t('planner_pro_required_title')}
        description={t('planner_pro_required_desc')}
      />
    </>
  );
}

export default MealPlannerHeaderReplanButton;
