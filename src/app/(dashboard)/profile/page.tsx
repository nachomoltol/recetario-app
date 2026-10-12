import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChefHat, ArrowLeft, User, Mail, Calendar, ShieldCheck } from 'lucide-react';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
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
                Datos Personales
              </span>
              <span className="text-[10px] text-stone-500 tracking-wider uppercase block font-medium">
                Perfil de Chef
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
          <div className="flex items-center gap-4 border-b border-[#e7dfd5] pb-6">
            <div className="w-16 h-16 rounded-3xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] font-bold text-2xl shadow-2xs">
              {(profile?.nombre || user.email?.split('@')[0] || 'CH').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif-recipe text-stone-900">
                {profile?.nombre || user.email?.split('@')[0]}
              </h1>
              <p className="text-xs text-stone-500">Miembro desde {new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-1">
              <span className="text-xs text-stone-500 flex items-center gap-2 font-medium">
                <User className="w-4 h-4 text-[#a86224]" /> Nombre completo
              </span>
              <p className="text-sm font-semibold text-stone-900">{profile?.nombre || 'No configurado'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-1">
              <span className="text-xs text-stone-500 flex items-center gap-2 font-medium">
                <Mail className="w-4 h-4 text-[#a86224]" /> Correo electrónico
              </span>
              <p className="text-sm font-semibold text-stone-900">{user.email}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-1">
              <span className="text-xs text-stone-500 flex items-center gap-2 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Estado de la cuenta
              </span>
              <p className="text-sm font-semibold text-emerald-700">Verificada y activa</p>
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
