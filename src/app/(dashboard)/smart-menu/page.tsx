import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, Sparkles, ChefHat } from 'lucide-react';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { SmartMenuWizardView } from '@/components/planner/SmartMenuWizardView';
import { getWeeklyPlanAction } from '@/app/actions/mealPlanner';
import { Receta } from '@/types/recipe';

export const dynamic = 'force-dynamic';

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateISO(d: Date): string {
  return d.toISOString().split('T')[0];
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

  // Calcular semana actual a partir del lunes activo
  const monday = getMonday(new Date());
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 13); // Traer 2 semanas para historial reciente

  const startDate = formatDateISO(monday);
  const endDate = formatDateISO(sunday);

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

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      {/* Cabecera Luminosa Editorial */}
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/meal-planner"
              className="w-10 h-10 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] hover:bg-stone-200 transition shadow-2xs"
              title="Volver al planificador"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold font-serif-recipe tracking-tight text-stone-900 block leading-tight">
                  Menú con IA
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 uppercase tracking-wider shadow-2xs">
                  PRO
                </span>
              </div>
              <span className="text-[10px] text-stone-500 tracking-wider uppercase block font-medium">
                Asistente de Planificación Inteligente
              </span>
            </div>
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

      {/* Contenido Principal con Wizard */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
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
