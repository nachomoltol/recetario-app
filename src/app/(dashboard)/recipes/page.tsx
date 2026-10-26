import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BookOpen, Sparkles } from 'lucide-react';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { HeaderBackButton } from '@/components/layout/HeaderBackButton';
import { RecipeCaptureCard } from '@/components/recipes/RecipeCaptureCard';
import { HomeRecentRecipesSection } from '@/components/recipes/HomeRecentRecipesSection';
import {
  HomeWelcomeHeader,
  HomeEmptyCookbookState,
} from '@/components/recipes/HomeWelcomeHeader';

export const dynamic = 'force-dynamic';

interface RecipesDashboardPageProps {
  searchParams?: Promise<{ momento?: string; assignDate?: string; assignSlot?: string }>;
}

export default async function RecipesDashboardPage(props: RecipesDashboardPageProps) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const { momento, assignDate, assignSlot } = searchParams;
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
  const userName = profile?.nombre || user.email?.split('@')[0] || 'Chef';

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      {/* Barra de navegación superior luminosa */}
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Zona izquierda: Botón de retorno estándar y Selector de idioma */}
          <div className="flex items-center gap-2 sm:gap-3">
            <HeaderBackButton fallbackUrl="/" />
            <LanguageToggle />
          </div>

          {/* Zona derecha: Menú de Usuario Desplegable */}
          <div className="flex items-center gap-2 sm:gap-3">
            <UserDropdownMenu
              fallbackName={userName}
              email={user.email || ''}
            />
          </div>
        </div>
      </header>

      {/* Contenido Principal con foco exclusivo en Captura y Última Receta */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-10">
        {/* Cabecera y Bienvenida Dinámica Bilingüe */}
        <HomeWelcomeHeader userName={userName} />

        {/* Banner contextual de asignación de menú si viene del planificador */}
        {assignSlot && assignDate && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-3 text-xs sm:text-sm animate-fade-in shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-[#a86224] shrink-0" />
              <span className="text-stone-800 font-medium truncate">
                Asignando plato para <strong>{assignSlot}</strong> ({assignDate}).
              </span>
            </div>
            <Link
              href={`/recipes/collection?momento=${momento || ''}&assignDate=${assignDate}&assignSlot=${assignSlot}`}
              className="px-3.5 py-1.5 rounded-xl bg-[#a86224] hover:bg-[#8e511c] text-white font-semibold text-xs shrink-0 transition"
            >
              Explorar colección
            </Link>
          </div>
        )}

        {/* Foco 1: Módulo de Captura Rápida de Recetas */}
        <Suspense
          fallback={
            <div className="p-8 rounded-3xl bg-white border border-[#e7dfd5] animate-pulse text-xs text-stone-400 text-center">
              Cargando panel de captura...
            </div>
          }
        >
          <RecipeCaptureCard initialProfile={profile} />
        </Suspense>

        {/* Foco 2: Toggle entre Última Receta Capturada y Última Receta Vista */}
        <HomeRecentRecipesSection recetas={recetas || []} />

        {/* Estado Vacío si no hay recetas */}
        {!ultimaReceta && (
          <div className="p-10 text-center rounded-3xl bg-white border border-dashed border-[#e7dfd5] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <HomeEmptyCookbookState />
          </div>
        )}
      </main>
    </div>
  );
}
