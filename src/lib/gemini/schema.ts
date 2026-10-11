import { Type } from '@google/genai';

/**
 * Esquema JSON estricto para estructurar recetas a través del Gemini SDK
 */
export const recipeExtractionSchema = {
  type: Type.OBJECT,
  description: 'Objeto canónico de receta estructurada con perfil nutricional y desglose atómico.',
  properties: {
    titulo: {
      type: Type.STRING,
      description: 'Título atractivo y culinario de la receta.',
    },
    descripcion: {
      type: Type.STRING,
      description: 'Breve descripción del plato, notas de sabor y origen.',
    },
    tiempo_preparacion_min: {
      type: Type.INTEGER,
      description: 'Tiempo estimado de preparación previa (mise en place, cortes) en minutos.',
    },
    tiempo_coccion_min: {
      type: Type.INTEGER,
      description: 'Tiempo estimado de fuego/cocción/horno en minutos.',
    },
    porciones: {
      type: Type.INTEGER,
      description: 'Número de raciones resultantes de la receta.',
    },
    dificultad: {
      type: Type.STRING,
      enum: ['facil', 'media', 'dificil', 'experto'],
      description: 'Nivel de dificultad técnica de la receta.',
    },
    ingredientes: {
      type: Type.ARRAY,
      description: 'Lista desagregada de ingredientes de la receta.',
      items: {
        type: Type.OBJECT,
        properties: {
          nombre_crudo: {
            type: Type.STRING,
            description: 'Texto original exacto del ingrediente (ej: "2 cucharadas soperas de aceite de oliva").',
          },
          nombre_limpio: {
            type: Type.STRING,
            description: 'Nombre canónico del ingrediente sin adjetivos accesorios (ej: "Aceite de oliva virgen extra", "Harina de trigo").',
          },
          cantidad: {
            type: Type.NUMBER,
            description: 'Cantidad numérica del ingrediente.',
          },
          unidad: {
            type: Type.STRING,
            description: 'Unidad de medida estandarizada (ej: "g", "ml", "cucharada", "cucharadita", "taza", "unidad", "pizca").',
          },
          gramos_estimados: {
            type: Type.NUMBER,
            description: 'Peso equivalente en gramos calculado según la densidad del alimento.',
          },
          es_ultraprocesado: {
            type: Type.BOOLEAN,
            description: 'True si es un ingrediente ultraprocesado o de bajo aporte nutritivo (azúcar refinado, salsas industriales, etc.).',
          },
          sustituto_saludable_sugerido: {
            type: Type.STRING,
            description: 'Alternativa saludable sugerida manteniendo el perfil de sabor y disfrute si es ultraprocesado.',
          },
          notas: {
            type: Type.STRING,
            description: 'Instrucciones del ingrediente (ej: "a temperatura ambiente", "tamizada").',
          },
          es_opcional: {
            type: Type.BOOLEAN,
            description: 'True si el ingrediente es opcional o meramente decorativo.',
          },
        },
        required: [
          'nombre_crudo',
          'nombre_limpio',
          'cantidad',
          'unidad',
          'gramos_estimados',
          'es_ultraprocesado',
        ],
      },
    },
    pasos: {
      type: Type.ARRAY,
      description: 'Secuencia ordenada de instrucciones para elaborar el plato.',
      items: {
        type: Type.OBJECT,
        properties: {
          orden: {
            type: Type.INTEGER,
            description: 'Orden cronológico del paso (1, 2, 3...).',
          },
          instruccion: {
            type: Type.STRING,
            description: 'Instrucción técnica clara, detallada y comprensible.',
          },
          tiempo_estimado_min: {
            type: Type.INTEGER,
            description: 'Minutos de duración del paso (si aplica).',
          },
          temperatura_celsius: {
            type: Type.INTEGER,
            description: 'Temperatura de fuego u horno en grados centígrados (si aplica).',
          },
          consejo_pro: {
            type: Type.STRING,
            description: 'Consejo gastronómico o secreto de técnica culinaria.',
          },
        },
        required: ['orden', 'instruccion'],
      },
    },
    macros_estimados_por_porcion: {
      type: Type.OBJECT,
      description: 'Cálculo estimado de macronutrientes por porción.',
      properties: {
        calorias: {
          type: Type.NUMBER,
          description: 'Kilocalorías por ración.',
        },
        proteinas: {
          type: Type.NUMBER,
          description: 'Gramos de proteína por ración.',
        },
        carbohidratos: {
          type: Type.NUMBER,
          description: 'Gramos de carbohidratos por ración.',
        },
        grasas: {
          type: Type.NUMBER,
          description: 'Gramos de grasas totales por ración.',
        },
        fibra: {
          type: Type.NUMBER,
          description: 'Gramos de fibra dietética por ración.',
        },
      },
      required: ['calorias', 'proteinas', 'carbohidratos', 'grasas'],
    },
    sustituciones_resumen: {
      type: Type.STRING,
      description: 'Resumen holístico de mejoras nutricionales que respetan el perfil culinario.',
    },
    etiquetas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Etiquetas temáticas (ej: "alta_proteina", "cena_rapida", "mediterranea").',
    },
  },
  required: [
    'titulo',
    'descripcion',
    'tiempo_preparacion_min',
    'tiempo_coccion_min',
    'porciones',
    'dificultad',
    'ingredientes',
    'pasos',
    'macros_estimados_por_porcion',
    'etiquetas',
  ],
};

