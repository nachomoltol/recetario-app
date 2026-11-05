'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { SupportFeedbackModal, type FeedbackCategory } from './SupportFeedbackModal';

interface SupportContactTriggerProps {
  variant?: 'brand' | 'stone' | 'pill';
  defaultCategory?: FeedbackCategory;
  emailText?: string;
}

export function SupportContactTrigger({
  variant = 'brand',
  defaultCategory = 'Otro',
  emailText = 'migarecetasredes@gmail.com',
}: SupportContactTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {variant === 'pill' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#faf7f2] hover:bg-[#f4efe6] border border-[#e7dfd5] text-xs sm:text-sm font-semibold text-brand-primary transition cursor-pointer"
        >
          <Mail className="w-4 h-4" />
          <span className="hover:underline">{emailText}</span>
        </button>
      ) : variant === 'stone' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="underline font-medium text-stone-700 hover:text-brand-primary transition cursor-pointer inline"
        >
          {emailText}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="font-medium text-brand-primary underline hover:text-brand-hover transition cursor-pointer inline"
        >
          {emailText}
        </button>
      )}

      <SupportFeedbackModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        defaultCategory={defaultCategory}
      />
    </>
  );
}

