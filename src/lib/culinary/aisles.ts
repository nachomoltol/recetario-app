import { isCanonicalSpiceHerbSaltOrPepper } from '@/lib/gemini/schema';

export const SUPERMARKET_AISLES = [
  'Frutas y Verduras',
  'Carnes y Aves',
  'Pescados y Mariscos',
  'Lácteos y Huevos',
  'Panadería y Pastelería',
  'Despensa y Especias',
  'Refrigerados',
  'Congelados',
  'Bebidas',
  'Otros',
] as const;

export type SupermarketAisle = (typeof SUPERMARKET_AISLES)[number];

export interface AisleConfig {
  name: SupermarketAisle;
  colorBg: string;
  colorText: string;
  colorBorder: string;
  iconName: string;
}

export const AISLE_CONFIGS: Record<SupermarketAisle, AisleConfig> = {
  'Frutas y Verduras': {
    name: 'Frutas y Verduras',
    colorBg: 'bg-emerald-50',
    colorText: 'text-emerald-800',
    colorBorder: 'border-emerald-200',
    iconName: 'Apple',
  },
  'Carnes y Aves': {
    name: 'Carnes y Aves',
    colorBg: 'bg-rose-50',
    colorText: 'text-rose-800',
    colorBorder: 'border-rose-200',
    iconName: 'Beef',
  },
  'Pescados y Mariscos': {
    name: 'Pescados y Mariscos',
    colorBg: 'bg-cyan-50',
    colorText: 'text-cyan-800',
    colorBorder: 'border-cyan-200',
    iconName: 'Fish',
  },
  'Lácteos y Huevos': {
    name: 'Lácteos y Huevos',
    colorBg: 'bg-amber-50',
    colorText: 'text-amber-800',
    colorBorder: 'border-amber-200',
    iconName: 'Egg',
  },
  'Panadería y Pastelería': {
    name: 'Panadería y Pastelería',
    colorBg: 'bg-orange-50',
    colorText: 'text-orange-800',
    colorBorder: 'border-orange-200',
    iconName: 'Wheat',
  },
  'Despensa y Especias': {
    name: 'Despensa y Especias',
    colorBg: 'bg-[#f4efe6]',
    colorText: 'text-brand-primary',
    colorBorder: 'border-[#e7dfd5]',
    iconName: 'Package',
  },
  'Refrigerados': {
    name: 'Refrigerados',
    colorBg: 'bg-teal-50',
    colorText: 'text-teal-800',
    colorBorder: 'border-teal-200',
    iconName: 'Refrigerator',
  },
  'Congelados': {
    name: 'Congelados',
    colorBg: 'bg-sky-50',
    colorText: 'text-sky-800',
    colorBorder: 'border-sky-200',
    iconName: 'Snowflake',
  },
  'Bebidas': {
    name: 'Bebidas',
    colorBg: 'bg-purple-50',
    colorText: 'text-purple-800',
    colorBorder: 'border-purple-200',
    iconName: 'Wine',
  },
  'Otros': {
    name: 'Otros',
    colorBg: 'bg-stone-100',
    colorText: 'text-stone-700',
    colorBorder: 'border-stone-200',
    iconName: 'ShoppingBag',
  },
};

/**
 * Expresión regular para detectar formatos deshidratados, secos, polvos y especias
 * que NUNCA deben derivarse a Frutas y Verduras frescas.
 */
export const DRY_SPICE_FORMATS_REGEX =
  /\b(en\s+polvo|molido|molida|molid[oa]s?|seco|seca|sec[oa]s?|deshidratad[oa]s?|especia|especias|extracto|esencia)\b/i;

/**
 * Expresión regular para conservas, procesados y derivados de tomate que pertenecen
 * incondicionalmente a Despensa y Especias (nunca a Frutas y Verduras frescas).
 */
export const CANNED_TOMATO_FORMATS_REGEX =
  /\btomates?\b.*\b(triturad[oa]s?|frit[oa]s?|concentrad[oa]s?|en\s+conserva|de\s+bote|tamizad[oa]s?|passata|salsa(\s+de)?)\b/i;

/**
 * LEY UNIVERSAL 1: Alimentos secos, cereales, granos, pastas y legumbres de despensa.
 * Pertenecen incondicionalmente a 'Despensa y Especias' a temperatura ambiente,
 * salvo que contengan indicadores explícitos de cadena de frío o producto fresco refrigerado.
 */
