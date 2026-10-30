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
        'Número de raciones resultantes de la receta. PRINCIPIO DEL ANCLA CULINARIA: Todo plato cuenta con un "ingrediente ancla" (rol "principal": proteína estructural o carbohidrato/legumbre volumétrica base). Si el creador no declara raciones o si las cantidades secundarias están visiblemente descompensadas, DEBES calibrar las raciones base deduciendo el peso del ingrediente ancla entre el estándar biológico por ración de la Tabla Maestra.',
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
              'Unidad del ingrediente. PRINCIPIO DE FIDELIDAD A LA UNIDAD DE ENTRADA: Si la fuente original declara explícitamente unidades domésticas tradicionales ("cucharada", "cucharadita", "tbsp", "tsp", "pizca", "al gusto") para ingredientes cuya magnitud cuantitativa sea <= 60, DEBES conservar fielmente dicha unidad original (está estrictamente prohibido degradarlas proactivamente a gramos o ml). PRINCIPIO DE NÚCLEO RECTOR VS MODIFICADOR: La clasificación de un ingrediente evalúa exclusivamente su sustantivo núcleo base (ej. \"mantequilla\" en \"mantequilla sin sal\", \"pollo\" en \"pollo con sal\"). Las grasas de cocción, proteínas o hidratos NUNCA transmutan a condimento ni a \"al gusto\" por llevar modificadores como \"sin sal\" o \"con sal\". INVARIANZA DE MASA DECLARADA: Si un ingrediente tiene masa física o volumen definido (ej: 50 g de mantequilla sin sal) y rol estructural (\"grasa_coccion\", \"principal\", \"base_liquida\", \"sofrito_base\"), NUNCA debe sobreescribirse a \"al gusto\" ni a \"invariable\". REGLA CANÓNICA DE ESPECIAS (SALADO VS REPOSTERÍA): En platos salados (entrantes, principales, guarniciones, salsas, guisos), toda especia, hierba aromática seca, sal y pimienta pura debe normalizarse obligatoriamente como cantidad: 1, unidad: "al gusto" ("to taste" en inglés) y rol_culinario: "invariable". EXCEPCIÓN DE REPOSTERÍA Y POSTRES: En postres o masas dulces/pastelería, NO fuerces las especias o aromatizantes (canela, vainilla, cardamomo, nuez moscada, jengibre en polvo, clavo, ralladura de cítricos) a "al gusto"; respeta sus medidas exactas (cucharaditas, gramos) del creador o deducidas proporcionalmente a la masa/harina con rol_culinario: "condimento". Para ingredientes masivos a granel o recipientes ambiguos ("taza", "vaso", "puñado"), convierte a estándar métrico ("g" para sólidos/pastas o "ml" para líquidos). BARRERA DE MAGNITUD (MAX_SPOON_MAGNITUDE = 60): Cualquier ingrediente con cantidad > 60 queda terminantemente bloqueado para unidades de cuchara y debe usar "g" o "ml". REGLA LÓGICA DE PLURALIZACIÓN: si la cantidad es > 1 y la unidad es de piezas enteras, el texto de salida en unidad debe ser estrictamente plural ("units" en inglés, "unidades" en español); si es 1, singular ("unit" en inglés, "unidad" en español). EXCEPCIÓN CULINARIA PARA EL AJO: Para ajo desgranado, la unidad obligatoria DEBE ser "diente" o "dientes" ("clove" o "cloves" en inglés); está PROHIBIDO usar "unidad", "unidades" o "cabeza" a menos que la receta use la cabeza entera asada.',
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
          rol_culinario: {
            type: Type.STRING,
            enum: [
              'principal',
              'sofrito_base',
              'guarnicion',
              'grasa_coccion',
              'condimento',
              'invariable',
            ],
            description:
              'Clasificación funcional estricta: "principal" (ingrediente ancla: proteína estructural o carbohidrato/legumbre volumétrica base que define el dimensionamiento del plato), "sofrito_base" (cebolla, ajo, aromáticos de inicio), "guarnicion" (verduras/setas de acompañamiento), "grasa_coccion" (aceite de cocina o mantequilla de salteado, calibrada al rango termodinámico de cobertura de sartén por ración), "condimento" (especias, hierbas secas, sal, pimienta), "invariable" (toques finales "al gusto", pizcas decorativas).',
          },
          seccion: {
            type: Type.STRING,
            description:
              'Nombre de la subreceta o sección funcional a la que pertenece el ingrediente si la fuente presenta bloques o encabezados (ej: "Principal", "Salsa", "Guarnición", "Puré", "Masa", "Relleno", "Marinado"). Si no hay secciones diferenciadas, devuelve null o "Principal".',
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
          'rol_culinario',
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
              'Nivel Intermedio (Estándar / Free): Flujo limpio, directo y funcional de cocina doméstica eficiente. Agrupa acciones coordinadas de manera natural para mantener dinamismo sin lecciones básicas ni jerga pretenciosa. OBLIGATORIO: integra las cantidades exactas en prosa culinaria fluida (ej: "Añade media cebolla picada finamente", "Vierte una cucharada de aceite (15 ml)", "Incorpora los 200 g de pechuga de pollo cortada en dados"). Está TERMINANTEMENTE PROHIBIDO redactar números con decimales de laboratorio fríos o antinaturales (NO escribir "añade 0.5 unidades de cebolla" ni "vierte 15ml de aceite"). Las cantidades inyectadas deben coincidir con las porciones escaladas de la receta.',
          },
          instruccion_principiante: {
            type: Type.STRING,
            description:
              'Nivel Principiante (PRO): OBLIGATORIO. Redacción didáctica, pedagógica y de seguridad integral que NO puede ser una sustitución cosmética o mero sinónimo de "instruccion". Arquetipo cognitivo: principiante que necesita comprender el "por qué" de cada técnica (ej: secar ingredientes antes de dorar para que no suelten agua), advertencias preventivas de seguridad física (salpicaduras de aceite caliente, distancia del vapor, agarre de dedos en cortes), tiempos preventivos y señales sensoriales explícitas (ej: "hasta que el cuchillo entre sin resistencia", "dorado avellana pero no quemado"). Integra también las cantidades exactas en prosa culinaria natural.',
          },
          instruccion_avanzada: {
            type: Type.STRING,
            description:
              'Nivel Avanzado (PRO): Redacción concisa, técnica y de alta exigencia orientada a mise en place, control térmico específico, paralelismo y ejecución concurrente entre fuegos/horno y fundamentos físico-químicos (emulsión mecánica, reacción de Maillard, desglasado con vino para recuperar sucs caramelizados, reducción y redistribución interna de jugos). Omite por completo advertencias elementales u obvias.',
          },
          descriptor_sensorial: {
            type: Type.STRING,
            description:
              'OBLIGATORIO para Nivel Principiante (PRO): Tarjeta sensorial detallada con los cambios de color, texturas y aromas clave para saber exactamente cuándo pasar al siguiente paso sin miedo a quemar o dejar crudo el alimento (ej: "La cebolla pasará de blanco opaco a transparente brillante y desprenderá un aroma dulce; retira antes de que los bordes oscurezcan").',
          },
          potencia_fuego: {
            type: Type.STRING,
            enum: ['suave', 'medio', 'medio-alto', 'alto', 'horno'],
            description:
              'Nivel o potencia del fuego/calor requerido para este paso: "suave", "medio", "medio-alto", "alto", o "horno".',
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
        required: ['orden', 'instruccion', 'instruccion_principiante', 'instruccion_avanzada', 'descriptor_sensorial'],
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

  const subrecipesSection =
    idioma === 'en'
      ? `11. SUB-RECIPES AND FUNCTIONAL SECTIONS DIRECTIVE:
   - If the source content or recipe presents blocks of ingredients or steps differentiated by sections or headers (e.g. 'For the dough:', 'For the filling:', 'For the sauce:', 'For the puree:', 'For the garnish:'), you MUST assign each ingredient its corresponding 'seccion' name (e.g. 'Dough', 'Filling', 'Sauce', 'Puree', 'Garnish').
   - If the recipe has no subdivisions or block headers, assign null or 'Main'.
   - This prevents ambiguity in preparation and step quantity scaling when ingredients are shared across different phases.`.trim()
      : `11. DIRECTIVA DE SUBRECETAS Y SECCIONES FUNCIONALES:
   - Si el contenido fuente o receta presenta bloques de ingredientes o pasos diferenciados por secciones o encabezados (ej: 'Para la masa:', 'Para el relleno:', 'Para la salsa:', 'Para el puré:', 'Para la guarnición:'), DEBES asignar obligatoriamente a cada ingrediente su 'seccion' correspondiente (ej: 'Masa', 'Relleno', 'Salsa', 'Puré', 'Guarnición').
   - Si la receta no tiene subdivisiones ni encabezados de bloque, asigna null o 'Principal'.
   - Esto evita cualquier ambigüedad en la preparación y en el escalado de pasos cuando un mismo ingrediente se utiliza en distintas fases.`.trim();

  const rule4Units =
    idioma === 'en'
      ? `4. METRIC CONVERSION, INPUT UNIT FIDELITY AND PIECE PLURALIZATION RULES:
   - PRINCIPLE OF FIDELITY TO INPUT DOMESTIC UNITS: If the original source explicitly declares traditional domestic units ('tablespoon', 'teaspoon', 'tbsp', 'tsp', 'pinch', 'to taste') for low-magnitude ingredients (quantity <= 60):
     * It is STRICTLY FORBIDDEN to proactively convert them to metric grams ('g') or 'ml'.
     * They MUST be faithfully preserved with the original domestic unit conceived by the author (e.g. "1 tbsp curry powder" -> amount: 1, unit: "tbsp").
     * The magnitude barrier (MAX_SPOON_MAGNITUDE = 60) serves strictly as a safety filter to prevent massive bulk quantities from adopting spoons, but MUST NOT be used to degrade legitimate source spoons into cold scale grams.
   - For bulk ingredients, ambiguous containers ('cup', 'glass', 'handful'), or liquid pours: estimate food physical density and convert quantities to standardized units: grams ('g') for solids/pastes or milliliters ('ml') for liquids/stocks/oils (e.g., '1 cup flour' -> 120 g).
   - STRICT LOGICAL RULE FOR INDIVISIBLE PIECES ('unit' vs 'units'):
     * If the detected quantity is 1 (or <= 1), the unit MUST strictly be "unit" in singular (e.g. quantity: 1, unit: "unit").
     * If the detected quantity is > 1 (e.g. 2, 3, 4, etc.), the output unit MUST STRICTLY BE "units" in plural (e.g. quantity: 2, unit: "units").
     * MANDATORY CULINARY EXCEPTION FOR GARLIC: For peeled or separated garlic cloves, the mandatory unit MUST be "clove" (singular) or "cloves" (plural). It is STRICTLY FORBIDDEN to use "unit", "units", or "head" unless roasting the entire whole head. (e.g., 3 garlic cloves -> quantity: 3, unit: "cloves"; 1 garlic clove -> quantity: 1, unit: "clove").
     * NEVER use 'unidad' or 'unidades' in English mode.
     * Always complete 'gramos_estimados' according to the standard piece weight (e.g. 2 units of egg = 120 g, 1 clove of garlic = 5 g, 1 tbsp curry powder = 10 g).
   - FUNCTIONAL CLASSIFICATION DIRECTIVE ('rol_culinario') AND SPICE/CONDIMENT RULES:
     * Strictly classify each ingredient into one of the 6 functional roles:
       - 'principal': Main protein (chicken, beef, fish, tofu) and base carbohydrates (rice, pasta, dry legumes).
       - 'sofrito_base': Aromatic foundation (onion, garlic cloves, leek, celery).
       - 'guarnicion': Sides, mushrooms, secondary vegetables.
       - 'grasa_coccion': Cooking oil, butter for sautéing/searing.
       - 'condimento': Dry/powdered spices, herbs, salt, pepper, oregano, thyme, cumin, paprika, mustard powder, cinnamon, as well as viscous seasonings, fermented pastes, and concentrated sweeteners (Gochujang, miso paste, honey, tahini, tomato paste, dijon mustard, maple syrup, oyster sauce) when used as seasonings or dressing.
         **UNIVERSAL MAGNITUDE LAW FOR DOMESTIC SPOON UNITS:** Domestic spoon units ('tsp', 'tbsp') are strictly restricted to quantities/magnitudes <= 60 (g or ml). Any ingredient whose quantity is > 60 is strictly blocked from spoon units and MUST be specified in standard metric units ('g', 'ml', 'kg', 'l').
       - 'invariable': Fixed non-scaling elements (e.g. "to taste", decorative pinch).
    - CANONICAL SPICE RULE (SAVORY DISHES VS PASTRY/DESSERTS): In savory dishes (starters, main dishes, sides, sauces, stews), every dry spice, dried aromatic herb, salt, and pepper MUST be normalized as cantidad: 1, unidad: 'to taste', rol_culinario: 'invariable'. PASTRY & DESSERT EXCEPTION (rol_plato === 'postre' or sweet dough/baking context): DO NOT force spices or flavorings (cinnamon, vanilla, cardamom, nutmeg, ginger powder, clove, citrus zest) to 'to taste'; respect exact measures (teaspoons, grams) from the creator or deduced proportionally to the flour/batter mass with rol_culinario: 'condimento'.`
      : `4. CONVERSIÓN MÉTRICA, FIDELIDAD A LA UNIDAD DE ENTRADA Y REGLA DE PLURALIZACIÓN:
   - PRINCIPIO DE FIDELIDAD A LA UNIDAD DE ENTRADA: Si la fuente original declara explícitamente unidades domésticas tradicionales ('cucharada', 'cucharadita', 'pizca', 'al gusto') para ingredientes de baja magnitud (<= 60):
     * Queda TERMINANTEMENTE PROHIBIDO convertirlos proactivamente a gramos métricos ('g') o mililitros ('ml').
     * DEBEN conservarse fielmente con la unidad doméstica original con la que fueron concebidos por el autor (ej: "1 ½ cucharadas de curry en polvo" -> cantidad: 1.5, unidad: "cucharadas").
     * La barrera de magnitud (MAX_SPOON_MAGNITUDE = 60) opera como filtro de seguridad para impedir que magnitudes masivas adopten cucharas, pero NO debe usarse para degradar cucharas legítimas de origen a gramos fríos de báscula.
   - Para ingredientes masivos a granel, medidas ambiguas de recipiente ('taza', 'vaso', 'puñado') o vertidos: estima la densidad física del alimento y convierte la cantidad a medidas estandarizadas métricas: gramos ('g') para ingredientes sólidos/pastosos o mililitros ('ml') para líquidos/caldos/aceites (ej. '1 taza de harina' -> 120 g).
   - REGLA LÓGICA ESTRICTA PARA PIEZAS INDIVISIBLES ('unidad' vs 'unidades'):
     * Si la cantidad detectada es 1 (o <= 1), la unidad debe ser estrictamente "unidad" en singular (ej: cantidad: 1, unidad: "unidad").
     * Si la cantidad detectada es > 1 (ej: 2, 3, 4, etc.), la unidad de salida DEBE SER ESTRICTAMENTE "unidades" en plural (ej: cantidad: 2, unidad: "unidades").
     * EXCEPCIÓN CULINARIA OBLIGATORIA PARA EL AJO: Para ajo desgranado, la unidad obligatoria DEBE ser "diente" (singular) o "dientes" (plural). Está TERMINANTEMENTE PROHIBIDO usar "unidad" o "cabeza" para los dientes de ajo, a menos que la receta utilice una cabeza entera asada. (Ej: 3 dientes de ajo -> cantidad: 3, unidad: "dientes"; 1 diente de ajo -> cantidad: 1, unidad: "diente").
     * Siempre completa los gramos_estimados equivalentes según el peso estándar de la pieza o cuchara (ej. 2 unidades de huevo = 120 g, 1 diente de ajo = 5 g, 1 cucharada de curry = 10 g).
   - DIRECTIVA DE CLASIFICACIÓN FUNCIONAL ('rol_culinario') Y TRATAMIENTO DE CONDIMENTOS:
     * Clasifica estrictamente cada ingrediente en uno de los 6 roles según su función real:
       - 'principal': Proteínas principales (pollo, ternera, pescado, tofu) e hidratos base (arroz, pasta, patatas, legumbres base).
       - 'sofrito_base': Aromáticos de base para sofreír (cebolla, dientes de ajo, puerro, apio, zanahoria de sofrito).
       - 'guarnicion': Acompañamientos, verduras secundarias, setas, champiñones, etc.
       - 'grasa_coccion': Aceite para freír/sofreír, mantequilla de cocinado en sartén.
       - 'condimento': Especias secas o en polvo, hierbas, sal, pimienta, pimentón, comino, orégano, mostaza en polvo, canela, así como condimentos viscosos, pastas fermentadas y endulzantes concentrados (Gochujang, pasta de miso, miel, tahini, pasta de tomate, mostaza Dijon, sirope, salsa de ostras) cuando actúan como aderezo o sazonador.
         **LEY UNIVERSAL DE MAGNITUD PARA UNIDADES DE CUCHARA:** Las unidades domésticas ('cucharadita', 'cucharada', 'tbsp', 'tsp') quedan restringidas EXCLUSIVAMENTE a magnitudes cuantitativas <= 60 (g o ml). Cualquier ingrediente cuya cantidad sea > 60 queda terminantemente bloqueado para unidades de cuchara y DEBE especificarse en unidades métricas estándar ('g', 'ml', 'kg', 'l').
       - 'invariable': Cantidades fijas no escalables (ej. "al gusto", "to taste", "pizca de sal al gusto", toques decorativos).
   - REGLA CANÓNICA DE ESPECIAS (SALADO VS REPOSTERÍA): En platos salados (entrantes, principales, guarniciones, salsas, guisos), toda especia, hierba aromática seca, sal y pimienta debe normalizarse obligatoriamente como cantidad: 1, unidad: 'al gusto' y rol_culinario: 'invariable'. EXCEPCIÓN DE REPOSTERÍA Y POSTRES (rol_plato === 'postre' o contexto de masas dulces/pastelería): NO fuerces las especias o aromatizantes (canela, vainilla, cardamomo, nuez moscada, jengibre en polvo, clavo, ralladura de cítricos) a "al gusto"; respeta las medidas exactas (cucharaditas, gramos) del creador o deducidas proporcionalmente a la masa/harina con su unidad métrica/doméstica real y rol_culinario: 'condimento'.`;
  const rule8Quantities =
    idioma === 'en'
      ? `8. NATURAL CULINARY PROSE, MASTER GRAMMAGE REFERENCE, AND BASE SERVINGS INFERENCE:
   - In the 'pasos' / preparation array, integrate exact ingredient quantities using fluent, professional, and natural culinary prose.
   - STRICT FORBIDDANCE OF LABORATORY DECIMALS: You are STRICTLY FORBIDDEN from writing cold, unnatural, or laboratory-like phrasing such as "add 0.5 units of onion", "pour 0.25 tablespoons", or "add 15ml of oil".
   - MANDATORY CULINARY PHRASING DIRECTIVE: Integrate precise quantities into natural culinary English:
     * Instead of "Add 0.5 units of onion", write: "Add half an onion, finely chopped".
     * Instead of "Pour 15ml of oil", write: "Pour one tablespoon of extra virgin olive oil (15 ml)".
     * Instead of "Add 200 of chicken", write: "Incorporate the 200 g of diced chicken breast".
     * Instead of "Add 2 units of egg", write: "Add the 2 beaten eggs".
   - PRINCIPLE OF THE CULINARY ANCHOR AND PROPORTIONAL EQUILIBRIUM INFERENCE:
     * Every dish has an "anchor ingredient" (classified under the 'principal' role: structural protein or base volumetric carbohydrate/legume).
     * When the creator specifies exact grams or measures in the description/video, respect them with 100% fidelity. When the creator does NOT specify exact grams or measures in the description/video, use the quantity of the main anchor ingredient(s) ('principal') as the proportional reference anchor to calculate realistic and balanced quantities for the rest of the ingredients:
       1. Biological servings calibration: Calibrate base servings ('porciones') from the weight of the anchor ingredient, applying biological standards for main dish individual servings according to the Master Reference Table.
       2. Proportional capacity of cooking fluids and stocks: Volumes of cooking liquids and broths/stocks must maintain a proportional capacity relationship relative to the volume of the anchor ingredient, correcting unjustified source excesses to prevent drowning or flooding the dish.
       3. Thermodynamic range of initial cooking fats: Initial cooking fats ('grasa_coccion') must calibrate to the thermodynamic ranges required to coat the standard pan cooking surface per serving (typically 10-15 ml per diner), without inheriting excessive pours or splashes from the video.
   - MANDATORY BASE SERVINGS INFERENCE DIRECTIVE (MASTER NUTRITIONAL REFERENCE TABLE):
     If the creator does not state or write the exact number of servings, NEVER assume 1 serving nor apply random values. You MUST calculate 'porciones' by deducing the volume of the main base ingredient according to this Master Nutritional Reference Table (per single serving/person):
     * LEGUMES:
       - Dry legumes (lentils, chickpeas, beans): 60 – 80 g dry weight per main dish serving.
       - Cooked / drained canned legumes: 160 – 200 g per main dish serving (100 – 120 g in cold salads or side dishes).
     * ANIMAL PROTEINS (trimmed/cleaned):
       - White meat / poultry (chicken breast, boneless thighs, turkey): 140 – 180 g raw weight per serving.
       - Red meat / lean cuts (beef, pork loin): 150 – 180 g raw weight per serving.
       - White fish (hake, cod, sea bream): 160 – 200 g raw weight per serving.
       - Oily / fatty fish (salmon, tuna, mackerel): 130 – 160 g raw weight per serving.
       - Clean shellfish / cephalopods (shrimp, squid): 150 – 200 g raw weight per serving.
       - Eggs: 2 units (or 100 – 120 g pasteurized egg whites) per main dish serving.
     * PLANT-BASED ALTERNATIVES / VEGAN PROTEIN:
       - Firm tofu or tempeh: 120 – 150 g per serving.
       - Textured soy protein (TVP): 35 – 50 g dry weight (yields ~120-150 g hydrated).
       - Seitan: 100 – 130 g per serving.
     * GRAINS, TUBERS AND CARBOHYDRATES:
       - Dry pasta / noodles: 70 – 90 g raw weight per serving (main dish); 40 – 50 g in soups or sides.
       - Rice grains: 70 – 85 g raw weight (dry/paella dishes); 40 – 50 g in brothy soups.
       - Potatoes / Sweet potatoes: 200 – 250 g whole raw weight per serving (main dish); 120 – 150 g as side.
       - Bread / Toast: 50 – 70 g per individual serving.
       - Rolled oats / morning flours: 40 – 60 g per breakfast serving.
     * VEGETABLES, GREENS AND SALADS:
       - Main dish vegetables (ratatouille, roasted vegetables, stir-fry): 250 – 350 g raw weight.
       - Vegetable creams or purées: 300 – 400 g raw vegetables + 150 – 200 ml broth/liquid per serving.
       - Salad greens (lettuce, baby spinach, arugula): 60 – 80 g raw per serving.
     * LIQUIDS, BROTHS AND BASE SAUCES:
       - Broth in first-course soups: 250 – 350 ml per diner.
       - Milk / Plant-based milk in breakfasts: 200 – 250 ml per serving.
       - Natural / Greek yogurt: 125 – 150 g per serving (1 standard unit).
       - Tomato sauce or concentrated sofrito base: 80 – 120 g per serving.
     * CULINARY FATS AND DRESSINGS:
       - Extra virgin olive oil raw / dressing: 10 – 15 ml (1 tablespoon) per person.
       - Nuts / seeds: 25 – 30 g (a standard handful).
     * BREAKFASTS AND SINGLE-PORTION BAKING:
       - Mug cakes / cup cakes / individual pancakes: batter summing between 90 – 140 g corresponds to exactly 1 serving.
     * MANDATORY CONSEQUENCE: Calculate servings by dividing the weight of the base ingredient by its reference unit weight and round to the nearest whole integer (e.g. 400 g cooked chickpeas with greens = 2 servings; 500 g chicken breast = 3 servings; 160 g dry pasta = 2 servings).
   - Faithfully extract the recipe's native base servings into the 'porciones' field. Ingredient quantities integrated into the steps narrative must correspond accurately to those base servings.
    - COGNITIVE ARCHETYPE MATRIX FOR CULINARY LEVELS (STRICT FORBIDDANCE OF COSMETIC SYNONYM REPLACEMENT):
      It is STRICTLY FORBIDDEN to simply swap words or use cosmetic synonyms between levels. Each level represents a fundamentally distinct cognitive profile, informational density, and pedagogical approach:

      * 'instruccion_principiante': BEGINNER LEVEL (Pedagogy, "The Why", and Physical Safety).
        - Archetype: Novice cook experiencing thermal, cutting, or timing insecurity.
        - Approach: Explains the "why" behind each action (e.g. "pat the meat thoroughly dry before searing so surface moisture does not boil the meat").
        - Safety & Prevention: Explicit physical safety warnings (hot oil splatters, steam vent clearance, 'claw' grip when chopping).
        - Explicit Sensory Signals: Non-ambiguous visual, tactile, and audible cues (e.g. "until a knife slides in effortlessly like butter", "hazelnut golden but not dark brown", "the sizzle settles into a gentle bubbling").

      * 'instruccion': INTERMEDIATE LEVEL (Efficient Domestic Standard).
        - Archetype: Everyday cook seeking fluid, functional execution without patronizing warnings or chef pretensions.
        - Approach: Clean, direct, and agile flow. Naturally chains coordinated actions without clutter.

      * 'instruccion_avanzada': ADVANCED LEVEL (Professional Technique, Thermal Precision & Physical-Chemical Principles).
        - Archetype: Experienced cook or professional line brigade focused on mise en place, thermal control, and multi-pan concurrency.
        - Approach: High-density, professional terminology (Maillard reaction, deglazing caramelized sucs, mechanical starch emulsion, internal resting).
        - Parallelism: Highlights concurrent tasks across pans/oven. Omits all elementary guidance.

      * 'descriptor_sensorial': Empirical visual, textural, and aromatic cues confirming the exact cooking milestone.
      * 'potencia_fuego': Strictly classify fire intensity: 'suave', 'medio', 'medio-alto', 'alto', or 'horno'.`
      : `8. REDACCIÓN EN PROSA CULINARIA NATURAL, TABLA MAESTRA DE GRAMAJES E INFERENCIA DE RACIONES:
   - En el array de 'pasos' o 'preparación', integra siempre las cantidades exactas de los ingredientes de forma fluida, profesional y natural.
   - PROHIBICIÓN ESTRICTA DE DECIMALES DE LABORATORIO: Queda TERMINANTEMENTE PROHIBIDO redactar expresiones frías, artificiales o de laboratorio como "añade 0.5 unidades de cebolla", "vierte 0.25 cucharadas" o "agrega 15ml de aceite".
   - DIRECTIVA OBLIGATORIA DE REDACCIÓN NATURAL: Utiliza lenguaje gastronómico natural incorporando la precisión métrica idónea:
     * En lugar de "Añade 0.5 unidades de cebolla", escribe: "Añade media cebolla picada finamente".
     * En lugar de "Vierte 15ml de aceite", escribe: "Vierte una cucharada de aceite de oliva virgen extra (15 ml)".
     * En lugar de "Añade 200 de pollo", escribe: "Incorpora los 200 g de pechuga de pollo cortada en dados".
     * En lugar de "Agrega 2 unidades de huevo", escribe: "Agrega los 2 huevos batidos".
   - PRINCIPIO DEL ANCLA CULINARIA E INFERENCIA PROPORCIONAL DE EQUILIBRIO:
     * Todo plato cuenta con un "ingrediente ancla" (clasificado bajo el rol 'principal': proteína estructural o carbohidrato/legumbre volumétrica base).
     * Cuando el creador especifique gramos o medidas exactas en la descripción/vídeo, respétalas con total fidelidad. Cuando el creador NO especifique gramos o medidas exactas en la descripción/vídeo, utiliza como ancla y referencia proporcional la cantidad del ingrediente o ingredientes principales ('principal') para calcular cantidades realistas y balanceadas del resto de ingredientes:
       1. Calibración biológica de raciones: El modelo DEBE calibrar las raciones base ('porciones') a partir del peso del ingrediente ancla, aplicando los estándares biológicos de ración individual de plato principal según la Tabla Maestra.
       2. Proporcionalidad física de líquidos y fondos: Los volúmenes de líquidos de cocción y fondos deben guardar una relación proporcional de capacidad respecto al volumen del ingrediente ancla, corrigiendo excesos injustificados de origen para evitar que el plato quede aguado o inundado en líquido.
       3. Rango termodinámico de grasas de inicio: Las grasas de cocción de inicio (rol 'grasa_coccion') deben calibrarse a los rangos termodinámicos necesarios para cubrir la superficie de cocción estándar por ración (típicamente 10-15 ml por comensal), sin heredar vertidos desmedidos o descuidos del vídeo.
   - DIRECTIVA OBLIGATORIA DE INFERENCIA DE RACIONES BASE (TABLA MAESTRA NUTRICIONAL):
     Si el creador no verbaliza ni escribe el número exacto de raciones, NUNCA asumas 1 ración ni apliques valores al azar. DEBES calcular las 'porciones' deduciendo el volumen del ingrediente principal o base de la elaboración según esta Tabla Maestra de Referencia Nutricional (por persona/ración individual):
     * LEGUMBRES:
       - Legumbre seca (lentejas, garbanzos, alubias): 60 – 80 g en seco por ración de plato principal.
       - Legumbre cocida / bote escurrido: 160 – 200 g por ración de plato principal (100 – 120 g en ensaladas frías o guarniciones).
     * PROTEÍNAS ANIMALES (limpias de merma):
       - Carne blanca / ave (pechuga, contramuslo deshuesado, pavo): 140 – 180 g crudo por ración.
       - Carne roja / magra (ternera, lomo de cerdo): 150 – 180 g crudo por ración.
       - Pescado blanco (merluza, bacalao, dorada limpia): 160 – 200 g en crudo por ración.
       - Pescado azul graso (salmón, atún, caballa): 130 – 160 g en crudo por ración.
       - Marisco limpio / cefalópodos (gambas, calamares): 150 – 200 g crudo por ración.
       - Huevos: 2 unidades (o 100 – 120 g de clara pasteurizada) por ración de plato principal.
     * ALTERNATIVAS VEGETALES / PROTEÍNA VEGANA:
       - Tofu firme o tempeh: 120 – 150 g por ración.
       - Soja texturizada: 35 – 50 g en seco (equivale a ~120-150 g hidratada).
       - Seitán: 100 – 130 g por ración.
     * CEREALES, TUBÉRCULOS Y CARBOHIDRATOS:
       - Pasta seca / fideos: 70 – 90 g en crudo por ración (plato principal); 40 – 50 g en sopas o guarniciones.
       - Arroz en grano: 70 – 85 g en crudo (platos secos/paellas); 40 – 50 g en caldosos/sopas.
       - Patatas / Boniatos: 200 – 250 g enteros en crudo por ración (plato principal); 120 – 150 g como guarnición.
       - Pan / Tostadas: 50 – 70 g por ración individual.
       - Copos de avena / harinas matutinas: 40 – 60 g por ración de desayuno.
     * VERDURAS, HORTALIZAS Y ENSALADAS:
       - Verduras de plato principal (menestra, pisto, salteado, verduras al horno): 250 – 350 g en crudo.
       - Cremas o purés de verduras: 300 – 400 g de verduras brutas + 150 – 200 ml de líquido/caldo por ración.
       - Hojas verdes para ensalada (lechuga, espinacas baby, canónigos, rúcula): 60 – 80 g en crudo por ración.
     * LÍQUIDOS, CALDOS Y SALSAS BASE:
       - Caldos en sopas de primer plato: 250 – 350 ml por comensal.
       - Leche / Bebidas vegetales en desayunos: 200 – 250 ml por ración.
       - Yogur natural / griego: 125 – 150 g por ración (1 unidad estándar).
       - Salsa de tomate o sofrito base concentrado: 80 – 120 g por ración.
     * GRASAS CULINARIAS Y ADEREZOS:
       - Aceite de oliva virgen extra en crudo / aliño: 10 – 15 ml (1 cucharada sopera) por persona.
       - Frutos secos / semillas: 25 – 30 g (un puñado estándar).
     * DESAYUNOS Y REPOSTERÍA MONOPORCIÓN:
       - Mug cakes / bizcochos en taza / tortitas individuales: masas que sumen entre 90 – 140 g totales corresponden exactamente a 1 ración.
     * CONSECUENCIA OBLIGATORIA: Calcula las raciones dividiendo el peso del ingrediente base entre su gramaje unitario de referencia y redondea al entero más próximo (ej: 400 g de garbanzos cocidos con hojas verdes = 2 raciones; 500 g de pechuga de pollo = 3 raciones; 160 g de pasta seca = 2 raciones).
   - Extrae con total fidelidad las porciones o raciones base originales de la elaboración y refléjalas en el campo 'porciones'. Las cantidades integradas en los pasos deben corresponderse exactamente con dichas porciones base.
    - MATRIZ ARQUETÍPICA DE NIVELES CULINARIOS Y PEDAGOGÍA REAL (PROHIBICIÓN ESTRICTA DE SUSTITUCIÓN COSMÉTICA/SINÓNIMOS):
      Queda TERMINANTEMENTE PROHIBIDO limitarse a cambiar sinónimos o palabras sueltas entre niveles. Cada nivel representa un perfil cognitivo, una densidad de información y una estructura pedagógica profundamente diferenciada:

      * 'instruccion_principiante': NIVEL PRINCIPIANTE (Didáctica, Pedagogía y Seguridad Física Integral).
        - Arquetipo: Cocinero novato con inseguridad térmica, de cortes o de tiempos.
        - Enfoque: Explica el "por qué" detrás de cada técnica (ej: "secamos bien la carne antes de dorar para que no suelte agua y logre un sellado caramelizado").
        - Seguridad y Prevención: Incluye advertencias de seguridad física preventiva (control de salpicaduras de aceite caliente, distancia del vapor al abrir recipientes/horno, posición de dedos en 'garra' al cortar).
        - Señales Sensoriales Explícitas y Tiempos Preventivos: Usa marcadores táctiles, sonoros, olfativos y visuales no ambiguos (ej: "hasta que el cuchillo entre sin resistencia como mantequilla", "dorado avellana pero sin llegar a marrón oscuro", "el chisporroteo del aceite pase de intenso a suave").
        - Paso a paso desgranado: No des nada por sabido.

      * 'instruccion': NIVEL INTERMEDIO (Estándar de Cocina Doméstica Eficiente).
        - Arquetipo: Cocinero habitual que busca agilidad, fluidez y efectividad sin lecciones básicas ni jerga pretenciosa.
        - Enfoque: Flujo limpio, directo y funcional. Agrupa acciones coordinadas de manera natural para mantener dinamismo (ej: "Pica la cebolla y póchala en la sartén a fuego medio hasta que transparente").
        - Sin lecciones infantiles ni advertencias obvias de quemarse o cortar.

      * 'instruccion_avanzada': NIVEL AVANZADO (Técnica, Precisión y Rendimiento Profesional).
        - Arquetipo: Cocinero experto o brigada culinaria orientado a mise en place, precisión térmica y ejecución paralela.
        - Enfoque: Redacción sintética, técnica y de alta densidad. Emplea terminología culinaria canónica y fundamentos físico-químicos (reacción de Maillard, desglasado con vino para recuperar sucs caramelizados, emulsión mecánica con almidón, control termodinámico exacto).
        - Paralelismo y Organización: Enfatiza la simultaneidad de elaboraciones (ej: "Mientras reduce el fondo, marca la pieza a fuego vivo 2 min por cara y reserva para redistribución interna de jugos").
        - Cero advertencias elementales.

      * 'descriptor_sensorial': Pistas empíricas obligatorias (aroma, color, textura, sonido) que validan el punto exacto de cocción.
      * 'potencia_fuego': Clasificación obligatoria de calor: 'suave', 'medio', 'medio-alto', 'alto' u 'horno'.`;

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

${rule8Quantities}

${firewallSection}

${languageSection}

${subrecipesSection}
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
  rol_culinario?: string;
  seccion?: string | null;
}

