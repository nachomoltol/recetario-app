'use client';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
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
  Plus,
  Sun,
  Moon,
  Apple,
  Utensils,
  ChevronLeft,
  ChevronRight,
  Star,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import {
  checkRecipeClinicalCompatibility,
  hasActiveClinicalRestrictions,
} from '@/lib/clinicalDictionary';
import { Receta } from '@/types/recipe';
import { MomentoDia, RolPlato } from '@/types/database';
import { assignMealSlotAction, MealSlot } from '@/app/actions/mealPlanner';
import {
  isFirstCourseStarter,
  getRecipeMoments,
  matchesContextualMomento,
  ContextualMomentoFilter,
} from '@/lib/mealPlanGenerator';
import { getInitialFilterForSlot } from '@/components/planner/MealPlannerView';
import { DeleteRecipeButton } from './DeleteRecipeButton';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { QuickCategorizeBanner } from './QuickCategorizeBanner';
import { QuickCategorizeModal } from './QuickCategorizeModal';

export interface RecetaConIngredientes extends Receta {
  ingredientesNombres?: string[];
}

const MOMENTO_FILTER_CHIPS: {
  id: ContextualMomentoFilter;
  labelEs: string;
  labelEn: string;
  icon: React.ElementType;
}[] = [
  { id: 'todos', labelEs: 'Todos', labelEn: 'All', icon: Utensils },
  { id: 'desayuno', labelEs: 'Desayuno', labelEn: 'Breakfast', icon: Sun },
  { id: 'primero', labelEs: '1er Plato / Entrante', labelEn: '1st Course', icon: Soup },
  { id: 'almuerzo', labelEs: 'Almuerzo / Principal', labelEn: 'Lunch / Main', icon: UtensilsCrossed },
  { id: 'cena', labelEs: 'Cena', labelEn: 'Dinner', icon: Moon },
  { id: 'snack_postre', labelEs: 'Snack / Postre', labelEn: 'Snack / Dessert', icon: Apple },
];

