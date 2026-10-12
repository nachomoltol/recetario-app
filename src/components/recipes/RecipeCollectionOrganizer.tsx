'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Clock,
  ArrowRight,
  Coffee,
  UtensilsCrossed,
  Soup,
  Salad,
  Flame,
  Fish,
  Beef,
  Sparkles,
  Cake,
  Layers,
  BookOpen,
} from 'lucide-react';
import { Receta } from '@/types/recipe';
import { DeleteRecipeButton } from './DeleteRecipeButton';

interface CategoryDef {
  id: string;
  nombre: string;
  icono: React.ElementType;
  color: string;
  match: (tags: string[], text: string) => boolean;
}

const CATEGORIAS_ESTRUCTURALES: CategoryDef[] = [
  {
    id: 'desayunos',
    nombre: 'Desayunos y Meriendas',
    icono: Coffee,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    match: (tags, text) =>
      tags.some((t) => /desayuno|merienda|brunch|tostada|pancake|porridge|avena|smoothie/i.test(t)) ||
      /desayuno|merienda|brunch|tostada|pancake|porridge|avena/i.test(text),
  },
  {
    id: 'pasta-arroces',
    nombre: 'Pasta y Arroces',
    icono: UtensilsCrossed,
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    match: (tags, text) =>
      tags.some((t) => /pasta|arroz|arroces|risotto|paella|espagueti|macarron|noodles|fideos|lasaña|gnocchi/i.test(t)) ||
      /pasta|arroz|risotto|paella|espagueti|macarr|noodles|fideos|lasaña|gnocchi/i.test(text),
  },
  {
    id: 'legumbres-guisos',
    nombre: 'Legumbres y Guisos',
    icono: Layers,
    color: 'text-amber-800 bg-[#f7f2ea] border-[#e2d5c3]',
    match: (tags, text) =>
      tags.some((t) => /legumbre|guiso|estofado|lenteja|garbanzo|alubia|judía|puchero|cocido/i.test(t)) ||
      /legumbre|guiso|estofado|lenteja|garbanzo|alubia|judía|puchero|cocido/i.test(text),
  },
  {
    id: 'ensaladas-entrantes',
    nombre: 'Ensaladas y Entrantes',
    icono: Salad,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    match: (tags, text) =>
      tags.some((t) => /ensalada|entrante|aperitivo|tapa|carpaccio|tartar|bruschetta|dip/i.test(t)) ||
      /ensalada|entrante|aperitivo|tapa|carpaccio|tartar/i.test(text),
  },
  {
    id: 'sopas-cremas',
    nombre: 'Sopas y Cremas',
    icono: Soup,
    color: 'text-yellow-800 bg-yellow-50 border-yellow-200',
    match: (tags, text) =>
      tags.some((t) => /sopa|crema|caldo|gazpacho|consomé|salmorejo|velouté/i.test(t)) ||
      /sopa|crema|caldo|gazpacho|consomé|salmorejo/i.test(text),
  },
  {
    id: 'carnes-aves',
    nombre: 'Carnes y Aves',
    icono: Beef,
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    match: (tags, text) =>
      tags.some((t) => /carne|pollo|pavo|ternera|cerdo|ave|hamburguesa|solomillo|costilla|alitas/i.test(t)) ||
      /carne|pollo|pavo|ternera|cerdo|ave|hamburguesa|solomillo/i.test(text),
  },
  {
    id: 'pescados-mariscos',
    nombre: 'Pescados y Mariscos',
    icono: Fish,
    color: 'text-cyan-700 bg-cyan-50 border-cyan-200',
    match: (tags, text) =>
      tags.some((t) => /pescado|marisco|atún|atun|salmón|salmon|bacalao|merluza|gamba|langostino|pulpo|calamar/i.test(t)) ||
      /pescado|marisco|atún|salmón|bacalao|merluza|gamba/i.test(text),
  },
  {
    id: 'alinos-salsas',
    nombre: 'Aliños, Salsas y Guarniciones',
    icono: Sparkles,
    color: 'text-[#a86224] bg-[#f4efe6] border-[#e7dfd5]',
    match: (tags, text) =>
      tags.some((t) => /aliño|alino|salsa|guarnición|guarnicion|vinagreta|pesto|bechamel|mayonesa/i.test(t)) ||
      /aliño|salsa|guarnición|vinagreta|pesto|bechamel/i.test(text),
  },
  {
    id: 'postres-dulces',
    nombre: 'Postres y Dulces',
    icono: Cake,
    color: 'text-pink-700 bg-pink-50 border-pink-200',
    match: (tags, text) =>
      tags.some((t) => /postre|dulce|tarta|bizcocho|pastel|repostería|galleta|chocolate|flan|helado/i.test(t)) ||
      /postre|dulce|tarta|bizcocho|pastel|repostería|chocolate|flan/i.test(text),
  },
];