export interface ExtractedStep {
  orden: number;
  instruccion: string;
  instruccion_principiante?: string | null;
  instruccion_avanzada?: string | null;
  descriptor_sensorial?: string | null;
  potencia_fuego?: 'suave' | 'medio' | 'medio-alto' | 'alto' | 'horno' | string | null;
  tiempo_estimado_min?: number | null;
  temperatura_celsius?: number | null;
  consejo_pro?: string | null;
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
  rol_plato?: string;
}

/**
 * Detecta si la receta o sección pertenece al contexto de repostería, pastelería, masas dulces o postres.
 */
export function isPastryOrDessertContext(options?: {
  rolPlato?: string | null;
  titulo?: string | null;
  categorias?: string[] | null;
  momentos?: string[] | null;
  etiquetas?: string[] | null;
  seccion?: string | null;
}): boolean {
  if (!options) return false;
  if ((options.rolPlato || '').trim().toLowerCase() === 'postre') {
    return true;
  }

  const combinedText = [
    options.titulo || '',
    ...(options.categorias || []),
    ...(options.momentos || []),
    ...(options.etiquetas || []),
    options.seccion || '',
  ]
    .join(' ')
    .toLowerCase();

  return /\b(postre|postres|dulce|dulces|reposter[ií]a|pasteler[ií]a|tarta|pastel|bizcocho|galleta|galletas|cookie|cookies|brownie|muffin|cupcake|magdalena|magdalenas|flan|natillas|pudding|crepe|gofre|tortita|tortitas|pancake|pancakes|mug\s*cake|rosc[oó]n|torrija|torrijas|churro|churros|croissant|brioche|hojaldre\s+dulce|helado|mousse|tiramis[uú]|cheesecake|carrot\s*cake|cinnamon\s*roll|glaseado|frosting|merengue|alm[ií]bar|ganache|dessert|pastry|baking|cake|sweet)\b/i.test(
    combinedText
  );
}