export const DRY_PANTRY_STAPLES_REGEX =
  /\b(pasta|pastas|macarr[oó]n|macarrones|espagueti|espaguetis|spaghetti|spaghettis|tallar[ií]n|tallarines|fideo|fideos|penne|fusilli|rigatoni|farfalle|lazos|placas?\s+de\s+lasa[ñn]a|canel[oó]n|canelones|arroz|arroces|cusc[uú]s|couscous|quinoa|avena|copos\s+de\s+avena|lenteja|lentejas|garbanzo|garbanzos|alubia|alubias|jud[ií]as?\s+secas?|harina|harinas|maicena|almid[oó]n|s[eé]mola|az[uú]car|azucar|sal|aceite|aceites|vinagre|vinagres)\b/i;

/**
 * Indicadores explícitos de conservación en frío o cadena de refrigeración activa.
 */
export const COLD_CHAIN_INDICATORS_REGEX =
  /\b(fresc[oa]s?|refrigerad[oa]s?|en\s+fr[ií]o|cadena\s+de\s+fr[ií]o|al\s+vac[ií]o\s+para\s+fr[ií]o|prensada)\b/i;

/**
 * Alimentos inherentemente refrigerados (proteínas vegetales frías, untables frescos, fermentados).
 */
export const INHERENTLY_REFRIGERATED_REGEX =
  /\b(tofu|seitan|seitán|hummus|tempeh|guacamole|levadura\s+fresca|levadura\s+prensada|masa\s+fresca)\b/i;

/**
 * Clasificación canónica basada en la naturaleza culinaria pura del alimento.
 */
export function classifyRawIngredientAisle(n: string): SupermarketAisle {
  // 1. Carnes y Aves
  if (
    /guanciale|salchicha|carne|pollo|ternera|cerdo|bacon|panceta|pavo|jamon|jamón|lomo|solomillo|chuleta|costilla|hamburguesa|picada|chorizo|morcilla/i.test(
      n
    )
  ) {
    return 'Carnes y Aves';
  }

  // 2. Pescados y Mariscos
  if (
    /pescado|atun|atún|salmon|salmón|bacalao|gamba|langostino|mejillon|mejillón|calamar|pulpo|merluza|lubina|dorada|anchoa|sardina|almeja/i.test(
      n
    )
  ) {
    return 'Pescados y Mariscos';
  }

  // 3. Lácteos y Huevos
  if (
    /queso|pecorino|parmesano|mozzarella|burrata|gouda|cheddar|huevo|yema|clara|leche|mantequilla|nata|yogur|crema de leche|ricotta|mascarpone/i.test(
      n
    )
  ) {
    return 'Lácteos y Huevos';
  }

  // 4. Frutas y Verduras (excluyendo derivados procesados de tomate)
  if (
    !CANNED_TOMATO_FORMATS_REGEX.test(n) &&
    /tomate|cebolla|ajo|albahaca|limon|limón|lima|patata|papa|zanahoria|perejil|seta|champinon|champiñón|espinaca|lechuga|fruta|aguacate|calabacin|calabacín|berenjena|pimiento|brocoli|brócoli|col|manzana|platano|plátano|fresa|cilantro|romero|tomillo/i.test(
      n
    )
  ) {
    return 'Frutas y Verduras';
  }

  // 5. Bebidas (excluye agua normal de cocción; incluye agua mineral/con gas)
  if (/^agua\s+(mineral|con\s+gas|embotellada|tonica|de\s+coco)\b|vino|cerveza|licor|refresco|zumo|caldo/i.test(n)) {
    return 'Bebidas';
  }

  // 6. Panadería y Pastelería (excluyendo masas y levaduras que lleven indicador explícito de frío)
  if (
    !COLD_CHAIN_INDICATORS_REGEX.test(n) &&
    /pan|harina|levadura|croissant|hojaldre|masa brisa|masa quebrada|bizcocho|tortilla de trigo|wrap/i.test(n)
  ) {
    return 'Panadería y Pastelería';
  }

  // 7. Congelados
  if (/congelad|helado|guisantes congelados/i.test(n)) {
    return 'Congelados';
  }

  // 8. Refrigerados (únicamente alimentos fríos o con indicación expresa de frío)
  if (INHERENTLY_REFRIGERATED_REGEX.test(n) || (COLD_CHAIN_INDICATORS_REGEX.test(n) && /pasta|masa|salsa/i.test(n))) {
    return 'Refrigerados';
  }

  // 9. Por defecto: Despensa y Especias (arroz, pasta seca, especias, aceite, sal, etc.)
  return 'Despensa y Especias';
}

/**
 * Heurística de clasificación de pasillo para ingredientes sin asignar o heredados
 */
