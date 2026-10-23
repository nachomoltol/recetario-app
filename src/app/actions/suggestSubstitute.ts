'use server';

import { getGeminiClient, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODELS } from '@/lib/gemini/client';
import { Type } from '@google/genai';
import { createClient } from '@/lib/supabase/server';
import { getDetailedClinicalProfile, buildClinicalFirewallPrompt } from '@/lib/clinicalDictionary';

export interface SubstituteOption {
  nombre_sustituto: string;
  etiqueta_dinamica: string;
  categoria_icono: 'vegetal' | 'proteina' | 'lacteo' | 'cereal' | 'despensa' | 'general';
  cantidad_sugerida: string;
  razon_culinaria: string;
  beneficio_nutricional: string;
  modo_uso: string;
  // Campos de compatibilidad hacia atrás
  tipo?: string;
  etiqueta_tipo?: string;
}

export interface SuggestSubstituteResult {
  success: boolean;
  data?: SubstituteOption[];
  error?: string;
}

const substituteSchema = {
  type: Type.OBJECT,
  description: 'Conjunto de tres alternativas culinarias y nutricionales diferenciadas y contextualmente relevantes.',
  properties: {
    alternativas: {
      type: Type.ARRAY,
      description: 'Exactamente 3 propuestas de sustitución inteligentes adaptadas al ingrediente específico.',
      minItems: 3,
      maxItems: 3,
      items: {
        type: Type.OBJECT,
        properties: {
          nombre_sustituto: {
            type: Type.STRING,
            description: 'Nombre canónico y limpio del ingrediente alternativo propuesto (ej: "Batata o Boniato", "Tofu firme", "Bebida de almendras sin azúcar").',
          },
          etiqueta_dinamica: {
            type: Type.STRING,
            description:
              'Etiqueta descriptiva contextual al alimento real (ej: "Tubérculo de bajo IG", "Equivalente en textura", "Opción vegetal rica en fibra", "Grasa cardiosaludable", "Proteína marina magra").',
          },
          categoria_icono: {
            type: Type.STRING,
            enum: ['vegetal', 'proteina', 'lacteo', 'cereal', 'despensa', 'general'],
            description: 'Categoría culinaria básica para iconografía visual.',
          },
          cantidad_sugerida: {
            type: Type.STRING,
            description: 'Equivalencia y ratio sugerido (ej: "Misma cantidad (1:1)", "200g por cada 150g", "1 cucharada sopera rasa").',
          },
          razon_culinaria: {
            type: Type.STRING,
            description: 'Comportamiento en cocina: resistencia térmica, evaporación, humedad, textura y armonía de sabor en la receta.',
          },
          beneficio_nutricional: {
            type: Type.STRING,
            description: 'Ventajas nutricionales contrastadas (menor carga glucémica, fibra prebiótica, perfil lipídico o aporte proteico).',
          },
          modo_uso: {
            type: Type.STRING,
            description: 'Consejo técnico concreto para incorporarlo en este plato.',
          },
        },
        required: [
          'nombre_sustituto',
          'etiqueta_dinamica',
          'categoria_icono',
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
Eres un Chef Consultor de Alta Cocina y Nutricionista Clínico especializado en sustituciones culinarias inteligentes bajo demanda.
Tu objetivo es sugerir OBLIGATORIAMENTE Y DE FORMA ESTRICTA EXACTAMENTE TRES alternativas viables, culinariamente coherentes y organolépticamente sobresalientes para un ingrediente específico en el contexto de una receta dada.
BAJO NINGÚN CONCEPTO devuelvas menos de 3 alternativas ni más de 3 alternativas (ni 1 ni 2). El array 'alternativas' debe contener exactamente 3 elementos.

DIRECTRICES FUNDAMENTALES DE GENERACIÓN DINÁMICA:
1. ADAPTACIÓN A LA NATURALEZA REAL DEL ALIMENTO:
   - Las 3 alternativas deben corresponder a la naturaleza culinaria real del ingrediente recibido (ej: si se sustituye una patata, sugiere opciones afines como batata, calabaza o coliflor; si se sustituye mantequilla, sugiere AOVE, puré de manzana o mantequilla de frutos secos; si se sustituye una carne o pescado, sugiere alternativas proteicas coherentes).
   - Proporciona 3 enfoques complementarios y diferenciados sin repetirse entre sí (ej: una opción de reemplazo directo de textura, una opción de optimización metabólica/nutricional, y una opción vegetal o ligera).
   - Genera para cada opción una 'etiqueta_dinamica' descriptiva, concisa y atractiva que resalte el valor diferencial de esa alternativa en el plato (ej: "Tubérculo de bajo IG", "Equivalente en textura", "Opción vegetal rica en fibra", "Grasa monoinsaturada").
   - Clasifica cada una en 'categoria_icono': 'vegetal', 'proteina', 'lacteo', 'cereal', 'despensa' o 'general'.

2. RIGOR CULINARIO Y TÉCNICO:
   - Proporción Exacta: Especifica la ratio de intercambio precisa (1:1, reducción de líquido, ajuste de tiempos de cocción).
   - Comportamiento Culinario: Explica con rigor técnico cómo reacciona al fuego/horno/emulsión y cómo afecta al resultado final.
   - Beneficio Nutricional: Cita el impacto real en macronutrientes, digestibilidad o densidad nutricional.

3. BLINDAJE CLÍNICO ESTRICTO:
   - Si se proporcionan directivas de cortafuegos clínico o exclusiones médicas del usuario, está TERMINANTEMENTE PROHIBIDO incluir o sugerir cualquier ingrediente vetado o derivado. Todas las alternativas DEBEN ser 100% aptas para el perfil del usuario.
`.trim();

export async function suggestSubstituteAction({
  nombreIngrediente,
  cantidad,
  unidad,
  tituloReceta,
  idioma = 'es',
}: {
  nombreIngrediente: string;
  cantidad?: number;
  unidad?: string;
  tituloReceta: string;
  idioma?: 'es' | 'en';
}): Promise<SuggestSubstituteResult> {
  if (!nombreIngrediente || !tituloReceta) {
    return {
      success: false,
      error: 'Se requiere el nombre del ingrediente y el título de la receta.',
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let clinicalContext = '';
    if (user) {
      const { data: perfil } = await supabase
        .from('usuarios')
        .select('alergenos, preferencias_dieteticas, nivel_culinario')
        .eq('id', user.id)
        .single();

      if (perfil) {
        const alergenosStr =
          perfil.alergenos && perfil.alergenos.length > 0
            ? perfil.alergenos.join(', ')
            : '';
        const preferencias = perfil.preferencias_dieteticas || [];
        const alergenos = perfil.alergenos || [];
        const nivelStr = perfil.nivel_culinario || 'medio';

        const clinicalProfile = getDetailedClinicalProfile({
          preferencias,
          alergenos,
          idioma,
        });

        const firewallPrompt = buildClinicalFirewallPrompt(
          clinicalProfile.exclusionesTotales,
          idioma,
          {
            severidadMaxima: clinicalProfile.severidadMaxima,
            reglasAvanzadasTexto: clinicalProfile.reglasAvanzadasTexto,
          }
        );

        clinicalContext = `
PERFIL CLÍNICO E INTOLERANCIAS DEL USUARIO:
- Alérgenos e intolerancias médicas estrictas: ${alergenosStr || (idioma === 'en' ? 'None declared' : 'Ninguno declarado')}
- Preferencias dietéticas / estilo de vida: ${preferencias.length > 0 ? preferencias.join(', ') : (idioma === 'en' ? 'None declared' : 'Ninguna declarada')}
- Nivel culinario del usuario: ${nivelStr}
${firewallPrompt ? `\n${firewallPrompt}` : ''}

PROHIBICIÓN ESTRICTA: La IA tiene TERMINANTEMENTE PROHIBIDO sugerir cualquier ingrediente o alternativa que contenga, derive o active las intolerancias, alergias o restricciones del usuario (${clinicalProfile.exclusionesTotales.join(', ')}). Todas las alternativas sugeridas deben ser 100% aptas y seguras para este perfil clínico.`;
      }
    }

    const ai = getGeminiClient();
    const langName = idioma === 'en' ? 'English' : 'Spanish';
    const antiSpanglishDirective =
      idioma === 'en'
        ? `\nADVERTENCIA CRÍTICA DE IDIOMA: Si el idioma solicitado es Inglés ('en'), estás ESTRICTAMENTE PROHIBIDO de usar la palabra 'unidades', 'cucharadas', 'gramos' en español. Debes usar sus equivalentes en inglés ('units/pieces', 'tbsp/tsp', 'grams'). Las etiquetas de dificultad ('Fácil', 'Principiante') DEBEN traducirse al inglés ('Easy', 'Beginner'). TODO EL JSON DEBE SER INGLÉS NATIVO.`
        : '';

    const userPrompt = `
RECETA: "${tituloReceta}"
INGREDIENTE A SUSTITUIR: ${cantidad ? `${cantidad} ` : ''}${unidad ? `${unidad} de ` : ''}${nombreIngrediente}
${clinicalContext}

DIRECTIVA DE REEMPLAZO DINÁMICO:
Proporciona EXACTAMENTE 3 alternativas nutricionalmente coherentes con la naturaleza del ingrediente y organolépticamente viables.

GESTIÓN DINÁMICA DE IDIOMA:
Redacta todas las alternativas, etiquetas dinámicas, razones culinarias, beneficios y modos de uso estrictamente en ${langName}. NUNCA mezcles idiomas.${antiSpanglishDirective}
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
        const rawAlternativas = data.alternativas || [];

        if (!Array.isArray(rawAlternativas) || rawAlternativas.length === 0) {
          throw new Error('El formato de alternativas no contiene opciones válidas.');
        }

        // Mapeo defensivo asegurando soporte de etiquetas dinámicas y compatibilidad
        const alternativas: SubstituteOption[] = rawAlternativas.map((alt: any) => ({
          nombre_sustituto: String(alt.nombre_sustituto || '').trim(),
          etiqueta_dinamica: String(alt.etiqueta_dinamica || alt.etiqueta_tipo || 'Alternativa').trim(),
          categoria_icono: ['vegetal', 'proteina', 'lacteo', 'cereal', 'despensa', 'general'].includes(alt.categoria_icono)
            ? alt.categoria_icono
            : 'general',
          cantidad_sugerida: String(alt.cantidad_sugerida || '1:1').trim(),
          razon_culinaria: String(alt.razon_culinaria || '').trim(),
          beneficio_nutricional: String(alt.beneficio_nutricional || '').trim(),
          modo_uso: String(alt.modo_uso || '').trim(),
          // Compatibilidad hacia atrás
          tipo: alt.categoria_icono || alt.tipo || 'general',
        }));

        // Blindaje defensivo: asegurar exactamente 3 alternativas
        const finalAlternativas: SubstituteOption[] = alternativas.slice(0, 3);
        while (finalAlternativas.length < 3) {
          const indexNum = finalAlternativas.length + 1;
          finalAlternativas.push({
            nombre_sustituto: `${nombreIngrediente} (${idioma === 'en' ? 'Option' : 'Opción'} ${indexNum})`,
            etiqueta_dinamica: idioma === 'en' ? 'Alternative' : 'Alternativa',
            categoria_icono: 'general',
            cantidad_sugerida: '1:1',
            razon_culinaria: idioma === 'en' ? 'Functional culinary replacement' : 'Sustitución culinaria funcional',
            beneficio_nutricional: idioma === 'en' ? 'Adapted nutritional profile' : 'Perfil nutricional adaptado',
            modo_uso: idioma === 'en' ? 'Use identically' : 'Incorporar de manera idéntica',
            tipo: 'general',
            etiqueta_tipo: idioma === 'en' ? 'Alternative' : 'Alternativa',
          });
        }

        return { success: true, data: finalAlternativas };
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
