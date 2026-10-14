'use client';

import { useState, useTransition } from 'react';
import {
  Sparkles,
  Loader2,
  X,
  Check,
  Beef,
  Leaf,
  ShoppingBag,
  ChefHat,
  HeartPulse,
  ArrowRightLeft,
} from 'lucide-react';
import { suggestSubstituteAction, SubstituteOption } from '@/app/actions/suggestSubstitute';
import { RecetaIngrediente } from '@/types/recipe';
import { FormattedText } from '@/components/ui/FormattedText';

interface IngredientRowProps {
  ingrediente: RecetaIngrediente;
  tituloReceta: string;
  scaledCantidad?: number;
  scaledGramos?: number;
  onSubstituteChange?: (oldName: string, newName: string | null) => void;
}

export function IngredientRow({
  ingrediente,
  tituloReceta,
  scaledCantidad,
  scaledGramos,
  onSubstituteChange,
}: IngredientRowProps) {
  const [options, setOptions] = useState<SubstituteOption[] | null>(null);
  // Revelación progresiva: inicialmente null para no mostrar la ficha hasta que el usuario toque una pastilla
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
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
    setSelectedOptionIndex(null); // Revelación progresiva: sin ficha abierta al inicio

    startTransition(async () => {
      const cleanIngName = (ingrediente.nombre_limpio || ingrediente.nombre_crudo)
        .replace(/<\/?[^>]+(>|$)/g, '')
        .trim();

      const res = await suggestSubstituteAction({
        nombreIngrediente: cleanIngName,
        cantidad: Number(ingrediente.cantidad),
        unidad: ingrediente.unidad,
        tituloReceta,
      });

      if (res.success && res.data && res.data.length > 0) {
        setOptions(res.data);
        // Dejar selectedOptionIndex en null para mostrar SOLO las 3 pastillas inicialmente
        setSelectedOptionIndex(null);
      } else {
        setError(res.error || 'No se pudieron generar alternativas para este ingrediente.');
      }
    });
  };

  const activeOption =
    options && selectedOptionIndex !== null && selectedOptionIndex >= 0
      ? options[selectedOptionIndex]
      : null;

  const isCurrentOptionApplied =
    appliedOption !== null &&
    activeOption !== null &&
    appliedOption.nombre_sustituto === activeOption.nombre_sustituto;

  const handleApplyToggle = (opt: SubstituteOption) => {
    const originalName = (ingrediente.nombre_limpio || ingrediente.nombre_crudo)
      .replace(/<\/?[^>]+(>|$)/g, '')
      .trim();

    if (appliedOption?.nombre_sustituto === opt.nombre_sustituto) {
      setAppliedOption(null);
      onSubstituteChange?.(originalName, null);
    } else {
      setAppliedOption(opt);
      onSubstituteChange?.(originalName, opt.nombre_sustituto);
    }
  };

  const baseCantidadNum = scaledCantidad !== undefined ? scaledCantidad : Number(ingrediente.cantidad);
  const unidadAjustada =
    ingrediente.unidad === 'unidad' || ingrediente.unidad === 'unidades'
      ? Number(baseCantidadNum) > 1
        ? 'unidades'
        : 'unidad'
      : ingrediente.unidad;

  const nombreMostrado = appliedOption
    ? appliedOption.nombre_sustituto
    : ingrediente.nombre_limpio || ingrediente.nombre_crudo;

  const cantidadMostrada = appliedOption
    ? appliedOption.cantidad_sugerida
    : `${baseCantidadNum} ${unidadAjustada}`;

  const getOptionIcon = (tipo: string) => {
    if (tipo === 'magra_tradicional') return <Beef className="w-3.5 h-3.5 shrink-0" />;
    if (tipo === 'vegetal_umami') return <Leaf className="w-3.5 h-3.5 shrink-0" />;
    if (tipo === 'accesible_economica') return <ShoppingBag className="w-3.5 h-3.5 shrink-0" />;
    return <Sparkles className="w-3.5 h-3.5 shrink-0" />;
  };

  return (
    <div className="py-3 border-b border-[#e7dfd5] last:border-b-0 transition-colors">
      <div className="flex items-center justify-between gap-3">
        {/* Nombre y Cantidad ocupando ~90% del ancho disponible */}
        <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap sm:flex-nowrap">
          <span className="w-2 h-2 rounded-full bg-[#c27835] shrink-0 self-center" />
          <span className="text-base sm:text-lg font-bold text-stone-900 shrink-0 tabular-nums">
            {cantidadMostrada}
          </span>
          <span
            className={`text-base sm:text-lg text-stone-800 break-words ${
              appliedOption ? 'text-[#a86224] font-semibold' : ''
            }`}
          >
            <FormattedText text={nombreMostrado} />
          </span>
          {ingrediente.notas && !appliedOption && (
            <span className="text-xs sm:text-sm text-stone-500 italic hidden sm:inline truncate">
              (<FormattedText text={ingrediente.notas} />)
            </span>
          )}
          {appliedOption && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f4efe6] text-[#a86224] font-semibold border border-[#e7dfd5] shrink-0">
              Sustituido por {appliedOption.etiqueta_tipo}
            </span>
          )}
        </div>

        {/* Icon-button minimalista universal de intercambio (swap) */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          aria-label="Ver alternativas de intercambio"
          title="Ver 3 alternativas inteligentes con IA"
          className="shrink-0 w-9 h-9 rounded-xl text-stone-700 hover:text-[#a86224] bg-[#f4efe6] hover:bg-[#eae1d2] border border-[#e7dfd5] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#a86224]" />
          ) : (
            <ArrowRightLeft className="w-4 h-4 text-[#a86224]" />
          )}
        </button>
      </div>

      {/* Desplegable interactivo con revelación progresiva */}
      {isOpen && (
        <div className="mt-3.5 p-4 sm:p-5 rounded-3xl border border-[#e7dfd5] bg-[#fbf9f5] shadow-xs space-y-4 text-xs sm:text-sm animate-fade-in">
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
                    {selectedOptionIndex === null
                      ? 'Selecciona una pastilla para ver su ficha culinaria y beneficio:'
                      : 'Ficha técnica activa. Toca otra opción o aplica el cambio:'}
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

              {/* REVELACIÓN PROGRESIVA: Mostrar ÚNICAMENTE las 3 pastillas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {options.map((opt, idx) => {
                  const isSelected = selectedOptionIndex === idx;
                  const isOptApplied = appliedOption?.nombre_sustituto === opt.nombre_sustituto;

                  return (
                    <button
                      key={opt.nombre_sustituto}
                      type="button"
                      onClick={() => {
                        // Al tocar la pastilla, conmuta o revela su ficha
                        setSelectedOptionIndex(isSelected ? null : idx);
                      }}
                      className={`min-h-[50px] p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 shadow-2xs ${
                        isSelected
                          ? 'border-[#a86224] bg-white ring-2 ring-[#a86224]/20 shadow-xs'
                          : 'border-[#e7dfd5] bg-white hover:bg-[#faf7f2] hover:border-stone-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#a86224]">
                          {getOptionIcon(opt.tipo)}
                          <span>{opt.etiqueta_tipo}</span>
                        </span>
                        {isOptApplied && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Aplicado
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-stone-900 text-xs sm:text-sm line-clamp-1">
                        {opt.nombre_sustituto}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* FICHA TÉCNICA: Solo se renderiza cuando el usuario toca una de las 3 opciones */}
              {activeOption && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e7dfd5] space-y-3.5 shadow-2xs animate-fade-in">
                  <div className="flex items-center justify-between border-b border-[#f4efe6] pb-2">
                    <div>
                      <h4 className="font-bold text-stone-900 font-serif-recipe text-base">
                        {activeOption.nombre_sustituto}
                      </h4>
                      <p className="text-xs text-stone-500 font-medium">
                        Cantidad recomendada: {activeOption.cantidad_sugerida}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyToggle(activeOption)}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-xl font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                        isCurrentOptionApplied
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-[#a86224] text-white hover:bg-[#8e511c]'
                      }`}
                    >
                      {isCurrentOptionApplied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Restaurar original</span>
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Aplicar a la receta</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] space-y-1">
                      <span className="font-semibold text-stone-800 flex items-center gap-1.5 text-[#a86224]">
                        <ChefHat className="w-3.5 h-3.5" /> Comportamiento culinario
                      </span>
                      <p className="text-stone-600 leading-relaxed font-light">
                        {activeOption.razon_culinaria}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] space-y-1">
                      <span className="font-semibold text-stone-800 flex items-center gap-1.5 text-[#a86224]">
                        <HeartPulse className="w-3.5 h-3.5" /> Beneficio nutricional
                      </span>
                      <p className="text-stone-600 leading-relaxed font-light">
                        {activeOption.beneficio_nutricional}
                      </p>
                    </div>
                  </div>

                  {activeOption.modo_uso && (
                    <div className="p-2.5 rounded-xl bg-[#f4efe6] text-stone-700 text-[11px] leading-relaxed">
                      <strong>Técnica de cocina:</strong> {activeOption.modo_uso}
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
