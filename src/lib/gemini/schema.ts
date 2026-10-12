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
            description: 'Cantidad numérica del ingrediente convertida a estándar métrico.',
          },
          unidad: {
            type: Type.STRING,
            description:
              'Unidad métrica estricta. EXCLUSIVAMENTE "g" para sólidos/pastas o "ml" para líquidos/emulsiones (o "unidad" / "unidades" si son piezas enteras indivisibles). REGLA LÓGICA DE PLURALIZACIÓN: si la cantidad es > 1 y la unidad es de piezas enteras, el texto de salida en unidad debe ser estrictamente "unidades" en plural; si es 1, estrictamente "unidad". Está TAJANTEMENTE PROHIBIDO usar "taza", "cucharada", "cucharadita", "pizca", "chorro", "vaso" u otras medidas volumétricas ambiguas.',
          },
          gramos_estimados: {
            type: Type.NUMBER,
            description: 'Peso equivalente en gramos calculado según la densidad del alimento.',
          },
          pasillo_supermercado: {
            type: Type.STRING,
            enum: [
              'Frutas y Verduras',
              'Carnes y Aves',
              'Pescados y Mariscos',
              'Lácteos y Huevos',
              'Despensa y Especias',
              'Panadería y Pastelería',
              'Congelados',
              'Bebidas',
              'Refrigerados',
            ],
            description:
              'Pasillo o sección del supermercado físico asignado a este ingrediente para optimizar la compra física.',
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
          'pasillo_supermercado',
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
    categorias_gastronomicas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Clasificación gastronómica principal (ej: "Pasta", "Carnes", "Aves", "Pescados y Mariscos", "Vegano", "Vegetariano", "Arroces", "Ensaladas", "Guisos", "Sopas", "Postres y Dulces", "Panadería y Masas", "Tapas"). Asigna al menos 1 categoría.',
    },
    momentos_consumo: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Momentos de consumo y etiquetas funcionales (ej: "Desayuno", "Almuerzo", "Cena", "Postre", "Snack", "Pre-entreno", "Post-entreno", "Batch Cooking", "Rápido (<20m)"). Asigna al menos 1 momento.',
    },
    etiquetas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Etiquetas temáticas consolidadas (incluyendo las categorías gastronómicas y momentos de consumo).',
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
    'categorias_gastronomicas',
    'momentos_consumo',
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

3. REFINAMIENTO DE INGESTA ANTE SPEECH RÁPIDO, JERGA O TELEGRÁFICO (RECONSTRUCCIÓN DE PASOS LÓGICOS):
   - En vídeos de redes sociales (TikTok, Reels, Shorts), es común que el creador hable a gran velocidad, use modismos, jerga o expresiones ultra telegráficas (ej: "echamos esto, pim pam, fuego a tope y al horno").
   - En estos casos, DEBES cruzar la locución con las ACCIONES VISUALES mostradas en el vídeo:
     * Rellena los vacíos narrativos deduciendo y estructurando los pasos lógicos de cocina indispensables que el creador ejecuta visualmente pero no verbaliza (ej. precalentar el horno, cortar/picar finamente un vegetal, pochar la cebolla hasta traslúcida, reservar agua de cocción para emulsionar, tiempos de reposo).
     * Identifica ingredientes que el creador añade visualmente aunque no los mencione en el audio o texto (ej. un chorro de aceite de oliva en la sartén, sal, pimienta negra, ajo en polvo o perejil fresco al emplatar).
     * Estandariza la instrucción en lenguaje profesional de cocina con tiempos y temperaturas realistas basados en lo observado en el vídeo.

4. CONVERSIÓN MÉTRICA ESTRICTA Y REGLA DE PLURALIZACIÓN DE UNIDADES:
   - Está TAJANTEMENTE PROHIBIDO el uso de medidas volumétricas o coloquiales ambiguas como 'taza', 'cucharada', 'cucharadita', 'pizca', 'chorro', 'vaso' o 'puñado'.
   - La IA DEBE estimar la densidad física del alimento y convertir la cantidad EXCLUSIVAMENTE a medidas estandarizadas: gramos ('g') para ingredientes sólidos/pastosos o mililitros ('ml') para líquidos/aceites/emulsiones.
   - Si el contenido indica '1 taza de harina', conviértelo a 120 g (unidad: 'g', cantidad: 120). Si dice '2 cucharadas de aceite', conviértelo a 30 ml (unidad: 'ml', cantidad: 30). Si dice 'una pizca de sal', conviértelo a 1 g o 2 g (unidad: 'g', cantidad: 2).
   - REGLA LÓGICA ESTRICTA PARA PIEZAS INDIVISIBLES ('unidad' vs 'unidades'):
     * Si la cantidad detectada es 1 (o <= 1), la unidad debe ser estrictamente "unidad" en singular (ej: cantidad: 1, unidad: "unidad").
     * Si la cantidad detectada es > 1 (ej: 2, 3, 4, etc.), la unidad de salida DEBE SER ESTRICTAMENTE "unidades" en plural (ej: cantidad: 2, unidad: "unidades").
     * Siempre completa los gramos_estimados equivalentes según el peso estándar de la pieza (ej. 2 unidades de huevo = 120 g).

