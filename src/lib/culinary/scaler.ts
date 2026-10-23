import { RecetaIngrediente } from '@/types/recipe';

export type CulinaryCategory =
  | 'SPICE_AND_SALT'
  | 'COOKING_FAT'
  | 'LEAVENER_THICKENER'
  | 'REDUCTION_LIQUID'
  | 'BULK';

export interface ScaledIngredient extends RecetaIngrediente {
  cantidad_escalada: number;
  gramos_escalados: number;
  factor_aplicado: number;
  categoria_culinaria: CulinaryCategory;
  explicacion_culinaria?: string;
}

const SPICE_KEYWORDS = [
  'sal',
  'pimienta',
  'pimenton',
  'comino',
  'curry',
  'chile',
  'guindilla',
  'cayena',
  'canela',
  'clavo',
  'nuez moscada',
  'jengibre en polvo',
  'oregano',
  'tomillo',
  'romero',
  'azafran',
  'vainilla',
];

const FAT_KEYWORDS = [
  'aceite de oliva',
  'aceite de girasol',
  'mantequilla',
  'manteca',
  'ghee',
  'grasa',
];

const LEAVENER_KEYWORDS = [
  'levadura',
  'polvo de hornear',
  'bicarbonato',
  'maicena',
  'gelatina',
  'agar',
];

const LIQUID_KEYWORDS = [
  'caldo',
  'agua',
  'vino',
  'cerveza',
  'leche',
  'nata',
];

/**
 * Clasifica un ingrediente según su comportamiento termodinámico y organoléptico en cocina.
 */
