import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { RecipeDetailView } from '@/components/recipes/RecipeDetailView';
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

  // Consultar perfil del usuario para preferencias (alergias, nivel y raciones)
  const { data: userProfile } = await supabase
    .from('usuarios')
    .select('id, raciones_defecto, nivel_culinario, preferencias_dieteticas, alergenos')
    .eq('id', user.id)
    .single();

  const userRacionesDefecto = userProfile?.raciones_defecto || undefined;

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

  const recipeDataForAdapt = {
    recetaId: receta.id,
    titulo: receta.titulo,
    descripcion: receta.descripcion,
    porciones: receta.porciones || 2,
    dificultad: receta.dificultad,
    ingredientes: ingredientes.map((i) => ({
      nombre_limpio: i.nombre_limpio,
      cantidad: i.cantidad,
      unidad: i.unidad,
      pasillo_supermercado: i.pasillo_supermercado,
    })),
    pasos: pasos.map((p) => ({
      orden: p.orden,
      instruccion: p.instruccion,
      consejo_pro: p.consejo_pro,
    })),
  };

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
        <RecipeDetailView
          receta={receta}
          ingredientes={ingredientes}
          pasos={pasos}
          userProfile={userProfile}
          userRacionesDefecto={userRacionesDefecto}
          recipeDataForAdapt={recipeDataForAdapt}
          diarioEntries={diarioEntries}
        />

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
