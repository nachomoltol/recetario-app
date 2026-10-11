/**
 * Perfil de Macronutrientes y micronutrientes
 */
export interface Macronutrientes {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  fibra?: number;
  sodio_mg?: number;
}

/**
 * Tabla de conversión volumétrica estándar (ml por unidad)
 */
export const FACTORES_VOLUMEN_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  litro: 1000,
  litros: 1000,
  cucharadita: 5,        // tsp ~ 5 ml
  cdta: 5,
  cucharada: 15,         // tbsp ~ 15 ml
  cda: 15,
  taza: 240,             // cup ~ 240 ml
  tazas: 240,
  vaso: 200,             // vaso estándar ~ 200 ml
  chorrito: 10,
  pizca: 1,
};

/**
 * Resultado de una conversión volumétrica
 */
export interface ConversionResultado {
  gramos: number;
  metodo: 'peso_directo' | 'densidad_volumen' | 'unidad_discreta' | 'estimado';
  confianza: number; // 0 a 1
}
