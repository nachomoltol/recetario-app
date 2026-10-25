import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChefHat, ArrowLeft, Calendar } from 'lucide-react';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { MealPlannerHeaderTitle } from '@/components/planner/MealPlannerHeaderTitle';
import { MealPlannerView } from '@/components/planner/MealPlannerView';
import { getWeeklyPlanAction } from '@/app/actions/mealPlanner';
import { formatLocalDate, parseLocalDate, getMondayOfDate } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

interface MealPlannerPageProps {
  searchParams?: Promise<{ date?: string; generated?: string }>;
}

export default async function MealPlannerPage(props: MealPlannerPageProps) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single();

  // Calcular la semana objetivo (Lunes a Domingo) según searchParams.date o la fecha actual
  const targetDate = searchParams?.date ? parseLocalDate(searchParams.date) : new Date();
  const monday = getMondayOfDate(targetDate);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDate = formatLocalDate(monday);
  const endDate = formatLocalDate(sunday);

  // Obtener planes de la semana y recetas del usuario
  const [planRes, recipesRes] = await Promise.all([
    getWeeklyPlanAction(startDate, endDate),
    supabase
      .from('recetas')
      .select('*')
      .eq('usuario_id', user.id)
      .order('titulo', { ascending: true }),
  ]);

  const initialPlans = planRes.success && planRes.data ? planRes.data : [];
  const userRecipes = recipesRes.data || [];

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      {/* Cabecera Luminosa Lino / Terracotta */}
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/recipes"
              className="w-10 h-10 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] hover:bg-stone-200 transition shadow-2xs"
              title="Volver al recetario"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <MealPlannerHeaderTitle />
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

      {/* Contenido Principal */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <MealPlannerView
          initialPlans={initialPlans}
          userRecipes={userRecipes}
          userProfile={profile}
          initialTargetDate={searchParams?.date || startDate}
        />
      </main>
    </div>
  );
}