/**
 * Extrae el núcleo semántico rector de un ingrediente culinario,
 * eliminando cláusulas adjetivales, privativas, estados físicos y formas de procesado.
 *
 * Ejemplos:
 * - "mantequilla sin sal" -> "mantequilla"
 * - "mantequilla con sal" -> "mantequilla"
 * - "50gr de mantequilla sin sal" -> "mantequilla"
 * - "tomate triturado sin sal" -> "tomate"
 * - "pechuga de pollo en dados" -> "pechuga de pollo"
 * - "leche desnatada" -> "leche"
 * - "sal fina marina" -> "sal"
 * - "pimienta negra molida" -> "pimienta negra"
 */
export function extractCulinarySemanticCore(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';

  let str = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Quitar tildes
    .toLowerCase()
    .trim();

  // 1. Quitar cantidades numéricas y unidades iniciales si vienen en el texto (ej. "50 g de", "50gr de", "2 cdas de")
  str = str.replace(
    /^\s*\d+([.,]\d+)?\s*(gramos?|grams?|grs?|g|kilogramos?|kilos?|kgs?|mg|mililitros?|milliliters?|mls?|ml|litros?|liters?|lts?|lt|l|cucharaditas?|cucharadas?|tbsp|tsp|cditas?|cdas?|tazas?|cups?|vasos?|pizcas?|pinch|unidades?|units?|piezas?|pieces?|dientes?|cloves?|rebanadas?|slices?|latas?|cans?|botes?)\s*(de\s+|del\s+)?/i,
    ''
  );

  // 2. Eliminar cláusulas privativas / calificativas preposicionales
  str = str.replace(/\b(sin|without|no|free\s+of)\s+(sal|salt|sodio|sodium|azucar|sugar|grasa|fat|gluten|lactosa|lactose|aceite|oil)\b/gi, '');
  str = str.replace(/\b(con|with)\s+(sal|salt|azucar|sugar|gluten|lactosa|lactose)\b/gi, '');
  str = str.replace(/\b(bajo|baja|reducido|reducida|low|reduced)\s+en\s+(sal|salt|sodio|sodium|grasa|fat|azucar|sugar)\b/gi, '');
  str = str.replace(/\b(unsalted|salted|fat-free|sugar-free|gluten-free|lactose-free)\b/gi, '');

  // 3. Eliminar modificadores de estado físico, corte, textura y preparación estructural
  str = str.replace(/\b(en\s+dados|en\s+tiras|en\s+cubos|en\s+rodajas|en\s+juliana|en\s+trozos|a\s+trozos)\b/gi, '');
  str = str.replace(/\b(picad[oa]s?|triturad[oa]s?|trocead[oa]s?|cortad[oa]s?|desnatad[oa]s?|semidesnatad[oa]s?|entero|entera|rallad[oa]s?|lavad[oa]s?|limpi[oa]s?|asado|asada|cocido|cocida|frito|frita|crudo|cruda|congelad[oa]s?|fresco|fresca)\b/gi, '');
  str = str.replace(/\b(diced|chopped|minced|sliced|crushed|shredded|skimmed|semi-skimmed|whole|fresh|frozen|roasted|cooked|fried|raw)\b/gi, '');

  // 4. Limpiar preposiciones residuales en bordes y normalizar espacios
  str = str.replace(/^(de|del|en|para)\s+/i, '');
  str = str.replace(/\s+(de|del|en|para)$/i, '');
  str = str.replace(/\s+/g, ' ').trim();

  return str;
}

