'use client';

import { useState, useTransition } from 'react';
import { Sparkles, Loader2, X, ArrowRightLeft } from 'lucide-react';
import { suggestSubstituteAction, SubstituteSuggestion } from '@/app/actions/suggestSubstitute';
import { RecetaIngrediente } from '@/types/recipe';

interface IngredientRowProps {
  ingrediente: RecetaIngrediente;
  tituloReceta: string;
}

export function IngredientRow({ ingrediente, tituloReceta }: IngredientRowProps) {
  const [suggestion, setSuggestion] = useState<SubstituteSuggestion | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRequestSubstitute = () => {
    if (suggestion) {
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

      if (res.success && res.data) {
        setSuggestion(res.data);
      } else {
        setError(res.error || 'No se pudo generar la alternativa.');
      }
    });
  };

  const nombreMostrado = isSwapped && suggestion
    ? suggestion.nombre_sustituto
    : ingrediente.nombre_limpio || ingrediente.nombre_crudo;

  const cantidadMostrada = isSwapped && suggestion
    ? suggestion.cantidad_sugerida
    : `${ingrediente.cantidad} ${ingrediente.unidad}`;

  return (
    <div className="py-3.5 border-b border-[#e7dfd5] last:border-b-0 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Nombre y Cantidad en gran tamaño para legibilidad en cocina */}
        <div className="flex items-baseline gap-2.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[#c27835] shrink-0 self-center" />
          <span className="text-base sm:text-lg font-bold text-stone-900 shrink-0 tabular-nums">
            {cantidadMostrada}
          </span>
          <span className={`text-base sm:text-lg text-stone-800 ${isSwapped ? 'text-[#a86224] font-semibold' : ''}`}>
            {nombreMostrado}
          </span>
          {ingrediente.notas && !isSwapped && (
            <span className="text-xs sm:text-sm text-stone-500 italic hidden sm:inline truncate">
              ({ingrediente.notas})
            </span>
          )}
          {isSwapped && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f4efe6] text-[#a86224] font-semibold border border-[#e7dfd5]">
              Sustituido
            </span>
          )}
        </div>

        {/* Touch Target amplio para pulsar con una sola mano en cocina */}
        <button
          type="button"
          onClick={handleRequestSubstitute}
          disabled={isPending}
          title="Consultar alternativa saludable con IA"
          className="shrink-0 min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-stone-700 hover:text-stone-900 bg-[#f4efe6] hover:bg-[#eae1d2] border border-[#e7dfd5] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#a86224]" />
              <span className="text-xs text-[#a86224]">Buscando...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[#a86224]" />
              <span>Alternativa</span>
            </>
          )}
        </button>
      </div>

      {/* Desplegable orgánico de sustitución en tonos lino y crema */}
      {isOpen && (
        <div className="mt-3 p-4 sm:p-5 rounded-2xl border border-[#e7dfd5] bg-[#fbf9f5] shadow-xs space-y-3.5 text-xs sm:text-sm animate-in fade-in duration-200">
          {error && (
            <div className="text-red-700 bg-red-50 p-3 rounded-xl border border-red-200 flex items-center justify-between">
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

          {suggestion && (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-[#e7dfd5] pb-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#a86224] font-bold block">
                    Alternativa Saludable Culinaria
                  </span>
                  <p className="text-base sm:text-lg font-bold font-serif-recipe text-stone-900 mt-0.5">
                    {suggestion.nombre_sustituto}
                  </p>
                  <p className="text-xs sm:text-sm text-stone-700 font-medium mt-0.5">
                    Equivalencia: <span className="font-semibold text-[#a86224]">{suggestion.cantidad_sugerida}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSwapped(!isSwapped)}
                    className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#f4efe6] text-stone-900 border border-[#e7dfd5] shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[#a86224]" />
                    <span>{isSwapped ? 'Restaurar' : 'Aplicar'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="min-h-[44px] min-w-[44px] rounded-xl text-stone-500 hover:text-stone-800 transition flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-stone-700 leading-relaxed text-xs sm:text-sm">
                <div className="space-y-0.5">
                  <span className="font-semibold text-stone-900 block">Comportamiento en Cocina:</span>
                  <p className="text-stone-600">{suggestion.razon_culinaria}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="font-semibold text-stone-900 block">Beneficio Nutricional:</span>
                  <p className="text-stone-600">{suggestion.beneficio_nutricional}</p>
                </div>
              </div>

              {suggestion.modo_uso && (
                <div className="pt-2 text-xs sm:text-sm text-stone-700 border-t border-[#e7dfd5]">
                  <span className="font-semibold text-[#a86224]">Cómo incorporarlo:</span>{' '}
                  <span className="text-stone-600">{suggestion.modo_uso}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
