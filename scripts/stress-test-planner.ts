import type { Receta } from '../src/types/recipe';
import {
  generateMealPlan,
  isFirstCourseStarter,
  PROTEIN_GROUPS,
  ProteinGroup,
} from '../src/lib/mealPlanGenerator';

/**
 * Catálogo realista de 53 recetas correspondiente al modelo real de la aplicación:
 * - Los usuarios ÚNICAMENTE asignan momentos del día (desayuno, almuerzo, cena, snack, postre).
 * - NO existe campo manual de 'segundo plato'. El rol se deduce automáticamente por heurística culinaria.
 */
export function createMockCatalog53(): Receta[] {
  const recipes: Partial<Receta>[] = [
    // --- DESAYUNOS (8 recetas) ---
    { id: 'des-1', titulo: 'Tostada con tomate y aceite', momentos_dia: ['desayuno'], etiquetas: ['desayuno', 'tostada', 'pan'] },
    { id: 'des-2', titulo: 'Porridge de avena con frutas', momentos_dia: ['desayuno'], etiquetas: ['desayuno', 'avena', 'fruta'] },
    { id: 'des-3', titulo: 'Tortitas de avena y plátano', momentos_dia: ['desayuno'], etiquetas: ['desayuno', 'tortita', 'platano'] },
    { id: 'des-4', titulo: 'Huevos revueltos con aguacate', momentos_dia: ['desayuno'], etiquetas: ['desayuno', 'huevos', 'aguacate'] },
    { id: 'des-5', titulo: 'Yogur griego con granola y nueces', momentos_dia: ['desayuno'], etiquetas: ['desayuno', 'yogur', 'frutos secos'] },
    { id: 'des-6', titulo: 'Smoothie bowl de frutos rojos', momentos_dia: ['desayuno'], etiquetas: ['desayuno', 'smoothie', 'fruta'] },
    { id: 'des-7', titulo: 'Tostada de jamón ibérico con tomate', momentos_dia: ['desayuno'], etiquetas: ['desayuno', 'tostada', 'jamon'] },
    { id: 'des-8', titulo: 'Crepes ligeros con miel', momentos_dia: ['desayuno'], etiquetas: ['desayuno', 'crepe', 'miel'] },

    // --- ENTRANTES / 1ER PLATO (10 recetas deducibles por heurística: cremas, sopas, gazpacho, verduras) ---
    { id: 'prim-1', titulo: 'Crema de calabaza asada y jengibre', momentos_dia: ['almuerzo', 'cena'], etiquetas: ['crema', 'verduras', 'calabaza'] },
    { id: 'prim-2', titulo: 'Gazpacho andaluz tradicional', momentos_dia: ['almuerzo'], etiquetas: ['sopa', 'tomate', 'gazpacho'] },
    { id: 'prim-3', titulo: 'Salmorejo cordobés', momentos_dia: ['almuerzo'], etiquetas: ['crema', 'tomate', 'salmorejo'] },
    { id: 'prim-4', titulo: 'Ensalada mixta con espárragos', momentos_dia: ['almuerzo', 'cena'], etiquetas: ['ensalada', 'verduras'] },
    { id: 'prim-5', titulo: 'Sopa de verduras y fideos finos', momentos_dia: ['almuerzo', 'cena'], etiquetas: ['sopa', 'verduras'] },
    { id: 'prim-6', titulo: 'Menestra de verduras de temporada', momentos_dia: ['almuerzo'], etiquetas: ['verduras', 'menestra'] },
    { id: 'prim-7', titulo: 'Puré de calabacín y puerros', momentos_dia: ['almuerzo', 'cena'], etiquetas: ['crema', 'pure', 'calabacin'] },
    { id: 'prim-8', titulo: 'Alcachofas salteadas con ajo', momentos_dia: ['almuerzo', 'cena'], etiquetas: ['verduras', 'alcachofas'] },
    { id: 'prim-9', titulo: 'Vichyssoise fría de puerro', momentos_dia: ['almuerzo'], etiquetas: ['sopa', 'crema', 'puerro'] },
    { id: 'prim-10', titulo: 'Pisto manchego casero', momentos_dia: ['almuerzo'], etiquetas: ['verduras', 'pisto'] },

    // --- PLATOS PRINCIPALES DE ALMUERZO: Carnes, Aves, Pescados (5 recetas) ---
    { id: 'princ-1', titulo: 'Pechuga de pollo a la plancha con limón', momentos_dia: ['almuerzo', 'cena'], etiquetas: ['pollo', 'carne_ave', 'limon'] },
    { id: 'princ-2', titulo: 'Salmón a la plancha con espárragos', momentos_dia: ['almuerzo', 'cena'], etiquetas: ['salmon', 'pescado', 'pescado_marisco'] },
    { id: 'princ-3', titulo: 'Merluza en salsa verde con almejas', momentos_dia: ['almuerzo'], etiquetas: ['merluza', 'pescado', 'pescado_marisco'] },
    { id: 'princ-4', titulo: 'Solomillo de cerdo con champiñones', momentos_dia: ['almuerzo'], etiquetas: ['solomillo', 'cerdo', 'carne_ave'] },
    { id: 'princ-5', titulo: 'Albóndigas de ternera en salsa de tomate', momentos_dia: ['almuerzo'], etiquetas: ['albondigas', 'ternera', 'carne_ave'] },

    // --- PLATOS PRINCIPALES: Guisos, Legumbres, Arroces, Pastas (18 recetas) ---
    { id: 'princ-6', titulo: 'Lentejas estofadas con verduras', momentos_dia: ['almuerzo'], etiquetas: ['lentejas', 'legumbres', 'guiso'] },
    { id: 'princ-7', titulo: 'Garbanzos con espinacas y bacalao', momentos_dia: ['almuerzo'], etiquetas: ['garbanzos', 'legumbres', 'bacalao'] },
    { id: 'princ-8', titulo: 'Paella de pollo y verduras', momentos_dia: ['almuerzo'], etiquetas: ['arroz', 'paella', 'pollo'] },
    { id: 'princ-9', titulo: 'Risotto de setas y parmesano', momentos_dia: ['almuerzo', 'cena'], etiquetas: ['arroz', 'risotto', 'setas'] },
    { id: 'princ-10', titulo: 'Espaguetis a la boloñesa', momentos_dia: ['almuerzo'], etiquetas: ['pasta', 'espaguetis', 'carne'] },
    { id: 'princ-11', titulo: 'Macarrones gratinados con atún y tomate', momentos_dia: ['almuerzo'], etiquetas: ['pasta', 'macarrones', 'atun'] },
    { id: 'princ-12', titulo: 'Lasaña casera de carne', momentos_dia: ['almuerzo'], etiquetas: ['lasana', 'pasta', 'carne'] },
    { id: 'princ-13', titulo: 'Guiso de patatas con ternera', momentos_dia: ['almuerzo'], etiquetas: ['patatas', 'ternera', 'estofado'] },
    { id: 'princ-14', titulo: 'Alubias blancas con chorizo', momentos_dia: ['almuerzo'], etiquetas: ['alubias', 'legumbres', 'chorizo'] },
    { id: 'princ-15', titulo: 'Fideuá de marisco con alioli', momentos_dia: ['almuerzo'], etiquetas: ['fideos', 'marisco', 'gambas'] },
    { id: 'princ-16', titulo: 'Arroz caldoso con bogavante', momentos_dia: ['almuerzo'], etiquetas: ['arroz', 'marisco'] },
    { id: 'princ-17', titulo: 'Curry de garbanzos con leche de coco y arroz', momentos_dia: ['almuerzo', 'cena'], etiquetas: ['garbanzos', 'curry', 'arroz'] },
    { id: 'princ-18', titulo: 'Pollo al horno con patatas panadera', momentos_dia: ['almuerzo'], etiquetas: ['pollo', 'patatas', 'horno'] },
    { id: 'princ-19', titulo: 'Poke bowl de salmón y arroz', momentos_dia: ['almuerzo', 'cena'], etiquetas: ['salmon', 'arroz', 'bowl'] },
    { id: 'princ-20', titulo: 'Canelones rellenos de pollo y espinacas', momentos_dia: ['almuerzo'], etiquetas: ['pasta', 'pollo', 'espinacas'] },
    { id: 'princ-21', titulo: 'Tacos mexicanos de pollo con aguacate', momentos_dia: ['almuerzo', 'cena'], etiquetas: ['tacos', 'pollo'] },
    { id: 'princ-22', titulo: 'Marmitako de atún con patatas', momentos_dia: ['almuerzo'], etiquetas: ['atun', 'patatas', 'pescado'] },
    { id: 'princ-23', titulo: 'Ensalada de pasta con pavo y queso', momentos_dia: ['almuerzo', 'cena'], etiquetas: ['pasta', 'pavo', 'ensalada'] },

    // --- CENAS LIGERAS (9 recetas) ---
    { id: 'cena-1', titulo: 'Tortilla francesa con espinacas y queso', momentos_dia: ['cena'], etiquetas: ['tortilla', 'huevos', 'espinacas'] },
    { id: 'cena-2', titulo: 'Revuelto de setas y gambas', momentos_dia: ['cena'], etiquetas: ['huevos', 'gambas', 'setas'] },
    { id: 'cena-3', titulo: 'Lubina al horno con verduras', momentos_dia: ['cena'], etiquetas: ['pescado', 'lubina', 'verduras'] },
    { id: 'cena-4', titulo: 'Dorada a la plancha con ensalada', momentos_dia: ['cena'], etiquetas: ['pescado', 'dorada', 'ensalada'] },
    { id: 'cena-5', titulo: 'Crema ligera de espárragos verdes', momentos_dia: ['cena'], etiquetas: ['crema', 'verduras'] },
    { id: 'cena-6', titulo: 'Ensalada templada de gulas y gambas', momentos_dia: ['cena'], etiquetas: ['ensalada', 'gambas'] },
    { id: 'cena-7', titulo: 'Wok de pollo con verduras crujientes', momentos_dia: ['cena'], etiquetas: ['pollo', 'wok', 'verduras'] },
    { id: 'cena-8', titulo: 'Hamburguesa casera de pavo con ensalada', momentos_dia: ['cena'], etiquetas: ['pavo', 'hamburguesa'] },
    { id: 'cena-9', titulo: 'Calabacines rellenos de atún y huevo', momentos_dia: ['cena'], etiquetas: ['calabacin', 'atun', 'huevos'] },

    // --- POSTRES / SNACKS (3 recetas) ---
    { id: 'post-1', titulo: 'Macedonia de frutas frescas', momentos_dia: ['postre', 'snack'], etiquetas: ['postre', 'fruta'] },
    { id: 'post-2', titulo: 'Tarta de queso fit en airfryer', momentos_dia: ['postre'], etiquetas: ['postre', 'tarta', 'queso'] },
    { id: 'post-3', titulo: 'Bizcocho de avena y cacao puro', momentos_dia: ['postre', 'desayuno'], etiquetas: ['bizcocho', 'avena'] },
  ];

  return recipes as Receta[];
}

