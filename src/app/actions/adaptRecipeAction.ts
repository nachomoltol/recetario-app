'use server';

import { createClient } from '@/lib/supabase/server';
import { getGeminiClient, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODELS } from '@/lib/gemini/client';
import { Type } from '@google/genai';

export interface SustitucionSugerida {
  ingrediente_original: string;
  alternativa_sugerida: string;
  cantidad_o_ratio: string;
  motivo_clinico_o_dietetico: string;
  instrucciones_uso: string;
}

export interface TipTecnico {
  paso_o_fase: string;
  consejo: string;
  enfoque: 'principiante' | 'avanzado' | 'general';
}

export interface AdaptacionCulinaria {
  resumen_adaptacion: string;
  sustituciones_sugeridas: SustitucionSugerida[];
  tips_tecnicos: TipTecnico[];
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
}

const adaptRecipeSchema = {
  type: Type.OBJECT,
  description: 'Adaptación culinaria no destructiva basada en el perfil clínico y nivel del usuario.',
  properties: {
    resumen_adaptacion: {
      type: Type.STRING,
      description: 'Resumen claro y motivador (1 a 2 frases) de las adaptaciones realizadas según el perfil.',
    },
    sustituciones_sugeridas: {
      type: Type.ARRAY,
      description: 'Array de sustituciones necesarias o recomendadas para cumplir con las alergias o dieta del usuario.',
      items: {
        type: Type.OBJECT,
        properties: {
          ingrediente_original: {
            type: Type.STRING,
            description: 'Nombre del ingrediente original presente en la receta que debe ser sustituido.',
          },
          alternativa_sugerida: {
            type: Type.STRING,
            description: 'Alternativa segura, sabrosa y nutricionalmente equivalente.',
          },
          cantidad_o_ratio: {
            type: Type.STRING,
            description: 'Proporción o cantidad recomendada (ej: "1:1 misma cantidad", "150g en lugar de 200g").',
          },
          motivo_clinico_o_dietetico: {
            type: Type.STRING,
            description: 'Justificación médica, clínica o dietética (ej: "Elimina el gluten manteniendo la textura").',
          },
          instrucciones_uso: {
            type: Type.STRING,
            description: 'Recomendación técnica sobre cómo integrarlo en el cocinado.',
          },
        },
        required: [
          'ingrediente_original',
          'alternativa_sugerida',
          'cantidad_o_ratio',
          'motivo_clinico_o_dietetico',
          'instrucciones_uso',
        ],
      },
    },
    tips_tecnicos: {
      type: Type.ARRAY,
      description: 'Consejos técnicos personalizados según el nivel del usuario (ampliados para principiantes, atajos y optimizaciones para avanzados).',
      items: {
        type: Type.OBJECT,
        properties: {
          paso_o_fase: {
            type: Type.STRING,
            description: 'Fase o paso donde aplica el consejo (ej: "Paso 1: Sofrito", "Cocción y fuego").',
          },
          consejo: {
            type: Type.STRING,
            description: 'Consejo técnico concreto, accionable y didáctico.',
          },
          enfoque: {
            type: Type.STRING,
            enum: ['principiante', 'avanzado', 'general'],
            description: 'Nivel técnico al que va dirigido el consejo.',
          },
        },
        required: ['paso_o_fase', 'consejo', 'enfoque'],
      },
    },
  },
  required: ['resumen_adaptacion', 'sustituciones_sugeridas', 'tips_tecnicos'],
};

const SYSTEM_INSTRUCTION_ADAPT = `
Eres un Chef Consultor de Alta Cocina y Nutricionista Clínico experto en dietética personalizada.
Tu misión es generar una ADAPTACIÓN CULINARIA NO DESTRUCTIVA de una receta específica para un usuario concreto, respetando estrictamente su perfil de salud y nivel técnico.

REGLAS DE ORO:
1. SEGURIDAD Y DIETÉTICA (CAPA CLÍNICA):
   - Analiza con rigor clínico todos los ingredientes de la receta contra las preferencias y alérgenos del usuario:
     * Sin gluten / Celiaquía: Detecta harinas de trigo, cebada, centeno, salsa de soja tradicional, pan rallado, etc.
     * Sin lactosa: Detecta leche de vaca, nata, mantequilla, quesos con lactosa.
     * Vegetariano / Vegano: Detecta carnes, aves, pescados, mariscos, gelatinas animales, manteca, caldos de carne.
     * Sin frutos secos: Detecta nueces, almendras, avellanas, piñones, cacahuetes.
     * Bajo en sal / Hipertensión: Detecta sal añadida en exceso, embutidos curados, caldos concentrados con alto sodio.
     * Keto / Low-Carb: Detecta pastas, arroces, azúcares, patatas, harinas.
   - Para cada ingrediente incompatible, genera una entrada detallada en "sustituciones_sugeridas".
   - Si la receta es 100% compatible con las restricciones del usuario y no requiere sustituciones, devuelve "sustituciones_sugeridas": [] y destaca en "resumen_adaptacion" que el plato es naturalmente apto para su dieta.

2. ADAPTACIÓN AL NIVEL CULINARIO DEL CHEF:
   - Si el nivel es "Principiante":
     * Genera 2 a 4 "tips_tecnicos" con enfoque "principiante".
     * Explica con claridad meridiana los puntos críticos: control de fuego (medio vs fuerte), cómo saber visualmente cuándo un ingrediente está dorado sin quemarlo, tiempos de reposo y precauciones para no arruinar el plato.
   - Si el nivel es "Avanzado":
     * Genera 2 a 4 "tips_tecnicos" con enfoque "avanzado".
     * Ofrece atajos de chef profesional, reacciones de Maillard, desglasados óptimos, técnicas de emulsión, realce de umami o tiempos reducidos mediante técnicas profesionales.
   - Si el nivel es "Intermedio":
     * Genera consejos sobre balance de acidez, texturas y punto de cocción óptimo.

3. ESTRICTAMENTE DE SOLO LECTURA:
   - Tus sugerencias son una capa informativa superpuesta para guiar al usuario mientras cocina. No alteres la estructura básica de la receta ni inventes ingredientes exóticos e inalcanzables.
`.trim();

/**
 * Server Action Culinario No Destructivo:
 * Consulta el perfil de Supabase del usuario autenticado, evalúa la receta con Gemini y devuelve
 * la capa clínica y técnica de adaptación sin mutar la base de datos.
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

    // 2. Construir prompt para Gemini
    const userPrompt = `
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

Genera la adaptación culinaria no destructiva en formato JSON estricto.
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
            maxOutputTokens: 2500,
          },
        });

        if (!response.text) {
          throw new Error('Respuesta vacía de Gemini.');
        }

        const parsedData: AdaptacionCulinaria = JSON.parse(response.text);

        return {
          success: true,
          data: {
            resumen_adaptacion: parsedData.resumen_adaptacion || 'Adaptación culinaria generada para tu perfil.',
            sustituciones_sugeridas: parsedData.sustituciones_sugeridas || [],
            tips_tecnicos: parsedData.tips_tecnicos || [],
          },
          perfilAplicado: {
            nivel_culinario: nivelCulinario,
            preferencias_dieteticas: preferenciasDieteticas,
            alergenos,
          },
        };
      } catch (err) {
        lastError = err;
        console.warn(`Intento de adaptación con modelo '${model}' falló:`, err);
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
