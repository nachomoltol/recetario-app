'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';
import { formatLocalDate, parseLocalDate } from '@/lib/dateUtils';
import { useLanguageStore } from '@/stores/useLanguageStore';

export interface CalendarRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onChangeRange: (startDate: string, endDate: string, daysCount: number) => void;
  minDays?: number;
  maxDays?: number;
}

const WEEKDAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const WEEKDAYS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface DayCell {
  dateStr: string;
  dayNum: number;
  monthType: 'prev' | 'current' | 'next';
  isToday: boolean;
}

/**
 * Calcula el rango ordenado y acotado por maxDays / minDays
 */
function getCappedRange(
  d1: string,
  d2: string,
  minDays: number,
  maxDays: number
): { start: string; end: string; count: number } {
  const startStr = d1 <= d2 ? d1 : d2;
  const endStr = d1 <= d2 ? d2 : d1;
  const s = parseLocalDate(startStr);
  const e = parseLocalDate(endStr);
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (diff > maxDays) {
    const capped = new Date(s);
    capped.setDate(capped.getDate() + (maxDays - 1));
    return { start: startStr, end: formatLocalDate(capped), count: maxDays };
  }

  return { start: startStr, end: endStr, count: Math.max(minDays, diff) };
}

export function CalendarRangePicker({
  startDate,
  endDate,
  onChangeRange,
  minDays = 1,
  maxDays = 31,
}: CalendarRangePickerProps) {
  const language = useLanguageStore((s) => s.language);
  const isEn = language === 'en';

  // Mes visible en el calendario (por defecto el mes de startDate)
  const [viewDate, setViewDate] = useState<Date>(() => {
    const initial = parseLocalDate(startDate);
    return new Date(initial.getFullYear(), initial.getMonth(), 1, 12, 0, 0, 0);
  });

  // Estado intermedio para el método de 2 clics simples (Booking / Airbnb)
  const [selectingEnd, setSelectingEnd] = useState<boolean>(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Estado para previsualización dinámica durante arrastre (Drag-to-select)
  const [dragState, setDragState] = useState<{ anchor: string; current: string } | null>(null);

  // Refs de control para ratón y táctil
  const isMouseDownRef = useRef(false);
  const dragAnchorRef = useRef<string | null>(null);
  const dragCurrentRef = useRef<string | null>(null);
  const hasMovedRef = useRef(false);

  const isTouchActiveRef = useRef(false);
  const touchAnchorRef = useRef<string | null>(null);
  const touchCurrentRef = useRef<string | null>(null);
  const touchHasMovedRef = useRef(false);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Navegación entre meses
  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1, 12, 0, 0, 0));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1, 12, 0, 0, 0));
  };

  // Salto de mes continuo automático cuando se interactúa con días atenuados
  const checkAndAdvanceMonth = useCallback(
    (targetDateStr: string) => {
      const targetDate = parseLocalDate(targetDateStr);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      if (targetYear !== viewYear || targetMonth !== viewMonth) {
        setViewDate(new Date(targetYear, targetMonth, 1, 12, 0, 0, 0));
      }
    },
    [viewYear, viewMonth]
  );

  // Título del mes en formato legible bilingüe
  const monthTitle = useMemo(() => {
    const locale = isEn ? 'en-US' : 'es-ES';
    const formatter = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    });
    const formatted = formatter.format(viewDate);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [viewDate, isEn]);

  // Cuadrícula completa con salto continuo (incluye días atenuados del mes previo y posterior)
  const calendarGrid = useMemo<DayCell[]>(() => {
    const today = formatLocalDate(new Date());

    // Días del mes visible
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0, 12, 0, 0, 0).getDate();
    // Día de inicio (Lunes = 0, Domingo = 6)
    const firstDayOfWeek = (new Date(viewYear, viewMonth, 1, 12, 0, 0, 0).getDay() + 6) % 7;

    // Días del mes anterior
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0, 12, 0, 0, 0).getDate();

    const cells: DayCell[] = [];

    // 1. Días atenuados del mes anterior
    for (let i = 0; i < firstDayOfWeek; i++) {
      const dayNum = daysInPrevMonth - firstDayOfWeek + 1 + i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNum, 12, 0, 0, 0);
      const dateStr = formatLocalDate(prevDate);
      cells.push({
        dateStr,
        dayNum,
        monthType: 'prev',
        isToday: dateStr === today,
      });
    }

    // 2. Días del mes actual
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const curDate = new Date(viewYear, viewMonth, dayNum, 12, 0, 0, 0);
      const dateStr = formatLocalDate(curDate);
      cells.push({
        dateStr,
        dayNum,
        monthType: 'current',
        isToday: dateStr === today,
      });
    }

    // 3. Días atenuados del mes siguiente para completar la cuadrícula continua
    // Garantizamos siempre días visibles del mes siguiente para interacción continua
    let totalCells = Math.ceil(cells.length / 7) * 7;
    if (totalCells === cells.length) {
      // Si el mes termina exactamente en domingo, añadimos una semana del mes siguiente para permitir selección continua
      totalCells += 7;
    }
    const nextDaysNeeded = totalCells - cells.length;

    for (let dayNum = 1; dayNum <= nextDaysNeeded; dayNum++) {
      const nextDate = new Date(viewYear, viewMonth + 1, dayNum, 12, 0, 0, 0);
      const dateStr = formatLocalDate(nextDate);
      cells.push({
        dateStr,
        dayNum,
        monthType: 'next',
        isToday: dateStr === today,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Rango activo o dinámico en previsualización (Drag o 2-clics)
  const { effectiveStart, effectiveEnd } = useMemo(() => {
    if (dragState) {
      const { start, end } = getCappedRange(dragState.anchor, dragState.current, minDays, maxDays);
      return { effectiveStart: start, effectiveEnd: end };
    }

    if (selectingEnd && hoverDate) {
      if (hoverDate >= startDate) {
        const { start, end } = getCappedRange(startDate, hoverDate, minDays, maxDays);
        return { effectiveStart: start, effectiveEnd: end };
      }
      return { effectiveStart: hoverDate, effectiveEnd: hoverDate };
    }

    return { effectiveStart: startDate, effectiveEnd: endDate };
  }, [dragState, selectingEnd, hoverDate, startDate, endDate, minDays, maxDays]);

  // Método alternativo de 2 clics simples (fallback de accesibilidad y rapidez)
  const handleDayClick = useCallback(
    (dateStr: string) => {
      if (!selectingEnd) {
        // Clic 1: fijar inicio
        setSelectingEnd(true);
        onChangeRange(dateStr, dateStr, 1);
        checkAndAdvanceMonth(dateStr);
      } else {
        // Clic 2: fijar fin
        if (dateStr < startDate) {
          onChangeRange(dateStr, dateStr, 1);
          setSelectingEnd(true);
          checkAndAdvanceMonth(dateStr);
        } else {
          const { start, end, count } = getCappedRange(startDate, dateStr, minDays, maxDays);
          onChangeRange(start, end, count);
          checkAndAdvanceMonth(dateStr);
          setSelectingEnd(false);
          setHoverDate(null);
        }
      }
    },
    [selectingEnd, startDate, minDays, maxDays, onChangeRange, checkAndAdvanceMonth]
  );

  // Manejo de drag con ratón en PC/Tablet
  const handleMouseDown = (dateStr: string, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Solo botón principal izquierdo
    isMouseDownRef.current = true;
    dragAnchorRef.current = dateStr;
    dragCurrentRef.current = dateStr;
    hasMovedRef.current = false;
    setDragState({ anchor: dateStr, current: dateStr });
  };

  const handleMouseEnter = (dateStr: string) => {
    if (isMouseDownRef.current && dragAnchorRef.current) {
      if (dateStr !== dragAnchorRef.current) {
        hasMovedRef.current = true;
      }
      dragCurrentRef.current = dateStr;
      setDragState({ anchor: dragAnchorRef.current, current: dateStr });
    } else if (selectingEnd) {
      setHoverDate(dateStr);
    }
  };

  // Listener global de mouseup para finalizar arrastre de ratón limpiamente en cualquier punto
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (!isMouseDownRef.current) return;
      isMouseDownRef.current = false;

      const anchor = dragAnchorRef.current;
      const current = dragCurrentRef.current;

      if (hasMovedRef.current && anchor && current) {
        // Se completó un arrastre con éxito
        const { start, end, count } = getCappedRange(anchor, current, minDays, maxDays);
        onChangeRange(start, end, count);
        checkAndAdvanceMonth(current);
        setSelectingEnd(false);
        setHoverDate(null);
      }
      setDragState(null);
      dragAnchorRef.current = null;
      dragCurrentRef.current = null;
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [minDays, maxDays, onChangeRange, checkAndAdvanceMonth]);

  // Manejo táctil touch-first para móvil (Drag-to-select fluido y sin interferir con scroll)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const dateEl = el?.closest('[data-calendar-date]');
    const dateStr = dateEl?.getAttribute('data-calendar-date');

    if (dateStr) {
      isTouchActiveRef.current = true;
      touchAnchorRef.current = dateStr;
      touchCurrentRef.current = dateStr;
      touchHasMovedRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouchActiveRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const dateEl = el?.closest('[data-calendar-date]');
    const dateStr = dateEl?.getAttribute('data-calendar-date');

    if (dateStr && touchAnchorRef.current) {
      if (dateStr !== touchAnchorRef.current) {
        touchHasMovedRef.current = true;
      }
      touchCurrentRef.current = dateStr;
      setDragState({ anchor: touchAnchorRef.current, current: dateStr });
    }
  };

  const handleTouchEnd = () => {
    if (!isTouchActiveRef.current) return;
    isTouchActiveRef.current = false;

    const anchor = touchAnchorRef.current;
    const current = touchCurrentRef.current;

    if (touchHasMovedRef.current && anchor && current) {
      // Arrastre táctil completado
      const { start, end, count } = getCappedRange(anchor, current, minDays, maxDays);
      onChangeRange(start, end, count);
      checkAndAdvanceMonth(current);
      setSelectingEnd(false);
      setHoverDate(null);
    } else if (anchor && !touchHasMovedRef.current) {
      // Toque simple táctil -> ejecutar 2-clics
      handleDayClick(anchor);
    }

    setDragState(null);
    touchAnchorRef.current = null;
    touchCurrentRef.current = null;
    touchHasMovedRef.current = false;
  };

  // Conteo de días seleccionados para la caja de estado
  const selectedDaysCount = useMemo(() => {
    if (!effectiveStart || !effectiveEnd) return 1;
    const s = parseLocalDate(effectiveStart);
    const e = parseLocalDate(effectiveEnd);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.min(maxDays, diff));
  }, [effectiveStart, effectiveEnd, maxDays]);

  // Formato legible para la caja de confirmación inferior
  const formattedRangeText = useMemo(() => {
    if (!effectiveStart) return '';
    const locale = isEn ? 'en-US' : 'es-ES';
    const s = parseLocalDate(effectiveStart);
    const e = parseLocalDate(effectiveEnd || effectiveStart);

    const formatOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    };

    const startText = s.toLocaleDateString(locale, formatOptions);
    const endText = e.toLocaleDateString(locale, formatOptions);

    if (effectiveStart === effectiveEnd || selectedDaysCount === 1) {
      return `${startText} (${selectedDaysCount} ${
        isEn
          ? selectedDaysCount === 1
            ? 'day selected'
            : 'days selected'
          : selectedDaysCount === 1
          ? 'día seleccionado'
          : 'días seleccionados'
      })`;
    }

    return `${startText} → ${endText} (${selectedDaysCount} ${
      isEn ? 'days selected' : 'días seleccionados'
    })`;
  }, [effectiveStart, effectiveEnd, selectedDaysCount, isEn]);

  const weekdays = isEn ? WEEKDAYS_EN : WEEKDAYS_ES;

  return (
    <div className="space-y-4 select-none">
      {/* Instrucción clara superior bilingüe */}
      <div className="flex items-start gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-700">
        <Info className="w-4 h-4 text-[#a86224] shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <p className="font-semibold text-stone-900">
            {isEn
              ? 'Tap start & end dates or drag on the calendar to select your menu'
              : 'Toca el día de inicio y fin o arrastra sobre el calendario para seleccionar tu menú'}
          </p>
          <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
            {isEn
              ? 'Continuous range selection: minimum 1 day, up to 31 days.'
              : 'Rango continuo de selección: mínimo 1 día, máximo 31 días.'}
          </p>
        </div>
      </div>

      {/* Contenedor del Calendario */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs">
        {/* Barra de Navegación de Meses */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e7dfd5]/60 mb-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label={isEn ? 'Previous month' : 'Mes anterior'}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-[#f4efe6] transition cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-sm sm:text-base font-bold font-serif-recipe text-stone-900 tracking-tight">
            {monthTitle}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            aria-label={isEn ? 'Next month' : 'Mes siguiente'}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-[#f4efe6] transition cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Cabecera de Días de la Semana */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekdays.map((d, idx) => (
            <div
              key={idx}
              className="text-[11px] sm:text-xs font-bold text-stone-500 py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Cuadrícula de Días con soporte táctil touch-none durante interacción */}
        <div
          className="grid grid-cols-7 gap-y-1 text-center touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {calendarGrid.map((cell) => {
            const { dateStr, dayNum, monthType, isToday } = cell;

            const isStart = dateStr === effectiveStart;
            const isEnd = dateStr === effectiveEnd;
            const isSingleDay = isStart && isEnd;
            const isInRange = dateStr > effectiveStart && dateStr < effectiveEnd;
            const isDimmed = monthType !== 'current';

            // Clases de fondo continuo tipo Booking/Airbnb
            let rangeBgClass = '';
            if (isInRange) {
              rangeBgClass = 'bg-[#f4efe6]';
            } else if (isStart && !isSingleDay) {
              rangeBgClass =
                'bg-gradient-to-r from-transparent via-[#f4efe6] to-[#f4efe6] rounded-l-2xl';
            } else if (isEnd && !isSingleDay) {
              rangeBgClass =
                'bg-gradient-to-l from-transparent via-[#f4efe6] to-[#f4efe6] rounded-r-2xl';
            }

            return (
              <div
                key={dateStr}
                data-calendar-date={dateStr}
                className={`relative h-10 sm:h-11 flex items-center justify-center py-0.5 ${rangeBgClass}`}
                onMouseEnter={() => handleMouseEnter(dateStr)}
              >
                <button
                  type="button"
                  data-calendar-date={dateStr}
                  onMouseDown={(e) => handleMouseDown(dateStr, e)}
                  onClick={(e) => {
                    // Si hubo un arrastre con ratón, el listener de mouseup ya gestionó la selección
                    if (!hasMovedRef.current) {
                      handleDayClick(dateStr);
                    }
                  }}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex flex-col items-center justify-center text-xs sm:text-sm font-semibold transition touch-manipulation cursor-pointer ${
                    isStart || isEnd
                      ? 'bg-[#a86224] text-white font-bold shadow-xs scale-105 z-10 opacity-100'
                      : isInRange
                      ? 'text-stone-900 font-bold hover:bg-[#e7dfd5] opacity-100'
                      : isDimmed
                      ? 'text-stone-400 opacity-60 hover:opacity-100 hover:text-stone-800 hover:bg-[#f4efe6]'
                      : 'text-stone-700 hover:bg-[#f4efe6]'
                  } ${isToday && !isStart && !isEnd ? 'border border-[#a86224]/50' : ''}`}
                >
                  <span>{dayNum}</span>
                  {isToday && !isStart && !isEnd && (
                    <span className="w-1 h-1 rounded-full bg-[#a86224] -mt-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Caja Inferior de Confirmación Única */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex items-center justify-between gap-3 text-xs sm:text-sm animate-fade-in">
        <div className="flex items-center gap-2 text-stone-700">
          <CalendarIcon className="w-4 h-4 text-[#a86224] shrink-0" />
          <span className="font-semibold">
            {isEn ? 'Planned period:' : 'Período planificado:'}
          </span>
        </div>
        <span className="font-bold text-stone-900 text-right">
          {formattedRangeText}
        </span>
      </div>
    </div>
  );
}

export default CalendarRangePicker;