5. CATEGORIZACIÓN PRECISA Y ESTRICTA DE PASILLOS DE SUPERMERCADO FÍSICO:
   - Asigna obligatoriamente a cada ingrediente su 'pasillo_supermercado' exacto. Está TERMINANTEMENTE PROHIBIDO desviar a 'Despensa' productos que pertenecen a su pasillo natural:
     * 'Frutas y Verduras': OBLIGATORIO para frutas frescas (la manzana SIEMPRE va aquí, al igual que plátanos, limones, fresas, aguacates), vegetales, hortalizas (tomates, pimientos, calabacines), tubérculos (patatas, cebollas, ajos) y hierbas frescas. JAMÁS clasifiques una manzana, fruta o verdura fresca en 'Despensa'.
     * 'Bebidas': OBLIGATORIO para agua (mineral, del grifo o con gas, el agua SIEMPRE va a 'Bebidas'), refrescos, caldos líquidos envasados, zumos, vinos de cocina, cervezas y licores. JAMÁS clasifiques el agua ni las bebidas en 'Despensa'.
     * 'Carnes y Aves': Carnes rojas, pollo, pavo, cerdo, embutidos frescos, picadas y chacinas.
     * 'Pescados y Mariscos': Pescados frescos o congelados, marisco, conservas de pescado (atún, anchoas).
     * 'Lácteos y Huevos': Leche, quesos, yogur, mantequilla, nata líquida para cocinar, huevos.
     * 'Despensa y Especias': Exclusivamente pastas secas, arroces, legumbres secas, aceites, vinagres, especias secas molidas, harinas, salsas envasadas, azúcar y sal.
     * 'Panadería y Pastelería': Panes, masas de hojaldre, levadura de panadero, productos de repostería.
     * 'Congelados': Productos ultracongelados procesados.
     * 'Refrigerados': Masas frescas refrigeradas, tofu, preparados listos refrigerados.

6. EXTRACCIÓN Y FUSIÓN MULTIMODAL:
   - Si es_receta_valida es true:
     * Cruza lo que ves/escuchas en el vídeo/audio con el texto del post (caption).
     * Extrae cada ingrediente con cantidad numérica convertida a estándar métrico, unidad métrica estricta ('g' o 'ml'), pasillo de supermercado y 'nombre_limpio' canónico optimizado para cruce relacional.
     * Si detectas ultraprocesados industriales excesivos, marca 'es_ultraprocesado: true' y sugiere una alternativa viable en 'sustituto_saludable_sugerido'.
     * Calcula los gramos estimados mediante densidad física de cada alimento y estima los macronutrientes por porción.

7. CLASIFICACIÓN AUTOMÁTICA DOBLE OBLIGATORIA:
   - Clasifica siempre la receta en dos ejes taxonómicos:
     a) Categorías Gastronómicas ("categorias_gastronomicas"): asigna al menos 1 categoría principal (ej: Pasta, Carnes, Aves, Pescados y Mariscos, Vegano, Vegetariano, Arroces, Ensaladas, Guisos, Sopas, Postres y Dulces, Panadería y Masas).
     b) Momentos de Consumo & Etiquetas Funcionales ("momentos_consumo"): asigna al menos 1 momento o función idónea (ej: Desayuno, Almuerzo, Cena, Postre, Snack, Pre-entreno, Post-entreno, Batch Cooking, Rápido (<20m)).
   - Consolida en "etiquetas" todas las categorías y momentos detectados.
`.trim();

export interface ExtractedIngredient {
  nombre_crudo: string;
  nombre_limpio: string;
  cantidad: number;
  unidad: string;
  gramos_estimados: number;
  pasillo_supermercado: string;
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
  categorias_gastronomicas?: string[];
  momentos_consumo?: string[];
  etiquetas: string[];
}
