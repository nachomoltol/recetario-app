'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getAdminClient } from '@/lib/supabase/server';
import { ensureMonthlyResetAndPlanSync } from '@/lib/quota/ensureMonthlyResetAndPlanSync';

// Bloqueo de concurrencia activo por usuario para evitar extracciones paralelas fraudulentas
const activeIngestUsers = new Set<string>();
import { extractRecipeWithGemini, detectFuenteTipo, sanitizeRecipeUrl } from '@/lib/gemini/extractor';
import { resolveCanonicalVideoSource, computeSourceUrlHash, repairBrokenTikTokUrl } from '@/lib/culinary/urlCanonicalizer';
import { getClinicalExclusions } from '@/lib/clinicalDictionary';
import { ExtractedIngredient, normalizarIngredientesExtraidos } from '@/lib/gemini/schema';
import { calcularGramos } from '@/lib/nutrition/converter';
import { IngredienteMaestro } from '@/types/recipe';
import { FuenteTipoReceta } from '@/types/database';
import { MAX_SPOON_MAGNITUDE } from '@/lib/nutrition/formatQuantity';

export interface IngestRecipeResult {
  success?: boolean;
  recetaId?: string;
  error?: string;
  message?: string;
}

export async function ingestRecipeAction(formData: FormData): Promise<IngestRecipeResult> {
  let authenticatedUserId: string | null = null;
  try {
    const rawUrl = (formData.get('url') as string)?.trim() || undefined;
    const canonicalSource = rawUrl ? await resolveCanonicalVideoSource(rawUrl) : undefined;
    // fuente_url conserva la URL funcional; el hash usa solo la clave abstracta de plataforma
    const url = canonicalSource?.url || sanitizeRecipeUrl(rawUrl);
    const sourceUrlHash = canonicalSource ? computeSourceUrlHash(canonicalSource.key) : undefined;
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

    // Límites estrictos de tamaño de entrada para prevenir DoS y costes descontrolados
    if (file && file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        error: 'El archivo adjunto supera el tamaño máximo permitido de 10 MB.',
      };
    }
    if (texto && texto.length > 15000) {
      return {
        success: false,
        error: 'El texto introducido supera el límite máximo de 15.000 caracteres.',
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

    authenticatedUserId = user.id;

    if (activeIngestUsers.has(user.id)) {
      return {
        success: false,
        error: 'Ya tienes una extracción de receta en proceso. Por favor, espera unos segundos a que finalice.',
      };
    }
    activeIngestUsers.add(user.id);

    // Cliente con permisos de administración para saltarse RLS al gestionar cuotas
    const adminClient = getAdminClient();
    const db = adminClient || supabase;

  // 2. Control de Cuotas Freemium / Premium y Anti-Fraude con Sincronización Mensual Compartida
  // Sincronizar reinicio mensual y validar estado de suscripción PRO con Stripe
  const syncRes = await ensureMonthlyResetAndPlanSync(user.id, rawDeviceId);

  const { data: perfilUsuario, error: perfilError } = await db
    .from('usuarios')
    .select(
      'id, plan_suscripcion, capturas_mes_actual, creditos_anuncio, fecha_ultimo_reinicio, antiguedad_ciclos_mes, raciones_defecto, preferencias_dieteticas, alergenos'
    )
    .eq('id', user.id)
    .single();

  if (perfilError) {
    console.error('[recipeIngest] Error al obtener perfil de usuario:', perfilError);
  }

  let capturasMesActual = Number(syncRes.usuario?.capturas_mes_actual ?? perfilUsuario?.capturas_mes_actual) || 0;
  let creditosAnuncio = Number(syncRes.usuario?.creditos_anuncio ?? perfilUsuario?.creditos_anuncio) || 0;
  let antiguedadCiclos = Number(syncRes.usuario?.antiguedad_ciclos_mes ?? perfilUsuario?.antiguedad_ciclos_mes) || 0;
  const rawPlan = (syncRes.usuario?.plan_suscripcion ?? perfilUsuario?.plan_suscripcion ?? '').trim().toLowerCase();
  const isPro = rawPlan === 'pro';

  // Anti-Fraude: Comprobación de cuota de dispositivo físico
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
    } else {
      await db.from('dispositivos_cuotas').insert({
        device_id: rawDeviceId,
        capturas_mes_actual: 0,
        fecha_ultimo_reinicio: new Date().toISOString(),
        antiguedad_ciclos_mes: 0,
        primer_usuario_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  // Cortafuegos de Límites Duros de Producción:
  // A) Usuario PRO: Techo estricto de 100 recetas por mes calendario
  if (isPro && capturasMesActual >= 100) {
    console.warn(`[recipeIngest] BLOQUEO DURO PRO: Usuario ${user.id} alcanzó el techo mensual de 100 generaciones.`);
    return {
      success: false,
      error: 'PRO_LIMIT_REACHED',
      message: 'Has alcanzado el límite mensual de 100 recetas en tu plan PRO. Tu cuota se reiniciará el día 1 del próximo mes.',
    };
  }

  // B) Usuario GRATUITO:
  if (!isPro) {
    // 1. Límite máximo inquebrantable de 20 recetas al mes
    if (capturasMesActual >= 20) {
      console.warn(`[recipeIngest] BLOQUEO DURO GRATUITO: Usuario ${user.id} alcanzó el límite mensual de 20 recetas.`);
      return {
        success: false,
        error: 'FREE_LIMIT_REACHED',
        message: 'Has alcanzado el límite máximo de 20 recetas gratis este mes. Pásate a PRO (3,50 €/mes) para continuar.',
      };
    }

    if (isValidoDeviceId && capturasDispositivo >= 20) {
      console.warn(`[recipeIngest] BLOQUEO ANTI-FRAUDE DISPOSITIVO: Dispositivo ${rawDeviceId} alcanzó el límite de 20 recetas.`);
      return {
        success: false,
        error: 'DEVICE_LIMIT_REACHED',
        message: 'Este dispositivo ha alcanzado el límite máximo de 20 recetas gratuitas este mes. Pásate a PRO para continuar.',
      };
    }

    // 2. Umbral de anuncios según antigüedad:
    // Mes 1 (antiguedadCiclos === 0): recetas 1, 2, 3 (capturas < 3) son directas. A partir de la 4.ª (capturas >= 3), requiere anuncio.
    // Mes 2+ (antiguedadCiclos > 0): requiere anuncio desde la 1.ª receta (capturas >= 0).
    const requiereAnuncio = antiguedadCiclos === 0 ? capturasMesActual >= 3 : true;

    if (requiereAnuncio && creditosAnuncio <= 0) {
      console.warn(`[recipeIngest] REQUISITO DE ANUNCIO: Usuario ${user.id} necesita anuncio (capturas=${capturasMesActual}, ciclo=${antiguedadCiclos}, créditos=${creditosAnuncio}).`);
      return {
        success: false,
        error: 'AD_REQUIRED',
        message: antiguedadCiclos === 0
          ? 'Has disfrutado de tus 3 recetas gratis del mes. Para extraer la 4.ª, visualiza un breve anuncio desde la app móvil o pásate a PRO.'
          : 'Para seguir extrayendo recetas gratis este mes, visualiza un breve anuncio desde la app móvil o pásate a PRO.',
      };
    }
  }

  // Calcular restricciones clínicas del usuario únicamente para generar alertas informativas de compatibilidad
  const alertasClinicas = getClinicalExclusions({
    preferencias: perfilUsuario?.preferencias_dieteticas || [],
    alergenos: perfilUsuario?.alergenos || [],
  });

  // 2.5 Caché Semántica de Vídeos Virales (P2)
  // Búsqueda cruzada por hash SHA-256 canónico en la base de datos antes de invocar a Gemini
  if (sourceUrlHash) {
    try {
      const { data: cachedRecipe, error: cachedError } = await db
        .from('recetas')
        .select('*, receta_ingredientes(*), pasos(*)')
        .eq('source_url_hash', sourceUrlHash)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!cachedError && cachedRecipe) {
        // Escenario A: La receta ya pertenece al usuario actual (idempotencia instantánea)
        if (cachedRecipe.usuario_id === user.id) {
          console.log(`[recipeIngest] Cache Hit (propietario): Receta ${cachedRecipe.id} ya pertenece al usuario ${user.id}. Retornando inmediatamente.`);
          revalidatePath('/recipes', 'page');
          revalidatePath('/recipes/collection', 'page');
          revalidatePath(`/recipes/${cachedRecipe.id}`, 'page');
          return { success: true, recetaId: cachedRecipe.id };
        }

        // Escenario B: La receta existe en Supabase extraída previamente por otro usuario -> Clonación instantánea en lote
        console.log(`[recipeIngest] Cache Hit Semántico: Vídeo viral detectado con hash ${sourceUrlHash}. Clonando plantilla ${cachedRecipe.id} para usuario ${user.id}...`);

        const recetaClonadaPayload = {
          usuario_id: user.id,
          titulo: cachedRecipe.titulo,
          descripcion: cachedRecipe.descripcion,
          tiempo_preparacion_min: cachedRecipe.tiempo_preparacion_min,
          tiempo_coccion_min: cachedRecipe.tiempo_coccion_min,
          porciones: cachedRecipe.porciones,
          dificultad: cachedRecipe.dificultad,
          fuente_tipo: cachedRecipe.fuente_tipo,
          fuente_url: repairBrokenTikTokUrl(cachedRecipe.fuente_url) ?? url ?? null,
          imagen_portada_url: cachedRecipe.imagen_portada_url,
          foto_url: cachedRecipe.foto_url,
          calorias_por_porcion: cachedRecipe.calorias_por_porcion,
          proteinas_por_porcion: cachedRecipe.proteinas_por_porcion,
          carbohidratos_por_porcion: cachedRecipe.carbohidratos_por_porcion,
          grasas_por_porcion: cachedRecipe.grasas_por_porcion,
          fibra_por_porcion: cachedRecipe.fibra_por_porcion,
          etiquetas: cachedRecipe.etiquetas || [],
          momentos_dia: cachedRecipe.momentos_dia || [],
          rol_plato: cachedRecipe.rol_plato || 'completo',
          receta_original: cachedRecipe.receta_original,
          source_url_hash: sourceUrlHash,
        };

        let { data: nuevaRecetaClonada, error: errClone } = await supabase
          .from('recetas')
          .insert(recetaClonadaPayload)
          .select()
          .single();

        if (errClone && /source_url_hash/i.test(errClone.message || '')) {
          console.warn("Advertencia: Columna 'source_url_hash' no disponible en schema cache de PostgREST al clonar receta. Reintentando sin ella:", errClone.message);
          const { source_url_hash: _, ...fallbackPayload } = recetaClonadaPayload;
          const retryResult = await supabase
            .from('recetas')
            .insert(fallbackPayload as any)
            .select()
            .single();
          nuevaRecetaClonada = retryResult.data;
          errClone = retryResult.error;
        }

        if (!errClone && nuevaRecetaClonada) {
          // Clonar ingredientes respetando orden y rol culinario
          const sortedIngs = ((cachedRecipe.receta_ingredientes as any[]) || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
          if (sortedIngs.length > 0) {
            const clonedIngsPayload = sortedIngs.map((i, idx) => ({
              receta_id: nuevaRecetaClonada.id,
              ingrediente_maestro_id: i.ingrediente_maestro_id || null,
              nombre_crudo: i.nombre_crudo || 'Ingrediente',
              nombre_limpio: i.nombre_limpio || 'Ingrediente',
              cantidad: i.cantidad ?? 1,
              unidad: i.unidad || 'unidad',
              gramos_calculados: i.gramos_calculados ?? 0,
              pasillo_supermercado: i.pasillo_supermercado || 'Despensa y Especias',
              notas: i.notas || null,
              es_opcional: Boolean(i.es_opcional),
              orden: idx + 1,
              rol_culinario: i.rol_culinario || null,
              seccion: i.seccion || null,
            }));

            let { error: errClonedIngs } = await supabase
              .from('receta_ingredientes')
              .insert(clonedIngsPayload);

            if (errClonedIngs && /seccion/i.test(errClonedIngs.message || '')) {
              console.warn("Advertencia: Columna 'seccion' no disponible al clonar ingredientes. Reintentando sin ella.");
              const fallbackIngs = clonedIngsPayload.map(({ seccion, ...rest }) => rest);
              await supabase.from('receta_ingredientes').insert(fallbackIngs as any);
            }
          }

          // Clonar pasos con los 3 niveles pedagógicos
          const sortedPasos = ((cachedRecipe.pasos as any[]) || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
          if (sortedPasos.length > 0) {
            const clonedPasosPayload = sortedPasos.map((p, idx) => ({
              receta_id: nuevaRecetaClonada.id,
              orden: idx + 1,
              instruccion: p.instruccion || 'Preparación según indicaciones del vídeo.',
              instruccion_principiante: p.instruccion_principiante || null,
              instruccion_avanzada: p.instruccion_avanzada || null,
              descriptor_sensorial: p.descriptor_sensorial || null,
              potencia_fuego: p.potencia_fuego || null,
              tiempo_estimado_min: typeof p.tiempo_estimado_min === 'number' && p.tiempo_estimado_min > 0 ? p.tiempo_estimado_min : null,
              temperatura_celsius: typeof p.temperatura_celsius === 'number' && p.temperatura_celsius > 0 ? p.temperatura_celsius : null,
              consejo_pro: p.consejo_pro || null,
              utensilios_sugeridos: p.utensilios_sugeridos || [],
              imagen_paso_url: p.imagen_paso_url || null,
            }));

            let { error: errClonedPasos } = await supabase.from('pasos').insert(clonedPasosPayload);

            if (errClonedPasos && /instruccion_principiante/i.test(errClonedPasos.message || '')) {
              const withoutPrincipiante = clonedPasosPayload.map(({ instruccion_principiante, ...rest }: any) => rest);
              const retryRes1 = await supabase.from('pasos').insert(withoutPrincipiante as any);
              errClonedPasos = retryRes1.error;
            }
            if (errClonedPasos && /instruccion_avanzada|descriptor_sensorial|potencia_fuego/i.test(errClonedPasos.message || '')) {
              const fallbackPasos = clonedPasosPayload.map(({ instruccion_principiante, instruccion_avanzada, descriptor_sensorial, potencia_fuego, ...rest }: any) => rest);
              await supabase.from('pasos').insert(fallbackPasos as any);
            }
          }

          // Descontar crédito por anuncio (si aplica) e incrementar cuota mensual de generación (+1)
          const { data: usuarioFresco } = await db
            .from('usuarios')
            .select('capturas_mes_actual, creditos_anuncio')
            .eq('id', user.id)
            .single();

          const frescoCreditos = Number(usuarioFresco?.creditos_anuncio) || 0;
          const conteoBase = Number(usuarioFresco?.capturas_mes_actual) || capturasMesActual;
          const requiereAnuncioEstaReceta = !isPro && (antiguedadCiclos === 0 ? conteoBase >= 3 : true);
          const usoCreditoAnuncio = requiereAnuncioEstaReceta && frescoCreditos > 0;
          const nuevoConteo = conteoBase + 1;

          const updateUsuarioPayload = {
            capturas_mes_actual: nuevoConteo,
            updated_at: new Date().toISOString(),
            ...(usoCreditoAnuncio
              ? { creditos_anuncio: Math.max(0, frescoCreditos - 1) }
              : {}),
          };

          if (usoCreditoAnuncio) {
            console.log(
              `[recipeIngest] Caché semántica: Crédito por anuncio consumido (-1). Saldo restante: ${Math.max(0, frescoCreditos - 1)} para usuario ${user.id}.`
            );
          }

          await db
            .from('usuarios')
            .update(updateUsuarioPayload)
            .eq('id', user.id);

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

          // Revalidación exhaustiva de Next.js
          revalidatePath('/recipes', 'page');
          revalidatePath('/recipes/collection', 'page');
          revalidatePath(`/recipes/${nuevaRecetaClonada.id}`, 'page');
          revalidatePath('/', 'layout');

          console.log(`[recipeIngest] Cache Hit Semántico (<150ms): Receta clonada exitosamente para ${user.id} desde plantilla ${cachedRecipe.id} (${nuevaRecetaClonada.id}) sin consumo de tokens de Gemini.`);
          return { success: true, recetaId: nuevaRecetaClonada.id };
        }
      }
    } catch (cacheLookupErr) {
      console.warn('[recipeIngest] Excepción en búsqueda de caché semántica, procediendo con extracción habitual:', cacheLookupErr);
    }
  }

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
    // Guardar las porciones originales nativas de la receta según la extracción.
    // PRINCIPIO DEL ANCLA CULINARIA: Si la receta no especifica raciones, calibrar a partir del ingrediente ancla
    let porcionesNum = Number(extracted.porciones);
    if (!porcionesNum || isNaN(porcionesNum) || porcionesNum <= 0) {
      const anchorIng = (extracted.ingredientes || []).find((i) => (i as any).rol_culinario === 'principal');
      const anchorGrams = Number(anchorIng?.gramos_estimados) || Number(anchorIng?.cantidad) || 0;
      if (anchorGrams > 0) {
        // Estándar biológico de plato principal (~180 g de proteína o carbohidrato base)
        porcionesNum = Math.max(1, Math.round(anchorGrams / 180));
      } else {
        porcionesNum = 2;
      }
    }
    const factorEscalado = 1;

    // 4. Inserción en 'recetas'
    const recetaPayload = {
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
      source_url_hash: sourceUrlHash || null,
    };

    let { data: nuevaReceta, error: errReceta } = await supabase
      .from('recetas')
      .insert(recetaPayload)
      .select()
      .single();

    if (errReceta && /source_url_hash/i.test(errReceta.message || '')) {
      console.warn("Advertencia: Columna 'source_url_hash' no disponible en schema cache de PostgREST al insertar receta. Reintentando sin ella:", errReceta.message);
      const { source_url_hash: _, ...fallbackPayload } = recetaPayload;
      const retryResult = await supabase
        .from('recetas')
        .insert(fallbackPayload as any)
        .select()
        .single();
      nuevaReceta = retryResult.data;
      errReceta = retryResult.error;
    }

    if (errReceta || !nuevaReceta) {
      console.error('Error insertando receta cabecera:', errReceta);
      return { error: `Error guardando la receta en base de datos: ${errReceta?.message || 'Error desconocido'}` };
    }

    // 5. Preparar e insertar en 'receta_ingredientes' de forma blindada
    const rawIngredientes: ExtractedIngredient[] = extracted.ingredientes && extracted.ingredientes.length > 0
      ? normalizarIngredientesExtraidos(extracted.ingredientes, {
          idioma,
          rolPlato: extracted.rol_plato,
          titulo: extracted.titulo,
          categorias: extracted.categorias_gastronomicas,
          momentos: extracted.momentos_consumo,
          etiquetas: extracted.etiquetas,
        })
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

      let rawCantidad = factorEscalado !== 1
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

      // LEY UNIVERSAL DE MAGNITUD DE UNIDADES CULINARIAS (BARRERA <= 60):
      // Las unidades de cuchara quedan restringidas EXCLUSIVAMENTE a magnitud <= 60.
      // Cualquier ingrediente con cantidad/magnitud > 60 queda terminantemente bloqueado para cuchara.
      const isSpoonIngest = /^(cucharada|cucharadas|cucharadita|cucharaditas|tbsp|tsp|cda|cdas|cdita|cditas)$/i.test(uLower);
      if (isSpoonIngest) {
        const isTspIngest = /^(cucharadita|cucharaditas|tsp|cdita|cditas)$/i.test(uLower);
        const spoonMagnitude = rawCantidad * (isTspIngest ? 5 : 15);
        if (rawCantidad > MAX_SPOON_MAGNITUDE || spoonMagnitude > MAX_SPOON_MAGNITUDE) {
          if (rawCantidad <= MAX_SPOON_MAGNITUDE) {
            rawCantidad = spoonMagnitude;
          }
          rawUnidad = uLower.includes('ml') ? 'ml' : 'g';
        }
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
        rol_culinario: (ing as any).rol_culinario || null,
        seccion: (ing as any).seccion || null,
      };
    });

    let { error: errIngredientes } = await supabase
      .from('receta_ingredientes')
      .insert(ingredientesPayload);

    // Tolerancia a fallos: Si la columna 'seccion' aún no está en el schema cache de PostgREST, reintentar sin 'seccion'
    if (errIngredientes && /seccion/i.test(errIngredientes.message || '')) {
      console.warn(
        "Advertencia: Columna 'seccion' no disponible en schema cache de PostgREST. Reintentando inserción sin 'seccion':",
        errIngredientes.message
      );
      const fallbackPayload = ingredientesPayload.map(({ seccion, ...rest }) => rest);
      const retryResult = await supabase
        .from('receta_ingredientes')
        .insert(fallbackPayload as any);
      errIngredientes = retryResult.error;
    }

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

    const pasosPayload = rawPasos.map((p, idx) => {
      const instruccionBase = (p.instruccion || 'Preparación según indicaciones del vídeo.').trim();
      return {
        receta_id: nuevaReceta.id,
        orden: idx + 1, // CRÍTICO: idx + 1 garantiza que no haya duplicados ni valores <= 0
        instruccion: instruccionBase,
        instruccion_principiante: null,
        instruccion_avanzada: null,
        descriptor_sensorial: null,
        potencia_fuego: p.potencia_fuego ? p.potencia_fuego.trim() : null,
        tiempo_estimado_min: typeof p.tiempo_estimado_min === 'number' && p.tiempo_estimado_min > 0 ? p.tiempo_estimado_min : null,
        temperatura_celsius: typeof p.temperatura_celsius === 'number' && p.temperatura_celsius > 0 ? p.temperatura_celsius : null,
        consejo_pro: p.consejo_pro ? p.consejo_pro.trim() : null,
        utensilios_sugeridos: [],
      };
    });

    let { error: errPasos } = await supabase.from('pasos').insert(pasosPayload);

    // Tolerancia a fallos: Si alguna de las columnas nuevas de nivel culinario no estuviese disponible en el schema cache de PostgREST, reintentar sin ellas
    if (errPasos && /instruccion_principiante/i.test(errPasos.message || '')) {
      const withoutPrincipiante = pasosPayload.map(({ instruccion_principiante, ...rest }: any) => rest);
      const retryRes1 = await supabase.from('pasos').insert(withoutPrincipiante as any);
      errPasos = retryRes1.error;
    }
    if (errPasos && /instruccion_avanzada|descriptor_sensorial|potencia_fuego/i.test(errPasos.message || '')) {
      console.warn('Advertencia: Columnas de nivel culinario no disponibles en schema cache de pasos, reintentando inserción básica:', errPasos.message);
      const fallbackPasos = pasosPayload.map(({ instruccion_principiante, instruccion_avanzada, descriptor_sensorial, potencia_fuego, ...rest }: any) => rest);
      const retryResult = await supabase.from('pasos').insert(fallbackPasos as any);
      errPasos = retryResult.error;
    }

    if (errPasos) {
      console.error('Error insertando pasos, ejecutando rollback:', errPasos);
      await supabase.from('recetas').delete().eq('id', nuevaReceta.id);
      return { error: `Error guardando los pasos: ${errPasos.message}` };
    }

    // 6. Descontar crédito por anuncio (si aplica) e incrementar cuota mensual de generación (+1)
    const { data: usuarioFresco } = await db
      .from('usuarios')
      .select('capturas_mes_actual, creditos_anuncio')
      .eq('id', user.id)
      .single();

    const frescoCreditos = Number(usuarioFresco?.creditos_anuncio) || 0;
    const conteoBase = Number(usuarioFresco?.capturas_mes_actual) || capturasMesActual;
    const requiereAnuncioEstaReceta = !isPro && (antiguedadCiclos === 0 ? conteoBase >= 3 : true);
    const usoCreditoAnuncio = requiereAnuncioEstaReceta && frescoCreditos > 0;
    const nuevoConteo = conteoBase + 1;

    const updateUsuarioPayload = {
      capturas_mes_actual: nuevoConteo,
      updated_at: new Date().toISOString(),
      ...(usoCreditoAnuncio
        ? { creditos_anuncio: Math.max(0, frescoCreditos - 1) }
        : {}),
    };

    if (usoCreditoAnuncio) {
      console.log(
        `[recipeIngest] Crédito por anuncio consumido (-1). Saldo restante: ${Math.max(0, frescoCreditos - 1)} para usuario ${user.id}.`
      );
    }

    const { data: updatedRows, error: errUpdateCuota } = await db
      .from('usuarios')
      .update(updateUsuarioPayload)
      .eq('id', user.id)
      .select('id, capturas_mes_actual');

    if (errUpdateCuota) {
      console.error('[recipeIngest] ERROR al actualizar cuota y créditos de usuario:', errUpdateCuota);
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
  } finally {
    // Liberar bloqueo de concurrencia del usuario
    try {
      if (authenticatedUserId) activeIngestUsers.delete(authenticatedUserId);
    } catch {}
  }
}
