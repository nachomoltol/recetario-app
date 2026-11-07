'use server';

import { revalidatePath } from 'next/cache';
import { Type } from '@google/genai';
import { createClient, getAdminClient } from '@/lib/supabase/server';
import { getGeminiClient, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODELS } from '@/lib/gemini/client';

export interface GenerateCulinaryLevelInput {
  recetaId: string;
  nivel: 'principiante' | 'avanzado' | 'Principiante' | 'Avanzado';
  titulo: string;
  porciones: number;
  ingredientes: any[];
  pasos: any[];
  idioma?: 'es' | 'en';
}

export interface GeneratedStepLevel {
  orden: number;
  instruccion_nivel: string;
  descriptor_sensorial?: string;
}

export interface GenerateCulinaryLevelResult {
  success: boolean;
  pasos?: any[];
  error?: string;
}

const culinaryLevelSchema = {
  type: Type.OBJECT,
  description: 'Lista de pasos adaptados al nivel culinario solicitado.',
  properties: {
    pasos: {
      type: Type.ARRAY,
      description: 'Pasos de la receta reescritos para el nivel culinario objetivo manteniendo el mismo orden y cantidades.',
      items: {
        type: Type.OBJECT,
        properties: {
          orden: {
            type: Type.INTEGER,
            description: 'Número de orden del paso (1, 2, 3...), idéntico al paso original.',
          },
          instruccion_nivel: {
            type: Type.STRING,
            description: 'Instrucción completa del paso redactada para el nivel culinario solicitado, integrando las cantidades de ingredientes en prosa natural.',
          },
          descriptor_sensorial: {
            type: Type.STRING,
            description: 'Señal visual, olfativa, acústica o de textura concisa que indica cuándo está listo el paso.',
          },
        },
        required: ['orden', 'instruccion_nivel'],
      },
    },
  },
  required: ['pasos'],
};

