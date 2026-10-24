import type { Receta } from '@/types/recipe';
import type { MomentoDia, RolPlato } from '@/types/database';
import { inferRecipeCategory, isDessertExcludedFromSlot } from './recipeCategorizer';

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
  slot: 'desayuno' | 'almuerzo_1' | 'almuerzo_2' | 'cena' | 'snack_postre';
  receta: Receta;
}

export interface MealPlanGeneratorResult {
  items: PlanItemSugerido[];
  diasCompletos: number;
  estadisticas: {
    primerosAsignados: number;
    segundosAsignados: number;
    platosUnicosAsignados: number;
    advertencias: string[]; // Ej: "Pocas recetas de desayuno disponibles, se repitió 1 receta"
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
 * Formatea un objeto Date a string YYYY-MM-DD local
 */
function formatDateToYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Genera la secuencia de fechas a partir de la fecha de inicio
 */
function generateDates(fechaInicioStr: string, numDias: number): string[] {
  let baseDate: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaInicioStr)) {
    const [y, m, d] = fechaInicioStr.split('-').map(Number);
    baseDate = new Date(y, m - 1, d);
  } else {
    baseDate = new Date();
  }

  const result: string[] = [];
  for (let i = 0; i < numDias; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    result.push(formatDateToYYYYMMDD(d));
  }
  return result;
}

/**
 * Extrae metadatos culinarios homogéneos de cada receta
 */
