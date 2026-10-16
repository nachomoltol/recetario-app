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
    colorText: 'text-[#a86224]',
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
 * Heurística de clasificación de pasillo para ingredientes sin asignar o heredados
 */
export function classifyIngredientAisle(nombre?: string | null, existingAisle?: string | null): SupermarketAisle {
  try {
    const n = String(nombre || '').toLowerCase();

    // Corrección estricta: si vino marcado erróneamente como Despensa, re-enrutar
    if (existingAisle && SUPERMARKET_AISLES.includes(existingAisle as SupermarketAisle)) {
      if (existingAisle === 'Despensa y Especias') {
        if (
          /tomate|cebolla|ajo|albahaca|limon|limón|lima|patata|papa|zanahoria|perejil|seta|champinon|champiñón|espinaca|lechuga|fruta|aguacate|calabacin|calabacín|berenjena|pimiento|brocoli|brócoli|col|manzana|platano|plátano|fresa|cilantro|romero|tomillo/i.test(
            n
          )
        ) {
          return 'Frutas y Verduras';
        }
        if (/^agua\b|agua mineral|agua del grifo|agua tibia|agua fría|vino|cerveza|licor|refresco|zumo|caldo/i.test(n)) {
          return 'Bebidas';
        }
      }
      return existingAisle as SupermarketAisle;
    }

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

  // 4. Frutas y Verduras
  if (
    /tomate|cebolla|ajo|albahaca|limon|limón|lima|patata|papa|zanahoria|perejil|seta|champinon|champiñón|espinaca|lechuga|fruta|aguacate|calabacin|calabacín|berenjena|pimiento|brocoli|brócoli|col|manzana|platano|plátano|fresa|cilantro|romero|tomillo/i.test(
      n
    )
  ) {
    return 'Frutas y Verduras';
  }

  // 5. Bebidas
  if (/^agua\b|agua mineral|agua del grifo|agua tibia|agua fría|vino|cerveza|licor|refresco|zumo|caldo/i.test(n)) {
    return 'Bebidas';
  }

  // 6. Panadería y Pastelería
  if (/pan|harina|levadura|croissant|hojaldre|masa brisa|masa quebrada|bizcocho|tortilla de trigo|wrap/i.test(n)) {
    return 'Panadería y Pastelería';
  }

  // 7. Congelados
  if (/congelad|helado|guisantes congelados/i.test(n)) {
    return 'Congelados';
  }

  // 8. Refrigerados
  if (/tofu|seitan|seitán|hummus|masa fresca/i.test(n)) {
    return 'Refrigerados';
  }

  // 9. Por defecto: Despensa y Especias (arroz, pasta, especias, aceite, sal, etc.)
  return 'Despensa y Especias';
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
      if (u === 'litro' || u === 'litros') return 'l';
      if (u === 'kilo' || u === 'kilos' || u === 'kilogramo' || u === 'kilogramos') return 'kg';
    } else {
      if (u === 'unit' || u === 'units') return qty > 1 ? 'unidades' : 'unidad';
      if (u === 'piece' || u === 'pieces') return qty > 1 ? 'piezas' : 'pieza';
      if (u === 'tbsp') return qty > 1 ? 'cucharadas' : 'cucharada';
      if (u === 'tsp') return qty > 1 ? 'cucharaditas' : 'cucharadita';
    }

    return raw;
  } catch {
    return typeof unidad === 'string' ? unidad : '';
  }
}
