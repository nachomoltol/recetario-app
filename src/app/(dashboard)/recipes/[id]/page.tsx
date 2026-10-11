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
    <div className="min-h-screen bg-charcoal-950 text-stone-100 flex flex-col">
      {/* Barra de navegación superior etérea */}
      <header className="border-b border-stone-800/40 bg-charcoal-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/recipes"
            className="inline-flex items-center gap-2 text-xs font-medium text-stone-400 hover:text-amber-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a recetas</span>
          </Link>

          <div className="flex items-center gap-3">
            {receta.fuente_url && (
              <a
                href={receta.fuente_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors"
              >
                <span>Fuente ({receta.fuente_tipo})</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 capitalize">
              {receta.dificultad}
            </span>
          </div>
        </div>
      </header>

      {/* Contenido Editorial de la Receta */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* Cabecera Editorial */}
        <section className="space-y-4 max-w-3xl">
          <div className="flex items-center gap-2 text-[11px] text-amber-500 font-semibold uppercase tracking-widest">
            <ChefHat className="w-4 h-4" />
            <span>Ficha Culinaria Estandarizada</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold font-serif-recipe tracking-tight text-stone-100 leading-tight">
            {receta.titulo}
          </h1>

          {receta.descripcion && (
            <p className="text-sm sm:text-base text-stone-300/90 font-light leading-relaxed">
              {receta.descripcion}
            </p>
          )}

          {/* Tiempos y Rendimiento (diseño ligero sin cajas pesadas) */}
          <div className="pt-4 flex flex-wrap items-center gap-6 sm:gap-10 text-xs text-stone-400 border-t border-stone-800/40">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[10px] uppercase text-stone-500 block">Total</span>
                <span className="font-semibold text-stone-200">{receta.tiempo_total_min} min</span>
              </div>
            </div>

            {receta.tiempo_preparacion_min ? (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-500" />
                <div>
                  <span className="text-[10px] uppercase text-stone-500 block">Preparación</span>
                  <span className="text-stone-300">{receta.tiempo_preparacion_min} min</span>
                </div>
              </div>
            ) : null}

            {receta.tiempo_coccion_min ? (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-500" />
                <div>
                  <span className="text-[10px] uppercase text-stone-500 block">Cocción</span>
                  <span className="text-stone-300">{receta.tiempo_coccion_min} min</span>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[10px] uppercase text-stone-500 block">Rendimiento</span>
                <span className="font-semibold text-stone-200">{receta.porciones} porciones</span>
              </div>
            </div>
          </div>
        </section>

        {/* Perfil de Macronutrientes por Porción (estética editorial ligera) */}
        {(receta.calorias_por_porcion || receta.proteinas_por_porcion) ? (
          <section className="py-4 px-6 rounded-2xl border border-stone-800/40 bg-stone-900/20 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
              <Flame className="w-3.5 h-3.5" />
              <span>Valores Nutricionales Estimados (Por Ración)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
              <div className="py-2 border-r border-stone-800/40 last:border-r-0">
                <span className="text-[10px] uppercase text-stone-500 block">Calorías</span>
                <span className="text-lg font-bold text-white tabular-nums">
                  {Math.round(receta.calorias_por_porcion || 0)} <span className="text-xs font-normal text-stone-400">kcal</span>
                </span>
              </div>

              <div className="py-2 border-r border-stone-800/40 last:border-r-0">
                <span className="text-[10px] uppercase text-stone-500 block">Proteínas</span>
                <span className="text-lg font-bold text-stone-200 tabular-nums">
                  {receta.proteinas_por_porcion} <span className="text-xs font-normal text-stone-400">g</span>
                </span>
              </div>

              <div className="py-2 border-r border-stone-800/40 last:border-r-0">
                <span className="text-[10px] uppercase text-stone-500 block">Carbohidratos</span>
                <span className="text-lg font-bold text-stone-200 tabular-nums">
                  {receta.carbohidratos_por_porcion} <span className="text-xs font-normal text-stone-400">g</span>
                </span>
              </div>

              <div className="py-2 border-r border-stone-800/40 last:border-r-0">
                <span className="text-[10px] uppercase text-stone-500 block">Grasas</span>
                <span className="text-lg font-bold text-stone-200 tabular-nums">
                  {receta.grasas_por_porcion} <span className="text-xs font-normal text-stone-400">g</span>
                </span>
              </div>

              <div className="py-2">
                <span className="text-[10px] uppercase text-stone-500 block">Fibra</span>
                <span className="text-lg font-bold text-stone-200 tabular-nums">
                  {receta.fibra_por_porcion || 0} <span className="text-xs font-normal text-stone-400">g</span>
                </span>
              </div>
            </div>
          </section>
        ) : null}

        {/* Sección Culinaria: Ingredientes y Pasos */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 pt-4">
          {/* Columna Izquierda: Ingredientes con Sustitución Bajo Demanda */}
          <section className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h2 className="text-xl font-bold font-serif-recipe text-stone-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>Ingredientes</span>
              </h2>
              <span className="text-xs text-stone-500 font-mono">
                {ingredientes.length} items
              </span>
            </div>

            <p className="text-xs text-stone-400 font-light">
              Pulsa <span className="text-amber-400 font-medium">Alternativa</span> junto a cualquier alimento para consultar a Gemini una sustitución saludable interactiva.
            </p>

            <div className="space-y-1 divide-y divide-stone-800/30">
              {ingredientes.map((ing) => (
                <IngredientRow
                  key={ing.id}
                  ingrediente={ing}
                  tituloReceta={receta.titulo}
                />
              ))}
            </div>
          </section>

          {/* Columna Derecha: Método y Pasos Secuenciales */}
          <section className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h2 className="text-xl font-bold font-serif-recipe text-stone-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Preparación Paso a Paso</span>
              </h2>
              <span className="text-xs text-stone-500 font-mono">
                {pasos.length} pasos
              </span>
            </div>

            <ol className="space-y-6">
              {pasos.map((paso) => (
                <li
                  key={paso.id}
                  className="flex gap-4 group transition-colors"
                >
                  <span className="w-8 h-8 rounded-full border border-stone-800 text-amber-400 font-serif-recipe font-bold text-sm flex items-center justify-center shrink-0 self-start group-hover:border-amber-500/40 transition-colors">
                    {paso.orden}
                  </span>

                  <div className="space-y-2 flex-1 pt-0.5">
                    <p className="text-sm text-stone-200 leading-relaxed font-light">
                      {paso.instruccion}
                    </p>

                    {(paso.tiempo_estimado_min || paso.temperatura_celsius || paso.consejo_pro) && (
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-stone-400">
                        {paso.tiempo_estimado_min && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
                            <Clock className="w-3 h-3 text-amber-500/80" />
                            {paso.tiempo_estimado_min} min
                          </span>
                        )}

                        {paso.temperatura_celsius && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
                            <Thermometer className="w-3 h-3 text-red-400" />
                            {paso.temperatura_celsius}°C
                          </span>
                        )}

                        {paso.consejo_pro && (
                          <div className="w-full mt-1.5 p-2.5 rounded-lg border border-amber-500/15 bg-amber-500/5 text-amber-200/90 text-xs font-light italic">
                            <span className="font-semibold text-amber-300 not-italic">Consejo del Chef:</span>{' '}
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