/**
 * Determina si el ingrediente llega con una masa física o volumen declarado
 * (gramos, mililitros, cucharadas/cucharaditas o conteo discreto),
 * distinguiéndolo de medidas puramente cualitativas ("al gusto", "pizca", "c/n").
 */
export function hasDeclaredPhysicalMassOrVolume(
  cantidad?: number | string | null,
  unidad?: string | null
): boolean {
  const cant = Number(cantidad);
  if (!cant || isNaN(cant) || cant <= 0) return false;

  const u = (unidad || '').toLowerCase().trim();
  if (!u) return false;

  // Si la unidad es cualitativa o "al gusto", no es masa declarada fija
  if (/^(al\s+gusto|a\s+gusto|to\s+taste|pizca|pizcas|pinch|c\/n|c\.n\.|cn)$/i.test(u)) {
    return false;
  }

  // Comprueba si es una unidad física (peso, volumen o conteo discreto)
  return /^(g|gr|grs|gramos?|grams?|kg|kgs?|kilos?|kilogramos?|mg|ml|mls?|mililitros?|milliliters?|l|lt|lts?|litros?|liters?|tazas?|cups?|vasos?|cucharadas?|cucharaditas?|tbsp|tsp|cdas?|cditas?|unidades?|units?|piezas?|pieces?|dientes?|cloves?|rebanadas?|slices?|latas?|cans?|botes?)$/i.test(
    u
  );
}

