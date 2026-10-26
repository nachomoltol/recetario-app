import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { HeaderBackButton } from '@/components/layout/HeaderBackButton';
import { SmartMenuWizardView } from '@/components/planner/SmartMenuWizardView';
import { SmartMenuViewPlanButton } from '@/components/planner/SmartMenuViewPlanButton';
import { getWeeklyPlanAction } from '@/app/actions/mealPlanner';
import { Receta } from '@/types/recipe';
import { formatLocalDate, getMondayOfDate } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

interface SmartMenuPageProps {
  searchParams?: Promise<{ replan?: string; force?: string }>;
}

export default async function SmartMenuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/smart-menu');
  }

  const { data: profile } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single();

  // Traer historial reciente (2 semanas) para evitar repeticiones en el generador
  const historyStart = new Date();
  historyStart.setDate(historyStart.getDate() - 14);
  const historyEnd = new Date();
  historyEnd.setDate(historyEnd.getDate() + 14);

  const startHistoryStr = formatLocalDate(historyStart);
  const endHistoryStr = formatLocalDate(historyEnd);

  // Consultar planes recientes y recetas completas del usuario
  const [planRes, recipesRes] = await Promise.all([
    getWeeklyPlanAction(startHistoryStr, endHistoryStr),
    supabase
      .from('recetas')
      .select('*')
      .eq('usuario_id', user.id)
      .order('titulo', { ascending: true }),
  ]);

  const existingPlans = planRes.success && planRes.data ? planRes.data : [];
  const userRecipes = (recipesRes.data || []) as Receta[];

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const currentMonday = getMondayOfDate(today);
  const currentSunday = new Date(currentMonday);
  currentSunday.setDate(currentMonday.getDate() + 6);

  const currentMondayStr = formatLocalDate(currentMonday);
  const currentSundayStr = formatLocalDate(currentSunday);

  // Determinar la fecha de inicio por defecto para la planificación semanal:
  // Si hoy es fin de semana (sábado = 6 o domingo = 0), sugerir el próximo lunes como inicio natural del menú.
  // En días laborales (lunes a viernes), sugerir hoy.
  const todayStr = formatLocalDate(today);
  const dayOfWeek = today.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const daysUntilNextMonday = ((1 + 7 - dayOfWeek) % 7) || 7;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilNextMonday);
  nextMonday.setHours(12, 0, 0, 0);
  const nextMondayStr = formatLocalDate(nextMonday);

  const defaultStartDate = isWeekend ? nextMondayStr : todayStr;

  // Fecha más reciente de planificación existente o fecha de inicio recomendada
  const latestPlanDate = existingPlans.length > 0
    ? [...existingPlans].map((p) => p.fecha).filter(Boolean).sort().reverse()[0]
    : defaultStartDate;

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      {/* Cabecera Limpia y Minimalista */}
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Extremo izquierdo: Botón táctil [ ← Volver ] */}
          <HeaderBackButton fallbackUrl="/" />

          {/* Centro / Derecha: Botón [ 📅 Ver Plan ] y Menú de usuario */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SmartMenuViewPlanButton initialDate={latestPlanDate} />
            <UserDropdownMenu
              fallbackName={profile?.nombre || user.email?.split('@')[0] || 'Chef'}
              email={user.email || ''}
            />
          </div>
        </div>
      </header>

      {/* Contenido Principal con Wizard */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <SmartMenuWizardView
          userRecipes={userRecipes}
          existingPlans={existingPlans}
          initialStartDate={defaultStartDate}
          userProfile={profile}
        />
      </main>
    </div>
  );
}
