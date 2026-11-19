import { classifyIngredientAisle } from './aisles';
import { isCanonicalSpiceHerbSaltOrPepper } from '@/lib/gemini/schema';

export interface ScaledShoppingInputItem {
  id?: string;
  receta_id?: string;
  nombre_limpio?: string | null;
  nombre_crudo?: string | null;
  cantidad?: number | string | null;
  cantidad_escalada?: number | string | null;
  unidad?: string | null;
  gramos_calculados?: number | null;
  gramos_escalados?: number | null;
  pasillo_supermercado?: string | null;
  notas?: string | null;
  seccion?: string | null;
  explicacion_culinaria?: string | null;
  recetaTitulo?: string | null;
}

export interface ConsolidatedShoppingBreakdown {
  seccion?: string | null;
  recetaTitulo?: string;
  cantidad: number;
  unidad: string;
}

export interface ConsolidatedShoppingItem {
  key: string;
  sourceIds: string[];
  nombre: string;
  cantidadTotal: number;
  unidad: string;
  gramosTotal: number;
  pasillo_supermercado: string;
  recetasNombres: string[];
  notas: string[];
  desglose: ConsolidatedShoppingBreakdown[];
  explicaciones: string[];
}

export interface CanonicalIngredient {
  key: string;
  displayName: string;
  hasCommercialForm?: boolean;
}

/**
 * Formatos de producto comercial procesado o en conserva que DEBEN preservarse en la lista de compra
 * para evitar convertirlos erróneamente a piezas frescas (ej: "Tomate triturado" vs "Tomate").
 */
export const COMMERCIAL_PRESERVED_FORMATS_REGEX =
  /\b(triturad[oa]s?|en\s+conserva|de\s+bote|en\s+polvo|cocid[oa]s?|concentrad[oa]s?|frit[oa]s?|sec[oa]s?|deshidratad[oa]s?|en\s+vinagre|en\s+alm[ií]bar|ahumad[oa]s?)\b/i;

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

  // Plurales regulares que terminan en 's' precedida de vocal
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
  // Frutas y cítricos
  limon: 100,
  lima: 60,
  naranja: 180,
  manzana: 170,
  pera: 160,
  platano: 120,
  aguacate: 180,
  fresa: 20,
  kiwi: 90,
  melocoton: 150,
  mandarina: 80,
  ciruela: 65,

  // Hortalizas y verduras
  cebolla: 150,
  'cebolla morada': 150,
  cebolla_morada: 150,
  cebolleta: 60,
  'diente de ajo': 5,
  'diente ajo': 5,
  diente_ajo: 5,
  patata: 180,
  boniato: 250,
  zanahoria: 90,
  tomate: 140,
  pimiento: 160,
  'pimiento verde': 140,
  pimiento_verde: 140,
  'pimiento rojo': 200,
  pimiento_rojo: 200,
  calabacin: 250,
  berenjena: 280,
  pepino: 200,
  champinon: 20,
  seta: 20,
  apio: 55,
  puerro: 100,
  alcachofa: 120,
  hinojo: 200,
  nabo: 120,
  remolacha: 130,
  esparrago: 20,

  // Huevos
  huevo: 55,

  // Tomate seco (peso unitario deshidratado aprox 8 g por pieza)
  'tomate seco': 8,

  // Cortes cárnicos, aves y pescados (peso promedio por pieza para unificar en gramos)
  'muslo de pollo': 180,
  muslo_de_pollo: 180,
  'contramuslo de pollo': 150,
  contramuslo_de_pollo: 150,
  'pechuga de pollo': 200,
  pechuga_de_pollo: 200,
  'filete de pollo': 130,
  filete_de_pollo: 130,
  'alita de pollo': 60,
  alita_de_pollo: 60,
  'filete de ternera': 180,
  filete_de_ternera: 180,
  'lomo de salmon': 180,
  lomo_de_salmon: 180,
  salmon: 180,
  'lomo de merluza': 160,
  lomo_de_merluza: 160,
  merluza: 160,
  bacalao: 160,
  lubina: 200,
  dorada: 200,
  'chuleta de cerdo': 180,
  chuleta_de_cerdo: 180,
  chuleta: 180,
  salchicha: 50,
  chorizo: 80,
  hamburguesa: 150,
};

export const PREFER_GRAMS_INGREDIENTS = new Set([
  'tomate seco',
  'champinon',
  'seta',
  'esparrago',
  'muslo de pollo',
  'contramuslo de pollo',
  'pechuga de pollo',
  'filete de pollo',
  'alita de pollo',
  'filete de ternera',
  'lomo de salmon',
  'salmon',
  'lomo de merluza',
  'merluza',
  'bacalao',
  'lubina',
  'dorada',
  'chuleta de cerdo',
  'chuleta',
  'salchicha',
  'chorizo',
  'hamburguesa',
]);

/**
 * Hierbas aromáticas frescas que en compra al por menor se adquieren por manojo, maceta o tarrina
 */
export const FRESH_HERBS_SET = new Set([
  'cebollino',
  'perejil',
  'cilantro',
  'albahaca',
  'menta',
  'hierbabuena',
  'eneldo',
]);

/**
 * Básicos secos a granel de despensa doméstica (harinas, azúcares, almidones, pan rallado).
 * Cantidades minúsculas (<= 50 g) se consolidan como comprobación de despensa en vez de exigir paquetes ridículos.
 */
export const PANTRY_BULK_STAPLES = new Set([
  'harina de trigo',
  'harina',
  'maicena',
  'almidon de maiz',
  'azucar',
  'pan rallado',
  'bicarbonato',
  'levadura quimica',
]);