export function classifyIngredientAisle(nombre?: string | null, existingAisle?: string | null): SupermarketAisle {
  try {
    const n = String(nombre || '').toLowerCase();

    // Prioridad absoluta: condimentos secos, especias y formatos en polvo siempre van a Despensa y Especias
    if (DRY_SPICE_FORMATS_REGEX.test(n) || isCanonicalSpiceHerbSaltOrPepper(n, n)) {
      return 'Despensa y Especias';
    }

    // Prioridad absoluta: chocolate, cacao y derivados van incondicionalmente a Despensa y Especias (nunca a Frutas y Verduras)
    if (/\b(chocolate|cacao|cocoa)\b/i.test(n)) {
      return 'Despensa y Especias';
    }

    // Conservas y derivados de tomate (triturado, frito, concentrado, passata, salsa) van siempre a Despensa y Especias
    if (CANNED_TOMATO_FORMATS_REGEX.test(n)) {
      return 'Despensa y Especias';
    }

    // LEY UNIVERSAL 1: Alimentos secos no perecederos (pasta seca, arroz, legumbres secas, harinas)
    // van SIEMPRE a Despensa y Especias, anulando si venían marcados como Refrigerados por error,
    // salvo que indiquen explícitamente frescura o cadena de frío (ej. "pasta fresca").
    if (DRY_PANTRY_STAPLES_REGEX.test(n) && !COLD_CHAIN_INDICATORS_REGEX.test(n)) {
      return 'Despensa y Especias';
    }

    // Corrección estricta de pasillo previo heredado o asignado erróneamente
    if (existingAisle && SUPERMARKET_AISLES.includes(existingAisle as SupermarketAisle)) {
      if (/\b(chocolate|cacao|cocoa)\b/i.test(n)) {
        return 'Despensa y Especias';
      }

      // Si venía marcado como 'Refrigerados', auditar rigurosamente:
      if (existingAisle === 'Refrigerados') {
        const isLegitRefrigerated =
          INHERENTLY_REFRIGERATED_REGEX.test(n) || COLD_CHAIN_INDICATORS_REGEX.test(n);
        // Si no es un producto que requiera frío explícito, re-clasificar por su naturaleza real
        if (!isLegitRefrigerated) {
          return classifyRawIngredientAisle(n);
        }
        return 'Refrigerados';
      }

      if (existingAisle === 'Despensa y Especias') {
        if (
          !DRY_SPICE_FORMATS_REGEX.test(n) &&
          !isCanonicalSpiceHerbSaltOrPepper(n, n) &&
          !CANNED_TOMATO_FORMATS_REGEX.test(n) &&
          /tomate|cebolla|ajo|albahaca|limon|limón|lima|patata|papa|zanahoria|perejil|seta|champinon|champiñón|espinaca|lechuga|fruta|aguacate|calabacin|calabacín|berenjena|pimiento|brocoli|brócoli|col|manzana|platano|plátano|fresa|cilantro|romero|tomillo/i.test(
            n
          )
        ) {
          return 'Frutas y Verduras';
        }
        if (/^agua\s+(mineral|con\s+gas|embotellada|tonica|de\s+coco)\b|vino|cerveza|licor|refresco|zumo|caldo/i.test(n)) {
          return 'Bebidas';
        }
      }
      return existingAisle as SupermarketAisle;
    }

    return classifyRawIngredientAisle(n);
  } catch {
    return 'Otros';
  }
}

/**
 * Agrupa una lista de elementos por pasillo manteniendo el orden físico del supermercado
 */
export function groupItemsByAisle<T>(
  items?: T[] | null,
  getAisle?: (item: T) => string | undefined | null
): { aisle: SupermarketAisle; config: AisleConfig; items: T[] }[] {
  try {
    if (!Array.isArray(items) || items.length === 0) return [];

    const map = new Map<SupermarketAisle, T[]>();

    for (const aisle of SUPERMARKET_AISLES) {
      map.set(aisle, []);
    }

    for (const item of items) {
      const rawAisle = getAisle ? getAisle(item) : 'Otros';
      const assignedAisle = normalizeAisleName(rawAisle);

      if (!map.has(assignedAisle)) {
        map.set(assignedAisle, []);
      }
      map.get(assignedAisle)!.push(item);
    }

  const result: { aisle: SupermarketAisle; config: AisleConfig; items: T[] }[] = [];

  for (const aisle of SUPERMARKET_AISLES) {
    const aisleItems = map.get(aisle) || [];
    if (aisleItems.length > 0) {
      result.push({
        aisle,
        config: AISLE_CONFIGS[aisle] || AISLE_CONFIGS['Otros'],
        items: aisleItems,
      });
    }
  }

    return result;
  } catch {
    return [];
  }
}

