'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Eye, Clock, Utensils, ArrowRight, BookOpen } from 'lucide-react';
import { Receta } from '@/types/recipe';
import { DeleteRecipeButton } from './DeleteRecipeButton';
import { useLanguageStore } from '@/stores/useLanguageStore';

interface HomeRecentRecipesSectionProps {
  recetas: Receta[];
}

export function HomeRecentRecipesSection({ recetas }: HomeRecentRecipesSectionProps) {
  const t = useLanguageStore((s) => s.t);
  // Estado local para alternar pestañas: recuerda la última pestaña seleccionada
  const [activeTab, setActiveTab] = useState<'capturada' | 'vista'>('capturada');
  const [lastViewedId, setLastViewedId] = useState<string | null>(null);

  // Cargar pestaña guardada y última receta vista desde localStorage
  useEffect(() => {
    try {
      const savedTab = localStorage.getItem('home_recent_tab') as 'capturada' | 'vista' | null;
      if (savedTab === 'capturada' || savedTab === 'vista') {
        setActiveTab(savedTab);
      }
      const stored = localStorage.getItem('ultima_receta_vista_id');
      if (stored) {
        setLastViewedId(stored);
      }
    } catch {}
  }, []);

  // Escuchar evento de nueva receta capturada para saltar a 'capturada' automáticamente
  useEffect(() => {
    const handleRecipeCaptured = () => {
      setActiveTab('capturada');
      try {
        localStorage.setItem('home_recent_tab', 'capturada');
      } catch {}
    };

    window.addEventListener('recipe-captured', handleRecipeCaptured);
    return () => {
      window.removeEventListener('recipe-captured', handleRecipeCaptured);
    };
  }, []);

  const handleSelectTab = (tab: 'capturada' | 'vista') => {
    setActiveTab(tab);
    try {
      localStorage.setItem('home_recent_tab', tab);
    } catch {}
  };

  const ultimaCapturada = recetas && recetas.length > 0 ? recetas[0] : null;
  const ultimaVista = lastViewedId
    ? recetas.find((r) => r.id === lastViewedId) || null
    : null;

  // Si no hay ninguna receta capturada ni vista
  if (!ultimaCapturada && !ultimaVista) {
    return null;
  }

  const recipeToShow = activeTab === 'vista' ? (ultimaVista || ultimaCapturada) : ultimaCapturada;

  if (!recipeToShow) {
    return null;
  }

  return (
    <section className="space-y-4 scroll-mt-24 outline-none" id="ultima-receta" tabIndex={-1}>
      {/* Controles Toggle / Tabs de acceso directo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center p-1 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] w-full sm:w-auto shadow-2xs">
          <button
            type="button"
            onClick={() => handleSelectTab('capturada')}
            className={`flex-1 sm:flex-none min-h-[42px] px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'capturada'
                ? 'bg-white text-stone-900 shadow-xs border border-[#e7dfd5]'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#a86224]" />
            <span>{t('capture_tab_latest')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('vista')}
            className={`flex-1 sm:flex-none min-h-[42px] px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'vista'
                ? 'bg-white text-stone-900 shadow-xs border border-[#e7dfd5]'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[#a86224]" />
            <span>{t('capture_tab_viewed')}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-400 self-end sm:self-auto">
          {activeTab === 'vista' && !ultimaVista && (
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Sin visitas registradas en este navegador (mostrando última capturada)
            </span>
          )}
          <span>{new Date(recipeToShow.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Tarjeta de previsualización de la receta seleccionada */}
      <div className="group rounded-3xl bg-white border-2 border-[#e7dfd5] hover:border-[#a86224] transition-all p-6 sm:p-7 shadow-xs space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5] font-bold uppercase tracking-wider text-[10px]">
                {recipeToShow.fuente_tipo}
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-stone-100 text-stone-700 capitalize text-[11px]">
                {recipeToShow.dificultad}
              </span>
              {activeTab === 'vista' && ultimaVista && (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Visitada
                </span>
              )}
            </div>

            <DeleteRecipeButton
              recipeId={recipeToShow.id}
              recipeTitle={recipeToShow.titulo}
              variant="icon"
              className="w-8 h-8 rounded-xl"
            />
          </div>

          <Link
            href={`/recipes/${recipeToShow.id}`}
            className="block group-hover:text-[#a86224] transition-colors"
          >
            <h2 className="font-bold text-stone-900 font-serif-recipe text-2xl sm:text-3xl leading-snug">
              {recipeToShow.titulo}
            </h2>
          </Link>

          {recipeToShow.descripcion && (
            <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed font-light">
              {recipeToShow.descripcion}
            </p>
          )}

          {/* Categorías y etiquetas */}
          {recipeToShow.etiquetas && recipeToShow.etiquetas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {recipeToShow.etiquetas.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#faf7f2] text-stone-700 border border-[#e7dfd5]"
                >
                  {tag}
                </span>
              ))}
              {recipeToShow.etiquetas.length > 4 && (
                <span className="text-[11px] text-stone-400 font-medium self-center">
                  +{recipeToShow.etiquetas.length - 4} más
                </span>
              )}
            </div>
          )}
        </div>

        {/* Barra de acción rápida mobile-first */}
        <div className="pt-4 border-t border-[#f4efe6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs sm:text-sm text-stone-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#a86224]" /> {recipeToShow.tiempo_total_min || 15} min
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-[#a86224]" /> {recipeToShow.porciones} porciones
            </span>
          </div>

          <Link
            href={`/recipes/${recipeToShow.id}`}
            className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-[#a86224] hover:bg-[#8e511c] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
          >
            <span>Ver receta en modo cocina</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