/**
 * Determina si un ingrediente pertenece a un rol estructural (grasa de cocción,
 * principal, base de sofrito o base líquida), tanto por su rol declarado
 * como por la naturaleza intrínseca de su núcleo semántico.
 */
export function isStructuralCulinaryRole(
  rolCulinario?: string | null,
  nombreLimpio?: string | null,
  nombreCrudo?: string | null
): boolean {
  if (rolCulinario) {
    const r = rolCulinario.toLowerCase().trim();
    if (
      r === 'grasa_coccion' ||
      r === 'principal' ||
      r === 'sofrito_base' ||
      r === 'guarnicion' ||
      r === 'base_liquida'
    ) {
      return true;
    }
  }

  const core = extractCulinarySemanticCore(nombreLimpio || nombreCrudo || '');
  if (!core) return false;

  // Grasas de cocción y emulsiones
  if (/\b(mantequilla|butter|aceite|oil|aove|manteca|lard|ghee)\b/i.test(core)) {
    return true;
  }
  // Proteínas, carbohidratos base y legumbres
  if (
    /\b(pollo|chicken|pavo|turkey|carne|beef|meat|cerdo|pork|ternera|cordero|lamb|conejo|rabbit|pescado|fish|salmon|atun|tuna|merluza|bacalao|tofu|huevo|eggs?|harina|flour|arroz|rice|pasta|fideos|noodles|patata|potato|legumbre|garbanzos?|lentejas?|alubias?|avena|oats?|pan|bread)\b/i.test(
      core
    )
  ) {
    return true;
  }
  // Sofrito y bases aromáticas volumétricas
  if (
    /\b(cebolla|onion|ajo|garlic|puerro|leek|chalota|shallot|zanahoria|carrot|pimiento|pepper|bell\s+pepper)\b/i.test(
      core
    )
  ) {
    return true;
  }
  // Bases líquidas / fluidos
  if (
    /\b(leche|milk|nata|cream|caldo|broth|stock|agua|water|tomate|tomato|vino|wine|cerveza|beer)\b/i.test(
      core
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Determina si un ingrediente es un sazonador puro (especia seca, hierba aromática seca, sal o pimienta).
 *
 * LEY UNIVERSAL DE NÚCLEO RECTOR:
 * - Evalúa exclusivamente el sustantivo núcleo rector del ingrediente, ignorando cláusulas
 *   adjetivales privativas ("sin sal", "con sal") o preparaciones de corte/estado.
 * - Si el ingrediente contiene un macronutriente o alimento estructural (mantequilla, aceite,
 *   pollo, carne, patata, tomate, etc.), NUNCA es un condimento puro.
 * - Las expresiones de sal o condimento sólo aplican cuando son el componente rector del ingrediente.
 */
export function isCanonicalSpiceHerbSaltOrPepper(
  nombreLimpio?: string | null,
  nombreCrudo?: string | null
): boolean {
  const coreLimpio = extractCulinarySemanticCore(nombreLimpio);
  const coreCrudo = extractCulinarySemanticCore(nombreCrudo);
  const core = coreLimpio || coreCrudo;

  if (!core) return false;

  // 1. Exclusión categórica si el núcleo rector contiene alimentos estructurales o macronutrientes
  if (
    /\b(mantequilla|butter|aceite|oil|aove|manteca|ghee|pollo|chicken|carne|beef|meat|cerdo|pork|ternera|pescado|fish|salmon|atun|tuna|merluza|bacalao|arroz|rice|pasta|patata|potato|tomate|tomato|harina|flour|leche|milk|nata|cream|queso|cheese|huevo|eggs?|pan|bread|caldo|broth|legumbre|garbanzos?|lentejas?|alubias?|salsa|pasta\s+de|crema\s+de|fondo|miel|sirope)\b/i.test(
      core
    )
  ) {
    return false;
  }

  // 2. Exclusión de vegetales frescos enteros o formatos de corte (dientes de ajo frescos, manojos)
  if (/\b(diente|dientes|clove|cloves|cabeza\s+de\s+ajo|manojo|ramillete)\b/i.test(core)) {
    return false;
  }

  // 3. Sal pura como componente rector
  const isSaltRector =
    /^(sal|salt)\b/i.test(core) ||
    /\b(flor\s+de\s+sal|sal\s+y\s+pimienta|salt\s+(and|&)\s+pepper|sea\s+salt|kosher\s+salt|pink\s+salt|table\s+salt)\b/i.test(core);

  if (isSaltRector) {
    return true;
  }

  // 4. Pimienta pura como componente rector
  const isPepperRector =
    /^(pimienta|pepper|black\s+pepper|white\s+pepper|cayenne|cayena)\b/i.test(core) ||
    /\b(pimienta\s+negra|pimienta\s+blanca|pimienta\s+molida|pimienta\s+en\s+grano|pimienta\s+verde|pimienta\s+rosa|black\s+pepper|white\s+pepper|cayenne\s+pepper)\b/i.test(core);

  if (isPepperRector) {
    return true;
  }

  // 5. Especias secas y hierbas aromáticas secas puras
  return /\b(oregano|tomillo|thyme|romero|rosemary|laurel|bay\s+leaf|bay\s+leaves|comino|cumin|pimenton|paprika|curcuma|turmeric|curry\s+en\s+polvo|curry\s+powder|polvo\s+de\s+curry|garam\s+masala|ras\s+el\s+hanout|ajo\s+en\s+polvo|garlic\s+powder|ajo\s+granulado|cebolla\s+en\s+polvo|onion\s+powder|jengibre\s+en\s+polvo|ginger\s+powder|jengibre\s+molido|mostaza\s+en\s+polvo|mustard\s+powder|nuez\s+moscada|nutmeg|clavo|clavo\s+de\s+olor|cloves?\s+spice|cardamomo|cardamom|canela|cinnamon|coriandro|semillas\s+de\s+cilantro|estragon|tarragon|mejorana|marjoram|salvia|sage|azafran|saffron|chile\s+en\s+polvo|chili\s+powder|copos\s+de\s+chile|chili\s+flakes|albahaca\s+seca|dried\s+basil|perejil\s+seco|dried\s+parsley|eneldo\s+seco|dried\s+dill|cilantro\s+seco|hierbas\s+provenzales|finas\s+hierbas|especias)\b/i.test(
    core
  );
}

/**
 * Regla Canónica de Especias (Salado vs Repostería) e Invarianza de Masa:
 * - INVARIANZA DE MASA DECLARADA: Todo ingrediente estructural (grasa_coccion, principal, base_liquida)
 *   con masa o volumen definido (50 g de mantequilla, 200 g de pollo, 1 cda de aceite) queda categóricamente protegido:
 *   NUNCA se sobreescribe a 'al gusto' ni a 'invariable'.
 * - Platos salados (entrantes, principales, guarniciones, salsas, guisos):
 *   Toda especia pura, hierba aromática seca, sal y pimienta sin masa estructural se normaliza como:
 *   cantidad: 1, unidad: 'al gusto' (o 'to taste' en EN) y rol_culinario: 'invariable'.
 * - Excepción de Repostería y Postres (rol_plato === 'postre' o contexto de masas dulces/pastelería):
 *   NO se fuerzan las especias o aromatizantes (canela, vainilla, cardamomo, nuez moscada,
 *   jengibre en polvo, clavo, ralladura de cítricos) a 'al gusto', respetando sus medidas exactas
 *   (cucharaditas, gramos) y su rol culinario adecuado ('condimento').
 */
export function normalizarIngredientesExtraidos(
  ingredientes: ExtractedIngredient[],
  options?: {
    idioma?: 'es' | 'en';
    rolPlato?: string | null;
    titulo?: string | null;
    categorias?: string[] | null;
    momentos?: string[] | null;
    etiquetas?: string[] | null;
  }
): ExtractedIngredient[] {
  if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
    return [];
  }

  const idioma = options?.idioma === 'en' ? 'en' : 'es';
  const toTasteLabel = idioma === 'en' ? 'to taste' : 'al gusto';

  const recipeIsPastry = isPastryOrDessertContext({
    rolPlato: options?.rolPlato,
    titulo: options?.titulo,
    categorias: options?.categorias,
    momentos: options?.momentos,
    etiquetas: options?.etiquetas,
  });

  return ingredientes.map((ing) => {
    const sectionIsPastry = isPastryOrDessertContext({ seccion: ing.seccion });
    const isPastry = recipeIsPastry || sectionIsPastry;

    // 1. INVARIANZA DE MASA DECLARADA:
    // Si un ingrediente llega con una masa física o volumen definido (gramos, mililitros, unidades enteras)
    // y pertenece a un rol estructural (grasa_coccion, principal, base_liquida, sofrito_base),
    // queda CATEGÓRICAMENTE PROTEGIDO: NUNCA se sobreescribe a unidad 'al gusto' ni a rol 'invariable'.
    const hasPhysicalMass = hasDeclaredPhysicalMassOrVolume(ing.cantidad, ing.unidad);
    const isStructural = isStructuralCulinaryRole(ing.rol_culinario, ing.nombre_limpio, ing.nombre_crudo);

    if (hasPhysicalMass && isStructural) {
      let rolFinal = ing.rol_culinario;
      if (!rolFinal || rolFinal === 'invariable' || rolFinal === 'condimento') {
        const core = extractCulinarySemanticCore(ing.nombre_limpio || ing.nombre_crudo || '');
        if (/\b(mantequilla|butter|aceite|oil|aove|manteca|ghee)\b/i.test(core)) {
          rolFinal = 'grasa_coccion';
        } else if (/\b(cebolla|onion|ajo|garlic|puerro|leek|chalota|shallot)\b/i.test(core)) {
          rolFinal = 'sofrito_base';
        } else {
          rolFinal = 'principal';
        }
      }

      return {
        ...ing,
        rol_culinario: rolFinal,
      };
    }

    // 2. Si la unidad declarada ya es explícitamente "al gusto" o "pizca", normalizar a invariable
    const uLower = (ing.unidad || '').trim().toLowerCase();
    const isAlreadyToTaste = /^(al\s+gusto|a\s+gusto|to\s+taste|c\/n|c\.n\.|cn)$/i.test(uLower);

    if (isAlreadyToTaste) {
      return {
        ...ing,
        cantidad: 1,
        unidad: toTasteLabel,
        rol_culinario: 'invariable',
      };
    }

    // 3. EXCEPCIÓN DE REPOSTERÍA Y POSTRES:
    // Respetar las medidas exactas (cucharaditas, gramos) de aromatizantes y especias en repostería
    if (isPastry) {
      const cleanText = `${ing.nombre_limpio || ''} ${ing.nombre_crudo || ''}`.toLowerCase();
      const isBakingAromatic =
        /\b(canela|cinnamon|vainilla|vanilla|cardamomo|cardamom|nuez\s+moscada|nutmeg|jengibre|ginger|clavo|clove|an[ií]s|anise|ralladura|zest|azahar|tonka)\b/i.test(
          cleanText
        );
      if (isBakingAromatic && (!ing.rol_culinario || ing.rol_culinario === 'invariable')) {
        return {
          ...ing,
          rol_culinario: 'condimento',
        };
      }
      return ing;
    }

    // 4. PLATOS SALADOS: toda especia pura, hierba aromática seca, sal y pimienta que NO tenga masa estructural
    // se normaliza obligatoriamente como cantidad: 1, unidad: 'al gusto', rol_culinario: 'invariable'
    if (isCanonicalSpiceHerbSaltOrPepper(ing.nombre_limpio, ing.nombre_crudo)) {
      return {
        ...ing,
        cantidad: 1,
        unidad: toTasteLabel,
        rol_culinario: 'invariable',
      };
    }

    return ing;
  });
}