function buildLevelSystemInstruction(nivel: 'principiante' | 'avanzado', idioma: 'es' | 'en'): string {
  const isEn = idioma === 'en';

  if (nivel === 'principiante') {
    return isEn
      ? `You are a practical, warm, and pedagogical Culinary Instructor.
Your task is to rewrite each step of a recipe specifically for a BEGINNER cook ('principiante').

MANDATORY GUIDELINES FOR BEGINNER LEVEL:
1. Clear, didactic, and approachable tone focused on the actual action of each step without taking kitchen experience for granted.
2. Warn about real, common beginner mistakes relevant to that specific step (e.g., not dropping wet or fridge-cold ingredients into hot oil, how to regulate heat so food doesn't burn outside while staying raw inside, when to stir and when to leave untouched).
3. Explain clear visual, aromatic, or texture cues so the cook knows exactly when the step is ready.
4. Keep the exact ingredient quantities integrated in natural culinary prose.
5. STRICTLY FORBIDDEN to repeat generic prefixes or boilerplate headers at the start of every step (NEVER start steps with "Step-by-step beginner guide:" or repeat the same heat warning on every step).
6. Output strictly in native English.`
      : `Eres un Instructor Culinario práctico, didáctico y cercano.
Tu misión es reescribir cada paso de una receta específicamente para un cocinero de nivel PRINCIPIANTE.

PAUTAS OBLIGATORIAS PARA NIVEL PRINCIPIANTE:
1. Tono didáctico, claro y cercano centrado en la acción real de cada paso, sin dar nada por sentado.
2. Avisa de errores típicos reales aplicables a ese paso concreto (ej. no echar ingredientes húmedos o muy fríos de la nevera a aceite caliente, cómo regular el fuego para que no se arrebate por fuera y quede crudo por dentro, cuándo remover y cuándo dejar quieto para que dore).
3. Explica señales visuales, de aroma o textura sencillas para saber con seguridad cuándo el paso está en su punto.
4. Mantén las cantidades exactas de los ingredientes integradas en prosa culinaria natural.
5. TERMINANTEMENTE PROHIBIDO repetir coletillas genéricas o prefijos idénticos al inicio de cada paso (PROHIBIDO empezar con "Guía paso a paso para principiantes:" o repetir la misma advertencia mecánica en todos los pasos).
6. Redacta íntegramente en español natural.`;
  }

  return isEn
    ? `You are an experienced Head Chef with practical kitchen craft and culinary judgment.
Your task is to rewrite each step of a recipe for an ADVANCED cook ('avanzado').

MANDATORY GUIDELINES FOR ADVANCED LEVEL:
1. Practical, seasoned chef tone with real kitchen craft.
2. Optimize dead time by indicating how to advance parallel tasks (mise en place, reductions, sides, or garnishes while another element roasts, rests, or simmers).
3. Highlight real flavor-building techniques (deglazing pan fond with wine or stock, resting proteins so juices redistribute, emulsifying or mounting sauces off the heat so they stay glossy and don't split, toasting spices briefly before adding liquids).
4. Keep the exact ingredient quantities integrated in natural culinary prose.
5. STRICTLY FORBIDDEN to use ridiculous laboratory or pseudo-scientific jargon (NEVER use terms like "substrate", "lipid fraction", "lipid rendering", "Maillard reaction", "protein denaturation", "colloidal control", "pyro-decantation"). Write like a real chef in a professional kitchen, not a chemistry textbook.
6. Output strictly in native English.`
    : `Eres un Jefe de Cocina práctico con oficio real y criterio gastronómico.
Tu misión es reescribir cada paso de una receta específicamente para un cocinero de nivel AVANZADO.

PAUTAS OBLIGATORIAS PARA NIVEL AVANZADO:
1. Tono de cocinero práctico con criterio de oficio real en cocina.
2. Optimiza tiempos muertos indicando cómo aprovechar esperas o cocciones para avanzar tareas en paralelo (adelantar cortes, reducciones o guarniciones mientras otro elemento dora, hornea o reposa).
3. Aporta técnicas reales que potencian el sabor y la textura (desglasar los jugos tostados del fondo de la sartén con vino o caldo, respetar el reposo de las carnes para asentar jugos, ligar o mantecar salsas fuera del fuego para que emulsionen con brillo sin cortarse, tostar especias unos segundos antes de mojar).
4. Mantén las cantidades exactas de los ingredientes integradas en prosa culinaria natural.
5. TERMINANTEMENTE PROHIBIDO usar jerga ridícula de laboratorio o pseudo-científica (PROHIBIDO usar palabras como "sustrato", "fracción lipídica", "renderizado lipídico", "reacción de Maillard", "desnaturalización proteica", "control coloidal", "pirodecantación"). Habla como un cocinero con oficio, nunca como un manual de química.
6. Redacta íntegramente en español natural.`;
}

