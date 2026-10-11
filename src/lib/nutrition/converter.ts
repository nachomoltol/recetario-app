import { FACTORES_VOLUMEN_ML, ConversionResultado } from '@/types/nutrition';
import { IngredienteMaestro } from '@/types/recipe';

/**
 * Convierte cualquier unidad culinaria (taza, cucharada, ml, unidad...) a gramos precisos
 * utilizando la densidad y peso unitario del ingrediente maestro.
 */
export function calcularGramos({
  cantidad,
  unidad,
  ingredienteMaestro,
}: {
  cantidad: number;
  unidad: string;
  ingredienteMaestro?: IngredienteMaestro | null;
}): ConversionResultado {
  const unidadNorm = unidad.trim().toLowerCase();

  // 1. Peso directo (gramos o kilogramos)
  if (unidadNorm === 'g' || unidadNorm === 'gr' || unidadNorm === 'gramo' || unidadNorm === 'gramos') {
    return { gramos: cantidad, metodo: 'peso_directo', confianza: 1.0 };
  }
  if (unidadNorm === 'kg' || unidadNorm === 'kilo' || unidadNorm === 'kilos') {
    return { gramos: cantidad * 1000, metodo: 'peso_directo', confianza: 1.0 };
  }

  // 2. Unidades discretas (ej. 2 huevos, 1 manzana)
  if (
    (unidadNorm === 'unidad' || unidadNorm === 'ud' || unidadNorm === 'uds' || unidadNorm === 'pieza') &&
    ingredienteMaestro?.peso_unidad_promedio_g
  ) {
    return {
      gramos: cantidad * Number(ingredienteMaestro.peso_unidad_promedio_g),
      metodo: 'unidad_discreta',
      confianza: 0.9,
    };
  }

  // 3. Conversión volumétrica mediante factor de volumen y densidad (g/ml)
  const factorMl = FACTORES_VOLUMEN_ML[unidadNorm];
  if (factorMl) {
    const densidad = ingredienteMaestro?.densidad_g_ml
      ? Number(ingredienteMaestro.densidad_g_ml)
      : 1.0; // fallback a densidad de agua (1.0 g/ml)
    
    const volumenMl = cantidad * factorMl;
    const gramos = volumenMl * densidad;
    return {
      gramos: Math.round(gramos * 100) / 100,
      metodo: 'densidad_volumen',
      confianza: ingredienteMaestro?.densidad_g_ml ? 0.95 : 0.75,
    };
  }

  // Fallback estimado si la unidad es desconocida
  return {
    gramos: cantidad,
    metodo: 'estimado',
    confianza: 0.5,
  };
}
