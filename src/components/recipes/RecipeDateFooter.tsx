'use client';

import { useLanguageStore } from '@/stores/useLanguageStore';

interface RecipeDateFooterProps {
  createdAt: string;
}

export function RecipeDateFooter({ createdAt }: RecipeDateFooterProps) {
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);

  return (
    <span>
      {t('recipe_created_on')}{' '}
      {new Date(createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES')}
    </span>
  );
}
