import { RecetaIngrediente, RolCulinario } from '@/types/recipe';
import { MAX_SPOON_MAGNITUDE } from '@/lib/nutrition/formatQuantity';

export type { RolCulinario };

export type CulinaryCategory =
  | 'SPICE_AND_SALT'
  | 'COOKING_FAT'
  | 'LEAVENER_THICKENER'
  | 'REDUCTION_LIQUID'
  | 'BULK';

export interface ScaledIngredient extends RecetaIngrediente {
  cantidad_escalada: number;
  gramos_escalados: number;
  factor_aplicado: number;
  rol_culinario?: RolCulinario | string | null;
  categoria_culinaria?: CulinaryCategory;
  explicacion_culinaria?: string;
}

/**
 * LEY FÍSICA DE FLUIDOS DE COCCIÓN Y BASES HÚMEDAS:
 * Detecta si un ingrediente es un fluido o base húmeda de reducción según unidades de volumen físico y magnitud,
 * sin listas estáticas de alimentos.
 */
export interface CookingFluidCandidate {
  unidad?: string | null;
  cantidad?: number | null;
  gramos_calculados?: number | null;
  gramos_estimados?: number | null;
  rol_culinario?: RolCulinario | string | null;
  nombre_limpio?: string | null;
  nombre_crudo?: string | null;
  pasillo_supermercado?: string | null;
}

/**
 * LEY FÍSICA DE FLUIDOS DE COCCIÓN Y BASES HÚMEDAS DE REDUCCIÓN:
 * Detecta si un ingrediente ejerce la función de medio húmedo de cocción / fluido de reducción,
 * independientemente de si su unidad de medida es volumétrica ('ml', 'l') o gravimétrica ('g', 'kg'),
 * aplicando criterios funcionales de evaporación sublineal (ratio^0.75) sin listas estáticas de alimentos.
 */
