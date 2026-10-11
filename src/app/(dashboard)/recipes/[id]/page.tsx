import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  ArrowLeft,
  Clock,
  Users,
  Flame,
  ExternalLink,
  ChefHat,
  Sparkles,
  Layers,
  Thermometer,
} from 'lucide-react';
import { IngredientRow } from '@/components/recipes/IngredientRow';
import { CookingDiarySection } from '@/components/recipes/CookingDiarySection';
import { Receta, RecetaIngrediente, Paso, DiarioCocinados } from '@/types/recipe';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipeDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/recipes/${id}`);
  }

  // 1. Consultar receta principal
  const { data: recetaData, error: errReceta } = await supabase
    .from('recetas')
    .select('*')
    .eq('id', id)
    .single();

  if (errReceta || !recetaData) {
    notFound();
  }

  const receta = recetaData as Receta;

  // 2. Consultar ingredientes asociados ordenados
  const { data: ingredientesData } = await supabase
    .from('receta_ingredientes')
    .select('*')
    .eq('receta_id', id)
    .order('orden', { ascending: true });

  const ingredientes = (ingredientesData as RecetaIngrediente[]) || [];

  // 3. Consultar pasos asociados ordenados
  const { data: pasosData } = await supabase
    .from('pasos')
    .select('*')
    .eq('receta_id', id)
    .order('orden', { ascending: true });

  const pasos = (pasosData as Paso[]) || [];

  // 4. Consultar entradas del diario culinario para esta receta
  const { data: diarioData } = await supabase
    .from('diario_cocinados')
    .select('*')
    .eq('receta_id', id)
    .order('fecha_cocinado', { ascending: false });

  const diarioEntries = (diarioData as DiarioCocinados[]) || [];

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      {/* Barra de navegación superior luminosa */}
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/recipes"
            className="min-h-[44px] px-3 -ml-3 rounded-xl inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-[#a86224]" />
            <span>Volver a recetas</span>
          </Link>

          <div className="flex items-center gap-3">
            {receta.fuente_url && (
              <a
                href={receta.fuente_url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3 rounded-xl inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
              >
                <span>Fuente ({receta.fuente_tipo})</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#a86224]" />
              </a>
            )}
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5] capitalize">
              {receta.dificultad}
            </span>
          </div>
        </div>
      </header>

      {/* Contenido Editorial con Modo Cocina (alta legibilidad y espacios generosos) */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
        {/* Cabecera Editorial Limpia */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#a86224]">
            <ChefHat className="w-4 h-4" />
            <span>Ficha Culinaria Estandarizada</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold font-serif-recipe tracking-tight text-stone-900 leading-tight">
            {receta.titulo}
          </h1>

          {receta.descripcion && (
            <p className="text-base sm:text-lg text-stone-700 font-light leading-relaxed max-w-2xl">
              {receta.descripcion}
            </p>
          )}

          {/* Tiempos y Rendimiento en Modo Cocina */}
          <div className="pt-5 flex flex-wrap items-center gap-6 sm:gap-10 text-xs sm:text-sm text-stone-600 border-t border-[#e7dfd5]">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-[#a86224]" />
              <div>
                <span className="text-[10px] uppercase text-stone-500 font-medium block">Tiempo Total</span>
                <span className="text-base font-bold text-stone-900">{receta.tiempo_total_min} min</span>
              </div>
            </div>

            {receta.tiempo_preparacion_min ? (
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-stone-400" />
                <div>
                  <span className="text-[10px] uppercase text-stone-500 font-medium block">Preparación</span>
                  <span className="text-base font-semibold text-stone-800">{receta.tiempo_preparacion_min} min</span>
                </div>
              </div>
            ) : null}

            {receta.tiempo_coccion_min ? (
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-stone-400" />
                <div>
                  <span className="text-[10px] uppercase text-stone-500 font-medium block">Cocción</span>
                  <span className="text-base font-semibold text-stone-800">{receta.tiempo_coccion_min} min</span>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-[#a86224]" />
              <div>
                <span className="text-[10px] uppercase text-stone-500 font-medium block">Rendimiento</span>
                <span className="text-base font-bold text-stone-900">{receta.porciones} porciones</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tira Nutricional Minimalista de Lino y Crema */}
        {(receta.calorias_por_porcion || receta.proteinas_por_porcion) ? (
          <section className="p-6 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#a86224] uppercase tracking-wider">
              <Flame className="w-4 h-4" />
              <span>Valores Nutricionales Estimados (Por Ración)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
              <div className="py-2 border-r border-[#f4efe6] last:border-r-0">
                <span className="text-xs uppercase text-stone-500 font-medium block">Calorías</span>
                <span className="text-2xl font-bold font-serif-recipe text-stone-900 tabular-nums">
                  {Math.round(receta.calorias_por_porcion || 0)} <span className="text-xs font-normal text-stone-500">kcal</span>
                </span>
              </div>

              <div className="py-2 border-r border-[#f4efe6] last:border-r-0">
                <span className="text-xs uppercase text-stone-500 font-medium block">Proteínas</span>
                <span className="text-2xl font-bold font-serif-recipe text-stone-900 tabular-nums">
                  {receta.proteinas_por_porcion} <span className="text-xs font-normal text-stone-500">g</span>
                </span>
              </div>

              <div className="py-2 border-r border-[#f4efe6] last:border-r-0">
                <span className="text-xs uppercase text-stone-500 font-medium block">Carbohidratos</span>
                <span className="text-2xl font-bold font-serif-recipe text-stone-900 tabular-nums">
                  {receta.carbohidratos_por_porcion} <span className="text-xs font-normal text-stone-500">g</span>
                </span>
              </div>

              <div className="py-2 border-r border-[#f4efe6] last:border-r-0">
                <span className="text-xs uppercase text-stone-500 font-medium block">Grasas</span>
                <span className="text-2xl font-bold font-serif-recipe text-stone-900 tabular-nums">
                  {receta.grasas_por_porcion} <span className="text-xs font-normal text-stone-500">g</span>
                </span>
              </div>

              <div className="py-2">
                <span className="text-xs uppercase text-stone-500 font-medium block">Fibra</span>
                <span className="text-2xl font-bold font-serif-recipe text-stone-900 tabular-nums">
                  {receta.fibra_por_porcion || 0} <span className="text-xs font-normal text-stone-500">g</span>
                </span>
              </div>
            </div>
          </section>
        ) : null}

        {/* Sección Culinaria: Ingredientes y Pasos */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 pt-2">
          {/* Columna Izquierda: Ingredientes con Sustitución Bajo Demanda */}
          <section className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e7dfd5] pb-3">
              <h2 className="text-2xl font-bold font-serif-recipe text-stone-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#a86224]" />
                <span>Ingredientes</span>
              </h2>
              <span className="text-xs font-semibold text-stone-500 font-mono">
                {ingredientes.length} items
              </span>
            </div>

            <p className="text-xs sm:text-sm text-stone-500 font-light">
              Toca <span className="text-[#a86224] font-semibold">Alternativa</span> para ver sustituciones saludables bajo demanda con Gemini.
            </p>

            <div className="space-y-1 divide-y divide-[#e7dfd5]">
              {ingredientes.map((ing) => (
                <IngredientRow
                  key={ing.id}
                  ingrediente={ing}
                  tituloReceta={receta.titulo}
                />
              ))}
            </div>
          </section>

          {/* Columna Derecha: Método y Pasos en Modo Cocina (súper legibles) */}
          <section className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between border-b border-[#e7dfd5] pb-3">
              <h2 className="text-2xl font-bold font-serif-recipe text-stone-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#a86224]" />
                <span>Preparación</span>
              </h2>
              <span className="text-xs font-semibold text-stone-500 font-mono">
                {pasos.length} pasos
              </span>
            </div>

            <ol className="space-y-8">
              {pasos.map((paso) => (
                <li
                  key={paso.id}
                  className="flex gap-4 sm:gap-5 group"
                >
                  <span className="w-10 h-10 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] font-serif-recipe font-bold text-base flex items-center justify-center shrink-0 self-start mt-0.5 shadow-2xs">
                    {paso.orden}
                  </span>

                  <div className="space-y-3 flex-1">
                    <p className="text-base sm:text-lg text-stone-800 leading-relaxed font-light">
                      {paso.instruccion}
                    </p>

                    {(paso.tiempo_estimado_min || paso.temperatura_celsius || paso.consejo_pro) && (
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-stone-500">
                        {paso.tiempo_estimado_min && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#f4efe6] text-stone-700 font-medium">
                            <Clock className="w-3.5 h-3.5 text-[#a86224]" />
                            {paso.tiempo_estimado_min} min
                          </span>
                        )}

                        {paso.temperatura_celsius && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#f4efe6] text-stone-700 font-medium">
                            <Thermometer className="w-3.5 h-3.5 text-[#c27835]" />
                            {paso.temperatura_celsius}°C
                          </span>
                        )}

                        {paso.consejo_pro && (
                          <div className="w-full mt-2 p-3.5 rounded-2xl border border-[#e7dfd5] bg-white text-stone-700 text-xs sm:text-sm font-light">
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
          </section>
        </div>

        {/* Sección: Diario Visual de Cocinados */}
        <CookingDiarySection recetaId={receta.id} entradas={diarioEntries} />
      </main>
    </div>
  );
}
