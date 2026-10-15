'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  Loader2,
  X,
  Check,
  Beef,
  Leaf,
  ShoppingBag,
  ChefHat,
  HeartPulse,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react';
import { Drawer } from 'vaul';
import { suggestSubstituteAction, SubstituteOption } from '@/app/actions/suggestSubstitute';
import { RecetaIngrediente } from '@/types/recipe';
import { FormattedText } from '@/components/ui/FormattedText';

interface IngredientRowProps {
  ingrediente: RecetaIngrediente;
  tituloReceta: string;
  scaledCantidad?: number;
  scaledGramos?: number;
  onSubstituteChange?: (
    currentTarget: string,
    newName: string | null,
    adaptedBaseName?: string
  ) => void;
}

export function IngredientRow({
  ingrediente,
  tituloReceta,
  scaledCantidad,
  scaledGramos,
  onSubstituteChange,
}: IngredientRowProps) {
  const [options, setOptions] = useState<SubstituteOption[] | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [appliedOption, setAppliedOption] = useState<SubstituteOption | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // El ingrediente activo canónico en el estado actual de la receta adaptada
  const adaptedBaseName = (ingrediente.nombre_limpio || ingrediente.nombre_crudo)
    .replace(/<\/?[^>]+(>|$)/g, '')
    .trim();

  // Resetear estados locales si la receta cambia de adaptación o de ingrediente
  useEffect(() => {
    setAppliedOption(null);
    setOptions(null);
    setSelectedOptionIndex(null);
  }, [ingrediente.id, ingrediente.nombre_limpio]);

  const handleOpenDrawer = () => {
    setIsOpen(true);
    setError(null);

    if (options && options.length > 0) {
      return;
    }

    startTransition(async () => {
      const res = await suggestSubstituteAction({
        nombreIngrediente: adaptedBaseName,
        cantidad: Number(ingrediente.cantidad),
        unidad: ingrediente.unidad,
        tituloReceta,
      });

      if (res.success && res.data && res.data.length > 0) {
        setOptions(res.data);
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

  const handleApply = (opt: SubstituteOption) => {
    const isAlreadyApplied = appliedOption?.nombre_sustituto === opt.nombre_sustituto;

    if (isAlreadyApplied) {
      // Revertir sustitución actual hacia el término adaptado base
      onSubstituteChange?.(opt.nombre_sustituto, null, adaptedBaseName);
      setAppliedOption(null);
    } else {
      // Aplicar nueva sustitución: el target que está actualmente en el texto de preparación
      const currentTarget = appliedOption ? appliedOption.nombre_sustituto : adaptedBaseName;
      onSubstituteChange?.(currentTarget, opt.nombre_sustituto, adaptedBaseName);
      setAppliedOption(opt);
    }

    // Cerrar suavemente el Bottom Sheet
    setIsOpen(false);
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
    : adaptedBaseName;

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
        {/* Nombre y Cantidad ocupando el ancho principal */}
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

        {/* Botón táctil para abrir el Bottom Sheet */}
        <button
          type="button"
          onClick={handleOpenDrawer}
          disabled={isPending}
          aria-label="Ver alternativas de intercambio"
          title="Ver 3 alternativas inteligentes con IA"
          className={`shrink-0 min-h-[38px] px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs ${
            appliedOption
              ? 'bg-amber-50 border-amber-300 text-[#a86224] font-semibold'
              : 'text-stone-700 hover:text-[#a86224] bg-[#f4efe6] hover:bg-[#eae1d2] border-[#e7dfd5]'
          }`}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#a86224]" />
          ) : (
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#a86224]" />
          )}
          <span className="text-xs font-semibold hidden xs:inline">
            {appliedOption ? 'Cambiar' : 'Sustituir'}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* BOTTOM SHEET MÓVIL (DRAWER) CON VAUL                           */}
      {/* ============================================================== */}
      <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 transition-opacity" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] bg-[#fbf9f5] rounded-t-[32px] border-t border-[#e7dfd5] shadow-2xl flex flex-col focus:outline-none max-w-xl mx-auto overflow-hidden">
            {/* Tirador táctil para deslizar / cerrar */}
            <div className="w-12 h-1.5 rounded-full bg-stone-300 mx-auto mt-3 mb-1 shrink-0 cursor-grab active:cursor-grabbing" />

            {/* Cabecera del Bottom Sheet */}
            <div className="px-5 py-3 border-b border-[#e7dfd5] flex items-center justify-between shrink-0 bg-white">
              <div>
                <Drawer.Title className="text-lg sm:text-xl font-bold font-serif-recipe text-stone-900 leading-tight">
                  Alternativas para &quot;{adaptedBaseName}&quot;
                </Drawer.Title>
                <Drawer.Description className="text-xs text-stone-500 mt-0.5">
                  Alternativas culinarias adaptadas al perfil de la receta
                </Drawer.Description>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f4efe6] hover:bg-[#eae1d2] text-stone-600 flex items-center justify-center transition cursor-pointer shrink-0"
                aria-label="Cerrar cajón"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido desplazable del Bottom Sheet */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {isPending && (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224]">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">Consultando alternativas con IA...</p>
                    <p className="text-xs text-stone-500 mt-0.5 max-w-xs mx-auto">
                      Analizando equivalencias de textura, cocción y nutrición para tu plato.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm space-y-2">
                  <p className="font-semibold">{error}</p>
                  <button
                    type="button"
                    onClick={handleOpenDrawer}
                    className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition cursor-pointer"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {!isPending && options && options.length > 0 && (
                <div className="space-y-3.5">
                  <p className="text-xs text-stone-500 font-medium">
                    Toca una alternativa para consultar su ficha técnica y aplicarla a la preparación:
                  </p>

                  {/* Las 3 opciones generadas por la IA */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {options.map((opt, idx) => {
                      const isSelected = selectedOptionIndex === idx;
                      const isOptApplied = appliedOption?.nombre_sustituto === opt.nombre_sustituto;

                      return (
                        <button
                          key={opt.nombre_sustituto}
                          type="button"
                          onClick={() => setSelectedOptionIndex(isSelected ? null : idx)}
                          className={`min-h-[58px] p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 shadow-2xs ${
                            isSelected
                              ? 'border-[#a86224] bg-white ring-2 ring-[#a86224]/20 shadow-xs'
                              : 'border-[#e7dfd5] bg-white hover:bg-[#faf7f2]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 w-full">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#a86224]">
                              {getOptionIcon(opt.tipo)}
                              <span>{opt.etiqueta_tipo}</span>
                            </span>
                            {isOptApplied && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Activo
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-stone-900 text-sm line-clamp-1">
                            {opt.nombre_sustituto}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Ficha técnica expandida al tocar una opción */}
                  {activeOption && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e7dfd5] space-y-3.5 shadow-2xs animate-fade-in">
                      <div className="border-b border-[#f4efe6] pb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#a86224]">
                          Ficha técnica culinaria
                        </span>
                        <h4 className="font-bold text-stone-900 font-serif-recipe text-lg">
                          {activeOption.nombre_sustituto}
                        </h4>
                        <p className="text-xs text-stone-600 font-medium mt-0.5">
                          Ratio recomendado: <span className="font-bold text-stone-900">{activeOption.cantidad_sugerida}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
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
                        <div className="p-3 rounded-xl bg-[#f4efe6] text-stone-700 text-xs leading-relaxed">
                          <strong className="text-[#a86224]">Técnica de cocina:</strong> {activeOption.modo_uso}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer con el botón de acción "Aplicar a la receta" siempre accesible */}
            {activeOption && (
              <div className="p-4 border-t border-[#e7dfd5] bg-white flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-stone-600 truncate flex-1 min-w-0">
                  <span>Selección: </span>
                  <strong className="text-stone-900 block truncate">{activeOption.nombre_sustituto}</strong>
                </div>

                <button
                  type="button"
                  onClick={() => handleApply(activeOption)}
                  className={`min-h-[44px] px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2 shadow-xs active:scale-95 shrink-0 ${
                    isCurrentOptionApplied
                      ? 'bg-stone-200 text-stone-800 hover:bg-stone-300'
                      : 'bg-[#a86224] text-white hover:bg-[#8e511c]'
                  }`}
                >
                  {isCurrentOptionApplied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 stroke-3" />
                      <span>Restaurar original</span>
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>Aplicar a la receta</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
