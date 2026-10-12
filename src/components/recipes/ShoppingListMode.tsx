'use client';

import { useState, useEffect } from 'react';
import {
  Check,
  RotateCcw,
  Copy,
  ShoppingCart,
  ChefHat,
  Sparkles,
} from 'lucide-react';
import { RecetaIngrediente } from '@/types/recipe';
import { IngredientRow } from './IngredientRow';

export type ExtendedIngredient = RecetaIngrediente & {
  cantidad_escalada?: number;
  gramos_escalados?: number;
  explicacion_culinaria?: string;
};

interface ShoppingListModeProps {
  recetaId: string;
  tituloReceta: string;
  ingredientes: ExtendedIngredient[];
}

export function ShoppingListMode({
  recetaId,
  tituloReceta,
  ingredientes,
}: ShoppingListModeProps) {
  const [isShoppingMode, setIsShoppingMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Clave de persistencia en localStorage para sobrevivir a apagados de pantalla
  const storageKey = `recetario_checklist_${recetaId}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setCheckedIds(JSON.parse(saved));
      }
    } catch {}
  }, [storageKey]);

  const handleToggleItem = (id: string) => {
    const next = checkedIds.includes(id)
      ? checkedIds.filter((item) => item !== id)
      : [...checkedIds, id];
    setCheckedIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };

  const handleReset = () => {
    setCheckedIds([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  const handleSelectAll = () => {
    const all = ingredientes.map((i) => i.id);
    setCheckedIds(all);
    try {
      localStorage.setItem(storageKey, JSON.stringify(all));
    } catch {}
  };

  const handleCopyList = () => {
    const textLines = [
      `🛒 LISTA DE LA COMPRA - ${tituloReceta.toUpperCase()}`,
      '----------------------------------------',
      ...ingredientes.map((ing) => {
        const isChecked = checkedIds.includes(ing.id);
        const prefix = isChecked ? '✓' : '☐';
        const qtyNum = ing.cantidad_escalada !== undefined ? ing.cantidad_escalada : ing.cantidad;
        const qty = `${qtyNum} ${ing.unidad}`;
        const name = ing.nombre_limpio || ing.nombre_crudo;
        return `${prefix} ${qty} ${name}${ing.notas ? ` (${ing.notas})` : ''}`;
      }),
      '----------------------------------------',
      `Creado con Recetario App (Escalado Inteligente)`,
    ];

    navigator.clipboard.writeText(textLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const total = ingredientes.length;
  const completed = checkedIds.filter((id) =>
    ingredientes.some((i) => i.id === id)
  ).length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Switcher Táctil Mobile-First entre Modo Cocina y Modo Compra */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5]">
        <div className="grid grid-cols-2 gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsShoppingMode(false)}
            className={`min-h-[46px] px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              !isShoppingMode
                ? 'bg-white text-stone-900 shadow-2xs font-bold border border-[#e7dfd5]'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ChefHat className="w-4 h-4 text-[#a86224]" />
            <span>Modo Cocina</span>
          </button>

          <button
            type="button"
            onClick={() => setIsShoppingMode(true)}
            className={`min-h-[46px] px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isShoppingMode
                ? 'bg-white text-stone-900 shadow-2xs font-bold border border-[#e7dfd5]'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-[#a86224]" />
            <span>Lista de Compra</span>
          </button>
        </div>

        {/* Herramientas rápidas para la lista */}
        {isShoppingMode && (
          <div className="flex items-center justify-end gap-2 px-1">
            <button
              type="button"
              onClick={handleCopyList}
              title="Copiar lista de ingredientes formateada"
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-[#e7dfd5] text-stone-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5 text-[#a86224]" />
              <span>{copied ? '¡Copiada!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={completed === total ? handleReset : handleSelectAll}
              className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs text-stone-600 hover:text-stone-900 hover:bg-white/70 transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-stone-400" />
              <span>{completed === total ? 'Desmarcar' : 'Marcar todo'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Vista A: Modo 'Cocina' (Ingredientes con Sustituciones Inteligentes) */}
      {!isShoppingMode && (
        <div className="divide-y divide-[#e7dfd5]">
          {ingredientes.map((ing) => (
            <IngredientRow
              key={ing.id}
              ingrediente={ing}
              tituloReceta={tituloReceta}
              scaledCantidad={ing.cantidad_escalada}
              scaledGramos={ing.gramos_escalados}
            />
          ))}
        </div>
      )}

      {/* Vista B: Modo 'Lista de la Compra' (Checklist Táctil Mobile-First) */}
      {isShoppingMode && (
        <div className="space-y-3 animate-fade-in">
          {/* Barra de Progreso del Carrito */}
          <div className="p-4 rounded-2xl bg-white border border-[#e7dfd5] space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-800 flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-[#a86224]" />
                <span>Progreso de compra en el súper</span>
              </span>
              <span className="font-mono font-bold text-[#a86224]">
                {completed} de {total} ingredientes ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#f4efe6] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#c27835] to-[#2e6b3e] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-stone-500 px-1">
            Toca con el dedo cualquier ingrediente para marcarlo como comprado mientras recorres los pasillos:
          </p>

          {/* Checklist táctil interactivo */}
          <div className="space-y-2">
            {ingredientes.map((ing) => {
              const isChecked = checkedIds.includes(ing.id);
              const qtyNum = ing.cantidad_escalada !== undefined ? ing.cantidad_escalada : ing.cantidad;

              return (
                <div
                  key={ing.id}
                  onClick={() => handleToggleItem(ing.id)}
                  className={`min-h-[54px] p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center gap-3.5 active:scale-[0.99] ${
                    isChecked
                      ? 'bg-[#f7f5f0] border-[#e2dbce] opacity-75'
                      : 'bg-white hover:bg-[#faf7f2] border-[#e7dfd5] shadow-2xs'
                  }`}
                >
                  {/* Casilla táctil grande de 28px */}
                  <div
                    className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                      isChecked
                        ? 'bg-[#2e6b3e] border-[#2e6b3e] text-white shadow-2xs'
                        : 'border-[#cbbfae] bg-[#fbf9f5]'
                    }`}
                  >
                    {isChecked && <Check className="w-4 h-4 stroke-3" />}
                  </div>

                  {/* Detalle del ingrediente */}
                  <div className="flex-1 min-w-0 flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className={`text-base font-semibold block truncate ${
                          isChecked
                            ? 'line-through text-stone-400 font-normal'
                            : 'text-stone-900'
                        }`}
                      >
                        {ing.nombre_limpio || ing.nombre_crudo}
                      </span>
                      {ing.explicacion_culinaria && !isChecked && (
                        <span className="text-[10px] text-[#a86224] block truncate font-medium">
                          ✦ {ing.explicacion_culinaria}
                        </span>
                      )}
                      {ing.notas && (
                        <span
                          className={`text-xs block truncate ${
                            isChecked ? 'line-through text-stone-300' : 'text-stone-500 italic'
                          }`}
                        >
                          {ing.notas}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-sm sm:text-base font-bold shrink-0 tabular-nums ${
                        isChecked ? 'line-through text-stone-400' : 'text-[#a86224]'
                      }`}
                    >
                      {qtyNum} {ing.unidad}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
