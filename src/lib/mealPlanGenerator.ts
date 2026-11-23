import type { Receta } from '@/types/recipe';
import type { MomentoDia, RolPlato } from '@/types/database';
import { inferRecipeCategory, isDessertExcludedFromSlot } from './recipeCategorizer';
import { formatLocalDate, parseLocalDate } from '@/lib/dateUtils';

export interface MealPlanGeneratorOptions {
  dias: number; // Entre 1 y 31 días continuos
  fechaInicio: string; // Formato YYYY-MM-DD
  incluirDesayunos: boolean;
  incluirAlmuerzos: boolean;
  intentarPrimeroYSegundo: boolean; // Si es true, empareja 1º + 2º en almuerzo cuando sea posible
  incluirCenas: boolean;
  incluirSnackPostre?: boolean;
  historialRecientesIds?: string[]; // IDs de recetas usadas en las últimas 2-4 semanas para evitar repeticiones
  // Granularidad día a día para Miga PRO:
  slotsPorDia?: Record<
    string,
    {
      desayuno?: boolean;
      almuerzo?: boolean;
      cena?: boolean;
      snack?: boolean;
    }
  >;
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
  rol: RolPlato | 'principal';
  esFavorito: boolean;
  isDessert: boolean;
  tagsNorm: string[];
}

/**
 * Grupos de alimentos y fuentes de proteína para equilibrio culinario
 */
export type ProteinGroup =
  | 'carne_blanca'
  | 'carne_roja'
  | 'pescado_marisco'
  | 'legumbres'
  | 'huevos_pasta_vegetal'
  // Compatibilidad hacia atrás con tipos legacy
  | 'carne_ave'
  | 'legumbres_vegetariano'
  | 'pasta_huevos';

export const PROTEIN_GROUPS: Record<string, string[]> = {
  carne_blanca: [
    'pollo', 'pavo', 'conejo', 'pechuga', 'alitas', 'alitas de pollo',
    'muslo', 'muslos', 'contramuslo', 'contramuslos', 'ave', 'pavo picado'
  ],
  carne_roja: [
    'ternera', 'cerdo', 'carne', 'vaca', 'buey', 'cordero', 'hamburguesa', 'solomillo',
    'costilla', 'costillas', 'albondigas', 'albondiga', 'albondiguillas',
    'lomo', 'picada', 'magro', 'bacon', 'jamon', 'panceta', 'chorizo', 'embutido',
    'vacuno', 'salchicha', 'salchichas', 'secreto', 'presa', 'morcilla', 'butifarra',
    'chistorra', 'bistec', 'entrecot', 'chuleton', 'rabo', 'carrillera', 'carrilleras',
    'guiso de carne', 'estofado de carne', 'osobuco', 'codillo'
  ],
  pescado_marisco: [
    'pescado', 'atun', 'salmon', 'merluza', 'bacalao', 'marisco', 'gambas', 'gamba',
    'langostinos', 'langostino', 'calamar', 'calamares', 'pulpo', 'dorada', 'lubina',
    'trucha', 'sepia', 'mejillones', 'almejas', 'bonito', 'sardinas', 'boquerones',
    'pescadilla', 'emperador', 'rape', 'rodaballo', 'anchoa', 'anchoas', 'chipirones',
    'choco', 'vieira', 'bogavante', 'langosta'
  ],
  legumbres: [
    'lentejas', 'lenteja', 'garbanzos', 'garbanzo', 'alubias', 'alubia', 'judias',
    'frijoles', 'tofu', 'tempeh', 'hummus', 'soja', 'seitan', 'edamame',
    'falafel', 'guisantes', 'habas'
  ],
  huevos_pasta_vegetal: [
    'tortilla', 'huevos', 'huevo', 'revuelto', 'frittata', 'omelette',
    'pasta', 'espaguetis', 'spaghetti', 'macarrones', 'macarron', 'arroz', 'paella',
    'fideos', 'risotto', 'lasana', 'gnocchi', 'tallarines', 'noodles', 'canelones', 'raviolis',
    'vegetariano', 'vegano', 'verduras', 'calabacin', 'berenjena', 'espinacas', 'champinones',
    'champiñones', 'setas', 'menestra', 'pisto'
  ],
  // Claves legacy para tests o scripts antiguos
  carne_ave: [
    'pollo', 'pavo', 'ternera', 'cerdo', 'carne', 'ave', 'hamburguesa', 'solomillo',
    'costilla', 'cordero', 'albondigas', 'albondiga', 'conejo', 'lomo', 'pechuga',
    'alitas', 'picada', 'buey', 'bacon', 'jamon'
  ],
  legumbres_vegetariano: [
    'lentejas', 'lenteja', 'garbanzos', 'garbanzo', 'alubias', 'alubia', 'judias',
    'tofu', 'hummus', 'soja', 'vegetariano', 'vegano'
  ],
  pasta_huevos: [
    'pasta', 'espaguetis', 'spaghetti', 'macarrones', 'arroz', 'fideos', 'tortilla', 'huevos', 'huevo'
  ],
};