const ENGLISH_AISLE_MAP: Record<string, SupermarketAisle> = {
  produce: 'Frutas y Verduras',
  'produce & greens': 'Frutas y Verduras',
  'fruits & vegetables': 'Frutas y Verduras',
  meat: 'Carnes y Aves',
  'meat & poultry': 'Carnes y Aves',
  poultry: 'Carnes y Aves',
  seafood: 'Pescados y Mariscos',
  'seafood & fish': 'Pescados y Mariscos',
  fish: 'Pescados y Mariscos',
  dairy: 'Lácteos y Huevos',
  'dairy & eggs': 'Lácteos y Huevos',
  bakery: 'Panadería y Pastelería',
  'bakery & pastry': 'Panadería y Pastelería',
  pantry: 'Despensa y Especias',
  'pantry & spices': 'Despensa y Especias',
  spices: 'Despensa y Especias',
  frozen: 'Congelados',
  'frozen foods': 'Congelados',
  beverages: 'Bebidas',
  drinks: 'Bebidas',
  refrigerated: 'Refrigerados',
  other: 'Otros',
};

/**
 * Normaliza un pasillo independientemente de si viene en inglés o español
 */
export function normalizeAisleName(raw?: string | null): SupermarketAisle {
  if (!raw) return 'Otros';
  const clean = raw.trim();
  if (SUPERMARKET_AISLES.includes(clean as SupermarketAisle)) {
    return clean as SupermarketAisle;
  }
  const lower = clean.toLowerCase();
  if (ENGLISH_AISLE_MAP[lower]) {
    return ENGLISH_AISLE_MAP[lower];
  }
  return 'Otros';
}

/**
 * Obtiene la clave de traducción correspondiente a un pasillo
 */
export function getAisleTranslationKey(aisle: SupermarketAisle | string): string {
  switch (aisle) {
    case 'Frutas y Verduras':
      return 'aisle_produce';
    case 'Carnes y Aves':
      return 'aisle_meat';
    case 'Pescados y Mariscos':
      return 'aisle_seafood';
    case 'Lácteos y Huevos':
      return 'aisle_dairy';
    case 'Panadería y Pastelería':
      return 'aisle_bakery';
    case 'Despensa y Especias':
      return 'aisle_pantry';
    case 'Refrigerados':
      return 'aisle_refrigerated';
    case 'Congelados':
      return 'aisle_frozen';
    case 'Bebidas':
      return 'aisle_beverages';
    default:
      return 'aisle_other';
  }
}

/**
 * Formatea la unidad de un ingrediente según el idioma y pluralidad
 */
export function formatIngredientUnit(
  unidad?: any,
  cantidad?: number | string | null,
  lang: 'es' | 'en' = 'es'
): string {
  try {
    if (!unidad) return '';
    const raw = typeof unidad === 'string' ? unidad : String(unidad || '');
    const u = raw.toLowerCase().trim();
    if (!u) return '';
    const qty = Number(cantidad) || 1;

    if (
      u === 'unidad' ||
      u === 'unidades' ||
      u === 'unit' ||
      u === 'units' ||
      u === 'piece' ||
      u === 'pieces'
    ) {
      if (lang === 'en') {
        return qty > 1 ? 'units' : 'unit';
      } else {
        return qty > 1 ? 'unidades' : 'unidad';
      }
    }

    if (lang === 'en') {
      if (u === 'cucharada' || u === 'cucharadas') return 'tbsp';
      if (u === 'cucharadita' || u === 'cucharaditas') return 'tsp';
      if (u === 'gramo' || u === 'gramos') return 'g';
      if (u === 'mililitro' || u === 'mililitros') return 'ml';
      if (u === 'l' || u === 'lt' || u === 'lts' || u === 'litro' || u === 'litros' || u === 'liter' || u === 'liters') return 'L';
      if (u === 'kilo' || u === 'kilos' || u === 'kilogramo' || u === 'kilogramos') return 'kg';
    } else {
      if (u === 'unit' || u === 'units') return qty > 1 ? 'unidades' : 'unidad';
      if (u === 'piece' || u === 'pieces') return qty > 1 ? 'piezas' : 'pieza';
      if (u === 'tbsp' || u === 'cucharada' || u === 'cucharadas') return qty > 1 ? 'cucharadas' : 'cucharada';
      if (u === 'tsp' || u === 'cucharadita' || u === 'cucharaditas') return qty > 1 ? 'cucharaditas' : 'cucharadita';
      if (u === 'taza' || u === 'tazas' || u === 'cup' || u === 'cups') return qty > 1 ? 'tazas' : 'taza';
      if (u === 'vaso' || u === 'vasos') return qty > 1 ? 'vasos' : 'vaso';
      if (u === 'l' || u === 'lt' || u === 'lts' || u === 'litro' || u === 'litros' || u === 'liter' || u === 'liters') return 'L';
    }

    return raw;
  } catch {
    return typeof unidad === 'string' ? unidad : '';
  }
}