interface CategoryConfig {
  id: string;
  nombre: string;
  nombreEn: string;
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
    nombreEn: 'Breakfast & Snacks',
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
      'porridge',
      'crepe',
      'crepes',
      'gofre',
      'gofres',
      'muesli',
    ],
  },
  {
    id: 'carnes-aves',
    nombre: 'Carnes y Aves',
    nombreEn: 'Meat & Poultry',
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
    nombreEn: 'Fish & Seafood',
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
    nombreEn: 'Pasta & Rice',
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
    nombreEn: 'Legumes & Stews',
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
    nombreEn: 'Soups & Broths',
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
    nombreEn: 'Salads & Appetizers',
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
    nombreEn: 'Vegetables & Stir-fries',
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
    nombreEn: 'Dressings, Sauces & Dips',
    icono: Sparkles,
    color: 'text-brand-primary bg-[#f4efe6] border-[#e7dfd5]',
    badgeColor: 'bg-[#ebdcc9] text-brand-primary border-[#dfcbb3]',
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
    nombreEn: 'Bakery, Doughs & Pizza',
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
    nombreEn: 'Desserts & Sweets',
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
    nombreEn: 'Drinks & Smoothies',
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
    raciones_defecto?: number | null;
    plan_suscripcion?: string | null;
  } | null;
}
export function RecipeCollectionOrganizer({
  recetas,
  userProfile,
}: RecipeCollectionOrganizerProps) {
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);
  const [localRecetas, setLocalRecetas] = useState<RecetaConIngredientes[]>(recetas);
  const [isQuickCategorizeOpen, setIsQuickCategorizeOpen] = useState(false);

  useEffect(() => {
    setLocalRecetas(recetas);
  }, [recetas]);

  const unclassifiedRecipes = useMemo(() => {
    return localRecetas.filter(
      (r) => !r.momentos_dia || r.momentos_dia.length === 0
    );
  }, [localRecetas]);

  const handleRecipeClassified = (
    recetaId: string,
    data: {
      momentos_dia: MomentoDia[];
      rol_plato: RolPlato;
      es_favorito_menu: boolean;
    }
  ) => {
    setLocalRecetas((prev) =>
      prev.map((r) =>
        r.id === recetaId
          ? {
              ...r,
              momentos_dia: data.momentos_dia,
              rol_plato: data.rol_plato,
              es_favorito_menu: data.es_favorito_menu,
            }
          : r
      )
    );
  };

  const searchParams = useSearchParams();
  const router = useRouter();

  const momentoParam = searchParams?.get('momento');
  const assignDateParam = searchParams?.get('assignDate');
  const assignSlotParam = searchParams?.get('assignSlot') as MealSlot | null;
  const pageParam = searchParams?.get('page');
  const catParam = searchParams?.get('cat');

  const initialPage = useMemo(() => {
    if (!pageParam) return 1;
    const p = parseInt(pageParam, 10);
    return !isNaN(p) && p > 0 ? p : 1;
  }, [pageParam]);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(initialPage);
  const ITEMS_PER_PAGE = 25;
  const listTopRef = useRef<HTMLDivElement>(null);

  const [filtroMomento, setFiltroMomento] = useState<ContextualMomentoFilter>(() => {
    if (momentoParam) {
      if (['desayuno', 'primero', 'almuerzo', 'cena', 'snack_postre'].includes(momentoParam)) {
        return momentoParam as ContextualMomentoFilter;
      }
      if (momentoParam === 'postre' || momentoParam === 'snack') {
        return 'snack_postre';
      }
    }
    if (assignSlotParam) {
      return getInitialFilterForSlot(assignSlotParam);
    }
    return 'todos';
  });
  const [filtroActivo, setFiltroActivo] = useState<string>(() => {
    return catParam || 'Todas';
  });

  const handlePageChange = useCallback((newPage: number, pushHistory = true) => {
    setCurrentPage(newPage);
    if (typeof window !== 'undefined' && pushHistory) {
      const url = new URL(window.location.href);
      if (newPage > 1) {
        url.searchParams.set('page', String(newPage));
      } else {
        url.searchParams.delete('page');
      }
      window.history.pushState({}, '', url.toString());
    }
    if (listTopRef.current) {
      listTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Soportar retroceso y avance en el historial del navegador o móvil (evento popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const rawPage = params.get('page');
      const p = rawPage ? parseInt(rawPage, 10) : 1;
      const validPage = !isNaN(p) && p > 0 ? p : 1;
      setCurrentPage(validPage);
      if (listTopRef.current) {
        listTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Interceptar evento personalizado del botón 'Volver' en la cabecera
  useEffect(() => {
    const handleCollectionBack = (e: Event) => {
      if (currentPage > 1) {
        e.preventDefault();
        handlePageChange(currentPage - 1);
      }
    };

    window.addEventListener('miga:collection-back', handleCollectionBack);
    return () => window.removeEventListener('miga:collection-back', handleCollectionBack);
  }, [currentPage, handlePageChange]);

  const isFirstRender = useRef(true);
  // Reseteo automático de página al filtrar o buscar interactivamente
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCurrentPage(1);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('page');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchQuery, filtroMomento, filtroActivo]);

  const buildRecipeDetailUrl = useCallback(
    (recipeId: string) => {
      const params = new URLSearchParams();
      params.set('from', 'collection');
      if (currentPage > 1) {
        params.set('page', String(currentPage));
      }
      if (filtroActivo && filtroActivo !== 'Todas') {
        params.set('cat', filtroActivo);
      }
      if (filtroMomento && filtroMomento !== 'todos') {
        params.set('momento', filtroMomento);
      }
      return `/recipes/${recipeId}?${params.toString()}`;
    },
    [currentPage, filtroActivo, filtroMomento]
  );

  // Refs y estados para navegación horizontal con flechas y scroll en PC
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeftCat, setCanScrollLeftCat] = useState(false);
  const [canScrollRightCat, setCanScrollRightCat] = useState(false);

  const checkCategoriesScroll = () => {
    const el = categoriesScrollRef.current;
    if (!el) return;
    setCanScrollLeftCat(el.scrollLeft > 6);
    setCanScrollRightCat(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  };

  const scrollCategories = (dir: 'left' | 'right') => {
    if (categoriesScrollRef.current) {
      categoriesScrollRef.current.scrollBy({
        left: dir === 'left' ? -220 : 220,
        behavior: 'smooth',
      });
    }
  };

  // Escuchar redimensionamiento y desplazamiento de categorías
  useEffect(() => {
    checkCategoriesScroll();
    const el = categoriesScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkCategoriesScroll, { passive: true });
    }
    window.addEventListener('resize', checkCategoriesScroll);
    return () => {
      if (el) el.removeEventListener('scroll', checkCategoriesScroll);
      window.removeEventListener('resize', checkCategoriesScroll);
    };
  }, []);

  // Listener para traducir deltaY de la rueda del ratón en desplazamiento horizontal
  const handleWheelHorizontal = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
      // Traducir scroll vertical a horizontal si no se está usando shift o trackpad horizontal
      el.scrollLeft += e.deltaY;
    }
  };

  // Contadores de recetas por momento del día
  const momentoCategoryCounts = useMemo(() => {
    const counts: Record<ContextualMomentoFilter, number> = {
      todos: localRecetas.length,
      desayuno: 0,
      primero: 0,
      almuerzo: 0,
      cena: 0,
      snack_postre: 0,
    };

    for (const r of localRecetas) {
      const moments = getRecipeMoments(r);
      if (moments.includes('desayuno')) counts.desayuno++;
      if (moments.includes('almuerzo') && isFirstCourseStarter(r)) counts.primero++;
      if (moments.includes('almuerzo')) counts.almuerzo++;
      if (moments.includes('cena')) counts.cena++;
      if (moments.includes('snack') || moments.includes('postre')) counts.snack_postre++;
    }

    return counts;
  }, [localRecetas]);

  const isProWithClinicalProfile = useMemo(() => {
    const isPro = (userProfile?.plan_suscripcion || '').trim().toLowerCase() === 'pro';
    return isPro && hasActiveClinicalRestrictions(userProfile);
  }, [userProfile]);

  // Cálculo local determinista (0 tokens de IA) de conflictos sin adaptar frente al perfil PRO activo
  const recipeConflictsMap = useMemo(() => {
    const map = new Map<string, { count: number; isCritical: boolean; summary: string }>();
    if (!isProWithClinicalProfile) return map;

    for (const r of localRecetas) {
      const ings = (r.ingredientesNombres || []).map((name) => ({
        nombre_limpio: name,
        nombre_crudo: name,
      }));
      if (ings.length === 0) continue;

      const report = checkRecipeClinicalCompatibility(ings, {
        preferencias: userProfile?.preferencias_dieteticas || undefined,
        alergenos: userProfile?.alergenos || undefined,
        idioma: language,
      });

      if (report.conflicts.length > 0) {
        const isCritical = report.severidadMaxima === 'critica';
        const summary = report.conflicts
          .slice(0, 3)
          .map((c) => `${c.ingredienteOriginal} (${c.patologia})`)
          .join(', ');
        map.set(r.id, { count: report.conflicts.length, isCritical, summary });
      }
    }
    return map;
  }, [isProWithClinicalProfile, localRecetas, userProfile, language]);

  const tieneAdaptacionClinica = Boolean(
    hasActiveClinicalRestrictions(userProfile) ||
      userProfile?.nivel_culinario === 'Principiante' ||
      userProfile?.nivel_culinario === 'Avanzado'
  );

  // Independencia del buscador: Busca en título, descripción, etiquetas e ingredientes
  // Y prefiltrado contextual estricto por momentos oficiales (sin tags ni etiquetas secundarias)
  const filteredRecipes = useMemo(() => {
    let list = localRecetas;

    if (filtroMomento !== 'todos') {
      list = list.filter((r) => matchesContextualMomento(r, filtroMomento));
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter((r) => {
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
  }, [localRecetas, filtroMomento, searchQuery]);
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
  // Tarjeta de receta modular compacta o híbrida fotográfica (break-inside-avoid para Masonry)
  const renderRecipeCard = (r: RecetaConIngredientes) => {
    const tieneFoto = Boolean(r.foto_url || r.imagen_portada_url);
    const fotoSrc = r.foto_url || r.imagen_portada_url;
    const conflictInfo = recipeConflictsMap.get(r.id);

    return (
      <div
        key={r.id}
        className="group rounded-2xl sm:rounded-3xl bg-white border border-[#e7dfd5] hover:border-brand-primary hover:shadow-md transition-all overflow-hidden flex flex-col justify-between break-inside-avoid mb-3 sm:mb-4"
      >
        {/* Cabecera fotográfica (solo si la receta tiene imagen asignada) */}
        {tieneFoto && (
          <div className="relative w-full aspect-[4/3] overflow-hidden bg-stone-100">
            <Link
              href={buildRecipeDetailUrl(r.id)}
              className="block w-full h-full cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoSrc!}
                alt={r.titulo}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />
            </Link>

            {/* Badges y acciones superpuestas con efecto glassmorphism */}
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-auto">
              <div className="flex flex-wrap items-center gap-1 min-w-0">
                <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white font-bold uppercase tracking-wider text-[9px] truncate">
                  {r.fuente_tipo}
                </span>
                <span className="px-1.5 py-0.5 rounded-lg bg-black/50 backdrop-blur-md text-stone-200 capitalize text-[9px] truncate">
                  {r.dificultad}
                </span>
                {Number(r.puntuacion) > 0 && (
                  <span className="px-1.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-amber-400 font-bold text-[9px] flex items-center gap-0.5 border border-amber-400/20 shadow-2xs">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    <span>{Number(r.puntuacion).toFixed(1)}</span>
                  </span>
                )}
              </div>
              <DeleteRecipeButton
                recipeId={r.id}
                recipeTitle={r.titulo}
                variant="icon"
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg shrink-0 bg-black/50 hover:bg-rose-600 text-white backdrop-blur-md border border-white/10"
              />
            </div>
          </div>
        )}

        <div className={`p-2.5 sm:p-4 space-y-2 sm:space-y-3.5 flex-1 flex flex-col justify-between ${tieneFoto ? 'pt-2.5 sm:pt-3' : ''}`}>
          <div className="space-y-1.5 sm:space-y-2.5">
            {/* Cabecera de badges textuales para recetas sin foto */}
            {!tieneFoto && (
              <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold gap-1 sm:gap-2">
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 min-w-0">
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-[#f4efe6] text-brand-primary font-bold uppercase tracking-wider text-[9px] sm:text-[10px] truncate">
                    {r.fuente_tipo}
                  </span>
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-stone-100 text-stone-600 capitalize text-[9px] sm:text-[11px] truncate">
                    {r.dificultad}
                  </span>
                  {Number(r.puntuacion) > 0 && (
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80 text-[9px] sm:text-[10px] font-bold flex items-center gap-0.5 sm:gap-1 shadow-2xs">
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                      <span>{Number(r.puntuacion).toFixed(1)}</span>
                    </span>
                  )}
                  {tieneAdaptacionClinica && (
                    <span
                      className="px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-amber-50 text-brand-primary border border-amber-200/80 text-[9px] sm:text-[10px] font-semibold flex items-center gap-0.5 sm:gap-1 shadow-2xs"
                      title={
                        language === 'en'
                          ? 'This recipe features custom adaptation according to your health profile'
                          : 'Esta receta cuenta con adaptación personalizada según tu perfil de salud y nivel'
                      }
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span className="hidden sm:inline">{t('collection_ai_adaptable')}</span>
                      <span className="sm:hidden">{t('collection_ai_adaptable_short')}</span>
                    </span>
                  )}
                </div>
                <DeleteRecipeButton
                  recipeId={r.id}
                  recipeTitle={r.titulo}
                  variant="icon"
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg shrink-0"
                />
              </div>
            )}

            <Link
              href={buildRecipeDetailUrl(r.id)}
              className="block group-hover:text-brand-primary transition-colors"
            >
              <h3 className="font-semibold sm:font-bold text-stone-900 font-serif-recipe text-xs sm:text-base leading-snug line-clamp-2">
                {r.titulo.replace(/<\/?mark>/gi, '')}
              </h3>
            </Link>

            {/* Indicador local (0 tokens) si la receta tiene conflictos sin adaptar frente al perfil PRO */}
            {conflictInfo && conflictInfo.count > 0 && (
              <Link
                href={buildRecipeDetailUrl(r.id)}
                title={
                  language === 'en'
                    ? `Unadapted conflicts: ${conflictInfo.summary}. Open recipe to adapt.`
                    : `Conflictos sin adaptar: ${conflictInfo.summary}. Abre la receta para adaptarla.`
                }
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition w-fit max-w-full ${
                  conflictInfo.isCritical
                    ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                {conflictInfo.isCritical ? (
                  <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                )}
                <span className="truncate">
                  {conflictInfo.count}{' '}
                  {conflictInfo.count === 1
                    ? language === 'en'
                      ? 'conflict · Adapt'
                      : 'conflicto · Adaptar'
                    : language === 'en'
                    ? 'conflicts · Adapt'
                    : 'conflictos · Adaptar'}
                </span>
              </Link>
            )}

            {r.descripcion && (
              <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed font-light hidden sm:block">
                {r.descripcion.replace(/<\/?mark>/gi, '')}
              </p>
            )}

            {r.etiquetas && r.etiquetas.length > 0 && (
              <div className="hidden sm:flex flex-wrap gap-1 pt-0.5">
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

          <div className="pt-2 sm:pt-3 border-t border-[#f4efe6] flex items-center justify-between text-[10px] sm:text-xs text-stone-500">
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-primary" /> {r.tiempo_total_min || 15} min
            </span>
            {assignDateParam && assignSlotParam ? (
              <button
                type="button"
                onClick={async () => {
                  await assignMealSlotAction({
                    fecha: assignDateParam,
                    slot: assignSlotParam,
                    recetaId: r.id,
                    porciones: userProfile?.raciones_defecto ?? 4,
                  });
                  router.push(`/meal-planner?date=${assignDateParam}`);
                }}
                className="min-h-[28px] px-2.5 py-1 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-semibold flex items-center gap-1 transition text-[11px] cursor-pointer shadow-2xs"
              >
                <Plus className="w-3 h-3" />
                <span>{language === 'en' ? 'Assign' : 'Asignar'}</span>
              </button>
            ) : (
              <Link
                href={buildRecipeDetailUrl(r.id)}
                className="text-brand-primary hover:text-[#8e511c] font-semibold inline-flex items-center gap-0.5 sm:gap-1 transition-colors text-[10px] sm:text-xs"
              >
                <span className="hidden xs:inline">{t('collection_open_recipe')}</span>
                <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Banner de Modo Asignación al Planificador */}
      {(Boolean(assignDateParam && assignSlotParam) || Boolean(momentoParam)) && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-3 animate-fade-in">
          {assignDateParam && assignSlotParam && (
            <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-brand-primary shrink-0" />
                <span className="text-stone-800 font-medium truncate">
                  {language === 'en'
                    ? `Assignment mode: Pick a recipe for ${assignSlotParam} (${assignDateParam}).`
                    : `Modo Asignación: Elige una receta para ${assignSlotParam} (${assignDateParam}).`}
                </span>
              </div>
              <Link
                href={`/meal-planner?date=${assignDateParam}`}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-amber-200 text-brand-primary font-semibold text-xs shrink-0 transition"
              >
                {language === 'en' ? 'Back to planner' : 'Volver al plan'}
              </Link>
            </div>
          )}

          {/* Selector de Chips de Momentos Oficiales */}
          <div className="space-y-1.5">
            <div
              onWheel={handleWheelHorizontal}
              className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs"
            >
              {MOMENTO_FILTER_CHIPS.map((chip) => {
                const isActive = filtroMomento === chip.id;
                const ChipIcon = chip.icon;
                const label = language === 'en' ? chip.labelEn : chip.labelEs;
                const count = momentoCategoryCounts[chip.id] ?? 0;

                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => {
                      setFiltroMomento(chip.id);
                      if (filtroActivo !== 'Todas') setFiltroActivo('Todas');
                    }}
                    className={`min-h-[30px] px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                        : 'bg-white hover:bg-[#faf7f2] text-stone-600 border-[#e7dfd5]'
                    }`}
                  >
                    <ChipIcon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                    <span>{label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-white/25 text-white' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            {filtroMomento !== 'todos' && (
              <div className="flex items-center justify-between text-[11px] text-stone-500 px-1 pt-0.5">
                <span>
                  {language === 'en' ? 'Filtered by moment' : 'Filtrando por momento'}:{' '}
                  <strong className="text-brand-primary">
                    {language === 'en'
                      ? MOMENTO_FILTER_CHIPS.find((c) => c.id === filtroMomento)?.labelEn
                      : MOMENTO_FILTER_CHIPS.find((c) => c.id === filtroMomento)?.labelEs}
                  </strong>{' '}
                  ({filteredRecipes.length} {language === 'en' ? 'recipes' : 'recetas'})
                </span>
                <button
                  type="button"
                  onClick={() => setFiltroMomento('todos')}
                  className="text-brand-primary hover:underline font-semibold cursor-pointer"
                >
                  {language === 'en' ? 'Show all moments' : 'Ver todos los momentos'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Banner de Categorización Rápida si hay recetas sin clasificar */}
      <QuickCategorizeBanner
        unclassifiedCount={unclassifiedRecipes.length}
        onStartCategorize={() => setIsQuickCategorizeOpen(true)}
      />

      {/* Drawer de Categorización Rápida en lote */}
      <QuickCategorizeModal
        isOpen={isQuickCategorizeOpen}
        onOpenChange={setIsQuickCategorizeOpen}
        unclassifiedRecipes={unclassifiedRecipes}
        onRecipeClassified={handleRecipeClassified}
      />

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
            placeholder={t('collection_search_placeholder')}
            className="w-full min-h-[54px] pl-12 pr-12 py-3.5 rounded-2xl bg-white border border-[#e7dfd5] text-stone-900 placeholder-stone-400 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary shadow-2xs transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="w-8 h-8 rounded-full bg-[#faf7f2] hover:bg-[#f4efe6] text-stone-500 absolute right-3 flex items-center justify-center transition cursor-pointer"
              title={t('collection_clear_search')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {searchQuery.trim() && (
          <div className="flex items-center justify-between text-xs text-stone-500 px-1 pt-0.5">
            <span>
              {t('collection_showing_label')} <strong>{filteredRecipes.length}</strong>{' '}
              {filteredRecipes.length === 1 ? t('collection_showing_singular') : t('collection_showing_plural')}{' '}
              {t('collection_showing_for')}{' '}
              <strong className="text-stone-800">&ldquo;{searchQuery}&rdquo;</strong>
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-brand-primary hover:underline font-semibold cursor-pointer"
            >
              {t('collection_clear_search')}
            </button>
          </div>
        )}
      </div>
      {/* 2. SELECTOR DE PESTAÑAS (TODAS + CATEGORÍAS) CON NAVEGACIÓN PC ERGONÓMICA */}
      <div className="relative flex items-center group/cat-scroll">
        {/* Flecha scroll izquierda (visible en PC cuando hay contenido previo) */}
        {canScrollLeftCat && (
          <button
            type="button"
            onClick={() => scrollCategories('left')}
            aria-label={t('planner_scroll_left')}
            className="hidden md:flex absolute -left-3 z-20 w-8 h-8 rounded-full bg-white/95 border border-[#e7dfd5] text-stone-700 hover:text-brand-primary shadow-md items-center justify-center transition cursor-pointer hover:bg-stone-50 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        <div
          ref={categoriesScrollRef}
          onWheel={handleWheelHorizontal}
          className="flex items-center gap-2 overflow-x-auto scroll-smooth w-full pb-2 pt-1 no-scrollbar md:scrollbar-thin md:scrollbar-thumb-stone-300 md:scrollbar-track-stone-100/50"
        >
          <button
            type="button"
            onClick={() => setFiltroActivo('Todas')}
            className={`min-h-[42px] px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              filtroActivo === 'Todas'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'bg-white hover:bg-[#faf7f2] text-stone-700 border border-[#e7dfd5]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>{t('collection_tab_all')} ({filteredRecipes.length})</span>
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
                className={`min-h-[42px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'bg-white hover:bg-[#faf7f2] text-stone-700 border border-[#e7dfd5]'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5 shrink-0" />
                <span>{language === 'en' ? category.nombreEn : category.nombre}</span>
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

        {/* Flecha scroll derecha (visible en PC cuando hay más categorías) */}
        {canScrollRightCat && (
          <button
            type="button"
            onClick={() => scrollCategories('right')}
            aria-label={t('planner_scroll_right')}
            className="hidden md:flex absolute -right-3 z-20 w-8 h-8 rounded-full bg-white/95 border border-[#e7dfd5] text-stone-700 hover:text-brand-primary shadow-md items-center justify-center transition cursor-pointer hover:bg-stone-50 active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* 3. ESTADO VACÍO CUANDO NO HAY COINCIDENCIAS */}
      {filteredRecipes.length === 0 && (
        <div className="p-10 text-center rounded-3xl bg-white border border-dashed border-[#e7dfd5] space-y-3 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-[#f4efe6] text-brand-primary flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-900 font-serif-recipe">
              {t('collection_empty_title')}
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto">
              {t('collection_empty_desc')}
            </p>
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              {t('collection_see_all')}
            </button>
          )}
        </div>
      )}
      {/* Anchor para scroll suave al paginar */}
      <div ref={listTopRef} className="scroll-mt-20" />

      {/* ============================================================== */}
      {/* 4. CONDICIONAL ESTRICTO: VISTA 'TODAS' vs VISTA POR CATEGORÍA */}
      {/* ============================================================== */}
      {filteredRecipes.length > 0 && (
        filtroActivo === 'Todas' ? (
          (() => {
            const totalRecipesCount = allSortedRecipes.length;
            const totalPages = Math.ceil(totalRecipesCount / ITEMS_PER_PAGE) || 1;
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const paginatedRecipes = allSortedRecipes.slice(startIndex, startIndex + ITEMS_PER_PAGE);

            return (
              <div className="space-y-6 animate-fade-in">
                {/* Cuadrícula Masonry paginada */}
                <div className="columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4">
                  {paginatedRecipes.map((r) => renderRecipeCard(r))}
                </div>

                {/* Controles de Paginación */}
                {totalPages > 1 && (
                  <div className="pt-4 border-t border-[#e7dfd5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <span className="text-stone-500 font-medium order-2 sm:order-1">
                      {language === 'en'
                        ? `Showing ${startIndex + 1}–${Math.min(startIndex + ITEMS_PER_PAGE, totalRecipesCount)} of ${totalRecipesCount} recipes`
                        : `Mostrando ${startIndex + 1}–${Math.min(startIndex + ITEMS_PER_PAGE, totalRecipesCount)} de ${totalRecipesCount} recetas`}
                    </span>

                    <div className="flex items-center gap-1.5 order-1 sm:order-2">
                      <button
                        type="button"
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                        className="h-8 px-2.5 rounded-xl border border-[#e7dfd5] bg-white hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed text-stone-700 font-semibold flex items-center gap-1 transition shadow-2xs"
                        title={language === 'en' ? 'Previous page' : 'Página anterior'}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">{language === 'en' ? 'Prev' : 'Anterior'}</span>
                      </button>

                      {/* Números de página */}
                      <div className="flex items-center gap-1 px-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                          .map((pageNum, idx, arr) => {
                            const prev = arr[idx - 1];
                            const showEllipsis = prev && pageNum - prev > 1;
                            const isActive = pageNum === currentPage;

                            return (
                              <div key={pageNum} className="flex items-center gap-1">
                                {showEllipsis && <span className="text-stone-400 px-0.5">…</span>}
                                <button
                                  type="button"
                                  onClick={() => handlePageChange(pageNum)}
                                  className={`w-8 h-8 rounded-xl font-bold font-serif-recipe text-xs transition cursor-pointer shadow-2xs ${
                                    isActive
                                      ? 'bg-brand-primary text-white'
                                      : 'bg-white border border-[#e7dfd5] text-stone-700 hover:bg-[#faf7f2]'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              </div>
                            );
                          })}
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className="h-8 px-2.5 rounded-xl border border-[#e7dfd5] bg-white hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed text-stone-700 font-semibold flex items-center gap-1 transition shadow-2xs"
                        title={language === 'en' ? 'Next page' : 'Página siguiente'}
                      >
                        <span className="hidden xs:inline">{language === 'en' ? 'Next' : 'Siguiente'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()
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
                    {t('collection_empty_category')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setFiltroActivo('Todas')}
                    className="text-xs text-brand-primary font-semibold hover:underline cursor-pointer"
                  >
                    {t('collection_back_to_all')}
                  </button>
                </div>
              );
            }
            const IconComponent = activeGroup.category.icono;
            const totalCategoryRecipes = activeGroup.recetas.length;
            const totalPagesCat = Math.ceil(totalCategoryRecipes / ITEMS_PER_PAGE) || 1;
            const startIdxCat = (currentPage - 1) * ITEMS_PER_PAGE;
            const paginatedCategoryRecipes = activeGroup.recetas.slice(startIdxCat, startIdxCat + ITEMS_PER_PAGE);

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
                        {language === 'en' ? activeGroup.category.nombreEn : activeGroup.category.nombre}
                      </h2>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${activeGroup.category.badgeColor}`}
                  >
                    {totalCategoryRecipes}{' '}
                    {totalCategoryRecipes === 1 ? t('collection_recipe_singular') : t('collection_recipe_plural')}
                  </span>
                </div>

                <div className="columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4">
                  {paginatedCategoryRecipes.map((r) => renderRecipeCard(r))}
                </div>

                {/* Controles de Paginación en Categoría */}
                {totalPagesCat > 1 && (
                  <div className="pt-4 border-t border-[#e7dfd5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <span className="text-stone-500 font-medium order-2 sm:order-1">
                      {language === 'en'
                        ? `Showing ${startIdxCat + 1}–${Math.min(startIdxCat + ITEMS_PER_PAGE, totalCategoryRecipes)} of ${totalCategoryRecipes} recipes`
                        : `Mostrando ${startIdxCat + 1}–${Math.min(startIdxCat + ITEMS_PER_PAGE, totalCategoryRecipes)} de ${totalCategoryRecipes} recetas`}
                    </span>

                    <div className="flex items-center gap-1.5 order-1 sm:order-2">
                      <button
                        type="button"
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                        className="h-8 px-2.5 rounded-xl border border-[#e7dfd5] bg-white hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed text-stone-700 font-semibold flex items-center gap-1 transition shadow-2xs"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">{language === 'en' ? 'Prev' : 'Anterior'}</span>
                      </button>

                      <div className="flex items-center gap-1 px-1">
                        {Array.from({ length: totalPagesCat }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === totalPagesCat || Math.abs(p - currentPage) <= 1)
                          .map((pageNum, idx, arr) => {
                            const prev = arr[idx - 1];
                            const showEllipsis = prev && pageNum - prev > 1;
                            const isActive = pageNum === currentPage;

                            return (
                              <div key={pageNum} className="flex items-center gap-1">
                                {showEllipsis && <span className="text-stone-400 px-0.5">…</span>}
                                <button
                                  type="button"
                                  onClick={() => handlePageChange(pageNum)}
                                  className={`w-8 h-8 rounded-xl font-bold font-serif-recipe text-xs transition cursor-pointer shadow-2xs ${
                                    isActive
                                      ? 'bg-brand-primary text-white'
                                      : 'bg-white border border-[#e7dfd5] text-stone-700 hover:bg-[#faf7f2]'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              </div>
                            );
                          })}
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePageChange(Math.min(totalPagesCat, currentPage + 1))}
                        disabled={currentPage >= totalPagesCat}
                        className="h-8 px-2.5 rounded-xl border border-[#e7dfd5] bg-white hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed text-stone-700 font-semibold flex items-center gap-1 transition shadow-2xs"
                      >
                        <span className="hidden xs:inline">{language === 'en' ? 'Next' : 'Siguiente'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
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