function normalizeString(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getRecipeMoments(receta: Receta): string[] {
  const raw = Array.isArray(receta.momentos_dia) && receta.momentos_dia.length > 0
    ? receta.momentos_dia
    : ((receta as any).momentos as string[]) || [];
  return raw.map((m) => String(m).toLowerCase().trim());
}

export type ContextualMomentoFilter = 'todos' | 'desayuno' | 'primero' | 'almuerzo' | 'cena' | 'snack_postre';

/**
 * Heurística culinaria para detectar si una receta es un 1er Plato / Entrante:
 * Sopas, cremas, caldos, purés, gazpachos, salmorejos o ensaladas ligeras de verduras.
 * Cualquier otra receta de almuerzo (carnes, pescados, arroces, pastas, legumbres, guisos, etc.)
 * se clasifica automáticamente como Plato Principal.
 */
export function isFirstCourseStarter(
  receta: Receta,
  tagsNorm?: string[],
  titleNorm?: string,
  ingrNorm: string[] = []
): boolean {
  const normTitle = normalizeString(titleNorm || receta.titulo || '');

  // 0. Si el rol explícito es segundo plato, postre o desayuno_snack -> NUNCA es 1er plato
  if (
    receta.rol_plato === 'segundo' ||
    receta.rol_plato === 'postre' ||
    receta.rol_plato === 'desayuno_snack'
  ) {
    return false;
  }

  // 1. Exclusiones de platos contundentes / completos en el título (Plato Principal obligatorio)
  const HEAVY_EXCLUSIONS = [
    // Legumbres y guisos tradicionales
    'lentejas', 'garbanzos', 'alubias', 'judias blancas',
    'fabada', 'cocido', 'potaje', 'puchero', 'estofado', 'guiso', 'chili',
    // Arroces y pastas
    'paella', 'risotto', 'arroz caldoso', 'arroz meloso', 'arroz',
    'espaguetis', 'spaghetti', 'macarrones', 'lasana', 'canelones',
    'pasta', 'fideua', 'tallarines', 'noodles', 'ramen',
    // Platos combinados / masas
    'pizza', 'hamburguesa', 'burger', 'tacos', 'burrito', 'fajitas', 'poke bowl', 'curry',
    // Ensaladas contundentes (plato único)
    'ensalada de pasta', 'ensalada de arroz', 'ensalada de patata', 'ensalada campera',
    'ensalada cesar', 'caesar salad', 'ensaladilla rusa'
  ];

  for (const excl of HEAVY_EXCLUSIONS) {
    const norm = normalizeString(excl);
    if (normTitle.includes(norm)) {
      return false;
    }
  }

  // 2. Proteínas principales animales evidentes (salvo si el título EMPIEZA explícitamente por sopa/caldo/consomé)
  const hasLiquidPrefix = /^(sopa|sopas|soup|soups|caldo|caldos|consome|gazpacho|salmorejo|ajoblanco|vichyssoise)\b/i.test(
    normTitle
  );

  if (!hasLiquidPrefix) {
    const MAIN_PROTEIN_KEYWORDS = [
      'pollo', 'pavo', 'ternera', 'cerdo', 'conejo', 'cordero', 'vaca', 'buey',
      'carrillera', 'carrilleras', 'secreto', 'presa', 'osobuco', 'rabo', 'codillo',
      'pato', 'magret', 'cabrito', 'cochinillo', 'pechuga', 'muslo', 'muslos',
      'contramuslo', 'contramuslos', 'alitas', 'solomillo', 'entrecot', 'chuleton',
      'albondigas', 'costillas', 'lomo', 'chuleta', 'chuletas', 'hamburguesa',
      'salmon', 'merluza', 'bacalao', 'lubina', 'dorada', 'trucha', 'rape', 'rodaballo',
      'atun', 'bonito', 'emperador', 'pulpo', 'calamar', 'calamares', 'sepia',
      'gamba', 'gambas', 'langostino', 'langostinos'
    ];
    for (const prot of MAIN_PROTEIN_KEYWORDS) {
      const normProt = normalizeString(prot);
      const regex = new RegExp(`(^|\\s)${normProt}(\\s|s|es)?($|\\s)`, 'i');
      if (regex.test(normTitle)) {
        return false;
      }
    }
  }

  // 3. Si pasó las exclusiones de proteína principal y platos pesados, respetar rol_plato === 'primero'
  if (receta.rol_plato === 'primero') {
    return true;
  }

  // 4. Sopas, cremas, caldos, purés y sopas frías tradicionales (prefijo de título estricto)
  if (
    /^(sopa|sopas|soup|soups|crema|cremas|caldo|caldos|consome|broth|pure|pures|puree|veloute|gazpacho|gazpachos|salmorejo|salmorejos|ajoblanco|vichyssoise)\b/i.test(
      normTitle
    )
  ) {
    return true;
  }

  // 5. Verduras ligeras y entrantes de huerta (evaluadas en el título)
  const VEG_STARTER_KEYWORDS = [
    'ensalada verde', 'ensalada mixta', 'ensalada simple', 'ensalada mediterranea',
    'ensalada de tomate', 'ensalada de pepino', 'ensalada de canonigos', 'ensalada de espinacas',
    'verduras al vapor', 'menestra', 'pisto', 'escalivada', 'alcachofas', 'esparragos',
    'judias verdes', 'brocoli al vapor', 'champinones al ajillo', 'setas salteadas',
    'carpaccio de calabacin'
  ];

  for (const kw of VEG_STARTER_KEYWORDS) {
    const normKw = normalizeString(kw);
    if (normTitle.includes(normKw)) {
      return true;
    }
  }

  // 6. Ensaladas ligeras (verificar que no contengan proteínas pesadas en el título)
  if (normTitle.includes('ensalada')) {
    const heavyProteins = ['pollo', 'atun', 'salmon', 'pavo', 'bacon', 'queso de cabra', 'gambas', 'langostinos'];
    const hasHeavyProtein = heavyProteins.some((hp) => normTitle.includes(normalizeString(hp)));
    if (!hasHeavyProtein) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluación estricta y limpia del momento del día contextual para prefiltrado de recetas.
 * Elimina totalmente el uso de tags o etiquetas semánticas secundarias para momentos.
 * Obedece de forma exclusiva al array oficial de momentos asignados a la receta (momentos_dia / momentos).
 */
export function matchesContextualMomento(
  receta: Receta,
  filter: ContextualMomentoFilter | string
): boolean {
  const f = filter.toLowerCase().trim();
  if (f === 'todos' || !f) return true;

  const moments = getRecipeMoments(receta);
  const isOnlyDessert =
    receta.rol_plato === 'postre' ||
    (moments.length === 1 && moments[0] === 'postre');

  switch (f) {
    case 'desayuno':
      return moments.includes('desayuno') && !isOnlyDessert;

    case 'cena':
      return moments.includes('cena') && !isOnlyDessert;

    case 'snack_postre':
    case 'snack':
    case 'postre':
      return moments.includes('snack') || moments.includes('postre') || receta.rol_plato === 'postre';

    case 'almuerzo':
      return moments.includes('almuerzo') && !isOnlyDessert;

    case 'primero':
      return moments.includes('almuerzo') && !isOnlyDessert && isFirstCourseStarter(receta);

    default:
      return true;
  }
}

/**
 * Genera la secuencia matemática estricta de fechas a partir de la fecha de inicio.
 * Cero ajustes al lunes: si el usuario define fecha de inicio, empieza exactamente en ella.
 */
function generateDates(fechaInicioStr: string, numDias: number): string[] {
  const safeDias = Math.min(31, Math.max(1, Math.floor(numDias)));
  const baseDate = parseLocalDate(fechaInicioStr);

  const result: string[] = [];
  for (let i = 0; i < safeDias; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + i, 12, 0, 0, 0);
    result.push(formatLocalDate(d));
  }
  return result;
}

/**
 * Extrae metadatos culinarios homogéneos de cada receta:
 * Si la receta tiene momentos_dia definidos, obedece ÚNICA Y EXCLUSIVAMENTE a momentos_dia.
 * Eliminada cualquier contaminación o inyección de momentos desde etiquetas (hashtags).
 */
function extractPlanningMeta(receta: Receta): RecipePlanningMeta {
  const rawMoments = (
    Array.isArray(receta.momentos_dia) && receta.momentos_dia.length > 0
      ? (receta.momentos_dia as string[])
      : ((receta as any).momentos_recomendados as string[]) || []
  )
    .filter(Boolean)
    .map((m) => String(m).toLowerCase().trim() as MomentoDia);

  let momentos: MomentoDia[];
  if (rawMoments.length > 0) {
    // Fuente única de verdad: respetar estrictamente los momentos asignados a la receta
    momentos = [...rawMoments];
  } else {
    // Fallback solo para recetas legadas sin momentos_dia en base de datos
    const inferred = inferRecipeCategory({
      titulo: receta.titulo,
      calorias_por_porcion: receta.calorias_por_porcion,
      etiquetas: receta.etiquetas,
      descripcion: receta.descripcion,
    });
    momentos = inferred.momentos_dia;
  }

  const tagsNorm = (receta.etiquetas || []).map((t) => normalizeString(t.trim()));
  const titleNorm = normalizeString(receta.titulo || '');
  const descNorm = normalizeString(receta.descripcion || '');

  // Ingredientes normalizados si están presentes (relacional Supabase receta_ingredientes o mock/legacy)
  const ingrNorm: string[] = [];
  const rawIngredientes =
    (receta as any).receta_ingredientes ||
    (receta as any).ingredientes ||
    [];

  if (Array.isArray(rawIngredientes)) {
    for (const ing of rawIngredientes) {
      if (typeof ing?.nombre_limpio === 'string') {
        ingrNorm.push(normalizeString(ing.nombre_limpio));
      }
      if (typeof ing?.nombre_crudo === 'string') {
        ingrNorm.push(normalizeString(ing.nombre_crudo));
      }
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
    ...ingrNorm.flatMap((i) => i.split(/[\s,.-]+/).filter(Boolean)),
    ...ingrNorm,
  ];

  const isDessert =
    receta.rol_plato === 'postre' ||
    (momentos.length === 1 && momentos[0] === 'postre') ||
    isDessertExcludedFromSlot(receta.rol_plato, 'almuerzo');

  let rol: RolPlato | 'principal';
  if (isDessert) {
    rol = 'postre';
  } else if (isFirstCourseStarter(receta, tagsNorm, titleNorm, ingrNorm)) {
    rol = 'primero';
  } else if (receta.rol_plato === 'segundo') {
    rol = 'segundo';
  } else if (momentos.includes('almuerzo') || momentos.includes('cena')) {
    rol = 'principal';
  } else if (momentos.includes('desayuno') || momentos.includes('snack')) {
    rol = 'desayuno_snack';
  } else {
    rol = 'principal';
  }

  return {
    receta,
    momentos,
    rol,
    esFavorito: Boolean((receta as any).es_favorito_menu || (receta as any).es_favorita),
    isDessert,
    tagsNorm: allWords,
  };
}

/**
 * Detecta qué grupo proteico o base tiene una receta para favorecer la alternancia culinaria
 */
function detectProteinGroup(meta: RecipePlanningMeta): ProteinGroup | null {
  const scores: Record<string, number> = {
    carne_blanca: 0,
    carne_roja: 0,
    pescado_marisco: 0,
    legumbres: 0,
    huevos_pasta_vegetal: 0,
  };

  const primaryGroups = [
    'carne_blanca',
    'carne_roja',
    'pescado_marisco',
    'legumbres',
    'huevos_pasta_vegetal',
  ];

  for (const groupKey of primaryGroups) {
    const keywords = PROTEIN_GROUPS[groupKey] || [];
    for (const kw of keywords) {
      const normKw = normalizeString(kw);
      for (const term of meta.tagsNorm) {
        if (term === normKw) {
          scores[groupKey] += 3;
        } else if (term.includes(normKw)) {
          scores[groupKey] += 1;
        }
      }
    }
  }

  let bestGroup: ProteinGroup | null = null;
  let maxScore = 0;
  for (const groupKey of primaryGroups) {
    const score = scores[groupKey];
    if (score > maxScore) {
      maxScore = score;
      bestGroup = groupKey as ProteinGroup;
    }
  }

  return bestGroup;
}

/**
 * Puntuación y selección con BALANCE NUTRICIONAL y PRIORIZACIÓN DE VARIEDAD:
 * - Prioridad absoluta a candidatos no utilizados en este plan (repetición cero intra-semanal).
 * - Si se agotan los platos sin usar y el slot es obligatorio (almuerzo principal, desayuno, cena),
 *   rescata las recetas menos utilizadas para nunca dejar el slot en blanco si existen recetas en el catálogo.
 * - Aplica penalización crítica si coincide consecutivamente con la misma fuente proteica.
 */
function pickBestRecipe(
  pool: RecipePlanningMeta[],
  usedCountMap: Map<string, number>,
  recentHistorySet: Set<string>,
  lastUsedDateMap: Map<string, string>,
  currentDate: string,
  previousMealGroup: ProteinGroup | null,
  sameMealGroup?: ProteinGroup | null,
  allowRepetitionIfExhausted = false,
  isDinner = false,
  previousDate?: string | null,
  proteinWeeklyCount?: Record<string, number>,
  totalDays = 7
): RecipePlanningMeta | null {
  if (pool.length === 0) return null;

  // 1. Prioridad absoluta: recetas sin usar en todo el plan (tolerancia cero a repetición intra-semanal)
  let candidates = pool.filter((item) => (usedCountMap.get(item.receta.id) || 0) === 0);

  // 2. Si no quedan recetas sin usar y el slot es obligatorio (allowRepetitionIfExhausted):
  // Rescatar las recetas menos utilizadas, evitando repetir en la misma fecha
  if (candidates.length === 0 && allowRepetitionIfExhausted) {
    const poolNotToday = pool.filter((item) => lastUsedDateMap.get(item.receta.id) !== currentDate);
    const validPool = poolNotToday.length > 0 ? poolNotToday : pool;
    const minUses = Math.min(...validPool.map((item) => usedCountMap.get(item.receta.id) || 0));
    candidates = validPool.filter((item) => (usedCountMap.get(item.receta.id) || 0) === minUses);
  }

  if (candidates.length === 0) {
    return null;
  }

  const scoredCandidates = candidates.map((item) => {
    let score = 100;
    const useCount = usedCountMap.get(item.receta.id) || 0;

    // Penalización drástica por reutilización intra-semanal forzada
    if (useCount > 0) {
      score -= useCount * 1000;
    }

    // Penalización por historial de semanas anteriores
    if (recentHistorySet.has(item.receta.id)) {
      score -= 250;
    }

    // Penalización por repetición consecutiva en días consecutivos si se fuerza reutilización
    if (previousDate && lastUsedDateMap.get(item.receta.id) === previousDate) {
      score -= 2000;
    }

    // Bonificación para recetas marcadas como "Favorito para menús"
    if (item.esFavorito) {
      score += 150;
    }

    // Para cenas: priorizar recetas con encaje nocturno ligero y digestivo
    if (isDinner && item.momentos.includes('cena')) {
      if (!item.momentos.includes('almuerzo')) {
        score += 75;
      }
      // Sopas nutritivas, cremas y ensaladas son cenas 100% equilibradas y válidas sin penalizaciones
      const isLightDinnerOption =
        item.rol === 'primero' ||
        /^(sopa|sopas|soup|soups|crema|cremas|caldo|caldos|consome|pure|gazpacho|salmorejo|ensalada)\b/i.test(
          item.receta.titulo || ''
        );
      if (isLightDinnerOption) {
        score += 100;
      }
    }

    // CRITERIO DE EQUILIBRIO Y ALTERNANCIA PROTEICA ESTRICTA:
    const candidateGroup = detectProteinGroup(item);
    if (candidateGroup) {
      if (previousMealGroup && candidateGroup === previousMealGroup) {
        score -= 5000;
      }
      if (sameMealGroup && candidateGroup === sameMealGroup) {
        score -= 5000;
      }
      if (
        (previousMealGroup && candidateGroup !== previousMealGroup) ||
        (sameMealGroup && candidateGroup !== sameMealGroup)
      ) {
        score += 250;
      }

      // Moderar la carne roja a 1-2 veces por semana cuando hay catálogo variado suficiente
      if (candidateGroup === 'carne_roja' && proteinWeeklyCount) {
        const redMeatCount = proteinWeeklyCount['carne_roja'] || 0;
        const maxHealthyRed = Math.max(1, Math.round((totalDays / 7) * 2));
        if (redMeatCount >= maxHealthyRed) {
          score -= 3000;
        }
      }

      // Fomentar presencia equilibrada de pescado, carne blanca, legumbres y huevos/vegetal
      if (proteinWeeklyCount) {
        const count = proteinWeeklyCount[candidateGroup] || 0;
        if (count === 0) {
          score += 150;
        } else if (
          count === 1 &&
          (candidateGroup === 'pescado_marisco' ||
            candidateGroup === 'legumbres' ||
            candidateGroup === 'carne_blanca')
        ) {
          score += 80;
        }
      }
    }

    // Pequeño factor aleatorio determinista para enriquecer variedad si hay empate
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

  // 1. Validación de entrada y duración estricta (hasta 31 días)
  const numDias = Math.min(31, Math.max(1, Math.floor(opciones.dias || 7)));
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
  // Pool de Desayunos: Solo recetas con momento 'desayuno' explícito y que NO sean postres
  const desayunosPool = allMetas.filter(
    (m) => m.momentos.includes('desayuno') && !m.isDessert
  );

  const almuerzoPool = allMetas.filter(
    (m) => m.momentos.includes('almuerzo') && !m.isDessert
  );

  // 1er Plato / Entrante: sopas, cremas, caldos, purés, gazpacho, ensaladas ligeras
  const primerosPool = almuerzoPool.filter((m) => m.rol === 'primero');

  // Platos Principales: toda receta de almuerzo que no sea un entrante ligero
  const platosPrincipalesPool = almuerzoPool.filter((m) => m.rol !== 'primero');

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

  // Seguimiento de balance proteico semanal
  const proteinWeeklyCount: Record<string, number> = {
    carne_blanca: 0,
    carne_roja: 0,
    pescado_marisco: 0,
    legumbres: 0,
    huevos_pasta_vegetal: 0,
  };

  // Seguimiento de balance proteico continuo (almuerzo -> cena -> siguiente almuerzo o cena -> cena)
  let lastAssignedProteinGroup: ProteinGroup | null = null;

  let primerosAsignados = 0;
  let segundosAsignados = 0;
  let platosUnicosAsignados = 0;

  // Helper para registrar uso de una receta
  const markAssigned = (meta: RecipePlanningMeta, fecha: string) => {
    usedCountMap.set(meta.receta.id, (usedCountMap.get(meta.receta.id) || 0) + 1);
    lastUsedDateMap.set(meta.receta.id, fecha);
    const grp = detectProteinGroup(meta);
    if (grp) {
      proteinWeeklyCount[grp] = (proteinWeeklyCount[grp] || 0) + 1;
    }
  };

  // 5. Distribución uniforme de 1er plato en stock limitado (sin duplicar ninguna receta)
  // Los primeros platos son opcionales: si hay K < numDias, se reparten uniformemente y el resto queda en blanco (+ Asignar)
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

  // 6. Bucle de asignación día a día (estrictamente numDias iteraciones)
  for (let dayIdx = 0; dayIdx < fechas.length; dayIdx++) {
    const fecha = fechas[dayIdx];
    const previousDate = dayIdx > 0 ? fechas[dayIdx - 1] : null;

    // Granularidad día a día para Miga PRO (si está presente, tiene prioridad absoluta)
    const dayConfig = opciones.slotsPorDia?.[fecha];
    const wantsDesayuno = dayConfig !== undefined ? Boolean(dayConfig.desayuno) : opciones.incluirDesayunos;
    const wantsAlmuerzo = dayConfig !== undefined ? Boolean(dayConfig.almuerzo) : opciones.incluirAlmuerzos;
    const wantsCena = dayConfig !== undefined ? Boolean(dayConfig.cena) : opciones.incluirCenas;
    const wantsSnack = dayConfig !== undefined ? Boolean(dayConfig.snack) : Boolean(opciones.incluirSnackPostre);

    // --- DESAYUNO (Obligatorio si está habilitado) ---
    if (wantsDesayuno && desayunosPool.length > 0) {
      const selected = pickBestRecipe(
        desayunosPool,
        usedCountMap,
        recentHistorySet,
        lastUsedDateMap,
        fecha,
        null,
        null,
        true, // allowRepetitionIfExhausted
        false, // isDinner
        previousDate,
        proteinWeeklyCount,
        numDias
      );

      if (selected) {
        items.push({ fecha, slot: 'desayuno', receta: selected.receta });
        markAssigned(selected, fecha);
      }
    }

    // --- ALMUERZO ---
    if (wantsAlmuerzo && almuerzoPool.length > 0) {
      const mainCoursePool = platosPrincipalesPool.length > 0 ? platosPrincipalesPool : almuerzoPool;

      if (opciones.intentarPrimeroYSegundo) {
        // Modo 1º + 2º Plato:
        // 1. Asignación opcional de 1er plato / entrante:
        // Si hay primeros disponibles en la colección, se asignan en los días designados sin repetir.
        // Los días sin primero disponible quedan como slots opcionales vacíos (+ Asignar).
        let primeroAsignado: RecipePlanningMeta | null = null;
        if (designatedPrimerosDays.has(dayIdx)) {
          primeroAsignado = pickBestRecipe(
            primerosPool,
            usedCountMap,
            recentHistorySet,
            lastUsedDateMap,
            fecha,
            lastAssignedProteinGroup,
            null,
            false, // 1er plato es opcional: no repetir si se agota el stock
            false,
            previousDate,
            proteinWeeklyCount,
            numDias
          );

          if (primeroAsignado) {
            items.push({ fecha, slot: 'almuerzo_1', receta: primeroAsignado.receta });
            markAssigned(primeroAsignado, fecha);
            primerosAsignados++;
          }
        }

        // 2. Asignación OBLIGATORIA de Plato Principal (almuerzo_2):
        // NUNCA puede quedar vacío si hay platos disponibles en el catálogo.
        // Se nutre de la piscina completa de Platos Principales (o almuerzos totales si no hay principales clasificados).
        const primeroProtein = primeroAsignado ? detectProteinGroup(primeroAsignado) : null;
        const segundo = pickBestRecipe(
          mainCoursePool,
          usedCountMap,
          recentHistorySet,
          lastUsedDateMap,
          fecha,
          lastAssignedProteinGroup,
          primeroProtein,
          true, // Plato principal es obligatorio
          false,
          previousDate,
          proteinWeeklyCount,
          numDias
        );

        if (segundo) {
          items.push({ fecha, slot: 'almuerzo_2', receta: segundo.receta });
          markAssigned(segundo, fecha);
          segundosAsignados++;
          lastAssignedProteinGroup = detectProteinGroup(segundo) || primeroProtein || lastAssignedProteinGroup;
        } else if (primeroAsignado) {
          lastAssignedProteinGroup = primeroProtein || lastAssignedProteinGroup;
        }
      } else {
        // Modo Plato Único: Asignar obligatoriamente un plato principal como 'almuerzo'
        const selected = pickBestRecipe(
          mainCoursePool,
          usedCountMap,
          recentHistorySet,
          lastUsedDateMap,
          fecha,
          lastAssignedProteinGroup,
          null,
          true, // Plato principal obligatorio
          false,
          previousDate,
          proteinWeeklyCount,
          numDias
        );

        if (selected) {
          items.push({ fecha, slot: 'almuerzo', receta: selected.receta });
          markAssigned(selected, fecha);
          platosUnicosAsignados++;
          lastAssignedProteinGroup = detectProteinGroup(selected) || lastAssignedProteinGroup;
        }
      }
    }

    // --- CENA (Obligatoria si está habilitada) ---
    if (wantsCena && cenasPool.length > 0) {
      const selected = pickBestRecipe(
        cenasPool,
        usedCountMap,
        recentHistorySet,
        lastUsedDateMap,
        fecha,
        lastAssignedProteinGroup,
        null,
        true, // Cena obligatoria
        true, // isDinner
        previousDate, // Evitar repetir la misma receta del día anterior
        proteinWeeklyCount,
        numDias
      );

      if (selected) {
        items.push({ fecha, slot: 'cena', receta: selected.receta });
        markAssigned(selected, fecha);
        // Registrar también la proteína de la cena para enlazar con la comida del día siguiente
        // o cena consecutiva si se generan solo cenas
        lastAssignedProteinGroup = detectProteinGroup(selected) || lastAssignedProteinGroup;
      }
    }

    // --- SNACK O POSTRE (Opcional) ---
    if (wantsSnack && snacksPostresPool.length > 0) {
      const selected = pickBestRecipe(
        snacksPostresPool,
        usedCountMap,
        recentHistorySet,
        lastUsedDateMap,
        fecha,
        null,
        null,
        false,
        false,
        previousDate,
        proteinWeeklyCount,
        numDias
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
        `Se distribuyeron las ${primerosPool.length} receta(s) de primer plato disponibles sin repetir; los días restantes se dejaron listos para asignar (+ Asignar).`
      );
    }
    if (primerosPool.length === 0) {
      advertencias.push(
        'No se encontraron recetas de primer plato o entrantes ligeros en la colección; se asignaron platos principales para cada día y los primeros se dejaron vacíos (+ Asignar).'
      );
    }
  }

  // Comprobar slots completamente vacíos
  const anyWantsDesayuno = opciones.slotsPorDia
    ? Object.values(opciones.slotsPorDia).some((s) => s.desayuno)
    : opciones.incluirDesayunos;
  const anyWantsAlmuerzo = opciones.slotsPorDia
    ? Object.values(opciones.slotsPorDia).some((s) => s.almuerzo)
    : opciones.incluirAlmuerzos;
  const anyWantsCena = opciones.slotsPorDia
    ? Object.values(opciones.slotsPorDia).some((s) => s.cena)
    : opciones.incluirCenas;
  const anyWantsSnack = opciones.slotsPorDia
    ? Object.values(opciones.slotsPorDia).some((s) => s.snack)
    : Boolean(opciones.incluirSnackPostre);

  if (anyWantsDesayuno && !items.some((it) => it.slot === 'desayuno')) {
    advertencias.push('No se encontraron recetas adecuadas de desayuno en la colección.');
  }
  if (anyWantsAlmuerzo && !items.some((it) => it.slot === 'almuerzo' || it.slot === 'almuerzo_2')) {
    advertencias.push('No se encontraron recetas adecuadas de almuerzo en la colección.');
  }
  if (anyWantsCena && !items.some((it) => it.slot === 'cena')) {
    advertencias.push('No se encontraron recetas adecuadas de cena en la colección.');
  }
  if (anyWantsSnack && !items.some((it) => it.slot === 'snack_postre')) {
    advertencias.push('No se encontraron recetas adecuadas de snack o postre en la colección.');
  }

  // 8. Cálculo de días completos (El almuerzo requiere plato principal 'almuerzo' o 'almuerzo_2')
  let diasCompletos = 0;
  for (const fecha of fechas) {
    const dayItems = items.filter((it) => it.fecha === fecha);
    const dayConfig = opciones.slotsPorDia?.[fecha];
    const wDesayuno = dayConfig !== undefined ? Boolean(dayConfig.desayuno) : opciones.incluirDesayunos;
    const wAlmuerzo = dayConfig !== undefined ? Boolean(dayConfig.almuerzo) : opciones.incluirAlmuerzos;
    const wCena = dayConfig !== undefined ? Boolean(dayConfig.cena) : opciones.incluirCenas;
    const wSnack = dayConfig !== undefined ? Boolean(dayConfig.snack) : Boolean(opciones.incluirSnackPostre);

    const hasDesayuno = !wDesayuno || dayItems.some((it) => it.slot === 'desayuno');
    const hasAlmuerzo =
      !wAlmuerzo ||
      dayItems.some((it) => it.slot === 'almuerzo' || it.slot === 'almuerzo_2');
    const hasCena = !wCena || dayItems.some((it) => it.slot === 'cena');
    const hasSnack = !wSnack || dayItems.some((it) => it.slot === 'snack_postre');

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
