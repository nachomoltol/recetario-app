import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, Settings, ChefHat } from 'lucide-react';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { ProfileForm } from '@/components/profile/ProfileForm';
import {
  ProfileHeaderTitle,
  ProfileSettingsBanner,
} from '@/components/profile/ProfileHeaderComponents';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Consultar perfil del usuario
  const { data: profile } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single();

  // 2. Consultar Estadísticas Reales de Chef en paralelo
  const [
    { count: totalRecetas },
    { count: totalFavoritas },
    { count: totalPlanificadas },
    { count: totalCocinados },
  ] = await Promise.all([
    supabase
      .from('recetas')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', user.id),
    supabase
      .from('recetas')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', user.id)
      .eq('es_favorita', true),
    supabase
      .from('plan_comidas')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', user.id),
    supabase
      .from('diario_cocinados')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', user.id),
  ]);

  const stats = {
    totalRecetas: totalRecetas || 0,
    totalFavoritas: totalFavoritas || 0,
    totalPlanificadas: totalPlanificadas || 0,
    totalCocinados: totalCocinados || 0,
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      {/* Cabecera */}
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/recipes"
              className="w-10 h-10 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] hover:bg-stone-200 transition"
              title="Volver al recetario"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <ProfileHeaderTitle />
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

      {/* Contenido principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <ProfileForm
          initialProfile={{
            id: user.id,
            email: user.email || '',
            nombre: profile?.nombre || null,
            nivel_culinario: profile?.nivel_culinario || 'Principiante',
            preferencias_dieteticas: profile?.preferencias_dieteticas || [],
            alergenos: profile?.alergenos || [],
            plan_suscripcion: profile?.plan_suscripcion || 'gratis',
            created_at: profile?.created_at || user.created_at,
          }}
          stats={stats}
        />

        {/* Acceso a Configuración y Recetas */}
        <ProfileSettingsBanner />
      </main>
    </div>
  );
}