function runStressTestSuite() {
  console.log('========================================================================');
  console.log('🔬 TEST DE ESTRÉS Y VERIFICACIÓN DEL MOTOR DE PLANIFICACIÓN CULINARIA');
  console.log('========================================================================\n');

  const catalog = createMockCatalog53();
  console.log(`📦 Catálogo cargado: ${catalog.length} recetas en total.`);

  // 1. Verificación de clasificación heurística
  let primerosCount = 0;
  let principalesCount = 0;
  let postresCount = 0;

  for (const r of catalog) {
    const isDessert = (r.momentos_dia || []).includes('postre');
    const tagsNorm = (r.etiquetas || []).map((t) => t.toLowerCase());
    const titleNorm = (r.titulo || '').toLowerCase();
    const isStarter = isFirstCourseStarter(r, tagsNorm, titleNorm);

    if (isDessert) {
      postresCount++;
    } else if (isStarter) {
      primerosCount++;
    } else if ((r.momentos_dia || []).includes('almuerzo')) {
      principalesCount++;
    }
  }

  console.log('\n📊 CLASIFICACIÓN HEURÍSTICA DEDUCIDA (Sin rol_plato manual):');
  console.log(`- Entrantes / 1º Platos deducidos:  ${primerosCount} recetas`);
  console.log(`- Platos Principales deducidos:    ${principalesCount} recetas`);
  console.log(`- Postres excluidos de almuerzo:    ${postresCount} recetas`);
  console.log(`- Total candidatos almuerzo:        ${primerosCount + principalesCount} recetas\n`);

  // 2. Simulación Escenario A: 7 días completos con 1º + 2º Plato activado
  console.log('========================================================================');
  console.log('🧪 ESCENARIO A: 7 Días Completos con "intentarPrimeroYSegundo: true"');
  console.log('========================================================================');

  const resultA = generateMealPlan(catalog, {
    dias: 7,
    fechaInicio: '2026-10-26',
    incluirDesayunos: true,
    incluirAlmuerzos: true,
    intentarPrimeroYSegundo: true,
    incluirCenas: true,
  });

  const fechas = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'];
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  let missingMainCoursesA = 0;
  const assignedIdsA = new Set<string>();
  let duplicateCountA = 0;

  for (let i = 0; i < fechas.length; i++) {
    const f = fechas[i];
    const dia = diasSemana[i];
    const dayItems = resultA.items.filter((it) => it.fecha === f);

    const des = dayItems.find((it) => it.slot === 'desayuno');
    const alm1 = dayItems.find((it) => it.slot === 'almuerzo_1');
    const alm2 = dayItems.find((it) => it.slot === 'almuerzo_2');
    const cena = dayItems.find((it) => it.slot === 'cena');

    console.log(`\n📅 ${dia} (${f}):`);
    console.log(`   - Desayuno:   ${des ? `✅ "${des.receta.titulo}"` : '❌ NULL'}`);
    console.log(`   - 1º Plato:   ${alm1 ? `🥣 "${alm1.receta.titulo}"` : '⚪ [Vacío / + Asignar]'}`);
    console.log(`   - 2º Plato:   ${alm2 ? `🍽️ "${alm2.receta.titulo}"` : '❌ NULL (ERROR: Plato Principal huérfano!)'}`);
    console.log(`   - Cena:       ${cena ? `🌙 "${cena.receta.titulo}"` : '❌ NULL'}`);

    if (!alm2) {
      missingMainCoursesA++;
    }

    for (const it of dayItems) {
      if (assignedIdsA.has(it.receta.id)) {
        duplicateCountA++;
        console.log(`   ⚠️ Duplicado detectado: "${it.receta.titulo}"`);
      }
      assignedIdsA.add(it.receta.id);
    }
  }

  console.log('\n📈 RESULTADOS ESCENARIO A:');
  console.log(`- Días con plato principal al mediodía: ${7 - missingMainCoursesA} / 7`);
  console.log(`- Platos principales en null:           ${missingMainCoursesA}`);
  console.log(`- Días completos computados:            ${resultA.diasCompletos} / 7`);
  console.log(`- Primeros platos asignados:            ${resultA.estadisticas.primerosAsignados}`);
  console.log(`- Segundos platos asignados:            ${resultA.estadisticas.segundosAsignados}`);
  console.log(`- Duplicados intra-semanales:           ${duplicateCountA}`);
  console.log(`- Advertencias emitidas:                ${resultA.estadisticas.advertencias.length}`);
  resultA.estadisticas.advertencias.forEach((adv) => console.log(`  * ${adv}`));

  if (missingMainCoursesA === 0) {
    console.log('✅ ÉXITO TOTAL: Todos los 7 días tienen su plato principal garantizado al mediodía.');
  } else {
    console.error('❌ FALLO: Hubo días sin plato principal.');
    process.exit(1);
  }

  // 3. Simulación Escenario B: 7 días con stock limitado de primeros (solo 3 primeros disponibles)
  console.log('\n========================================================================');
  console.log('🧪 ESCENARIO B: Stock limitado de 1er plato (3 entrantes para 7 días)');
  console.log('========================================================================');

  const catalogWith3Starters = catalog.filter((r) => {
    // Mantener solo 3 primeros platos
    const isStarter = isFirstCourseStarter(r, (r.etiquetas || []).map((t) => t.toLowerCase()), (r.titulo || '').toLowerCase());
    if (isStarter) {
      return ['prim-1', 'prim-2', 'prim-3'].includes(r.id);
    }
    return true;
  });

  const resultB = generateMealPlan(catalogWith3Starters, {
    dias: 7,
    fechaInicio: '2026-10-26',
    incluirDesayunos: true,
    incluirAlmuerzos: true,
    intentarPrimeroYSegundo: true,
    incluirCenas: true,
  });

  let missingMainCoursesB = 0;
  let emptyStartersCountB = 0;

  for (let i = 0; i < fechas.length; i++) {
    const f = fechas[i];
    const dia = diasSemana[i];
    const dayItems = resultB.items.filter((it) => it.fecha === f);
    const alm1 = dayItems.find((it) => it.slot === 'almuerzo_1');
    const alm2 = dayItems.find((it) => it.slot === 'almuerzo_2');

    if (!alm1) emptyStartersCountB++;
    if (!alm2) missingMainCoursesB++;

    console.log(`   ${dia}: 1º -> ${alm1 ? `🥣 "${alm1.receta.titulo}"` : '⚪ [+ Asignar]'} | 2º -> ${alm2 ? `🍽️ "${alm2.receta.titulo}"` : '❌ NULL'}`);
  }

  console.log('\n📈 RESULTADOS ESCENARIO B:');
  console.log(`- Primeros platos distribuidos: ${resultB.estadisticas.primerosAsignados} / 3`);
  console.log(`- Slots de 1er plato en blanco (+ Asignar): ${emptyStartersCountB} / 7 (esperado: 4)`);
  console.log(`- Platos principales garantizados: ${7 - missingMainCoursesB} / 7`);

  if (missingMainCoursesB === 0 && emptyStartersCountB === 4) {
    console.log('✅ ÉXITO TOTAL: Los 4 días sin entrante quedaron como slots opcionales (+ Asignar) y el 2º plato se garantizó al 100%.');
  } else {
    console.error('❌ FALLO en Escenario B.');
    process.exit(1);
  }

  // 4. Simulación Escenario C: Modo Plato Único ("intentarPrimeroYSegundo: false")
  console.log('\n========================================================================');
  console.log('🧪 ESCENARIO C: Modo Plato Único (intentarPrimeroYSegundo: false)');
  console.log('========================================================================');

  const resultC = generateMealPlan(catalog, {
    dias: 7,
    fechaInicio: '2026-10-26',
    incluirDesayunos: true,
    incluirAlmuerzos: true,
    intentarPrimeroYSegundo: false,
    incluirCenas: true,
  });

  let missingUniqueLunchesC = 0;
  for (let i = 0; i < fechas.length; i++) {
    const f = fechas[i];
    const dia = diasSemana[i];
    const dayItems = resultC.items.filter((it) => it.fecha === f);
    const alm = dayItems.find((it) => it.slot === 'almuerzo');
    if (!alm) missingUniqueLunchesC++;
    console.log(`   ${dia}: Plato Único -> ${alm ? `🍲 "${alm.receta.titulo}"` : '❌ NULL'}`);
  }

  console.log('\n📈 RESULTADOS ESCENARIO C:');
  console.log(`- Platos únicos garantizados: ${7 - missingUniqueLunchesC} / 7`);
  console.log(`- Días completos: ${resultC.diasCompletos} / 7`);

  if (missingUniqueLunchesC === 0) {
    console.log('✅ ÉXITO TOTAL: 7 de 7 días tienen garantizado su plato único al mediodía.');
  } else {
    console.error('❌ FALLO en Escenario C.');
    process.exit(1);
  }
}

runStressTestSuite();
