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
 * Metadata culinaria resuelta para una receta
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
 * Grupos de alimentos y fuentes de proteína para equilibrio culinario
 */
export type ProteinGroup = 'carne_ave' | 'pescado_marisco' | 'legumbres_vegetariano' | 'pasta_huevos';

export const PROTEIN_GROUPS: Record<ProteinGroup, string[]> = {
  carne_ave: [
    'pollo', 'pavo', 'ternera', 'cerdo', 'carne', 'ave', 'hamburguesa', 'solomillo',
    'costilla', 'cordero', 'albondigas', 'albondiga', 'albondiguillas', 'conejo',
    'lomo', 'pechuga', 'alitas', 'picada', 'buey', 'magro', 'bacon', 'jamon',
    'panceta', 'chorizo', 'embutido', 'vacuno', 'salchicha', 'salchichas', 'secreto',
    'presa', 'morcilla', 'butifarra', 'chistorra', 'bistec', 'entrecot', 'guiso de carne',
    'estofado de carne', 'alitas de pollo'
  ],
  pescado_marisco: [
    'pescado', 'atun', 'salmon', 'merluza', 'bacalao', 'marisco', 'gambas', 'gamba',
    'langostinos', 'langostino', 'calamar', 'calamares', 'pulpo', 'dorada', 'lubina',
    'trucha', 'sepia', 'mejillones', 'almejas', 'bonito', 'sardinas', 'boquerones',
    'pescadilla', 'emperador', 'rape', 'rodaballo', 'anchoa', 'anchoas', 'chipirones',
    'choco', 'vieira', 'bogavante', 'langosta'
  ],
  legumbres_vegetariano: [
    'lentejas', 'lenteja', 'garbanzos', 'garbanzo', 'alubias', 'alubia', 'judias',
    'frijoles', 'tofu', 'tempeh', 'hummus', 'soja', 'seitan', 'edamame',
    'vegetariano', 'vegano', 'falafel', 'guisantes', 'habas'
  ],
  pasta_huevos: [
    'pasta', 'espaguetis', 'spaghetti', 'macarrones', 'macarron', 'arroz', 'paella',
    'fideos', 'risotto', 'lasana', 'gnocchi', 'tallarines', 'tortilla', 'huevos',
    'huevo', 'revuelto', 'frittata', 'omelette', 'raviolis', 'noodles', 'canelones'
  ],
};

