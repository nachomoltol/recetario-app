import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { CookingSettingsForm } from '@/components/settings/CookingSettingsForm';
import {
  SettingsHeaderTitle,
  SettingsHeroCard,
} from '@/components/settings/SettingsHeaderCard';

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
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <SettingsHeaderTitle />
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
        {/* Cabecera de la sección */}
        <SettingsHeroCard />

        {/* Formulario de Preferencias: Raciones por defecto + Modo Manos en la Masa */}
        <CookingSettingsForm initialServings={profile?.raciones_defecto ?? 4} />


        {/* Pie de página con enlace legal */}
        <footer className="pt-6 pb-4 text-center text-xs text-stone-400">
          <Link
            href="/privacidad"
            className="hover:text-[#a86224] underline underline-offset-4 decoration-stone-300 hover:decoration-[#a86224] transition-colors"
          >
            Política de Privacidad
          </Link>
          <p className="mt-1 text-[11px] text-stone-400">
            Miga &copy; 2026 · Todos los derechos reservados
          </p>
        </footer>
      </main>
    </div>
  );
}
