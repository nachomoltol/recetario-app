'use server';

import { createClient } from '@/lib/supabase/server';
import { getGeminiClient, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODELS } from '@/lib/gemini/client';
import { getClinicalExclusions } from '@/lib/clinicalDictionary';
import { cleanIngredientName, formatCulinaryAmount } from '@/lib/nutrition/formatQuantity';
import { normalizeSubstituteQuantityAndUnit } from '@/lib/culinary/scaler';
import { Type } from '@google/genai';

export interface AdaptedIngredient {
  nombre_limpio: string;
  cantidad: number;
  unidad: string;
  pasillo_supermercado?: string;
  notas?: string | null;
  rol_culinario?: string | null;
}

export interface AdaptedStep {
  orden: number;
  instruccion_principiante?: string | null;
  instruccion: string;
  instruccion_avanzada?: string | null;
  descriptor_sensorial?: string | null;
  potencia_fuego?: 'suave' | 'medio' | 'medio-alto' | 'alto' | 'horno' | string | null;
  consejo_pro?: string | null;
  tiempo_estimado_min?: number | null;
  temperatura_celsius?: number | null;
}

export interface AdaptacionCulinaria {
  resumen_adaptacion: string;
  titulo?: string;
  ingredientes: AdaptedIngredient[];
  pasos: AdaptedStep[];
}

export interface AdaptRecipeResult {
  success: boolean;
  data?: AdaptacionCulinaria;
  error?: string;
  perfilAplicado?: {
    nivel_culinario: string;
    preferencias_dieteticas: string[];
    alergenos: string[];
  };
}

export interface AdaptRecipeInput {
  recetaId: string;
  titulo: string;
  descripcion?: string | null;
  porciones: number;
  dificultad: string;
  ingredientes: {
    nombre_limpio: string;
    cantidad: number;
    unidad: string;
    pasillo_supermercado?: string;
    rol_culinario?: string | null;
  }[];
  pasos: {
    orden: number;
    instruccion: string;
    instruccion_principiante?: string | null;
    instruccion_avanzada?: string | null;
    descriptor_sensorial?: string | null;
    potencia_fuego?: string | null;
    tiempo_estimado_min?: number | null;
    temperatura_celsius?: number | null;
    consejo_pro?: string | null;
  }[];
  idioma?: 'es' | 'en';
}

