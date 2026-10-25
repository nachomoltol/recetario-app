import type { Receta } from '@/types/recipe';
import type { MomentoDia, RolPlato } from '@/types/database';
import { inferRecipeCategory, isDessertExcludedFromSlot } from './recipeCategorizer';
import { formatLocalDate, parseLocalDate } from '@/lib/dateUtils';

export interface MealPlanGeneratorOptions {
  dias: number; // Entre 1 y 7
  fechaInicio: string; // Formato YYYY-MM-DD
  incluirDesayunos: boolean;
  incluirAlmuerzos: boolean;
  intentarPrimeroYSegundo: boolean; // Si es true, empareja 1º + 2º en almuerzo cuando sea posible
  incluirCenas: boolean;
  incluirSnackPostre?: boolean;
  historialRecientesIds?: string[]; // IDs de recetas usadas en las últimas 2-4 semanas para evitar repeticiones
}

export interface PlanItemSugerido {
  fecha: string;
  slot: 'desayuno' | 'almuerzo' | 'almuerzo_1' | 'almuerzo_2' | 'cena' | 'snack_postre';
  receta: Receta;
}

export interface MealPlanGeneratorResult {
  items: PlanItemSugerido[];
  diasCompletos: number;
  estadisticas: {
    primerosAsignados: number;
    segundosAsignados: number;
    platosUnicosAsignados: number;
    advertencias: string[];
  };
}

/**
 * Metadata culinaria resuelta para una receta (usando datos guardados o inferencia heurística)
 */
interface RecipePlanningMeta {
  receta: Receta;
  momentos: MomentoDia[];
  rol: RolPlato;
  esFavorito: boolean;
  isDessert: boolean;
  tagsNorm: string[];
}

/**
 * Palabras clave para balance de proteínas entre comidas consecutivas
 */
const PROTEIN_GROUPS = {
  carne: ['carne', 'pollo', 'pavo', 'ternera', 'cerdo', 'ave', 'hamburguesa', 'solomillo', 'costilla', 'cordero'],
  pescado: ['pescado', 'atun', 'salmon', 'merluza', 'bacalao', 'marisco', 'gambas', 'langostinos', 'calamar'],
  pasta_arroz: ['pasta', 'espaguetis', 'macarrones', 'arroz', 'paella', 'fideos', 'risotto', 'lasana', 'gnocchi'],
  legumbres: ['lentejas', 'garbanzos', 'alubias', 'judias', 'frijoles'],
  verduras: ['verduras', 'ensalada', 'crema', 'sopa', 'espinacas', 'calabacin', 'brocoli'],
};

/**
 * Genera la secuencia matemática estricta de fechas a partir de la fecha de inicio.
 * Cero ajustes al lunes: si el usuario define fecha de inicio, empieza exactamente en ella.
 * Si numDias = 5 y fechaInicio = '2026-10-26', genera exactamente:
 * ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'].
 * Queda terminantemente prohibido generar o tocar slots del domingo anterior o sábado posterior.
 */
function generateDates(fechaInicioStr: string, numDias: number): string[] {
  const safeDias = Math.min(7, Math.max(1, Math.floor(numDias)));
  const baseDate = parseLocalDate(fechaInicioStr);

  const result: string[] = [];
  for (let i = 0; i < safeDias; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + i, 12, 0, 0, 0);
    result.push(formatLocalDate(d));
  }
  return result;
}

/**
 * Extrae metadatos culinarios homogéneos de cada receta con TOLERANCIA CERO A COMODINES:
 * Única y exclusivamente momentos explícitamente etiquetados en la receta (momentos_dia o momentos_recomendados).
 * Queda prohibido inferir o asignar momentos cruzados (ej. almuerzo en cenas o viceversa).
 */
function extractPlanningMeta(receta: Receta): RecipePlanningMeta {
  const rawMoments = (
    Array.isArray(receta.momentos_dia) && receta.momentos_dia.length > 0
      ? (receta.momentos_dia as string[])
      : ((receta as any).momentos_recomendados as string[]) || []
  )
    .filter(Boolean)
    .map((m) => String(m).toLowerCase().trim() as MomentoDia);

  // Exigencia estricta: solo los momentos explícitamente guardados en la receta (cero comodines/inferencias cruzadas)
  const momentos: MomentoDia[] = rawMoments;

  const inferred = (!receta.rol_plato) ? inferRecipeCategory(receta) : null;
  let rol: RolPlato = receta.rol_plato || inferred?.rol_plato || 'completo';
  if (momentos.includes('postre')) {
    rol = 'postre';
  }

  const tagsNorm = (receta.etiquetas || []).map((t) => t.toLowerCase().trim());
  const titleNorm = receta.titulo.toLowerCase();

  return {
    receta,
    momentos,
    rol,
    esFavorito: Boolean(receta.es_favorito_menu),
    isDessert: rol === 'postre' || momentos.includes('postre'),
    tagsNorm: [...tagsNorm, ...titleNorm.split(/\s+/)],
  };
}

