'use client';

import { useState, useTransition } from 'react';
import {
  Sparkles,
  Loader2,
  X,
  ArrowRightLeft,
  Check,
  Beef,
  Leaf,
  ShoppingBag,
  ChefHat,
  HeartPulse,
} from 'lucide-react';
import { suggestSubstituteAction, SubstituteOption } from '@/app/actions/suggestSubstitute';
import { RecetaIngrediente } from '@/types/recipe';

interface IngredientRowProps {
  ingrediente: RecetaIngrediente;
  tituloReceta: string;
}

export function IngredientRow({ ingrediente, tituloReceta }: IngredientRowProps) {
  const [options, setOptions] = useState<SubstituteOption[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [appliedOption, setAppliedOption] = useState<SubstituteOption | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    if (options) {
      setIsOpen(!isOpen);
      return;
    }

    setIsOpen(true);
    setError(null);

    startTransition(async () => {
      const res = await suggestSubstituteAction({
        nombreIngrediente: ingrediente.nombre_limpio || ingrediente.nombre_crudo,
        cantidad: Number(ingrediente.cantidad),
        unidad: ingrediente.unidad,
        tituloReceta,
      });

      if (res.success && res.data && res.data.length > 0) {
        setOptions(res.data);
        setSelectedIndex(0);
      } else {
        setError(res.error || 'No se pudieron generar alternativas para este ingrediente.');
      }
    });
  };

  const activeOption = options ? options[selectedIndex] : null;

  const isCurrentOptionApplied =
    appliedOption !== null &&
    activeOption !== null &&
    appliedOption.nombre_sustituto === activeOption.nombre_sustituto;

  const handleApplyToggle = (opt: SubstituteOption) => {
    if (appliedOption?.nombre_sustituto === opt.nombre_sustituto) {
      setAppliedOption(null);
    } else {
      setAppliedOption(opt);
    }
  };

  const nombreMostrado = appliedOption
    ? appliedOption.nombre_sustituto
    : ingrediente.nombre_limpio || ingrediente.nombre_crudo;

  const cantidadMostrada = appliedOption
    ? appliedOption.cantidad_sugerida
    : `${ingrediente.cantidad} ${ingrediente.unidad}`;

  const getOptionIcon = (tipo: string, index: number) => {
    if (tipo === 'magra_tradicional') return <Beef className="w-3.5 h-3.5 shrink-0" />;
    if (tipo === 'vegetal_umami') return <Leaf className="w-3.5 h-3.5 shrink-0" />;
    if (tipo === 'accesible_economica') return <ShoppingBag className="w-3.5 h-3.5 shrink-0" />;
    return <Sparkles className="w-3.5 h-3.5 shrink-0" />;
  };

  return (
    <div className="py-3.5 border-b border-[#e7dfd5] last:border-b-0 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Nombre y Cantidad en gran tamaño para legibilidad en cocina */}
        <div className="flex items-baseline gap-2.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[#c27835] shrink-0 self-center" />
          <span className="text-base sm:text-lg font-bold text-stone-900 shrink-0 tabular-nums">
            {cantidadMostrada}
          </span>
          <span
            className={`text-base sm:text-lg text-stone-800 ${
              appliedOption ? 'text-[#a86224] font-semibold' : ''
            }`}
          >
            {nombreMostrado}
          </span>
          {ingrediente.notas && !appliedOption && (
            <span className="text-xs sm:text-sm text-stone-500 italic hidden sm:inline truncate">
              ({ingrediente.notas})
            </span>
          )}
          {appliedOption && (
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#f4efe6] text-[#a86224] font-semibold border border-[#e7dfd5] shrink-0">
              Sustituido por {appliedOption.etiqueta_tipo}
            </span>
          )}
        </div>

        {/* Touch Target amplio para pulsar con una sola mano en cocina */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          title="Ver 3 alternativas inteligentes con IA"
          className="shrink-0 min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-stone-700 hover:text-stone-900 bg-[#f4efe6] hover:bg-[#eae1d2] border border-[#e7dfd5] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#a86224]" />
              <span className="text-xs text-[#a86224]">Consultando...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[#a86224]" />
              <span>Alternativas (3)</span>
            </>
          )}
        </button>
      </div>

      {/* Desplegable interactivo de 3 sustituciones */}
      {isOpen && (
        <div className="mt-3.5 p-4 sm:p-5 rounded-3xl border border-[#e7dfd5] bg-[#fbf9f5] shadow-xs space-y-4 text-xs sm:text-sm animate-in fade-in duration-200">
          {error && (
            <div className="text-red-700 bg-red-50 p-3.5 rounded-2xl border border-red-200 flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-stone-500 hover:text-stone-700 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {options && options.length > 0 && (
            <>
              {/* Cabecera del panel de alternativas */}
              <div className="flex items-center justify-between border-b border-[#e7dfd5] pb-2.5">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#a86224] font-bold block">
                    Alternativas para &quot;{ingrediente.nombre_limpio || ingrediente.nombre_crudo}&quot;
                  </span>
                  <span className="text-xs text-stone-500">
                    Elige una opción para desplegar su ficha culinaria y beneficio nutricional
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="min-h-[40px] min-w-[40px] rounded-xl text-stone-500 hover:text-stone-800 transition flex items-center justify-center cursor-pointer"
                  title="Cerrar alternativas"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Selector horizontal táctil de las 3 opciones de un vistazo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {options.map((opt, idx) => {
                  const isSelected = selectedIndex === idx;
                  const isOptApplied = appliedOption?.nombre_sustituto === opt.nombre_sustituto;

                  return (
                    <button
                      key={opt.tipo || idx}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={`min-h-[52px] p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-white border-[#c27835] ring-2 ring-[#c27835]/15 shadow-xs'
                          : 'bg-[#f4efe6]/60 hover:bg-[#f4efe6] border-[#e7dfd5] text-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                            isSelected ? 'text-[#a86224]' : 'text-stone-500'
                          }`}
                        >
                          {getOptionIcon(opt.tipo, idx)}
                          <span className="truncate">{opt.etiqueta_tipo}</span>
                        </span>
                        {isOptApplied && (
                          <span className="w-4 h-4 rounded-full bg-[#a86224] text-white flex items-center justify-center text-[10px] shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-3" />
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-stone-900 mt-1 truncate block">
                        {opt.nombre_sustituto}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Ficha técnica desplegada de la opción seleccionada */}
              {activeOption && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e7dfd5] space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#f4efe6] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
                          {activeOption.etiqueta_tipo}
                        </span>
                      </div>
                      <h4 className="text-lg sm:text-xl font-bold font-serif-recipe text-stone-900 mt-1">
                        {activeOption.nombre_sustituto}
                      </h4>
                      <p className="text-xs sm:text-sm text-stone-600 font-medium mt-0.5">
                        Equivalencia / Ratio:{' '}
                        <span className="font-semibold text-[#a86224]">
                          {activeOption.cantidad_sugerida}
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyToggle(activeOption)}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs shrink-0 self-start ${
                        isCurrentOptionApplied
                          ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300'
                          : 'bg-[#a86224] hover:bg-[#8e511c] text-white active:scale-95'
                      }`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>{isCurrentOptionApplied ? 'Restaurar original' : 'Aplicar a la receta'}</span>
                    </button>
                  </div>

                  {/* Ficha de Comportamiento Culinario y Beneficio Nutricional */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 leading-relaxed text-xs sm:text-sm">
                    <div className="p-3.5 rounded-xl bg-[#faf7f2] border border-[#f0eae1] space-y-1">
                      <span className="font-bold text-stone-900 flex items-center gap-1.5 text-xs text-[#a86224]">
                        <ChefHat className="w-3.5 h-3.5" />
                        Comportamiento en Cocina:
                      </span>
                      <p className="text-stone-700 font-light">{activeOption.razon_culinaria}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#faf7f2] border border-[#f0eae1] space-y-1">
                      <span className="font-bold text-stone-900 flex items-center gap-1.5 text-xs text-[#2e6b3e]">
                        <HeartPulse className="w-3.5 h-3.5" />
                        Beneficio Nutricional:
                      </span>
                      <p className="text-stone-700 font-light">{activeOption.beneficio_nutricional}</p>
                    </div>
                  </div>

                  {/* Modo de uso */}
                  {activeOption.modo_uso && (
                    <div className="pt-2 text-xs sm:text-sm text-stone-700 border-t border-[#f4efe6]">
                      <span className="font-semibold text-[#a86224]">Cómo incorporarlo en este plato:</span>{' '}
                      <span className="text-stone-600 font-light">{activeOption.modo_uso}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
