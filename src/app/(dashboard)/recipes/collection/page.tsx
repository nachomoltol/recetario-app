import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChefHat, ArrowLeft, BookOpen, Clock, ArrowRight, Utensils, Sparkles } from 'lucide-react';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { RecipeCollectionOrganizer } from '@/components/recipes/RecipeCollectionOrganizer';

export const dynamic = 'force-dynamic';

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

  const { data: recetas } = await supabase
    .from('recetas')
    .select('*')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false });

  const total = recetas?.length || 0;

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/recipes"
              className="w-10 h-10 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] hover:bg-stone-200 transition"
              title="Volver a captura"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-base font-bold font-serif-recipe tracking-tight text-stone-900 block leading-tight">
                Mi Recetario
              </span>
              <span className="text-[10px] text-stone-500 tracking-wider uppercase block font-medium">
                Colección Completa ({total})
              </span>
            </div>
          </div>

          <UserDropdownMenu
            fallbackName={profile?.nombre || user.email?.split('@')[0] || 'Chef'}
            email={user.email || ''}
          />
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e7dfd5] pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold font-serif-recipe text-stone-900">
              Todas tus Recetas Guardadas
            </h1>
            <p className="text-xs sm:text-sm text-stone-500">
              Fichas culinarias estandarizadas con cálculo volumétrico y macronutrientes
            </p>
          </div>

          <Link
            href="/recipes"
            className="min-h-[44px] px-4 py-2 rounded-2xl bg-[#a86224] hover:bg-[#8e511c] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-xs transition self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>Capturar Nueva Receta</span>
          </Link>
        </div>

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
          <RecipeCollectionOrganizer recetas={recetas || []} />
        )}
      </main>
    </div>
  );
}
