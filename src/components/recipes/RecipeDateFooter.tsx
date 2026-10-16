'use client';

import { useState, useEffect } from 'react';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface RecipeDateFooterProps {
  createdAt?: string | null;
}

export function RecipeDateFooter({ createdAt }: RecipeDateFooterProps) {
  const [mounted, setMounted] = useState(false);
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !createdAt) return null;

  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return null;

    return (
      <span>
        {t('recipe_created_on')}{' '}
        {d.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES')}
      </span>
    );
  } catch {
    return null;
  }
}