export function classifyIngredient(nombre?: string | null, unidad?: string | null): CulinaryCategory {
  try {
    const norm = String(nombre || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const uNorm = String(unidad || '').toLowerCase();

    // 1. Especias y Sal (alta potencia gustativa)
    if (SPICE_KEYWORDS.some((kw) => norm.includes(kw)) || uNorm.includes('pizca')) {
      return 'SPICE_AND_SALT';
    }

    // 2. Grasas para sofreír/sartén (dependen de la superficie 2D)
    if (
      FAT_KEYWORDS.some((kw) => norm.includes(kw)) &&
      (uNorm.includes('cuchara') || uNorm.includes('chorro') || uNorm.includes('cda') || uNorm.includes('ml'))
    ) {
      return 'COOKING_FAT';
    }

    // 3. Levaduras y espesantes
    if (LEAVENER_KEYWORDS.some((kw) => norm.includes(kw))) {
      return 'LEAVENER_THICKENER';
    }

    // 4. Líquidos de cocción / reducción
    if (LIQUID_KEYWORDS.some((kw) => norm.includes(kw))) {
      return 'REDUCTION_LIQUID';
    }

    // 5. Por defecto: Ingrediente a granel (proteínas, vegetales de base, hidratos)
    return 'BULK';
  } catch {
    return 'BULK';
  }
}

/**
 * Redondeo culinario natural (evita números decimales absurdos en cocina como 2.378 g)
 */
function roundCulinaryAmount(amount: number, unidad?: string | null): number {
  try {
    const u = String(unidad || '').toLowerCase().replace(/[.,;:]/g, '').trim();

    // 1. Gramos y mililitros: <= 20 entero limpio (mínimo 1), > 20 múltiplos de 5
    if (/^(g|gr|grs|gramo|gramos|gram|grams|ml|mls|mililitro|mililitros)$/i.test(u)) {
      if (amount <= 0) return 0;
      if (amount > 20) return Math.round(amount / 5) * 5;
      return Math.max(1, Math.round(amount));
    }

    // 2. Kilogramos y litros: decimales limpios, 1 decimal máximo
    if (/^(kg|kgs|kilo|kilos|kilogramo|kilogramos|kilogram|kilograms|l|lt|lts|litro|litros|liter|liters)$/i.test(u)) {
      if (amount <= 0) return 0;
      if (Number.isInteger(amount)) return amount;
      return Math.round(amount * 10) / 10;
    }

    // 3. Unidades contables (permitir mitades si < 2)
    if (u.includes('unidad') || u.includes('huevo') || u.includes('diente') || u.includes('unit') || u.includes('piece')) {
      if (amount >= 2) return Math.round(amount);
      return Math.round(amount * 2) / 2; // Permitir mitades (0.5, 1, 1.5...)
    }

    // 4. Medidas de cuchara / taza (múltiplos de 0.25)
    if (/cuchara|tbsp|tsp|taza|cup/i.test(u)) {
      return Math.round(amount * 4) / 4;
    }

    if (amount < 1) {
      return Math.round(amount * 10) / 10;
    }
    return Math.round(amount * 10) / 10;
  } catch {
    return Math.round(amount * 10) / 10;
  }
}

/**
 * Escala una lista de ingredientes con heurísticas culinarias reales.
 */
export function scaleIngredientsWithCulinaryHeuristics(
  ingredientes?: RecetaIngrediente[] | null,
  baseServings: number = 2,
  targetServings: number = 2
): ScaledIngredient[] {
  if (!Array.isArray(ingredientes) || ingredientes.length === 0) return [];

  const bServings = Number(baseServings) > 0 ? Number(baseServings) : 2;
  const tServings = Number(targetServings) > 0 ? Number(targetServings) : 1;
  const ratio = tServings / bServings;

  return ingredientes.map((ing) => {
    try {
      const name = ing?.nombre_limpio || ing?.nombre_crudo || 'Ingrediente';
      const category = classifyIngredient(name, ing?.unidad);

      let factor = ratio;
      let explicacion: string | undefined = undefined;

      if (ratio !== 1) {
        switch (category) {
          case 'SPICE_AND_SALT':
            factor = Math.pow(ratio, 0.72);
            explicacion =
              ratio > 1
                ? 'Atenuado de especias y sal para evitar saturación gustativa.'
                : 'Dosis concentrada para preservar sabor en porción reducida.';
            break;

          case 'COOKING_FAT':
            factor = Math.pow(ratio, 0.65);
            explicacion = 'Ajuste proporcional a la superficie del fondo de cocción.';
            break;

          case 'LEAVENER_THICKENER':
            factor = Math.pow(ratio, 0.78);
            explicacion = 'Fuerza gasificante equilibrada sin sobre-expansión.';
            break;

          case 'REDUCTION_LIQUID':
            factor = Math.pow(ratio, 0.80);
            explicacion = 'Líquido calibrado según tiempo de evaporación.';
            break;

          case 'BULK':
          default:
            factor = ratio;
            break;
        }
      }

      const rawCant = Number(ing?.cantidad) || 1;
      const rawGramos = Number(ing?.gramos_calculados) || 0;

      const scaledCantidad = roundCulinaryAmount(rawCant * factor, ing?.unidad);
      const scaledGramos = rawGramos > 0 ? Math.round(rawGramos * factor) : 0;

      return {
        ...ing,
        cantidad_escalada: scaledCantidad,
        gramos_escalados: scaledGramos,
        factor_aplicado: factor,
        categoria_culinaria: category,
        explicacion_culinaria: explicacion,
      };
    } catch {
      const fallbackCant = Number(ing?.cantidad) || 1;
      return {
        ...ing,
        cantidad_escalada: fallbackCant * ratio,
        gramos_escalados: Number(ing?.gramos_calculados) || 0,
        factor_aplicado: ratio,
        categoria_culinaria: 'BULK',
      };
    }
  });
}

/**
 * Escala tiempos de cocción de forma realista (no duplica el tiempo de horno ni sellado)
 */
export function scaleCookingTime(baseTimeMin?: number | null, ratio: number = 1): number {
  try {
    const bTime = Number(baseTimeMin) || 0;
    if (bTime <= 0) return 0;
    if (ratio === 1 || isNaN(ratio)) return bTime;
    const scaled = bTime * Math.pow(ratio, 0.32);
    return Math.round(scaled);
  } catch {
    return Number(baseTimeMin) || 0;
  }
}
