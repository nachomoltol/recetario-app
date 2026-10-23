import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RecipeDetailHeader } from '@/components/recipes/RecipeDetailHeader';
import { RecipeDateFooter } from '@/components/recipes/RecipeDateFooter';
import { RecipeDetailView } from '@/components/recipes/RecipeDetailView';
import { DeleteRecipeButton } from '@/components/recipes/DeleteRecipeButton';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
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

  // Consultar perfil del usuario para preferencias (alergias, nivel, raciones y plan)
  const { data: userProfile } = await supabase
    .from('usuarios')
    .select('id, nombre, raciones_defecto, nivel_culinario, preferencias_dieteticas, alergenos, plan_suscripcion')
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
    recetaId: receta?.id || id,
    titulo: receta?.titulo || '',
    descripcion: receta?.descripcion || '',
    porciones: Number(receta?.porciones) || 2,
    dificultad: receta?.dificultad || 'media',
    ingredientes: (ingredientes || []).map((i) => ({
      nombre_limpio: i?.nombre_limpio || i?.nombre_crudo || '',
      cantidad: Number(i?.cantidad) || 1,
      unidad: i?.unidad || 'unidad',
      pasillo_supermercado: i?.pasillo_supermercado || 'Despensa y Especias',
    })),
    pasos: (pasos || []).map((p, idx) => ({
      orden: p?.orden || idx + 1,
      instruccion: p?.instruccion || '',
      consejo_pro: p?.consejo_pro || null,
    })),
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      {/* Barra de navegación superior luminosa */}
      <RecipeDetailHeader
        fuenteUrl={receta?.fuente_url}
        fuenteTipo={receta?.fuente_tipo}
        dificultad={receta?.dificultad}
        userName={userProfile?.nombre || user.email?.split('@')[0] || 'Chef'}
        userEmail={user.email || ''}
      />

      {/* Contenido Editorial con Modo Cocina */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        <ErrorBoundary fallbackTitle="Error en la vista de la receta">
          <RecipeDetailView
            receta={receta}
            ingredientes={ingredientes || []}
            pasos={pasos || []}
            userProfile={userProfile}
            userRacionesDefecto={userRacionesDefecto}
            recipeDataForAdapt={recipeDataForAdapt}
            diarioEntries={diarioEntries || []}
          />
        </ErrorBoundary>

        {/* Zona de gestión y borrado de la receta */}
        <section className="pt-8 border-t border-[#e7dfd5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs text-stone-500">
            <RecipeDateFooter createdAt={receta?.created_at} />
          </div>
          <DeleteRecipeButton
            recipeId={receta?.id || id}
            recipeTitle={receta?.titulo}
            redirectTo="/recipes"
            variant="button"
          />
        </section>
      </main>
    </div>
  );
}