const adaptRecipeSchema = {
  type: Type.OBJECT,
  description: 'Reescritura de la receta adaptada al perfil clínico y nivel culinario del usuario con etiquetas <mark>.',
  properties: {
    resumen_adaptacion: {
      type: Type.STRING,
      description: 'Resumen claro (1 a 2 frases) de las adaptaciones realizadas según el perfil de salud y nivel del usuario.',
    },
    titulo: {
      type: Type.STRING,
      description: 'Título de la receta adaptada.',
    },
    ingredientes: {
      type: Type.ARRAY,
      description: 'Lista completa de ingredientes adaptados. Si un ingrediente fue modificado o sustituido, envuelve el cambio en etiquetas <mark>...</mark>.',
      items: {
        type: Type.OBJECT,
        properties: {
          nombre_limpio: {
            type: Type.STRING,
            description: 'Nombre canónico del ingrediente LIMPIO (ej: "Tofu firme prensado", "Tomate cherry"). ESTRICTAMENTE PROHIBIDO incluir cantidades ("600 g", "300 g") ni unidades dentro de nombre_limpio, ya que las cantidades van exclusivamente en el campo "cantidad". Si fue sustituido o adaptado, envuélvelo en <mark> (ej: "<mark>Tofu firme prensado</mark>").',
          },
          cantidad: {
            type: Type.NUMBER,
            description: 'Cantidad numérica ajustada calculada para las porciones base de la receta.',
          },
          unidad: {
            type: Type.STRING,
            description:
              'Unidad culinaria normalizada coherente con la lista original (g, ml, cucharada, cucharadas, cucharadita, cucharaditas, taza, tazas, pizca, al gusto, unidad, unidades). Si cambias de unidad entre cucharas/tazas y ml/g, aplica la conversión matemática real (1 cda = 15 ml, 1 cdita = 5 ml, 1 taza = 240 ml) respetando MAX_SPOON_MAGNITUDE <= 60.',
          },
          pasillo_supermercado: {
            type: Type.STRING,
            description: 'Pasillo de supermercado.',
          },
          notas: {
            type: Type.STRING,
            description: 'Notas técnicas del ingrediente adaptado.',
          },
          rol_culinario: {
            type: Type.STRING,
            description: 'Rol culinario funcional: principal, sofrito_base, guarnicion, grasa_coccion, condimento, invariable.',
            enum: ['principal', 'sofrito_base', 'guarnicion', 'grasa_coccion', 'condimento', 'invariable'],
          },
        },
        required: ['nombre_limpio', 'cantidad', 'unidad'],
      },
    },
    pasos: {
      type: Type.ARRAY,
      description: 'Lista completa de pasos de preparación reescritos y adaptados preservando los 3 niveles pedagógicos. Cuando modifiques un paso para hacerlo apto o más fácil, envuelve el cambio en <mark>...</mark>.',
      items: {
        type: Type.OBJECT,
        properties: {
          orden: {
            type: Type.INTEGER,
            description: 'Orden cronológico del paso.',
          },
          instruccion_principiante: {
            type: Type.STRING,
            description:
              'Nivel Principiante (PRO): Relato pedagógico paso a paso adaptado al perfil clínico (NO idéntico a instruccion). Incluye explicaciones guiadas y advertencias de seguridad térmica. Envuelve ingredientes sustituidos en <mark>...</mark>.',
          },
          instruccion: {
            type: Type.STRING,
            description:
              'Nivel Intermedio: Instrucción adaptada equilibrada y directa. OBLIGATORIO: Cuando menciones un ingrediente sustituido o técnica adaptada, envuélvelo en <mark> (ej: "Añade <mark>la leche de avena</mark>").',
          },
          instruccion_avanzada: {
            type: Type.STRING,
            description:
              'Nivel Avanzado (PRO): TERMINANTEMENTE PROHIBIDO clonar los pasos del nivel intermedio con sinónimos cosméticos. Agrupa acciones en bloques de ejecución técnica simultánea y aplica fundamentos físico-químicos (extracción de grasa, control de almidones para ligazón/mantecatura, reacción de Maillard y emulsiones mecánicas fuera del fuego). Envuelve ingredientes sustituidos en <mark>...</mark>.',
          },
          descriptor_sensorial: {
            type: Type.STRING,
            description:
              'Tarjeta sensorial adaptada (cambios de color, textura y aroma clave para saber cuándo avanzar al siguiente paso sin quemar ni dejar crudo el alimento).',
          },
          potencia_fuego: {
            type: Type.STRING,
            enum: ['suave', 'medio', 'medio-alto', 'alto', 'horno'],
            description: 'Potencia del fuego o calor requerida en el paso: suave, medio, medio-alto, alto u horno.',
          },
          consejo_pro: {
            type: Type.STRING,
            description: 'Consejo técnico adaptado al nivel culinario.',
          },
          tiempo_estimado_min: {
            type: Type.INTEGER,
            description: 'Minutos estimados.',
          },
          temperatura_celsius: {
            type: Type.INTEGER,
            description: 'Temperatura en grados centígrados.',
          },
        },
        required: [
          'orden',
          'instruccion_principiante',
          'instruccion',
          'instruccion_avanzada',
          'descriptor_sensorial',
          'potencia_fuego',
          'consejo_pro',
          'tiempo_estimado_min',
          'temperatura_celsius',
        ],
      },
    },
  },
  required: ['resumen_adaptacion', 'ingredientes', 'pasos'],
};

