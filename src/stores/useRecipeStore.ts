import { create } from 'zustand';
import { RecetaCompleta, FiltrosRecetas } from '@/types/recipe';

interface RecipeState {
  recetas: RecetaCompleta[];
  recetaSeleccionada: RecetaCompleta | null;
  filtros: FiltrosRecetas;
  isLoading: boolean;
  error: string | null;

  // Actions
  setRecetas: (recetas: RecetaCompleta[]) => void;
  setRecetaSeleccionada: (receta: RecetaCompleta | null) => void;
  setFiltros: (filtros: Partial<FiltrosRecetas>) => void;
  resetFiltros: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const initialFiltros: FiltrosRecetas = {
  query: '',
  categoria: undefined,
  dificultad: undefined,
  tiempoMaximo: undefined,
  soloFavoritas: false,
};

export const useRecipeStore = create<RecipeState>((set) => ({
  recetas: [],
  recetaSeleccionada: null,
  filtros: initialFiltros,
  isLoading: false,
  error: null,

  setRecetas: (recetas) => set({ recetas }),
  setRecetaSeleccionada: (recetaSeleccionada) => set({ recetaSeleccionada }),
  setFiltros: (filtros) =>
    set((state) => ({ filtros: { ...state.filtros, ...filtros } })),
  resetFiltros: () => set({ filtros: initialFiltros }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
