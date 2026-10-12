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
interface CategoryConfig {
  id: string;
  nombre: string;
  icono: React.ElementType;
  color: string;
  badgeColor: string;
  keywords: string[];
}
/**
 * 12 Categorías estructurales con arrays literales explícitos de palabras clave en minúsculas.
 * Sin Expresiones Regulares: matching estrictamente determinista por intersección de arrays.
 */
const CATEGORIAS_CONFIG: CategoryConfig[] = [
  {
    id: 'desayunos',
    nombre: 'Desayunos y Meriendas',
    icono: Coffee,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    badgeColor: 'bg-amber-100/70 text-amber-800 border-amber-200',
    keywords: [
      'desayuno',
      'desayunos',
      'merienda',
      'meriendas',
      'brunch',
      'tostada',
      'tostadas',
      'pancake',
      'pancakes',
      'tortitas',
      'porridge',
      'avena',
      'smoothie',
      'bowl',
      'crepe',
      'crepes',
      'gofre',
      'gofres',
      'muesli',
      'snack_saludable',
      'alta_fibra',
    ],
  },
  {
    id: 'carnes-aves',
    nombre: 'Carnes y Aves',
    icono: Beef,
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    badgeColor: 'bg-rose-100/70 text-rose-800 border-rose-200',
    keywords: [
      'carne',
      'carnes',
      'pollo',
      'pavo',
      'ternera',
      'cerdo',
      'ave',
      'aves',
      'hamburguesa',
      'hamburguesas',
      'solomillo',
      'costilla',
      'costillas',
      'alitas',
      'chuleta',
      'chuletas',
      'cordero',
      'pato',
      'conejo',
      'bacon',
      'panceta',
      'picada',
      'guanciale',
      'jamon',
      'jamón',
      'lomo',
      'chistorra',
      'morcilla',
      'chorizo',
      'choriqueso',
      'alambre',
    ],
  },
  {
    id: 'pescados-mariscos',
    nombre: 'Pescados y Mariscos',
    icono: Fish,
    color: 'text-cyan-700 bg-cyan-50 border-cyan-200',
    badgeColor: 'bg-cyan-100/70 text-cyan-800 border-cyan-200',
    keywords: [
      'pescado',
      'pescados',
      'marisco',
      'mariscos',
      'atun',
      'atún',
      'salmon',
      'salmón',
      'bacalao',
      'merluza',
      'gamba',
      'gambas',
      'langostino',
      'langostinos',
      'pulpo',
      'calamar',
      'calamares',
      'mejillon',
      'mejillones',
      'anchoa',
      'anchoas',
      'sardina',
      'sardinas',
      'dorada',
      'lubina',
      'sepia',
      'almeja',
      'almejas',
      'bonito',
      'rape',
      'rodaballo',
    ],
  },
  {
    id: 'pasta-arroces',
    nombre: 'Pasta y Arroces',
    icono: UtensilsCrossed,
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    badgeColor: 'bg-orange-100/70 text-orange-800 border-orange-200',
    keywords: [
      'pasta',
      'pastas',
      'arroz',
      'arroces',
      'risotto',
      'paella',
      'espagueti',
      'espaguetis',
      'macarron',
      'macarrones',
      'noodles',
      'fideos',
      'lasaña',
      'lasana',
      'canelones',
      'gnocchi',
      'ravioli',
      'tallarines',
      'penne',
      'tagliatelle',
      'fetuccine',
      'rigatoni',
      'cocina_romana',
      'romana',
      'comida_italiana',
      'italiana',
    ],
  },
  {
    id: 'legumbres-guisos',
    nombre: 'Legumbres y Guisos',
    icono: Layers,
    color: 'text-amber-800 bg-[#f7f2ea] border-[#e2d5c3]',
    badgeColor: 'bg-[#ede5d8] text-[#8e511c] border-[#d8cbbb]',
    keywords: [
      'legumbre',
      'legumbres',
      'guiso',
      'guisos',
      'estofado',
      'estofados',
      'lenteja',
      'lentejas',
      'garbanzo',
      'garbanzos',
      'alubia',
      'alubias',
      'judia',
      'judias',
      'judía',
      'judías',
      'fabada',
      'puchero',
      'potaje',
      'cocido',
      'chili',
      'frijol',
      'frijoles',
    ],
  },
  {
    id: 'sopas-cremas',
    nombre: 'Sopas, Cremas y Caldos',
    icono: Soup,
    color: 'text-yellow-800 bg-yellow-50 border-yellow-200',
    badgeColor: 'bg-yellow-100/70 text-yellow-800 border-yellow-200',
    keywords: [
      'sopa',
      'sopas',
      'crema',
      'cremas',
      'caldo',
      'caldos',
      'gazpacho',
      'consome',
      'consomé',
      'salmorejo',
      'veloute',
      'velouté',
      'ramen',
      'minestrone',
      'pure',
      'puré',
      'vichyssoise',
      'sopadepollo',
      'sopacasera',
      'caldodepollo',
    ],
  },
  {
    id: 'ensaladas-entrantes',
    nombre: 'Ensaladas y Entrantes',
    icono: Salad,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    badgeColor: 'bg-emerald-100/70 text-emerald-800 border-emerald-200',
    keywords: [
      'ensalada',
      'ensaladas',
      'entrante',
      'entrantes',
      'aperitivo',
      'aperitivos',
      'tapa',
      'tapas',
      'botana',
      'carpaccio',
      'tartar',
      'ceviche',
      'bruschetta',
      'canapes',
      'canapés',
      'rollito',
      'rollitos',
      'croqueta',
      'croquetas',
    ],
  },
  {
    id: 'verduras-salteados',
    nombre: 'Verduras y Salteados',
    icono: Leaf,
    color: 'text-green-700 bg-green-50 border-green-200',
    badgeColor: 'bg-green-100/70 text-green-800 border-green-200',
    keywords: [
      'verdura',
      'verduras',
      'vegetal',
      'vegetales',
      'salteado',
      'salteados',
      'wok',
      'pisto',
      'escalivada',
      'parrillada',
      'champinon',
      'champiñones',
      'setas',
      'esparrago',
      'espárragos',
      'calabacin',
      'calabacín',
      'berenjena',
      'brocoli',
      'brócoli',
      'espinaca',
      'espinacas',
      'alcachofa',
      'alcachofas',
      'vegano',
      'vegetariano',
    ],
  },
  {
    id: 'alinos-salsas',
    nombre: 'Aliños, Salsas y Dips',
    icono: Sparkles,
    color: 'text-[#a86224] bg-[#f4efe6] border-[#e7dfd5]',
    badgeColor: 'bg-[#ebdcc9] text-[#a86224] border-[#dfcbb3]',
    keywords: [
      'aliño',
      'aliños',
      'alino',
      'salsa',
      'salsas',
      'guarnicion',
      'guarnición',
      'guarniciones',
      'vinagreta',
      'pesto',
      'bechamel',
      'mayonesa',
      'chimichurri',
      'guacamole',
      'hummus',
      'dip',
      'dips',
      'aderezo',
      'marinada',
    ],
  },
  {
    id: 'panaderia-pizzas',
    nombre: 'Panadería, Masas y Pizzas',
    icono: Wheat,
    color: 'text-amber-800 bg-[#faf5ec] border-[#e8dac7]',
    badgeColor: 'bg-[#ede0ce] text-[#7d481b] border-[#dbc5ab]',
    keywords: [
      'pan',
      'panaderia',
      'panadería',
      'masa',
      'masas',
      'pizza',
      'pizzas',
      'focaccia',
      'empanada',
      'empanadas',
      'quiche',
      'hojaldre',
      'tacos',
      'fajitas',
      'wrap',
      'wraps',
      'arepas',
      'bagel',
      'brioche',
    ],
  },
  {
    id: 'postres-dulces',
    nombre: 'Postres y Dulces',
    icono: Cake,
    color: 'text-pink-700 bg-pink-50 border-pink-200',
    badgeColor: 'bg-pink-100/70 text-pink-800 border-pink-200',
    keywords: [
      'postre',
      'postres',
      'postres y dulces',
      'dulce',
      'dulces',
      'tarta',
      'tartas',
      'bizcocho',
      'bizcochos',
      'pastel',
      'pasteles',
      'reposteria',
      'repostería',
      'galleta',
      'galletas',
      'galletitas',
      'flan',
      'mousse',
      'brownie',
      'cheesecake',
      'helado',
      'tiramisu',
      'tiramisú',
      'crema catalana',
      'natillas',
      'snack_saludable',
    ],
  },
  {
    id: 'bebidas-batidos',
    nombre: 'Bebidas y Batidos',
    icono: Wine,
    color: 'text-purple-700 bg-purple-50 border-purple-200',
    badgeColor: 'bg-purple-100/70 text-purple-800 border-purple-200',
    keywords: [
      'bebida',
      'bebidas',
      'batido',
      'batidos',
      'zumo',
      'zumos',
      'smoothie',
      'smoothies',
      'coctel',
      'cóctel',
      'limonada',
      'infusion',
      'infusión',
      'licor',
      'sangria',
      'sangría',
    ],
  },
];
/**
 * Regla 2: Matching por Intersección Matemática de Arrays (Sin Regex).
 * Extrae recipe.etiquetas (en minúsculas) y comprueba intersección directa con category.keywords.
 * Si la intersección es nula, la receta no entra.
 */
