'use server';

import { getGeminiClient, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODELS } from '@/lib/gemini/client';
import { Type } from '@google/genai';

export interface SubstituteOption {
  tipo: 'magra_tradicional' | 'vegetal_umami' | 'accesible_economica';
  etiqueta_tipo: string;
  nombre_sustituto: string;
  cantidad_sugerida: string;
  razon_culinaria: string;
  beneficio_nutricional: string;
  modo_uso: string;
}

export interface SuggestSubstituteResult {
  success: boolean;
  data?: SubstituteOption[];
  error?: string;
}

const substituteSchema = {
  type: Type.OBJECT,
  description: 'Conjunto de tres alternativas culinarias y nutricionales diferenciadas.',
  properties: {
    alternativas: {
      type: Type.ARRAY,
      description: 'Exactamente 3 propuestas de sustitución con 3 perfiles distintos.',
      items: {
        type: Type.OBJECT,
        properties: {
          tipo: {
            type: Type.STRING,
            enum: ['magra_tradicional', 'vegetal_umami', 'accesible_economica'],
            description: 'Tipo de enfoque de la alternativa.',
          },
          etiqueta_tipo: {
            type: Type.STRING,
            description: 'Etiqueta descriptiva corta (ej: "Magra Tradicional", "Vegetal rica en Umami", "Accesible y Cotidiana").',
          },
          nombre_sustituto: {
            type: Type.STRING,
            description: 'Nombre del ingrediente alternativo propuesto.',
          },
          cantidad_sugerida: {
            type: Type.STRING,
            description: 'Equivalencia y ratio sugerido (ej: "Misma cantidad (1:1)", "200g por cada 150g").',
          },
          razon_culinaria: {
            type: Type.STRING,
            description: 'Comportamiento en cocina: resistencia al calor, humedad, emulsión, textura y armonía de sabor en la receta.',
          },
          beneficio_nutricional: {
            type: Type.STRING,
            description: 'Ventajas nutricionales contrastadas (menos grasa saturada, mayor proteína limpia, fibra prebiótica, micronutrientes).',
          },
          modo_uso: {
            type: Type.STRING,
            description: 'Consejo técnico concreto para incorporarlo en este plato.',
          },
        },
        required: [
          'tipo',
          'etiqueta_tipo',
          'nombre_sustituto',
          'cantidad_sugerida',
          'razon_culinaria',
          'beneficio_nutricional',
          'modo_uso',
        ],
      },
    },
  },
  required: ['alternativas'],
};

const SYSTEM_INSTRUCTION_SUBSTITUTE = `
Eres un Chef Consultor de Alta Cocina y Nutricionista Clínico especializado en sustituciones inteligentes bajo demanda.
Tu objetivo es sugerir EXACTAMENTE TRES alternativas diferentes, viables y organolépticamente sobresalientes para un ingrediente en el contexto de una receta dada:

1. Opción Magra Tradicional ("magra_tradicional"):
   - Enfoque: Reducción de grasa saturada o calorías, incremento de proteína de alto valor biológico o densidad de nutrientes de origen natural.
2. Opción Vegetal rica en Umami ("vegetal_umami"):
   - Enfoque: Alternativa plant-based basada en alimentos enteros que aporte profundidad gustativa, riqueza umami y textura satisfactoria sin recurrir a ultraprocesados.
3. Opción Accesible y Cotidiana ("accesible_economica"):
   - Enfoque: Alimento básico de despensa común, económico y disponible en cualquier supermercado local, fácil de preparar y con ratio directo de sustitución.

DIRECTRICES TÉCNICAS:
- Comportamiento Culinario: Explica con precisión técnica cómo reacciona al fuego/horno/emulsión y cómo afecta a la textura del plato.
- Beneficio Nutricional: Cita el impacto en macronutrientes, digestión o salud metabólica.
- Proporción Exacta: Especifica la ratio de intercambio para garantizar el éxito del plato.
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

Proporciona las tres alternativas requeridas (1. Magra tradicional, 2. Vegetal rica en umami, 3. Accesible y cotidiana) adaptadas al perfil culinario de esta receta.
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
            maxOutputTokens: 2048,
          },
        });

        if (!response.text) {
          throw new Error('Respuesta vacía del modelo.');
        }

        const data = JSON.parse(response.text);
        const alternativas: SubstituteOption[] = data.alternativas || [];

        if (!Array.isArray(alternativas) || alternativas.length === 0) {
          throw new Error('El formato de alternativas no contiene opciones válidas.');
        }

        return { success: true, data: alternativas };
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
