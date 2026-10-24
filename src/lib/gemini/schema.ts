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
      description:
        'Número entero de raciones base resultantes de la receta (servings >= 1). REGLAS JERÁRQUICAS ESTRICTAS: 1) Mención explícita: Si el texto o vídeo indica explícitamente las porciones ("para 4 personas", "rinde 2 raciones"), usa ese número exacto. 2) Inferencia nutricional por gramaje si no se indica: Carne, pescado, ave o tofu: Divide el peso total en crudo entre 180-200 g por persona (ej: 400 g pechuga = 2 raciones; 800 g = 4 raciones). Arroz, pasta o legumbre seca: Divide el peso seco entre 75-80 g por persona (ej: 160 g arroz = 2 raciones). Piezas contables principales (filetes, muslos, huevos, hamburguesas): Asigna 1 a 2 unidades por persona según el contexto. 3) Fallback seguro: Si es un postre, salsa o preparación sin proteína/cereal evidente y no indica raciones, asigna por defecto 2 raciones. RESTRICCIÓN: El valor porciones debe ser siempre un entero >= 1.',
    },
    dificultad: {
      type: Type.STRING,
      description: 'Nivel de dificultad técnica de la receta en el idioma solicitado (ej: Fácil, Media, Difícil o Easy, Medium, Hard).',
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
              'Unidad métrica estricta. EXCLUSIVAMENTE "g" para sólidos/pastas o "ml" para líquidos/emulsiones (o "unit" / "units" si idioma es inglés; "unidad" / "unidades" si idioma es español). REGLA LÓGICA DE PLURALIZACIÓN: si la cantidad es > 1 y la unidad es de piezas enteras, el texto de salida en unidad debe ser estrictamente plural ("units" en inglés, "unidades" en español); si es 1, singular ("unit" en inglés, "unidad" en español). EXCEPCIÓN CULINARIA PARA EL AJO: Para ajo desgranado, la unidad obligatoria DEBE ser "diente" o "dientes" ("clove" o "cloves" en inglés); está PROHIBIDO usar "unidad", "unidades" o "cabeza" a menos que la receta use la cabeza entera asada. Está TAJANTEMENTE PROHIBIDO usar "taza", "cucharada", "cucharadita", "pizca", "chorro", "vaso" u otras medidas volumétricas ambiguas.',
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
            description:
              'Instrucción técnica clara, detallada y en prosa culinaria natural profesional. OBLIGATORIO: integra las cantidades exactas en prosa culinaria fluida (ej: "Añade media cebolla picada finamente", "Vierte una cucharada de aceite (15 ml)", "Incorpora los 200 g de pechuga de pollo cortada en dados"). Está TERMINANTEMENTE PROHIBIDO redactar números con decimales de laboratorio fríos o antinaturales (NO escribir "añade 0.5 unidades de cebolla" ni "vierte 15ml de aceite"). Las cantidades inyectadas deben coincidir con las porciones escaladas de la receta.',
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
      description:
        'OBLIGATORIO: Asigna obligatoriamente entre 3 y 5 etiquetas semánticas consolidadas por receta. Debes identificar siempre: 1) La naturaleza o formato del plato (ej: "Sopa", "Ensalada", "Aliño y Salsa", "Guiso", "Pasta", "Arroz", "Postre", "Entrante"), 2) El ingrediente principal o proteína base (ej: "Pollo", "Carne", "Pescado", "Marisco", "Legumbres", "Verduras"), y 3) El momento de consumo o función (ej: "Almuerzo", "Cena", "Desayuno", "Rápido (<20m)").',
    },
    alertas_compatibilidad: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Alertas informativas breves sobre ingredientes originales de la receta que puedan entrar en conflicto con el perfil clínico o alérgenos del usuario (ej: "Contiene ajo (FODMAP)", "Contiene gluten"). La receta base DEBE conservar todos los ingredientes y pasos originales sin alterar; estas alertas son 100% informativas. Si no hay conflictos, devuelve un array vacío [].',
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
    'alertas_compatibilidad',
  ],
};