const SYSTEM_INSTRUCTION_ADAPT = `
Eres un Chef Consultor de Alta Cocina y Nutricionista Clínico experto en dietética personalizada.
Tu misión es recibir una receta y REESCRIBIR SU JSON para adaptarla de forma IN-LINE al perfil clínico (alérgenos, intolerancias, dieta) y nivel culinario (Principiante, Intermedio, Avanzado) del usuario.

DIRECTIVAS ESTRICTAS DE ADAPTACIÓN:
1. REESCRITURA DIRECTA DE INGREDIENTES Y PASOS:
   - Reescribe el JSON de esta receta.
   - Adapta los ingredientes y los pasos de preparación basándote estrictamente en el nivel culinario y las intolerancias del usuario.
   - Si el usuario tiene celiaquía o intolerancia al gluten, sustituye cualquier harina, salsa o pasta con gluten por una alternativa adecuada (ej. harina de avena sin gluten, tamari, pasta de maíz o arroz).
   - Si no tolera la lactosa, sustituye leche, natas o mantequillas por bebidas vegetales o versiones sin lactosa.
   - Si es vegetariano/vegano, sustituye carnes o pescados por legumbres, tofu o proteínas vegetales coherentes con la receta.
   - Si su nivel es "Principiante", redacción pedagógica paso a paso con el "por qué" de la técnica, advertencias de seguridad física y señales sensoriales explícitas.
   - Si su nivel es "Intermedio", guía estándar paso a paso para cocina doméstica eficiente con tiempos y temperaturas claras.
   - Si su nivel es "Avanzado", PROHIBIDO clonar pasos intermedios con meros sinónimos ("trocear" -> "brunoise", "aceite" -> "EVOO"). Agrupa en bloques de ejecución simultánea (mise en place en paralelo) y fundamenta en principios físico-químicos (renderizado de grasa, control de almidones para mantecatura, caramelización de azúcares y emulsiones fuera del fuego).

2. ETIQUETADO OBLIGATORIO CON <mark>:
   - IMPORTANTE: Cuando modifiques un ingrediente o cambies un paso para hacerlo más fácil o apto, envuelve esa palabra o frase modificada en una etiqueta <mark> (ejemplo: 'Añade <mark>la leche de avena</mark>').
   - En ingredientes: si el ingrediente fue sustituido o cambiado, envuélvelo en <mark> (ejemplo: "<mark>Bebida de avena</mark>", "<mark>Harina de almendras</mark>").
   - Si un ingrediente o paso no requirió cambios porque ya es 100% apto y perfecto para su nivel, mantenlo tal cual sin <mark>.

3. FIDELIDAD ESTRICTA A UNIDADES Y CANTIDADES DE LA LISTA EN LOS PASOS:
   - Cuando menciones un ingrediente en la instrucción de un paso, DEBES UTILIZAR ESTRICTAMENTE LA MISMA UNIDAD Y CANTIDAD que figura en la lista de ingredientes adaptados.
   - PROHIBICIÓN DE GRAMAJES EN CUCHARAS/TAZAS: Si un ingrediente está medido en cucharadas, cucharaditas, tazas o vasos (ej: "1 ½ cucharadas Polvo de curry"), está TERMINANTEMENTE PROHIBIDO convertirlo a gramos fríos de báscula (NUNCA escribir "25 g de curry"); redacta exactamente con la unidad de la lista: "Añade <mark>1 ½ cucharadas de polvo de curry</mark>".
   - PROHIBICIÓN TOTAL DE GRAMAJES EN INVARIABLES, PIZCAS Y AL GUSTO: Si un ingrediente tiene unidad "pizca", "al gusto", "to taste" o rol culinario "invariable" (ej: perejil fresco, cilantro, especias decorativas, sal al gusto), queda TERMINANTEMENTE PROHIBIDO inventar gramos de báscula (NUNCA escribir "8 g de perejil", ni "5 g de sal"). Redacta siempre en prosa cualitativa natural: "una pizca de perejil fresco picado", "perejil fresco al gusto" o "decora con <mark>perejil fresco picado al gusto</mark>".
   - PROHIBIDO DECIMALES DE LABORATORIO: Inyecta cantidades con prosa natural y fluida (ej: "Añade <mark>los 200 ml de leche de avena</mark>", "Incorpora <mark>media cebolla picada</mark>"). NO escribir decimales fríos de laboratorio (NO escribir "0.5 unidades de cebolla").

4. NOMBRE CANÓNICO LIMPIO EN INGREDIENTES (CRÍTICO):
   - El campo 'nombre_limpio' DEBE contener EXCLUSIVAMENTE el nombre culinario limpio del ingrediente (ej: "Tofu firme prensado", "Tomate cherry", "<mark>Bebida de avena</mark>").
   - Queda TERMINANTEMENTE PROHIBIDO incluir cantidades numéricas o unidades métricas dentro de 'nombre_limpio' (NUNCA escribir "600 g de tofu", ni "300 g de Tomate cherry", ni "40 g de cebollino", ni "10 ml de aceite"). Las cantidades se informan única y exclusivamente en el campo 'cantidad' y las unidades en 'unidad'.
`.trim();


