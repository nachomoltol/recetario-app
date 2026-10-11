'use server';

import { getGeminiClient, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODELS } from '@/lib/gemini/client';
import { Type } from '@google/genai';

export interface SubstituteSuggestion {
  nombre_sustituto: string;
  cantidad_sugerida: string;
  razon_culinaria: string;
  beneficio_nutricional: string;
  modo_uso: string;
}

export interface SuggestSubstituteResult {
  success: boolean;
  data?: SubstituteSuggestion;
  error?: string;
}

const substituteSchema = {
  type: Type.OBJECT,
  description: 'Propuesta de sustituto culinario y nutricional bajo demanda.',
  properties: {
    nombre_sustituto: {
      type: Type.STRING,
      description: 'Nombre del ingrediente alternativo recomendado.',
    },
    cantidad_sugerida: {
      type: Type.STRING,
      description: 'Equivalencia sugerida (ej. "Misma cantidad (1:1)" o "Reducir a la mitad").',
    },
    razon_culinaria: {
      type: Type.STRING,
      description: 'Por qué funciona gastronómicamente: comportamiento en calor, textura y perfil gustativo.',
    },
    beneficio_nutricional: {
      type: Type.STRING,
      description: 'Ventaja para la salud (ej. más fibra, menor índice glucémico, grasas no saturadas).',
    },
    modo_uso: {
      type: Type.STRING,
      description: 'Consejo técnico breve para integrarlo en este plato.',
    },
  },
  required: [
    'nombre_sustituto',
    'cantidad_sugerida',
    'razon_culinaria',
    'beneficio_nutricional',
    'modo_uso',
  ],
};

const SYSTEM_INSTRUCTION_SUBSTITUTE = `
Eres un Chef Consultor y Nutricionista especializado en sustituciones inteligentes bajo demanda.
Tu objetivo es sugerir UNA alternativa saludable, natural y organolépticamente compatible para un ingrediente específico en el contexto de una receta dada.

DIRECTRICES:
1. Viabilidad Culinaria: La sustitución debe comportarse bien en cocción, aportar una textura similar y respetar la armonía de sabores del plato.
2. Salud Sostenible: Evita dietas extremas o combinaciones artificiales. Busca alimentos enteros, nutritivos y accesibles.
3. Precisión de Uso: Indica claramente la proporción adecuada para no arruinar la receta.
`.trim();

export async function suggestSubstituteAction({
  nombreIngrediente,
  cantidad,
  unidad,
  tituloReceta,
}: {
  nombreIngrediente: string;
  cantidad?: number;
  unidad?: string;
  tituloReceta: string;
}): Promise<SuggestSubstituteResult> {
  if (!nombreIngrediente || !tituloReceta) {
    return {
      success: false,
      error: 'Se requiere el nombre del ingrediente y el título de la receta.',
    };
  }

  try {
    const ai = getGeminiClient();

    const userPrompt = `
RECETA: "${tituloReceta}"
INGREDIENTE A SUSTITUIR: ${cantidad ? `${cantidad} ` : ''}${unidad ? `${unidad} de ` : ''}${nombreIngrediente}

Proporciona la mejor alternativa saludable y culinariamente equivalente para este ingrediente en este plato.
`.trim();

    const candidateModels = [PRIMARY_GEMINI_MODEL, ...FALLBACK_GEMINI_MODELS];
    let lastError: unknown = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION_SUBSTITUTE,
            responseMimeType: 'application/json',
            responseJsonSchema: substituteSchema,
            maxOutputTokens: 1024,
          },
        });

        if (!response.text) {
          throw new Error('Respuesta vacía del modelo.');
        }

        const data: SubstituteSuggestion = JSON.parse(response.text);
        return { success: true, data };
      } catch (err) {
        lastError = err;
        console.warn(`Intento de sustitución con '${model}' falló:`, err);
      }
    }

    throw lastError || new Error('No se pudo generar la sustitución.');
  } catch (error) {
    console.error('Error en suggestSubstituteAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al consultar alternativa con Gemini.',
    };
  }
}
