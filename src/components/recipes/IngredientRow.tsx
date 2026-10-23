'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import {
  Loader2,
  X,
  Check,
  Leaf,
  Drumstick,
  Milk,
  Wheat,
  Package,
  ChefHat,
  HeartPulse,
  ArrowRightLeft,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { Drawer } from 'vaul';
import { suggestSubstituteAction, SubstituteOption } from '@/app/actions/suggestSubstitute';
import { RecetaIngrediente } from '@/types/recipe';
import { FormattedText } from '@/components/ui/FormattedText';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { formatCulinaryAmount, pluralizeCulinaryNoun, cleanIngredientName } from '@/lib/nutrition/formatQuantity';
import { ProSubscriptionModal } from '@/components/subscription/ProSubscriptionModal';
import { useProfileStore } from '@/stores/useProfileStore';

interface IngredientRowProps {
  ingrediente: RecetaIngrediente;
  tituloReceta: string;
  scaledCantidad?: number;
  scaledGramos?: number;
  userProfile?: {
    plan_suscripcion?: string | null;
    [key: string]: any;
  } | null;
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
  userProfile,
  onSubstituteChange,
}: IngredientRowProps) {
  const [options, setOptions] = useState<SubstituteOption[] | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [appliedOption, setAppliedOption] = useState<SubstituteOption | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const technicalCardRef = useRef<HTMLDivElement>(null);
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const profileFromStore = useProfileStore((s) => s.profile);
  const activeProfile = userProfile || profileFromStore;
  const isPro = (activeProfile?.plan_suscripcion || '').trim().toLowerCase() === 'pro';

  const getCategoryIcon = (categoria?: string) => {
    switch (categoria?.toLowerCase()) {
      case 'vegetal':
        return <Leaf className="w-3.5 h-3.5 shrink-0" />;
      case 'proteina':
        return <Drumstick className="w-3.5 h-3.5 shrink-0" />;
      case 'lacteo':
        return <Milk className="w-3.5 h-3.5 shrink-0" />;
      case 'cereal':
        return <Wheat className="w-3.5 h-3.5 shrink-0" />;
      case 'despensa':
        return <Package className="w-3.5 h-3.5 shrink-0" />;
      case 'general':
      default:
        return <Sparkles className="w-3.5 h-3.5 shrink-0" />;
    }
  };

  // El ingrediente activo canónico en el estado actual de la receta adaptada
  const rawBaseName = cleanIngredientName(ingrediente?.nombre_limpio || ingrediente?.nombre_crudo || 'Ingrediente');
  const adaptedBaseName = String(rawBaseName)
    .replace(/<\/?[^>]+(>|$)/g, '')
    .trim() || 'Ingrediente';

  // Resetear estados locales si la receta cambia de adaptación o de ingrediente
  useEffect(() => {
    setAppliedOption(null);
    setOptions(null);
    setSelectedOptionIndex(null);
  }, [ingrediente?.id, ingrediente?.nombre_limpio]);

  // Auto-scroll interno en el Drawer cuando se expande una ficha técnica
  useEffect(() => {
    if (selectedOptionIndex !== null) {
      const timer = setTimeout(() => {
        technicalCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedOptionIndex]);

  const handleOpenDrawer = () => {
    if (!isPro) {
      setShowProModal(true);
      return;
    }

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
        idioma: language,
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

  const baseCantidadNum = scaledCantidad !== undefined ? scaledCantidad : Number(ingrediente?.cantidad) || 1;

  const rawNombreMostrado = appliedOption
    ? appliedOption.nombre_sustituto
    : adaptedBaseName;
  const nombreMostrado = cleanIngredientName(rawNombreMostrado);

  const cantidadMostrada = appliedOption
    ? appliedOption.cantidad_sugerida
    : formatCulinaryAmount(baseCantidadNum, ingrediente?.unidad, language, nombreMostrado);

  // Naturalización armónica y pluralización culinaria del nombre:
  // - "3 dientes" + "Ajo" -> "3 dientes de ajo" (o "3 cloves of garlic")
  // - "Media" + "Cebolla" -> "Media cebolla"
  // - "2" + "Cebolla" -> "2 cebollas" (en lugar de "2 Cebolla")
  // - "3" + "Limón" -> "3 limones" (en lugar de "3 Limón")
  let cleanNombreDisplay = nombreMostrado;
  const isGarlicRow =
    /dientes?|cloves?/i.test(cantidadMostrada) &&
    /^\s*ajos?\s*$/i.test(nombreMostrado);

  const uLower = (ingrediente?.unidad || '').toLowerCase().trim();
  const isCountableUnit =
    uLower === 'unidad' ||
    uLower === 'unidades' ||
    uLower === 'unit' ||
    uLower === 'units' ||
    uLower === 'pieza' ||
    uLower === 'piezas' ||
    uLower === 'piece' ||
    uLower === 'pieces';

  if (isGarlicRow) {
    cleanNombreDisplay = language === 'en' ? 'of garlic' : 'de ajo';
  } else if (/^(media|medio|half)$/i.test(cantidadMostrada)) {
    cleanNombreDisplay =
      cleanNombreDisplay.charAt(0).toLowerCase() + cleanNombreDisplay.slice(1);
  } else if (isCountableUnit && baseCantidadNum > 1 && !appliedOption) {
    cleanNombreDisplay = pluralizeCulinaryNoun(cleanNombreDisplay, language);
  }

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
            <FormattedText text={cleanNombreDisplay} />
          </span>
          {ingrediente.notas && !appliedOption && (
            <span className="text-xs sm:text-sm text-stone-500 italic hidden sm:inline truncate">
              (<FormattedText text={ingrediente.notas} />)
            </span>
          )}
          {appliedOption && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f4efe6] text-[#a86224] font-semibold border border-[#e7dfd5] shrink-0">
              {t('drawer_substituted_by')}{' '}
              {appliedOption.etiqueta_dinamica || appliedOption.etiqueta_tipo || 'Alternativa'}
            </span>
          )}
        </div>

        {/* Botón táctil para abrir el Bottom Sheet */}
        <button
          type="button"
          onClick={handleOpenDrawer}
          disabled={isPending}
          aria-label={isPro ? "Ver alternativas de intercambio" : "Desbloquear sustituciones con Miga PRO"}
          title={isPro ? "Ver 3 alternativas inteligentes con IA" : "Disponible con Miga PRO"}
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
            {appliedOption ? t('drawer_btn_change') : t('drawer_btn_substitute')}
          </span>
          {!isPro && (
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-200/90 text-[#874b18] border border-amber-300/60 leading-none">
              PRO
            </span>
          )}
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
                  {t('drawer_alternatives_for')} &quot;{adaptedBaseName}&quot;
                </Drawer.Title>
                <Drawer.Description className="text-xs text-stone-500 mt-0.5">
                  {t('drawer_alternatives_subtitle')}
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
                    <p className="text-sm font-bold text-stone-900">{t('drawer_loading_title')}</p>
                    <p className="text-xs text-stone-500 mt-0.5 max-w-xs mx-auto">
                      {t('drawer_loading_desc')}
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
                    {t('drawer_retry')}
                  </button>
                </div>
              )}

              {!isPending && options && options.length > 0 && (
                <div className="space-y-3.5 w-full">
                  <p className="text-xs text-stone-500 font-medium">
                    {t('drawer_instructions')}
                  </p>

                  {/* Lista vertical apilada y ergonómica (100% ancho) */}
                  <div className="flex flex-col gap-2.5 w-full">
                    {options.map((opt, idx) => {
                      const isSelected = selectedOptionIndex === idx;
                      const isOptApplied = appliedOption?.nombre_sustituto === opt.nombre_sustituto;

                      return (
                        <div
                          key={opt.nombre_sustituto}
                          ref={isSelected ? technicalCardRef : undefined}
                          className={`w-full rounded-2xl border transition-all duration-200 overflow-hidden ${
                            isSelected
                              ? 'border-[#a86224] bg-white ring-2 ring-[#a86224]/20 shadow-sm'
                              : 'border-[#e7dfd5] bg-white hover:bg-[#faf7f2]/80 shadow-2xs'
                          }`}
                        >
                          {/* Cabecera interactiva / Botón de acordeón */}
                          <button
                            type="button"
                            onClick={() => setSelectedOptionIndex(isSelected ? null : idx)}
                            className="w-full p-3.5 sm:p-4 text-left cursor-pointer flex items-center justify-between gap-3 transition-colors"
                          >
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold text-stone-500">
                                  {getCategoryIcon(opt.categoria_icono || opt.tipo)}
                                  <span>{opt.etiqueta_dinamica || opt.etiqueta_tipo || 'Alternativa'}</span>
                                </span>
                                {isOptApplied && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold inline-flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> {t('drawer_active_badge')}
                                  </span>
                                )}
                              </div>

                              <h4 className="text-sm sm:text-base font-semibold text-stone-900 leading-snug break-words">
                                {opt.nombre_sustituto}
                              </h4>

                              <p className="text-xs text-stone-600 font-medium">
                                <span className="text-stone-500">{t('drawer_ratio_recommended')}:</span>{' '}
                                <span className="font-bold text-stone-900">{opt.cantidad_sugerida}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 text-stone-400">
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isSelected ? 'rotate-180 text-[#a86224]' : ''
                                }`}
                              />
                            </div>
                          </button>

                          {/* Ficha técnica y acción inline desplegable */}
                          {isSelected && (
                            <div className="px-3.5 sm:px-4 pb-4 pt-1 border-t border-[#f4efe6] space-y-3 bg-[#faf7f2]/40 animate-fade-in">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                                <div className="p-3 rounded-xl bg-white border border-[#e7dfd5] space-y-1">
                                  <span className="font-semibold text-stone-800 flex items-center gap-1.5 text-[#a86224]">
                                    <ChefHat className="w-3.5 h-3.5" /> {t('drawer_spec_behavior')}
                                  </span>
                                  <p className="text-stone-600 leading-relaxed font-light">
                                    {opt.razon_culinaria}
                                  </p>
                                </div>

                                <div className="p-3 rounded-xl bg-white border border-[#e7dfd5] space-y-1">
                                  <span className="font-semibold text-stone-800 flex items-center gap-1.5 text-[#a86224]">
                                    <HeartPulse className="w-3.5 h-3.5" /> {t('drawer_spec_benefit')}
                                  </span>
                                  <p className="text-stone-600 leading-relaxed font-light">
                                    {opt.beneficio_nutricional}
                                  </p>
                                </div>
                              </div>

                              {opt.modo_uso && (
                                <div className="p-3 rounded-xl bg-[#f4efe6] text-stone-700 text-xs leading-relaxed">
                                  <strong className="text-[#a86224]">{t('drawer_spec_technique')}:</strong> {opt.modo_uso}
                                </div>
                              )}

                              {/* Botón de acción Aplicar / Restablecer inline */}
                              <div className="pt-1 flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleApply(opt)}
                                  className={`w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-95 ${
                                    isOptApplied
                                      ? 'bg-stone-200 text-stone-800 hover:bg-stone-300'
                                      : 'bg-[#a86224] text-white hover:bg-[#8e511c]'
                                  }`}
                                >
                                  {isOptApplied ? (
                                    <>
                                      <Check className="w-4 h-4 text-emerald-600 stroke-3" />
                                      <span>{t('drawer_restore_btn')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <ArrowRightLeft className="w-4 h-4" />
                                      <span>{t('drawer_apply_btn')}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Modal de suscripción PRO al hacer clic en sustitución individual siendo Free */}
      {showProModal && (
        <ProSubscriptionModal
          isOpen={showProModal}
          onClose={() => setShowProModal(false)}
          title="Sustituciones Inteligentes PRO"
          description="Desbloquea Miga PRO para sustituir ingredientes con alternativas clínicas adaptadas a tu perfil de salud"
        />
      )}
    </div>
  );
}
