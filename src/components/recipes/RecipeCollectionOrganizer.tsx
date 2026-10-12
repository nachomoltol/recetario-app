'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  X,
  Clock,
  ArrowRight,
  Coffee,
  UtensilsCrossed,
  Soup,
  Salad,
  Fish,
  Beef,
  Sparkles,
  Cake,
  Layers,
  Leaf,
  Wheat,
  Wine,
  BookOpen,
} from 'lucide-react';
import { Receta } from '@/types/recipe';
import { DeleteRecipeButton } from './DeleteRecipeButton';

export interface RecetaConIngredientes extends Receta {
  ingredientesNombres?: string[];
}

interface CategoryDef {
  id: string;
  nombre: string;
  icono: React.ElementType;
  color: string;
  badgeColor: string;
  match: (tags: string[], fullText: string, ingredients: string[]) => boolean;
}

function normalize(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Taxonomía ampliada y exhaustiva sin fallback genérico.
 * Las categorías se evalúan de forma independiente permitiendo el multi-tagging:
 * si una receta tiene Pollo y Pasta, se mostrará en ambas secciones.
 */
const CATEGORIAS_TAXONOMIA: CategoryDef[] = [
  {
    id: 'desayunos',
    nombre: 'Desayunos y Meriendas',
    icono: Coffee,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    badgeColor: 'bg-amber-100/70 text-amber-800 border-amber-200',
    match: (tags, text, ings) => {
      const regex = /desayuno|merienda|brunch|tostada|pancake|tortitas|porridge|avena|smoothie|bowl|crepe|gofre|cafe|café|muesli/i;
      return (
        tags.some((t) => regex.test(t)) ||
        regex.test(text) ||
        ings.some((i) => regex.test(i))
      );
    },
  },
  {
    id: 'carnes-aves',
    nombre: 'Carnes y Aves',
    icono: Beef,
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    badgeColor: 'bg-rose-100/70 text-rose-800 border-rose-200',
    match: (tags, text, ings) => {
      const regex = /carne|carnes|pollo|pavo|ternera|cerdo|ave|aves|hamburguesa|solomillo|costilla|alitas|chuleta|cordero|pato|conejo|bacon|panceta|picada|guanciale|jamon|jamón|lomo|chistorra|morcilla|chorizo/i;
      return (
        tags.some((t) => regex.test(t)) ||
        regex.test(text) ||
        ings.some((i) => regex.test(i))
      );
    },
  },
  {
    id: 'pescados-mariscos',
    nombre: 'Pescados y Mariscos',
    icono: Fish,
    color: 'text-cyan-700 bg-cyan-50 border-cyan-200',
    badgeColor: 'bg-cyan-100/70 text-cyan-800 border-cyan-200',
    match: (tags, text, ings) => {
      const regex = /pescado|pescados|marisco|mariscos|atun|atún|salmon|salmón|bacalao|merluza|gamba|gambas|langostino|langostinos|pulpo|calamar|calamares|mejillon|mejillones|anchoa|anchoas|sardina|sardinas|dorada|lubina|sepia|almeja|almejas|bonito|lubina|rodaballo|rape/i;
      return (
        tags.some((t) => regex.test(t)) ||
        regex.test(text) ||
        ings.some((i) => regex.test(i))
      );
    },
  },
  {
    id: 'pasta-arroces',
    nombre: 'Pasta y Arroces',
    icono: UtensilsCrossed,
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    badgeColor: 'bg-orange-100/70 text-orange-800 border-orange-200',
    match: (tags, text, ings) => {
      const regex = /pasta|pastas|arroz|arroces|risotto|paella|espagueti|espaguetis|macarron|macarrones|noodles|fideos|lasaña|lasana|canelones|gnocchi|ravioli|tallarines|penne|tagliatelle|fetuccine|rigatoni/i;
      return (
        tags.some((t) => regex.test(t)) ||
        regex.test(text) ||
        ings.some((i) => regex.test(i))
      );
    },
  },
  {
    id: 'legumbres-guisos',
    nombre: 'Legumbres y Guisos',
    icono: Layers,
    color: 'text-amber-800 bg-[#f7f2ea] border-[#e2d5c3]',
    badgeColor: 'bg-[#ede5d8] text-[#8e511c] border-[#d8cbbb]',
    match: (tags, text, ings) => {
      const regex = /legumbre|legumbres|guiso|guisos|estofado|estofados|lenteja|lentejas|garbanzo|garbanzos|alubia|alubias|judia|judías|fabada|puchero|potaje|cocido|chili|frijol|frijoles/i;
      return (
        tags.some((t) => regex.test(t)) ||
        regex.test(text) ||
        ings.some((i) => regex.test(i))
      );
    },
  },
  {
    id: 'sopas-cremas',
    nombre: 'Sopas, Cremas y Caldos',
    icono: Soup,
    color: 'text-yellow-800 bg-yellow-50 border-yellow-200',
    badgeColor: 'bg-yellow-100/70 text-yellow-800 border-yellow-200',
    match: (tags, text, ings) => {
      const regex = /sopa|sopas|crema|cremas|caldo|caldos|gazpacho|consome|consomé|salmorejo|veloute|velouté|ramen|minestrone|pure|puré|vichyssoise/i;
      return (
        tags.some((t) => regex.test(t)) ||
        regex.test(text) ||
        ings.some((i) => regex.test(i))
      );
    },
  },
  {
    id: 'ensaladas-entrantes',
    nombre: 'Ensaladas y Entrantes',
    icono: Salad,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    badgeColor: 'bg-emerald-100/70 text-emerald-800 border-emerald-200',
    match: (tags, text, ings) => {
      const regex = /ensalada|ensaladas|entrante|entrantes|aperitivo|aperitivos|tapa|tapas|carpaccio|tartar|ceviche|bruschetta|canapes|canapés|rollito|rollitos|croquetas/i;
      return (
        tags.some((t) => regex.test(t)) ||
        regex.test(text) ||
        ings.some((i) => regex.test(i))
      );
    },
  },
  {
    id: 'verduras-salteados',
    nombre: 'Verduras y Salteados',
    icono: Leaf,
    color: 'text-green-700 bg-green-50 border-green-200',
    badgeColor: 'bg-green-100/70 text-green-800 border-green-200',
    match: (tags, text, ings) => {
      const regex = /verdura|verduras|vegetal|vegetales|salteado|salteados|wok|pisto|escalivada|parrillada|champinon|champiñones|setas|esparrago|espárragos|calabacin|calabacín|berenjena|brocoli|brócoli|espinaca|espinacas|alcachofa|alcachofas|vegano|vegetariano/i;
      return (
        tags.some((t) => regex.test(t)) ||
        regex.test(text) ||
        ings.some((i) => regex.test(i))
      );
    },
  },
  {
    id: 'alinos-salsas',
    nombre: 'Aliños, Salsas y Dips',
    icono: Sparkles,
    color: 'text-[#a86224] bg-[#f4efe6] border-[#e7dfd5]',
    badgeColor: 'bg-[#ebdcc9] text-[#a86224] border-[#dfcbb3]',
    match: (tags, text, ings) => {
      const regex = /aliño|alino|aliños|salsa|salsas|guarnicion|guarnición|guarniciones|vinagreta|pesto|bechamel|mayonesa|chimichurri|guacamole|hummus|dip|dips|aderezo|marinada/i;
      return (
        tags.some((t) => regex.test(t)) ||
        regex.test(text) ||
        ings.some((i) => regex.test(i))
      );
    },
  },
  {
    id: 'panaderia-pizzas',
    nombre: 'Panadería, Masas y Pizzas',
    icono: Wheat,
    color: 'text-amber-800 bg-[#faf5ec] border-[#e8dac7]',
    badgeColor: 'bg-[#ede0ce] text-[#7d481b] border-[#dbc5ab]',
    match: (tags, text, ings) => {
      const regex = /pan|panaderia|panadería|masa|masas|pizza|pizzas|focaccia|empanada|empanadas|quiche|hojaldre|tacos|fajitas|wrap|wraps|arepas|bagel|brioche|tortilla de trigo/i;
      return (
        tags.some((t) => regex.test(t)) ||
        regex.test(text) ||
        ings.some((i) => regex.test(i))
      );
    },
  },
  {
    id: 'postres-dulces',
    nombre: 'Postres y Dulces',
    icono: Cake,
    color: 'text-pink-700 bg-pink-50 border-pink-200',
    badgeColor: 'bg-pink-100/70 text-pink-800 border-pink-200',
    match: (tags, text, ings) => {
      const regex = /postre|postres|dulce|dulces|tarta|tartas|bizcocho|bizcochos|pastel|pasteles|reposteria|repostería|galleta|galletas|chocolate|flan|mousse|brownie|cheesecake|helado|tiramisu|tiramisú|crema catalana/i;
      return (
        tags.some((t) => regex.test(t)) ||
        regex.test(text) ||
        ings.some((i) => regex.test(i))
      );
    },
  },
  {
    id: 'bebidas-batidos',
    nombre: 'Bebidas y Batidos',
    icono: Wine,
    color: 'text-purple-700 bg-purple-50 border-purple-200',
    badgeColor: 'bg-purple-100/70 text-purple-800 border-purple-200',
    match: (tags, text, ings) => {
      const regex = /bebida|bebidas|batido|batidos|zumo|zumos|smoothie|smoothies|coctel|cóctel|limonada|infusion|infusión|licor|sangria|sangría/i;
      return (
        tags.some((t) => regex.test(t)) ||
        regex.test(text) ||
        ings.some((i) => regex.test(i))
      );
    },
  },
];

interface RecipeCollectionOrganizerProps {
  recetas: RecetaConIngredientes[];
}

export function RecipeCollectionOrganizer({ recetas }: RecipeCollectionOrganizerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');

  // 1. FILTRADO EN EL CLIENTE EN TIEMPO REAL (Universal Search)
  // Busca en: título, nombres de ingredientes y etiquetas ocultas
  const filteredRecipes = useMemo(() => {
    const qNorm = normalize(searchQuery);
    if (!qNorm) return recetas;

    return recetas.filter((r) => {
      const titleNorm = normalize(r.titulo);
      const descNorm = normalize(r.descripcion || '');
      const tagsNorm = (r.etiquetas || []).map(normalize);
      const ingsNorm = (r.ingredientesNombres || []).map(normalize);

      const matchTitle = titleNorm.includes(qNorm);
      const matchDesc = descNorm.includes(qNorm);
      const matchTags = tagsNorm.some((t) => t.includes(qNorm));
      const matchIngs = ingsNorm.some((i) => i.includes(qNorm));

      return matchTitle || matchDesc || matchTags || matchIngs;
    });
  }, [recetas, searchQuery]);

  // 2. CATEGORIZACIÓN MÚLTIPLE (Multi-tagging) Y TAXONOMÍA DINÁMICA
  // Si una receta tiene pollo y pasta, se renderiza bajo 'Carnes y Aves' Y 'Pasta y Arroces'.
  // Solo se incluyen categorías que tengan al menos 1 receta. Sin fallback de "Otras Recetas".
  const populatedGroups = useMemo(() => {
    const groups: {
      category: CategoryDef;
      recetas: RecetaConIngredientes[];
    }[] = [];

    for (const catDef of CATEGORIAS_TAXONOMIA) {
      const matchingRecipes: RecetaConIngredientes[] = [];

      for (const r of filteredRecipes) {
        const tags = (r.etiquetas || []).map(normalize);
        const fullText = normalize(`${r.titulo || ''} ${r.descripcion || ''}`);
        const ings = (r.ingredientesNombres || []).map(normalize);

        if (catDef.match(tags, fullText, ings)) {
          matchingRecipes.push(r);
        }
      }

      // Dinámico: Solo renderizar si contiene al menos una receta
      if (matchingRecipes.length > 0) {
        groups.push({
          category: catDef,
          recetas: matchingRecipes,
        });
      }
    }

    return groups;
  }, [filteredRecipes]);

  // Grupos activos según el filtro de categoría seleccionado
  const activeGroups = useMemo(() => {
    if (selectedCategory === 'todas') return populatedGroups;
    return populatedGroups.filter((g) => g.category.id === selectedCategory);
  }, [populatedGroups, selectedCategory]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ============================================================== */}
      {/* 1. BUSCADOR UNIVERSAL EN TIEMPO REAL                           */}
      {/* ============================================================== */}
      <div className="space-y-2">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-stone-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Al buscar, volver a 'todas' para ver resultados en todas las categorías
              if (selectedCategory !== 'todas') {
                setSelectedCategory('todas');
              }
            }}
            placeholder="Buscar por receta, ingrediente (ej. pollo, tomate, pasta) o etiqueta..."
            className="w-full min-h-[54px] pl-12 pr-12 py-3.5 rounded-2xl bg-white border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27835]/30 focus:border-[#c27835] shadow-2xs transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="w-8 h-8 rounded-full bg-[#faf7f2] hover:bg-[#f4efe6] text-stone-500 absolute right-3 flex items-center justify-center transition cursor-pointer"
              title="Borrar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Feedback dinámico de la búsqueda activa */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between text-xs text-stone-500 px-1 pt-0.5">
            <span>
              Mostrando <strong>{filteredRecipes.length}</strong>{' '}
              {filteredRecipes.length === 1 ? 'receta encontrada' : 'recetas encontradas'} para{' '}
              <strong className="text-stone-800">&ldquo;{searchQuery}&rdquo;</strong>
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[#a86224] hover:underline font-semibold cursor-pointer"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. SELECTOR DE CATEGORÍAS POBLADAS (DINÁMICO)                  */}
      {/* ============================================================== */}
      {populatedGroups.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('todas')}
            className={`min-h-[42px] px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'todas'
                ? 'bg-[#a86224] text-white shadow-xs'
                : 'bg-white hover:bg-[#faf7f2] text-stone-700 border border-[#e7dfd5]'
            }`}
          >
            <span>Todas ({filteredRecipes.length})</span>
          </button>

          {populatedGroups.map(({ category, recetas: groupRecetas }) => {
            const IconComponent = category.icono;
            const isSelected = selectedCategory === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`min-h-[42px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#a86224] text-white shadow-xs'
                    : 'bg-white hover:bg-[#faf7f2] text-stone-700 border border-[#e7dfd5]'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5 shrink-0" />
                <span>{category.nombre}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#faf7f2] text-stone-500'
                  }`}
                >
                  {groupRecetas.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. ESTADO VACÍO CUANDO NO HAY COINCIDENCIAS                    */}
      {/* ============================================================== */}
      {filteredRecipes.length === 0 && searchQuery.trim() && (
        <div className="p-10 text-center rounded-3xl bg-white border border-dashed border-[#e7dfd5] space-y-3 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-900 font-serif-recipe">
              No se encontraron recetas con &ldquo;{searchQuery}&rdquo;
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto">
              Prueba buscando por otro ingrediente (ej. pollo, arroz, tomate) o por el nombre del plato.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 rounded-xl bg-[#a86224] hover:bg-[#8e511c] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            Ver todas las recetas
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. SECCIONES SEMÁNTICAS MULTI-TAGGING (SOLO POBLADAS)          */}
      {/* ============================================================== */}
      <div className="space-y-10">
        {activeGroups.map(({ category, recetas: groupRecetas }) => {
          const IconComponent = category.icono;

          return (
            <section key={category.id} className="space-y-4 animate-fade-in">
              {/* Encabezado de la categoría poblada */}
              <div className="flex items-center justify-between border-b border-[#e7dfd5] pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${category.color}`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900 leading-tight">
                      {category.nombre}
                    </h2>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${category.badgeColor}`}
                >
                  {groupRecetas.length} {groupRecetas.length === 1 ? 'receta' : 'recetas'}
                </span>
              </div>

              {/* Cuadrícula de recetas de esta categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {groupRecetas.map((r) => (
                  <div
                    key={`${category.id}-${r.id}`}
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