interface RecipeCollectionOrganizerProps {
  recetas: Receta[];
}

export function RecipeCollectionOrganizer({ recetas }: RecipeCollectionOrganizerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');

  // Clasificación de cada receta en su categoría estructural correspondiente
  const groupedCategories = useMemo(() => {
    const groups: {
      category: CategoryDef | { id: string; nombre: string; icono: React.ElementType; color: string };
      recetas: Receta[];
    }[] = [];

    const assignedIds = new Set<string>();

    for (const catDef of CATEGORIAS_ESTRUCTURALES) {
      const matches: Receta[] = [];
      for (const r of recetas) {
        if (assignedIds.has(r.id)) continue;
        const tags = r.etiquetas || [];
        const fullText = `${r.titulo || ''} ${r.descripcion || ''}`;
        if (catDef.match(tags, fullText)) {
          matches.push(r);
          assignedIds.add(r.id);
        }
      }

      if (matches.length > 0) {
        groups.push({
          category: catDef,
          recetas: matches,
        });
      }
    }

    // Recetas no asignadas -> "Otras Recetas"
    const remaining = recetas.filter((r) => !assignedIds.has(r.id));
    if (remaining.length > 0) {
      groups.push({
        category: {
          id: 'otras',
          nombre: 'Otras Recetas',
          icono: UtensilsCrossed,
          color: 'text-stone-700 bg-stone-100 border-stone-200',
        },
        recetas: remaining,
      });
    }

    return groups;
  }, [recetas]);

  const activeGroups = useMemo(() => {
    if (selectedCategory === 'todas') return groupedCategories;
    return groupedCategories.filter((g) => g.category.id === selectedCategory);
  }, [groupedCategories, selectedCategory]);

  if (recetas.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Selector / Filtro rápido de categorías semánticas */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategory('todas')}
          className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            selectedCategory === 'todas'
              ? 'bg-[#a86224] text-white shadow-xs'
              : 'bg-white hover:bg-[#faf7f2] text-stone-700 border border-[#e7dfd5]'
          }`}
        >
          <span>Todas ({recetas.length})</span>
        </button>

        {groupedCategories.map(({ category, recetas: groupRecetas }) => {
          const IconComponent = category.icono;
          const isSelected = selectedCategory === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-[#a86224] text-white shadow-xs'
                  : 'bg-white hover:bg-[#faf7f2] text-stone-700 border border-[#e7dfd5]'
              }`}
            >
              <IconComponent className="w-3.5 h-3.5 shrink-0" />
              <span>{category.nombre}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
              }`}>
                {groupRecetas.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Renderizado de Secciones Estructurales Semánticas */}
      <div className="space-y-10">
        {activeGroups.map(({ category, recetas: groupRecetas }) => {
          const IconComponent = category.icono;

          return (
            <section key={category.id} className="space-y-4 animate-fade-in">
              {/* Encabezado semántico de categoría */}
              <div className="flex items-center justify-between border-b border-[#e7dfd5] pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${category.color}`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900 leading-tight">
                      {category.nombre}
                    </h2>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
                  {groupRecetas.length} {groupRecetas.length === 1 ? 'receta' : 'recetas'}
                </span>
              </div>

              {/* Cuadrícula de recetas de esta categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {groupRecetas.map((r) => (
                  <div
                    key={r.id}
                    className="group rounded-3xl bg-white border border-[#e7dfd5] hover:border-[#a86224] hover:shadow-xs transition-all p-5 space-y-3.5 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-[#f4efe6] text-[#a86224] font-bold uppercase tracking-wider text-[10px]">
                            {r.fuente_tipo}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-600 capitalize text-[11px]">
                            {r.dificultad}
                          </span>
                        </div>

                        <DeleteRecipeButton
                          recipeId={r.id}
                          recipeTitle={r.titulo}
                          variant="icon"
                          className="w-7 h-7 rounded-lg"
                        />
                      </div>

                      <Link
                        href={`/recipes/${r.id}`}
                        className="block group-hover:text-[#a86224] transition-colors"
                      >
                        <h3 className="font-bold text-stone-900 font-serif-recipe text-lg leading-snug line-clamp-2">
                          {r.titulo}
                        </h3>
                      </Link>

                      {r.descripcion && (
                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed font-light">
                          {r.descripcion}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#f4efe6] flex items-center justify-between text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#a86224]" /> {r.tiempo_total_min || 15} min
                      </span>
                      <Link
                        href={`/recipes/${r.id}`}
                        className="text-[#a86224] hover:text-[#8e511c] font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Abrir receta</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
