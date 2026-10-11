'use client';

import { useState, useEffect } from 'react';
import {
  Check,
  RotateCcw,
  Copy,
  ShoppingCart,
  ChefHat,
  Share2,
} from 'lucide-react';
import { RecetaIngrediente } from '@/types/recipe';
import { IngredientRow } from './IngredientRow';

interface ShoppingListModeProps {
  recetaId: string;
  tituloReceta: string;
  ingredientes: RecetaIngrediente[];
}

export function ShoppingListMode({
  recetaId,
  tituloReceta,
  ingredientes,
}: ShoppingListModeProps) {
  const [isShoppingMode, setIsShoppingMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Clave de persistencia en localStorage
  const storageKey = `recetario_checklist_${recetaId}`;

  // Cargar estado guardado al montar en cliente
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setCheckedIds(JSON.parse(saved));
      }
    } catch {}
  }, [storageKey]);

  // Persistir cambios en localStorage
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
        const qty = `${ing.cantidad} ${ing.unidad}`;
        const name = ing.nombre_limpio || ing.nombre_crudo;
        return `${prefix} ${qty} ${name}${ing.notas ? ` (${ing.notas})` : ''}`;
      }),
      '----------------------------------------',
      `Creado con Recetario App`,
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
                ? 'bg-[#a86224] text-white shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Lista Compra {completed > 0 ? `(${completed}/${total})` : ''}</span>
          </button>
        </div>

        {isShoppingMode && (
          <div className="flex items-center justify-end gap-2 px-2 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={handleCopyList}
              title="Copiar lista de la compra al portapapeles"
              className="min-h-[38px] px-3 rounded-xl text-xs font-semibold bg-white hover:bg-stone-50 text-stone-700 border border-[#e7dfd5] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#2e6b3e]" />
                  <span className="text-[#2e6b3e]">¡Copiada!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  <span>Copiar texto</span>
                </>
              )}
            </button>

            {completed > 0 ? (
              <button
                type="button"
                onClick={handleReset}
                title="Desmarcar todos los ingredientes"
                className="min-h-[38px] px-2.5 rounded-xl text-xs font-medium text-stone-500 hover:text-stone-800 transition flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reiniciar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSelectAll}
                title="Marcar todos los ingredientes como comprados"
                className="min-h-[38px] px-2.5 rounded-xl text-xs font-medium text-stone-500 hover:text-stone-800 transition flex items-center gap-1 cursor-pointer"
              >
                <span>Marcar todo</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Vista A: Modo Cocina (Listado estándar con botón de Alternativas con IA) */}
      {!isShoppingMode && (
        <div className="space-y-1 divide-y divide-[#e7dfd5]">
          <p className="text-xs sm:text-sm text-stone-500 font-light pb-2">
            Toca <span className="text-[#a86224] font-semibold">Alternativas</span> junto a cada ingrediente para desplegar 3 opciones saludables bajo demanda.
          </p>
          {ingredientes.map((ing) => (
            <IngredientRow
              key={ing.id}
              ingrediente={ing}
              tituloReceta={tituloReceta}
            />
          ))}
        </div>
      )}

      {/* Vista B: Modo 'Lista de la Compra' (Checklist Táctil Mobile-First) */}
      {isShoppingMode && (
        <div className="space-y-3 animate-in fade-in duration-200">
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
                  {/* Casilla táctil grande */}
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
                      {ing.cantidad} {ing.unidad}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mensaje de completado */}
          {completed === total && total > 0 && (
            <div className="p-4 rounded-2xl bg-[#edf3ee] border border-[#d8e5da] text-center text-xs sm:text-sm font-semibold text-[#2e6b3e] space-y-1">
              <p>🎉 ¡Tienes todos los ingredientes listos!</p>
              <button
                type="button"
                onClick={() => setIsShoppingMode(false)}
                className="text-xs font-bold underline cursor-pointer text-[#2e6b3e] hover:text-[#1d4628]"
              >
                Volver al Modo Cocina para empezar a preparar el plato
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