/**
 * Directiva Nutricional Holística y de Ingeniería Culinaria
 */
export const SYSTEM_INSTRUCTION_RECIPES = `
Eres un Chef Ejecutivo y Nutricionista Clínico de élite especializado en estandarización culinaria y salud sostenible.
Tu misión es recibir información desestructurada de recetas (transcripciones de TikTok, Reels de Instagram, vídeos de YouTube, notas de voz o textos) y convertirlas en una ficha culinaria estructurada, reproducible y perfilada nutricionalmente.

REGLAS DE ACTUACIÓN:
1. DESGLOSE RELACIONAL DE INGREDIENTES:
   - Aísla cada ingrediente extrayendo su cantidad numérica, su unidad (g, ml, cucharada, cucharadita, taza, unidad, pizca) y su 'nombre_limpio' canónico (ej: "Pechuga de pollo", "Aceite de oliva virgen extra", "Harina de avena").
   - El 'nombre_limpio' debe estar optimizado para cruzarlo con una base de datos de ingredientes maestros.

2. DIRECTIVA NUTRICIONAL HOLÍSTICA Y SALUD SOSTENIBLE:
   - NO apliques dogmas restrictivos extremos. La adherencia, el placer gustativo y la cultura gastronómica son prioritarios.
   - Si detectas ingredientes ultraprocesados o con exceso de azúcares/grasas trans industriales (ej. nata comercial azucarada, salsas industriales, siropes), márcalos como 'es_ultraprocesado: true'.
   - Para esos ingredientes, propone en 'sustituto_saludable_sugerido' una alternativa viable y deliciosa que mantenga el perfil de sabor y textura del plato (ej: sustituir nata comercial por yogur griego o leche de coco; sustituir azúcar blanco por compota de manzana o eritritol/miel).
   - Explica brevemente en 'sustituciones_resumen' cómo elevar el valor nutricional del plato sin perder la esencia.

3. CÁLCULO VOLUMÉTRICO PRECISO:
   - Realiza la conversión volumétrica basándote en la densidad real del alimento (ej. 1 cucharada de aceite son ~14g, 1 taza de harina ~125g, 1 taza de miel ~340g).
   - Calcula de forma rigurosa los macronutrientes estimados por porción (calorías, proteínas, carbohidratos, grasas, fibra).

4. PASOS SECUENCIALES TÉCNICOS:
   - Redacta cada instrucción de forma concisa y técnica (temperaturas, puntos de cocción, texturas visuales).
   - Si hay algún secreto de cocina clave (desglasar la sartén, atemperar la carne, reservar agua de cocción), inclúyelo en 'consejo_pro'.
`.trim();

export interface ExtractedIngredient {
  nombre_crudo: string;
  nombre_limpio: string;
  cantidad: number;
  unidad: string;
  gramos_estimados: number;
  es_ultraprocesado: boolean;
  sustituto_saludable_sugerido?: string;
  notas?: string;
  es_opcional?: boolean;
}

export interface ExtractedStep {
  orden: number;
  instruccion: string;
  tiempo_estimado_min?: number;
  temperatura_celsius?: number;
  consejo_pro?: string;
}

export interface ExtractedMacros {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  fibra?: number;
}

export interface ExtractedRecipe {
  titulo: string;
  descripcion: string;
  tiempo_preparacion_min: number;
  tiempo_coccion_min: number;
  porciones: number;
  dificultad: 'facil' | 'media' | 'dificil' | 'experto';
  ingredientes: ExtractedIngredient[];
  pasos: ExtractedStep[];
  macros_estimados_por_porcion: ExtractedMacros;
  sustituciones_resumen?: string;
  etiquetas: string[];
}
