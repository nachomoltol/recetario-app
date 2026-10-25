'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getAdminClient } from '@/lib/supabase/server';
import { extractRecipeWithGemini, detectFuenteTipo, sanitizeRecipeUrl } from '@/lib/gemini/extractor';
import { getClinicalExclusions } from '@/lib/clinicalDictionary';
import { ExtractedIngredient } from '@/lib/gemini/schema';
import { calcularGramos } from '@/lib/nutrition/converter';
import { IngredienteMaestro } from '@/types/recipe';
import { FuenteTipoReceta } from '@/types/database';

export interface IngestRecipeResult {
  success?: boolean;
  recetaId?: string;
  error?: string;
}

export async function ingestRecipeAction(formData: FormData): Promise<IngestRecipeResult> {
  try {
    const rawUrl = (formData.get('url') as string)?.trim() || undefined;
    const url = sanitizeRecipeUrl(rawUrl);
    const texto = (formData.get('texto') as string)?.trim() || undefined;
    const rawIdioma = (formData.get('idioma') as string)?.trim().toLowerCase();
    const idioma: 'es' | 'en' = rawIdioma === 'en' ? 'en' : 'es';
    const fileEntry = formData.get('archivo') || formData.get('file');
    const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : undefined;
    const rawDeviceId = ((formData.get('deviceId') as string) || '').trim() || 'web_unknown';

    if (!url && !texto && !file) {
      return {
        success: false,
        error: 'Por favor, introduce una URL (TikTok, Instagram, YouTube), el texto de la receta o sube una imagen/documento.',
      };
    }

    // 1. Validar autenticación de usuario
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[recipeIngest] Error de autenticación en ingestRecipeAction:', authError);
      return {
        success: false,
        error: 'Debes haber iniciado sesión para procesar y guardar recetas.',
      };
    }

    // Cliente con permisos de administración para saltarse RLS al gestionar cuotas
    const adminClient = getAdminClient();
    const db = adminClient || supabase;

  // 2. Control de Cuotas Freemium / Premium y Anti-Fraude ANTES de invocar a Gemini
  const { data: perfilUsuario, error: perfilError } = await db
    .from('usuarios')
    .select(
      'id, plan_suscripcion, capturas_mes_actual, fecha_ultimo_reinicio, antiguedad_ciclos_mes, raciones_defecto, preferencias_dieteticas, alergenos'
    )
    .eq('id', user.id)
    .single();

  if (perfilError) {
    console.error('[recipeIngest] Error al obtener perfil de usuario:', perfilError);
  }

  let capturasMesActual = Number(perfilUsuario?.capturas_mes_actual) || 0;
  let antiguedadCiclos = Number(perfilUsuario?.antiguedad_ciclos_mes) || 0;
  const rawPlan = (perfilUsuario?.plan_suscripcion || '').trim().toLowerCase();
  const isPro = rawPlan === 'pro';
  const ahora = new Date();

  // Helper para detectar cambio de mes respecto a una fecha ISO
  const esNuevoMes = (fechaIso?: string | null): boolean => {
    if (!fechaIso) return true;
    const f = new Date(fechaIso);
    if (isNaN(f.getTime())) return true;
    return (
      f.getUTCFullYear() !== ahora.getUTCFullYear() ||
      f.getUTCMonth() !== ahora.getUTCMonth()
    );
  };

  // Hybrid-Reset (Pilar B): Si el usuario no se reinició por pg_cron en el nuevo mes, reiniciar al vuelo
  if (perfilUsuario?.fecha_ultimo_reinicio) {
    if (esNuevoMes(perfilUsuario.fecha_ultimo_reinicio)) {
      antiguedadCiclos += 1;
      capturasMesActual = 0;
      await db
        .from('usuarios')
        .update({
          capturas_mes_actual: 0,
          antiguedad_ciclos_mes: antiguedadCiclos,
          fecha_ultimo_reinicio: ahora.toISOString(),
          updated_at: ahora.toISOString(),
        })
        .eq('id', user.id);
      console.log(`[recipeIngest] Hybrid-Reset usuario: Cuota mensual reseteada a 0 para ${user.id} (ciclo ${antiguedadCiclos}).`);
    }
  } else {
    await db
      .from('usuarios')
      .update({
        fecha_ultimo_reinicio: ahora.toISOString(),
        antiguedad_ciclos_mes: 0,
        updated_at: ahora.toISOString(),
      })
      .eq('id', user.id);
  }

  // Anti-Fraude: Comprobación de cuota y hybrid-reset por dispositivo físico
  let capturasDispositivo = 0;
  const isValidoDeviceId = rawDeviceId && rawDeviceId !== 'web_unknown' && rawDeviceId !== 'server_fallback';

  if (isValidoDeviceId) {
    const { data: dispData } = await db
      .from('dispositivos_cuotas')
      .select('*')
      .eq('device_id', rawDeviceId)
      .maybeSingle();

    if (dispData) {
      capturasDispositivo = Number(dispData.capturas_mes_actual) || 0;
      if (esNuevoMes(dispData.fecha_ultimo_reinicio)) {
        capturasDispositivo = 0;
        const nuevaAntiguedadDisp = (Number(dispData.antiguedad_ciclos_mes) || 0) + 1;
        await db
          .from('dispositivos_cuotas')
          .update({
            capturas_mes_actual: 0,
            antiguedad_ciclos_mes: nuevaAntiguedadDisp,
            fecha_ultimo_reinicio: ahora.toISOString(),
            updated_at: ahora.toISOString(),
          })
          .eq('device_id', rawDeviceId);
      }
    } else {
      // Registrar primer contacto del dispositivo físico
      await db.from('dispositivos_cuotas').insert({
        device_id: rawDeviceId,
        capturas_mes_actual: 0,
        fecha_ultimo_reinicio: ahora.toISOString(),
        antiguedad_ciclos_mes: 0,
        primer_usuario_id: user.id,
        created_at: ahora.toISOString(),
        updated_at: ahora.toISOString(),
      });
    }
  }

  // Cortafuegos de Límites Duros de Producción:
  // A) Usuario PRO: Límite estricto de 150 recetas por mes calendario
  if (isPro && capturasMesActual >= 150) {
    console.warn(`[recipeIngest] BLOQUEO DURO PRO: Usuario ${user.id} alcanzó el límite mensual de 150 generaciones.`);
    return {
      success: false,
      error: 'PRO_LIMIT_REACHED',
    };
  }

  // B) Usuario GRATUITO: Límite estricto de 50 recetas por mes calendario
  if (!isPro && capturasMesActual >= 50) {
    console.warn(`[recipeIngest] BLOQUEO DURO GRATUITO: Usuario ${user.id} alcanzó el límite mensual de 50 generaciones.`);
    return {
      success: false,
      error: 'FREE_LIMIT_REACHED',
    };
  }

  // C) Anti-Fraude Dispositivo Físico: Límite de 50 recetas por mes en el mismo hardware
  if (!isPro && isValidoDeviceId && capturasDispositivo >= 50) {
    console.warn(`[recipeIngest] BLOQUEO ANTI-FRAUDE DISPOSITIVO: Dispositivo ${rawDeviceId} alcanzó el límite de 50.`);
    return {
      success: false,
      error: 'DEVICE_LIMIT_REACHED',
    };
  }

  // Calcular restricciones clínicas del usuario únicamente para generar alertas informativas de compatibilidad
  const alertasClinicas = getClinicalExclusions({
    preferencias: perfilUsuario?.preferencias_dieteticas || [],
    alergenos: perfilUsuario?.alergenos || [],
  });

  // 3. Extracción multimodal autónoma con Gemini (fidelidad 100% al contenido original del vídeo/fuente)
  const extracted = await extractRecipeWithGemini({
    url,
    texto,
    file,
    idioma,
    alertasClinicas,
  });

    // 4. Consultar ingredientes maestros para cruce relacional y cálculo volumétrico
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

    let fuenteTipo: FuenteTipoReceta = 'manual';
    if (file) {
      const ext = (file.name || '').toLowerCase();
      if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|avif)$/i.test(ext)) {
        fuenteTipo = 'foto_manuscrita';
      } else if (file.type === 'application/pdf' || ext.endsWith('.pdf')) {
        fuenteTipo = 'pdf';
      } else if (url) {
        fuenteTipo = detectFuenteTipo(url);
      } else {
        fuenteTipo = 'manual';
      }
    } else if (url) {
      fuenteTipo = detectFuenteTipo(url);
    }

    const fuenteUrl = url || (file ? `Archivo: ${file.name}` : null);

    // Consolidar etiquetas de doble clasificación (gastronómicas + momentos de consumo)
    const etiquetasCombinadas = Array.from(
      new Set([
        ...(extracted.categorias_gastronomicas || []),
        ...(extracted.momentos_consumo || []),
        ...(extracted.etiquetas || []),
      ].filter((t): t is string => typeof t === 'string' && t.trim().length > 0))
    );

    // Dificultad libre generada por Gemini según el idioma solicitado
    const dificultadReceta = (extracted.dificultad || 'media').trim();

    const prepMin = Math.max(0, Number(extracted.tiempo_preparacion_min) || 0);
    const coccMin = Math.max(0, Number(extracted.tiempo_coccion_min) || 0);
    const tiempoTotal = Math.max(1, prepMin + coccMin);
    // Guardar las porciones originales nativas de la receta según la extracción,
    // desacoplándolas de las preferencias globales del perfil de usuario
    const porcionesNum = Math.max(1, Number(extracted.porciones) || 2);
    const factorEscalado = 1;

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
        dificultad: dificultadReceta,
        fuente_tipo: fuenteTipo,
        fuente_url: fuenteUrl,
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
    const rawIngredientes: ExtractedIngredient[] = extracted.ingredientes && extracted.ingredientes.length > 0
      ? extracted.ingredientes
      : [{
          nombre_crudo: 'Ingredientes principales según vídeo',
          nombre_limpio: 'Ingredientes según vídeo',
          cantidad: 1,
          unidad: 'unidad',
          gramos_estimados: 100,
          pasillo_supermercado: 'Despensa y Especias',
          es_ultraprocesado: false,
          notas: undefined,
          es_opcional: false,
        }];

    const ingredientesPayload = rawIngredientes.map((ing, idx) => {
      const nombreCrudo = (ing.nombre_crudo || ing.nombre_limpio || `Ingrediente ${idx + 1}`).trim();
      const nombreLimpio = (ing.nombre_limpio || ing.nombre_crudo || `Ingrediente ${idx + 1}`).trim();
      const matchedMaestro = encontrarMaestro(nombreLimpio);

      // Conversión volumétrica dinámica por densidad con escalado a raciones preferidas
      const baseCantidad = typeof ing.cantidad === 'number' && !isNaN(ing.cantidad) && ing.cantidad > 0
        ? ing.cantidad
        : parseFloat(String(ing.cantidad)) || 1;

      const rawCantidad = factorEscalado !== 1
        ? Math.round(baseCantidad * factorEscalado * 10) / 10
        : baseCantidad;

      let rawUnidad = (ing.unidad || (idioma === 'en' ? 'unit' : 'unidad')).trim();
      const uLower = rawUnidad.toLowerCase();

      // Regla lógica de pluralización con soporte estricto de idioma (fin del Spanglish)
      if (
        uLower === 'unidad' ||
        uLower === 'unidades' ||
        uLower === 'unit' ||
        uLower === 'units' ||
        uLower === 'piece' ||
        uLower === 'pieces'
      ) {
        if (idioma === 'en') {
          rawUnidad = rawCantidad > 1 ? 'units' : 'unit';
        } else {
          rawUnidad = rawCantidad > 1 ? 'unidades' : 'unidad';
        }
      } else if (idioma === 'en') {
        if (uLower === 'cucharada' || uLower === 'cucharadas') rawUnidad = 'tbsp';
        else if (uLower === 'cucharadita' || uLower === 'cucharaditas') rawUnidad = 'tsp';
        else if (uLower === 'gramo' || uLower === 'gramos') rawUnidad = 'g';
        else if (uLower === 'mililitro' || uLower === 'mililitros') rawUnidad = 'ml';
      }

      const conv = calcularGramos({
        cantidad: rawCantidad,
        unidad: rawUnidad,
        ingredienteMaestro: matchedMaestro,
      });

      const gramosFinales = conv.gramos > 0
        ? conv.gramos
        : (typeof ing.gramos_estimados === 'number' && !isNaN(ing.gramos_estimados) ? ing.gramos_estimados : 0);

      // Regla estricta de pasillos: manzana a Frutas y Verduras, agua a Bebidas, etc.
      let pasilloFinal = ing.pasillo_supermercado || 'Despensa y Especias';
      const nLower = nombreLimpio.toLowerCase();
      if (/manzana|platano|plátano|limon|limón|naranja|fruta|pera|fresa|aguacate|tomate|cebolla|ajo|patata|verdura/i.test(nLower)) {
        pasilloFinal = 'Frutas y Verduras';
      } else if (/^agua\b|agua mineral|agua del grifo|refresco|zumo|vino|cerveza/i.test(nLower)) {
        pasilloFinal = 'Bebidas';
      }

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
        pasillo_supermercado: pasilloFinal,
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

    // 6. Incrementar cuota mensual de generación (+1) tanto para usuario como para dispositivo
    const { data: usuarioFresco } = await db
      .from('usuarios')
      .select('capturas_mes_actual')
      .eq('id', user.id)
      .single();

    const conteoBase = Number(usuarioFresco?.capturas_mes_actual) || capturasMesActual;
    const nuevoConteo = conteoBase + 1;

    const { data: updatedRows, error: errUpdateCuota } = await db
      .from('usuarios')
      .update({
        capturas_mes_actual: nuevoConteo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, capturas_mes_actual');

    if (errUpdateCuota) {
      console.error('[recipeIngest] ERROR al incrementar capturas_mes_actual de usuario:', errUpdateCuota);
    } else {
      console.log(
        `[recipeIngest] Cuota de usuario incrementada con éxito a ${nuevoConteo} para usuario ${user.id}.`
      );
    }

    // Incrementar también el contador del dispositivo físico
    if (isValidoDeviceId) {
      const { data: dispFresco } = await db
        .from('dispositivos_cuotas')
        .select('capturas_mes_actual')
        .eq('device_id', rawDeviceId)
        .maybeSingle();

      const conteoBaseDisp = Number(dispFresco?.capturas_mes_actual) || capturasDispositivo;
      await db
        .from('dispositivos_cuotas')
        .update({
          capturas_mes_actual: conteoBaseDisp + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('device_id', rawDeviceId);
    }

    // 7. Revalidación exhaustiva de caché de Next.js
    revalidatePath('/recipes', 'page');
    revalidatePath('/recipes/collection', 'page');
    revalidatePath(`/recipes/${nuevaReceta.id}`, 'page');
    revalidatePath('/', 'layout');

    console.log(`Receta guardada exitosamente: ${nuevaReceta.titulo} (${nuevaReceta.id})`);
    return { success: true, recetaId: nuevaReceta.id };
  } catch (error: any) {
    console.error('[recipeIngest] Fallo en Server Action ingestRecipeAction:', error);
    return {
      success: false,
      error:
        typeof error?.message === 'string' && error.message.trim().length > 0
          ? error.message
          : 'Error interno del servidor al procesar y guardar la receta.',
    };
  }
}