export async function generateCulinaryLevelAction(
  input: GenerateCulinaryLevelInput
): Promise<GenerateCulinaryLevelResult> {
  if (!input || !input.recetaId || !Array.isArray(input.pasos) || input.pasos.length === 0) {
    return {
      success: false,
      error: 'Datos de receta insuficientes para generar el nivel culinario.',
    };
  }

  const normalizedNivel: 'principiante' | 'avanzado' =
    (input.nivel || '').toLowerCase().trim() === 'avanzado' ? 'avanzado' : 'principiante';
  const idioma: 'es' | 'en' = input.idioma === 'en' ? 'en' : 'es';

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

    const { data: profile, error: errProfile } = await supabase
      .from('usuarios')
      .select('plan_suscripcion')
      .eq('id', user.id)
      .single();

    const isPro =
      !errProfile &&
      profile &&
      ((profile.plan_suscripcion || '').trim().toLowerCase() === 'pro' ||
        Boolean((profile as any).is_pro));

    if (!isPro) {
      return {
        success: false,
        error: 'PRO_SUBSCRIPTION_REQUIRED',
      };
    }

    const ingredientesTexto = (input.ingredientes || [])
      .map((i) => {
        const cant = i.cantidad ?? '';
        const uni = i.unidad ?? '';
        const nom = i.nombre_limpio || i.nombre_crudo || '';
        return `- ${cant} ${uni} de ${nom}`.trim();
      })
      .join('\n');

    const pasosTexto = input.pasos
      .map((p, idx) => `Paso ${p.orden ?? idx + 1}: ${p.instruccion || ''}`)
      .join('\n');

    const userPrompt = `
RECETA: "${input.titulo}" (${input.porciones || 2} raciones)
NIVEL SOLICITADO: ${normalizedNivel.toUpperCase()}

INGREDIENTES BASE:
${ingredientesTexto || 'Según pasos de la receta'}

PASOS CANÓNICOS ORIGINALES:
${pasosTexto}

Reescribe los ${input.pasos.length} pasos adaptándolos al nivel ${normalizedNivel.toUpperCase()} respetando exactamente el número de orden (1 a ${input.pasos.length}) y las cantidades de los ingredientes.
`.trim();

    const ai = getGeminiClient();
    const candidateModels = [
      PRIMARY_GEMINI_MODEL,
      ...FALLBACK_GEMINI_MODELS.filter((m) => m !== PRIMARY_GEMINI_MODEL),
    ];

    const systemInstruction = buildLevelSystemInstruction(normalizedNivel, idioma);
    let generatedSteps: GeneratedStepLevel[] | null = null;
    let lastError: unknown = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseJsonSchema: culinaryLevelSchema,
            maxOutputTokens: 4096,
          },
        });

        if (!response.text) {
          throw new Error('Respuesta vacía de Gemini al generar nivel culinario.');
        }

        const parsed = JSON.parse(response.text) as { pasos?: GeneratedStepLevel[] };
        if (!parsed.pasos || !Array.isArray(parsed.pasos) || parsed.pasos.length === 0) {
          throw new Error('Formato de pasos inválido devuelto por Gemini.');
        }

        generatedSteps = parsed.pasos;
        break;
      } catch (err) {
        lastError = err;
        console.warn(`[generateCulinaryLevelAction] Intento con modelo '${model}' falló:`, err);
      }
    }

    if (!generatedSteps) {
      throw lastError || new Error('No se pudo generar el nivel culinario con IA.');
    }

    const db = getAdminClient() || supabase;
    const targetColumn =
      normalizedNivel === 'principiante' ? 'instruccion_principiante' : 'instruccion_avanzada';

    const updatedPasos = input.pasos.map((origPaso, idx) => {
      const stepOrder = origPaso.orden ?? idx + 1;
      const matched =
        generatedSteps!.find((g) => Number(g.orden) === Number(stepOrder)) ||
        generatedSteps![idx];

      const textoNivel = matched?.instruccion_nivel?.trim() || origPaso.instruccion;
      const descriptor =
        matched?.descriptor_sensorial?.trim() || origPaso.descriptor_sensorial || null;

      return {
        ...origPaso,
        orden: stepOrder,
        [targetColumn]: textoNivel,
        descriptor_sensorial: descriptor,
      };
    });

    // Persistir cada paso actualizado en public.pasos
    await Promise.all(
      updatedPasos.map(async (paso) => {
        const updatePayload: {
          instruccion_principiante?: string | null;
          instruccion_avanzada?: string | null;
          descriptor_sensorial?: string | null;
        } =
          normalizedNivel === 'principiante'
            ? { instruccion_principiante: paso.instruccion_principiante }
            : { instruccion_avanzada: paso.instruccion_avanzada };

        if (paso.descriptor_sensorial) {
          updatePayload.descriptor_sensorial = paso.descriptor_sensorial;
        }

        if (paso.id) {
          const { error } = await db
            .from('pasos')
            .update(updatePayload)
            .eq('id', paso.id);
          if (!error) return;
        }

        await db
          .from('pasos')
          .update(updatePayload)
          .eq('receta_id', input.recetaId)
          .eq('orden', paso.orden);
      })
    );

    revalidatePath(`/recipes/${input.recetaId}`, 'page');

    return {
      success: true,
      pasos: updatedPasos,
    };
  } catch (error) {
    console.error('[generateCulinaryLevelAction] Error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error inesperado al generar el nivel culinario.',
    };
  }
}