function recipeMatchesCategory(
  tags: string[] | undefined,
  keywords: string[]
): boolean {
  if (!Array.isArray(tags) || tags.length === 0) return false;
  const lowerTags = tags.map((t) => t.toLowerCase().trim());
  return lowerTags.some((tag) => keywords.includes(tag));
}
interface RecipeCollectionOrganizerProps {
  recetas: RecetaConIngredientes[];
  userProfile?: {
    nivel_culinario?: string | null;
    preferencias_dieteticas?: string[] | null;
    alergenos?: string[] | null;
  } | null;
}
export function RecipeCollectionOrganizer({
  recetas,
  userProfile,
}: RecipeCollectionOrganizerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<string>('Todas');
  const tieneAdaptacionClinica = Boolean(
    (userProfile?.preferencias_dieteticas &&
      userProfile.preferencias_dieteticas.length > 0) ||
      (userProfile?.alergenos && userProfile.alergenos.length > 0) ||
      userProfile?.nivel_culinario === 'Principiante' ||
      userProfile?.nivel_culinario === 'Avanzado'
  );
  // Independencia del buscador: Busca en título, descripción, etiquetas e ingredientes
  const filteredRecipes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return recetas;
    return recetas.filter((r) => {
      const matchTitle = (r.titulo || '').toLowerCase().includes(q);
      const matchDesc = (r.descripcion || '').toLowerCase().includes(q);
      const matchTags = (r.etiquetas || []).some((t) =>
        t.toLowerCase().includes(q)
      );
      const matchIngs = (r.ingredientesNombres || []).some((i) =>
        i.toLowerCase().includes(q)
      );
      return matchTitle || matchDesc || matchTags || matchIngs;
    });
  }, [recetas, searchQuery]);
  // Lista ordenada alfabéticamente (A-Z) para la vista 'Todas'
  const allSortedRecipes = useMemo(() => {
    return [...filteredRecipes].sort((a, b) =>
      a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' })
    );
  }, [filteredRecipes]);
  // Categorías que tienen al menos 1 receta (matching estricto por tags)
  const populatedCategories = useMemo(() => {
    return CATEGORIAS_CONFIG.map((cat) => {
      const matching = filteredRecipes.filter((r) =>
        recipeMatchesCategory(r.etiquetas, cat.keywords)
      );
      return {
        category: cat,
        recetas: matching,
      };
    }).filter((g) => g.recetas.length > 0);
  }, [filteredRecipes]);
  // Tarjeta de receta modular
  const renderRecipeCard = (r: RecetaConIngredientes) => (
    <div
      key={r.id}
      className="group rounded-3xl bg-white border border-[#e7dfd5] hover:border-[#a86224] hover:shadow-xs transition-all p-5 space-y-3.5 flex flex-col justify-between"
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-semibold gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-lg bg-[#f4efe6] text-[#a86224] font-bold uppercase tracking-wider text-[10px]">
              {r.fuente_tipo}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-600 capitalize text-[11px]">
              {r.dificultad}
            </span>
            {tieneAdaptacionClinica && (
              <span
                className="px-2 py-0.5 rounded-lg bg-amber-50 text-[#a86224] border border-amber-200/80 text-[10px] font-semibold flex items-center gap-1 shadow-2xs"
                title="Esta receta cuenta con adaptación personalizada según tu perfil de salud y nivel"
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Adaptable con IA</span>
                <span className="sm:hidden">Adaptable</span>
              </span>
            )}
          </div>
          <DeleteRecipeButton
            recipeId={r.id}
            recipeTitle={r.titulo}
            variant="icon"
            className="w-7 h-7 rounded-lg shrink-0"
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
        {r.etiquetas && r.etiquetas.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {r.etiquetas.slice(0, 3).map((tag, tIdx) => (
              <span
                key={tIdx}
                className="text-[10px] font-medium text-stone-500 bg-[#faf7f2] px-2 py-0.5 rounded-md border border-[#e7dfd5]/60"
              >
                #{tag.replace(/^#/, '')}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="pt-3 border-t border-[#f4efe6] flex items-center justify-between text-xs text-stone-500">
        <span className="flex items-center gap-1 font-medium">
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
  );
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. BUSCADOR UNIVERSAL */}
      <div className="space-y-2">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-stone-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Si el usuario busca texto, restablecer a 'Todas' para mostrar toda la cuadrícula coincidente
              if (filtroActivo !== 'Todas') {
                setFiltroActivo('Todas');
              }
            }}
            placeholder="Buscar por receta, ingrediente (ej. pollo, ajo, tomate) o etiqueta..."
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
      {/* 2. SELECTOR DE PESTAÑAS (TODAS + CATEGORÍAS) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
        <button
          type="button"
          onClick={() => setFiltroActivo('Todas')}
          className={`min-h-[42px] px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            filtroActivo === 'Todas'
              ? 'bg-[#a86224] text-white shadow-xs'
              : 'bg-white hover:bg-[#faf7f2] text-stone-700 border border-[#e7dfd5]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          <span>Todas ({filteredRecipes.length})</span>
          <span className="text-[9px] opacity-75 font-mono ml-0.5">v.2.0</span>
        </button>
        {populatedCategories.map(({ category, recetas: groupRecetas }) => {
          const IconComponent = category.icono;
          const isSelected = filtroActivo === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setFiltroActivo(category.id)}
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
      {/* 3. ESTADO VACÍO CUANDO NO HAY COINCIDENCIAS */}
      {filteredRecipes.length === 0 && (
        <div className="p-10 text-center rounded-3xl bg-white border border-dashed border-[#e7dfd5] space-y-3 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] text-[#a86224] flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-900 font-serif-recipe">
              No se encontraron recetas
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto">
              Prueba buscando por otro ingrediente o término de cocina.
            </p>
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl bg-[#a86224] hover:bg-[#8e511c] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              Ver todas las recetas
            </button>
          )}
        </div>
      )}
      {/* ============================================================== */}
      {/* 4. CONDICIONAL ESTRICTO: VISTA 'TODAS' vs VISTA POR CATEGORÍA */}
      {/* ============================================================== */}
      {filteredRecipes.length > 0 && (
        filtroActivo === 'Todas' ? (
          /* REGLA 1: Renderizar UN SOLO <div className="grid"> mapeando allSortedRecipes sin ningún encabezado de sección */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
            {allSortedRecipes.map((r) => renderRecipeCard(r))}
          </div>
        ) : (
          /* VISTA DE SECCIÓN POR CATEGORÍA SELECCIONADA */
          (() => {
            const activeGroup = populatedCategories.find(
              (g) => g.category.id === filtroActivo
            );
            if (!activeGroup || activeGroup.recetas.length === 0) {
              return (
                <div className="p-8 text-center rounded-3xl bg-white border border-[#e7dfd5] space-y-2">
                  <p className="text-sm text-stone-600">
                    No hay recetas en esta categoría para la búsqueda actual.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFiltroActivo('Todas')}
                    className="text-xs text-[#a86224] font-semibold hover:underline cursor-pointer"
                  >
                    Volver a Todas
                  </button>
                </div>
              );
            }
            const IconComponent = activeGroup.category.icono;
            return (
              <section className="space-y-4 animate-fade-in">
                {/* Encabezado visible únicamente en la vista de categoría */}
                <div className="flex items-center justify-between border-b border-[#e7dfd5] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${activeGroup.category.color}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900 leading-tight">
                        {activeGroup.category.nombre}
                      </h2>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${activeGroup.category.badgeColor}`}
                  >
                    {activeGroup.recetas.length}{' '}
                    {activeGroup.recetas.length === 1 ? 'receta' : 'recetas'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeGroup.recetas.map((r) => renderRecipeCard(r))}
                </div>
              </section>
            );
          })()
        )
      )}
      {/* Indicador visual de versión para confirmar despliegue */}
      <div className="pt-6 pb-2 text-center text-[11px] text-stone-400 font-mono tracking-wider">
        v.2.0
      </div>
    </div>
  );
}