/**
 * Clasificación canónica de especias y condimentos mediante el extractor semántico universal.
 * Evalúa exclusivamente el núcleo rector culinario, evitando falsos positivos como 'mantequilla sin sal'.
 */
export function isPantrySpice(keyOrName: string): boolean {
  if (!keyOrName) return false;
  return isCanonicalSpiceHerbSaltOrPepper(keyOrName, keyOrName);
}

/**
 * Normalización canónica de ingredientes culinarios para la lista de la compra:
 * - Sanea cantidades y formatos embebidos en el nombre.
 * - Elimina cláusulas privativas/calificativas ("sin sal", "con sal") y estados físicos ("en dados", "pomada").
 * - Lematiza singular/plural culinario y aplica sinónimos consolidados.
 */
export function normalizeIngredientKey(rawName: string): CanonicalIngredient {
  if (!rawName) return { key: '', displayName: '' };

  let cleanedOriginal = rawName.trim();

  // Fase A - Sanitización de Entrada:
  // Erradicar cantidades y unidades incrustadas en el nombre del ingrediente
  cleanedOriginal = cleanedOriginal
    .replace(/^(\d+[\d.,/]*\s*(g|gr|grs|gramo|gramos|kg|kgs|kilo|kilos|ml|mls|l|lt|lts|litro|litros|cda|cdas|cdta|cdtas|cucharada|cucharadas|cucharadita|cucharaditas|diente|dientes|unidad|unidades|ud|uds|pieza|piezas|bote|botes|lata|latas|pizca|pizcas|punado|puñado|punados|puñados)?\s*(de\s+)?)/i, '')
    .replace(/^(un|una|unos|unas)\s+(de\s+)?/i, '')
    .trim();

  // Disolución de ingredientes compuestos con sal
  cleanedOriginal = cleanedOriginal
    .replace(/^sal(\s+(fina|marina|de mesa|comun))?\s+(y|con)\s+/i, '')
    .replace(/\s+(y|con)\s+sal(\s+(fina|marina|de mesa|comun))?$/i, '')
    .trim();

  // Limpieza de paréntesis con notas o estados como (pomada), (a temperatura ambiente), (en dados)
  cleanedOriginal = cleanedOriginal
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/\s+(o|u)\s+.*$/i, '')
    .replace(/\b(al gusto|opcional|para decorar|para servir|para acompanar)\b/gi, '')
    .trim();

  // Fase B - Eliminación de modificadores descartables (corte, forma física, temperatura, origen redundante)
  // NOTA: Se preservan explícitamente formatos de producto comercial (triturado, en conserva, de bote, en polvo, cocido en legumbres, etc.)
  cleanedOriginal = cleanedOriginal
    .replace(/\b(sin|con)\s+(sal|azucar|gluten|lactosa)\b/gi, '')
    .replace(/\b(en\s+dados|en\s+cubos|en\s+trozos|en\s+tiras|en\s+rodajas|en\s+pomada|punto\s+pomada|pomada|a\s+temperatura\s+ambiente|fundid[oa]s?|derretid[oa]s?|ablandad[oa]s?)\b/gi, '')
    .replace(/\b(fresc[oa]s?|natural|naturales|madur[oa]s?|de\s+temporada|de\s+abeja|de\s+gallina|de\s+vaca)\b/gi, '')
    .replace(/\b(entera|entero|semidesnatad[oa]s?|desnatad[oa]s?|crud[oa]s?|duro|dura|duros|duras)\b/gi, '')
    .replace(/\b(picad[oa]s?|trocead[oa]s?|cortad[oa]s?|rallad[oa]s?|pelad[oa]s?|machacad[oa]s?|laminad[oa]s?|desmenuzad[oa]s?)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (/\bhuevos?\b/i.test(cleanedOriginal)) {
    cleanedOriginal = cleanedOriginal
      .replace(/\b(cocid[oa]s?|escalfad[oa]s?|poch[eé]|batid[oa]s?)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Normalizar tildes, mayúsculas y caracteres diacríticos
  let norm = cleanedOriginal
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // Limpiar caracteres especiales de puntuación
  norm = norm.replace(/[.,;:"'()\[\]{}*!¡?¿/\\-]/g, ' ').replace(/\s+/g, ' ').trim();

  // Erradicar calibres o clases secundarias en huevos y básicos (sin descartar formatos comerciales)
  norm = norm
    .replace(/\b(tamano|talla|calibre|clase)\s+(xl|l|m|s)\b/gi, '')
    .replace(/\b(xl|l|m|s)\b/gi, '')
    .replace(/\b(fresc[oa]s?|natural|naturales|madur[oa]s?|de\s+temporada|grandes?|medianos?|pequenos?|camperos?|ecologicos?|blancos?|morenos?|de\s+abeja|de\s+gallina|de\s+vaca|entera|entero|semidesnatad[oa]s?|desnatad[oa]s?|crud[oa]s?|duro|dura|duros|duras|picad[oa]s?|trocead[oa]s?|cortad[oa]s?|rallad[oa]s?|pelad[oa]s?|machacad[oa]s?|laminad[oa]s?|desmenuzad[oa]s?)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (/\bhuevos?\b/i.test(norm)) {
    norm = norm
      .replace(/\b(cocid[oa]s?|escalfad[oa]s?|poche|batid[oa]s?)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Fase C - Lematización Adjetival y Compuesta
  const PREPOSITIONS = new Set(['de', 'del', 'al', 'con', 'en']);
  const words = norm.split(' ');
  let wasCompoundLemmatized = false;

  if (words.length >= 2 && words.some((w, idx) => idx > 0 && PREPOSITIONS.has(w))) {
    const head = words[0];
    const singularHead = lemmatizeSpanishWord(head);
    if (singularHead !== head) {
      words[0] = singularHead;
      norm = words.join(' ');
      wasCompoundLemmatized = true;
    }
  } else if (words.length >= 2 && !words.some((w) => PREPOSITIONS.has(w))) {
    const lemmatizedWords = words.map((w) => lemmatizeSpanishWord(w));
    const lemmatizedPhrase = lemmatizedWords.join(' ');
    if (lemmatizedPhrase !== norm) {
      norm = lemmatizedPhrase;
      wasCompoundLemmatized = true;
    }
  }

  // Diccionario de variantes ortográficas y sinónimos directos
  const SYNONYMS: Record<string, { key: string; displayName: string }> = {
    // Mantequilla y lácteos base
    'mantequilla': { key: 'mantequilla', displayName: 'Mantequilla' },
    'mantequillas': { key: 'mantequilla', displayName: 'Mantequilla' },
    'mantequilla con sal': { key: 'mantequilla', displayName: 'Mantequilla' },
    'mantequilla sin sal': { key: 'mantequilla', displayName: 'Mantequilla' },
    'mantequilla pomada': { key: 'mantequilla', displayName: 'Mantequilla' },

    'leche': { key: 'leche', displayName: 'Leche' },
    'leches': { key: 'leche', displayName: 'Leche' },
    'leche entera': { key: 'leche', displayName: 'Leche' },
    'leche de vaca': { key: 'leche', displayName: 'Leche' },
    'leche semidesnatada': { key: 'leche', displayName: 'Leche' },
    'leche desnatada': { key: 'leche', displayName: 'Leche' },

    'azucar glass': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar glas': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar impalpable': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar flor': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar lustre': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar en polvo': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar pulverizada': { key: 'azucar glas', displayName: 'Azúcar glas' },

    'azucar': { key: 'azucar', displayName: 'Azúcar' },
    'azucar blanco': { key: 'azucar', displayName: 'Azúcar' },
    'azucar blanca': { key: 'azucar', displayName: 'Azúcar' },
    'azucar comun': { key: 'azucar', displayName: 'Azúcar' },

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

    'maicena': { key: 'almidon de maiz', displayName: 'Almidón de maíz (Maicena)' },
    'maizena': { key: 'almidon de maiz', displayName: 'Almidón de maíz (Maicena)' },
    'almidon de maiz': { key: 'almidon de maiz', displayName: 'Almidón de maíz (Maicena)' },
    'fecula de maiz': { key: 'almidon de maiz', displayName: 'Almidón de maíz (Maicena)' },
    'harina fina de maiz': { key: 'almidon de maiz', displayName: 'Almidón de maíz (Maicena)' },

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

    'yogur': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogures': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogur natural': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogures naturales': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogur griego': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogures griegos': { key: 'yogur natural', displayName: 'Yogur natural' },

    'tomate seco': { key: 'tomate seco', displayName: 'Tomate seco' },
    'tomates secos': { key: 'tomate seco', displayName: 'Tomate seco' },
    'tomates seco': { key: 'tomate seco', displayName: 'Tomate seco' },
    'tomate deshidratado': { key: 'tomate seco', displayName: 'Tomate seco' },
    'tomates deshidratados': { key: 'tomate seco', displayName: 'Tomate seco' },

    'cebolla': { key: 'cebolla', displayName: 'Cebolla' },
    'cebollas': { key: 'cebolla', displayName: 'Cebolla' },
    'diente de ajo': { key: 'diente de ajo', displayName: 'Diente de ajo' },
    'dientes de ajo': { key: 'diente de ajo', displayName: 'Diente de ajo' },
    'ajo': { key: 'diente de ajo', displayName: 'Diente de ajo' },
    'ajos': { key: 'diente de ajo', displayName: 'Diente de ajo' },

    'huevo': { key: 'huevo', displayName: 'Huevo' },
    'huevos': { key: 'huevo', displayName: 'Huevo' },
    'huevo de gallina': { key: 'huevo', displayName: 'Huevo' },
    'huevos de gallina': { key: 'huevo', displayName: 'Huevo' },
    'huevo cocido': { key: 'huevo', displayName: 'Huevo' },
    'huevos cocidos': { key: 'huevo', displayName: 'Huevo' },
    'huevo duro': { key: 'huevo', displayName: 'Huevo' },
    'huevos duros': { key: 'huevo', displayName: 'Huevo' },

    // Frutos secos unificados
    'almendra': { key: 'almendra', displayName: 'Almendras' },
    'almendras': { key: 'almendra', displayName: 'Almendras' },
    'almendra cruda': { key: 'almendra', displayName: 'Almendras' },
    'almendras crudas': { key: 'almendra', displayName: 'Almendras' },
    'almendra natural': { key: 'almendra', displayName: 'Almendras' },
    'almendras naturales': { key: 'almendra', displayName: 'Almendras' },
    'almendra tostada': { key: 'almendra', displayName: 'Almendras' },
    'almendras tostadas': { key: 'almendra', displayName: 'Almendras' },

    'nuez': { key: 'nuez', displayName: 'Nueces' },
    'nueces': { key: 'nuez', displayName: 'Nueces' },
    'nuez cruda': { key: 'nuez', displayName: 'Nueces' },
    'nueces crudas': { key: 'nuez', displayName: 'Nueces' },
    'nuez natural': { key: 'nuez', displayName: 'Nueces' },
    'nueces naturales': { key: 'nuez', displayName: 'Nueces' },

    'avellana': { key: 'avellana', displayName: 'Avellanas' },
    'avellanas': { key: 'avellana', displayName: 'Avellanas' },
    'avellana cruda': { key: 'avellana', displayName: 'Avellanas' },
    'avellanas crudas': { key: 'avellana', displayName: 'Avellanas' },

    'anacardo': { key: 'anacardo', displayName: 'Anacardos' },
    'anacardos': { key: 'anacardo', displayName: 'Anacardos' },
    'anacardo crudo': { key: 'anacardo', displayName: 'Anacardos' },
    'anacardos crudos': { key: 'anacardo', displayName: 'Anacardos' },

    'cacahuete': { key: 'cacahuete', displayName: 'Cacahuetes' },
    'cacahuetes': { key: 'cacahuete', displayName: 'Cacahuetes' },
    'cacahuete crudo': { key: 'cacahuete', displayName: 'Cacahuetes' },
    'cacahuetes crudos': { key: 'cacahuete', displayName: 'Cacahuetes' },
    'mani': { key: 'cacahuete', displayName: 'Cacahuetes' },

    'pistacho': { key: 'pistacho', displayName: 'Pistachos' },
    'pistachos': { key: 'pistacho', displayName: 'Pistachos' },

    // Legumbres cocidas / en conserva unificadas
    'garbanzo cocido': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos (en conserva)' },
    'garbanzos cocidos': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos (en conserva)' },
    'garbanzo de bote': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos (en conserva)' },
    'garbanzos de bote': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos (en conserva)' },
    'garbanzo en conserva': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos (en conserva)' },
    'garbanzos en conserva': { key: 'garbanzos cocidos', displayName: 'Garbanzos cocidos (en conserva)' },

    'lenteja cocida': { key: 'lentejas cocidas', displayName: 'Lentejas cocidas (en conserva)' },
    'lentejas cocidas': { key: 'lentejas cocidas', displayName: 'Lentejas cocidas (en conserva)' },
    'lenteja de bote': { key: 'lentejas cocidas', displayName: 'Lentejas cocidas (en conserva)' },
    'lentejas de bote': { key: 'lentejas cocidas', displayName: 'Lentejas cocidas (en conserva)' },
    'lenteja en conserva': { key: 'lentejas cocidas', displayName: 'Lentejas cocidas (en conserva)' },
    'lentejas en conserva': { key: 'lentejas cocidas', displayName: 'Lentejas cocidas (en conserva)' },

    'alubia cocida': { key: 'alubias cocidas', displayName: 'Alubias cocidas (en conserva)' },
    'alubias cocidas': { key: 'alubias cocidas', displayName: 'Alubias cocidas (en conserva)' },
    'alubia de bote': { key: 'alubias cocidas', displayName: 'Alubias cocidas (en conserva)' },
    'alubias de bote': { key: 'alubias cocidas', displayName: 'Alubias cocidas (en conserva)' },
    'alubia en conserva': { key: 'alubias cocidas', displayName: 'Alubias cocidas (en conserva)' },
    'alubias en conserva': { key: 'alubias cocidas', displayName: 'Alubias cocidas (en conserva)' },
    'judia blanca cocida': { key: 'alubias cocidas', displayName: 'Alubias cocidas (en conserva)' },
    'judias blancas cocidas': { key: 'alubias cocidas', displayName: 'Alubias cocidas (en conserva)' },
    'alubia blanca cocida': { key: 'alubias cocidas', displayName: 'Alubias cocidas (en conserva)' },
    'alubias blancas cocidas': { key: 'alubias cocidas', displayName: 'Alubias cocidas (en conserva)' },

    // Cortes cárnicos y aves
    'muslo de pollo': { key: 'muslo de pollo', displayName: 'Muslo de pollo' },
    'muslos de pollo': { key: 'muslo de pollo', displayName: 'Muslo de pollo' },
    'contramuslo de pollo': { key: 'contramuslo de pollo', displayName: 'Contramuslo de pollo' },
    'contramuslos de pollo': { key: 'contramuslo de pollo', displayName: 'Contramuslo de pollo' },
    'contramuslo': { key: 'contramuslo de pollo', displayName: 'Contramuslo de pollo' },
    'contramuslos': { key: 'contramuslo de pollo', displayName: 'Contramuslo de pollo' },
    'pechuga de pollo': { key: 'pechuga de pollo', displayName: 'Pechuga de pollo' },
    'pechugas de pollo': { key: 'pechuga de pollo', displayName: 'Pechuga de pollo' },
    'alita de pollo': { key: 'alita de pollo', displayName: 'Alitas de pollo' },
    'alitas de pollo': { key: 'alita de pollo', displayName: 'Alitas de pollo' },
    'lomo de salmon': { key: 'lomo de salmon', displayName: 'Lomo de salmón' },
    'lomos de salmon': { key: 'lomo de salmon', displayName: 'Lomo de salmón' },
    'lomo de merluza': { key: 'lomo de merluza', displayName: 'Lomo de merluza' },
    'lomos de merluza': { key: 'lomo de merluza', displayName: 'Lomo de merluza' },

    'perejil': { key: 'perejil', displayName: 'Perejil' },
    'perejiles': { key: 'perejil', displayName: 'Perejil' },
    'comino': { key: 'comino', displayName: 'Comino' },
    'cominos': { key: 'comino', displayName: 'Comino' },
    'miel': { key: 'miel', displayName: 'Miel' },
    'mieles': { key: 'miel', displayName: 'Miel' },

    // Derivados y conservas de tomate
    'tomate triturado': { key: 'tomate triturado', displayName: 'Tomate triturado' },
    'tomates triturados': { key: 'tomate triturado', displayName: 'Tomate triturado' },
    'tomate frito': { key: 'tomate frito', displayName: 'Tomate frito' },
    'tomate concentrado': { key: 'tomate concentrado', displayName: 'Tomate concentrado' },
    'pasta de tomate': { key: 'tomate concentrado', displayName: 'Tomate concentrado' },
  };

  const isCommercial =
    COMMERCIAL_PRESERVED_FORMATS_REGEX.test(norm) ||
    COMMERCIAL_PRESERVED_FORMATS_REGEX.test(cleanedOriginal);

  if (SYNONYMS[norm]) {
    const syn = SYNONYMS[norm];
    return {
      ...syn,
      hasCommercialForm: isCommercial || COMMERCIAL_PRESERVED_FORMATS_REGEX.test(syn.key),
    };
  }

  const lemmaKey = lemmatizeSpanishWord(norm);

  let displayName = cleanedOriginal.trim();
  if (wasCompoundLemmatized || lemmaKey !== norm) {
    displayName = lemmaKey.charAt(0).toUpperCase() + lemmaKey.slice(1);
  } else {
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  }

  return {
    key: lemmaKey,
    displayName,
    hasCommercialForm: isCommercial || COMMERCIAL_PRESERVED_FORMATS_REGEX.test(lemmaKey),
  };
}

/**
 * Redondeo y homogeneización estricta para la lista de la compra.
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

  // 3. Piezas y unidades contables
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

  return Math.max(1, Math.ceil(amount));
}

/**
 * Normaliza la unidad singular o plural según la cantidad final consolidada.
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

export interface ConsolidateShoppingOptions {
  defaultRecipeTitle?: string;
}

/**
 * Función Pura de Consolidación Canónica de Ingredientes (Single Source of Truth).
 * Agrupa y suma ingredientes idénticos con unidades compatibles, preservando sourceIds,
 * desglose de fases/secciones y notas.
 */
export function consolidateShoppingItems(
  items: ScaledShoppingInputItem[],
  options?: ConsolidateShoppingOptions
): ConsolidatedShoppingItem[] {
  interface ConsolidatedAcc {
    key: string;
    sourceIds: string[];
    nombre: string;
    rawCantidad: number;
    rawGramos: number;
    unidad: string;
    pasillo_supermercado: string;
    recetasNombres: string[];
    notas: string[];
    desglose: ConsolidatedShoppingBreakdown[];
    explicaciones: string[];
  }

  const consolidated = new Map<string, ConsolidatedAcc>();
  const defaultTitle = options?.defaultRecipeTitle || 'Receta';

  for (const item of items || []) {
    const rawName = (item.nombre_limpio || item.nombre_crudo || '').trim();
    if (!rawName) continue;

    const canon = normalizeIngredientKey(rawName);
    if (!canon.key) continue;

    const uRaw = (item.unidad || 'unidad').trim().toLowerCase();

    // Normalizar unidad base para la clave de agregación
    let canonicalUnitKey = uRaw;
    let unitConversionFactor = 1;

    if (/^(unidad|unidades|unit|units|pieza|piezas|piece|pieces|huevo|huevos|ud|uds|u|rama|ramas|tallo|tallos|penca|pencas)$/i.test(uRaw)) {
      canonicalUnitKey = 'unidad';
    } else if (/^(diente|dientes|clove|cloves)$/i.test(uRaw)) {
      canonicalUnitKey = 'diente';
    } else if (/^(bote|botes)$/i.test(uRaw)) {
      canonicalUnitKey = 'bote';
    } else if (/^(lata|latas)$/i.test(uRaw)) {
      canonicalUnitKey = 'lata';
    } else if (/^(paquete|paquetes)$/i.test(uRaw)) {
      canonicalUnitKey = 'paquete';
    } else if (/^(cucharada|cucharadas|tbsp|cda|cdas)$/i.test(uRaw)) {
      canonicalUnitKey = 'cucharada';
    } else if (/^(cucharadita|cucharaditas|tsp|cdta|cdtas)$/i.test(uRaw)) {
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

    const rawAmount =
      Number(item.cantidad_escalada !== undefined ? item.cantidad_escalada : item.cantidad) || 0;
    let cant = rawAmount * unitConversionFactor;
    let gramos =
      Number(item.gramos_escalados !== undefined ? item.gramos_escalados : item.gramos_calculados) || 0;

    // 1. Especias y condimentos: marcar como despensa con prioridad absoluta.
    // Toda especia, hierba seca, sal, pimienta o condimento (incluso si la receta tiene 3 g o 8 g)
    // debe unificarse bajo la unidad 'despensa' para no sugerir compras absurdas de micro-gramos.
    const spiceKeyRoot = canon.key
      .replace(/\b(en\s+polvo|molido|molida|seco|seca|deshidratad[oa]|en\s+grano)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const isSpice =
      isPantrySpice(canon.key) ||
      (spiceKeyRoot ? isPantrySpice(spiceKeyRoot) : false) ||
      /^(al\s+gusto|a\s+gusto|to\s+taste|c\/n|c\.n\.|cn)$/i.test(uRaw);

    if (isSpice) {
      canonicalUnitKey = 'despensa';
      cant = 0;
      gramos = 0;
    } else {
      // 1b. Conversión universal de cucharadas, cucharaditas y tazas a 'g' o 'ml' ANTES de construir la clave
      if (canonicalUnitKey === 'cucharada' || canonicalUnitKey === 'cucharadita' || canonicalUnitKey === 'taza') {
        const isLiquidIngredient =
          /^(leche|nata|agua|caldo|vino|vinagre|salsa de soja|leche de coco|aceite|zumo)\b/i.test(canon.key);

        if (isLiquidIngredient) {
          const mlPerUnit =
            canonicalUnitKey === 'taza' ? 240 : canonicalUnitKey === 'cucharada' ? 15 : 5;
          cant = cant * mlPerUnit;
          canonicalUnitKey = 'ml';
          if (gramos === 0) {
            gramos = canon.key.startsWith('aceite') ? Math.round(cant * 0.92) : Math.round(cant);
          }
        } else {
          // Sólidos, polvos, grasas y pastas culinarias
          let gPerTbsp = 12;
          let gPerTsp = 4;
          let gPerCup = 200;

          if (canon.key === 'mantequilla' || canon.key === 'queso crema' || canon.key === 'tomate concentrado') {
            gPerTbsp = 15;
            gPerTsp = 5;
            gPerCup = 225;
          } else if (canon.key.startsWith('harina') || canon.key === 'almidon de maiz' || canon.key === 'cacao en polvo' || canon.key === 'pan rallado') {
            gPerTbsp = 10;
            gPerTsp = 3.5;
            gPerCup = 125;
          } else if (canon.key.startsWith('azucar')) {
            gPerTbsp = 12;
            gPerTsp = 4;
            gPerCup = 200;
          } else if (canon.key === 'miel') {
            gPerTbsp = 20;
            gPerTsp = 7;
            gPerCup = 340;
          } else if (canon.key.startsWith('levadura') || canon.key === 'bicarbonato') {
            gPerTbsp = 12;
            gPerTsp = 4;
            gPerCup = 190;
          }

          if (gramos > 0) {
            cant = gramos;
          } else {
            const factor =
              canonicalUnitKey === 'taza' ? gPerCup : canonicalUnitKey === 'cucharada' ? gPerTbsp : gPerTsp;
            cant = cant * factor;
            gramos = cant;
          }
          canonicalUnitKey = 'g';
        }
      }

      // 2. Aceite de oliva: asegurar estado medible o botella
      if (canon.key === 'aceite de oliva virgen extra') {
        const isMeasurable =
          cant > 0 &&
          !/^(al\s+gusto|a\s+gusto|to\s+taste|c\/n|c\.n\.|cn|despensa)$/i.test(uRaw) &&
          canonicalUnitKey !== 'despensa';

        if (!isMeasurable) {
          canonicalUnitKey = 'botella';
          cant = 1;
          gramos = 0;
        }
      }
      // 3. Ajos frescos
      else if (canon.key === 'diente de ajo' && !canon.hasCommercialForm) {
        if (canonicalUnitKey === 'unidad' || canonicalUnitKey === 'diente') {
          canonicalUnitKey = 'diente';
        } else if (canonicalUnitKey === 'g') {
          cant = cant / 5;
          canonicalUnitKey = 'diente';
        }
      }
      // 4. Huevos
      else if (canon.key === 'huevo') {
        if (canonicalUnitKey === 'g') {
          cant = cant / 60;
        }
        canonicalUnitKey = 'unidad';
      }
      // 5. Cítricos frescos
      else if ((canon.key === 'limon' || canon.key === 'lima') && !canon.hasCommercialForm) {
        if (canonicalUnitKey === 'ml') {
          cant = cant / 35;
          canonicalUnitKey = 'unidad';
        } else if (canonicalUnitKey === 'g') {
          const pieceWeight = FRESH_PIECE_WEIGHT_G[canon.key] || 100;
          cant = cant / pieceWeight;
          canonicalUnitKey = 'unidad';
        }
      }
      // 6. Yogures
      else if (canon.key === 'yogur natural') {
        if (canonicalUnitKey === 'unidad' || canonicalUnitKey === 'bote' || canonicalUnitKey === 'paquete') {
          cant = cant * 125;
          canonicalUnitKey = 'g';
        }
        if (gramos === 0) {
          gramos = cant;
        }
      }
      // 7. Puente de conversión peso/pieza (alimentos frescos y cortes sin formato comercial procesado)
      else {
        const pieceWeightG =
          FRESH_PIECE_WEIGHT_G[canon.key] ||
          FRESH_PIECE_WEIGHT_G[canon.key.replace(/\s+/g, '_')];
        if (!canon.hasCommercialForm) {
          if (PREFER_GRAMS_INGREDIENTS.has(canon.key)) {
            if (canonicalUnitKey === 'unidad') {
              if (gramos > 0) {
                cant = gramos;
              } else if (pieceWeightG) {
                cant = cant * pieceWeightG;
              }
              if (gramos > 0 || pieceWeightG) {
                canonicalUnitKey = 'g';
              }
            }
            if (canonicalUnitKey === 'g' && gramos === 0) {
              gramos = cant;
            }
          } else if (pieceWeightG) {
            if (canonicalUnitKey === 'g') {
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
    }

    const key = `${canon.key}___${canonicalUnitKey}`;
    const pasillo = classifyIngredientAisle(canon.displayName, item.pasillo_supermercado);
    const recetaNombre = item.recetaTitulo || defaultTitle;

    const breakdownItem: ConsolidatedShoppingBreakdown = {
      seccion: item.seccion || null,
      recetaTitulo: recetaNombre,
      cantidad: rawAmount,
      unidad: item.unidad || '',
    };

    const despensaNote = 'Revisar despensa';
    const isOliveOilMeasurable =
      canon.key === 'aceite de oliva virgen extra' && canonicalUnitKey !== 'botella';

    if (consolidated.has(key)) {
      const existing = consolidated.get(key)!;
      existing.rawCantidad += cant;
      existing.rawGramos += gramos;
      if (item.id && !existing.sourceIds.includes(item.id)) {
        existing.sourceIds.push(item.id);
      }
      if (!existing.recetasNombres.includes(recetaNombre)) {
        existing.recetasNombres.push(recetaNombre);
      }
      if (item.notas && !existing.notas.includes(item.notas)) {
        existing.notas.push(item.notas);
      }
      if (isOliveOilMeasurable && !existing.notas.includes(despensaNote)) {
        existing.notas.push(despensaNote);
      }
      if (item.explicacion_culinaria && !existing.explicaciones.includes(item.explicacion_culinaria)) {
        existing.explicaciones.push(item.explicacion_culinaria);
      }
      existing.desglose.push(breakdownItem);
    } else {
      const initialNotas = item.notas ? [item.notas] : [];
      if (isOliveOilMeasurable && !initialNotas.includes(despensaNote)) {
        initialNotas.push(despensaNote);
      }

      consolidated.set(key, {
        key,
        sourceIds: item.id ? [item.id] : [],
        nombre: canon.displayName,
        rawCantidad: cant,
        rawGramos: gramos,
        unidad: canonicalUnitKey,
        pasillo_supermercado: pasillo,
        recetasNombres: [recetaNombre],
        notas: initialNotas,
        desglose: [breakdownItem],
        explicaciones: item.explicacion_culinaria ? [item.explicacion_culinaria] : [],
      });
    }
  }

  // =========================================================================
  // Pase de Prevalencia de Materia (Absorción de Despensa):
  // Si para un mismo canon.key existen entradas con magnitud física real (g, ml, unidad...)
  // Y además una entrada '___despensa' o '___botella', absorbemos la despensa dentro de la magnitud física
  // principal (transfiriendo sourceIds, recetas, desglose, notas) y eliminamos la de despensa.
  // Solo si un ingrediente ÚNICAMENTE tiene apariciones como 'despensa' o 'botella' se mantiene.
  // =========================================================================
  const groupsByCanonKey = new Map<string, ConsolidatedAcc[]>();
  for (const acc of consolidated.values()) {
    const canonKey = acc.key.split('___')[0];
    if (!groupsByCanonKey.has(canonKey)) {
      groupsByCanonKey.set(canonKey, []);
    }
    groupsByCanonKey.get(canonKey)!.push(acc);
  }

  for (const [canonKey, group] of groupsByCanonKey.entries()) {
    const despensaEntries = group.filter((item) => item.unidad === 'despensa' || item.unidad === 'botella');
    const physicalEntries = group.filter((item) => item.unidad !== 'despensa' && item.unidad !== 'botella');

    if (physicalEntries.length > 0) {
      // Ordenar para elegir la magnitud principal (priorizar gramos, luego ml, luego unidad, luego mayor cantidad)
      physicalEntries.sort((a, b) => {
        if (a.unidad === 'g' && b.unidad !== 'g') return -1;
        if (b.unidad === 'g' && a.unidad !== 'g') return 1;
        if (a.unidad === 'ml' && b.unidad !== 'ml') return -1;
        if (b.unidad === 'ml' && a.unidad !== 'ml') return 1;
        if (a.unidad === 'unidad' && b.unidad !== 'unidad') return -1;
        if (b.unidad === 'unidad' && a.unidad !== 'unidad') return 1;
        return (b.rawGramos || b.rawCantidad) - (a.rawGramos || a.rawCantidad);
      });
      const mainEntry = physicalEntries[0];

      // 1. Reconciliar entradas físicas secundarias (ej. mezcla residual de 'g' y 'unidad')
      if (physicalEntries.length > 1) {
        const pieceWeightG =
          FRESH_PIECE_WEIGHT_G[canonKey] ||
          FRESH_PIECE_WEIGHT_G[canonKey.replace(/\s+/g, '_')] ||
          100;

        for (let i = 1; i < physicalEntries.length; i++) {
          const sec = physicalEntries[i];
          if (mainEntry.unidad === 'g') {
            const addedGrams = sec.rawGramos > 0 ? sec.rawGramos : sec.rawCantidad * pieceWeightG;
            mainEntry.rawCantidad += addedGrams;
            mainEntry.rawGramos += addedGrams;
          } else if (mainEntry.unidad === 'ml') {
            const addedMl = sec.rawCantidad > 0 ? sec.rawCantidad : sec.rawGramos;
            mainEntry.rawCantidad += addedMl;
            mainEntry.rawGramos += sec.rawGramos;
          } else if (mainEntry.unidad === 'unidad') {
            const addedUnits =
              sec.unidad === 'g'
                ? sec.rawCantidad / pieceWeightG
                : sec.rawGramos > 0
                  ? sec.rawGramos / pieceWeightG
                  : sec.rawCantidad;
            mainEntry.rawCantidad += addedUnits;
            mainEntry.rawGramos += sec.rawGramos || addedUnits * pieceWeightG;
          } else {
            mainEntry.rawCantidad += sec.rawCantidad;
            mainEntry.rawGramos += sec.rawGramos;
          }

          for (const id of sec.sourceIds) {
            if (!mainEntry.sourceIds.includes(id)) mainEntry.sourceIds.push(id);
          }
          for (const rec of sec.recetasNombres) {
            if (!mainEntry.recetasNombres.includes(rec)) mainEntry.recetasNombres.push(rec);
          }
          for (const nota of sec.notas) {
            if (!mainEntry.notas.includes(nota)) mainEntry.notas.push(nota);
          }
          for (const exp of sec.explicaciones) {
            if (!mainEntry.explicaciones.includes(exp)) mainEntry.explicaciones.push(exp);
          }
          for (const brk of sec.desglose) {
            mainEntry.desglose.push(brk);
          }
          consolidated.delete(sec.key);
        }
      }

      // 2. Absorber cualquier entrada de despensa o botella dentro de la magnitud física principal
      for (const despensaEntry of despensaEntries) {
        for (const id of despensaEntry.sourceIds) {
          if (!mainEntry.sourceIds.includes(id)) {
            mainEntry.sourceIds.push(id);
          }
        }
        for (const rec of despensaEntry.recetasNombres) {
          if (!mainEntry.recetasNombres.includes(rec)) {
            mainEntry.recetasNombres.push(rec);
          }
        }
        for (const nota of despensaEntry.notas) {
          if (!mainEntry.notas.includes(nota)) {
            mainEntry.notas.push(nota);
          }
        }
        for (const exp of despensaEntry.explicaciones) {
          if (!mainEntry.explicaciones.includes(exp)) {
            mainEntry.explicaciones.push(exp);
          }
        }
        for (const brk of despensaEntry.desglose) {
          mainEntry.desglose.push(brk);
        }
        consolidated.delete(despensaEntry.key);
      }
    }
  }

  // =========================================================================
  // Pase Post-Consolidación de Sentido Común Comercial:
  // 1. Hierbas frescas (cebollino, perejil, cilantro, albahaca...) en peso/volumen <= 30 -> 1 manojo
  // 2. Jengibre fresco en peso/volumen <= 40 g -> 1 trozo pequeño
  // 3. Básicos de despensa seca a granel (harina, maicena, azúcar...) <= 50 g -> 'Comprobar despensa'
  // =========================================================================
  for (const [key, acc] of Array.from(consolidated.entries())) {
    const canonKey = key.split('___')[0];
    const isWeightOrVolume =
      acc.unidad === 'g' ||
      acc.unidad === 'ml' ||
      acc.unidad === 'cucharada' ||
      acc.unidad === 'cucharadita';

    // 1. Hierbas frescas
    if (FRESH_HERBS_SET.has(canonKey) && isWeightOrVolume && acc.rawCantidad <= 30) {
      acc.rawCantidad = 1;
      acc.unidad = 'manojo';
      acc.rawGramos = Math.max(acc.rawGramos, 15);
      const herbNote = '1 manojo fresco (o tarrina)';
      if (!acc.notas.includes(herbNote)) {
        acc.notas.push(herbNote);
      }
    }
    // 2. Jengibre fresco
    else if (canonKey === 'jengibre' && isWeightOrVolume && acc.rawCantidad <= 40) {
      acc.rawCantidad = 1;
      acc.unidad = 'trozo';
      acc.rawGramos = Math.max(acc.rawGramos, 25);
      const gingerNote = '1 trozo pequeño de jengibre';
      if (!acc.notas.includes(gingerNote)) {
        acc.notas.push(gingerNote);
      }
    }
    // 3. Básicos de despensa seca
    else if (PANTRY_BULK_STAPLES.has(canonKey) && isWeightOrVolume && acc.rawCantidad <= 50) {
      const neededGrams = Math.round(acc.rawGramos || acc.rawCantidad);
      const stapleNote = `Revisar despensa (necesitas solo ${neededGrams} g)`;
      acc.rawCantidad = 0;
      acc.rawGramos = 0;
      acc.unidad = 'despensa';
      if (!acc.notas.includes(stapleNote)) {
        acc.notas.push(stapleNote);
      }
    }
  }

  // Transformación final con redondeo comercial
  const result: ConsolidatedShoppingItem[] = [];
  for (const acc of consolidated.values()) {
    if (acc.unidad === 'despensa') {
      const cleanSpiceName = acc.nombre
        .replace(/^(\d+[\d.,/]*\s*(g|gr|grs|gramo|gramos|kg|kgs|ml|mls|l|cda|cdas|cdta|cdtas|cucharada|cucharadas|cucharadita|cucharaditas|diente|unidad|ud)?\s*(de\s+)?)/i, '')
        .trim();
      const finalSpiceName = cleanSpiceName
        ? cleanSpiceName.charAt(0).toUpperCase() + cleanSpiceName.slice(1)
        : acc.nombre;

      result.push({
        key: acc.key,
        sourceIds: acc.sourceIds,
        nombre: finalSpiceName,
        cantidadTotal: 0,
        unidad: 'Comprobar despensa',
        gramosTotal: 0,
        pasillo_supermercado: acc.pasillo_supermercado,
        recetasNombres: acc.recetasNombres,
        notas: acc.notas,
        desglose: acc.desglose,
        explicaciones: acc.explicaciones,
      });
      continue;
    }

    if (acc.unidad === 'botella') {
      result.push({
        key: acc.key,
        sourceIds: acc.sourceIds,
        nombre: acc.nombre,
        cantidadTotal: 1,
        unidad: 'botella (o revisar despensa)',
        gramosTotal: 0,
        pasillo_supermercado: acc.pasillo_supermercado,
        recetasNombres: acc.recetasNombres,
        notas: acc.notas,
        desglose: acc.desglose,
        explicaciones: acc.explicaciones,
      });
      continue;
    }

    let finalUnit = acc.unidad;
    let finalAmount = acc.rawCantidad;

    if (acc.unidad === 'g' && finalAmount >= 1000) {
      const inKg = Math.round((finalAmount / 1000) * 10) / 10;
      if (Number.isInteger(inKg) || (inKg * 10) % 5 === 0) {
        finalAmount = inKg;
        finalUnit = 'kg';
      }
    } else if (acc.unidad === 'ml' && finalAmount >= 1000) {
      const inL = Math.round((finalAmount / 1000) * 10) / 10;
      if (Number.isInteger(inL) || (inL * 10) % 5 === 0) {
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
      key: acc.key,
      sourceIds: acc.sourceIds,
      nombre: acc.nombre,
      cantidadTotal: roundedCantidad,
      unidad: formattedUnidad,
      gramosTotal: roundedGramos,
      pasillo_supermercado: acc.pasillo_supermercado,
      recetasNombres: acc.recetasNombres,
      notas: acc.notas,
      desglose: acc.desglose,
      explicaciones: acc.explicaciones,
    });
  }

  return result.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

