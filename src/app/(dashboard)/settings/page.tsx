import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, Settings, Sliders, Smartphone, Bell, Moon } from 'lucide-react';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';

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
                Preferencias de la Aplicación
              </span>
            </div>
          </div>

          <UserDropdownMenu
            fallbackName={profile?.nombre || user.email?.split('@')[0] || 'Chef'}
            email={user.email || ''}
          />
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-[#e7dfd5] pb-5">
            <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224]">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif-recipe text-stone-900">
                Ajustes de Cocina
              </h1>
              <p className="text-xs text-stone-500">Configura tu experiencia culinaria e IA</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#a86224]" /> Modo Mobile-First (Cocina)
                </span>
                <p className="text-xs text-stone-500">
                  Touch targets ampliados y botones de alta visibilidad para cocinar
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Activado
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#a86224]" /> Modelo IA Predeterminado
                </span>
                <p className="text-xs text-stone-500">
                  Inferencia multimodal y deducción de speech telegráfico
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
                Gemini 3.1 Flash Lite
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#a86224]" /> Web Share Target PWA
                </span>
                <p className="text-xs text-stone-500">
                  Captura directa desde TikTok, Instagram Reels y YouTube
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Sincronizado
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/recipes"
              className="w-full min-h-[48px] py-3 px-4 rounded-2xl font-semibold text-sm text-stone-700 bg-[#f4efe6] hover:bg-[#ebdcc9] transition flex items-center justify-center gap-2"
            >
              <span>Volver a Mis Recetas</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
