import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';
import { HeaderBackButton } from '@/components/layout/HeaderBackButton';
import { CookingSettingsForm } from '@/components/settings/CookingSettingsForm';
import { ThemeSelectorCard } from '@/components/settings/ThemeSelectorCard';
import { LanguageSettingsCard } from '@/components/settings/LanguageSettingsCard';
import { SettingsHeaderTitle } from '@/components/settings/SettingsHeaderCard';

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

  const isPro = (profile?.plan_suscripcion || '').trim().toLowerCase() === 'pro';

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col">
      {/* Barra de cabecera */}
      <header className="border-b border-[#e7dfd5] bg-white/90 backdrop-blur-md sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HeaderBackButton fallbackUrl="/" />
            <div className="hidden sm:block">
              <SettingsHeaderTitle />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <UserDropdownMenu
              fallbackName={profile?.nombre || user.email?.split('@')[0] || 'Chef'}
              email={user.email || ''}
            />
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5 sm:space-y-6">
        {/* Selector de Idioma movido desde Inicio para liberar la cabecera */}
        <LanguageSettingsCard />

        {/* Selector de Paletas y Temas de Color en cabecera */}
        <ThemeSelectorCard isPro={isPro} />

        {/* Formulario de Preferencias: Raciones por defecto + Modo Manos en la Masa */}
        <CookingSettingsForm initialServings={profile?.raciones_defecto ?? 4} />

        {/* Pie de página con enlace legal */}
        <footer className="pt-6 pb-4 text-center text-xs text-stone-400">
          <Link
            href="/privacidad"
            className="hover:text-brand-primary underline underline-offset-4 decoration-stone-300 hover:decoration-brand-primary transition-colors"
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
