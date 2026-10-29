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
              'Unidad del ingrediente. PRINCIPIO DE FIDELIDAD A LA UNIDAD DE ENTRADA: Si la fuente original declara explícitamente unidades domésticas tradicionales ("cucharada", "cucharadita", "tbsp", "tsp", "pizca", "al gusto") para ingredientes cuya magnitud cuantitativa sea <= 60, DEBES conservar fielmente dicha unidad original (está estrictamente prohibido degradarlas proactivamente a gramos o ml). Para ingredientes masivos a granel o recipientes ambiguos ("taza", "vaso", "puñado"), convierte a estándar métrico ("g" para sólidos/pastas o "ml" para líquidos). BARRERA DE MAGNITUD (MAX_SPOON_MAGNITUDE = 60): Cualquier ingrediente con cantidad > 60 queda terminantemente bloqueado para unidades de cuchara y debe usar "g" o "ml". REGLA LÓGICA DE PLURALIZACIÓN: si la cantidad es > 1 y la unidad es de piezas enteras, el texto de salida en unidad debe ser estrictamente plural ("units" en inglés, "unidades" en español); si es 1, singular ("unit" en inglés, "unidad" en español). EXCEPCIÓN CULINARIA PARA EL AJO: Para ajo desgranado, la unidad obligatoria DEBE ser "diente" o "dientes" ("clove" o "cloves" en inglés); está PROHIBIDO usar "unidad", "unidades" o "cabeza" a menos que la receta use la cabeza entera asada.',
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
              'Nivel Intermedio (Estándar / Free): Prosa limpia, directa y funcional extraída del vídeo, sin adornos excesivos ni advertencias elementales. OBLIGATORIO: integra las cantidades exactas en prosa culinaria fluida (ej: "Añade media cebolla picada finamente", "Vierte una cucharada de aceite (15 ml)", "Incorpora los 200 g de pechuga de pollo cortada en dados"). Está TERMINANTEMENTE PROHIBIDO redactar números con decimales de laboratorio fríos o antinaturales (NO escribir "añade 0.5 unidades de cebolla" ni "vierte 15ml de aceite"). Las cantidades inyectadas deben coincidir con las porciones escaladas de la receta.',
          },
          instruccion_principiante: {
            type: Type.STRING,
            description:
              'Nivel Principiante (PRO): OBLIGATORIO. Redacción pedagógica paso a paso que NO puede ser idéntica a "instruccion" (Intermedio). Explica con claridad didáctica cómo realizar el paso sin dar nada por sentado, e incluye advertencias explícitas de seguridad térmica (control de salpicaduras, vapor, calor de sartén/horno) y precauciones claras para no quemar ni dejar crudo el alimento. Integra también las cantidades exactas en prosa culinaria natural.',
          },
          instruccion_avanzada: {
            type: Type.STRING,
            description:
              'Versión sintética, profesional y técnica para nivel Avanzado. Emplea terminología culinaria precisa (marcar, reducir, desglasar, emulsionar, pochar) omitiendo explicaciones elementales u obvias.',
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
       - 'invariable': Fixed non-scaling elements (e.g. "to taste", decorative pinch).`
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
       - 'invariable': Cantidades fijas no escalables (ej. "al gusto", "to taste", "pizca de sal al gusto", toques decorativos).`;
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
     * If a recipe does not specify servings, or if secondary quantities are visibly unbalanced:
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
   - CULINARY LEVEL REACTIVITY AND STEP DESCRIPTORS:
     * 'instruccion': Clean, direct, and functional prose extracted from the video for Intermediate (Standard/Free) level, without excessive embellishments or elementary warnings.
     * 'instruccion_principiante': MANDATORY pedagogical step-by-step prose for Beginner (PRO) level. MUST NOT be identical to 'instruccion'. Includes explicit thermal safety warnings and clear precautions to avoid burning or undercooking.
     * 'instruccion_avanzada': Synthetic, professional and technical version for Advanced level (concise phrasing, omitting obvious basic warnings, using professional culinary verbs: sear, deglaze, emulsify, reduce).
     * 'descriptor_sensorial': Visual, aroma, or texture cues designed for a Beginner to know when to pull off or reduce heat without relying solely on a timer (e.g., "until the onion is translucent and fragrant", "until evenly golden with a toasted aroma").
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
     * Si una receta no especifica comensales, o si las cantidades secundarias están visiblemente descompensadas:
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
   - SISTEMA DE NIVELES CULINARIOS Y DESCRIPTORES EN PASOS:
     * 'instruccion': Nivel Intermedio (Estándar / Free). Prosa limpia, directa y funcional extraída del vídeo, sin adornos excesivos ni advertencias elementales.
     * 'instruccion_principiante': Nivel Principiante (PRO). OBLIGATORIO: La redacción NO puede ser idéntica al nivel intermedio. Redacción didáctica paso a paso con advertencias de seguridad térmica y precauciones claras para no quemar ni dejar crudo el alimento.
     * 'instruccion_avanzada': Versión sintética, profesional y técnica para nivel Avanzado (omitiendo explicaciones elementales u obvias, con prosa concisa y profesional: marcar, reducir, desglasar, emulsionar).
     * 'descriptor_sensorial': Pistas visuales, de aroma o textura pensadas para que un cocinero Principiante sepa cuándo retirar o bajar el fuego sin depender solo del reloj (ej: "hasta que la cebolla quede transparente", "hasta que adquiera un tono dorado uniforme y aroma tostado").
     * 'potencia_fuego': Clasifica obligatoriamente la intensidad del fuego: 'suave', 'medio', 'medio-alto', 'alto' u 'horno'.`;

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
}