const STOP_WORDS_MIN = new Set([
  'fresco', 'fresca', 'frescos', 'frescas', 'fresh',
  'picado', 'picada', 'picados', 'picadas', 'chopped', 'diced',
  'molido', 'molida', 'ground', 'polvo', 'powder',
]);

/**
 * Sanitiza defensivamente la prosa de los pasos adaptados generados por Gemini:
 * 1. Si un ingrediente tiene unidad 'pizca', 'al gusto' o rol 'invariable', erradica cualquier
 *    gramaje o mililitro inventado (ej. "los 8 g de perejil fresco picado" -> "una pizca de perejil fresco picado").
 * 2. Si un ingrediente tiene unidad de cuchara o taza ('cucharadas', 'cucharaditas', 'taza'), erradica
 *    gramajes fríos inventados y restaura la unidad de cuchara/taza de la lista (ej. "los 25 g de curry" -> "1 ½ cucharadas de polvo de curry").
 */
function sanitizeAdaptedStepsProse(
  pasos: AdaptedStep[],
  ingredientes: AdaptedIngredient[],
  lang: 'es' | 'en' = 'es',
  originalIngredientes?: { nombre_limpio: string; cantidad: number; unidad: string }[],
  exclusionesClinicas?: string[]
): AdaptedStep[] {
  if (!pasos || pasos.length === 0 || !ingredientes || ingredientes.length === 0) {
    return pasos || [];
  }

  return pasos.map((paso) => {
    let instruccion = paso.instruccion || '';
    let instruccionPrincipiante = paso.instruccion_principiante || null;
    let instruccionAvanzada = paso.instruccion_avanzada || null;
    let descriptorSensorial = paso.descriptor_sensorial || null;
    let consejo = paso.consejo_pro || null;

    // 0. Si hubo sustitución de un ingrediente excluido clínicamente, asegurar limpieza también en instruccion_principiante, instruccion_avanzada y descriptor_sensorial
    if (originalIngredientes && originalIngredientes.length > 0) {
      originalIngredientes.forEach((origIng, idx) => {
        const adaptedIng = ingredientes[idx];
        if (!origIng || !adaptedIng) return;
        const origClean = (origIng.nombre_limpio || '').replace(/<\/?[^>]+(>|$)/g, '').trim();
        const adaptedClean = (adaptedIng.nombre_limpio || '').replace(/<\/?[^>]+(>|$)/g, '').trim();
        if (!origClean || !adaptedClean || origClean.toLowerCase() === adaptedClean.toLowerCase()) return;

        const isExcluded =
          !exclusionesClinicas ||
          exclusionesClinicas.length === 0 ||
          exclusionesClinicas.some(
            (ex) =>
              origClean.toLowerCase().includes(ex.toLowerCase()) ||
              ex.toLowerCase().includes(origClean.toLowerCase())
          );

        if (isExcluded && origClean.length >= 3) {
          const escapedOrig = origClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const exRegex = new RegExp(`\\b${escapedOrig}\\b`, 'gi');
          if (instruccionPrincipiante) {
            instruccionPrincipiante = instruccionPrincipiante.replace(exRegex, `<mark>${adaptedClean}</mark>`);
          }
          if (instruccionAvanzada) {
            instruccionAvanzada = instruccionAvanzada.replace(exRegex, `<mark>${adaptedClean}</mark>`);
          }
          if (descriptorSensorial) {
            descriptorSensorial = descriptorSensorial.replace(exRegex, adaptedClean);
          }
        }
      });
    }

    for (const ing of ingredientes) {
      const rawName = (ing.nombre_limpio || '').replace(/<\/?[^>]+(>|$)/g, '').trim();
      if (!rawName || rawName.length < 3) continue;

      const isPinch = /^(pizca|pizcas|pinch|pinches)$/i.test((ing.unidad || '').trim());
      const isToTaste = /^(al gusto|a gusto|to taste|c\/n|c\.n\.|cn)$/i.test((ing.unidad || '').trim());
      const isStructuralSweetOrDough = /\b(azucar|azúcar|sugar|panela|miel|honey|sirope|syrup|harina|flour)\b/i.test(rawName);
      const hasRealMetric =
        !isPinch &&
        !isToTaste &&
        Boolean(ing.unidad) &&
        /^(g|gr|grs|gramos?|grams?|ml|mls|mililitros?|milliliters?|kg|kgs|kilos?|l|lt|litros?|tbsp|tsp|cucharadas?|cucharaditas?|taza|tazas|cup|cups)$/i.test(
          (ing.unidad || '').trim()
        );

      const isInvariable = !hasRealMetric && !isStructuralSweetOrDough && (ing.rol_culinario === 'invariable' || isPinch || isToTaste);

      const isSpoonOrCup = /^(cucharada|cucharadas|cucharadita|cucharaditas|tbsp|tsp|taza|tazas|cup|cups)$/i.test(
        (ing.unidad || '').trim()
      );

      if (!isInvariable && !isSpoonOrCup) continue;

      // Variantes del ingrediente (nombre completo y sustantivos significativos de longitud >= 4)
      const nameParts = rawName
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !STOP_WORDS_MIN.has(w));
      const searchNames = [rawName.toLowerCase(), ...nameParts];
      const uniqueNames = Array.from(new Set(searchNames)).sort((a, b) => b.length - a.length);
      const escapedAlts = uniqueNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

      const patternSpuriousMetric = new RegExp(
        `(^|\\s+|(?<=[^\\p{L}\\p{N}@]))` +
        `(?:(<mark>)\\s*)?` +
        `(?:(los|las|el|la|unos|unas|the|a|an)\\s+)?` +
        `(?:(<mark>)\\s*)?` +
        `(\\d+(?:[.,]\\d+)?|[½¼¾⅓⅔⅛]|\\d+\\/\\d+)\\s*` +
        `(g|gr|grs|gramos?|grams?|ml|mls|mililitros?|milliliters?|kg|kgs|kilos?|l|lt|litros?)\\s+` +
        `(?:(?:de|of)\\s+)?` +
        `(<mark>)?(${escapedAlts})` +
        `(<\\/mark>)?`,
        'gui'
      );

      const replaceFn = (
        _m: string,
        pSpace?: string,
        openMPre?: string,
        art?: string,
        openMNum?: string,
        _num?: string,
        _u?: string,
        openMIng?: string,
        ingWord?: string,
        closeM?: string
      ) => {
        const space = pSpace || '';
        const oM = (openMPre || openMNum || openMIng) ? '<mark>' : '';
        const cM = closeM ? '</mark>' : '';
        const matchedWord = ingWord || rawName;

        if (isInvariable) {
          const naturalPhrase = isToTaste
            ? (lang === 'en' ? `${matchedWord} to taste` : `${matchedWord} al gusto`)
            : (lang === 'en' ? `a pinch of ${matchedWord}` : `una pizca de ${matchedWord}`);
          return `${space}${oM}${naturalPhrase}${cM}`;
        }

        // isSpoonOrCup
        const formattedAmountAndUnit = formatCulinaryAmount(ing.cantidad, ing.unidad, lang, rawName);
        const isFem = /^(cucharada|cucharadas|cucharadita|cucharaditas|taza|tazas)$/i.test(ing.unidad || '');
        const artWord = art ? (ing.cantidad > 1 ? (isFem ? 'las ' : 'los ') : (isFem ? 'la ' : 'el ')) : '';
        return `${space}${artWord}${oM}${formattedAmountAndUnit} de ${matchedWord}${cM}`;
      };

      instruccion = instruccion.replace(patternSpuriousMetric, replaceFn);
      if (instruccionPrincipiante) {
        instruccionPrincipiante = instruccionPrincipiante.replace(patternSpuriousMetric, replaceFn);
      }
      if (instruccionAvanzada) {
        instruccionAvanzada = instruccionAvanzada.replace(patternSpuriousMetric, replaceFn);
      }
      if (descriptorSensorial) {
        descriptorSensorial = descriptorSensorial.replace(patternSpuriousMetric, replaceFn);
      }
      if (consejo) {
        consejo = consejo.replace(patternSpuriousMetric, replaceFn);
      }
    }

    return {
      ...paso,
      instruccion_principiante: instruccionPrincipiante,
      instruccion,
      instruccion_avanzada: instruccionAvanzada,
      descriptor_sensorial: descriptorSensorial,
      consejo_pro: consejo,
    };
  });
}

