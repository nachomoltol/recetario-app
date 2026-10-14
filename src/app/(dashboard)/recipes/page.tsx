import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChefHat, BookOpen, Clock, ArrowRight, Sparkles, Utensils, Calendar } from 'lucide-react';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { RecipeCaptureCard } from '@/components/recipes/RecipeCaptureCard';
import { HomeRecentRecipesSection } from '@/components/recipes/HomeRecentRecipesSection';

export const dynamic = 'force-dynamic';

export default async function RecipesDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Obtener perfil relacional de la tabla 'usuarios'
  const { data: profile } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single();

  // Obtener recetas del usuario ordenadas por fecha reciente (la primera es la última capturada)
  const { data: recetas } = await supabase
    .from('recetas')
    .select('*')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false });

  const ultimaReceta = recetas && recetas.length > 0 ? recetas[0] : null;

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      {/* Barra de navegación superior luminosa */}
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shadow-2xs">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold font-serif-recipe tracking-tight text-stone-900 block leading-tight">
                Recetario Inteligente
              </span>
              <span className="text-[10px] text-stone-500 tracking-wider uppercase block font-medium">
                Modo Cocina Mobile-First
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/meal-planner"
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#f4efe6] hover:bg-[#e7dfd5] text-[#a86224] text-xs font-semibold border border-[#e7dfd5] transition shadow-2xs"
              title="Plan de comidas semanal"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Plan Semanal</span>
            </Link>

            {/* Menú de Usuario Desplegable */}
            <UserDropdownMenu
              fallbackName={profile?.nombre || user.email?.split('@')[0] || 'Chef'}
              email={user.email || ''}
            />
          </div>
        </div>
      </header>

      {/* Contenido Principal con foco exclusivo en Captura y Última Receta */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-10">
        {/* Cabecera y Bienvenida Limpia */}
        <section className="space-y-1 sm:space-y-2">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#a86224]">
            Cuaderno Gastronómico Personal
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif-recipe text-stone-900 tracking-tight">
            Hola, {profile?.nombre || user.email?.split('@')[0]}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light max-w-2xl">
            Pega cualquier vídeo de cocina para extraer sus pasos y calcular sus ingredientes al instante.
          </p>
        </section>

        {/* Foco 1: Módulo de Captura Rápida de Recetas */}
        <Suspense
          fallback={
            <div className="p-8 rounded-3xl bg-white border border-[#e7dfd5] animate-pulse text-xs text-stone-400 text-center">
              Cargando panel de captura...
            </div>
          }
        >
          <RecipeCaptureCard />
        </Suspense>

        {/* Foco 2: Toggle entre Última Receta Capturada y Última Receta Vista */}
        <HomeRecentRecipesSection recetas={recetas || []} />

        {/* Estado Vacío si no hay recetas */}
        {!ultimaReceta && (
          <div className="p-10 text-center rounded-3xl bg-white border border-dashed border-[#e7dfd5] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-stone-900">
                Tu recetario aún está vacío
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto">
                Pega un enlace de vídeo en el cuadro de captura superior o compártelo directamente desde tu móvil para estandarizar tu primer plato.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
