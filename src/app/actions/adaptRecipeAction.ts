'use server';

import { createClient } from '@/lib/supabase/server';
import { getGeminiClient, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODELS } from '@/lib/gemini/client';
import { getClinicalExclusions } from '@/lib/clinicalDictionary';
import { Type } from '@google/genai';

export interface AdaptedIngredient {
  nombre_limpio: string;
  cantidad: number;
  unidad: string;
  pasillo_supermercado?: string;
  notas?: string | null;
}

export interface AdaptedStep {
  orden: number;
  instruccion: string;
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
  }[];
  pasos: {
    orden: number;
    instruccion: string;
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
            description: 'Nombre del ingrediente. Si fue sustituido o adaptado, envuélvelo en <mark> (ej: "<mark>Leche de avena</mark>").',
          },
          cantidad: {
            type: Type.NUMBER,
            description: 'Cantidad numérica ajustada.',
          },
          unidad: {
            type: Type.STRING,
            description: 'Unidad métrica estandarizada (g, ml, unidad, unidades).',
          },
          pasillo_supermercado: {
            type: Type.STRING,
            description: 'Pasillo de supermercado.',
          },
          notas: {
            type: Type.STRING,
            description: 'Notas técnicas del ingrediente adaptado.',
          },
        },
        required: ['nombre_limpio', 'cantidad', 'unidad'],
      },
    },
    pasos: {
      type: Type.ARRAY,
      description: 'Lista completa de pasos de preparación reescritos y adaptados. Cuando modifiques un paso para hacerlo apto o más fácil, envuelve el cambio en <mark>...</mark>.',
      items: {
        type: Type.OBJECT,
        properties: {
          orden: {
            type: Type.INTEGER,
            description: 'Orden cronológico del paso.',
          },
          instruccion: {
            type: Type.STRING,
            description: 'Instrucción adaptada. OBLIGATORIO: Cuando menciones un ingrediente sustituido o técnica adaptada, envuélvelo en <mark> (ej: "Añade <mark>la leche de avena</mark>").',
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
        required: ['orden', 'instruccion'],
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
   - Si su nivel es "Principiante", simplifica los pasos técnicos complejos, añade precauciones sobre control de fuego y tiempos.
   - Si su nivel es "Avanzado", optimiza las técnicas, añade matices y consejos pro de alta cocina.

2. ETIQUETADO OBLIGATORIO CON <mark>:
   - IMPORTANTE: Cuando modifiques un ingrediente o cambies un paso para hacerlo más fácil o apto, envuelve esa palabra o frase modificada en una etiqueta <mark> (ejemplo: 'Añade <mark>la leche de avena</mark>').
   - En ingredientes: si el ingrediente fue sustituido o cambiado, envuélvelo en <mark> (ejemplo: "<mark>Bebida de avena</mark>", "<mark>Harina de almendras</mark>").
   - Si un ingrediente o paso no requirió cambios porque ya es 100% apto y perfecto para su nivel, mantenlo tal cual sin <mark>.

3. INYECCIÓN DE CANTIDADES:
   - Inyecta siempre la cantidad exacta en los pasos (ej: "Añade <mark>los 200ml de leche de avena</mark>").
`.trim();

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
        error: 'Debes iniciar sesión para adaptar recetas a tu perfil.',
      };
    }

    // 1. Consultar el perfil culinario del usuario desde Supabase
    const { data: profile, error: errProfile } = await supabase
      .from('usuarios')
      .select('nivel_culinario, preferencias_dieteticas, alergenos')
      .eq('id', user.id)
      .single();

    if (errProfile || !profile) {
      return {
        success: false,
        error: 'No se pudo cargar el perfil del usuario para personalizar la receta.',
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
- Rendimiento: ${receta.porciones} porciones
- Dificultad declarada: ${receta.dificultad}
- Descripción: ${receta.descripcion || 'Sin descripción'}

INGREDIENTES DE LA RECETA:
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
IMPORTANTE: Cuando modifiques un ingrediente o cambies un paso para hacerlo más fácil o apto, envuelve esa palabra o frase modificada en una etiqueta <mark> (ejemplo: 'Añade <mark>la leche de avena</mark>').
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
            maxOutputTokens: 3500,
          },
        });

        if (!response.text) {
          throw new Error('Respuesta vacía de Gemini.');
        }

        const parsedData: AdaptacionCulinaria = JSON.parse(response.text);

        const sanitizedIngredientes = (parsedData.ingredientes || []).map((ing) => {
          let u = (ing.unidad || '').trim();
          const uLower = u.toLowerCase();
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
          return {
            ...ing,
            unidad: u,
          };
        });

        return {
          success: true,
          data: {
            resumen_adaptacion: parsedData.resumen_adaptacion || (idioma === 'en' ? 'Recipe adapted to your profile.' : 'Receta adaptada a tu perfil.'),
            titulo: parsedData.titulo,
            ingredientes: sanitizedIngredientes,
            pasos: parsedData.pasos || [],
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
