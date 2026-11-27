import { formatIngredientUnit } from '@/lib/culinary/aisles';
import { isCanonicalSpiceHerbSaltOrPepper } from '@/lib/gemini/schema';

/**
 * LEY UNIVERSAL DE MAGNITUD DE UNIDADES CULINARIAS:
 * Las unidades domésticas ('cucharada', 'cucharadita', 'tbsp', 'tsp') quedan restringidas
 * EXCLUSIVAMENTE a ingredientes con magnitud cuantitativa <= 60 (gramos o mililitros).
 * Cualquier ingrediente cuya cantidad sea > 60 queda terminantemente bloqueado para unidades de cuchara
 * y debe conservarse y formatearse obligatoriamente en unidades de masa o volumen estándar ('g', 'ml', 'kg', 'l').
 */
export const MAX_SPOON_MAGNITUDE = 60;

/**
 * Detecta si un ingrediente es líquido o grasa fluida (aceites, vinagres, salsas líquidas,
 * leche, nata, caldos, agua, zumos, miel, siropes, extractos) para que al superar
 * el umbral de cucharadas (> 60) se exprese en 'ml' y no en 'g'.
 */
export function isLiquidOrFluidIngredient(
  ingredientName?: string | null,
  unit?: string | null
): boolean {
  const u = (unit || '').toLowerCase().trim();
  if (/\b(ml|mls|mililitro|mililitros|l|lt|lts|litro|litros)\b/i.test(u)) {
    return true;
  }
  const n = (ingredientName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (!n) return false;

  return /\b(aceite|aove|oil|vinagre|vinegar|salsa|sauce|soja|soy|tamari|teriyaki|worcestershire|ostras|pescado|leche|milk|bebida|nata|cream|caldo|broth|stock|fondo|fumet|agua|water|vino|wine|cerveza|beer|sidra|cider|zumo|jugo|juice|miel|honey|sirope|syrup|jarabe|melaza|extracto|esencia|ketchup|passata|gazpacho|salmorejo|batido|smoothie|cafe|coffee|te|infusion|limonada)\b/i.test(
    n
  );
}

/**
 * Convierte a singular un sustantivo culinario en español respetando palabras
 * cuyo singular termina en '-e' (tomates -> tomate, aguacates -> aguacate,
 * filetes -> filete, dientes -> diente) y evitando cortes incorrectos.
 */
export function singularizeSpanishCulinaryNoun(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  const words = trimmed.split(/\s+/);
  const firstWord = words[0];
  const rest = words.slice(1).join(' ');
  const lower = firstWord.toLowerCase();

  if (!lower.endsWith('s') || lower.length <= 3) {
    return trimmed;
  }

  // Excepciones culinarias invariables o con singular específico en consonante
  const explicitMap: Record<string, string> = {
    panes: 'pan',
    coles: 'col',
    coliflores: 'coliflor',
    flores: 'flor',
    frijoles: 'frijol',
    caracoles: 'caracol',
    arboles: 'árbol',
    árboles: 'árbol',
    boles: 'bol',
    ravioles: 'ravioli',
    mejillones: 'mejillón',
    champiñones: 'champiñón',
    champinones: 'champiñón',
    pimentones: 'pimentón',
    limones: 'limón',
    melocotones: 'melocotón',
    calabacines: 'calabacín',
    calabazines: 'calabacín',
    nueces: 'nuez',
    arroces: 'arroz',
    maíces: 'maíz',
    maices: 'maíz',
    bueyes: 'buey',
    ajos: 'ajo',
    huevos: 'huevo',
  };

  let singFirst = lower;
  if (explicitMap[lower]) {
    singFirst = explicitMap[lower];
  } else if (lower.endsWith('ces') && lower.length > 4) {
    singFirst = lower.slice(0, -3) + 'z';
  } else if (lower.endsWith('ones') && lower.length > 5) {
    singFirst = lower.slice(0, -4) + 'ón';
  } else if (lower.endsWith('ines') && lower.length > 5) {
    singFirst = lower.slice(0, -4) + 'ín';
  } else if (lower.endsWith('anes') && lower.length > 5) {
    singFirst = lower.slice(0, -4) + 'án';
  } else if (/(?:res|des|jes|yes)$/.test(lower) && lower.length > 4) {
    // Palabras con singular en -r, -d, -j, -y (ej. sabores -> sabor, mitades -> mitad, bueyes -> buey)
    // Excepción: palabras acabadas en -gres/-tres/-bres/-dres/-pres/-vres cuyo singular acaba en -e (ej. vinagres, postres, sobres)
    if (/(?:gres|tres|bres|dres|pres|vres|cres|fres)$/.test(lower)) {
      singFirst = lower.slice(0, -1);
    } else {
      singFirst = lower.slice(0, -2);
    }
  } else {
    // Regla general para palabras acabadas en -s (incluye tomates->tomate, aguacates->aguacate, filetes->filete, dientes->diente, chiles->chile)
    singFirst = lower.slice(0, -1);
  }

  // Preservar mayúscula inicial si existía
  if (firstWord.charAt(0) === firstWord.charAt(0).toUpperCase() && firstWord.charAt(0) !== firstWord.charAt(0).toLowerCase()) {
    singFirst = singFirst.charAt(0).toUpperCase() + singFirst.slice(1);
  }

  return rest ? `${singFirst} ${rest}` : singFirst;
}

/**
 * Convierte un número decimal frecuente a su representación de fracción culinaria tipográfica
 * con caracteres Unicode individuales (ej: 0.5 -> "½", 0.25 -> "¼", 0.75 -> "¾", 1.5 -> "1 ½", 1.25 -> "1 ¼").
 * Reservado EXCLUSIVAMENTE para unidades contables y medidas volumétricas tradicionales (cucharas/tazas).
 */
export function formatQuantityNumber(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '1';
  }

  // Manejo de enteros
  if (Number.isInteger(amount)) {
    return String(amount);
  }

  // Si el número entero supera 3 (ej. mantequilla), prefiere redondear al medio más próximo ("3 ½ cucharadas" en vez de "3 1/4")
  if (amount > 3) {
    const roundedToHalf = Math.round(amount * 2) / 2;
    if (Number.isInteger(roundedToHalf)) {
      return String(roundedToHalf);
    }
    const intP = Math.floor(roundedToHalf);
    return `${intP} ½`;
  }

  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 1000) / 1000;

  // Tolerancia para aproximación de fracciones comunes (1/8, 1/4, 1/3, 1/2, 2/3, 3/4)
  const EPSILON = 0.045;

  let fractionUnicode = '';

  if (Math.abs(decimalPart - 0.25) <= EPSILON) {
    fractionUnicode = '¼';
  } else if (Math.abs(decimalPart - 0.5) <= EPSILON) {
    fractionUnicode = '½';
  } else if (Math.abs(decimalPart - 0.75) <= EPSILON) {
    fractionUnicode = '¾';
  } else if (Math.abs(decimalPart - 0.333) <= EPSILON) {
    fractionUnicode = '⅓';
  } else if (Math.abs(decimalPart - 0.667) <= EPSILON) {
    fractionUnicode = '⅔';
  } else if (Math.abs(decimalPart - 0.125) <= EPSILON) {
    fractionUnicode = '⅛';
  }

  if (fractionUnicode) {
    if (integerPart === 0) {
      return fractionUnicode;
    }
    // Entero + fracción: separa siempre con un espacio limpio (ej: "1 ¼", "1 ½", "1 ¾", "2 ½")
    return `${integerPart} ${fractionUnicode}`;
  }

  // Si no encaja en fracciones culinarias estándar, redondear a 1 decimal sin ceros sobrantes
  const rounded = Math.round(amount * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Determina si un sustantivo culinario en español es de género gramatical femenino
 * (ej: cebolla, manzana, zanahoria, patata, naranja, lima, pera, calabaza, berenjena).
 */
export function isFeminineCulinaryNoun(name?: string | null): boolean {
  if (!name) return false;
  const clean = name.trim().toLowerCase();

  // Excepciones masculinas comunes que terminan en 'a'
  if (/^(clima|día|mapa|planeta|idioma|aroma|sistema)\b/i.test(clean)) {
    return false;
  }

  // Sustantivos femeninos culinarios frecuentes
  if (
    /\b(cebolla|manzana|zanahoria|patata|papa|naranja|lima|pera|calabaza|berenjena|coliflor|col|lechuga|fresa|frambuesa|cereza|ciruela|mandarina|sandía|albahaca|canela|menta|hierbabuena|nuez|almendra|avellana|castaña|vainilla|nata|leche|harina|pimienta|mostaza)\b/i.test(
      clean
    )
  ) {
    return true;
  }

  // Heurística general: si la primera palabra sustantiva termina en 'a'
  const firstWord = clean.split(/\s+/)[0] || '';
  return firstWord.endsWith('a');
}

/**
 * Pluraliza un sustantivo o frase culinaria cuando la cantidad es mayor que 1.
 * Ejemplos:
 * - ("Cebolla", "es") -> "cebollas"
 * - ("Limón", "es") -> "limones"
 * - ("Nuez", "es") -> "nueces"
 * - ("Tomate", "es") -> "tomates"
 * - ("Onion", "en") -> "onions"
 * - ("Lemon", "en") -> "lemons"
 */
export function pluralizeCulinaryNoun(name: string, lang: 'es' | 'en' = 'es'): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  const words = trimmed.split(/\s+/);
  const firstWord = words[0];
  const rest = words.slice(1).join(' ');

  const lower = firstWord.toLowerCase();

  // Si ya termina en 's', no volver a pluralizar
  if (lower.endsWith('s')) {
    return trimmed.toLowerCase();
  }

  let pluralFirst = lower;

  if (lang === 'en') {
    if (lower === 'tomato') pluralFirst = 'tomatoes';
    else if (lower === 'potato') pluralFirst = 'potatoes';
    else if (lower.endsWith('y') && !/[aeiou]y$/.test(lower)) pluralFirst = lower.slice(0, -1) + 'ies';
    else pluralFirst = lower + 's';
  } else {
    // Español
    if (lower.endsWith('z')) {
      pluralFirst = lower.slice(0, -1) + 'ces';
    } else if (lower.endsWith('ón')) {
      pluralFirst = lower.slice(0, -2) + 'ones';
    } else if (lower.endsWith('án')) {
      pluralFirst = lower.slice(0, -2) + 'anes';
    } else if (lower.endsWith('ín')) {
      pluralFirst = lower.slice(0, -2) + 'ines';
    } else if (/[aeiouáéíóú]$/.test(lower)) {
      pluralFirst = lower + 's';
    } else {
      pluralFirst = lower + 'es';
    }
  }

  return rest ? `${pluralFirst} ${rest}` : pluralFirst;
}

