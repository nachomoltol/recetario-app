import { create } from 'zustand';
import { DiarioCocinados } from '@/types/recipe';

interface DiaryState {
  entradas: DiarioCocinados[];
  isSubmitting: boolean;
  selectedEntrada: DiarioCocinados | null;

  setEntradas: (entradas: DiarioCocinados[]) => void;
  addEntrada: (entrada: DiarioCocinados) => void;
  setSelectedEntrada: (entrada: DiarioCocinados | null) => void;
  setSubmitting: (isSubmitting: boolean) => void;
}

export const useDiaryStore = create<DiaryState>((set) => ({
  entradas: [],
  isSubmitting: false,
  selectedEntrada: null,

  setEntradas: (entradas) => set({ entradas }),
  addEntrada: (entrada) => set((state) => ({ entradas: [entrada, ...state.entradas] })),
  setSelectedEntrada: (selectedEntrada) => set({ selectedEntrada }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
}));
