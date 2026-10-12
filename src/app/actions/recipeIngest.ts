'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { extractRecipeWithGemini, detectFuenteTipo } from '@/lib/gemini/extractor';
import { calcularGramos } from '@/lib/nutrition/converter';
import { IngredienteMaestro } from '@/types/recipe';
import { DificultadReceta } from '@/types/database';

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
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Error de autenticación en ingestRecipeAction:', authError);
    return { error: 'Debes haber iniciado sesión para procesar y guardar recetas.' };
  }

  try {
    // 2. Extracción multimodal autónoma con Gemini
    const extracted = await extractRecipeWithGemini({ url, texto });

    // 3. Consultar ingredientes maestros para cruce relacional y cálculo volumétrico
    const { data: maestros } = await supabase
      .from('ingredientes_maestro')
      .select('*');

    const listaMaestros = (maestros as IngredienteMaestro[]) || [];

    const encontrarMaestro = (nombreLimpio: string) => {
      const norm = (nombreLimpio || '').toLowerCase().trim();
      if (!norm) return undefined;
      return listaMaestros.find(
        (m) =>
          m.nombre.toLowerCase() === norm ||
          m.nombre_normalizado === norm ||
          norm.includes(m.nombre_normalizado) ||
          m.nombre_normalizado.includes(norm)
      );
    };

    const fuenteTipo = detectFuenteTipo(url);

    // Consolidar etiquetas de doble clasificación (gastronómicas + momentos de consumo)
    const etiquetasCombinadas = Array.from(
      new Set([
        ...(extracted.categorias_gastronomicas || []),
        ...(extracted.momentos_consumo || []),
        ...(extracted.etiquetas || []),
      ].filter((t): t is string => typeof t === 'string' && t.trim().length > 0))
    );

    // Normalizar dificultad contra el constraint SQL: ('facil', 'media', 'dificil', 'experto')
    // Muy importante: Gemini suele devolver 'fácil' o 'difícil' con tilde, lo que violaba el CHECK constraint.
    const DIFICULTADES_VALIDAS: DificultadReceta[] = ['facil', 'media', 'dificil', 'experto'];
    const cleanDificultad = (extracted.dificultad || 'media')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    let dificultadNormalizada: DificultadReceta = 'media';
    if (DIFICULTADES_VALIDAS.includes(cleanDificultad as DificultadReceta)) {
      dificultadNormalizada = cleanDificultad as DificultadReceta;
    }

    const prepMin = Math.max(0, Number(extracted.tiempo_preparacion_min) || 0);
    const coccMin = Math.max(0, Number(extracted.tiempo_coccion_min) || 0);
    const tiempoTotal = Math.max(1, prepMin + coccMin);
    const porcionesNum = Math.max(1, Number(extracted.porciones) || 2);

    // 4. Inserción en 'recetas'
    const { data: nuevaReceta, error: errReceta } = await supabase
      .from('recetas')
      .insert({
        usuario_id: user.id,
        titulo: (extracted.titulo || 'Receta sin título').trim(),
        descripcion: extracted.descripcion || null,
        tiempo_preparacion_min: prepMin,
        tiempo_coccion_min: coccMin,
        porciones: porcionesNum,
        dificultad: dificultadNormalizada,
        fuente_tipo: fuenteTipo,
        fuente_url: url || null,
        calorias_por_porcion: Math.max(0, Number(extracted.macros_estimados_por_porcion?.calorias) || 0),
        proteinas_por_porcion: Math.max(0, Number(extracted.macros_estimados_por_porcion?.proteinas) || 0),
        carbohidratos_por_porcion: Math.max(0, Number(extracted.macros_estimados_por_porcion?.carbohidratos) || 0),
        grasas_por_porcion: Math.max(0, Number(extracted.macros_estimados_por_porcion?.grasas) || 0),
        fibra_por_porcion: Math.max(0, Number(extracted.macros_estimados_por_porcion?.fibra) || 0),
        etiquetas: etiquetasCombinadas,
      })
      .select()
      .single();

    if (errReceta || !nuevaReceta) {
      console.error('Error insertando receta cabecera:', errReceta);
      return { error: `Error guardando la receta en base de datos: ${errReceta?.message || 'Error desconocido'}` };
    }

    // 5. Preparar e insertar en 'receta_ingredientes' de forma blindada
    const rawIngredientes = extracted.ingredientes && extracted.ingredientes.length > 0
      ? extracted.ingredientes
      : [{
          nombre_crudo: 'Ingredientes principales según vídeo',
          nombre_limpio: 'Ingredientes según vídeo',
          cantidad: 1,
          unidad: 'unidad',
          gramos_estimados: 100,
          es_ultraprocesado: false,
        }];

    const ingredientesPayload = rawIngredientes.map((ing, idx) => {
      const nombreCrudo = (ing.nombre_crudo || ing.nombre_limpio || `Ingrediente ${idx + 1}`).trim();
      const nombreLimpio = (ing.nombre_limpio || ing.nombre_crudo || `Ingrediente ${idx + 1}`).trim();
      const matchedMaestro = encontrarMaestro(nombreLimpio);

      // Conversión volumétrica dinámica por densidad
      const rawCantidad = typeof ing.cantidad === 'number' && !isNaN(ing.cantidad) && ing.cantidad > 0
        ? ing.cantidad
        : parseFloat(String(ing.cantidad)) || 1;

      const rawUnidad = (ing.unidad || 'unidad').trim();

      const conv = calcularGramos({
        cantidad: rawCantidad,
        unidad: rawUnidad,
        ingredienteMaestro: matchedMaestro,
      });

      const gramosFinales = conv.gramos > 0
        ? conv.gramos
        : (typeof ing.gramos_estimados === 'number' && !isNaN(ing.gramos_estimados) ? ing.gramos_estimados : 0);

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
        nombre_crudo: nombreCrudo,
        nombre_limpio: nombreLimpio,
        cantidad: Math.max(0.1, rawCantidad),
        unidad: rawUnidad,
        gramos_calculados: Math.max(0, gramosFinales),
        notas: notasCombinadas || null,
        es_opcional: Boolean(ing.es_opcional),
        orden: idx + 1, // Secuencial estricto
      };
    });

    const { error: errIngredientes } = await supabase
      .from('receta_ingredientes')
      .insert(ingredientesPayload);

    if (errIngredientes) {
      console.error('Error insertando ingredientes, ejecutando rollback:', errIngredientes);
      await supabase.from('recetas').delete().eq('id', nuevaReceta.id);
      return { error: `Error guardando los ingredientes: ${errIngredientes.message}` };
    }

    // 6. Preparar e insertar en 'pasos' garantizando la clave única (receta_id, orden)
    const rawPasos = extracted.pasos && extracted.pasos.length > 0
      ? extracted.pasos
      : [{
          orden: 1,
          instruccion: 'Seguir la preparación mostrada en el contenido audiovisual.',
        }];

    const pasosPayload = rawPasos.map((p, idx) => ({
      receta_id: nuevaReceta.id,
      orden: idx + 1, // CRÍTICO: idx + 1 garantiza que no haya duplicados ni valores <= 0
      instruccion: (p.instruccion || 'Preparación según indicaciones del vídeo.').trim(),
      tiempo_estimado_min: typeof p.tiempo_estimado_min === 'number' && p.tiempo_estimado_min > 0 ? p.tiempo_estimado_min : null,
      temperatura_celsius: typeof p.temperatura_celsius === 'number' && p.temperatura_celsius > 0 ? p.temperatura_celsius : null,
      consejo_pro: p.consejo_pro ? p.consejo_pro.trim() : null,
      utensilios_sugeridos: [],
    }));

    const { error: errPasos } = await supabase.from('pasos').insert(pasosPayload);

    if (errPasos) {
      console.error('Error insertando pasos, ejecutando rollback:', errPasos);
      await supabase.from('recetas').delete().eq('id', nuevaReceta.id);
      return { error: `Error guardando los pasos: ${errPasos.message}` };
    }

    // 7. Revalidación exhaustiva de caché de Next.js
    revalidatePath('/recipes', 'page');
    revalidatePath('/recipes/collection', 'page');
    revalidatePath(`/recipes/${nuevaReceta.id}`, 'page');
    revalidatePath('/', 'layout');

    console.log(`Receta guardada exitosamente: ${nuevaReceta.titulo} (${nuevaReceta.id})`);
    return { success: true, recetaId: nuevaReceta.id };
  } catch (error) {
    console.error('Error general en ingestRecipeAction:', error);
    return {
      error: error instanceof Error ? error.message : 'Error inesperado procesando la receta.',
    };
  }
}
