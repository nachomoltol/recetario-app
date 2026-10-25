import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { SmartMenuWizardView } from '@/components/planner/SmartMenuWizardView';
import { SmartMenuBackButton } from '@/components/planner/SmartMenuBackButton';
import { SmartMenuViewPlanButton } from '@/components/planner/SmartMenuViewPlanButton';
import { getWeeklyPlanAction } from '@/app/actions/mealPlanner';
import { Receta } from '@/types/recipe';
import { formatLocalDate, getMondayOfDate } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

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

  // Calcular semana actual a partir del lunes activo
  const monday = getMondayOfDate(new Date());
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 13); // Traer 2 semanas para historial reciente

  const startDate = formatLocalDate(monday);
  const endDate = formatLocalDate(sunday);

  // Consultar planes recientes y recetas completas del usuario
  const [planRes, recipesRes] = await Promise.all([
    getWeeklyPlanAction(startDate, endDate),
    supabase
      .from('recetas')
      .select('*')
      .eq('usuario_id', user.id)
      .order('titulo', { ascending: true }),
  ]);

  const existingPlans = planRes.success && planRes.data ? planRes.data : [];
  const userRecipes = (recipesRes.data || []) as Receta[];

  // Fecha más reciente de planificación existente o lunes activo
  const latestPlanDate = existingPlans.length > 0
    ? [...existingPlans].map((p) => p.fecha).filter(Boolean).sort().reverse()[0]
    : startDate;

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      {/* Cabecera Limpia y Minimalista */}
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Izquierda: Botón de retorno táctil minimalista */}
          <SmartMenuBackButton />

          {/* Centro: Título corto y badge PRO */}
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold font-serif-recipe tracking-tight text-stone-900 block leading-tight">
              Menú con IA
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 uppercase tracking-wider shadow-2xs">
              PRO
            </span>
          </div>

          {/* Derecha: Botón Ver mi Plan y perfil */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SmartMenuViewPlanButton initialDate={latestPlanDate} />
            <LanguageToggle />
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
          initialStartDate={startDate}
          userProfile={profile}
        />
      </main>
    </div>
  );
}
