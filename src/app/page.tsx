import Link from 'next/link';
import { BookOpen, Sparkles, Share2, Camera, Database, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col justify-between p-6 sm:p-12 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#e7dfd5] pb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900 font-serif-recipe">
              Recetario Inteligente
            </h1>
            <p className="text-xs text-stone-500">
              Minimalismo Luminoso · Modo Cocina Mobile-First
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-stone-700 hover:text-stone-900 hover:bg-[#f4efe6] transition flex items-center"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/register"
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#a86224] hover:bg-[#8e511c] shadow-xs transition flex items-center"
          >
            Crear Cuenta
          </Link>
        </div>
      </header>

      {/* Hero / State Validation */}
      <section className="py-12 sm:py-16 space-y-8">
        <div className="max-w-2xl space-y-4">
          <span className="text-[#a86224] font-semibold text-xs tracking-wider uppercase">
            Plataforma Culinaria y Nutricional
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 font-serif-recipe leading-tight">
            Estandarización de recetas y sustituciones saludables bajo demanda.
          </h2>
          <p className="text-base sm:text-lg text-stone-600 leading-relaxed font-light">
            Convierte enlaces de TikTok, Reels o YouTube en fichas culinarias estructuradas.
            Diseñada especialmente para cocinar desde el móvil, con touch targets amplios y alta legibilidad.
          </p>

          <div className="pt-2 flex items-center gap-4">
            <Link
              href="/recipes"
              className="min-h-[50px] px-6 py-3 rounded-2xl text-sm sm:text-base font-semibold text-white bg-[#a86224] hover:bg-[#8e511c] shadow-sm transition inline-flex items-center gap-2"
            >
              <span>Acceder a Mis Recetas</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Pilares Funcionales Orgánicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div className="p-6 rounded-3xl bg-white border border-[#e7dfd5] space-y-3 shadow-2xs">
            <div className="w-10 h-10 rounded-2xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-stone-900 font-serif-recipe text-base">Ingesta con IA</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Extracción precisa de ingredientes y pasos desde vídeos y textos con Gemini Flash.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#e7dfd5] space-y-3 shadow-2xs">
            <div className="w-10 h-10 rounded-2xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-stone-900 font-serif-recipe text-base">Web Share PWA</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Envía vídeos a la app desde el menú nativo de tu teléfono con un solo toque.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#e7dfd5] space-y-3 shadow-2xs">
            <div className="w-10 h-10 rounded-2xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-stone-900 font-serif-recipe text-base">Diario Visual</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Guarda fotos reales de tus platos, notas de sabor y puntuación en Supabase Storage.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#e7dfd5] space-y-3 shadow-2xs">
            <div className="w-10 h-10 rounded-2xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-stone-900 font-serif-recipe text-base">Sustitución IA</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Botón bajo demanda junto a cada ingrediente para consultar alternativas saludables.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-6 border-t border-[#e7dfd5] text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span>Recetario App &copy; 2026 — Lino & Minimalismo Luminoso</span>
        <span>Ecosistema: Next.js 15 · Tailwind CSS · Zustand · Supabase · Gemini</span>
      </footer>
    </main>
  );
}
