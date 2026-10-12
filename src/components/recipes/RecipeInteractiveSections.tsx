'use client';

import { useState } from 'react';
import {
  Layers,
  Sparkles,
  ChevronDown,
  Clock,
  Thermometer,
} from 'lucide-react';
import { RecetaIngrediente, Paso } from '@/types/recipe';
import { scaleIngredientsWithCulinaryHeuristics, scaleCookingTime } from '@/lib/culinary/scaler';
import { ServingsScaler } from './ServingsScaler';
import { ShoppingListMode } from './ShoppingListMode';

interface RecipeInteractiveSectionsProps {
  recetaId: string;
  tituloReceta: string;
  basePorciones: number;
  tiempoCoccionMin: number | null;
  ingredientes: RecetaIngrediente[];
  pasos: Paso[];
  defaultServings?: number;
}

export function RecipeInteractiveSections({
  recetaId,
  tituloReceta,
  basePorciones,
  tiempoCoccionMin,
  ingredientes,
  pasos,
  defaultServings,
}: RecipeInteractiveSectionsProps) {
  const [servings, setServings] = useState(defaultServings || basePorciones || 2);
  const [isIngredientsOpen, setIsIngredientsOpen] = useState(false);
  const [isStepsOpen, setIsStepsOpen] = useState(false);

  // Escalado inteligente con conciencia culinaria
  const scaledIngredientes = scaleIngredientsWithCulinaryHeuristics(
    ingredientes,
    basePorciones || 2,
    servings
  );

  const ratio = servings / (basePorciones || 2);
  const scaledTiempoCoccion = tiempoCoccionMin
    ? scaleCookingTime(tiempoCoccionMin, ratio)
    : null;

  return (
    <div className="space-y-8 pt-2">
      {/* ============================================================== */}
      {/* ACORDEÓN 1: INGREDIENTES CON ESCALADO CULINARIO Y MODO COMPRA  */}
      {/* ============================================================== */}
      <section className="rounded-3xl bg-white border border-[#e7dfd5] shadow-xs overflow-hidden transition-all">
        {/* Cabecera táctil colapsable */}
        <button
          type="button"
          onClick={() => setIsIngredientsOpen(!isIngredientsOpen)}
          aria-expanded={isIngredientsOpen}
          className="w-full min-h-[58px] p-5 sm:p-6 flex items-center justify-between gap-4 text-left hover:bg-[#faf7f2] transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900 leading-none">
                Ingredientes
              </h2>
              <span className="text-xs text-stone-500 font-medium mt-1 block">
                {servings} {servings === 1 ? 'comensal' : 'comensales'} · {ingredientes.length} items
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
              {isIngredientsOpen ? 'Plegar' : 'Desplegar'}
            </span>
            <div
              className={`w-8 h-8 rounded-full bg-[#f4efe6] text-stone-600 flex items-center justify-center transition-transform duration-200 ${
                isIngredientsOpen ? 'rotate-180 text-[#a86224]' : ''
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Cuerpo desplegable */}
        {isIngredientsOpen && (
          <div className="p-5 sm:p-6 pt-0 border-t border-[#f4efe6] space-y-5 animate-fade-in">
            {/* Control de Comensales con Escalado Inteligente */}
            <div className="pt-4">
              <ServingsScaler
                baseServings={basePorciones || 2}
                currentServings={servings}
                onServingsChange={setServings}
              />
            </div>

            {/* Listado de Ingredientes / Modo Lista de Compra */}
            <ShoppingListMode
              recetaId={recetaId}
              tituloReceta={tituloReceta}
              ingredientes={scaledIngredientes}
            />
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* ACORDEÓN 2: PREPARACIÓN Y PASOS EN MODO COCINA                */}
      {/* ============================================================== */}
      <section className="rounded-3xl bg-white border border-[#e7dfd5] shadow-xs overflow-hidden transition-all">
        {/* Cabecera táctil colapsable */}
        <button
          type="button"
          onClick={() => setIsStepsOpen(!isStepsOpen)}
          aria-expanded={isStepsOpen}
          className="w-full min-h-[58px] p-5 sm:p-6 flex items-center justify-between gap-4 text-left hover:bg-[#faf7f2] transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900 leading-none">
                Preparación
              </h2>
              <span className="text-xs text-stone-500 font-medium mt-1 block">
                {pasos.length} pasos
                {scaledTiempoCoccion ? ` · ~${scaledTiempoCoccion} min cocción` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
              {isStepsOpen ? 'Plegar' : 'Desplegar'}
            </span>
            <div
              className={`w-8 h-8 rounded-full bg-[#f4efe6] text-stone-600 flex items-center justify-center transition-transform duration-200 ${
                isStepsOpen ? 'rotate-180 text-[#a86224]' : ''
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Cuerpo desplegable */}
        {isStepsOpen && (
          <div className="p-5 sm:p-6 pt-4 border-t border-[#f4efe6] animate-fade-in">
            <ol className="space-y-7">
              {pasos.map((paso) => (
                <li key={paso.id} className="flex gap-4 sm:gap-5 group">
                  <span className="w-10 h-10 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] font-serif-recipe font-bold text-base flex items-center justify-center shrink-0 self-start mt-0.5 shadow-2xs">
                    {paso.orden}
                  </span>

                  <div className="space-y-2.5 flex-1">
                    <p className="text-base sm:text-lg text-stone-800 leading-relaxed font-light">
                      {paso.instruccion}
                    </p>

                    {(paso.tiempo_estimado_min || paso.temperatura_celsius || paso.consejo_pro) && (
                      <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-stone-600">
                        {paso.tiempo_estimado_min && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-700 font-medium">
                            <Clock className="w-3.5 h-3.5 text-[#a86224]" />
                            {paso.tiempo_estimado_min} min
                          </span>
                        )}

                        {paso.temperatura_celsius && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] text-stone-700 font-medium">
                            <Thermometer className="w-3.5 h-3.5 text-[#c27835]" />
                            {paso.temperatura_celsius}°C
                          </span>
                        )}

                        {paso.consejo_pro && (
                          <div className="w-full mt-2 p-3.5 rounded-2xl border border-[#e7dfd5] bg-[#faf7f2] text-stone-700 text-xs sm:text-sm font-light">
                            <span className="font-semibold text-[#a86224]">Consejo del Chef:</span>{' '}
                            {paso.consejo_pro}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}
