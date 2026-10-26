import { RecetaIngrediente } from '@/types/recipe';
import { classifyIngredientAisle } from './aisles';
import { scaleIngredientsWithCulinaryHeuristics } from './scaler';

export interface PlanSlotForShopping {
  fecha: string;
  slot: string;
  receta_id: string;
  porciones?: number | null;
  recetas?: {
    id: string;
    titulo: string;
    porciones?: number | null;
  } | null;
}

export interface ShoppingListItem {
  nombre: string;
  cantidadTotal: number;
  unidad: string;
  gramosTotal: number;
  pasillo_supermercado: string;
  recetasNombres: string[];
}

export interface CanonicalIngredient {
  key: string;
  displayName: string;
}

/**
 * Lematizador de palabras individuales en español (singularización).
 */
export function lemmatizeSpanishWord(word: string): string {
  const w = word.trim().toLowerCase();
  if (w.length <= 3) return w;

  // Plurales en -ces (nueces -> nuez)
  if (w.endsWith('ces') && w.length > 4) {
    return w.slice(0, -3) + 'z';
  }

  // Plurales en -es con raíz en consonante [lrnd] (limones -> limon, champiñones -> champinon)
  if (w.endsWith('es') && w.length > 4) {
    const root = w.slice(0, -2);
    if (/[lrnd]$/.test(root)) {
      return root;
    }
  }

  // Plurales regulares que terminan en 's' precedida de vocal (pechugas -> pechuga, filetes -> filete, rodajas -> rodaja, latas -> lata, lonchas -> loncha, huevos -> huevo)
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) {
    const beforeS = w.slice(0, -1);
    if (/[aeiou]$/.test(beforeS)) {
      return beforeS;
    }
  }

  return w;
}

/**
 * Tabla estática de equivalencias peso promedio por pieza en gramos para alimentos frescos comunes
 */
export const FRESH_PIECE_WEIGHT_G: Record<string, number> = {
  cebolla: 150,
  'cebolla morada': 150,
  tomate: 150,
  'tomate seco': 10,
  tomate_seco: 10,
  patata: 180,
  boniato: 250,
  batata: 250,
  lechuga: 250,
  limon: 100,
  lima: 80,
  zanahoria: 100,
  aguacate: 150,
  calabacin: 250,
  berenjena: 250,
  pepino: 200,
  manzana: 180,
  platano: 120,
  pera: 160,
  pimiento: 150,
  'pimiento verde': 120,
  'pimiento rojo': 180,
};

/**
 * Alimentos donde la compra habitual en supermercado es al peso (gramos) en lugar de piezas individuales
 * (deshidratados, conservas, frutos secos, encurtidos con peso específico).
 */
export const PREFER_GRAMS_INGREDIENTS = new Set([
  'tomate seco',
  'tomate_seco',
]);

/**
 * Lista de especias, hierbas secas y condimentos básicos de despensa.
 * En la lista de la compra se consolidan bajo indicación "Comprobar despensa"
 * sin mostrar gramajes mínimos innecesarios (ej. 2 g o 3 g).
 */
export const PANTRY_SPICE_KEYWORDS = [
  'oregano',
  'comino',
  'pimenton',
  'pimenton dulce',
  'pimenton picante',
  'canela',
  'pimienta',
  'pimienta negra',
  'pimienta blanca',
  'tomillo',
  'nuez moscada',
  'clavo',
  'clavo de olor',
  'azafran',
  'curcuma',
  'curry',
  'cardamomo',
  'cayena',
  'guindilla',
  'laurel',
  'romero',
  'eneldo',
  'vainilla',
  'albahaca seca',
  'jengibre en polvo',
  'ajo en polvo',
  'cebolla en polvo',
  'hierbas provenzales',
  'hierbas italianas',
  'sal fina',
  'sal marina',
  'sal de mesa',
  'sal comun',
  'sal',
];

export function isPantrySpice(keyOrName: string): boolean {
  if (!keyOrName) return false;
  const norm = keyOrName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return PANTRY_SPICE_KEYWORDS.some((sp) => {
    const reg = new RegExp(`(^|\\s)${sp}(\\s|$)`, 'i');
    return reg.test(norm);
  });
}

/**
 * Normalización canónica de ingredientes culinarios para la lista de la compra:
 * 1. Remueve acentos, mayúsculas y caracteres diacríticos.
 * 2. Recorta opciones secundarias ("... o queso...", "... o tofu...") y notas de texto largo.
 * 3. Erradica calibres y clases secundarias (ej. "huevos l", "huevo tamano m" -> "huevo").
 * 4. Lematiza locuciones compuestas en español con preposiciones ('de', 'del', 'al', 'con', 'en')
 *    (ej. "filetes de merluza" -> "filete de merluza", "pechugas de pollo" -> "pechuga de pollo", "latas de atun" -> "lata de atun").
 * 5. Lematiza singular/plural culinario y aplica sinónimos culinarios consolidados.
 */
