import { RecetaIngrediente } from '@/types/recipe';
import { classifyIngredientAisle } from './aisles';

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
 * Generador de lista de la compra unificada:
 * Consolida ingredientes escalando según las porciones configuradas en cada slot del plan
 * respecto a las porciones base de la receta original, sin quemar fallbacks arbitrarios.
 */
export function generateShoppingListFromPlans(
  plans: PlanSlotForShopping[],
  rawIngredientes: (RecetaIngrediente & { pasillo_supermercado?: string })[],
  userDefaultServings: number = 4
): ShoppingListItem[] {
  // Mapa de factor de escala acumulado por receta
  const recipeScaleFactors = new Map<string, number>();
  const recipeMap = new Map<string, string>();

  for (const p of plans || []) {
    if (p.receta_id) {
      const titulo = p.recetas?.titulo || 'Receta';
      const basePorciones = Number(p.recetas?.porciones) || userDefaultServings;
      const targetServings = Number(p.porciones) || userDefaultServings;
      const factor = Math.max(0.1, targetServings / Math.max(1, basePorciones));

      recipeMap.set(p.receta_id, titulo);
      recipeScaleFactors.set(
        p.receta_id,
        (recipeScaleFactors.get(p.receta_id) || 0) + factor
      );
    }
  }

  // Motor de consolidación inteligente agrupado por pasillo y unidad compatible
  const consolidated = new Map<string, ShoppingListItem>();

  for (const ing of rawIngredientes || []) {
    const rawName = (ing.nombre_limpio || ing.nombre_crudo || '').trim();
    const canonName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
    const unidad = (ing.unidad || 'unidad').trim().toLowerCase();
    const key = `${canonName.toLowerCase()}___${unidad}`;

    const recipeScale = recipeScaleFactors.get(ing.receta_id) || 1;
    const cant = (Number(ing.cantidad) || 0) * recipeScale;
    const gramos = (Number(ing.gramos_calculados) || 0) * recipeScale;
    const recipeTitle = recipeMap.get(ing.receta_id) || 'Receta';
    const pasillo = classifyIngredientAisle(canonName, ing.pasillo_supermercado);

    if (consolidated.has(key)) {
      const existing = consolidated.get(key)!;
      existing.cantidadTotal = Math.round((existing.cantidadTotal + cant) * 10) / 10;
      existing.gramosTotal = Math.round(existing.gramosTotal + gramos);
      if (!existing.recetasNombres.includes(recipeTitle)) {
        existing.recetasNombres.push(recipeTitle);
      }
    } else {
      consolidated.set(key, {
        nombre: canonName,
        cantidadTotal: Math.round(cant * 10) / 10,
        unidad,
        gramosTotal: Math.round(gramos),
        pasillo_supermercado: pasillo,
        recetasNombres: [recipeTitle],
      });
    }
  }

  return Array.from(consolidated.values()).sort((a, b) => {
    return a.nombre.localeCompare(b.nombre, 'es');
  });
}
