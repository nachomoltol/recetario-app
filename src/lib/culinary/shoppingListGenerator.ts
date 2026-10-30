import { RecetaIngrediente } from '@/types/recipe';
import { scaleIngredientsWithCulinaryHeuristics } from './scaler';
import {
  consolidateShoppingItems,
  ScaledShoppingInputItem,
  ConsolidatedShoppingItem,
  CanonicalIngredient,
  lemmatizeSpanishWord,
  FRESH_PIECE_WEIGHT_G,
  PREFER_GRAMS_INGREDIENTS,
  isPantrySpice,
  normalizeIngredientKey,
  roundShoppingListAmount,
  formatShoppingUnitPlural,
} from './consolidateShoppingItems';

export {
  consolidateShoppingItems,
  lemmatizeSpanishWord,
  FRESH_PIECE_WEIGHT_G,
  PREFER_GRAMS_INGREDIENTS,
  isPantrySpice,
  normalizeIngredientKey,
  roundShoppingListAmount,
  formatShoppingUnitPlural,
};
export type { ScaledShoppingInputItem, ConsolidatedShoppingItem, CanonicalIngredient };

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
 * Generador de lista de la compra unificada para el menú semanal.
 * Escala las recetas proporcionalmente por slot y delega la consolidación canónica
 * a la fuente única de verdad (consolidateShoppingItems).
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

  // 2. Iterar cada slot del plan y escalar sus ingredientes mediante el motor culinario
  const allScaledIngredients: ScaledShoppingInputItem[] = [];

  for (const p of plans || []) {
    if (!p.receta_id) continue;
    const recipeIngs = ingredientsByRecipe.get(p.receta_id);
    if (!recipeIngs || recipeIngs.length === 0) continue;

    const titulo = p.recetas?.titulo || 'Receta';
    const basePorciones = Number(p.recetas?.porciones) || userDefaultServings;
    const targetServings = Number(p.porciones) || userDefaultServings;

    const scaledList = scaleIngredientsWithCulinaryHeuristics(
      recipeIngs,
      basePorciones,
      targetServings,
      {
        titulo,
        categorias: (p.recetas as any)?.categorias_gastronomicas,
        etiquetas: (p.recetas as any)?.etiquetas,
        rol_plato: (p.recetas as any)?.rol_plato,
      }
    );

    for (const item of scaledList) {
      allScaledIngredients.push({
        ...item,
        recetaTitulo: titulo,
      });
    }
  }

  // 3. Consolidación canónica mediante la función pura (Single Source of Truth)
  const consolidated = consolidateShoppingItems(allScaledIngredients);

  return consolidated.map((item) => ({
    nombre: item.nombre,
    cantidadTotal: item.cantidadTotal,
    unidad: item.unidad,
    gramosTotal: item.gramosTotal,
    pasillo_supermercado: item.pasillo_supermercado,
    recetasNombres: item.recetasNombres,
  }));
}