export function normalizeIngredientKey(rawName: string): CanonicalIngredient {
  if (!rawName) return { key: '', displayName: '' };

  let cleanedOriginal = rawName.trim();

  // Fase A - Sanitización de Entrada:
  // Erradicar cantidades y unidades incrustadas en el nombre del ingrediente mediante regex inicial
  // (ej. "4 g de orégano seco" -> "orégano seco")
  cleanedOriginal = cleanedOriginal
    .replace(/^(\d+[\d.,/]*\s*(g|gr|grs|gramo|gramos|kg|kgs|kilo|kilos|ml|mls|l|lt|lts|litro|litros|cda|cdas|cdta|cdtas|cucharada|cucharadas|cucharadita|cucharaditas|diente|dientes|unidad|unidades|ud|uds|pieza|piezas|pizca|pizcas|punado|puñado|punados|puñados)?\s*(de\s+)?)/i, '')
    .replace(/^(un|una|unos|unas)\s+(de\s+)?/i, '')
    .trim();

  // Fase B - Disolución de Ingredientes Compuestos con Sal:
  // Si la cadena contiene patrones como "sal y [especia]" o "sal con [especia]" (ej. "sal y orégano", "sal y pimienta negra"), extraer la especia y descartar la sal de mesa
  cleanedOriginal = cleanedOriginal
    .replace(/^sal(\s+(fina|marina|de mesa|comun))?\s+(y|con)\s+/i, '')
    .replace(/\s+(y|con)\s+sal(\s+(fina|marina|de mesa|comun))?$/i, '')
    .trim();

  // Limpieza de alternativas ("... o queso...", "... o tofu..."), notas secundarias y puntuación
  cleanedOriginal = cleanedOriginal
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/\s+(o|u)\s+.*$/i, '')
    .replace(/\b(al gusto|opcional|para decorar|para servir|para acompanar)\b/gi, '')
    .trim();

  // Normalizar tildes, mayúsculas y caracteres diacríticos
  let norm = cleanedOriginal
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // Limpiar caracteres especiales de puntuación
  norm = norm.replace(/[.,;:"'()\[\]{}*!¡?¿/\\-]/g, ' ').replace(/\s+/g, ' ').trim();

  // Erradicar calibres o clases secundarias en huevos y básicos:
  // remover sufijos/modificadores como " l", " m", " xl", " s", "tamano l", "clase l", "frescos", "grandes", "medianos"
  norm = norm
    .replace(/\b(tamano|talla|calibre|clase)\s+(xl|l|m|s)\b/gi, '')
    .replace(/\b(xl|l|m|s)\b/gi, '')
    .replace(/\b(frescos?|grandes?|medianos?|pequenos?|camperos?|ecologicos?|blancos?|morenos?)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Fase C - Lematización Adjetival y Compuesta:
  const PREPOSITIONS = new Set(['de', 'del', 'al', 'con', 'en']);
  const words = norm.split(' ');
  let wasCompoundLemmatized = false;

  // C.1 Locuciones con preposiciones ('filetes de merluza' -> 'filete de merluza')
  if (words.length >= 2 && words.some((w, idx) => idx > 0 && PREPOSITIONS.has(w))) {
    const head = words[0];
    const singularHead = lemmatizeSpanishWord(head);
    if (singularHead !== head) {
      words[0] = singularHead;
      norm = words.join(' ');
      wasCompoundLemmatized = true;
    }
  }
  // C.2 Sintagmas nominales plurales con adjetivo o participio sin preposición ('tomates secos' / 'tomates seco' -> 'tomate seco')
  else if (words.length >= 2 && !words.some((w) => PREPOSITIONS.has(w))) {
    const lemmatizedWords = words.map((w) => lemmatizeSpanishWord(w));
    const lemmatizedPhrase = lemmatizedWords.join(' ');
    if (lemmatizedPhrase !== norm) {
      norm = lemmatizedPhrase;
      wasCompoundLemmatized = true;
    }
  }

  // 4. Diccionario de variantes ortográficas y sinónimos directos
  const SYNONYMS: Record<string, { key: string; displayName: string }> = {
    'azucar glass': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar glas': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar impalpable': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar flor': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar lustre': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar en polvo': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar pulverizada': { key: 'azucar glas', displayName: 'Azúcar glas' },

    'aove': { key: 'aceite de oliva virgen extra', displayName: 'Aceite de oliva virgen extra' },
    'aceite de oliva virgen extra': { key: 'aceite de oliva virgen extra', displayName: 'Aceite de oliva virgen extra' },
    'aceite de oliva': { key: 'aceite de oliva virgen extra', displayName: 'Aceite de oliva virgen extra' },
    'aceite oliva': { key: 'aceite de oliva virgen extra', displayName: 'Aceite de oliva virgen extra' },
    'aceite oliva virgen extra': { key: 'aceite de oliva virgen extra', displayName: 'Aceite de oliva virgen extra' },

    'harina de trigo': { key: 'harina de trigo', displayName: 'Harina de trigo' },
    'harina': { key: 'harina de trigo', displayName: 'Harina de trigo' },
    'harina trigo': { key: 'harina de trigo', displayName: 'Harina de trigo' },
    'harina comun': { key: 'harina de trigo', displayName: 'Harina de trigo' },
    'harina todo uso': { key: 'harina de trigo', displayName: 'Harina de trigo' },
    'harina 000': { key: 'harina de trigo', displayName: 'Harina de trigo' },
    'harina 0000': { key: 'harina de trigo', displayName: 'Harina de trigo' },

    'sal fina': { key: 'sal', displayName: 'Sal fina' },
    'sal marina': { key: 'sal', displayName: 'Sal marina' },
    'sal de mesa': { key: 'sal', displayName: 'Sal de mesa' },
    'sal comun': { key: 'sal', displayName: 'Sal' },
    'sal': { key: 'sal', displayName: 'Sal' },

    'pimienta negra molida': { key: 'pimienta negra', displayName: 'Pimienta negra' },
    'pimienta molida': { key: 'pimienta negra', displayName: 'Pimienta negra' },
    'pimienta negra': { key: 'pimienta negra', displayName: 'Pimienta negra' },
    'pimienta': { key: 'pimienta negra', displayName: 'Pimienta negra' },

    'zumo de limon': { key: 'limon', displayName: 'Limón' },
    'zumo limon': { key: 'limon', displayName: 'Limón' },
    'jugo de limon': { key: 'limon', displayName: 'Limón' },
    'jugo limon': { key: 'limon', displayName: 'Limón' },
    'zumo de lima': { key: 'lima', displayName: 'Lima' },
    'zumo lima': { key: 'lima', displayName: 'Lima' },
    'jugo de lima': { key: 'lima', displayName: 'Lima' },
    'jugo lima': { key: 'lima', displayName: 'Lima' },

    'boniato asado': { key: 'boniato', displayName: 'Boniato' },
    'boniatos asados': { key: 'boniato', displayName: 'Boniato' },
    'batata asada': { key: 'boniato', displayName: 'Boniato' },
    'batatas asadas': { key: 'boniato', displayName: 'Boniato' },
    'batata': { key: 'boniato', displayName: 'Boniato' },
    'batatas': { key: 'boniato', displayName: 'Boniato' },
    'camote': { key: 'boniato', displayName: 'Boniato' },
    'camotes': { key: 'boniato', displayName: 'Boniato' },

    'lechuga romana': { key: 'lechuga', displayName: 'Lechuga' },
    'lechugas romanas': { key: 'lechuga', displayName: 'Lechuga' },
    'lechuga iceberg': { key: 'lechuga', displayName: 'Lechuga' },
    'lechugas iceberg': { key: 'lechuga', displayName: 'Lechuga' },
    'lechuga rizada': { key: 'lechuga', displayName: 'Lechuga' },
    'cogollo de lechuga': { key: 'lechuga', displayName: 'Lechuga' },
    'cogollos de lechuga': { key: 'lechuga', displayName: 'Lechuga' },
    'cogollo': { key: 'lechuga', displayName: 'Lechuga' },
    'cogollos': { key: 'lechuga', displayName: 'Lechuga' },

    'yogur': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogures': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogur natural': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogures naturales': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogur griego': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogures griegos': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogur griego natural': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogures griegos naturales': { key: 'yogur natural', displayName: 'Yogur natural' },

    // Tomate seco (unificación singular/plural y adjetivos)
    'tomate seco': { key: 'tomate seco', displayName: 'Tomate seco' },
    'tomates secos': { key: 'tomate seco', displayName: 'Tomate seco' },
    'tomates seco': { key: 'tomate seco', displayName: 'Tomate seco' },
    'tomate deshidratado': { key: 'tomate seco', displayName: 'Tomate seco' },
    'tomates deshidratados': { key: 'tomate seco', displayName: 'Tomate seco' },

    // Garbanzos cocidos y legumbres en conserva
    'garbanzo en conserva': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos' },
    'garbanzos en conserva': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos' },
    'garbanzo cocido': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos' },
    'garbanzos cocidos': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos' },
    'garbanzo de bote': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos' },
    'garbanzos de bote': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos' },
    'garbanzo en bote': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos' },
    'garbanzos en bote': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos' },
    'garbanzo bote': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos' },
    'garbanzos bote': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos' },
    'lenteja en conserva': { key: 'lentejas cocidas', displayName: 'Lentejas cocidas' },
    'lentejas en conserva': { key: 'lentejas cocidas', displayName: 'Lentejas cocidas' },
    'lenteja cocida': { key: 'lentejas cocidas', displayName: 'Lentejas cocidas' },
    'lentejas cocidas': { key: 'lentejas cocidas', displayName: 'Lentejas cocidas' },
    'alubia en conserva': { key: 'alubias cocidas', displayName: 'Alubias cocidas' },
    'alubias en conserva': { key: 'alubias cocidas', displayName: 'Alubias cocidas' },
    'alubia cocida': { key: 'alubias cocidas', displayName: 'Alubias cocidas' },
    'alubias cocidas': { key: 'alubias cocidas', displayName: 'Alubias cocidas' },

    // Miel
    'miel de abeja': { key: 'miel', displayName: 'Miel' },
    'miel pura': { key: 'miel', displayName: 'Miel' },
    'miel de flores': { key: 'miel', displayName: 'Miel' },
    'miel natural': { key: 'miel', displayName: 'Miel' },
    'miel': { key: 'miel', displayName: 'Miel' },

    // Tomate triturado
    'tomate triturado': { key: 'tomate triturado', displayName: 'Tomate triturado' },
    'tomate triturado natural': { key: 'tomate triturado', displayName: 'Tomate triturado' },
    'tomate natural triturado': { key: 'tomate triturado', displayName: 'Tomate triturado' },
    'tomates triturados': { key: 'tomate triturado', displayName: 'Tomate triturado' },
    'lata de tomate triturado': { key: 'tomate triturado', displayName: 'Tomate triturado' },
    'latas de tomate triturado': { key: 'tomate triturado', displayName: 'Tomate triturado' },
    'bote de tomate triturado': { key: 'tomate triturado', displayName: 'Tomate triturado' },
    'botes de tomate triturado': { key: 'tomate triturado', displayName: 'Tomate triturado' },

    // Especias y condimentos limpios
    'oregano seco': { key: 'oregano', displayName: 'Orégano seco' },
    'oregano en polvo': { key: 'oregano', displayName: 'Orégano' },
    'oregano': { key: 'oregano', displayName: 'Orégano' },
    'comino en polvo': { key: 'comino', displayName: 'Comino' },
    'comino molido': { key: 'comino', displayName: 'Comino' },
    'canela en polvo': { key: 'canela', displayName: 'Canela' },
    'canela molida': { key: 'canela', displayName: 'Canela' },
    'curcuma en polvo': { key: 'curcuma', displayName: 'Cúrcuma' },
    'curry en polvo': { key: 'curry', displayName: 'Curry' },
    'jengibre en polvo': { key: 'jengibre', displayName: 'Jengibre' },
    'tomillo seco': { key: 'tomillo', displayName: 'Tomillo' },
    'romero seco': { key: 'romero', displayName: 'Romero' },
    'albahaca seca': { key: 'albahaca', displayName: 'Albahaca' },
    'perejil seco': { key: 'perejil', displayName: 'Perejil' },
    'pimenton dulce': { key: 'pimenton dulce', displayName: 'Pimentón dulce' },
    'pimenton picante': { key: 'pimenton picante', displayName: 'Pimentón picante' },
    'pimenton de la vera': { key: 'pimenton', displayName: 'Pimentón' },
    'laurel seco': { key: 'laurel', displayName: 'Laurel' },
    'hojas de laurel': { key: 'laurel', displayName: 'Laurel' },
    'hoja de laurel': { key: 'laurel', displayName: 'Laurel' },
  };

  if (SYNONYMS[norm]) {
    return SYNONYMS[norm];
  }

  // 5. Lematización singular/plural culinaria
  const LEMMAS: Record<string, { key: string; displayName: string }> = {
    'huevo': { key: 'huevo', displayName: 'Huevos' },
    'huevos': { key: 'huevo', displayName: 'Huevos' },
    'huevo cocido': { key: 'huevo', displayName: 'Huevos' },
    'huevos cocidos': { key: 'huevo', displayName: 'Huevos' },
    'huevo de gallina': { key: 'huevo', displayName: 'Huevos' },
    'huevos de gallina': { key: 'huevo', displayName: 'Huevos' },
    'huevo campero': { key: 'huevo', displayName: 'Huevos' },
    'huevos camperos': { key: 'huevo', displayName: 'Huevos' },
    'huevo duro': { key: 'huevo', displayName: 'Huevos' },
    'huevos duros': { key: 'huevo', displayName: 'Huevos' },
    'clara de huevo': { key: 'clara de huevo', displayName: 'Clara de huevo' },
    'claras de huevo': { key: 'clara de huevo', displayName: 'Clara de huevo' },
    'claras': { key: 'clara de huevo', displayName: 'Clara de huevo' },
    'yema de huevo': { key: 'yema de huevo', displayName: 'Yema de huevo' },
    'yemas de huevo': { key: 'yema de huevo', displayName: 'Yema de huevo' },
    'yemas': { key: 'yema de huevo', displayName: 'Yema de huevo' },

    'cebolla': { key: 'cebolla', displayName: 'Cebolla' },
    'cebollas': { key: 'cebolla', displayName: 'Cebolla' },
    'cebolla morada': { key: 'cebolla morada', displayName: 'Cebolla morada' },
    'cebollas moradas': { key: 'cebolla morada', displayName: 'Cebolla morada' },
    'cebolleta': { key: 'cebolleta', displayName: 'Cebolleta' },
    'cebolletas': { key: 'cebolleta', displayName: 'Cebolleta' },

    'diente de ajo': { key: 'diente de ajo', displayName: 'Diente de ajo' },
    'dientes de ajo': { key: 'diente de ajo', displayName: 'Diente de ajo' },
    'diente ajo': { key: 'diente de ajo', displayName: 'Diente de ajo' },
    'dientes ajo': { key: 'diente de ajo', displayName: 'Diente de ajo' },
    'ajo': { key: 'diente de ajo', displayName: 'Diente de ajo' },
    'ajos': { key: 'diente de ajo', displayName: 'Diente de ajo' },

    'patata': { key: 'patata', displayName: 'Patata' },
    'patatas': { key: 'patata', displayName: 'Patata' },
    'papa': { key: 'patata', displayName: 'Patata' },
    'papas': { key: 'patata', displayName: 'Patata' },

    'boniato': { key: 'boniato', displayName: 'Boniato' },
    'boniatos': { key: 'boniato', displayName: 'Boniato' },

    'lechuga': { key: 'lechuga', displayName: 'Lechuga' },
    'lechugas': { key: 'lechuga', displayName: 'Lechuga' },

    'zanahoria': { key: 'zanahoria', displayName: 'Zanahoria' },
    'zanahorias': { key: 'zanahoria', displayName: 'Zanahoria' },

    'limon': { key: 'limon', displayName: 'Limón' },
    'limones': { key: 'limon', displayName: 'Limón' },
    'lima': { key: 'lima', displayName: 'Lima' },
    'limas': { key: 'lima', displayName: 'Lima' },

    'tomate': { key: 'tomate', displayName: 'Tomate' },
    'tomates': { key: 'tomate', displayName: 'Tomate' },
    'tomate cherry': { key: 'tomate cherry', displayName: 'Tomate cherry' },
    'tomates cherry': { key: 'tomate cherry', displayName: 'Tomate cherry' },
    'tomates cherries': { key: 'tomate cherry', displayName: 'Tomate cherry' },

    'pimiento': { key: 'pimiento', displayName: 'Pimiento' },
    'pimientos': { key: 'pimiento', displayName: 'Pimiento' },
    'pimiento verde': { key: 'pimiento verde', displayName: 'Pimiento verde' },
    'pimientos verdes': { key: 'pimiento verde', displayName: 'Pimiento verde' },
    'pimiento rojo': { key: 'pimiento rojo', displayName: 'Pimiento rojo' },
    'pimientos rojos': { key: 'pimiento rojo', displayName: 'Pimiento rojo' },

    'aguacate': { key: 'aguacate', displayName: 'Aguacate' },
    'aguacates': { key: 'aguacate', displayName: 'Aguacate' },

    'calabacin': { key: 'calabacin', displayName: 'Calabacín' },
    'calabacines': { key: 'calabacin', displayName: 'Calabacín' },

    'berenjena': { key: 'berenjena', displayName: 'Berenjena' },
    'berenjenas': { key: 'berenjena', displayName: 'Berenjena' },

    'pepino': { key: 'pepino', displayName: 'Pepino' },
    'pepinos': { key: 'pepino', displayName: 'Pepino' },

    'manzana': { key: 'manzana', displayName: 'Manzana' },
    'manzanas': { key: 'manzana', displayName: 'Manzana' },

    'platano': { key: 'platano', displayName: 'Plátano' },
    'platanos': { key: 'platano', displayName: 'Plátano' },
    'banana': { key: 'platano', displayName: 'Plátano' },
    'bananas': { key: 'platano', displayName: 'Plátano' },

    'pera': { key: 'pera', displayName: 'Pera' },
    'peras': { key: 'pera', displayName: 'Pera' },

    'champinon': { key: 'champinon', displayName: 'Champiñón' },
    'champinones': { key: 'champinon', displayName: 'Champiñón' },

    'pechuga de pollo': { key: 'pechuga de pollo', displayName: 'Pechuga de pollo' },
    'pechugas de pollo': { key: 'pechuga de pollo', displayName: 'Pechuga de pollo' },
    'muslo de pollo': { key: 'muslo de pollo', displayName: 'Muslo de pollo' },
    'muslos de pollo': { key: 'muslo de pollo', displayName: 'Muslo de pollo' },
    'alita de pollo': { key: 'alitas de pollo', displayName: 'Alitas de pollo' },
    'alitas de pollo': { key: 'alitas de pollo', displayName: 'Alitas de pollo' },

    'oregano': { key: 'oregano', displayName: 'Orégano' },
    'comino': { key: 'comino', displayName: 'Comino' },
    'canela': { key: 'canela', displayName: 'Canela' },
    'tomillo': { key: 'tomillo', displayName: 'Tomillo' },
    'romero': { key: 'romero', displayName: 'Romero' },
    'azafran': { key: 'azafran', displayName: 'Azafrán' },
    'curcuma': { key: 'curcuma', displayName: 'Cúrcuma' },
    'curry': { key: 'curry', displayName: 'Curry' },
    'jengibre': { key: 'jengibre', displayName: 'Jengibre' },
    'clavo': { key: 'clavo', displayName: 'Clavo de olor' },
    'clavos': { key: 'clavo', displayName: 'Clavo de olor' },
    'clavo de olor': { key: 'clavo', displayName: 'Clavo de olor' },
    'clavos de olor': { key: 'clavo', displayName: 'Clavo de olor' },
    'nuez moscada': { key: 'nuez moscada', displayName: 'Nuez moscada' },
    'laurel': { key: 'laurel', displayName: 'Laurel' },
    'perejil': { key: 'perejil', displayName: 'Perejil' },
    'albahaca': { key: 'albahaca', displayName: 'Albahaca' },
  };

  if (LEMMAS[norm]) {
    return LEMMAS[norm];
  }

  // Lematizador heurístico general para plurales regulares en español
  const lemmaKey = lemmatizeSpanishWord(norm);

  // Capitalización limpia del nombre
  let displayName = cleanedOriginal.trim();
  if (wasCompoundLemmatized || lemmaKey !== norm) {
    displayName = lemmaKey.charAt(0).toUpperCase() + lemmaKey.slice(1);
  } else {
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  }

  return {
    key: lemmaKey,
    displayName,
  };
}

/**
 * Redondeo y homogeneización estricta para la lista de la compra:
 * - Gramos y Mililitros: enteros limpios (múltiplos de 5 si > 20 g/ml).
 * - Kilos y Litros: redondear a 1 decimal como máximo (ej. 1.2 kg, nunca 1.23 kg).
 * - Piezas y Unidades Contables (huevos, cebollas, limones, dientes de ajo, botes, latas):
 *   * Redondeo estricto hacia arriba con Math.ceil() para erradicar mitades o decimales absurdos en la compra (ej. 1.3 o 1.5 -> 2).
 */
export function roundShoppingListAmount(amount: number, unidad?: string | null): number {
  if (!amount || amount <= 0 || isNaN(amount)) return 0;
  const u = String(unidad || '').toLowerCase().replace(/[.,;:]/g, '').trim();

  // 1. Gramos y mililitros
  if (/^(g|gr|grs|gramo|gramos|gram|grams|ml|mls|mililitro|mililitros|milliliter|milliliters)$/i.test(u)) {
    if (amount <= 20) return Math.max(1, Math.round(amount));
    const mult5 = Math.round(amount / 5) * 5;
    return mult5 === 0 ? Math.round(amount) : mult5;
  }

  // 2. Kilos y litros
  if (/^(kg|kgs|kilo|kilos|kilogramo|kilogramos|kilogram|kilograms|l|lt|lts|litro|litros|liter|liters)$/i.test(u)) {
    if (Number.isInteger(amount)) return amount;
    return Math.round(amount * 10) / 10;
  }

  // 3. Piezas y unidades contables (huevos, cebollas, limones, dientes de ajo, botes, latas, paquetes, unidades, ud, uds)
  // En la lista de la compra, cualquier cantidad contable se redondea estrictamente hacia arriba con Math.ceil(amount)
  if (
    /^(unidad|unidades|unit|units|pieza|piezas|piece|pieces|huevo|huevos|egg|eggs|diente|dientes|clove|cloves|bote|botes|lata|latas|can|cans|paquete|paquetes|package|packages|jar|jars|sobre|sobres|ud|uds)$/i.test(
      u
    )
  ) {
    return Math.max(1, Math.ceil(amount));
  }

  // 4. Medidas de cuchara / taza
  if (/^(cucharada|cucharadas|cucharadita|cucharaditas|tbsp|tsp|taza|tazas|cup|cups|vaso|vasos)$/i.test(u)) {
    if (amount < 2) {
      const quarter = Math.round(amount * 4) / 4;
      return quarter <= 0 ? 0.25 : quarter;
    }
    return Math.round(amount * 2) / 2;
  }

  // 5. Resto de unidades: redondeo comercial superior para evitar fracciones inutilizables en supermercado
  return Math.max(1, Math.ceil(amount));
}

/**
 * Normaliza la unidad singular o plural según la cantidad final consolidada
 */
export function formatShoppingUnitPlural(unidad: string, cantidad: number): string {
  const u = (unidad || 'unidad').trim().toLowerCase();
  if (u === 'unidad' || u === 'unidades' || u === 'ud' || u === 'uds' || u === 'u') {
    return cantidad > 1 ? 'unidades' : 'unidad';
  }
  if (u === 'unit' || u === 'units') {
    return cantidad > 1 ? 'units' : 'unit';
  }
  if (u === 'pieza' || u === 'piezas') {
    return cantidad > 1 ? 'piezas' : 'pieza';
  }
  if (u === 'diente' || u === 'dientes') {
    return cantidad > 1 ? 'dientes' : 'diente';
  }
  if (u === 'lata' || u === 'latas') {
    return cantidad > 1 ? 'latas' : 'lata';
  }
  if (u === 'bote' || u === 'botes') {
    return cantidad > 1 ? 'botes' : 'bote';
  }
  if (u === 'paquete' || u === 'paquetes') {
    return cantidad > 1 ? 'paquetes' : 'paquete';
  }
  if (u === 'cucharada' || u === 'cucharadas') {
    return cantidad > 1 ? 'cucharadas' : 'cucharada';
  }
  if (u === 'cucharadita' || u === 'cucharaditas') {
    return cantidad > 1 ? 'cucharaditas' : 'cucharadita';
  }
  if (u === 'taza' || u === 'tazas') {
    return cantidad > 1 ? 'tazas' : 'taza';
  }
  return u;
}

/**
 * Generador de lista de la compra unificada con CONSOLIDACIÓN CANÓNICA:
 * - Unifica ingredientes equivalentes bajo su clave canónica lematizada
 *   (ej. "Huevo (2 ud)", "Huevos (4 ud)" y "Huevos L (2 ud)" -> "Huevo (8 unidades)").
 * - Homogeneiza variantes ortográficas y sinónimos directos ("Azúcar glass" vs "Azúcar glas").
 * - Escala con el motor culinario sublineal/lineal (scaler.ts) respetando porciones.
 * - Suma cantidades numéricas de items coincidentes y consolida los títulos de los platos.
 */
export function generateShoppingListFromPlans(
  plans: PlanSlotForShopping[],
  rawIngredientes: (RecetaIngrediente & { pasillo_supermercado?: string })[],
  userDefaultServings: number = 4
): ShoppingListItem[] {
  // 1. Indexar ingredientes originales por ID de receta
  const ingredientsByRecipe = new Map<string, (RecetaIngrediente & { pasillo_supermercado?: string })[]>();
  for (const ing of rawIngredientes || []) {
    if (!ing?.receta_id) continue;
    const list = ingredientsByRecipe.get(ing.receta_id) || [];
    list.push(ing);
    ingredientsByRecipe.set(ing.receta_id, list);
  }

  // 2. Acumulador intermedio para consolidación
  interface ConsolidatedAcc {
    nombre: string;
    rawCantidad: number;
    rawGramos: number;
    unidad: string;
    pasillo_supermercado: string;
    recetasNombres: string[];
  }
  const consolidated = new Map<string, ConsolidatedAcc>();

  // 3. Iterar cada slot del plan y escalar sus ingredientes mediante el motor culinario
  for (const p of plans || []) {
    if (!p.receta_id) continue;
    const recipeIngs = ingredientsByRecipe.get(p.receta_id);
    if (!recipeIngs || recipeIngs.length === 0) continue;

    const titulo = p.recetas?.titulo || 'Receta';
    const basePorciones = Number(p.recetas?.porciones) || userDefaultServings;
    const targetServings = Number(p.porciones) || userDefaultServings;

    // Conexión directa a scaler.ts: sublineal para sal/especias, aceite, levaduras y lineal para bulk
    const scaledList = scaleIngredientsWithCulinaryHeuristics(
      recipeIngs,
      basePorciones,
      targetServings
    );

    for (const item of scaledList) {
      const rawName = (item.nombre_limpio || item.nombre_crudo || '').trim();
      if (!rawName) continue;

      // Normalización canónica de clave y nombre de presentación
      const canon = normalizeIngredientKey(rawName);
      if (!canon.key) continue;

      const uRaw = (item.unidad || 'unidad').trim().toLowerCase();

      // Normalizar unidad base para la clave de agregación
      let canonicalUnitKey = uRaw;
      let unitConversionFactor = 1;

      if (/^(unidad|unidades|unit|units|pieza|piezas|piece|pieces|huevo|huevos|ud|uds|u)$/i.test(uRaw)) {
        canonicalUnitKey = 'unidad';
      } else if (/^(diente|dientes|clove|cloves)$/i.test(uRaw)) {
        canonicalUnitKey = 'diente';
      } else if (/^(bote|botes)$/i.test(uRaw)) {
        canonicalUnitKey = 'bote';
      } else if (/^(lata|latas)$/i.test(uRaw)) {
        canonicalUnitKey = 'lata';
      } else if (/^(paquete|paquetes)$/i.test(uRaw)) {
        canonicalUnitKey = 'paquete';
      } else if (/^(cucharada|cucharadas|tbsp)$/i.test(uRaw)) {
        canonicalUnitKey = 'cucharada';
      } else if (/^(cucharadita|cucharaditas|tsp)$/i.test(uRaw)) {
        canonicalUnitKey = 'cucharadita';
      } else if (/^(taza|tazas|cup|cups)$/i.test(uRaw)) {
        canonicalUnitKey = 'taza';
      } else if (/^(gramo|gramos|gr|grs|g)$/i.test(uRaw)) {
        canonicalUnitKey = 'g';
      } else if (/^(mililitro|mililitros|ml|mls)$/i.test(uRaw)) {
        canonicalUnitKey = 'ml';
      } else if (/^(kilo|kilos|kilogramo|kilogramos|kg|kgs)$/i.test(uRaw)) {
        canonicalUnitKey = 'g';
        unitConversionFactor = 1000;
      } else if (/^(litro|litros|l|lt|lts)$/i.test(uRaw)) {
        canonicalUnitKey = 'ml';
        unitConversionFactor = 1000;
      }

      let rawAmount =
        Number(item.cantidad_escalada) ||
        Number(item.cantidad) * (targetServings / basePorciones) ||
        0;
      let cant = rawAmount * unitConversionFactor;
      let gramos = Number(item.gramos_escalados) || 0;

      // 1. Especias y condimentos: no mostrar en gramos mínimos ("2 g", "3 g") -> marcar como despensa
      if (isPantrySpice(canon.key)) {
        canonicalUnitKey = 'despensa';
        cant = 0;
        gramos = 0;
      }
      // 2. Aceite de oliva / AOVE: no acumular mililitros fraccionados de cocina -> presentar como 1 botella (o revisar despensa)
      else if (canon.key === 'aceite de oliva virgen extra') {
        canonicalUnitKey = 'botella';
        cant = 1;
        gramos = 0;
      }
      // 3. Unificación de ajos bajo la unidad contable canónica 'diente'
      else if (canon.key === 'diente de ajo') {
        if (canonicalUnitKey === 'unidad' || canonicalUnitKey === 'diente') {
          canonicalUnitKey = 'diente';
        } else if (canonicalUnitKey === 'g') {
          // Peso promedio de 1 diente de ajo ≈ 5 g
          cant = cant / 5;
          canonicalUnitKey = 'diente';
        }
      }
      // 4. Huevos: unificación bajo unidad contable canónica
      else if (canon.key === 'huevo') {
        canonicalUnitKey = 'unidad';
      }
      // 5. Limón y cítricos: si se piden ml de zumo, convertir mediante equivalencia (1 limón ≈ 35 ml de zumo)
      else if (canon.key === 'limon' || canon.key === 'lima') {
        if (canonicalUnitKey === 'ml') {
          cant = cant / 35;
          canonicalUnitKey = 'unidad';
        } else if (canonicalUnitKey === 'g') {
          const pieceWeight = FRESH_PIECE_WEIGHT_G[canon.key] || 100;
          cant = cant / pieceWeight;
          canonicalUnitKey = 'unidad';
        }
      }
      // 6. Yogures: consolidar bajo su categoría principal en gramos (1 unidad/bote ≈ 125 g)
      else if (canon.key === 'yogur natural') {
        if (canonicalUnitKey === 'unidad' || canonicalUnitKey === 'bote' || canonicalUnitKey === 'paquete') {
          cant = cant * 125;
          canonicalUnitKey = 'g';
        }
        if (gramos === 0) {
          gramos = cant;
        }
      }
      // 7. Puente de conversión peso/pieza para alimentos frescos, hortalizas y deshidratados comunes
      else {
        const pieceWeightG = FRESH_PIECE_WEIGHT_G[canon.key];
        if (pieceWeightG) {
          if (PREFER_GRAMS_INGREDIENTS.has(canon.key)) {
            // En alimentos deshidratados, conservas o encurtidos con peso específico (ej. tomate seco),
            // se unifica preferentemente hacia gramos (unidad comercial de compra en tarro/bolsa)
            if (canonicalUnitKey === 'unidad') {
              cant = cant * pieceWeightG;
              canonicalUnitKey = 'g';
            }
            if (gramos === 0) {
              gramos = cant;
            }
          } else {
            // En alimentos frescos de huerta, se unifica hacia unidades contables (piezas)
            if (canonicalUnitKey === 'g') {
              // Convertir gramos a fracción de unidad usando el peso promedio
              cant = cant / pieceWeightG;
              canonicalUnitKey = 'unidad';
            } else if (canonicalUnitKey === 'unidad') {
              if (gramos === 0) {
                gramos = cant * pieceWeightG;
              }
            }
          }
        }
      }

      // Clave canónica unificada
      const key = `${canon.key}___${canonicalUnitKey}`;

      const pasillo = classifyIngredientAisle(canon.displayName, item.pasillo_supermercado);

      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        existing.rawCantidad += cant;
        existing.rawGramos += gramos;
        if (!existing.recetasNombres.includes(titulo)) {
          existing.recetasNombres.push(titulo);
        }
      } else {
        consolidated.set(key, {
          nombre: canon.displayName,
          rawCantidad: cant,
          unidad: canonicalUnitKey,
          rawGramos: gramos,
          pasillo_supermercado: pasillo,
          recetasNombres: [titulo],
        });
      }
    }
  }

  // 4. Transformar a ShoppingListItem con redondeo y formato homogéneo de unidades
  const result: ShoppingListItem[] = [];
  for (const acc of consolidated.values()) {
    // 1. Manejo especial de despensa para especias y condimentos:
    // Fase D - Presentación Limpia de Especias: nombre estrictamente limpio sin prefijos numéricos residuales
    if (acc.unidad === 'despensa') {
      const cleanSpiceName = acc.nombre
        .replace(/^(\d+[\d.,/]*\s*(g|gr|grs|gramo|gramos|kg|kgs|ml|mls|l|cda|cdas|cdta|cdtas|cucharada|cucharadas|cucharadita|cucharaditas|diente|unidad|ud)?\s*(de\s+)?)/i, '')
        .trim();
      const finalSpiceName = cleanSpiceName ? (cleanSpiceName.charAt(0).toUpperCase() + cleanSpiceName.slice(1)) : acc.nombre;

      result.push({
        nombre: finalSpiceName,
        cantidadTotal: 0,
        unidad: 'Comprobar despensa',
        gramosTotal: 0,
        pasillo_supermercado: acc.pasillo_supermercado,
        recetasNombres: acc.recetasNombres,
      });
      continue;
    }

    // 2. Manejo especial para aceite de oliva
    if (acc.unidad === 'botella') {
      result.push({
        nombre: acc.nombre,
        cantidadTotal: 1,
        unidad: 'botella (o revisar despensa)',
        gramosTotal: 0,
        pasillo_supermercado: acc.pasillo_supermercado,
        recetasNombres: acc.recetasNombres,
      });
      continue;
    }

    let finalUnit = acc.unidad;
    let finalAmount = acc.rawCantidad;

    // Si se acumuló en gramos y supera 1000g, podemos expresar en kg limpios si es entero o decimal limpio
    if (acc.unidad === 'g' && finalAmount >= 1000) {
      const inKg = Math.round((finalAmount / 1000) * 10) / 10;
      // Mantener en kg si es exacto o medio kilo
      if (Number.isInteger(inKg) || inKg * 10 % 5 === 0) {
        finalAmount = inKg;
        finalUnit = 'kg';
      }
    } else if (acc.unidad === 'ml' && finalAmount >= 1000) {
      const inL = Math.round((finalAmount / 1000) * 10) / 10;
      if (Number.isInteger(inL) || inL * 10 % 5 === 0) {
        finalAmount = inL;
        finalUnit = 'l';
      }
    }

    const roundedCantidad = roundShoppingListAmount(finalAmount, finalUnit);
    const formattedUnidad = formatShoppingUnitPlural(finalUnit, roundedCantidad);
    const roundedGramos =
      acc.rawGramos <= 20
        ? Math.round(acc.rawGramos)
        : Math.round(acc.rawGramos / 5) * 5;

    result.push({
      nombre: acc.nombre,
      cantidadTotal: roundedCantidad,
      unidad: formattedUnidad,
      gramosTotal: roundedGramos,
      pasillo_supermercado: acc.pasillo_supermercado,
      recetasNombres: acc.recetasNombres,
    });
  }

  return result.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