function normalizeString(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

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
 */
function extractPlanningMeta(receta: Receta): RecipePlanningMeta {
  const rawMoments = (
    Array.isArray(receta.momentos_dia) && receta.momentos_dia.length > 0
      ? (receta.momentos_dia as string[])
      : ((receta as any).momentos_recomendados as string[]) || []
  )
    .filter(Boolean)
    .map((m) => String(m).toLowerCase().trim() as MomentoDia);

  const momentos: MomentoDia[] = rawMoments;

  const inferred = (!receta.rol_plato) ? inferRecipeCategory(receta) : null;
  let rol: RolPlato = receta.rol_plato || inferred?.rol_plato || 'completo';
  if (momentos.includes('postre')) {
    rol = 'postre';
  }

  const tagsNorm = (receta.etiquetas || []).map((t) => normalizeString(t.trim()));
  const titleNorm = normalizeString(receta.titulo || '');
  const descNorm = normalizeString(receta.descripcion || '');

  // Ingredientes normalizados si están presentes
  const ingrNorm: string[] = [];
  if (Array.isArray((receta as any).ingredientes)) {
    for (const ing of (receta as any).ingredientes) {
      if (typeof ing?.nombre === 'string') {
        ingrNorm.push(normalizeString(ing.nombre));
      }
      if (typeof ing?.ingrediente_maestro?.nombre === 'string') {
        ingrNorm.push(normalizeString(ing.ingrediente_maestro.nombre));
      }
    }
  }

  const allWords = [
    ...tagsNorm,
    ...titleNorm.split(/[\s,.-]+/).filter(Boolean),
    ...descNorm.split(/[\s,.-]+/).filter(Boolean),
    ...ingrNorm,
  ];

  return {
    receta,
    momentos,
    rol,
    esFavorito: Boolean((receta as any).es_favorito_menu || (receta as any).es_favorita),
    isDessert: rol === 'postre' || momentos.includes('postre'),
    tagsNorm: allWords,
  };
}

/**
 * Detecta qué grupo proteico o base tiene una receta para favorecer la alternancia culinaria
 */
function detectProteinGroup(meta: RecipePlanningMeta): ProteinGroup | null {
  const scores: Record<ProteinGroup, number> = {
    carne_ave: 0,
    pescado_marisco: 0,
    legumbres_vegetariano: 0,
    pasta_huevos: 0,
  };

  for (const [groupKey, keywords] of Object.entries(PROTEIN_GROUPS)) {
    const g = groupKey as ProteinGroup;
    for (const kw of keywords) {
      const normKw = normalizeString(kw);
      for (const term of meta.tagsNorm) {
        if (term === normKw) {
          scores[g] += 3;
        } else if (term.includes(normKw)) {
          scores[g] += 1;
        }
      }
    }
  }

  let bestGroup: ProteinGroup | null = null;
  let maxScore = 0;
  for (const [groupKey, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestGroup = groupKey as ProteinGroup;
    }
  }

  return bestGroup;
}

/**
 * Puntuación y selección con TOLERANCIA CERO A LA REPETICIÓN INTRA-SEMANAL y BALANCE NUTRICIONAL:
 * - Si no hay recetas no usadas en el pool, retorna null (slot vacío).
 * - Aplica una penalización crítica si coincide consecutivamente con la misma fuente proteica.
 */
function pickBestRecipe(
  pool: RecipePlanningMeta[],
  usedCountMap: Map<string, number>,
  recentHistorySet: Set<string>,
  lastUsedDateMap: Map<string, string>,
  currentDate: string,
  previousMealGroup: ProteinGroup | null,
  sameMealGroup?: ProteinGroup | null
): RecipePlanningMeta | null {
  if (pool.length === 0) return null;

  // 1. TOLERANCIA CERO A LA REPETICIÓN INTRA-SEMANAL:
  // Ninguna receta puede asignarse más de una vez en todo el plan.
  // Si se acaban las recetas sin usar del pool, retornamos null (sin duplicados).
  const unusedCandidates = pool.filter((item) => (usedCountMap.get(item.receta.id) || 0) === 0);
  if (unusedCandidates.length === 0) {
    return null;
  }

  const scoredCandidates = unusedCandidates.map((item) => {
    let score = 100;

    // 2. Penalización por historial de semanas anteriores
    if (recentHistorySet.has(item.receta.id)) {
      score -= 250;
    }

    // 3. Bonificación para recetas marcadas como "Favorito para menús"
    if (item.esFavorito) {
      score += 150;
    }

    // 4. CRITERIO DE EQUILIBRIO Y ALTERNANCIA PROTEICA ESTRICTA:
    // Evitar asignar consecutivamente la misma fuente principal de proteína
    // (alternar entre carne/ave, pescado/marisco, legumbres/vegetariano y pasta/huevos).
    const candidateGroup = detectProteinGroup(item);
    if (candidateGroup) {
      if (previousMealGroup && candidateGroup === previousMealGroup) {
        // Bloqueo estricto de repetición respecto al almuerzo anterior
        score -= 5000;
      }
      if (sameMealGroup && candidateGroup === sameMealGroup) {
        // Bloqueo estricto de repetición respecto al primer plato del mismo almuerzo
        score -= 5000;
      }
      if (
        (previousMealGroup && candidateGroup !== previousMealGroup) ||
        (sameMealGroup && candidateGroup !== sameMealGroup)
      ) {
        // Bonificación sustancial por alternancia culinaria
        score += 250;
      }
    }

    // 5. Pequeño factor aleatorio determinista para enriquecer variedad si hay empate
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

  // Seguimiento de balance proteico consecutivo en almuerzos
  let lastLunchProteinGroup: ProteinGroup | null = null;

  // Helper para registrar uso de una receta
  const markAssigned = (meta: RecipePlanningMeta, fecha: string) => {
    usedCountMap.set(meta.receta.id, (usedCountMap.get(meta.receta.id) || 0) + 1);
    lastUsedDateMap.set(meta.receta.id, fecha);
  };

  // 5. Distribución uniforme de platos en stock limitado (sin duplicar ninguna receta)
  // Si el catálogo solo tiene K recetas distintas (K < numDias), se reparten de forma equilibrada
  // a lo largo de los días de la semana, dejando los demás slots vacíos (+ Asignar)
  const computeDesignatedDays = (availableCount: number): Set<number> => {
    if (availableCount >= numDias) {
      return new Set(Array.from({ length: numDias }, (_, i) => i));
    }
    if (availableCount <= 0) {
      return new Set();
    }
    return new Set(
      Array.from({ length: availableCount }, (_, j) => Math.floor((j * numDias) / availableCount))
    );
  };

  const designatedPrimerosDays = computeDesignatedDays(primerosPool.length);
  const designatedSegundosDays = computeDesignatedDays(segundosPool.length);

  // 6. Bucle de asignación día a día (estrictamente numDias iteraciones)
  for (let dayIdx = 0; dayIdx < fechas.length; dayIdx++) {
    const fecha = fechas[dayIdx];

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
      if (opciones.intentarPrimeroYSegundo) {
        // Modo 1º + 2º Plato:
        // Si hay primeros disponibles en la colección, se asignan según la distribución calculada.
        // Tolerancia cero a duplicar: los días sin primero disponible quedan vacíos (+ Asignar) para el usuario.
        let primeroAsignado: RecipePlanningMeta | null = null;
        if (designatedPrimerosDays.has(dayIdx)) {
          primeroAsignado = pickBestRecipe(
            primerosPool,
            usedCountMap,
            recentHistorySet,
            lastUsedDateMap,
            fecha,
            lastLunchProteinGroup
          );

          if (primeroAsignado) {
            items.push({ fecha, slot: 'almuerzo_1', receta: primeroAsignado.receta });
            markAssigned(primeroAsignado, fecha);
            primerosAsignados++;
          }
        }

        // Asignación de 2º plato (alternando proteína respecto al día anterior y al primer plato del mismo almuerzo)
        if (designatedSegundosDays.has(dayIdx)) {
          const primeroProtein = primeroAsignado ? detectProteinGroup(primeroAsignado) : null;
          const segundo = pickBestRecipe(
            segundosPool,
            usedCountMap,
            recentHistorySet,
            lastUsedDateMap,
            fecha,
            lastLunchProteinGroup,
            primeroProtein
          );

          if (segundo) {
            items.push({ fecha, slot: 'almuerzo_2', receta: segundo.receta });
            markAssigned(segundo, fecha);
            segundosAsignados++;

            // Actualizar grupo proteico del almuerzo para la alternancia del día siguiente
            lastLunchProteinGroup = detectProteinGroup(segundo) || (primeroAsignado ? detectProteinGroup(primeroAsignado) : null);
          } else if (primeroAsignado) {
            lastLunchProteinGroup = detectProteinGroup(primeroAsignado);
          }
        } else if (primeroAsignado) {
          lastLunchProteinGroup = detectProteinGroup(primeroAsignado);
        }

        // Si ambos pools (1º y 2º) están completamente vacíos en el catálogo del usuario,
        // fallback a Plato Único para no dejar la semana huérfana
        if (primerosPool.length === 0 && segundosPool.length === 0) {
          const candidates = almuerzoCompletosPool.length > 0 ? almuerzoCompletosPool : almuerzoPool;
          const selected = pickBestRecipe(
            candidates,
            usedCountMap,
            recentHistorySet,
            lastUsedDateMap,
            fecha,
            lastLunchProteinGroup
          );

          if (selected) {
            items.push({ fecha, slot: 'almuerzo', receta: selected.receta });
            markAssigned(selected, fecha);
            platosUnicosAsignados++;
            lastLunchProteinGroup = detectProteinGroup(selected);
          }
        }
      } else {
        // Modo Plato Único: Asignar estrictamente una receta única sin repetición
        const candidates = almuerzoCompletosPool.length > 0 ? almuerzoCompletosPool : almuerzoPool;
        const selected = pickBestRecipe(
          candidates,
          usedCountMap,
          recentHistorySet,
          lastUsedDateMap,
          fecha,
          lastLunchProteinGroup
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
          lastLunchProteinGroup = detectProteinGroup(selected);
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
        lastLunchProteinGroup
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

  // 7. Notificaciones informativas al usuario sobre stock y distribución
  if (opciones.intentarPrimeroYSegundo) {
    if (primerosPool.length > 0 && primerosPool.length < numDias) {
      advertencias.push(
        `Se distribuyeron las ${primerosPool.length} receta(s) de primer plato disponibles sin repetir; los días restantes se dejaron vacíos (+ Asignar) para tu elección.`
      );
    }
    if (segundosPool.length > 0 && segundosPool.length < numDias) {
      advertencias.push(
        `Se distribuyeron las ${segundosPool.length} receta(s) de segundo plato disponibles sin repetir; los días restantes se dejaron vacíos (+ Asignar) para tu elección.`
      );
    }
  }

  // Comprobar slots completamente vacíos
  if (opciones.incluirDesayunos && !items.some((it) => it.slot === 'desayuno')) {
    advertencias.push('No se encontraron recetas adecuadas de desayuno en la colección.');
  }
  if (opciones.incluirAlmuerzos && !items.some((it) => it.slot === 'almuerzo' || it.slot === 'almuerzo_1' || it.slot === 'almuerzo_2')) {
    advertencias.push('No se encontraron recetas adecuadas de almuerzo en la colección.');
  }
  if (opciones.incluirCenas && !items.some((it) => it.slot === 'cena')) {
    advertencias.push('No se encontraron recetas adecuadas de cena en la colección.');
  }
  if (opciones.incluirSnackPostre && !items.some((it) => it.slot === 'snack_postre')) {
    advertencias.push('No se encontraron recetas adecuadas de snack o postre en la colección.');
  }

  // 8. Cálculo de días completos
  let diasCompletos = 0;
  for (const fecha of fechas) {
    const dayItems = items.filter((it) => it.fecha === fecha);

    const hasDesayuno = !opciones.incluirDesayunos || dayItems.some((it) => it.slot === 'desayuno');
    const hasAlmuerzo = !opciones.incluirAlmuerzos || dayItems.some((it) => it.slot === 'almuerzo' || it.slot === 'almuerzo_1' || it.slot === 'almuerzo_2');
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
