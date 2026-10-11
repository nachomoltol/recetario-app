'use client';

import { useProfileStore } from '@/stores/useProfileStore';
import { useAuthStore } from '@/stores/useAuthStore';

interface UserProfileBadgeProps {
  fallbackName: string;
  email: string;
}

export function UserProfileBadge({ fallbackName, email }: UserProfileBadgeProps) {
  const profile = useProfileStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const displayName = profile?.nombre || user?.user_metadata?.nombre || fallbackName;
  const displayEmail = user?.email || email;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center shadow-md shadow-amber-500/10">
        {initials}
      </div>
      <div className="hidden sm:block text-left">
        <p className="text-xs font-semibold text-stone-200 leading-tight">{displayName}</p>
        <p className="text-[11px] text-stone-500 truncate max-w-[150px]">{displayEmail}</p>
      </div>
    </div>
  );
}
