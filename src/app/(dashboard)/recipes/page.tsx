import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChefHat, BookOpen, Clock, ArrowRight, Sparkles, Utensils } from 'lucide-react';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { RecipeCaptureCard } from '@/components/recipes/RecipeCaptureCard';
import { DeleteRecipeButton } from '@/components/recipes/DeleteRecipeButton';

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

  // Obtener recetas del usuario ordenadas por fecha reciente
  const { data: recetas } = await supabase
    .from('recetas')
    .select('*')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false });

  const ultimaReceta = recetas && recetas.length > 0 ? recetas[0] : null;
  const restoRecetas = recetas && recetas.length > 1 ? recetas.slice(1) : [];

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

          {/* Menú de Usuario Desplegable */}
          <UserDropdownMenu
            fallbackName={profile?.nombre || user.email?.split('@')[0] || 'Chef'}
            email={user.email || ''}
          />
        </div>
      </header>

      {/* Contenido Principal enfocado */}
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

        {/* Foco 2: Acceso Rápido a la Última Receta Capturada */}
        {ultimaReceta && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#a86224] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Última Receta Capturada
              </span>
              <span className="text-xs text-stone-400">
                {new Date(ultimaReceta.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="group rounded-3xl bg-white border-2 border-[#e7dfd5] hover:border-[#a86224] transition-all p-6 sm:p-7 shadow-xs space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5] font-bold uppercase tracking-wider text-[10px]">
                      {ultimaReceta.fuente_tipo}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-stone-100 text-stone-700 capitalize text-[11px]">
                      {ultimaReceta.dificultad}
                    </span>
                  </div>

                  <DeleteRecipeButton
                    recipeId={ultimaReceta.id}
                    recipeTitle={ultimaReceta.titulo}
                    variant="icon"
                    className="w-8 h-8 rounded-xl"
                  />
                </div>

                <Link
                  href={`/recipes/${ultimaReceta.id}`}
                  className="block group-hover:text-[#a86224] transition-colors"
                >
                  <h2 className="font-bold text-stone-900 font-serif-recipe text-2xl sm:text-3xl leading-snug">
                    {ultimaReceta.titulo}
                  </h2>
                </Link>

                {ultimaReceta.descripcion && (
                  <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed font-light">
                    {ultimaReceta.descripcion}
                  </p>
                )}

                {/* Etiquetas de categorías dobles */}
                {ultimaReceta.etiquetas && ultimaReceta.etiquetas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ultimaReceta.etiquetas.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#faf7f2] text-stone-700 border border-[#e7dfd5]"
                      >
                        {tag}
                      </span>
                    ))}
                    {ultimaReceta.etiquetas.length > 4 && (
                      <span className="text-[11px] text-stone-400 font-medium self-center">
                        +{ultimaReceta.etiquetas.length - 4} más
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Barra de acción rápida mobile-first */}
              <div className="pt-4 border-t border-[#f4efe6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs sm:text-sm text-stone-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#a86224]" /> {ultimaReceta.tiempo_total_min} min
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-[#a86224]" /> {ultimaReceta.porciones} porciones
                  </span>
                </div>

                <Link
                  href={`/recipes/${ultimaReceta.id}`}
                  className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-[#a86224] hover:bg-[#8e511c] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <span>Cocinar en Modo Cocina</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Colección de Recetas Anteriores */}
        {restoRecetas.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-[#e7dfd5]">
            <div className="flex items-center justify-between">
              <h3 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900">
                Tu Colección ({recetas?.length || 0})
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {restoRecetas.map((r) => (
                <div
                  key={r.id}
                  className="group rounded-3xl bg-white border border-[#e7dfd5] hover:border-[#a86224] hover:shadow-xs transition-all p-5 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#a86224] uppercase text-[10px] tracking-wider">
                        {r.fuente_tipo}
                      </span>
                      <DeleteRecipeButton
                        recipeId={r.id}
                        recipeTitle={r.titulo}
                        variant="icon"
                        className="w-7 h-7 rounded-lg"
                      />
                    </div>

                    <Link href={`/recipes/${r.id}`} className="block group-hover:text-[#a86224] transition-colors">
                      <h4 className="font-bold text-stone-900 font-serif-recipe text-lg leading-snug line-clamp-1">
                        {r.titulo}
                      </h4>
                    </Link>

                    {r.descripcion && (
                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed font-light">
                        {r.descripcion}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#f4efe6] flex items-center justify-between text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#a86224]" /> {r.tiempo_total_min}m
                    </span>
                    <Link
                      href={`/recipes/${r.id}`}
                      className="text-[#a86224] hover:text-[#8e511c] transition-colors font-semibold inline-flex items-center gap-0.5"
                    >
                      <span>Abrir</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Estado Vacío */}
        {(!recetas || recetas.length === 0) && (
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
