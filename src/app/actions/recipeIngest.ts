'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { extractRecipeWithGemini, detectFuenteTipo } from '@/lib/gemini/extractor';
import { calcularGramos } from '@/lib/nutrition/converter';
import { IngredienteMaestro } from '@/types/recipe';

export interface IngestRecipeResult {
  success?: boolean;
  recetaId?: string;
  error?: string;
}

export async function ingestRecipeAction(formData: FormData): Promise<IngestRecipeResult> {
  const url = (formData.get('url') as string)?.trim() || undefined;
  const texto = (formData.get('texto') as string)?.trim() || undefined;

  if (!url && !texto) {
    return { error: 'Por favor, introduce una URL (TikTok, Instagram, YouTube) o el texto de la receta.' };
  }

  // 1. Validar autenticación de usuario
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Debes haber iniciado sesión para procesar y guardar recetas.' };
  }

  try {
    // 2. Extracción estructurada mediante Gemini SDK con esquema JSON estricto
    const extracted = await extractRecipeWithGemini({ url, texto });

    // 3. Consultar ingredientes maestros para cruce relacional y cálculo volumétrico
    const { data: maestros } = await supabase
      .from('ingredientes_maestro')
      .select('*');

    const listaMaestros = (maestros as IngredienteMaestro[]) || [];

    // Función auxiliar para buscar coincidencia en el catálogo maestro
    const encontrarMaestro = (nombreLimpio: string) => {
      const norm = nombreLimpio.toLowerCase().trim();
      return listaMaestros.find(
        (m) =>
          m.nombre.toLowerCase() === norm ||
          m.nombre_normalizado === norm ||
          norm.includes(m.nombre_normalizado) ||
          m.nombre_normalizado.includes(norm)
      );
    };

    const fuenteTipo = detectFuenteTipo(url);

    // 4. Inserción atómica en 'recetas'
    const { data: nuevaReceta, error: errReceta } = await supabase
      .from('recetas')
      .insert({
        usuario_id: user.id,
        titulo: extracted.titulo,
        descripcion: extracted.descripcion,
        tiempo_preparacion_min: extracted.tiempo_preparacion_min,
        tiempo_coccion_min: extracted.tiempo_coccion_min,
        porciones: extracted.porciones || 2,
        dificultad: extracted.dificultad,
        fuente_tipo: fuenteTipo,
        fuente_url: url || null,
        calorias_por_porcion: extracted.macros_estimados_por_porcion?.calorias ?? 0,
        proteinas_por_porcion: extracted.macros_estimados_por_porcion?.proteinas ?? 0,
        carbohidratos_por_porcion: extracted.macros_estimados_por_porcion?.carbohidratos ?? 0,
        grasas_por_porcion: extracted.macros_estimados_por_porcion?.grasas ?? 0,
        fibra_por_porcion: extracted.macros_estimados_por_porcion?.fibra ?? 0,
        etiquetas: extracted.etiquetas || [],
      })
      .select()
      .single();

    if (errReceta || !nuevaReceta) {
      console.error('Error insertando receta:', errReceta);
      return { error: `Error guardando la receta: ${errReceta?.message || 'Error desconocido'}` };
    }

    // 5. Preparar e insertar en 'receta_ingredientes'
    const ingredientesPayload = extracted.ingredientes.map((ing, idx) => {
      const matchedMaestro = encontrarMaestro(ing.nombre_limpio);

      // Conversión volumétrica dinámica por densidad
      const conv = calcularGramos({
        cantidad: ing.cantidad,
        unidad: ing.unidad,
        ingredienteMaestro: matchedMaestro,
      });

      const gramosFinales = conv.gramos > 0 ? conv.gramos : ing.gramos_estimados || 0;

      const notasCombinadas = [
        ing.notas,
        ing.sustituto_saludable_sugerido
          ? `Sustitución saludable: ${ing.sustituto_saludable_sugerido}`
          : null,
      ]
        .filter(Boolean)
        .join(' — ');

      return {
        receta_id: nuevaReceta.id,
        ingrediente_maestro_id: matchedMaestro?.id || null,
        nombre_crudo: ing.nombre_crudo,
        nombre_limpio: ing.nombre_limpio,
        cantidad: ing.cantidad,
        unidad: ing.unidad,
        gramos_calculados: gramosFinales,
        notas: notasCombinadas || null,
        es_opcional: ing.es_opcional || false,
        orden: idx + 1,
      };
    });

    const { error: errIngredientes } = await supabase
      .from('receta_ingredientes')
      .insert(ingredientesPayload);

    if (errIngredientes) {
      console.error('Error insertando ingredientes, ejecutando rollback:', errIngredientes);
      // Rollback: limpiar la receta cabecera
      await supabase.from('recetas').delete().eq('id', nuevaReceta.id);
      return { error: `Error guardando los ingredientes: ${errIngredientes.message}` };
    }

    // 6. Preparar e insertar en 'pasos'
    const pasosPayload = extracted.pasos.map((p, idx) => ({
      receta_id: nuevaReceta.id,
      orden: p.orden || idx + 1,
      instruccion: p.instruccion,
      tiempo_estimado_min: p.tiempo_estimado_min || null,
      temperatura_celsius: p.temperatura_celsius || null,
      consejo_pro: p.consejo_pro || null,
      utensilios_sugeridos: [],
    }));

    const { error: errPasos } = await supabase.from('pasos').insert(pasosPayload);

    if (errPasos) {
      console.error('Error insertando pasos, ejecutando rollback:', errPasos);
      await supabase.from('recetas').delete().eq('id', nuevaReceta.id);
      return { error: `Error guardando los pasos: ${errPasos.message}` };
    }

    revalidatePath('/recipes');
    return { success: true, recetaId: nuevaReceta.id };
  } catch (error) {
    console.error('Error general en ingestRecipeAction:', error);
    return {
      error: error instanceof Error ? error.message : 'Error inesperado procesando la receta.',
    };
  }
}
