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
export function classifyIngredient(nombre: string, unidad: string): CulinaryCategory {
  const norm = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const uNorm = unidad.toLowerCase();

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
}

/**
 * Redondeo culinario natural (evita números decimales absurdos en cocina como 2.378 g)
 */
function roundCulinaryAmount(amount: number, unidad: string): number {
  const u = unidad.toLowerCase();
  if (u === 'g' || u === 'gr' || u === 'gramo' || u === 'gramos' || u === 'ml') {
    if (amount > 100) return Math.round(amount / 5) * 5; // Redondear a múltiplos de 5g
    if (amount > 20) return Math.round(amount);
    return Math.round(amount * 10) / 10;
  }

  if (u.includes('unidad') || u.includes('huevo') || u.includes('diente')) {
    if (amount >= 2) return Math.round(amount);
    return Math.round(amount * 2) / 2; // Permitir mitades (0.5, 1, 1.5...)
  }

  if (amount < 1) {
    return Math.round(amount * 10) / 10;
  }
  return Math.round(amount * 4) / 4; // Múltiplos de 0.25 (1/4 cucharada, etc.)
}

/**
 * Escala una lista de ingredientes con heurísticas culinarias reales.
 */
export function scaleIngredientsWithCulinaryHeuristics(
  ingredientes: RecetaIngrediente[],
  baseServings: number,
  targetServings: number
): ScaledIngredient[] {
  if (baseServings <= 0) baseServings = 2;
  if (targetServings <= 0) targetServings = 1;

  const ratio = targetServings / baseServings;

  return ingredientes.map((ing) => {
    const category = classifyIngredient(ing.nombre_limpio || ing.nombre_crudo, ing.unidad);

    let factor = ratio;
    let explicacion: string | undefined = undefined;

    if (ratio !== 1) {
      switch (category) {
        case 'SPICE_AND_SALT':
          // Curva de potencia sub-lineal (factor^0.72): el receptor gustativo se satura más rápido al duplicar volumen
          factor = Math.pow(ratio, 0.72);
          explicacion =
            ratio > 1
              ? 'Atenuado de especias y sal para evitar saturación gustativa.'
              : 'Dosis concentrada para preservar sabor en porción reducida.';
          break;

        case 'COOKING_FAT':
          // Escala por área de superficie (factor^0.65): la sartén no se duplica en superficie al duplicar porciones
          factor = Math.pow(ratio, 0.65);
          explicacion = 'Ajuste proporcional a la superficie del fondo de cocción.';
          break;

        case 'LEAVENER_THICKENER':
          factor = Math.pow(ratio, 0.78);
          explicacion = 'Fuerza gasificante equilibrada sin sobre-expansión.';
          break;

        case 'REDUCTION_LIQUID':
          // La tasa de evaporación en cacerola no se multiplica linealmente
          factor = Math.pow(ratio, 0.85);
          explicacion = 'Líquido calibrado según tiempo de evaporación.';
          break;

        case 'BULK':
        default:
          factor = ratio;
          break;
      }
    }

    const rawCant = Number(ing.cantidad) || 1;
    const rawGramos = Number(ing.gramos_calculados) || 0;

    const scaledCantidad = roundCulinaryAmount(rawCant * factor, ing.unidad);
    const scaledGramos = rawGramos > 0 ? Math.round(rawGramos * factor) : 0;

    return {
      ...ing,
      cantidad_escalada: scaledCantidad,
      gramos_escalados: scaledGramos,
      factor_aplicado: factor,
      categoria_culinaria: category,
      explicacion_culinaria: explicacion,
    };
  });
}

/**
 * Escala tiempos de cocción de forma realista (no duplica el tiempo de horno ni sellado)
 */
export function scaleCookingTime(baseTimeMin: number, ratio: number): number {
  if (baseTimeMin <= 0) return 0;
  if (ratio === 1) return baseTimeMin;
  // Escala logarítmica suave para tiempos de cocinado: ratio^0.32
  const scaled = baseTimeMin * Math.pow(ratio, 0.32);
  return Math.round(scaled);
}
