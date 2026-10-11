import { Type } from '@google/genai';

/**
 * Esquema JSON estricto para estructurar recetas a través del Gemini SDK
 */
export const recipeExtractionSchema = {
  type: Type.OBJECT,
  description: 'Objeto canónico de receta estructurada con verificación culinaria, perfil nutricional y desglose atómico.',
  properties: {
    es_receta_valida: {
      type: Type.BOOLEAN,
      description:
        'OBLIGATORIO: Establece TRUE únicamente si el contenido analizado (vídeo, audio, transcripción o texto) contiene de forma explícita una receta de cocina o elaboración culinaria real. Establece FALSE si el contenido trata de otro tema (humor, música, bailes, noticias, vlogs no culinarios, videojuegos, etc.), si carece de ingredientes o si no tiene sentido culinario.',
    },
    motivo_invalido: {
      type: Type.STRING,
      description:
        'Si es_receta_valida es false, detalla con precisión el motivo por el cual no se detectó una receta (ej: "El vídeo trata de música y no muestra ningún cocinado ni ingredientes").',
    },
    titulo: {
      type: Type.STRING,
      description: 'Título culinario fiel a la receta mostrada en el contenido.',
    },
    descripcion: {
      type: Type.STRING,
      description: 'Breve descripción del plato, notas de sabor y origen conforme al contenido analizado.',
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
      description: 'Lista desagregada de ingredientes identificados en el contenido real.',
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
      description: 'Secuencia ordenada de instrucciones para elaborar el plato según el contenido analizado.',
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
    'es_receta_valida',
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
 * Directiva Nutricional Holística y de Ingeniería Culinaria con Tolerancia Cero a la Alucinación
 */
export const SYSTEM_INSTRUCTION_RECIPES = `
Eres un Chef Ejecutivo y Nutricionista Clínico de élite especializado en estandarización culinaria, análisis audiovisual y salud sostenible.
Tu misión es recibir información culinaria multimodal (vídeos/audio de TikTok, Reels de Instagram, YouTube Shorts, o textos/recetas) y convertirlas en una ficha culinaria técnica estandarizada.

REGLAS SUPREMAS DE FIDELIDAD Y CONTRA ALUCINACIONES:
1. ANCLAJE ESTRICTO EN LA REALIDAD DE LA FUENTE:
   - Está TERMINANTEMENTE PROHIBIDO inventar, asumir o alucinar recetas que no estén presentes en el contenido multimedia o texto proporcionado.
   - Debes basarte ÚNICA Y EXCLUSIVAMENTE en los ingredientes, técnicas y pasos que se muestren visualmente, se mencionen en el audio o se detallen en la descripción escrita.
   - Jamás inventes una receta alternativa al azar para rellenar campos si el contenido original no trata de esa receta.

2. VERIFICACIÓN OBLIGATORIA DE SENTIDO CULINARIO:
   - Si el contenido analizado NO corresponde a una receta o elaboración culinaria real (por ejemplo: si es un vídeo de humor, música, baile, viajes, podcast, noticias, videojuegos, o si el texto no describe una preparación de comida):
     DEBES establecer obligatoriamente: "es_receta_valida": false
     Y detallar en "motivo_invalido" la causa (ej: "El contenido no describe ninguna preparación de cocina ni ingredientes comestibles").
     En este caso de falsedad culinaria, deja las listas de ingredientes y pasos vacías o mínimas; NO te inventes un plato.

3. EXTRACCIÓN Y FUSIÓN MULTIMODAL:
   - Si es_receta_valida es true:
     * Cruza lo que ves/escuchas en el vídeo/audio con el texto del post (caption).
     * Extrae cada ingrediente con cantidad numérica real, unidad estandarizada (g, ml, cucharada, cucharadita, taza, unidad, pizca) y 'nombre_limpio' canónico optimizado para cruce relacional.
     * Si detectas ultraprocesados industriales excesivos, marca 'es_ultraprocesado: true' y sugiere una alternativa viable en 'sustituto_saludable_sugerido'.
     * Calcula los gramos estimados mediante densidad física de cada alimento y estima los macronutrientes por porción.
     * Redacta pasos técnicos precisos con temperatura y consejos pro si se aprecian en el vídeo.
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
  es_receta_valida: boolean;
  motivo_invalido?: string;
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
