'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useProfileStore } from '@/stores/useProfileStore';

export function AuthInitializer() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const clearProfile = useProfileStore((s) => s.clearProfile);

  // 1. Inicializar sesión y listeners de Supabase Auth al montar
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // 2. Sincronizar automáticamente el perfil de usuario cuando la sesión cambia
  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
    } else {
      clearProfile();
    }
  }, [user?.id, fetchProfile, clearProfile]);

  return null;
}
