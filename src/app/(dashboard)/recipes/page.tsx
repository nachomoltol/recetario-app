import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChefHat, LogOut, Sparkles, BookOpen, User, Flame, Clock } from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';
import { UserProfileBadge } from '@/components/auth/UserProfileBadge';
import { RecipeCaptureCard } from '@/components/recipes/RecipeCaptureCard';

export const dynamic = 'force-dynamic';

export default async function RecipesDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protección server-side adicional al Middleware
  if (!user) {
    redirect('/login');
  }

  // Obtener perfil relacional de la tabla 'usuarios'
  const { data: profile } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single();

  // Obtener recetas del usuario
  const { data: recetas } = await supabase
    .from('recetas')
    .select('*')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-charcoal-950 text-stone-100 flex flex-col">
      {/* Barra de navegación superior */}
      <header className="border-b border-charcoal-700/60 bg-charcoal-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold font-serif-recipe tracking-tight text-white block">
                Recetario Inteligente
              </span>
              <span className="text-[10px] text-amber-400/90 tracking-widest uppercase block">
                Área de Chef Protegida
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Componente reactivo conectado a useAuthStore y useProfileStore */}
            <UserProfileBadge fallbackName={profile?.nombre || user.email?.split('@')[0] || 'Chef'} email={user.email || ''} />

            {/* Botón de Cierre de Sesión seguro vía Server Action */}
            <form action={signOutAction}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="p-2 rounded-xl text-stone-400 hover:text-red-400 hover:bg-red-500/10 border border-charcoal-700 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner de Bienvenida con datos del perfil */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-charcoal-900 to-charcoal-900/40 border border-charcoal-700/80 relative overflow-hidden shadow-xl">
          <div className="max-w-2xl space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Sesión Activa & Verificada
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif-recipe text-stone-100">
              ¡Hola, {profile?.nombre || user.email?.split('@')[0]}!
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              Tu sesión está protegida por el Middleware de Next.js y sincronizada en tiempo real con
              Supabase Auth y los stores de Zustand (<code className="text-amber-400 text-xs">useAuthStore</code> y{' '}
              <code className="text-amber-400 text-xs">useProfileStore</code>).
            </p>
          </div>
        </section>

        {/* Resumen del Estado de la Base de Datos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-charcoal-900/60 border border-charcoal-700/60 space-y-1">
            <span className="text-xs text-stone-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" /> Total Recetas
            </span>
            <p className="text-2xl font-bold text-white">{recetas?.length || 0}</p>
          </div>

          <div className="p-5 rounded-2xl bg-charcoal-900/60 border border-charcoal-700/60 space-y-1">
            <span className="text-xs text-stone-400 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" /> Objetivo Calórico
            </span>
            <p className="text-2xl font-bold text-white">
              {profile?.objetivo_calorico_diario ? `${profile.objetivo_calorico_diario} kcal` : 'No fijado'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-charcoal-900/60 border border-charcoal-700/60 space-y-1">
            <span className="text-xs text-stone-400 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" /> ID de Usuario
            </span>
            <p className="text-xs font-mono text-stone-300 truncate" title={user.id}>
              {user.id}
            </p>
          </div>
        </div>

        {/* Tarjeta de Captura Multicanal con Gemini Flash */}
        <Suspense
          fallback={
            <div className="p-6 rounded-3xl bg-charcoal-900 border border-charcoal-700 animate-pulse text-xs text-stone-400">
              Cargando panel de captura con IA...
            </div>
          }
        >
          <RecipeCaptureCard />
        </Suspense>

        {/* Lista de Recetas o Estado Vacío */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-serif-recipe text-stone-200">
              Tus Recetas Guardadas
            </h2>
          </div>

          {(!recetas || recetas.length === 0) ? (
            <div className="p-12 text-center rounded-3xl bg-charcoal-900/40 border border-dashed border-charcoal-700/80 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-charcoal-800 flex items-center justify-center text-stone-500 mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-stone-300">
                  Aún no tienes recetas registradas
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  La infraestructura de usuarios y base de datos está validada. En la siguiente fase
                  conectaremos el motor multimodal de Gemini para extraerlas de TikTok, Reels y YouTube.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recetas.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl bg-charcoal-900 border border-charcoal-700/80 overflow-hidden shadow-lg p-5 space-y-3"
                >
                  <h3 className="font-semibold text-stone-100 font-serif-recipe text-base">
                    {r.titulo}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-stone-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> {r.tiempo_total_min} min
                    </span>
                    <span>{r.porciones} porciones</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
