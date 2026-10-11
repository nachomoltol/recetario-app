import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChefHat, LogOut, BookOpen, User, Clock, ArrowRight } from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';
import { UserProfileBadge } from '@/components/auth/UserProfileBadge';
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

  // Obtener recetas del usuario
  const { data: recetas } = await supabase
    .from('recetas')
    .select('*')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      {/* Barra de navegación superior luminosa */}
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224]">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold font-serif-recipe tracking-tight text-stone-900 block">
                Recetario Inteligente
              </span>
              <span className="text-[10px] text-stone-500 tracking-wider uppercase block font-medium">
                Modo Cocina
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <UserProfileBadge
              fallbackName={profile?.nombre || user.email?.split('@')[0] || 'Chef'}
              email={user.email || ''}
            />

            <form action={signOutAction}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="w-10 h-10 rounded-2xl text-stone-500 hover:text-stone-900 hover:bg-[#f4efe6] border border-[#e7dfd5] transition flex items-center justify-center cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Contenido Principal con márgenes generosos */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Cabecera y Bienvenida Limpia */}
        <section className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#a86224]">
            Cuaderno Gastronómico Personal
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-serif-recipe text-stone-900 tracking-tight">
            Hola, {profile?.nombre || user.email?.split('@')[0]}
          </h1>
          <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-2xl">
            Gestiona tus recetas estandarizadas, consulta ingredientes con cálculo volumétrico y registra tus cocinados.
          </p>
        </section>

        {/* Resumen Mínimo Orgánico */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl bg-white border border-[#e7dfd5] shadow-2xs space-y-1">
            <span className="text-xs text-stone-500 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#a86224]" /> Recetas en tu Colección
            </span>
            <p className="text-3xl font-bold font-serif-recipe text-stone-900">
              {recetas?.length || 0}
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#e7dfd5] shadow-2xs space-y-1">
            <span className="text-xs text-stone-500 flex items-center gap-2">
              <User className="w-4 h-4 text-stone-500" /> Cuenta Activa
            </span>
            <p className="text-base font-semibold text-stone-900 truncate">
              {profile?.nombre || user.email?.split('@')[0]}
            </p>
            <p className="text-xs text-stone-500 truncate" title={user.email || ''}>
              {user.email}
            </p>
          </div>
        </div>

        {/* Tarjeta de Captura Multicanal */}
        <Suspense
          fallback={
            <div className="p-8 rounded-3xl bg-white border border-[#e7dfd5] animate-pulse text-xs text-stone-400 text-center">
              Cargando panel de captura...
            </div>
          }
        >
          <RecipeCaptureCard />
        </Suspense>

        {/* Lista de Recetas Guardadas */}
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-[#e7dfd5] pb-3">
            <h2 className="text-2xl font-bold font-serif-recipe text-stone-900">
              Tus Recetas ({recetas?.length || 0})
            </h2>
          </div>

          {(!recetas || recetas.length === 0) ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-[#e7dfd5] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-stone-900">
                  Tu recetario aún está vacío
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto">
                  Pega un enlace de vídeo o notas en el formulario superior para estandarizar tu primer plato.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {recetas.map((r) => (
                <div
                  key={r.id}
                  className="group rounded-3xl bg-white border border-[#e7dfd5] hover:border-[#c27835] hover:shadow-md transition-all p-6 space-y-4 shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#a86224] uppercase tracking-wider">{r.fuente_tipo}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f4efe6] text-stone-600 border border-[#e7dfd5] capitalize text-xs">
                          {r.dificultad}
                        </span>
                        <DeleteRecipeButton
                          recipeId={r.id}
                          recipeTitle={r.titulo}
                          variant="icon"
                          className="w-8 h-8 rounded-xl"
                        />
                      </div>
                    </div>

                    <Link href={`/recipes/${r.id}`} className="block group-hover:text-[#a86224] transition-colors">
                      <h3 className="font-bold text-stone-900 font-serif-recipe text-xl leading-snug">
                        {r.titulo}
                      </h3>
                    </Link>

                    {r.descripcion && (
                      <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed font-light">
                        {r.descripcion}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#f4efe6] flex items-center justify-between text-xs text-stone-500">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#a86224]" /> {r.tiempo_total_min} min
                    </span>
                    <span className="font-medium text-stone-700">{r.porciones} porciones</span>
                    <Link
                      href={`/recipes/${r.id}`}
                      className="text-[#a86224] hover:text-[#8e511c] transition-colors inline-flex items-center gap-0.5 font-semibold"
                    >
                      <span>Abrir</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