/**
 * Detecta qué grupo proteico o base tiene una receta para favorecer la alternancia culinaria
 */
function detectProteinGroup(meta: RecipePlanningMeta): string | null {
  for (const [group, keywords] of Object.entries(PROTEIN_GROUPS)) {
    const match = meta.tagsNorm.some((tag) => keywords.some((kw) => tag.includes(kw)));
    if (match) return group;
  }
  return null;
}

/**
 * Puntuación y selección inteligente con BLOQUEO ANTIRREPETICIÓN INTRA-SEMANAL estricto:
 * Si existen recetas alternativas válidas en el pool sin usar en la semana,
 * se excluyen al 100% las recetas ya asignadas.
 */
function pickBestRecipe(
  pool: RecipePlanningMeta[],
  usedCountMap: Map<string, number>,
  recentHistorySet: Set<string>,
  lastUsedDateMap: Map<string, string>,
  currentDate: string,
  previousMealGroup: string | null
): RecipePlanningMeta | null {
  if (pool.length === 0) return null;

  // Bloqueo antirrepetición intra-semanal:
  // Si hay recetas válidas en el pool que no se hayan usado todavía en este plan,
  // excluimos por completo cualquier receta ya usada.
  const unusedCandidates = pool.filter((item) => (usedCountMap.get(item.receta.id) || 0) === 0);
  const candidatePool = unusedCandidates.length > 0 ? unusedCandidates : pool;

  const scoredCandidates = candidatePool.map((item) => {
    let score = 100;
    const timesUsedInPlan = usedCountMap.get(item.receta.id) || 0;

    // 1. Penalización masiva si ya se utilizó en el mismo plan semanal (cuando no hay alternativas)
    score -= timesUsedInPlan * 10000;

    // 2. Penalización si se utilizó en el mismo día o en el día inmediatamente anterior
    const lastDate = lastUsedDateMap.get(item.receta.id);
    if (lastDate === currentDate) {
      score -= 2000;
    }

    // 3. Penalización por historial reciente de semanas anteriores
    if (recentHistorySet.has(item.receta.id)) {
      score -= 250;
    }

    // 4. Bonificación para recetas marcadas como "Favorito para menús"
    if (item.esFavorito) {
      score += 150;
    }

    // 5. Alternancia proteica: evitar repetir carne/pescado consecutivo
    const candidateGroup = detectProteinGroup(item);
    if (candidateGroup && previousMealGroup && candidateGroup === previousMealGroup) {
      score -= 60;
    }

    // 6. Pequeño factor aleatorio determinista para enriquecer la variedad
    const jitter = Math.floor(Math.random() * 20);
    score += jitter;

    return { item, score };
  });

  scoredCandidates.sort((a, b) => b.score - a.score);
  return scoredCandidates[0]?.item || null;
}

/**
 * Motor algorítmico principal de generación inteligente de menús semanales
 */