function extractPlanningMeta(receta: Receta): RecipePlanningMeta {
  const hasSavedMoments = Array.isArray(receta.momentos_dia) && receta.momentos_dia.length > 0;
  const inferred = (!hasSavedMoments || !receta.rol_plato) ? inferRecipeCategory(receta) : null;

  const momentos: MomentoDia[] = hasSavedMoments
    ? (receta.momentos_dia as MomentoDia[])
    : (inferred?.momentos_dia || ['almuerzo', 'cena']);

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
 * Puntuación y selección inteligente de la mejor receta de un pool
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

  const scoredCandidates = pool.map((item) => {
    let score = 100;
    const timesUsedInPlan = usedCountMap.get(item.receta.id) || 0;

    // 1. Penalización masiva por reutilización dentro del mismo plan semanal
    score -= timesUsedInPlan * 1000;

    // 2. Penalización si se utilizó en el mismo día o en el día inmediatamente anterior
    const lastDate = lastUsedDateMap.get(item.receta.id);
    if (lastDate === currentDate) {
      score -= 800;
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

  // 1. Validación de entrada
  const numDias = Math.min(7, Math.max(1, opciones.dias || 7));
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
  const desayunosPool = allMetas.filter(
    (m) => (m.momentos.includes('desayuno') || m.rol === 'desayuno_snack') && !isDessertExcludedFromSlot(m.rol, 'desayuno')
  );

  const primerosPool = allMetas.filter(
    (m) => m.rol === 'primero' && !m.isDessert && !isDessertExcludedFromSlot(m.rol, 'almuerzo_1')
  );

  const segundosPool = allMetas.filter(
    (m) => m.rol === 'segundo' && !m.isDessert && !isDessertExcludedFromSlot(m.rol, 'almuerzo_2')
  );

  const completosPool = allMetas.filter(
    (m) => m.rol === 'completo' && !m.isDessert && !isDessertExcludedFromSlot(m.rol, 'almuerzo_1')
  );

  const cenasPool = allMetas.filter(
    (m) => (m.momentos.includes('cena') || m.rol === 'completo' || m.rol === 'primero' || m.rol === 'segundo') && !m.isDessert
  );

  const snacksPostresPool = allMetas.filter(
    (m) => m.momentos.includes('snack') || m.momentos.includes('postre') || m.isDessert || m.rol === 'desayuno_snack'
  );

  // Pool general de reserva para platos salados de almuerzo
  const almuerzoFallbackPool = allMetas.filter(
    (m) => !m.isDessert && m.rol !== 'desayuno_snack' && !isDessertExcludedFromSlot(m.rol, 'almuerzo_1')
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

  // 5. Bucle de asignación día a día
  for (const fecha of fechas) {
    // --- DESAYUNO ---
    if (opciones.incluirDesayunos) {
      const candidates = desayunosPool.length > 0 ? desayunosPool : allMetas.filter((m) => m.rol === 'desayuno_snack');
      const selected = pickBestRecipe(
        candidates,
        usedCountMap,
        recentHistorySet,
        lastUsedDateMap,
        fecha,
        null
      );

      if (selected) {
        items.push({ fecha, slot: 'desayuno', receta: selected.receta });
        usedCountMap.set(selected.receta.id, (usedCountMap.get(selected.receta.id) || 0) + 1);
        lastUsedDateMap.set(selected.receta.id, fecha);
      }
    }

    // --- ALMUERZO ---
    if (opciones.incluirAlmuerzos) {
      let pairedSuccessfully = false;

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

          // Excluimos temporalmente el primero elegido para que no coincida con el segundo
          const segundosDisponibles = segundosPool.filter((s) => s.receta.id !== primero?.receta.id);
          const segundo = pickBestRecipe(
            segundosDisponibles,
            usedCountMap,
            recentHistorySet,
            lastUsedDateMap,
            fecha,
            primero ? detectProteinGroup(primero) : null
          );

          if (primero && segundo) {
            items.push({ fecha, slot: 'almuerzo_1', receta: primero.receta });
            items.push({ fecha, slot: 'almuerzo_2', receta: segundo.receta });

            usedCountMap.set(primero.receta.id, (usedCountMap.get(primero.receta.id) || 0) + 1);
            usedCountMap.set(segundo.receta.id, (usedCountMap.get(segundo.receta.id) || 0) + 1);

            lastUsedDateMap.set(primero.receta.id, fecha);
            lastUsedDateMap.set(segundo.receta.id, fecha);

            primerosAsignados++;
            segundosAsignados++;
            pairedSuccessfully = true;
            lastMealGroup = detectProteinGroup(segundo) || detectProteinGroup(primero);
          }
        }

        if (!pairedSuccessfully) {
          fallbackPlatoUnicoOccurred = true;
        }
      }

      // Si no se emparejó (por no solicitarlo o por falta de stock de 1º/2º), asignar Plato Único
      if (!pairedSuccessfully) {
        const candidates = completosPool.length > 0 ? completosPool : almuerzoFallbackPool;
        const selected = pickBestRecipe(
          candidates,
          usedCountMap,
          recentHistorySet,
          lastUsedDateMap,
          fecha,
          lastMealGroup
        );

        if (selected) {
          items.push({ fecha, slot: 'almuerzo_1', receta: selected.receta });
          usedCountMap.set(selected.receta.id, (usedCountMap.get(selected.receta.id) || 0) + 1);
          lastUsedDateMap.set(selected.receta.id, fecha);

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
    if (opciones.incluirCenas) {
      const candidates = cenasPool.length > 0 ? cenasPool : almuerzoFallbackPool;
      const selected = pickBestRecipe(
        candidates,
        usedCountMap,
        recentHistorySet,
        lastUsedDateMap,
        fecha,
        lastMealGroup
      );

      if (selected) {
        items.push({ fecha, slot: 'cena', receta: selected.receta });
        usedCountMap.set(selected.receta.id, (usedCountMap.get(selected.receta.id) || 0) + 1);
        lastUsedDateMap.set(selected.receta.id, fecha);

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
    if (opciones.incluirSnackPostre) {
      const candidates = snacksPostresPool.length > 0 ? snacksPostresPool : allMetas;
      const selected = pickBestRecipe(
        candidates,
        usedCountMap,
        recentHistorySet,
        lastUsedDateMap,
        fecha,
        null
      );

      if (selected) {
        items.push({ fecha, slot: 'snack_postre', receta: selected.receta });
        usedCountMap.set(selected.receta.id, (usedCountMap.get(selected.receta.id) || 0) + 1);
        lastUsedDateMap.set(selected.receta.id, fecha);
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
  if (opciones.incluirAlmuerzos && !items.some((it) => it.slot === 'almuerzo_1')) {
    advertencias.push('No se encontraron recetas adecuadas de almuerzo en la colección.');
  }
  if (opciones.incluirCenas && !items.some((it) => it.slot === 'cena')) {
    advertencias.push('No se encontraron recetas adecuadas de cena en la colección.');
  }

  // 7. Cálculo de días completos
  let diasCompletos = 0;
  for (const fecha of fechas) {
    const dayItems = items.filter((it) => it.fecha === fecha);

    const hasDesayuno = !opciones.incluirDesayunos || dayItems.some((it) => it.slot === 'desayuno');
    const hasAlmuerzo = !opciones.incluirAlmuerzos || dayItems.some((it) => it.slot === 'almuerzo_1');
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

