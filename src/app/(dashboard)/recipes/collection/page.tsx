import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChefHat, ArrowLeft, BookOpen, Clock, ArrowRight, Utensils, Sparkles } from 'lucide-react';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { HeaderBackButton } from '@/components/layout/HeaderBackButton';
import { HeaderHomeButton } from '@/components/layout/HeaderHomeButton';
import { RecipeCollectionOrganizer } from '@/components/recipes/RecipeCollectionOrganizer';
import { CollectionHeroHeader } from '@/components/recipes/CollectionHeaderComponents';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function RecipeCollectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: recetasData } = await supabase
    .from('recetas')
    .select('*')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false });

  const total = recetasData?.length || 0;
  const recetasIds = (recetasData || []).map((r) => r.id);

  // Obtener nombres de ingredientes para alimentar el buscador universal en tiempo real
  const { data: ingredientesData } = recetasIds.length > 0
    ? await supabase
        .from('receta_ingredientes')
        .select('receta_id, nombre_limpio, nombre_crudo')
        .in('receta_id', recetasIds)
    : { data: [] };

  const ingMap = new Map<string, string[]>();
  for (const ing of ingredientesData || []) {
    const list = ingMap.get(ing.receta_id) || [];
    if (ing.nombre_limpio) list.push(ing.nombre_limpio);
    if (ing.nombre_crudo && ing.nombre_crudo !== ing.nombre_limpio) list.push(ing.nombre_crudo);
    ingMap.set(ing.receta_id, list);
  }

  const recetasConIngredientes = (recetasData || []).map((r) => ({
    ...r,
    ingredientesNombres: ingMap.get(r.id) || [],
  }));

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <HeaderBackButton fallbackUrl="/" />
            <HeaderHomeButton />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <UserDropdownMenu
              fallbackName={profile?.nombre || user.email?.split('@')[0] || 'Chef'}
              email={user.email || ''}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <CollectionHeroHeader />

        {total === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-[#e7dfd5] space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center mx-auto">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-stone-900 font-serif-recipe">
                Aún no tienes recetas guardadas
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto">
                Visita el capturador para procesar vídeos de TikTok, Reels o YouTube.
              </p>
            </div>
            <Link
              href="/recipes"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#a86224] text-white text-xs font-semibold shadow-xs hover:bg-[#8e511c] transition"
            >
              <span>Ir al capturador</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="p-12 text-center text-xs text-stone-400 animate-pulse">
                Cargando recetario...
              </div>
            }
          >
            <RecipeCollectionOrganizer
              recetas={recetasConIngredientes}
              userProfile={profile}
            />
          </Suspense>
        )}

        <footer className="pt-8 pb-4 border-t border-[#e7dfd5] text-center text-xs text-stone-400 space-y-1">
          <div>
            <Link
              href="/privacidad"
              className="hover:text-[#a86224] underline underline-offset-4 decoration-stone-300 hover:decoration-[#a86224] transition-colors"
            >
              Política de Privacidad
            </Link>
          </div>
          <p className="font-mono text-[11px]">Miga Recetario Colección &copy; 2026</p>
        </footer>
      </main>
    </div>
  );
}