export function generateMealPlan(
  recetasDisponibles: Receta[],
  opciones: MealPlanGeneratorOptions
): MealPlanGeneratorResult {
  const advertencias: string[] = [];

  // 1. Validación de entrada y duración estricta
  const numDias = Math.min(7, Math.max(1, Math.floor(opciones.dias || 5)));
  const fechas = generateDates(opciones.fechaInicio, numDias);

  if (!recetasDisponibles || recetasDisponibles.length === 0) {
    return {
      items: [],
      diasCompletos: 0,
      estadisticas: {
        primerosAsignados: 0,
        segundosAsignados: 0,
        platosUnicosAsignados: 0,
        advertencias: ['No hay recetas disponibles en la colección para generar el menú.'],
      },
    };
  }

  // 2. Extracción y catalogación de metadatos de las recetas
  const allMetas = recetasDisponibles.map(extractPlanningMeta);
  const recentHistorySet = new Set(opciones.historialRecientesIds || []);

  // 3. Creación de Pools por momento y rol culinario
  // Exigencia estricta: Cada pool contiene única y exclusivamente recetas que tengan el momento etiquetado
  const desayunosPool = allMetas.filter(
    (m) => m.momentos.includes('desayuno') && !isDessertExcludedFromSlot(m.rol, 'desayuno')
  );

  const almuerzoPool = allMetas.filter(
    (m) => m.momentos.includes('almuerzo') && !m.isDessert && !isDessertExcludedFromSlot(m.rol, 'almuerzo')
  );

  const primerosPool = almuerzoPool.filter(
    (m) => m.rol === 'primero'
  );

  const segundosPool = almuerzoPool.filter(
    (m) => m.rol === 'segundo'
  );

  const almuerzoCompletosPool = almuerzoPool.filter(
    (m) => m.rol === 'completo'
  );

  const cenasPool = allMetas.filter(
    (m) => m.momentos.includes('cena') && !m.isDessert
  );

  const snacksPostresPool = allMetas.filter(
    (m) => m.momentos.includes('snack') || m.momentos.includes('postre')
  );

  // 4. Estados de asignación y conteo
  const items: PlanItemSugerido[] = [];
  const usedCountMap = new Map<string, number>();
  const lastUsedDateMap = new Map<string, string>();

  let primerosAsignados = 0;
  let segundosAsignados = 0;
  let platosUnicosAsignados = 0;

  let fallbackPlatoUnicoOccurred = false;
  let lastMealGroup: string | null = null;

  // Helper para registrar uso de una receta
  const markAssigned = (meta: RecipePlanningMeta, fecha: string) => {
    usedCountMap.set(meta.receta.id, (usedCountMap.get(meta.receta.id) || 0) + 1);
    lastUsedDateMap.set(meta.receta.id, fecha);
  };

  // 5. Bucle de asignación día a día (estrictamente numDias iteraciones)
  for (const fecha of fechas) {
    // --- DESAYUNO ---
    if (opciones.incluirDesayunos && desayunosPool.length > 0) {
      const selected = pickBestRecipe(
        desayunosPool,
        usedCountMap,
        recentHistorySet,
        lastUsedDateMap,
        fecha,
        null
      );

      if (selected) {
        items.push({ fecha, slot: 'desayuno', receta: selected.receta });
        markAssigned(selected, fecha);
      }
    }

    // --- ALMUERZO ---
    if (opciones.incluirAlmuerzos && almuerzoPool.length > 0) {
      let pairedSuccessfully = false;

      // Respeto estricto: Solo si el switch intentarPrimeroYSegundo está encendido
      if (opciones.intentarPrimeroYSegundo) {
        const canTryPair = primerosPool.length > 0 && segundosPool.length > 0;

        if (canTryPair) {
          const primero = pickBestRecipe(
            primerosPool,
            usedCountMap,
            recentHistorySet,
            lastUsedDateMap,
            fecha,
            lastMealGroup
          );

          if (primero) {
            // Excluir la receta elegida para el primer plato para no repetirla en el segundo
            const segundosDisponibles = segundosPool.filter((s) => s.receta.id !== primero.receta.id);
            const segundo = pickBestRecipe(
              segundosDisponibles,
              usedCountMap,
              recentHistorySet,
              lastUsedDateMap,
              fecha,
              detectProteinGroup(primero)
            );

            if (segundo) {
              items.push({ fecha, slot: 'almuerzo_1', receta: primero.receta });
              items.push({ fecha, slot: 'almuerzo_2', receta: segundo.receta });

              markAssigned(primero, fecha);
              markAssigned(segundo, fecha);

              primerosAsignados++;
              segundosAsignados++;
              pairedSuccessfully = true;
              lastMealGroup = detectProteinGroup(segundo) || detectProteinGroup(primero);
            }
          }
        }

        if (!pairedSuccessfully) {
          fallbackPlatoUnicoOccurred = true;
        }
      }

      // Si no se emparejó (switch apagado o falta de stock), asignar única y exclusivamente Plato Único ('almuerzo')
      if (!pairedSuccessfully) {
        const candidates = almuerzoCompletosPool.length > 0 ? almuerzoCompletosPool : almuerzoPool;
        const selected = pickBestRecipe(
          candidates,
          usedCountMap,
          recentHistorySet,
          lastUsedDateMap,
          fecha,
          lastMealGroup
        );

        if (selected) {
          items.push({ fecha, slot: 'almuerzo', receta: selected.receta });
          markAssigned(selected, fecha);

          if (selected.rol === 'primero') {
            primerosAsignados++;
          } else if (selected.rol === 'segundo') {
            segundosAsignados++;
          } else {
            platosUnicosAsignados++;
          }
          lastMealGroup = detectProteinGroup(selected);
        }
      }
    }

    // --- CENA ---
    if (opciones.incluirCenas && cenasPool.length > 0) {
      const selected = pickBestRecipe(
        cenasPool,
        usedCountMap,
        recentHistorySet,
        lastUsedDateMap,
        fecha,
        lastMealGroup
      );

      if (selected) {
        items.push({ fecha, slot: 'cena', receta: selected.receta });
        markAssigned(selected, fecha);

        if (selected.rol === 'primero') {
          primerosAsignados++;
        } else if (selected.rol === 'segundo') {
          segundosAsignados++;
        } else {
          platosUnicosAsignados++;
        }
        lastMealGroup = detectProteinGroup(selected);
      }
    }

    // --- SNACK O POSTRE ---
    if (opciones.incluirSnackPostre && snacksPostresPool.length > 0) {
      const selected = pickBestRecipe(
        snacksPostresPool,
        usedCountMap,
        recentHistorySet,
        lastUsedDateMap,
        fecha,
        null
      );

      if (selected) {
        items.push({ fecha, slot: 'snack_postre', receta: selected.receta });
        markAssigned(selected, fecha);
      }
    }
  }

  // 6. Detección de advertencias y compromisos del algoritmo
  let totalReusedCount = 0;
  for (const [_, count] of usedCountMap.entries()) {
    if (count > 1) {
      totalReusedCount += count - 1;
    }
  }

  if (totalReusedCount > 0) {
    if (opciones.incluirDesayunos && desayunosPool.length > 0 && desayunosPool.length < numDias) {
      advertencias.push(`Pocas recetas de desayuno disponibles (${desayunosPool.length}); se reutilizaron opciones para completar los ${numDias} días.`);
    } else {
      advertencias.push(`Se repitieron ${totalReusedCount} receta(s) en el plan debido al tamaño de la colección.`);
    }
  }

  if (opciones.intentarPrimeroYSegundo && fallbackPlatoUnicoOccurred) {
    advertencias.push('No se encontraron suficientes primeros y segundos platos para emparejar en todos los almuerzos; se asignaron platos únicos en su lugar.');
  }

  // Comprobar slots completamente vacíos
  if (opciones.incluirDesayunos && !items.some((it) => it.slot === 'desayuno')) {
    advertencias.push('No se encontraron recetas adecuadas de desayuno en la colección.');
  }
  if (opciones.incluirAlmuerzos && !items.some((it) => it.slot === 'almuerzo' || it.slot === 'almuerzo_1')) {
    advertencias.push('No se encontraron recetas adecuadas de almuerzo en la colección.');
  }
  if (opciones.incluirCenas && !items.some((it) => it.slot === 'cena')) {
    advertencias.push('No se encontraron recetas adecuadas de cena en la colección.');
  }
  if (opciones.incluirSnackPostre && !items.some((it) => it.slot === 'snack_postre')) {
    advertencias.push('No se encontraron recetas adecuadas de snack o postre en la colección.');
  }

  // 7. Cálculo de días completos
  let diasCompletos = 0;
  for (const fecha of fechas) {
    const dayItems = items.filter((it) => it.fecha === fecha);

    const hasDesayuno = !opciones.incluirDesayunos || dayItems.some((it) => it.slot === 'desayuno');
    const hasAlmuerzo = !opciones.incluirAlmuerzos || dayItems.some((it) => it.slot === 'almuerzo' || it.slot === 'almuerzo_1');
    const hasCena = !opciones.incluirCenas || dayItems.some((it) => it.slot === 'cena');
    const hasSnack = !opciones.incluirSnackPostre || dayItems.some((it) => it.slot === 'snack_postre');

    if (hasDesayuno && hasAlmuerzo && hasCena && hasSnack) {
      diasCompletos++;
    }
  }

  return {
    items,
    diasCompletos,
    estadisticas: {
      primerosAsignados,
      segundosAsignados,
      platosUnicosAsignados,
      advertencias,
    },
  };
}

export const generateSmartMealPlan = generateMealPlan;
