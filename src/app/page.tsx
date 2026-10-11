import Link from 'next/link';
import { BookOpen, Sparkles, Share2, Camera, Database, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-charcoal-950 text-stone-100 flex flex-col justify-between p-6 sm:p-12 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-charcoal-700/60 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-serif-recipe">
              Recetario Inteligente
            </h1>
            <p className="text-xs text-stone-400">
              Arquitectura Base PWA & Motor Nutricional Relacional
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-white hover:bg-charcoal-800 transition"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-500/20 transition"
          >
            Registrarse
          </Link>
        </div>
      </header>

      {/* Hero / State Validation */}
      <section className="py-12 space-y-6">
        <div className="max-w-2xl space-y-3">
          <span className="text-amber-500 font-medium text-xs tracking-wider uppercase">
            Fase 2: Autenticación & Estado Global Activos
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-100 font-serif-recipe">
            Ecosistema preparado para estandarización culinaria y nutrición clínica.
          </h2>
          <p className="text-sm sm:text-base text-stone-400 leading-relaxed">
            Se ha implementado el flujo de Supabase Auth (Login y Registro), la protección de rutas
            mediante Middleware de Next.js y los stores de Zustand (<code className="text-amber-400">useAuthStore</code> y <code className="text-amber-400">useProfileStore</code>) para la sincronización de sesión en el cliente.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <Link
              href="/recipes"
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 transition"
            >
              Probar Ruta Protegida (/recipes) →
            </Link>
          </div>
        </div>

        {/* Pilares funcionales definidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="p-5 rounded-2xl bg-charcoal-900 border border-charcoal-700/60 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-stone-200 text-sm">Ingesta Multicanal</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Preparado para procesar TikTok, Reels y YouTube, extrayendo metadatos y vídeo.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-charcoal-900 border border-charcoal-700/60 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Share2 className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-stone-200 text-sm">Captura Web Share</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Integración PWA manifest target lista para capturar desde el menú nativo móvil.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-charcoal-900 border border-charcoal-700/60 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Camera className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-stone-200 text-sm">Diario Culinario</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Tabla `diario_cocinados` con registro empírico fotográfico y notas de sabor.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-charcoal-900 border border-charcoal-700/60 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-stone-200 text-sm">Motor Nutricional</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Conversión volumétrica por densidad g/ml y catálogo maestro de macros clínicos.
            </p>
          </div>
        </div>

        {/* Tablas Relacionales Listas */}
        <div className="mt-8 p-6 rounded-2xl bg-charcoal-900/60 border border-charcoal-700/80">
          <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4">
            Tablas Relacionales Diseñadas en Supabase (DDL & RLS)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { name: 'usuarios', desc: 'Perfiles + auth.users' },
              { name: 'recetas', desc: 'Metadatos y tiempos' },
              { name: 'ingredientes_maestro', desc: 'Densidad y macros' },
              { name: 'receta_ingredientes', desc: 'Volumen y pesos' },
              { name: 'pasos', desc: 'Guía secuencial' },
              { name: 'diario_cocinados', desc: 'Fotos y notas' },
            ].map((tbl) => (
              <div
                key={tbl.name}
                className="p-3 rounded-xl bg-charcoal-950/80 border border-charcoal-700/50 text-left"
              >
                <code className="text-amber-400 font-mono text-xs block font-bold">
                  {tbl.name}
                </code>
                <span className="text-[11px] text-stone-400 block mt-1">{tbl.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-6 border-t border-charcoal-700/40 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span>Recetario App &copy; 2026 — Modo Oscuro Gastronómico</span>
        <span>Ecosistema: Next.js 15 · Tailwind v4 · Zustand 5 · Supabase</span>
      </footer>
    </main>
  );
}
