import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, CreditCard, Sparkles, Check, ShieldCheck } from 'lucide-react';
import { UserDropdownMenu } from '@/components/auth/UserDropdownMenu';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
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
                Pasarela de Pago
              </span>
              <span className="text-[10px] text-stone-500 tracking-wider uppercase block font-medium">
                Gestión de Suscripción
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
          <div className="flex items-center justify-between border-b border-[#e7dfd5] pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224]">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-serif-recipe text-stone-900">
                  Plan Activo: Chef Pro
                </h1>
                <p className="text-xs text-stone-500">Acceso ilimitado a extracción de vídeo e IA</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Activo
            </span>
          </div>

          {/* Tarjeta de detalles del plan */}
          <div className="p-6 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <h3 className="font-bold text-stone-900 font-serif-recipe text-lg">
                  Suscripción Gastronómica Ilimitada
                </h3>
                <p className="text-xs text-stone-600">Extracción multimodal y sustitución en tiempo real</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold font-serif-recipe text-stone-900">0€</span>
                <span className="text-xs text-stone-500"> / beta abierta</span>
              </div>
            </div>

            <ul className="space-y-2 text-xs sm:text-sm text-stone-700">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#a86224]" />
                <span>Extracción multimodal desde TikTok, YouTube y Reels</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#a86224]" />
                <span>Triple alternativa de ingredientes (magra, umami, económica)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#a86224]" />
                <span>Modo Lista de la Compra táctil con persistencia local</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#a86224]" />
                <span>Clasificación doble gastronómica y momentos de consumo</span>
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-stone-50 border border-[#e7dfd5] text-xs text-stone-600">
            <ShieldCheck className="w-5 h-5 text-stone-400 shrink-0" />
            <span>
              La pasarela de pago y cobros automáticos se activarán al concluir el periodo de beta
              privada. Tu acceso actual se mantendrá sin interrupciones.
            </span>
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