/**
 * Formatea una cantidad y unidad culinaria con soporte bilingüe, respetando:
 * 1. BARRERA DE ENTRADA INCONDICIONAL PARA MÉTRICAS (g, ml):
 *    ESTRICTAMENTE PROHIBIDO llamar a lógica de fracciones (ni 1/2, ni 1/3, etc.).
 *    - Si <= 20: entero limpio con Math.round (ej: 3.9 -> 4 g, 4.4 -> 4 g, 1.9 -> 2 g, 2.33 -> 2 g).
 *    - Si > 20: múltiplo de 5 según aplique (ej: 24 -> 25 g).
 *    - Devuelve inmediatamente `${entero} ${unit}`.
 * 2. BARRERA DE ENTRADA INCONDICIONAL PARA KILOS Y LITROS (kg, l):
 *    Redondeo a 1 decimal máximo solo si no es entero (ej: 1.5 kg, nunca fracciones).
 * 3. FRACCIONES EXCLUSIVAS:
 *    Restringidas ÚNICAMENTE a unidades contables ('unidad', 'unidades', 'diente', 'dientes')
 *    o medidas de cuchara/taza ('cucharada', 'cucharadita', 'taza', 'tbsp', 'tsp').
 */
export function formatCulinaryAmount(
  amount: number,
  unit?: string | null,
  lang: 'es' | 'en' = 'es',
  ingredientName?: string | null,
  isBaking: boolean = false
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '1';
  }

  const rawUnit = typeof unit === 'string' ? unit : String(unit || '');
  const u = rawUnit.toLowerCase().replace(/[.,;:]/g, '').trim();
  const name = (ingredientName || '').toLowerCase().trim();

  // 0. BARRERA DE ENTRADA INCONDICIONAL: TÉRMINOS INVARIABLES ("al gusto", "c/n")
  if (
    u.includes('al gusto') ||
    u.includes('a gusto') ||
    u.includes('to taste') ||
    u === 'c/n' ||
    u === 'c.n.' ||
    u === 'cn'
  ) {
    return lang === 'en' ? 'to taste' : 'al gusto';
  }

  // 0.1 GUARDA DEFENSIVA: ESPECIAS, HIERBAS Y CONDIMENTOS CON GRAMAJES OBSOLETOS (<= 15 g / ml / cucharadita)
  // Fuerza a nivel visual "al gusto" / "to taste" SOLO en platos salados; en repostería/postres respeta la medida exacta.
  const isSmallMeasureUnit =
    /^(g|gr|grs|gramo|gramos|gram|grams|mg|cucharadita|cucharaditas|cdita|cditas|tsp|teaspoon|teaspoons|cucharada|cucharadas|cda|cdas|tbsp|tablespoon|tablespoons)$/i.test(
      u
    );
  if (!isBaking && isSmallMeasureUnit && amount <= 15 && ingredientName) {
    if (isCanonicalSpiceHerbSaltOrPepper(ingredientName, ingredientName)) {
      return lang === 'en' ? 'to taste' : 'al gusto';
    }
  }

  // BARRERA: Pizcas (siempre invariable: nunca "2 ½ pizcas")
  if (/^(pizca|pizcas|pinch|pinches)$/i.test(u)) {
    return lang === 'en' ? '1 pinch' : '1 pizca';
  }

  // =========================================================================
  // 1. LEY UNIVERSAL DE MAGNITUD DE UNIDADES CULINARIAS (BARRERA <= 60)
  //    Las unidades de cuchara quedan restringidas EXCLUSIVAMENTE a magnitud <= 60.
  //    Cualquier ingrediente cuya cantidad sea > 60 queda terminantemente bloqueado
  //    para unidades de cuchara y DEBE formatearse en masa o volumen estándar ('g', 'ml', 'kg', 'l').
  // =========================================================================
  const isTsp = /^(cucharadita|cucharaditas|tsp|cdita|cditas|teaspoon|teaspoons)$/i.test(u);
  const isTbsp = /^(cucharada|cucharadas|tbsp|cda|cdas|tablespoon|tablespoons)$/i.test(u);
  const isSpoon = isTsp || isTbsp;

  if (isSpoon) {
    const spoonMagnitude = isTsp ? amount * 5 : amount * 15;
    const magnitude = Math.max(amount, spoonMagnitude);

    if (magnitude > MAX_SPOON_MAGNITUDE) {
      const isLiquid = isLiquidOrFluidIngredient(ingredientName, u);
      const metricLabel = isLiquid ? 'ml' : 'g';
      if (magnitude >= 1000) {
        const kgOrL = Math.round((magnitude / 1000) * 10) / 10;
        const bigUnit = isLiquid ? 'l' : 'kg';
        return `${Number.isInteger(kgOrL) ? String(kgOrL) : kgOrL.toFixed(1)} ${bigUnit}`;
      }
      let entero: number;
      if (magnitude <= 20) {
        entero = Math.max(1, Math.round(magnitude));
      } else {
        entero = Math.round(magnitude / 5) * 5;
        if (entero === 0) entero = Math.round(magnitude);
      }
      return `${entero} ${metricLabel}`;
    }
  }

  // =========================================================================
  // 2. BARRERA DE ENTRADA INCONDICIONAL: GRAMOS Y MILILITROS
  //    ESTRICTAMENTE PROHIBIDO llamar a cualquier lógica de fracciones o cucharas.
  // =========================================================================
  const isGram = /^(g|gr|grs|gramo|gramos|gram|grams)$/i.test(u);
  const isMl = /^(ml|mls|mililitro|mililitros|milliliter|milliliters)$/i.test(u);

  if (isGram || isMl) {
    const metricLabel = isMl ? 'ml' : 'g';
    if (amount <= 0) return `0 ${metricLabel}`;

    if (amount >= 1000) {
      const kgOrL = Math.round((amount / 1000) * 10) / 10;
      const bigUnit = isMl ? 'l' : 'kg';
      return `${Number.isInteger(kgOrL) ? String(kgOrL) : kgOrL.toFixed(1)} ${bigUnit}`;
    }

    let entero: number;
    if (amount <= 20) {
      entero = Math.max(1, Math.round(amount));
    } else {
      entero = Math.round(amount / 5) * 5;
      if (entero === 0) entero = Math.round(amount);
    }
    return `${entero} ${metricLabel}`;
  }

  // =========================================================================
  // 2. BARRERA DE ENTRADA INCONDICIONAL: KILOGRAMOS Y LITROS
  //    Redondeo a 1 decimal máximo solo si no es entero (nunca fracciones).
  // =========================================================================
  const isKg = /^(kg|kgs|kilo|kilos|kilogramo|kilogramos|kilogram|kilograms)$/i.test(u);
  const isLiter = /^(l|lt|lts|litro|litros|liter|liters)$/i.test(u);

  if (isKg || isLiter) {
    const metricLabel = isKg ? 'kg' : 'l';
    if (amount <= 0) return `0 ${metricLabel}`;
    if (Number.isInteger(amount)) {
      return `${amount} ${metricLabel}`;
    }
    const dec = Math.round(amount * 10) / 10;
    return `${Number.isInteger(dec) ? String(dec) : dec.toFixed(1)} ${metricLabel}`;
  }

  // =========================================================================
  // 3. FRACCIONES EXCLUSIVAS:
  //    Restringidas ÚNICAMENTE a unidades contables y medidas de cuchara/taza.
  // =========================================================================
  const isGarlic = /\bajo(s)?\b|\bgarlic\b/i.test(name) || /\bajo(s)?\b|\bgarlic\b/i.test(u);
  const isClove = /^(diente|dientes|clove|cloves)$/i.test(u);
  const isCountableUnit = /^(unidad|unidades|unit|units|pieza|piezas|piece|pieces|ud|uds|huevo|huevos|egg|eggs)$/i.test(u);
  const isSpoonOrCup = /^(cucharada|cucharadas|cucharadita|cucharaditas|tbsp|tsp|taza|tazas|cup|cups|vaso|vasos)$/i.test(u);

  // A) Heurística defensiva para el ajo: unidad obligatoria "diente" / "dientes"
  if (isGarlic && (isCountableUnit || isClove || !u)) {
    const effectiveAmount =
      amount >= 1.75
        ? Math.round(amount)
        : Math.max(0.5, Math.round(amount * 2) / 2);
    const cloveUnit =
      lang === 'en'
        ? effectiveAmount > 1
          ? 'cloves'
          : 'clove'
        : effectiveAmount > 1
        ? 'dientes'
        : 'diente';
    const numStr = formatQuantityNumber(effectiveAmount);
    return `${numStr} ${cloveUnit}`;
  }

  // B) Dientes de ajo o afines explícitos
  if (isClove) {
    const effectiveAmount =
      amount >= 1.75
        ? Math.round(amount)
        : Math.max(0.5, Math.round(amount * 2) / 2);
    const cloveUnit =
      lang === 'en'
        ? effectiveAmount > 1
          ? 'cloves'
          : 'clove'
        : effectiveAmount > 1
        ? 'dientes'
        : 'diente';
    const numStr = formatQuantityNumber(effectiveAmount);
    return `${numStr} ${cloveUnit}`;
  }

  // C) Unidades contables (cebolla, limón, tomate...): omitir palabra "unidad"
  if (isCountableUnit) {
    if (amount >= 1.75) {
      return String(Math.round(amount));
    }
    const cleanAmount = Math.max(0.5, Math.round(amount * 2) / 2);
    if (Math.abs(cleanAmount - 0.5) <= 0.05) {
      if (lang === 'en') return 'Half';
      return isFeminineCulinaryNoun(ingredientName) ? 'Media' : 'Medio';
    }
    return formatQuantityNumber(cleanAmount);
  }

  // D) Medidas de cuchara / taza (permiten fracciones culinarias como ½, ¼, 1 ½; si > 3 redondean al medio más próximo)
  if (isSpoonOrCup) {
    const effectiveAmount = amount > 3 ? Math.round(amount * 2) / 2 : amount;
    const numStr = formatQuantityNumber(effectiveAmount);
    const unitFormatted = formatIngredientUnit(unit, effectiveAmount, lang);
    return `${numStr} ${unitFormatted}`.trim();
  }

  // E) Sin unidad definida:
  if (!u) {
    if (amount >= 1.75) {
      return String(Math.round(amount));
    }
    const cleanAmount = Math.max(0.5, Math.round(amount * 2) / 2);
    if (Math.abs(cleanAmount - 0.5) <= 0.05) {
      if (lang === 'en') return 'Half';
      return isFeminineCulinaryNoun(ingredientName) ? 'Media' : 'Medio';
    }
    return formatQuantityNumber(cleanAmount);
  }

  // =========================================================================
  // 4. RESTO DE UNIDADES (paquete, bote, lata, pizca, manojo, etc.):
  //    NUNCA fracciones. Redondeo limpio a entero o 1 decimal máximo.
  // =========================================================================
  const isPackOrCan = /^(bote|botes|lata|latas|can|cans|paquete|paquetes|package|packages|jar|jars|sobre|sobres)$/i.test(u);
  let effectiveAmount = amount;
  if (isPackOrCan) {
    effectiveAmount =
      amount >= 2
        ? Math.ceil(amount)
        : amount < 1
        ? Math.max(0.5, Math.round(amount * 2) / 2)
        : Math.round(amount * 2) / 2;
  }
  const numStr = Number.isInteger(effectiveAmount) ? String(effectiveAmount) : (Math.round(effectiveAmount * 10) / 10).toFixed(1);
  const unitFormatted = formatIngredientUnit(unit, effectiveAmount, lang);
  return `${numStr} ${unitFormatted}`.trim();
}

