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
} from 'lucide-react';
import { RecipeTagsEditor } from '@/components/recipes/RecipeTagsEditor';
import { RecipeRatingHeader } from '@/components/recipes/RecipeRatingHeader';
import { RecipeInteractiveSections } from '@/components/recipes/RecipeInteractiveSections';
import { CookingDiarySection } from '@/components/recipes/CookingDiarySection';
import { DeleteRecipeButton } from '@/components/recipes/DeleteRecipeButton';
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

          <div className="flex items-center gap-2 sm:gap-3">
            {receta.fuente_url && (
              <a
                href={receta.fuente_url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white border border-[#e7dfd5] inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-700 hover:text-[#a86224] hover:border-[#a86224] transition-all shadow-2xs"
              >
                <span>
                  {receta.fuente_tipo === 'web' || receta.fuente_tipo === 'manual'
                    ? 'Ver fuente original'
                    : 'Ver vídeo original'}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-[#a86224]" />
              </a>
            )}

            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5] capitalize">
              {receta.dificultad}
            </span>

            <DeleteRecipeButton
              recipeId={receta.id}
              recipeTitle={receta.titulo}
              redirectTo="/recipes"
              variant="button"
            />
          </div>
        </div>
      </header>

      {/* Contenido Editorial con Modo Cocina */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Cabecera Editorial Limpia */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#a86224]">
              <ChefHat className="w-4 h-4" />
              <span>Ficha Culinaria Estandarizada</span>
            </div>

            {/* Sistema de Valoración y Favoritos Interactivo */}
            <RecipeRatingHeader
              recetaId={receta.id}
              initialFavorite={receta.es_favorita || false}
              initialRating={receta.puntuacion || 0}
            />
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold font-serif-recipe tracking-tight text-stone-900 leading-tight">
            {receta.titulo}
          </h1>

          {receta.descripcion && (
            <p className="text-base sm:text-lg text-stone-700 font-light leading-relaxed max-w-2xl">
              {receta.descripcion}
            </p>
          )}

          {/* Categorización Doble y Editor Interactivo de Etiquetas */}
          <div className="pt-1">
            <RecipeTagsEditor recetaId={receta.id} initialTags={receta.etiquetas || []} />
          </div>

          {/* Tiempos y Rendimiento en Modo Cocina */}
          <div className="pt-5 flex flex-wrap items-center gap-6 sm:gap-10 text-xs sm:text-sm text-stone-600 border-t border-[#e7dfd5]">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-[#a86224]" />
              <div>
                <span className="text-[10px] uppercase text-stone-500 font-medium block">Tiempo Total</span>
                <span className="text-base font-bold text-stone-900">{receta.tiempo_total_min || 15} min</span>
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
                <span className="text-[10px] uppercase text-stone-500 font-medium block">Base Receta</span>
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

        {/* Acordeones Plegables con Escalado Inteligente y Modo Compra */}
        <RecipeInteractiveSections
          recetaId={receta.id}
          tituloReceta={receta.titulo}
          basePorciones={receta.porciones || 2}
          tiempoCoccionMin={receta.tiempo_coccion_min}
          ingredientes={ingredientes}
          pasos={pasos}
        />

        {/* Sección: Diario Visual de Cocinados */}
        <CookingDiarySection recetaId={receta.id} entradas={diarioEntries} />

        {/* Zona de gestión y borrado de la receta */}
        <section className="pt-8 border-t border-[#e7dfd5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs text-stone-500">
            <span>Ficha culinaria creada el {new Date(receta.created_at).toLocaleDateString('es-ES')}</span>
          </div>
          <DeleteRecipeButton
            recipeId={receta.id}
            recipeTitle={receta.titulo}
            redirectTo="/recipes"
            variant="button"
          />
        </section>
      </main>
    </div>
  );
}