/**
 * Construye la directiva de sistema para Gemini incorporando la gestión dinámica de idioma
 * y alertas informativas de compatibilidad clínica manteniendo fidelidad 100% a la fuente.
 */
export function buildRecipeSystemInstruction(options?: {
  idioma?: 'es' | 'en';
  alertasClinicas?: string[];
  exclusionesClinicas?: string[];
}): string {
  const idioma = options?.idioma || 'es';
  const alertas = options?.alertasClinicas || [];
  const exclusiones = options?.exclusionesClinicas || [];
  const langName = idioma === 'en' ? 'English' : 'Spanish';

  let firewallSection = '';
  if (alertas.length > 0) {
    firewallSection = `
9. ALERTAS INFORMATIVAS DE COMPATIBILIDAD CLÍNICA (FIDELIDAD 100% AL VÍDEO Y FUENTE ORIGINAL):
   - La receta extraída DEBE conservar con fidelidad absoluta todos los ingredientes y pasos originales empleados por el creador en el contenido audiovisual o texto.
   - Queda TERMINANTEMENTE PROHIBIDO sustituir, eliminar o alterar ingredientes en 'ingredientes' o 'pasos' durante la ingesta (ej: si el creador usa ajo o cebolla, DEBES incluir ajo o cebolla en los ingredientes y pasos sin omitirlos).
   - Analiza si los ingredientes originales entran en conflicto con las siguientes restricciones o alérgenos del usuario: [${alertas.join(', ')}].
   - Si detectas incompatibilidades, señálalas ÚNICAMENTE de forma informativa en el array 'alertas_compatibilidad' (ej: "Contiene ajo y cebolla (FODMAP)", "Contiene gluten"). Si no hay conflictos, devuelve un array vacío [].
`.trim();
  } else if (exclusiones.length > 0) {
    firewallSection = `
9. CORTAFUEGOS CLÍNICO Y SEGURIDAD MÉDICA:
   - ESTRICTAMENTE PROHIBIDO sugerir los siguientes ingredientes: [${exclusiones.join(', ')}].
   - Sustitúyelos por alternativas nutricionalmente equivalentes y seguras.
`.trim();
  }

  const languageSection =
    idioma === 'en'
      ? `10. ADVERTENCIA CRÍTICA DE IDIOMA Y DIRECTIVA ANTI-SPANGLISH (MANDATORIA Y ESTRICTA):
   - ADVERTENCIA CRÍTICA DE IDIOMA: Si el idioma solicitado es Inglés ('en'), estás ESTRICTAMENTE PROHIBIDO de usar la palabra 'unidades', 'cucharadas', 'gramos' en español. Debes usar sus equivalentes en inglés ('units/pieces', 'tbsp/tsp', 'grams'). Las etiquetas de dificultad ('Fácil', 'Principiante') DEBEN traducirse al inglés ('Easy', 'Beginner'). TODO EL JSON DEBE SER INGLÉS NATIVO.
   - For piece units: output strictly 'unit' for singular (1) or 'units' for plural (>1). NEVER 'unidad' or 'unidades'.
   - All text fields (titulo, descripcion, ingredientes, notas, pasos, consejos, etiquetas, categorias_gastronomicas, momentos_consumo) MUST be 100% native English without a single word of Spanish.`.trim()
      : `10. GESTIÓN DINÁMICA DE IDIOMA (VITAL Y ESTRICTO):
   - Traduce el audio/texto del vídeo original y redacta el JSON de la receta estrictamente en ${langName}. NUNCA mezcles idiomas.
   - Todos los campos textuales (titulo, descripcion, ingredientes, notas, pasos, consejos, etiquetas) DEBEN estar redactados de forma nativa e íntegra en ${langName}.`.trim();

  const rule4Units =
    idioma === 'en'
      ? `4. STRICT METRIC CONVERSION AND PIECE PLURALIZATION RULES:
   - YOU ARE STRICTLY FORBIDDEN from using vague volumetric terms like 'cup', 'tablespoon', 'teaspoon', 'pinch', 'dash', 'glass', or 'handful'.
   - The AI MUST estimate food physical density and convert quantities EXCLUSIVELY to standardized units: grams ('g') for solids/pastes or milliliters ('ml') for liquids/oils/emulsions.
   - If content states '1 cup flour', convert to 120 g (unit: 'g', amount: 120). If '2 tbsp oil', convert to 30 ml (unit: 'ml', amount: 30).
   - STRICT LOGICAL RULE FOR INDIVISIBLE PIECES ('unit' vs 'units'):
     * If the detected quantity is 1 (or <= 1), the unit MUST strictly be "unit" in singular (e.g. quantity: 1, unit: "unit").
     * If the detected quantity is > 1 (e.g. 2, 3, 4, etc.), the output unit MUST STRICTLY BE "units" in plural (e.g. quantity: 2, unit: "units").
     * MANDATORY CULINARY EXCEPTION FOR GARLIC: For peeled or separated garlic cloves, the mandatory unit MUST be "clove" (singular) or "cloves" (plural). It is STRICTLY FORBIDDEN to use "unit", "units", or "head" unless roasting the entire whole head. (e.g., 3 garlic cloves -> quantity: 3, unit: "cloves"; 1 garlic clove -> quantity: 1, unit: "clove").
     * NEVER use 'unidad' or 'unidades' in English mode.
     * Always complete 'gramos_estimados' according to the standard piece weight (e.g. 2 units of egg = 120 g, 1 clove of garlic = 5 g).`
      : `4. CONVERSIÓN MÉTRICA ESTRICTA Y REGLA DE PLURALIZACIÓN DE UNIDADES:
   - Está TAJANTEMENTE PROHIBIDO el uso de medidas volumétricas o coloquiales ambiguas como 'taza', 'cucharada', 'cucharadita', 'pizca', 'chorro', 'vaso' o 'puñado'.
   - La IA DEBE estimar la densidad física del alimento y convertir la cantidad EXCLUSIVAMENTE a medidas estandarizadas: gramos ('g') para ingredientes sólidos/pastosos o mililitros ('ml') para líquidos/aceites/emulsiones.
   - Si el contenido indica '1 taza de harina', conviértelo a 120 g (unidad: 'g', cantidad: 120). Si dice '2 cucharadas de aceite', conviértelo a 30 ml (unidad: 'ml', cantidad: 30). Si dice 'una pizca de sal', conviértelo a 1 g o 2 g (unidad: 'g', cantidad: 2).
   - REGLA LÓGICA ESTRICTA PARA PIEZAS INDIVISIBLES ('unidad' vs 'unidades'):
     * Si la cantidad detectada es 1 (o <= 1), la unidad debe ser estrictamente "unidad" en singular (ej: cantidad: 1, unidad: "unidad").
     * Si la cantidad detectada es > 1 (ej: 2, 3, 4, etc.), la unidad de salida DEBE SER ESTRICTAMENTE "unidades" en plural (ej: cantidad: 2, unidad: "unidades").
     * EXCEPCIÓN CULINARIA OBLIGATORIA PARA EL AJO: Para ajo desgranado, la unidad obligatoria DEBE ser "diente" (singular) o "dientes" (plural). Está TERMINANTEMENTE PROHIBIDO usar "unidad" o "cabeza" para los dientes de ajo, a menos que la receta utilice una cabeza entera asada. (Ej: 3 dientes de ajo -> cantidad: 3, unidad: "dientes"; 1 diente de ajo -> cantidad: 1, unidad: "diente").
     * Siempre completa los gramos_estimados equivalentes según el peso estándar de la pieza (ej. 2 unidades de huevo = 120 g, 1 diente de ajo = 5 g).`;
  const ruleServingsHeuristic =
    idioma === 'en'
      ? `8. STRICT HIERARCHICAL RULES FOR BASE SERVINGS INFERENCE ('porciones' / servings):
   - The 'porciones' field MUST always be an integer greater than or equal to 1 (>= 1).
   - Apply this strict hierarchical decision order:
     * Rule 1 (Explicit mention in source): If the text, audio, caption, or video explicitly indicates the portions ("serves 4", "makes 2 portions", "recipe for 6 people"), use that exact integer.
     * Rule 2 (Nutritional heuristic by weight if unspecified):
       - If the recipe contains meat, poultry, fish, seafood, or tofu: Divide total raw weight by 180-200 g per person (example: 400 g chicken breast = 2 servings; 800 g steak = 4 servings).
       - If it is a rice, pasta, or dry legumes dish: Divide total dry weight by 75-80 g per person (example: 160 g dry rice = 2 servings; 320 g dry pasta = 4 servings).
       - If there are countable primary pieces (cutlets, drumsticks, eggs, burger patties): Assign 1 to 2 units per person based on context.
     * Rule 3 (Safe fallback): For desserts, bakery, sauces, dips, or preparations without prominent protein/cereal and no stated servings, assign strictly 2 servings by default.
   - RESTRICTION: The 'porciones' value MUST always be an integer >= 1.`
      : `8. DIRECTIVA DE INFERENCIA NUTRICIONAL DE RACIONES BASE ('porciones' / servings):
   - El campo 'porciones' DEBE ser siempre un número entero mayor o igual a 1 (>= 1).
   - Aplica rigurosamente este orden jerárquico estricto:
     * Regla 1 (Mención explícita): Si el texto o vídeo indica explícitamente las porciones ("para 4 personas", "rinde 2 raciones", "para 6 comensales"), usa ese número exacto.
     * Regla 2 (Inferencia nutricional por gramaje si no se indica):
       - Si la receta contiene carne, pescado o tofu: Divide el peso total en crudo entre 180-200 g por persona (ejemplo: 400 g pechuga = 2 raciones; 800 g = 4 raciones).
       - Si es un plato de arroz, pasta o legumbre seca: Divide el peso seco entre 75-80 g por persona (ejemplo: 160 g arroz = 2 raciones).
       - Si hay piezas contables principales (filetes, muslos, huevos, hamburguesas): Asigna 1 a 2 unidades por persona según el contexto.
     * Regla 3 (Fallback seguro): Si es un postre, salsa o preparación sin proteína/cereal evidente y no indica raciones, asigna por defecto 2 raciones.
   - RESTRICCIÓN: El valor 'porciones' debe ser siempre un entero >= 1.`;

  const rule9Quantities =
    idioma === 'en'
      ? `9. NATURAL CULINARY PROSE AND PRECISE METRIC INTEGRATION:
   - In the 'pasos' / preparation array, integrate exact ingredient quantities using fluent, professional, and natural culinary prose.
   - STRICT FORBIDDANCE OF LABORATORY DECIMALS: You are STRICTLY FORBIDDEN from writing cold, unnatural, or laboratory-like phrasing such as "add 0.5 units of onion", "pour 0.25 tablespoons", or "add 15ml of oil".
   - MANDATORY CULINARY PHRASING DIRECTIVE: Integrate precise quantities into natural culinary English:
     * Instead of "Add 0.5 units of onion", write: "Add half an onion, finely chopped".
     * Instead of "Pour 15ml of oil", write: "Pour one tablespoon of extra virgin olive oil (15 ml)".
     * Instead of "Add 200 of chicken", write: "Incorporate the 200 g of diced chicken breast".
     * Instead of "Add 2 units of egg", write: "Add the 2 beaten eggs".
   - If original video servings differ from target user servings, apply the mathematical conversion factor to all ingredients and reflect those scaled quantities naturally in the steps narrative.
   - Set the 'porciones' field exactly to the final scaled number of servings.`
      : `9. REDACCIÓN EN PROSA CULINARIA NATURAL E INTEGRACIÓN MÉTRICA EXACTA:
   - En el array de 'pasos' o 'preparación', integra siempre las cantidades exactas de los ingredientes de forma fluida, profesional y natural.
   - PROHIBICIÓN ESTRICTA DE DECIMALES DE LABORATORIO: Queda TERMINANTEMENTE PROHIBIDO redactar expresiones frías, artificiales o de laboratorio como "añade 0.5 unidades de cebolla", "vierte 0.25 cucharadas" o "agrega 15ml de aceite".
   - DIRECTIVA OBLIGATORIA DE REDACCIÓN NATURAL: Utiliza lenguaje gastronómico natural incorporando la precisión métrica idónea:
     * En lugar de "Añade 0.5 unidades de cebolla", escribe: "Añade media cebolla picada finamente".
     * En lugar de "Vierte 15ml de aceite", escribe: "Vierte una cucharada de aceite de oliva virgen extra (15 ml)".
     * En lugar de "Añade 200 de pollo", escribe: "Incorpora los 200 g de pechuga de pollo cortada en dados".
     * En lugar de "Agrega 2 unidades de huevo", escribe: "Agrega los 2 huevos batidos".
   - Si las raciones del metraje original difieren de las raciones objetivo del usuario, aplica el factor de conversión matemático a todos los ingredientes e inyecta esas cantidades ya calculadas (escaladas) en la redacción natural de los pasos.
   - Establece el campo 'porciones' exactamente con el número final de raciones ya escaladas.`;

  return `
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

${rule4Units}

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

7. ASIGNACIÓN OBLIGATORIA DE ETIQUETAS SEMÁNTICAS MULTI-CATEGORÍA (ENTRE 3 Y 5 ETIQUETAS):
   - DEBES asignar obligatoriamente ENTRE 3 Y 5 etiquetas semánticas precisas y descriptivas en el array "etiquetas" para habilitar la categorización múltiple e indexación en el recetario.
   - REGLAS DE ASIGNACIÓN OBLIGATORIAS:
     a) NATURALEZA O FORMATO DEL PLATO: Identifica siempre el formato culinario base (ej: "Sopa", "Crema", "Ensalada", "Aliño y Salsa", "Guiso", "Pasta", "Arroz", "Panadería", "Postre", "Entrante").
     b) INGREDIENTE O FUENTE PRINCIPAL: Identifica siempre la materia prima o proteína protagonista (ej: "Pollo", "Carne", "Pescado", "Marisco", "Legumbres", "Verduras", "Huevo", "Queso").
     c) MOMENTO O TÉCNICA: Identifica el momento o función idónea (ej: "Almuerzo", "Cena", "Desayuno", "Rápido (<20m)", "Batch Cooking").
   - EJEMPLOS OBLIGATORIOS:
     * Para 'Pasta con pollo y salsa pesto': asigna ["Pasta", "Carnes y Aves", "Pollo", "Aliños y Salsas", "Almuerzo"].
     * Para 'Sopa de pescado y marisco': asigna ["Sopas y Cremas", "Pescados y Mariscos", "Cena Ligera"].
     * Para 'Ensalada de garbanzos con atún': asigna ["Ensaladas y Entrantes", "Legumbres", "Pescados y Mariscos", "Atún", "Almuerzo Saludable"].

${ruleServingsHeuristic}

${rule9Quantities}

${firewallSection}

${languageSection}
`.trim();
}

/**
 * Directiva Nutricional Holística por defecto (Español)
 */
export const SYSTEM_INSTRUCTION_RECIPES = buildRecipeSystemInstruction({ idioma: 'es' });

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
  dificultad: string;
  ingredientes: ExtractedIngredient[];
  pasos: ExtractedStep[];
  macros_estimados_por_porcion: ExtractedMacros;
  sustituciones_resumen?: string;
  categorias_gastronomicas?: string[];
  momentos_consumo?: string[];
  etiquetas: string[];
  alertas_compatibilidad?: string[];
}
