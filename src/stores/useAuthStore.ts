import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  initializeAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user ?? null }),

  initializeAuth: async () => {
    // Si ya está inicializado, no duplicar suscripción
    if (get().isInitialized) return;

    const supabase = createClient();
    set({ isLoading: true });

    try {
      // 1. Obtener sesión activa inicial
      const { data: { session } } = await supabase.auth.getSession();
      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
        isInitialized: true,
      });

      // 2. Suscribirse a cambios de estado de autenticación (login, logout, refresh de token)
      supabase.auth.onAuthStateChange((_event, newSession) => {
        set({
          session: newSession,
          user: newSession?.user ?? null,
          isLoading: false,
        });
      });
    } catch (error) {
      console.error('Error inicializando useAuthStore:', error);
      set({ user: null, session: null, isLoading: false, isInitialized: true });
    }
  },

  signOut: async () => {
    const supabase = createClient();
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('recetario_vip_active');
        } catch {}
      }
      set({ user: null, session: null, isLoading: false });
    } catch (error) {
      console.error('Error en signOut:', error);
      set({ isLoading: false });
    }
  },
}));
