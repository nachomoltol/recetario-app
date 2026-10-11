import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea minutos a formato legible (ej: 1h 15 min o 45 min)
 */
export function formatTiempo(minutos: number | null | undefined): string {
  if (!minutos || minutos <= 0) return '0 min';
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const rest = minutos % 60;
  return rest > 0 ? `${horas}h ${rest}m` : `${horas}h`;
}
