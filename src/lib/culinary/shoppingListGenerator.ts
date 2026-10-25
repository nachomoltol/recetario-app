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

/**
 * Redondeo y homogeneización estricta para la lista de la compra:
 * - Gramos y Mililitros: enteros limpios (múltiplos de 5 si > 20 g/ml).
 * - Kilos y Litros: redondear a 1 decimal como máximo (ej. 1.2 kg, nunca 1.23 kg).
 * - Piezas y Unidades Contables (huevos, cebollas, limones, dientes de ajo, botes, latas):
 *   * Si total < 2 unidades: permitir mitades limpias (0.5 o 1.5).
 *   * Si total >= 2 unidades: Math.ceil() para erradicar decimales absurdos en la compra (ej. 2.3 -> 3).
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

  // 3. Piezas y unidades contables (huevos, cebollas, limones, dientes de ajo, botes, latas, paquetes, unidades)
  if (
    /^(unidad|unidades|unit|units|pieza|piezas|piece|pieces|huevo|huevos|egg|eggs|diente|dientes|clove|cloves|bote|botes|lata|latas|can|cans|paquete|paquetes|package|packages|jar|jars|sobre|sobres)$/i.test(
      u
    )
  ) {
    if (amount < 2) {
      const half = Math.round(amount * 2) / 2;
      return half <= 0 ? 0.5 : half;
    }
    return Math.ceil(amount);
  }

  // 4. Medidas de cuchara / taza
  if (/^(cucharada|cucharadas|cucharadita|cucharaditas|tbsp|tsp|taza|tazas|cup|cups|vaso|vasos)$/i.test(u)) {
    if (amount < 2) {
      const quarter = Math.round(amount * 4) / 4;
      return quarter <= 0 ? 0.25 : quarter;
    }
    return Math.round(amount * 2) / 2;
  }

  // 5. Resto de unidades: evitar decimales absurdos en la compra
  if (amount < 2) {
    const half = Math.round(amount * 2) / 2;
    return half <= 0 ? 0.5 : half;
  }
  return Math.ceil(amount);
}

/**
 * Normaliza la unidad singular o plural según la cantidad final consolidada
 */
export function formatShoppingUnitPlural(unidad: string, cantidad: number): string {
  const u = (unidad || 'unidad').trim().toLowerCase();
  if (u === 'unidad' || u === 'unidades') {
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
 * Generador de lista de la compra unificada:
 * Consolida ingredientes escalando según las porciones configuradas en cada slot del plan
 * respecto a las porciones base de la receta original, aplicando el motor culinario
 * no-lineal (scaler.ts) y erradicando decimales no naturales en la compra.
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
      const canonName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
      const uRaw = (item.unidad || 'unidad').trim().toLowerCase();

      // Normalizar unidad base para la clave de agregación (evita duplicar "cebolla / unidad" y "cebolla / unidades")
      let canonicalUnitKey = uRaw;
      if (/^(unidad|unidades|unit|units|pieza|piezas|piece|pieces)$/i.test(uRaw)) {
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
        canonicalUnitKey = 'kg';
      } else if (/^(litro|litros|l|lt|lts)$/i.test(uRaw)) {
        canonicalUnitKey = 'l';
      }

      const key = `${canonName.toLowerCase()}___${canonicalUnitKey}`;
      const cant = Number(item.cantidad_escalada) || (Number(item.cantidad) * (targetServings / basePorciones)) || 0;
      const gramos = Number(item.gramos_escalados) || 0;
      const pasillo = classifyIngredientAisle(canonName, item.pasillo_supermercado);

      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        existing.rawCantidad += cant;
        existing.rawGramos += gramos;
        if (!existing.recetasNombres.includes(titulo)) {
          existing.recetasNombres.push(titulo);
        }
      } else {
        consolidated.set(key, {
          nombre: canonName,
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
    const finalCantidad = roundShoppingListAmount(acc.rawCantidad, acc.unidad);
    const finalUnidad = formatShoppingUnitPlural(acc.unidad, finalCantidad);
    const finalGramos = acc.rawGramos <= 20
      ? Math.round(acc.rawGramos)
      : Math.round(acc.rawGramos / 5) * 5;

    result.push({
      nombre: acc.nombre,
      cantidadTotal: finalCantidad,
      unidad: finalUnidad,
      gramosTotal: finalGramos,
      pasillo_supermercado: acc.pasillo_supermercado,
      recetasNombres: acc.recetasNombres,
    });
  }

  return result.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
