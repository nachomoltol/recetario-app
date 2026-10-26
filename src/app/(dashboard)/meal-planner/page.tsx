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
  const isPro = (profile?.plan_suscripcion || '').trim().toLowerCase() === 'pro';

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      {/* Cabecera Luminosa Lino / Terracotta (1 Sola Fila Horizontal en todas las resoluciones) */}
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-3 w-full">
            {/* Botón Izquierdo: Volver compacto en móvil */}
            <HeaderBackButton fallbackUrl="/" compactOnMobile />

            {/* Botón Central: Replanificar con IA (flexible, estilizado, con paywall PRO) */}
            <div className="flex-1 max-w-[210px] sm:max-w-xs mx-1 flex justify-center">
              <MealPlannerHeaderReplanButton isPro={isPro} />
            </div>

            {/* Botón Derecho: Menú de usuario */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <LanguageToggle />
              <UserDropdownMenu
                fallbackName={profile?.nombre || user.email?.split('@')[0] || 'Chef'}
                email={user.email || ''}
              />
            </div>
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