/**
 * Limpia y normaliza el nombre de un ingrediente eliminando cualquier prefijo residual
 * de cantidades numéricas, unidades métricas o preposiciones (ej: "600 g de ...", "40 g de ...", "10 ml ...").
 * Preserva las etiquetas <mark>...</mark> si existen en el texto.
 */
export function cleanIngredientName(raw: string): string {
  if (!raw) return '';
  let str = String(raw).trim();

  // Preservar si todo el nombre está envuelto en <mark>...</mark>
  const markMatch = str.match(/^<mark>([\s\S]*?)<\/mark>$/i);
  let inner = markMatch ? markMatch[1].trim() : str;

  // Regex defensivo para prefijos numéricos y unidades métricas o culinarias al inicio
  const prefixRegex = /^(\d+(?:[.,]\d+)?|\d+\/\d+|\d+\s+\d+\/\d+)?\s*(g|gr|gramos|grams|kg|kilos|ml|l|litros|litres|tbsp|tsp|cda|cdas|cucharada|cucharadas|cucharadita|cucharaditas|unidades|unidad|unit|units|pieza|piezas|piece|pieces|diente|dientes|clove|cloves|taza|tazas|cup|cups|pizca|pizcas|pinch|pinches|lata|latas|paquete|paquetes)\s+(?:de\s+|of\s+)?/i;

  let prev = '';
  while (prev !== inner) {
    prev = inner;
    inner = inner.replace(prefixRegex, '').trim();
    inner = inner.replace(/^(?:de\s+|of\s+)/i, '').trim();
  }

  // Quitar números sueltos al inicio seguidos de 'de' u 'of' (ej: "2 de cebollas") o números residuales iniciales
  inner = inner.replace(/^\d+(?:[.,]\d+)?\s+(?:de\s+|of\s+)?/i, '').trim();

  // Capitalizar la primera letra si quedó en minúscula
  if (inner.length > 0) {
    inner = inner.charAt(0).toUpperCase() + inner.slice(1);
  }

  return markMatch ? `<mark>${inner}</mark>` : inner;
}

