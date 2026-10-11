import { create } from 'zustand';
import { Usuario } from '@/types/recipe';
import { createClient } from '@/lib/supabase/client';

interface ProfileState {
  profile: Usuario | null;
  isLoading: boolean;
  error: string | null;

  setProfile: (profile: Usuario | null) => void;
  fetchProfile: (userId: string) => Promise<Usuario | null>;
  updateProfile: (updates: Partial<Omit<Usuario, 'id' | 'email' | 'created_at'>>) => Promise<boolean>;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,

  setProfile: (profile) => set({ profile, error: null }),

  fetchProfile: async (userId: string) => {
    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      set({ profile: data, isLoading: false });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar perfil de usuario';
      console.error('Error en fetchProfile:', message);
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updateProfile: async (updates) => {
    const currentProfile = get().profile;
    if (!currentProfile) return false;

    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentProfile.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      set({ profile: data, isLoading: false });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar perfil';
      console.error('Error en updateProfile:', message);
      set({ error: message, isLoading: false });
      return false;
    }
  },

  clearProfile: () => set({ profile: null, error: null, isLoading: false }),
}));