/**
 * Server Action Culinario de Adaptación In-Line:
 * Reescribe el JSON de la receta con adaptaciones integradas y etiquetas <mark>.
 */
export async function adaptRecipeAction(
  receta: AdaptRecipeInput
): Promise<AdaptRecipeResult> {
  if (!receta || !receta.recetaId || !receta.titulo) {
    return {
      success: false,
      error: 'Se requiere la receta completa para generar la adaptación.',
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'PRO_SUBSCRIPTION_REQUIRED',
      };
    }

    // 1. Consultar el perfil culinario y plan de suscripción del usuario desde Supabase
    const { data: profile, error: errProfile } = await supabase
      .from('usuarios')
      .select('plan_suscripcion, nivel_culinario, preferencias_dieteticas, alergenos')
      .eq('id', user.id)
      .single();

    if (errProfile || !profile) {
      return {
        success: false,
        error: 'No se pudo cargar el perfil del usuario para personalizar la receta.',
      };
    }

    if ((profile?.plan_suscripcion || '').trim().toLowerCase() !== 'pro') {
      return {
        success: false,
        error: 'PRO_SUBSCRIPTION_REQUIRED',
      };
    }

    const nivelCulinario = profile.nivel_culinario || 'Principiante';
    const preferenciasDieteticas = profile.preferencias_dieteticas || [];
    const alergenos = profile.alergenos || [];

    // Validar si el usuario tiene alguna preferencia o nivel específico
    const tieneRestricciones =
      preferenciasDieteticas.length > 0 ||
      alergenos.length > 0 ||
      nivelCulinario === 'Principiante' ||
      nivelCulinario === 'Avanzado';

    if (!tieneRestricciones) {
      return {
        success: false,
        error:
          'No tienes configuradas preferencias dietéticas ni un nivel específico (Principiante o Avanzado) en tu perfil.',
      };
    }

    // Calcular cortafuegos clínico cruzado
    const exclusionesClinicas = getClinicalExclusions({
      preferencias: preferenciasDieteticas,
      alergenos,
    });

    const idioma = receta.idioma || 'es';
    const langName = idioma === 'en' ? 'English' : 'Spanish';
    const firewallDirective =
      exclusionesClinicas.length > 0
        ? `\nCORTAFUEGOS CLÍNICO ACTIVO:
ESTRICTAMENTE PROHIBIDO sugerir los siguientes ingredientes: [${exclusionesClinicas.join(
            ', '
          )}].
Cualquier ingrediente prohibido debe ser sustituido obligatoriamente por una alternativa apta y equivalente.`
        : '';

    // 2. Construir prompt para Gemini
    const langDirective =
      idioma === 'en'
        ? `GESTIÓN DINÁMICA DE IDIOMA Y DIRECTIVA ANTI-SPANGLISH (VITAL):
ADVERTENCIA CRÍTICA DE IDIOMA: Si el idioma solicitado es Inglés ('en'), estás ESTRICTAMENTE PROHIBIDO de usar la palabra 'unidades', 'cucharadas', 'gramos' en español. Debes usar sus equivalentes en inglés ('units/pieces', 'tbsp/tsp', 'grams'). Las etiquetas de dificultad ('Fácil', 'Principiante') DEBEN traducirse al inglés ('Easy', 'Beginner'). TODO EL JSON DEBE SER INGLÉS NATIVO. NUNCA mezcles idiomas.`
        : `GESTIÓN DINÁMICA DE IDIOMA (VITAL):
Traduce el texto original y redacta el JSON de la receta adaptada estrictamente en Spanish. NUNCA mezcles idiomas.`;

    const userPrompt = `
Eres un Chef Consultor de Élite y Nutricionista Clínico. Tu misión es adaptar integralmente una receta al perfil dietético y nivel de un usuario.

PERFIL DEL USUARIO:
- Nivel culinario del usuario: ${nivelCulinario}
- Preferencias y estilos de alimentación: ${
      preferenciasDieteticas.length > 0
        ? preferenciasDieteticas.join(', ')
        : 'Ninguno especificado'
    }
- Alérgenos e intolerancias médicas: ${
      alergenos.length > 0 ? alergenos.join(', ') : 'Ninguno especificado'
    }
${firewallDirective}

${langDirective}

RECETA ORIGINAL A ADAPTAR:
- Título: "${receta.titulo}"
- Rendimiento: ${receta.porciones} porciones base
- Dificultad declarada: ${receta.dificultad}
- Descripción: ${receta.descripcion || 'Sin descripción'}

INGREDIENTES DE LA RECETA (para el rendimiento base de ${receta.porciones} porciones):
${receta.ingredientes
  .map(
    (i) =>
      `- ${i.cantidad} ${i.unidad} de ${i.nombre_limpio}${
        i.pasillo_supermercado ? ` [Pasillo: ${i.pasillo_supermercado}]` : ''
      }`
  )
  .join('\n')}

PASOS DE LA RECETA:
${receta.pasos
  .map(
    (p) =>
      `Paso ${p.orden}: ${p.instruccion}${
        p.consejo_pro ? ` (Nota: ${p.consejo_pro})` : ''
      }`
  )
  .join('\n')}

INSTRUCCIONES CLAVE:
Reescribe el JSON de esta receta. Adapta los ingredientes y los pasos de preparación basándote estrictamente en el nivel culinario y las intolerancias del usuario.
- PROHIBIDO PREFIJOS EN INGREDIENTES: El campo 'nombre_limpio' de cada ingrediente debe contener ÚNICAMENTE el nombre culinario limpio (ej: "<mark>Tofu firme prensado</mark>", "<mark>Parte verde de cebollino picado</mark>", "Tomate cherry"). NUNCA incluyas la cantidad ni la unidad métrica dentro de 'nombre_limpio' (NO "600 g de tofu", NO "300 g de tomate").
- RENDIMIENTO BASE: Todas las cantidades numéricas adaptadas deben calcularse para las ${receta.porciones} porciones base de la receta.
- FIDELIDAD A UNIDADES DE LA LISTA: Si un ingrediente usa cucharadas o tazas (ej: "1 ½ cucharadas de Polvo de curry"), NO lo conviertas a gramos ("25 g"). Mantén la unidad de cuchara en los pasos y en los ingredientes.
- PROHIBIDO GRAMOS EN PIZCAS/AL GUSTO: Para ingredientes con unidad "pizca", "al gusto" o rol "invariable" (ej: perejil fresco), NUNCA inventes gramos ("8 g de perejil"). Escribe "una pizca de..." o "...al gusto".
- ETIQUETADO <mark>: Cuando modifiques un ingrediente o cambies un paso para hacerlo más fácil o apto, envuelve esa palabra o frase modificada en una etiqueta <mark> (ejemplo: 'Añade <mark>la leche de avena</mark>').
`.trim();

    // 3. Ejecutar inferencia en Gemini
    const ai = getGeminiClient();
    const candidateModels = [PRIMARY_GEMINI_MODEL, ...FALLBACK_GEMINI_MODELS];
    let lastError: unknown = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION_ADAPT,
            responseMimeType: 'application/json',
            responseJsonSchema: adaptRecipeSchema,
            maxOutputTokens: 8192,
          },
        });

        if (!response.text) {
          throw new Error('Respuesta vacía de Gemini.');
        }

        const parsedData: AdaptacionCulinaria = JSON.parse(response.text);

        const sanitizedIngredientes = (parsedData.ingredientes || []).map((ing, idx) => {
          let u = (ing.unidad || '').trim();
          const uLower = u.toLowerCase();
          const origIng = (receta.ingredientes || [])[idx];

          if (
            uLower === 'unidad' ||
            uLower === 'unidades' ||
            uLower === 'unit' ||
            uLower === 'units' ||
            uLower === 'piece' ||
            uLower === 'pieces'
          ) {
            u = idioma === 'en' ? (Number(ing.cantidad) > 1 ? 'units' : 'unit') : (Number(ing.cantidad) > 1 ? 'unidades' : 'unidad');
          } else if (idioma === 'en') {
            if (uLower === 'cucharada' || uLower === 'cucharadas') u = 'tbsp';
            else if (uLower === 'cucharadita' || uLower === 'cucharaditas') u = 'tsp';
            else if (uLower === 'gramo' || uLower === 'gramos') u = 'g';
            else if (uLower === 'mililitro' || uLower === 'mililitros') u = 'ml';
          }

          // Saneado defensivo del nombre para erradicar cualquier cantidad métrica residual
          const cleanNombre = cleanIngredientName(ing.nombre_limpio);
          const rawRolCulinario = ing.rol_culinario || origIng?.rol_culinario || null;

          // Conversión volumétrica real entre cucharas/tazas y ml/g (1 cda = 15 ml, 1 cdita = 5 ml, 1 taza = 240 ml, MAX_SPOON_MAGNITUDE <= 60)
          const normalized = normalizeSubstituteQuantityAndUnit(
            origIng?.nombre_limpio || cleanNombre,
            cleanNombre.replace(/<\/?[^>]+(>|$)/g, ''),
            Number(ing.cantidad) || 1,
            u,
            rawRolCulinario,
            origIng?.unidad || null,
            origIng?.cantidad ?? null
          );

          return {
            ...ing,
            nombre_limpio: cleanNombre,
            cantidad: normalized.cantidad,
            unidad: normalized.unidad,
            rol_culinario: normalized.rol_culinario || rawRolCulinario,
          };
        });

        // Saneado defensivo del texto de los pasos (incluidos los 3 niveles pedagógicos y descriptor sensorial)
        const sanitizedPasos = sanitizeAdaptedStepsProse(
          parsedData.pasos || [],
          sanitizedIngredientes,
          idioma,
          receta.ingredientes,
          exclusionesClinicas
        );

        return {
          success: true,
          data: {
            resumen_adaptacion: parsedData.resumen_adaptacion || (idioma === 'en' ? 'Recipe adapted to your profile.' : 'Receta adaptada a tu perfil.'),
            titulo: parsedData.titulo,
            ingredientes: sanitizedIngredientes,
            pasos: sanitizedPasos,
          },
          perfilAplicado: {
            nivel_culinario: nivelCulinario,
            preferencias_dieteticas: preferenciasDieteticas,
            alergenos,
          },
        };
      } catch (err) {
        lastError = err;
        console.warn(`Intento de adaptación in-line con modelo '${model}' falló:`, err);
      }
    }

    throw lastError || new Error('No se pudo generar la adaptación culinaria.');
  } catch (error) {
    console.error('Error en adaptRecipeAction:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado al adaptar la receta con IA.',
    };
  }
}
