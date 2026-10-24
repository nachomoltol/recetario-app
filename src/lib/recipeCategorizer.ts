import { MomentoDia, RolPlato } from '@/types/database';

export interface SuggestedCategory {
  momentos_dia: MomentoDia[];
  rol_plato: RolPlato;
  confianza: 'alta' | 'media' | 'baja';
}

/**
 * Normaliza una cadena de texto para facilitar el análisis heurístico:
 * pasa a minúsculas, elimina diacríticos/acentos y caracteres especiales.
 */
function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Comprueba si el texto contiene alguna de las palabras clave como palabra completa o token.
 */
function containsKeyword(normalizedText: string, keywords: string[]): boolean {
  if (!normalizedText) return false;
  return keywords.some((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s)${escaped}(\\s|s|es)?($|\\s)`, 'i');
    return regex.test(normalizedText);
  });
}

// =============================================================================
// CATÁLOGO HEURÍSTICO DE PALABRAS CLAVE CULINARIAS (ES / EN)
// =============================================================================

// 0. Postres, Dulces y Repostería
const DESSERT_KEYWORDS = [
  'postre', 'postres', 'dessert', 'desserts', 'tarta', 'tartas', 'cake', 'cakes',
  'flan', 'flanes', 'brownie', 'brownies', 'mousse', 'mousses', 'natillas',
  'cheesecake', 'cheesecakes', 'tarta de queso', 'helado', 'helados', 'ice cream',
  'tiramisu', 'galletas', 'galleta', 'cookies', 'cookie', 'pudding', 'pudin',
  'fondant', 'coulant', 'trufado', 'trufas', 'crema catalana', 'crema pastelera',
  'arroz con leche', 'tarta de manzana', 'apple pie', 'profiterol', 'profiteroles',
  'panna cotta', 'panacota', 'torrija', 'torrijas', 'merengue', 'meringue',
  'gelato', 'sorbete', 'sorbet', 'cupcake', 'cupcakes', 'donut', 'donuts',
  'chocoflan', 'dulce de leche'
];

// Exclusiones saladas para evitar falsos positivos con tartas saladas / quiches
const SAVORY_EXCLUSION_KEYWORDS = [
  'salada', 'salado', 'saladas', 'salados', 'puerros', 'espinacas', 'verdura',
  'verduras', 'atun', 'pollo', 'carne', 'jamon'
];

// 1. Desayunos, Meriendas y Snacks
const BREAKFAST_KEYWORDS = [
  'desayuno', 'breakfast', 'pancake', 'pancakes', 'tortita', 'tortitas',
  'porridge', 'avena', 'oatmeal', 'oats', 'smoothie', 'smoothies', 'batido',
  'granola', 'muesli', 'crepe', 'crepes', 'gofre', 'gofres', 'waffle', 'waffles',
  'tostada', 'tostadas', 'toast', 'acai', 'chia', 'magdalena', 'magdalenas',
  'muffin', 'muffins', 'bizcocho', 'croissant', 'french toast', 'tostadas francesas',
  'bowl de yogur', 'yogur con fruta', 'overnight oats', 'pan de platano', 'banana bread',
  'crema de cacahuete', 'peanut butter', 'crema de avellana'
];

const SNACK_KEYWORDS = [
  'snack', 'snacks', 'merienda', 'aperitivo', 'picoteo', 'tentempie',
  'barrita', 'barritas', 'energy ball', 'energy balls', 'bolitas energeticas',
  'chips', 'palomitas', 'popcorn', 'edamame', 'frutos secos tostados',
  'crudite', 'crudites', 'dip', 'guacamole', 'hummus'
];

// 2. Primeros platos / Entrantes / Sopas y Cremas
const FIRST_COURSE_KEYWORDS = [
  'sopa', 'sopas', 'soup', 'soups', 'crema', 'cremas', 'crema de', 'pure', 'pures', 'puree',
  'veloute', 'consome', 'gazpacho', 'salmorejo', 'ajoblanco', 'vichyssoise',
  'ensalada', 'ensalada verde', 'ensalada mixta', 'ensalada simple', 'green salad',
  'alcachofas', 'artichokes', 'esparragos', 'asparagus', 'judias verdes',
  'green beans', 'menestra', 'pisto', 'ratatouille', 'escalivada',
  'champinones al ajillo', 'setas salteadas', 'brocoli al vapor',
  'coliflor hervida', 'carpaccio de calabacin', 'crema de calabaza',
  'crema de calabacin', 'crema de verduras', 'entrante', 'starter', 'appetizer'
];

// 3. Segundos platos (Protagonismo proteico directo de carne, ave o pescado)
const SECOND_COURSE_MEAT_KEYWORDS = [
  'solomillo', 'sirloin', 'tenderloin', 'entrecot', 'ribeye', 'chuleton',
  'filete', 'steak', 'pechuga de pollo', 'chicken breast', 'muslos de pollo',
  'chicken thighs', 'pollo al horno', 'roast chicken', 'pollo asado',
  'conejo', 'rabbit', 'cordero', 'lamb', 'costillas', 'ribs',
  'lomo de cerdo', 'pork loin', 'alitas de pollo', 'chicken wings',
  'albondigas', 'meatballs', 'chuletas', 'pork chops', 'carrilleras',
  'ternera guisada', 'estofado de ternera', 'beef stew'
];

const SECOND_COURSE_FISH_KEYWORDS = [
  'salmon', 'merluza', 'hake', 'lubina', 'sea bass', 'dorada', 'sea bream',
  'bacalao', 'cod', 'atun', 'tuna', 'bonito', 'sardinas', 'sardines',
  'boquerones', 'calamares', 'squid', 'sepia', 'cuttlefish', 'pulpo', 'octopus',
  'gambas a la plancha', 'grilled shrimp', 'langostinos', 'prawns',
  'emperador', 'swordfish', 'trucha', 'trout', 'pescado al horno', 'baked fish'
];

const SECOND_COURSE_VEG_PROTEIN = [
  'tofu a la plancha', 'tofu marinado', 'marinated tofu', 'seitan a la plancha',
  'tempeh salteado', 'heura salteada'
];

// 4. Platos Completos / Únicos
const COMPLETE_DISH_GRAINS_KEYWORDS = [
  'arroz', 'rice', 'paella', 'risotto', 'arroz caldoso', 'arroz meloso',
  'arroz frito', 'fried rice', 'biryani'
];

const COMPLETE_DISH_PASTA_KEYWORDS = [
  'pasta', 'espaguetis', 'spaghetti', 'macarrones', 'macaroni', 'lasana',
  'lasagna', 'canelones', 'cannelloni', 'tallarines', 'noodles',
  'pad thai', 'ramen', 'fideos', 'gnocchi', 'nhoquis'
];

const COMPLETE_DISH_LEGUMES_KEYWORDS = [
  'lentejas', 'lentils', 'garbanzos', 'chickpeas', 'alubias', 'beans',
  'judias blancas', 'fabada', 'cocido', 'potaje', 'puchero', 'chili con carne'
];

const COMPLETE_DISH_MEALS_KEYWORDS = [
  'pizza', 'pizzas', 'calzone', 'quiche', 'empanada', 'empanadas',
  'tacos', 'fajitas', 'burrito', 'burritos', 'wrap', 'wraps',
  'arepa', 'arepas', 'poke bowl', 'buddha bowl', 'ensalada cesar',
  'caesar salad', 'ensalada campera', 'ensalada de pasta', 'pasta salad',
  'ensalada de arroz', 'hamburguesa', 'burger', 'sandwich club', 'curry'
];

// 5. Platos específicos pesados típicos de mediodía (Almuerzo exclusivo o preferente)
const HEAVY_LUNCH_KEYWORDS = [
  'paella', 'fabada', 'cocido', 'puchero', 'potaje', 'arroz caldoso',
  'lentejas con chorizo', 'chuleton', 'lasana', 'lasagna'
];

// 6. Platos ligeros típicos de noche (Cena preferente)
const LIGHT_DINNER_KEYWORDS = [
  'tortilla francesa', 'omelette', 'crema de verduras', 'sopa de verduras',
  'pescado a la plancha', 'ensalada ligera', 'salteado ligero', 'revuelto de champinones',
  'pechuga a la plancha'
];

/**
 * Infiere de forma heurística y determinista los momentos del día recomendados
 * (desayuno, almuerzo, cena, snack) y el rol del plato (completo, primero, segundo, desayuno_snack).
 */
export function inferRecipeCategory(receta: {
  titulo: string;
  calorias_por_porcion?: number | null;
  etiquetas?: string[] | null;
  descripcion?: string | null;
  ingredientes?: { nombre_limpio?: string; nombre_crudo?: string }[] | null;
}): SuggestedCategory {
  const normTitle = normalizeText(receta.titulo);
  const normDesc = normalizeText(receta.descripcion);
  const normTags = (receta.etiquetas || []).map(normalizeText).join(' ');

  const ingredientNames = (receta.ingredientes || [])
    .map((i) => normalizeText(i?.nombre_limpio || i?.nombre_crudo || ''))
    .filter(Boolean)
    .join(' ');

  const fullCorpus = `${normTitle} ${normDesc} ${normTags} ${ingredientNames}`.trim();
  const cals = typeof receta.calorias_por_porcion === 'number' ? receta.calorias_por_porcion : null;

  // ===========================================================================
  // REGLA 0: POSTRES, DULCES Y REPOSTERÍA (TARTAS, FLANES, BROWNIES, HELADOS...)
  // ===========================================================================
  const isSavoryTart = containsKeyword(normTitle, SAVORY_EXCLUSION_KEYWORDS);
  const isDessertTitle = !isSavoryTart && containsKeyword(normTitle, DESSERT_KEYWORDS);
  const isDessertCorpus = !isSavoryTart && containsKeyword(fullCorpus, DESSERT_KEYWORDS);

  if (isDessertTitle || isDessertCorpus) {
    return {
      momentos_dia: ['postre'],
      rol_plato: 'postre',
      confianza: 'alta',
    };
  }

  // ===========================================================================
  // REGLA 1: DESAYUNOS, MERIENDAS Y SNACKS
  // ===========================================================================
  const isBreakfastTitle = containsKeyword(normTitle, BREAKFAST_KEYWORDS);
  const isSnackTitle = containsKeyword(normTitle, SNACK_KEYWORDS);
  const isBreakfastCorpus = containsKeyword(fullCorpus, BREAKFAST_KEYWORDS);
  const isSnackCorpus = containsKeyword(fullCorpus, SNACK_KEYWORDS);

  if (isBreakfastTitle || isSnackTitle) {
    const momentos: MomentoDia[] = [];
    if (isBreakfastTitle) momentos.push('desayuno');
    if (isSnackTitle || isBreakfastTitle) momentos.push('snack');
    if (momentos.length === 0) momentos.push('desayuno', 'snack');

    return {
      momentos_dia: Array.from(new Set(momentos)),
      rol_plato: 'desayuno_snack',
      confianza: 'alta',
    };
  }

  if (isBreakfastCorpus || isSnackCorpus) {
    // Si en etiquetas o ingredientes hay clara señal de desayuno/snack y calorías moderadas (< 450)
    if (cals === null || cals < 450) {
      return {
        momentos_dia: isBreakfastCorpus ? ['desayuno', 'snack'] : ['snack'],
        rol_plato: 'desayuno_snack',
        confianza: 'media',
      };
    }
  }

  // ===========================================================================
  // REGLA 2: PRIMEROS PLATOS (SOPAS, CREMAS, ENSALADAS SIMPLES, VERDURAS)
  // ===========================================================================
  const isFirstCourseTitle = containsKeyword(normTitle, FIRST_COURSE_KEYWORDS);
  const isFirstCourseCorpus = containsKeyword(fullCorpus, FIRST_COURSE_KEYWORDS);

  // Evitar falsos positivos si el plato es claramente un plato completo (ej: "Sopa de ramen con pollo y huevo", "Ensalada de pasta", "Ensalada César")
  const hasGrainsOrPasta =
    containsKeyword(normTitle, COMPLETE_DISH_GRAINS_KEYWORDS) ||
    containsKeyword(normTitle, COMPLETE_DISH_PASTA_KEYWORDS) ||
    containsKeyword(normTitle, COMPLETE_DISH_LEGUMES_KEYWORDS);
  const isCompleteMealTitle = containsKeyword(normTitle, COMPLETE_DISH_MEALS_KEYWORDS);

  if (isFirstCourseTitle && !hasGrainsOrPasta && !isCompleteMealTitle) {
    const isLightForDinner = containsKeyword(normTitle, LIGHT_DINNER_KEYWORDS) || (cals !== null && cals < 280);
    const momentos: MomentoDia[] = isLightForDinner
      ? ['cena', 'almuerzo']
      : ['almuerzo', 'cena'];

    return {
      momentos_dia: momentos,
      rol_plato: 'primero',
      confianza: 'alta',
    };
  }

  // ===========================================================================
  // REGLA 3: SEGUNDOS PLATOS (PROTEÍNA PRINCIPAL ANIMAL O VEGETAL AISLADA)
  // ===========================================================================
  const isMeat =
    containsKeyword(normTitle, SECOND_COURSE_MEAT_KEYWORDS) ||
    containsKeyword(normTags, SECOND_COURSE_MEAT_KEYWORDS);

  const isFish =
    containsKeyword(normTitle, SECOND_COURSE_FISH_KEYWORDS) ||
    containsKeyword(normTags, SECOND_COURSE_FISH_KEYWORDS);

  const isVegProtein = containsKeyword(normTitle, SECOND_COURSE_VEG_PROTEIN);

  if ((isMeat || isFish || isVegProtein) && !hasGrainsOrPasta) {
    // Si tiene calorías medias y no es un guiso completo con patata o arroz
    const isHeavyMeat = containsKeyword(normTitle, ['chuleton', 'entrecot', 'cordero', 'costillas']);
    const momentos: MomentoDia[] = isHeavyMeat
      ? ['almuerzo']
      : ['almuerzo', 'cena'];

    return {
      momentos_dia: momentos,
      rol_plato: 'segundo',
      confianza: 'alta',
    };
  }

  // ===========================================================================
  // REGLA 4: PLATOS COMPLETOS / ÚNICOS (ARROCES, PASTAS, GUISOS, PIZZAS, BOWLS)
  // ===========================================================================
  const isCompleteTitle =
    hasGrainsOrPasta ||
    containsKeyword(normTitle, COMPLETE_DISH_MEALS_KEYWORDS);

  const isCompleteCorpus =
    containsKeyword(fullCorpus, COMPLETE_DISH_GRAINS_KEYWORDS) ||
    containsKeyword(fullCorpus, COMPLETE_DISH_PASTA_KEYWORDS) ||
    containsKeyword(fullCorpus, COMPLETE_DISH_LEGUMES_KEYWORDS) ||
    containsKeyword(fullCorpus, COMPLETE_DISH_MEALS_KEYWORDS);

  if (isCompleteTitle) {
    const isHeavy = containsKeyword(normTitle, HEAVY_LUNCH_KEYWORDS) || (cals !== null && cals > 650);
    const momentos: MomentoDia[] = isHeavy
      ? ['almuerzo']
      : ['almuerzo', 'cena'];

    return {
      momentos_dia: momentos,
      rol_plato: 'completo',
      confianza: 'alta',
    };
  }

  if (isCompleteCorpus || (cals !== null && cals >= 520)) {
    const isHeavy = containsKeyword(fullCorpus, HEAVY_LUNCH_KEYWORDS) || (cals !== null && cals > 650);
    const momentos: MomentoDia[] = isHeavy
      ? ['almuerzo']
      : ['almuerzo', 'cena'];

    return {
      momentos_dia: momentos,
      rol_plato: 'completo',
      confianza: 'media',
    };
  }

  // ===========================================================================
  // REGLA 5: EVALUACIÓN SECUNDARIA POR INGREDIENTES Y CALORÍAS
  // ===========================================================================
  if (isFirstCourseCorpus && (cals === null || cals < 350)) {
    return {
      momentos_dia: ['almuerzo', 'cena'],
      rol_plato: 'primero',
      confianza: 'media',
    };
  }

  const hasMeatInIngredients = containsKeyword(ingredientNames, SECOND_COURSE_MEAT_KEYWORDS);
  const hasFishInIngredients = containsKeyword(ingredientNames, SECOND_COURSE_FISH_KEYWORDS);

  if ((hasMeatInIngredients || hasFishInIngredients) && (cals === null || cals < 550)) {
    return {
      momentos_dia: ['almuerzo', 'cena'],
      rol_plato: 'segundo',
      confianza: 'media',
    };
  }

  // ===========================================================================
  // REGLA 6: FALLBACK DETERMINISTA POR DEFECTO
  // ===========================================================================
  // Si no se encuentra patrón concluyente, un plato salado general se asigna
  // como plato único apto para almuerzo y cena con confianza baja.
  return {
    momentos_dia: ['almuerzo', 'cena'],
    rol_plato: 'completo',
    confianza: 'baja',
  };
}

/**
 * Regla de exclusión para el planificador:
 * Las recetas con rol 'postre' quedan estrictamente excluidas de asignarse
 * como primer o segundo plato / plato principal en el planificador de comidas.
 */
export function isDessertExcludedFromSlot(rolPlato?: RolPlato | null, slot?: string): boolean {
  if (rolPlato === 'postre') {
    return slot === 'almuerzo_1' || slot === 'almuerzo_2';
  }
  return false;
}

