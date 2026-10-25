/**
 * Utilidades de fecha libres de desfase de zona horaria (UTC vs Local)
 * para el Planificador de Comidas y Menú Semanal.
 */

/**
 * Formatea un objeto Date a string 'YYYY-MM-DD' en hora local.
 * Evita el desfase de 1 día que produce .toISOString().split('T')[0] en husos horarios positivos (ej. UTC+1 / UTC+2).
 */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parsea un string 'YYYY-MM-DD' a un objeto Date local seguro a mediodía (12:00:00).
 * Fijar las 12:00 evita que transiciones de cambio de hora (DST) o medianoche desplace el día.
 */
export function parseLocalDate(str?: string | null): Date {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
  }
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

/**
 * Devuelve el Lunes de la semana que contiene a la fecha dada (a mediodía local).
 */
export function getMondayOfDate(d: Date): Date {
  const date = new Date(d);
  date.setHours(12, 0, 0, 0);
  const day = date.getDay(); // 0 es Domingo, 1 es Lunes, etc.
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}
