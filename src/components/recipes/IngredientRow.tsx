'use client';

import { useState, useTransition } from 'react';
import { Sparkles, Loader2, X, Check, ArrowRightLeft } from 'lucide-react';
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
    <div className="py-2.5 border-b border-stone-800/40 last:border-b-0 group transition-colors">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 shrink-0 self-center" />
          <span className="font-semibold text-stone-200 shrink-0 tabular-nums">
            {cantidadMostrada}
          </span>
          <span className={`text-stone-300 transition-colors ${isSwapped ? 'text-amber-300 font-medium' : ''}`}>
            {nombreMostrado}
          </span>
          {ingrediente.notas && !isSwapped && (
            <span className="text-xs text-stone-500 italic hidden sm:inline truncate">
              ({ingrediente.notas})
            </span>
          )}
          {isSwapped && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Sustituido
            </span>
          )}
        </div>

        {/* Botón sutil de sustitución bajo demanda */}
        <button
          type="button"
          onClick={handleRequestSubstitute}
          disabled={isPending}
          title="Pedir alternativa saludable con IA"
          className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-stone-400 hover:text-amber-300 hover:bg-amber-500/5 transition border border-transparent hover:border-amber-500/20 cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
              <span className="text-[11px] text-amber-400">Consultando...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 text-amber-400/80 group-hover:text-amber-300" />
              <span className="text-[11px] hidden sm:inline">Alternativa</span>
            </>
          )}
        </button>
      </div>

      {/* Desplegable in-line con la propuesta de Gemini */}
      {isOpen && (
        <div className="mt-2.5 ml-3.5 p-3.5 rounded-xl border border-amber-500/20 bg-stone-900/40 backdrop-blur-sm space-y-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
          {error && (
            <div className="text-red-400 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-stone-500 hover:text-stone-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {suggestion && (
            <>
              <div className="flex items-start justify-between gap-2 border-b border-stone-800/60 pb-2">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-bold block">
                    Propuesta Saludable (Gemini)
                  </span>
                  <p className="text-sm font-semibold text-stone-100 mt-0.5">
                    {suggestion.nombre_sustituto}
                  </p>
                  <p className="text-[11px] text-amber-300/90 font-mono mt-0.5">
                    Equivalencia: {suggestion.cantidad_sugerida}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsSwapped(!isSwapped)}
                    className="px-2 py-1 rounded-md text-[11px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>{isSwapped ? 'Restaurar original' : 'Aplicar a la vista'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded text-stone-500 hover:text-stone-300 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-400 leading-relaxed text-[11px]">
                <div>
                  <span className="text-stone-300 font-medium block">Perfil Culinario:</span>
                  <p>{suggestion.razon_culinaria}</p>
                </div>
                <div>
                  <span className="text-stone-300 font-medium block">Beneficio Nutricional:</span>
                  <p>{suggestion.beneficio_nutricional}</p>
                </div>
              </div>

              {suggestion.modo_uso && (
                <div className="pt-1 text-[11px] text-stone-400/90 border-t border-stone-800/40">
                  <span className="text-amber-400/90 font-medium">Consejo de uso:</span>{' '}
                  {suggestion.modo_uso}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