export function isCookingFluid(
  unitOrCandidate?: string | CookingFluidCandidate | null,
  amount?: number | null,
  rol?: RolCulinario | string | null,
  ingredientName?: string | null,
  pasillo?: string | null
): boolean {
  let u = '';
  let cant = 0;
  let r: RolCulinario | string | null = null;
  let name = '';
  let aisle = '';
  let estWeight = 0;

  if (typeof unitOrCandidate === 'object' && unitOrCandidate !== null) {
    u = String(unitOrCandidate.unidad || '').toLowerCase().replace(/[.,;:]/g, '').trim();
    cant = Number(unitOrCandidate.cantidad) || 0;
    r = unitOrCandidate.rol_culinario || null;
    name = String(unitOrCandidate.nombre_limpio || unitOrCandidate.nombre_crudo || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    aisle = String(unitOrCandidate.pasillo_supermercado || '').trim();
    estWeight = Number(unitOrCandidate.gramos_calculados || unitOrCandidate.gramos_estimados || 0);
  } else {
    u = String(unitOrCandidate || '').toLowerCase().replace(/[.,;:]/g, '').trim();
    cant = Number(amount) || 0;
    r = rol || null;
    name = String(ingredientName || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    aisle = String(pasillo || '').trim();
  }

  // 1. Exclusiones termodinámicas:
  // Grasas puras de cocción (sartén ratio^0.65) e invariables (al gusto)
  if (r === 'grasa_coccion' || r === 'invariable') return false;

  // 2. Discriminación volumétrica directa ('ml', 'l', 'taza', 'vaso')
  const isVolumeUnit = /^(ml|mls|mililitro|mililitros|milliliter|milliliters|l|lt|lts|litro|litros|liter|liters|taza|tazas|cup|cups|vaso|vasos)$/i.test(u);
  if (isVolumeUnit) {
    const isLiterOrCup = /^(l|lt|lts|litro|litros|liter|liters|taza|tazas|cup|cups|vaso|vasos)$/i.test(u);
    if (isLiterOrCup) return true;
    return cant > 60;
  }

  // 3. Discriminación gravimétrica ('g', 'kg') o de envase ('bote', 'lata', 'tetrabrik') para bases húmedas:
  // Magnitud relevante requerida (> 60 g o kg):
  const isKg = /^(kg|kgs|kilo|kilos|kilogramo|kilogramos)$/i.test(u);
  const isPack = /^(bote|botes|lata|latas|can|cans|tetrabrik|brik|frasco|frascos)$/i.test(u);
  const isGram = /^(g|gr|grs|gramo|gramos)$/i.test(u);

  if (isKg || isGram || isPack) {
    const magnitudeGrams = isKg ? cant * 1000 : isPack ? (estWeight > 0 ? estWeight : cant * 250) : cant;
    if (magnitudeGrams <= 60) return false;

    // A) Pasillo de Bebidas (caldos líquidos, fondos, vino, agua comercializada por peso):
    if (/^bebidas$/i.test(aisle)) {
      return true;
    }

    // B) Naturaleza funcional del ingrediente como fluido de cocción, caldo, salsa o base húmeda de reducción:
    // Expresada mediante descriptores de estado físico culinario (caldo, fondo, salsa, crema, puré, triturado, licuado, leche/bebida, jugo):
    const isFluidPhysicalState = /\b(caldo|broth|stock|fondo|fond|fumet|salsa|sauce|passata|coulis|crema|cream|nata|leche|milk|bebida|pure|triturad[oa]|licuad[oa]|infusion|jugo|juice|zumo|agua|water|vino|wine|cerveza|beer|sidra|cider)\b/i.test(name);
    if (isFluidPhysicalState) {
      return true;
    }
  }

  return false;
}

/**
 * Infiere el rol culinario funcional para recetas previas o ingredientes sin rol explícito
 */
export function inferRolCulinario(
  rol?: string | null,
  nombre?: string | null,
  unidad?: string | null,
  cantidad?: number | null
): RolCulinario {
  if (rol) {
    const cleanRol = String(rol).toLowerCase().trim() as RolCulinario;
    if (
      cleanRol === 'principal' ||
      cleanRol === 'sofrito_base' ||
      cleanRol === 'guarnicion' ||
      cleanRol === 'grasa_coccion' ||
      cleanRol === 'condimento' ||
      cleanRol === 'invariable'
    ) {
      return cleanRol;
    }
  }

  const u = String(unidad || '').toLowerCase().trim();
  const n = String(nombre || '').toLowerCase().trim();
  const cant = Number(cantidad) || 0;

  // Fallback de compatibilidad para recetas previas en BD:
  // 1. unidad/nombre 'al gusto'/'pizca'/'to taste'/'c/n' -> 'invariable'
  if (
    u.includes('al gusto') ||
    u.includes('a gusto') ||
    u.includes('to taste') ||
    u.includes('pizca') ||
    u.includes('pinch') ||
    u === 'c/n' ||
    u === 'cn' ||
    u === 'c.n.' ||
    n.includes('al gusto') ||
    n.includes('to taste')
  ) {
    return 'invariable';
  }

  // 2. Grasas de cocción (aceites, mantequillas)
  if (/\b(aceite|oil|mantequilla|butter|manteca|ghee)\b/i.test(n)) {
    return 'grasa_coccion';
  }

  // 3. Aromáticos y base de sofrito (cebolla, ajo, puerro, chalota)
  if (/\b(cebolla|onion|ajo|garlic|puerro|leek|cebolleta|scallion|chalota|shallot)\b/i.test(n)) {
    return 'sofrito_base';
  }

  // 4. Especias y condimentos (pequeñas cantidades o unidades de cuchara)
  if (
    (/^(g|gr|grs|gramo|gramos|gram|grams)$/i.test(u) && cant <= 20) ||
    /^(cucharadita|cucharaditas|tsp|cdta|cdtas)$/i.test(u) ||
    /\b(pimienta|pepper|sal|salt|comino|cumin|oregano|orégano|pimenton|pimentón|canela|cinnamon|jengibre|ginger|soja|soy sauce|vinagre|vinegar|sesamo|sésamo|gochujang|miso|mostaza|mustard|ralladura|zest)\b/i.test(n)
  ) {
    return 'condimento';
  }

  // 5. Guarnición y acompañamientos secundarios
  if (/\b(champiñón|champiñon|champiñones|setas?|mushrooms?|guarnición|guarnicion)\b/i.test(n)) {
    return 'guarnicion';
  }

  // 6. Resto -> 'principal'
  return 'principal';
}

/**
 * Detecta si un ingrediente es un aromático o raíz de alta intensidad pungente
 * (jengibre fresco, chiles, guindillas, wasabi, rábano picante, etc.)
 */
export function isPungentAromatic(name?: string | null): boolean {
  if (!name) return false;
  return /\b(jengibre|ginger|guindilla|chile|chili|ají|aji|jalapeño|jalapeno|habanero|wasabi|rabanillo|horseradish|cayena|cayenne)\b/i.test(name);
}

/**
 * Techo máximo culinario de seguridad por comensal para evitar saturación sensorial
 */
export function getCulinaryCapPerServing(
  ingredientName?: string | null,
  unit?: string | null
): { maxPerServing: number; unit: string } | null {
  if (!ingredientName) return null;
  const n = ingredientName.toLowerCase().trim();
  const u = (unit || '').toLowerCase().trim();

  // 1. Jengibre fresco rallado: máximo 2.5 g por comensal (para 6 personas -> máximo 15 g)
  if (/\b(jengibre|ginger)\b/i.test(n)) {
    if (/^(g|gr|grs|gramo|gramos|gram|grams)$/i.test(u) || !u) {
      return { maxPerServing: 2.5, unit: 'g' };
    }
    if (/cucharad/i.test(u) || /tbsp|tsp/i.test(u)) {
      return { maxPerServing: 0.35, unit: u };
    }
  }

  // 2. Chiles / guindillas frescas: máximo 2 g por comensal o 0.5 unidades
  if (/\b(guindilla|chile|chili|ají|aji|jalapeño|jalapeno|habanero)\b/i.test(n)) {
    if (/^(g|gr|grs|gramo|gramos)$/i.test(u)) {
      return { maxPerServing: 2.0, unit: 'g' };
    }
    if (/unidad|unit|pieza/i.test(u)) {
      return { maxPerServing: 0.5, unit: u };
    }
  }

  // 3. Ralladura de cítricos (limón, naranja, lima): máximo 0.75 g por comensal (~1 limón cada 4-6 personas)
  if (/\b(ralladura|zest)\b/i.test(n)) {
    if (/^(g|gr|grs|gramo|gramos)$/i.test(u)) {
      return { maxPerServing: 0.75, unit: 'g' };
    }
  }

  // 4. Wasabi / pasta de rábano picante: máximo 1.5 g por comensal
  if (/\b(wasabi|horseradish)\b/i.test(n)) {
    if (/^(g|gr|grs|gramo|gramos)$/i.test(u)) {
      return { maxPerServing: 1.5, unit: 'g' };
    }
  }

  return null;
}

/**
 * Normaliza cantidades y unidades al sustituir ingredientes con diferente densidad física o potencia sensorial
 * (evitando por ejemplo que 30 g de jengibre se conviertan en 30 g de ralladura de limón)
 */
export function normalizeSubstituteQuantityAndUnit(
  sourceName: string,
  substituteName: string,
  currentAmount: number,
  currentUnit: string,
  currentRol?: RolCulinario | string | null
): { cantidad: number; unidad: string; rol_culinario: RolCulinario } {
  const sNorm = (sourceName || '').toLowerCase().trim();
  const tNorm = (substituteName || '').toLowerCase().trim();
  const uNorm = (currentUnit || '').toLowerCase().trim();
  const amount = Number(currentAmount) || 1;

  // Caso 1: Sustitución por ralladura de cítricos (limón, lima, naranja) desde un sólido/raíz
  if (/\b(ralladura|zest)\b/i.test(tNorm)) {
    if (/^(g|gr|grs|gramo|gramos)$/i.test(uNorm) && amount > 4) {
      // 30 g de jengibre -> 1 cucharadita de ralladura
      return {
        cantidad: 1,
        unidad: 'cucharadita',
        rol_culinario: 'condimento',
      };
    }
    if (amount > 3 && (/cucharada/i.test(uNorm) || /tbsp/i.test(uNorm))) {
      return {
        cantidad: 1,
        unidad: 'cucharadita',
        rol_culinario: 'condimento',
      };
    }
    return {
      cantidad: Math.max(0.5, Math.min(2, amount)),
      unidad: uNorm && !/^(g|gr|gramos)$/i.test(uNorm) ? currentUnit : 'cucharadita',
      rol_culinario: 'condimento',
    };
  }

  // Caso 2: Sustitución de grasa sólida (mantequilla) por grasa líquida (aceite / AOVE)
  if (/\b(mantequilla|butter)\b/i.test(sNorm) && /\b(aceite|oil|aove)\b/i.test(tNorm)) {
    const isGrams = /^(g|gr|grs|gramo|gramos)$/i.test(uNorm);
    return {
      cantidad: isGrams ? Math.round(amount * 0.8) : amount,
      unidad: isGrams ? 'ml' : currentUnit,
      rol_culinario: 'grasa_coccion',
    };
  }

  // Caso 3: Sustitución de hierba/especia fresca a seca o en polvo
  if (/\b(fresco|fresca|fresh)\b/i.test(sNorm) && /\b(seco|seca|polvo|powder|extracto)\b/i.test(tNorm)) {
    return {
      cantidad: Math.max(0.5, roundCulinaryAmount(amount / 3, 'cucharadita')),
      unidad: /cucharada|tbsp/i.test(uNorm) ? 'cucharadita' : /g|gr/i.test(uNorm) ? 'cucharadita' : currentUnit,
      rol_culinario: 'condimento',
    };
  }

  // Caso 4: Por defecto inferir rol de destino manteniendo coherencia
  const inferredRol = inferRolCulinario(currentRol, substituteName, currentUnit, amount);
  let finalCant = amount;
  let finalU = currentUnit || 'unidad';

  // LEY UNIVERSAL DE MAGNITUD DE UNIDADES CULINARIAS (BARRERA <= 60):
  const isTspSub = /^(cucharadita|cucharaditas|tsp|cdita|cditas)$/i.test(finalU);
  const isTbspSub = /^(cucharada|cucharadas|tbsp|cda|cdas)$/i.test(finalU);
  if (isTspSub || isTbspSub) {
    const mag = finalCant * (isTspSub ? 5 : 15);
    if (finalCant > MAX_SPOON_MAGNITUDE || mag > MAX_SPOON_MAGNITUDE) {
      finalCant = finalCant <= MAX_SPOON_MAGNITUDE ? mag : finalCant;
      finalU = 'g';
    }
  }

  return {
    cantidad: finalCant,
    unidad: finalU,
    rol_culinario: inferredRol,
  };
}

/**
 * Calcula el factor de escala culinario según el rol funcional y ratio de porciones,
 * incorporando la física de fluidos sublineal (ratio^0.75) para líquidos y bases húmedas de cocción.
 */
export function getScalingFactor(
  rol: RolCulinario,
  ratio: number,
  ingredientName?: string,
  unit?: string | null,
  amount?: number | null,
  pasillo?: string | null
): number {
  if (ratio === 1 || isNaN(ratio)) return 1.0;

  // LEY FÍSICA DE FLUIDOS: evaporación sublineal para líquidos y bases húmedas de cocción lenta/reducción
  if (isCookingFluid(unit, amount, rol, ingredientName, pasillo)) {
    return Math.pow(ratio, 0.75);
  }

  // Factor sensorial sublineal para aromáticos pungentes si aplica
  if (isPungentAromatic(ingredientName)) {
    return Math.pow(ratio, 0.45);
  }

  switch (rol) {
    case 'principal':
      return ratio; // Lineal 1:1 (masa sólida estructural)
    case 'sofrito_base':
      return Math.pow(ratio, 0.75); // Amortiguación de sofritos/aromáticos
    case 'guarnicion':
      return Math.pow(ratio, 0.80); // Amortiguación de acompañamientos húmedos/setas
    case 'grasa_coccion':
      return Math.pow(ratio, 0.65); // Amortiguación por superficie de cocción
    case 'condimento':
      return Math.pow(ratio, 0.70); // Amortiguación sensorial
    case 'invariable':
      return 1.0; // Inmutable
    default:
      return ratio;
  }
}

/**
 * Redondeo culinario natural respetando reglas de tipografía y unidades discretas
 */
export function roundCulinaryAmount(amount: number, unidad?: string | null): number {
  try {
    const u = String(unidad || '').toLowerCase().replace(/[.,;:]/g, '').trim();

    // 1. Gramos y mililitros: <= 20 entero limpio (mínimo 1), > 20 múltiplos de 5
    if (/^(g|gr|grs|gramo|gramos|gram|grams|ml|mls|mililitro|mililitros)$/i.test(u)) {
      if (amount <= 0) return 0;
      if (amount > 20) return Math.round(amount / 5) * 5;
      return Math.max(1, Math.round(amount));
    }

    // 2. Kilogramos y litros: decimales limpios, 1 decimal máximo
    if (/^(kg|kgs|kilo|kilos|kilogramo|kilogramos|kilogram|kilograms|l|lt|lts|litro|litros|liter|liters)$/i.test(u)) {
      if (amount <= 0) return 0;
      if (Number.isInteger(amount)) return amount;
      return Math.round(amount * 10) / 10;
    }

    // 3. Unidades discretas (dientes/cloves, unidades/units, huevos/eggs, piezas/pieces):
    //    Redondear al entero más próximo si >= 1.75; permitir mitades (0.5 o 1.5) si < 1.75
    if (
      u.includes('unidad') ||
      u.includes('unit') ||
      u.includes('huevo') ||
      u.includes('egg') ||
      u.includes('diente') ||
      u.includes('clove') ||
      u.includes('pieza') ||
      u.includes('piece')
    ) {
      if (amount >= 1.75) return Math.round(amount);
      return Math.max(0.5, Math.round(amount * 2) / 2);
    }

    // 4. Medidas de cuchara / taza (si > 3 redondear al medio más próximo "3 ½"; si <= 3 múltiplos de 0.25)
    if (/cuchara|tbsp|tsp|taza|cup/i.test(u)) {
      if (amount > 3) {
        return Math.round(amount * 2) / 2;
      }
      return Math.round(amount * 4) / 4;
    }

    if (amount < 1) {
      return Math.round(amount * 10) / 10;
    }
    return Math.round(amount * 10) / 10;
  } catch {
    return Math.round(amount * 10) / 10;
  }
}

/**
 * Escala una lista de ingredientes con heurísticas culinarias funcionales por rol.
 */
export function scaleIngredientsWithCulinaryHeuristics(
  ingredientes?: (RecetaIngrediente & { rol_culinario?: string | null })[] | null,
  baseServings: number = 2,
  targetServings: number = 2
): ScaledIngredient[] {
  if (!Array.isArray(ingredientes) || ingredientes.length === 0) return [];

  const bServings = Number(baseServings) > 0 ? Number(baseServings) : 2;
  const tServings = Number(targetServings) > 0 ? Number(targetServings) : 1;
  const ratio = tServings / bServings;

  return ingredientes.map((ing) => {
    try {
      const name = ing?.nombre_limpio || ing?.nombre_crudo || 'Ingrediente';
      const rol = inferRolCulinario(ing?.rol_culinario, name, ing?.unidad, ing?.cantidad);
      const isFluid = isCookingFluid(ing?.unidad, ing?.cantidad, rol, name, ing?.pasillo_supermercado);
      const factor = isFluid
        ? Math.pow(ratio, 0.75)
        : getScalingFactor(rol, ratio, name, ing?.unidad, ing?.cantidad, ing?.pasillo_supermercado);

      const rawCant = Number(ing?.cantidad) || 1;
      const rawGramos = Number(ing?.gramos_calculados) || 0;

      // Calcular cantidad base escalada
      let rawScaledCant = rawCant * factor;
      let rawScaledGramos = rawGramos > 0 ? rawGramos * factor : 0;

      // Aplicar techo culinario de seguridad por comensal si aplica
      const cap = getCulinaryCapPerServing(name, ing?.unidad);
      let capApplied = false;
      if (cap && cap.maxPerServing > 0) {
        const maxAllowed = cap.maxPerServing * tServings;
        if (rawScaledCant > maxAllowed) {
          rawScaledCant = maxAllowed;
          capApplied = true;
          if (rawGramos > 0) {
            rawScaledGramos = Math.min(rawScaledGramos, maxAllowed);
          }
        }
      }

      // LEY UNIVERSAL DE MAGNITUD DE UNIDADES CULINARIAS (BARRERA <= 60):
      // Las unidades domésticas ('cucharada', 'cucharadita', 'tbsp', 'tsp') quedan restringidas
      // EXCLUSIVAMENTE a ingredientes con magnitud cuantitativa <= 60 (gramos o mililitros).
      // Cualquier ingrediente cuya cantidad sea > 60 queda terminantemente bloqueado para unidades de cuchara.
      // Debe conservarse y formatearse obligatoriamente en unidades de masa o volumen estándar ('g', 'ml', 'kg', 'l').
      let finalUnit = ing?.unidad || '';
      const uNorm = finalUnit.toLowerCase().replace(/[.,;:]/g, '').trim();
      const isTsp = /^(cucharadita|cucharaditas|tsp|cdita|cditas)$/i.test(uNorm);
      const isTbsp = /^(cucharada|cucharadas|tbsp|cda|cdas)$/i.test(uNorm);
      const isSpoon = isTsp || isTbsp;

      if (isSpoon) {
        const spoonMagnitude = rawScaledCant * (isTsp ? 5 : 15);
        const magnitude = Math.max(rawScaledCant, spoonMagnitude);

        if (magnitude > MAX_SPOON_MAGNITUDE) {
          finalUnit = isFluid || /ml/i.test(uNorm) ? 'ml' : 'g';
          rawScaledCant = magnitude;
          if (rawScaledGramos <= 0) {
            rawScaledGramos = magnitude;
          }
        }
      }

      const scaledCantidad = roundCulinaryAmount(rawScaledCant, finalUnit);
      const scaledGramos = rawGramos > 0 ? Math.round(rawScaledGramos) : (finalUnit === 'g' ? Math.round(scaledCantidad) : 0);

      let explicacion: string | undefined = undefined;
      if (ratio !== 1) {
        if (isFluid) {
          explicacion = 'Factor sublineal por dinámica de evaporación y superficie libre del recipiente.';
        } else if (capApplied) {
          explicacion = 'Tope culinario de seguridad por comensal para evitar exceso de potencia.';
        } else if (isPungentAromatic(name)) {
          explicacion = 'Amortiguación sensorial reforzada de aromático pungente.';
        } else {
          switch (rol) {
            case 'sofrito_base':
              explicacion = 'Amortiguación de sofrito aromático base.';
              break;
            case 'guarnicion':
              explicacion = 'Amortiguación de guarnición y verduras secundarias.';
              break;
            case 'grasa_coccion':
              explicacion = 'Ajuste adaptado a la superficie del fondo de cocción.';
              break;
            case 'condimento':
              explicacion = 'Amortiguación sensorial de especias y condimentos.';
              break;
            case 'invariable':
              explicacion = 'Cantidad invariable adaptada al gusto individual.';
              break;
          }
        }
      }

      const category: CulinaryCategory = isFluid
        ? 'REDUCTION_LIQUID'
        : (rol === 'condimento' || rol === 'invariable'
        ? 'SPICE_AND_SALT'
        : rol === 'grasa_coccion'
        ? 'COOKING_FAT'
        : 'BULK');

      return {
        ...ing,
        unidad: finalUnit,
        cantidad_escalada: scaledCantidad,
        gramos_escalados: scaledGramos,
        factor_aplicado: factor,
        rol_culinario: rol,
        categoria_culinaria: category,
        explicacion_culinaria: explicacion,
      };
    } catch {
      const fallbackCant = Number(ing?.cantidad) || 1;
      return {
        ...ing,
        cantidad_escalada: fallbackCant * ratio,
        gramos_escalados: Number(ing?.gramos_calculados) || 0,
        factor_aplicado: ratio,
        categoria_culinaria: 'BULK',
      };
    }
  });
}

/**
 * Escala tiempos de cocción de forma realista (no duplica el tiempo de horno ni sellado)
 */
export function scaleCookingTime(baseTimeMin?: number | null, ratio: number = 1): number {
  try {
    const bTime = Number(baseTimeMin) || 0;
    if (bTime <= 0) return 0;
    if (ratio === 1 || isNaN(ratio)) return bTime;
    const scaled = bTime * Math.pow(ratio, 0.32);
    return Math.round(scaled);
  } catch {
    return Number(baseTimeMin) || 0;
  }
}
