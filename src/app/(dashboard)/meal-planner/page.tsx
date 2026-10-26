import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { HeaderBackButton } from '@/components/layout/HeaderBackButton';
import { MealPlannerHeaderReplanButton } from '@/components/planner/MealPlannerHeaderReplanButton';
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
      {/* Cabecera Luminosa Lino / Terracotta (Mobile-First sin solapamientos) */}
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Fila principal: distribución limpia entre navegación y usuario */}
          <div className="h-14 sm:h-16 flex items-center justify-between gap-3">
            {/* Lado izquierdo: Botón Volver + Replanificar en desktop */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <HeaderBackButton fallbackUrl="/" />
              <div className="hidden sm:block">
                <MealPlannerHeaderReplanButton />
              </div>
            </div>

            {/* Lado derecho: Idioma + Perfil de usuario */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <LanguageToggle />
              <UserDropdownMenu
                fallbackName={profile?.nombre || user.email?.split('@')[0] || 'Chef'}
                email={user.email || ''}
              />
            </div>
          </div>

          {/* Sub-barra exclusiva móvil (< 640px): Botón Replanificar a ancho completo sin colisiones */}
          <div className="sm:hidden pb-2.5 pt-0.5">
            <MealPlannerHeaderReplanButton isMobileFullWidth />
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
