import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, Settings, User, ChefHat } from 'lucide-react';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { CookingSettingsForm } from '@/components/settings/CookingSettingsForm';
import { ShareAppsCard } from '@/components/settings/ShareAppsCard';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
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

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      {/* Barra de cabecera */}
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
            <div>
              <span className="text-base font-bold font-serif-recipe tracking-tight text-stone-900 block">
                Configuración
              </span>
              <span className="text-[10px] text-stone-500 tracking-wider uppercase block font-medium">
                Ajustes Culinarios
              </span>
            </div>
          </div>

          <UserDropdownMenu
            fallbackName={profile?.nombre || user.email?.split('@')[0] || 'Chef'}
            email={user.email || ''}
          />
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Cabecera de la sección */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shrink-0">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif-recipe text-stone-900">
                Ajustes de Cocina
              </h1>
              <p className="text-xs text-stone-500 mt-0.5">
                Personaliza cómo cocinas y cómo interactúa tu recetario
              </p>
            </div>
          </div>
        </div>

        {/* Formulario de Preferencias: Raciones por defecto + Modo Manos en la Masa */}
        <CookingSettingsForm initialServings={profile?.raciones_defecto || 2} />

        {/* Panel limpio: Compartir desde otras apps */}
        <ShareAppsCard />

        {/* Acceso a Datos Personales y Recetario */}
        <div className="p-6 rounded-3xl bg-[#f4efe6] border border-[#e7dfd5] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold font-serif-recipe text-stone-900">
                Perfil y Preferencias Alimentarias
              </h4>
              <p className="text-xs text-stone-600">
                Alergias, nivel de cocina y estadísticas de chef
              </p>
            </div>
          </div>

          <Link
            href="/profile"
            className="w-full sm:w-auto min-h-[42px] px-5 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-[#a86224] border border-[#e7dfd5] text-xs font-semibold flex items-center justify-center transition shadow-2xs"
          >
            Ver Mi Perfil
          </Link>
        </div>
      </main>
    </div>
  );
}
