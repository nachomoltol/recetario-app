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
export function classifyIngredientAisle(nombre: string, existingAisle?: string | null): SupermarketAisle {
  if (existingAisle && SUPERMARKET_AISLES.includes(existingAisle as SupermarketAisle)) {
    return existingAisle as SupermarketAisle;
  }

  const n = (nombre || '').toLowerCase();

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
  if (/vino|cerveza|licor|refresco|zumo|caldo de pollo|caldo de verduras|caldo de carne|agua mineral/i.test(n)) {
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
}

/**
 * Agrupa una lista de elementos por pasillo manteniendo el orden físico del supermercado
 */
export function groupItemsByAisle<T>(
  items: T[],
  getAisle: (item: T) => string | undefined | null
): { aisle: SupermarketAisle; config: AisleConfig; items: T[] }[] {
  const map = new Map<SupermarketAisle, T[]>();

  for (const aisle of SUPERMARKET_AISLES) {
    map.set(aisle, []);
  }

  for (const item of items) {
    const rawAisle = getAisle(item);
    const assignedAisle = (
      rawAisle && SUPERMARKET_AISLES.includes(rawAisle as SupermarketAisle)
        ? rawAisle
        : 'Otros'
    ) as SupermarketAisle;

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
}
