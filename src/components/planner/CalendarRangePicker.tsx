'use client';

import React, { useState, useMemo } from 'react';
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

export function CalendarRangePicker({
  startDate,
  endDate,
  onChangeRange,
  minDays = 1,
  maxDays = 31,
}: CalendarRangePickerProps) {
  const language = useLanguageStore((s) => s.language);
  const isEn = language === 'en';

  // Mes que se está visualizando en el calendario (por defecto el mes de startDate)
  const [viewDate, setViewDate] = useState<Date>(() => {
    const initial = parseLocalDate(startDate);
    return new Date(initial.getFullYear(), initial.getMonth(), 1, 12, 0, 0, 0);
  });

  // Estado intermedio durante el segundo clic (patrón Booking / Airbnb)
  // Si selectingEnd es true, el usuario ya seleccionó startDate y está eligiendo endDate
  const [selectingEnd, setSelectingEnd] = useState<boolean>(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Navegación entre meses
  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1, 12, 0, 0, 0));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1, 12, 0, 0, 0));
  };

  // Título del mes en formato legible
  const monthTitle = useMemo(() => {
    const locale = isEn ? 'en-US' : 'es-ES';
    const formatter = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    });
    const formatted = formatter.format(viewDate);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [viewDate, isEn]);

  // Cuadrícula del mes actual
  const { daysInMonth, firstDayOffset, todayStr } = useMemo(() => {
    const today = formatLocalDate(new Date());
    // Días del mes
    const daysCount = new Date(viewYear, viewMonth + 1, 0, 12, 0, 0, 0).getDate();
    // Día de la semana del 1er día (Lunes = 0, Domingo = 6)
    const firstDay = new Date(viewYear, viewMonth, 1, 12, 0, 0, 0).getDay();
    const offset = (firstDay + 6) % 7;

    return {
      daysInMonth: daysCount,
      firstDayOffset: offset,
      todayStr: today,
    };
  }, [viewYear, viewMonth]);

  // Rango activo o previo para visualización
  const effectiveStart = startDate;
  const effectiveEnd = selectingEnd && hoverDate && hoverDate >= startDate ? hoverDate : endDate;

  // Lógica de interacción Booking / Airbnb
  const handleDayClick = (dateStr: string) => {
    if (!selectingEnd) {
      // 1er Clic: fijar nuevo día de inicio
      setSelectingEnd(true);
      onChangeRange(dateStr, dateStr, 1);
    } else {
      // 2do Clic: fijar día de fin
      if (dateStr < startDate) {
        // Si hace clic en un día anterior, se convierte en el nuevo día de inicio
        onChangeRange(dateStr, dateStr, 1);
        setSelectingEnd(true);
      } else {
        const startD = parseLocalDate(startDate);
        const clickedD = parseLocalDate(dateStr);
        const diffDays =
          Math.round((clickedD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (diffDays > maxDays) {
          // Si supera el máximo de 31 días, limitar a maxDays días
          const cappedEnd = new Date(startD);
          cappedEnd.setDate(cappedEnd.getDate() + (maxDays - 1));
          const cappedStr = formatLocalDate(cappedEnd);
          onChangeRange(startDate, cappedStr, maxDays);
        } else {
          onChangeRange(startDate, dateStr, Math.max(minDays, diffDays));
        }
        setSelectingEnd(false);
        setHoverDate(null);
      }
    }
  };

  // Conteo de días seleccionados
  const selectedDaysCount = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const s = parseLocalDate(startDate);
    const e = parseLocalDate(endDate);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.min(maxDays, diff));
  }, [startDate, endDate, maxDays]);

  // Formato legible para la caja de confirmación inferior
  const formattedRangeText = useMemo(() => {
    if (!startDate) return '';
    const locale = isEn ? 'en-US' : 'es-ES';
    const s = parseLocalDate(startDate);
    const e = parseLocalDate(endDate || startDate);

    const formatOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    };

    const startText = s.toLocaleDateString(locale, formatOptions);
    const endText = e.toLocaleDateString(locale, formatOptions);

    if (startDate === endDate || selectedDaysCount === 1) {
      return `${startText} (${selectedDaysCount} ${
        isEn ? (selectedDaysCount === 1 ? 'day selected' : 'days selected') : (selectedDaysCount === 1 ? 'día seleccionado' : 'días seleccionados')
      })`;
    }

    return `${startText} → ${endText} (${selectedDaysCount} ${
      isEn ? 'days selected' : 'días seleccionados'
    })`;
  }, [startDate, endDate, selectedDaysCount, isEn]);

  const weekdays = isEn ? WEEKDAYS_EN : WEEKDAYS_ES;

  return (
    <div className="space-y-4 select-none">
      {/* Instrucción clara superior */}
      <div className="flex items-start gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-700">
        <Info className="w-4 h-4 text-[#a86224] shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <p className="font-semibold text-stone-900">
            {isEn
              ? 'Tap start and end dates on the calendar to select your menu'
              : 'Toca el día de inicio y el día de fin en el calendario para seleccionar tu menú'}
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

        {/* Cuadrícula de Días */}
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {/* Celdas vacías previas al día 1 */}
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`offset-${i}`} className="h-10 sm:h-11" />
          ))}

          {/* Días del mes */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(
              dayNum
            ).padStart(2, '0')}`;

            const isStart = dateStr === effectiveStart;
            const isEnd = dateStr === effectiveEnd;
            const isSingleDay = isStart && isEnd;
            const isInRange = dateStr > effectiveStart && dateStr < effectiveEnd;
            const isToday = dateStr === todayStr;

            // Clases de fondo continuo (efecto barra continua tipo Booking/Airbnb)
            let rangeBgClass = '';
            if (isInRange) {
              rangeBgClass = 'bg-[#f4efe6]';
            } else if (isStart && !isSingleDay) {
              rangeBgClass = 'bg-gradient-to-r from-transparent via-[#f4efe6] to-[#f4efe6] rounded-l-2xl';
            } else if (isEnd && !isSingleDay) {
              rangeBgClass = 'bg-gradient-to-l from-transparent via-[#f4efe6] to-[#f4efe6] rounded-r-2xl';
            }

            return (
              <div
                key={dateStr}
                className={`relative h-10 sm:h-11 flex items-center justify-center py-0.5 ${rangeBgClass}`}
                onMouseEnter={() => {
                  if (selectingEnd) {
                    setHoverDate(dateStr);
                  }
                }}
              >
                <button
                  type="button"
                  onClick={() => handleDayClick(dateStr)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex flex-col items-center justify-center text-xs sm:text-sm font-semibold transition touch-manipulation cursor-pointer ${
                    isStart || isEnd
                      ? 'bg-[#a86224] text-white font-bold shadow-xs scale-105 z-10'
                      : isInRange
                      ? 'text-stone-900 font-bold hover:bg-[#e7dfd5]'
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
