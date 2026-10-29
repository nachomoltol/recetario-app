import { ScaledIngredient, roundCulinaryAmount } from './scaler';
import {
  formatCulinaryAmount,
  formatQuantityNumber,
  pluralizeCulinaryNoun,
  isFeminineCulinaryNoun,
  MAX_SPOON_MAGNITUDE,
} from '@/lib/nutrition/formatQuantity';
import { formatIngredientUnit } from '@/lib/culinary/aisles';

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'the', 'a', 'an', 'some',
  'de', 'del', 'al', 'en', 'con', 'sin', 'por', 'para', 'y', 'o', 'a',
  'of', 'in', 'with', 'without', 'for', 'and', 'or', 'to',
  'cortado', 'cortada', 'picado', 'picada', 'troceado', 'troceada',
  'fresco', 'fresca', 'molido', 'molida', 'virgen', 'extra',
  'fresh', 'ground', 'chopped', 'diced', 'minced', 'sliced',
]);

/**
 * Sanitiza etiquetas HTML <mark> y </mark> en caso de que sustituciones previas
 * hayan desparejado las etiquetas en recetas adaptadas.
 */
export function sanitizeMarkTags(text: string): string {
  if (!text) return '';
  let result = text.replace(/<mark>\s*<\/mark>/gi, '');

  const openMatches = result.match(/<mark>/gi) || [];
  const closeMatches = result.match(/<\/mark>/gi) || [];

  if (openMatches.length > closeMatches.length) {
    result += '</mark>'.repeat(openMatches.length - closeMatches.length);
  } else if (closeMatches.length > openMatches.length) {
    let excess = closeMatches.length - openMatches.length;
    result = result.replace(/<\/mark>/gi, (match) => {
      if (excess > 0) {
        excess--;
        return '';
      }
      return match;
    });
  }

  return result;
}

/**
 * Extrae variantes y palabras sustantivas de un nombre de ingrediente
 * ordenadas de mayor a menor especificidad.
 */
function getIngredientSearchVariants(name: string): string[] {
  const clean = name
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\s*\([^)]*\)/g, '')
    .toLowerCase()
    .trim();

  if (!clean) return [];

  const variants = new Set<string>();
  variants.add(clean);

  // Variante sin adjetivos accesorios comunes
  const simplified = clean
    .replace(
      /\b(virgen extra|extra virgin|fresco|fresca|frescos|frescas|fresh|molido|molida|ground|en polvo|powder|triturado|triturada|crushed|de cocina)\b/gi,
      ''
    )
    .trim();
  if (simplified && simplified.length >= 3) {
    variants.add(simplified);
  }

  // Si contiene "dientes de ajo" o similar
  if (clean.includes('ajo') || clean.includes('garlic')) {
    variants.add('dientes de ajo');
    variants.add('diente de ajo');
    variants.add('garlic cloves');
    variants.add('garlic clove');
    variants.add('ajos');
    variants.add('ajo');
    variants.add('garlic');
  }

  // Palabras sustantivas individuales (longitud >= 4 y no stop words)
  const words = clean.split(/\s+/).filter(Boolean);
  for (const w of words) {
    const norm = w.replace(/[^a-záéíóúñ]/gi, '');
    if (norm.length >= 4 && !STOP_WORDS.has(norm)) {
      variants.add(norm);
      if (norm.endsWith('s')) {
        variants.add(norm.slice(0, -1));
      } else {
        variants.add(norm + 's');
      }
    }
  }

  return Array.from(variants).sort((a, b) => b.length - a.length);
}

const CARDINAL_NUMBERS_MAP: Record<string, number> = {
  un: 1, una: 1, uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const DISTRIBUTIVE_AFTER_REGEX =
  /^\s*(?:(?:[a-záéíóúñ]+)\s+){0,3}(?:por|en)\s+(?:cada\s+)?(?:persona|comensal|ración|porcion|racion|porción|cabeza|plato|bol|cuenco|individual)|per\s+(?:person|serving|bowl|portion|plate|diner)|in\s+each\s+(?:bowl|plate|dish|serving)\b/i;

const DISTRIBUTIVE_BEFORE_REGEX =
  /(?:en\s+cada\s+(?:plato|bol|cuenco|ración|porcion|comensal)|in\s+each\s+(?:bowl|plate|dish|serving|portion))\s*,?\s*(?:coloca|añade|pon|sirve|vierte|place|add|put|serve|pour)?\s*$/i;

/**
 * Parsea una cantidad numérica del texto del paso, soportando enteros,
 * decimales, fracciones Unicode o con barra (ej: "1/2", "2 ½", "1 ¼", "¾")
 * y números cardinales en texto ("dos", "tres").
 */
function parseStepQuantity(rawStr: string): number {
  const clean = rawStr.trim();
  const lower = clean.toLowerCase();
  if (CARDINAL_NUMBERS_MAP[lower] !== undefined) {
    return CARDINAL_NUMBERS_MAP[lower];
  }

  if (clean === '½') return 0.5;
  if (clean === '¼') return 0.25;
  if (clean === '¾') return 0.75;
  if (clean === '⅓') return 0.333;
  if (clean === '⅔') return 0.667;
  if (clean === '⅛') return 0.125;

  const mixedUnicode = clean.match(/^(\d+)\s*([½¼¾⅓⅔⅛])$/);
  if (mixedUnicode) {
    const base = parseInt(mixedUnicode[1], 10);
    const char = mixedUnicode[2];
    const frac =
      char === '½'
        ? 0.5
        : char === '¼'
        ? 0.25
        : char === '¾'
        ? 0.75
        : char === '⅓'
        ? 0.333
        : char === '⅔'
        ? 0.667
        : 0.125;
    return base + frac;
  }

  const mixedSlash = clean.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedSlash) {
    return parseInt(mixedSlash[1], 10) + parseInt(mixedSlash[2], 10) / parseInt(mixedSlash[3], 10);
  }

  const pureSlash = clean.match(/^(\d+)\/(\d+)$/);
  if (pureSlash) {
    return parseInt(pureSlash[1], 10) / parseInt(pureSlash[2], 10);
  }

  return parseFloat(clean.replace(',', '.'));
}

/**
 * Escala de forma reactiva las cantidades numéricas mencionadas dentro del relato
 * de los pasos de la receta, inyectando directamente los valores ya calculados en
 * ing.cantidad_escalada formateados con formatCulinaryAmount.
 */
/**
 * Detecta si una expresión con barra (ej: 1/2, 1/4, 3/4) es una fracción culinaria
 * o si es un rango numérico (ej: 20/30 g).
 */
function isFractionSlash(minStr?: string, sep?: string, maxStr?: string): boolean {
  if (sep !== '/') return false;
  if (!minStr || !maxStr) return false;
  const n = parseInt(minStr, 10);
  const d = parseInt(maxStr, 10);
  if (isNaN(n) || isNaN(d)) return false;
  return n < d && d <= 12;
}

/**
 * Calcula el valor escalado de un número cuantitativo individual respetando
 * el contexto distributivo, sincronización con scaledCantidad y rol.
 */
function computeScaledValue(
  rawNum: number,
  ing: ScaledIngredient,
  factor: number,
  isDistributive: boolean,
  effBaseServings: number,
  effTargetServings: number,
  isRogueMetricConflict: boolean,
  effectiveUnit: string
): number {
  const baseIngQty = Number(ing.cantidad) || 0;
  const scaledIngQty = Number(ing.cantidad_escalada);

  if (isDistributive) {
    const baseSingleServing = baseIngQty > 0 ? baseIngQty / effBaseServings : rawNum;
    const proportion = baseSingleServing > 0 ? rawNum / baseSingleServing : 1;
    const targetTotal = !isNaN(scaledIngQty) && scaledIngQty > 0 ? scaledIngQty : rawNum * factor;
    const distScaled = roundCulinaryAmount(
      (targetTotal / effTargetServings) * proportion,
      effectiveUnit
    );
    return distScaled <= 0 ? rawNum : distScaled;
  }

  if (isRogueMetricConflict) {
    return !isNaN(scaledIngQty) && scaledIngQty > 0
      ? scaledIngQty
      : (baseIngQty > 0 ? baseIngQty * factor : rawNum);
  }

  if (!isNaN(scaledIngQty) && scaledIngQty > 0) {
    if (baseIngQty > 0 && Math.abs(rawNum - baseIngQty) < 0.05) {
      return scaledIngQty;
    } else if (baseIngQty > 0) {
      return scaledIngQty * (rawNum / baseIngQty);
    } else {
      return scaledIngQty;
    }
  }

  return rawNum * factor;
}

export const CULINARY_CUT_NOUNS =
  'arbolitos?|floretes?|dados?|trozos?|trocitos?|cubos?|cubitos?|tiras?|bastones?|juliana|rodajas?|láminas?|laminas?|lonchas?|rebanadas?|filetes?|pechugas?|lomos?|muslos?|contramuslos?|alitas?|alas?|hojas?|ramitas?|ramas?|tallos?|gajos?|hebras?|granos?|pellizcos?|florets?|cubes?|dices?|pieces?|chunks?|strips?|slices?|breasts?|fillets?|filets?|thighs?|wings?|leaves?|sprigs?|stalks?|wedges?|strands?';

/**
 * Escala de forma reactiva las cantidades numéricas mencionadas dentro del relato
 * de los pasos de la receta, inyectando directamente los valores ya calculados en
 * ing.cantidad_escalada formateados con formatCulinaryAmount.
 */
export function scaleStepQuantities(
  stepText: string,
  scaledIngredients: ScaledIngredient[],
  ratio: number,
  lang: 'es' | 'en' = 'es',
  targetServings?: number,
  usageTracker?: Map<string, number>
): string {
  if (!stepText || !scaledIngredients || scaledIngredients.length === 0) {
    return stepText;
  }

  let result = stepText;
  const tokens: string[] = [];

  const effTargetServings =
    targetServings && targetServings > 0
      ? targetServings
      : Math.max(1, Math.round(2 * ratio));
  const effBaseServings = Math.max(1, Math.round(effTargetServings / ratio));

  // Ordenar ingredientes:
  // 1. Si el stepText menciona la sección del ingrediente (ej. "Para la masa"), priorizar el de esa sección.
  // 2. Por longitud de nombre descendente (los más específicos y largos primero).
  // 3. Por cantidad mayor para coincidencia más específica.
  const stepTextLower = stepText.toLowerCase();
  const sortedIngredients = [...scaledIngredients].sort((a, b) => {
    const secA = ((a as any).seccion || '').toLowerCase();
    const secB = ((b as any).seccion || '').toLowerCase();
    const hasSecA = secA && stepTextLower.includes(secA) ? 1 : 0;
    const hasSecB = secB && stepTextLower.includes(secB) ? 1 : 0;
    if (hasSecA !== hasSecB) return hasSecB - hasSecA;

    const lenA = (a.nombre_limpio || a.nombre_crudo || '').length;
    const lenB = (b.nombre_limpio || b.nombre_crudo || '').length;
    if (lenA !== lenB) return lenB - lenA;

    return (Number(b.cantidad) || 0) - (Number(a.cantidad) || 0);
  });

  const RESIDUAL_WORDS_PATTERN = 'restantes?|remanentes?|remaining|rest';
  const NUM_PART =
    '\\d+(?:\\s+[½¼¾⅓⅔⅛]|\\s+\\d+\\/\\d+)?|[½¼¾⅓⅔⅛]|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|one|two|three|four|five|six|seven|eight|nine|ten';

  for (const ing of sortedIngredients) {
    const factor = ing.factor_aplicado !== undefined ? ing.factor_aplicado : ratio;
    const variants = getIngredientSearchVariants(ing.nombre_limpio || ing.nombre_crudo || '');
    if (variants.length === 0) continue;

    const ingKey = (ing.nombre_limpio || ing.nombre_crudo || '').toLowerCase().trim();

    // Unir todas las variantes en un patrón de alternancia ordenado por longitud
    const escapedAlternation = variants
      .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    // 0. BARRERA CULINARIA PARA INGREDIENTES INVARIABLES, PIZCAS Y AL GUSTO:
    const isPinchOrToTaste = /^(pizca|pizcas|pinch|pinches|al gusto|a gusto|to taste|c\/n|c\.n\.|cn)$/i.test(
      (ing.unidad || '').trim()
    );
    const hasDefinedMetricQuantity =
      Boolean(ing.unidad) &&
      !isPinchOrToTaste &&
      /^(g|gr|grs|gramos?|grams?|ml|mls|mililitros?|milliliters?|kg|kgs|kilos?|l|lt|litros?|tbsp|tsp|cucharadas?|cucharaditas?|taza|tazas|cup|cups)$/i.test(
        (ing.unidad || '').trim()
      );
    const isStructuralSweetOrDough = /\b(azucar|azúcar|sugar|panela|miel|honey|sirope|syrup|harina|flour)\b/i.test(
      ingKey
    );

    // Si tiene cantidad métrica real o es un ingrediente estructural dulce con cantidad, NO debe tratarse como invariable
    const isInvariable =
      !hasDefinedMetricQuantity &&
      !isStructuralSweetOrDough &&
      (ing.rol_culinario === 'invariable' || isPinchOrToTaste);

    if (isInvariable) {
      const patternInvariableMetric = new RegExp(
        `(^|\\s+|(?<=[^\\p{L}\\p{N}@]))` +
        `(?:(<mark>)\\s*)?` +
        `(?:(los|las|el|la|unos|unas|the|a|an)\\s+)?` +
        `(?:(<mark>)\\s*)?` +
        `(\\d+(?:[.,]\\d+)?|[½¼¾⅓⅔⅛]|\\d+\\/\\d+)?\\s*` +
        `(g|gr|grs|gramos?|grams?|ml|mls|mililitros?|milliliters?|kg|kgs|kilos?|l|lt|litros?|tbsp|tsp|cucharadas?|cucharaditas?)\\s*` +
        `(?:(?:de|of)\\s+(?:la\\s+|los\\s+|las\\s+|del\\s+|the\\s+)?)?` +
        `(<mark>)?` +
        `(${escapedAlternation})` +
        `(<\\/mark>)?`,
        'gui'
      );

      result = result.replace(
        patternInvariableMetric,
        (match, prefixSpace, openMarkPre, _article, openMarkNum, _numStr, _unitStr, openMarkIng, ingWord, closeMark) => {
          const oMark = (openMarkPre || openMarkNum || openMarkIng) ? '<mark>' : '';
          const cMark = closeMark ? '</mark>' : '';
          const pSpace = prefixSpace || '';
          let naturalPhrase = '';

          if (/^(al gusto|a gusto|to taste|c\/n|c\.n\.|cn)$/i.test((ing.unidad || '').trim())) {
            naturalPhrase = lang === 'en' ? `${ingWord} to taste` : `${ingWord} al gusto`;
          } else {
            naturalPhrase = lang === 'en' ? `a pinch of ${ingWord}` : `una pizca de ${ingWord}`;
          }

          const replacement = `${oMark}${naturalPhrase}${cMark}`.replace(/\s+/g, ' ').trim();
          const tokenKey = `@@SCALED_TK_${tokens.length}@@`;
          tokens.push(`${pSpace}${replacement}`);
          return tokenKey;
        }
      );

      continue;
    }

    const ingUnitClean = (ing.unidad || '').toLowerCase().replace(/[.,;:]/g, '').trim();
    const isIngSpoonOrCup = /^(cucharada|cucharadas|cucharadita|cucharaditas|tbsp|tsp|taza|tazas|cup|cups|vaso|vasos|cda|cdas|cdita|cditas)$/i.test(
      ingUnitClean
    );
    const isIngCountable = /^(unidad|unidades|unit|units|pieza|piezas|piece|pieces|diente|dientes|clove|cloves)$/i.test(
      ingUnitClean
    );

    // Patrón 1: Cantidades numéricas métricas, fraccionarias, cardinales o RANGOS antes del ingrediente
    // Ejemplos: "400g de tomate", "20-30 g de mantequilla", "2 a 3 cucharadas de aceite", "los 100 g restantes de pollo"
    const patternMetric = new RegExp(
      `(^|\\s+|(?<=[^\\p{L}\\p{N}@]))` +
      `(?:(<mark>)\\s*)?` +
      `(?:(los|las|el|la|unos|unas|the|a|an)\\s+)?` +
      `(?:(<mark>)\\s*)?` +
      `(?:(${RESIDUAL_WORDS_PATTERN})\\s+)?` +
      `(?:(${NUM_PART})\\s*(?:(g|gr|grs|gramos?|grams?|ml|mls|mililitros?|milliliters?|tbsp|tsp|cucharadas?|cucharaditas?)\\s*)?([-–—/]|\\ba\\b|\\bto\\b)\\s*)?` +
      `(${NUM_PART})` +
      `\\s*` +
      `(g|gr|grs|gramos?|grams?|ml|mls|mililitros?|milliliters?|kg|kgs|kilos?|kilogramos?|kilograms?|l|lt|lts|litros?|liters?|tbsp|tsp|cucharadas?|cucharaditas?|tablespoons?|teaspoons?|dientes?|cloves?|piezas?|unidades?|pieces?|units?)?` +
      `\\s*(?:(${RESIDUAL_WORDS_PATTERN})\\s+)?` +
      `(?:\\((?:unos?\\s+)?(\\d+(?:[.,]\\d+)?)\\s*(g|gr|grs|gramos?|grams?|ml|mls|mililitros?)\\))?\\s*` +
      `(?:(?:de|of)\\s+(?:la\\s+|los\\s+|las\\s+|del\\s+|the\\s+)?)?` +
      `(?:\\s*(?:\\b(${CULINARY_CUT_NOUNS})\\b)\\s+(?:de\\s+|del\\s+|de\\s+la\\s+|de\\s+los\\s+|de\\s+las\\s+|of\\s+)?)?` +
      `(<mark>)?` +
      `(${escapedAlternation})` +
      `(<\\/mark>)?` +
      `(?![\\p{L}\\p{N}])` +
      `(?:\\s+(${RESIDUAL_WORDS_PATTERN}))?` +
      `(?:\\s*\\((?:unos?\\s+)?(\\d+(?:[.,]\\d+)?)\\s*(g|gr|grs|gramos?|grams?|ml|mls|mililitros?)\\))?`,
      'gui'
    );

    result = result.replace(
      patternMetric,
      (
        match,
        prefixSpace,
        openMarkPre,
        article,
        openMarkNum,
        residualWordPre,
        minNumStr,
        minUnitStr,
        rangeSep,
        maxNumStr,
        unitStr,
        residualWordMid,
        preParenNumStr,
        preParenUnitStr,
        cutNoun,
        openMarkIng,
        ingWord,
        closeMark,
        residualWordPost,
        parenNumStr,
        parenUnitStr,
        offset,
        fullStr
      ) => {
        // 1. Discriminación entre Fracción Culinaria (ej: 1/2) y Rango Cuantitativo (ej: 20-30, 2 a 3, 20/30)
        const isFrac = isFractionSlash(minNumStr, rangeSep, maxNumStr);
        let isRange = false;
        let num = 0;
        let numMin = 0;
        let numMax = 0;

        if (isFrac) {
          num = parseInt(minNumStr, 10) / parseInt(maxNumStr, 10);
        } else if (minNumStr && rangeSep) {
          numMin = parseStepQuantity(minNumStr);
          numMax = parseStepQuantity(maxNumStr);
          if (!isNaN(numMin) && !isNaN(numMax) && numMin > 0 && numMax > 0) {
            isRange = true;
          } else {
            num = parseStepQuantity(maxNumStr);
          }
        } else {
          num = parseStepQuantity(maxNumStr);
        }

        if (!isRange && (isNaN(num) || num <= 0)) return match;

        // Evitar falsos positivos si es un tiempo o temperatura
        if (
          unitStr &&
          /^(min|minuto|minutos|minute|minutes|hora|horas|hour|hours|segundo|segundos|second|seconds|°c|degrees)$/i.test(
            unitStr
          )
        ) {
          return match;
        }

        const textUnitClean = (unitStr || '').toLowerCase().replace(/[.,;:]/g, '').trim();
        const isTextMetric = /^(g|gr|grs|gramos?|grams?|ml|mls|mililitros?|milliliters?|kg|kgs|kilos?|l|lt|litros?)$/i.test(
          textUnitClean
        );

        // LEY UNIVERSAL DE MAGNITUD DE UNIDADES CULINARIAS (BARRERA <= 60):
        const isIngSpoon = /^(cucharada|cucharadas|cucharadita|cucharaditas|tbsp|tsp|cda|cdas|cdita|cditas)$/i.test(
          ingUnitClean
        );
        const isTsp = /^(cucharadita|cucharaditas|tsp|cdita|cditas)$/i.test(ingUnitClean);
        const baseQtyForMag = isRange ? numMax : num;
        const spoonMagnitude = (Number(ing.cantidad_escalada) || Number(ing.cantidad) || 0) * (isTsp ? 5 : 15);
        const isMagnitudeOver60 =
          baseQtyForMag > MAX_SPOON_MAGNITUDE ||
          spoonMagnitude > MAX_SPOON_MAGNITUDE ||
          (Number(ing.cantidad_escalada) || 0) > MAX_SPOON_MAGNITUDE;

        const isRogueMetricConflict =
          (isIngSpoonOrCup || isIngCountable) && isTextMetric && (!isIngSpoon || !isMagnitudeOver60);
        let effectiveUnit = isRogueMetricConflict ? ingUnitClean : (textUnitClean || ingUnitClean);

        if (isIngSpoon && isMagnitudeOver60) {
          effectiveUnit = isTextMetric ? textUnitClean : 'g';
        }

        // Comprobar si la mención está en un contexto distributivo individual (ej: "por persona", "en cada cuenco")
        const textAfter = fullStr ? fullStr.slice(offset + match.length) : '';
        const textBefore = fullStr ? fullStr.slice(0, offset) : '';
        const isDistributive =
          DISTRIBUTIVE_AFTER_REGEX.test(textAfter) ||
          DISTRIBUTIVE_BEFORE_REGEX.test(textBefore);

        // Limpiar redundancias de medida en ingWord si el paso las tenía separadas
        let cleanIngWord = ingWord;
        if (/\b(dientes?|cloves?)\b/i.test(effectiveUnit) || /\b(dientes?|cloves?)\b/i.test(cleanIngWord)) {
          cleanIngWord = cleanIngWord
            .replace(/^(dientes?|cloves?)\s+(?:de\s+|of\s+)?/i, '')
            .replace(/\s+(?:de\s+|of\s+)?(dientes?|cloves?)$/i, '')
            .trim();
        }

        // Manejo defensivo del sustantivo de corte morfológico (arbolitos de, dados de, tiras de...)
        if (cutNoun && cleanIngWord.toLowerCase().startsWith(cutNoun.toLowerCase())) {
          cleanIngWord = cleanIngWord.slice(cutNoun.length).replace(/^(?:de\s+|del\s+|of\s+)/i, '').trim();
        }
        const cutNounPart = cutNoun ? (lang === 'en' ? `${cutNoun} of ` : `${cutNoun} de `) : '';

        const oMark = (openMarkPre || openMarkNum || openMarkIng) ? '<mark>' : '';
        const cMark = closeMark ? '</mark>' : '';
        const pSpace = prefixSpace || '';

        // 2. LEY DE MENCIONES RESIDUALES: ("restante", "el resto de", "la otra parte de")
        const isResidual = Boolean(residualWordPre || residualWordMid || residualWordPost);
        if (isResidual) {
          const alreadyUsed = usageTracker ? (usageTracker.get(ingKey) || 0) : 0;
          const totalScaled = Number(ing.cantidad_escalada) || (Number(ing.cantidad) || 0) * factor;
          const hasCertainty = alreadyUsed > 0 && totalScaled > alreadyUsed;

          if (hasCertainty) {
            const residualAmount = totalScaled - alreadyUsed;
            if (usageTracker) usageTracker.set(ingKey, totalScaled);
            const formattedResidual = formatCulinaryAmount(
              residualAmount,
              effectiveUnit,
              lang,
              ing.nombre_limpio || ing.nombre_crudo || ingWord
            );
            const resPhrase =
              lang === 'en'
                ? `the remaining ${formattedResidual} of ${cutNounPart}${cleanIngWord}`
                : `los ${formattedResidual} restantes de ${cutNounPart}${cleanIngWord}`;

            const tokenKey = `@@SCALED_TK_${tokens.length}@@`;
            tokens.push(`${pSpace}${oMark}${resPhrase}${cMark}`);
            return tokenKey;
          } else {
            // Salvaguarda heurística: sin certeza matemática, sustituir gramaje congelado por expresión cualitativa natural
            const isFem = isFeminineCulinaryNoun(cleanIngWord);
            const isPlur = cleanIngWord.endsWith('s');
            const restoArticle = isFem ? (isPlur ? 'de las ' : 'de la ') : (isPlur ? 'de los ' : 'del ');
            const qualitativePhrase =
              lang === 'en'
                ? `the rest of the ${cleanIngWord}`
                : `el resto ${restoArticle}${cleanIngWord}`;

            const tokenKey = `@@SCALED_TK_${tokens.length}@@`;
            tokens.push(`${pSpace}${oMark}${qualitativePhrase}${cMark}`);
            return tokenKey;
          }
        }

        // 3. LEY UNIVERSAL DE ESCALADO DE RANGOS CUANTITATIVOS: (ej: "20-30 g" -> "40-60 g")
        if (isRange) {
          const sMinVal = computeScaledValue(
            numMin,
            ing,
            factor,
            isDistributive,
            effBaseServings,
            effTargetServings,
            isRogueMetricConflict,
            effectiveUnit
          );
          const sMaxVal = computeScaledValue(
            numMax,
            ing,
            factor,
            isDistributive,
            effBaseServings,
            effTargetServings,
            isRogueMetricConflict,
            effectiveUnit
          );
          const sMin = Math.min(sMinVal, sMaxVal);
          const sMax = Math.max(sMinVal, sMaxVal);

          if (usageTracker) {
            usageTracker.set(ingKey, (usageTracker.get(ingKey) || 0) + sMax);
          }

          const isMetric = /^(g|gr|grs|gramos?|grams?|ml|mls|mililitros?|milliliters?)$/i.test(effectiveUnit);
          let formattedRangeAndUnit: string;
          const sepChar = rangeSep === 'a' ? 'a' : rangeSep === 'to' ? 'to' : '-';

          if (isMetric) {
            const fMin = sMin <= 20 ? Math.max(1, Math.round(sMin)) : Math.round(sMin / 5) * 5;
            const fMax = sMax <= 20 ? Math.max(1, Math.round(sMax)) : Math.round(sMax / 5) * 5;
            const metricLabel = /ml/i.test(effectiveUnit) ? 'ml' : 'g';
            formattedRangeAndUnit =
              fMin === fMax ? `${fMin} ${metricLabel}` : `${fMin} ${sepChar} ${fMax} ${metricLabel}`;
          } else {
            const fMinStr = formatQuantityNumber(sMin);
            const fMaxStr = formatQuantityNumber(sMax);
            const unitPlural = formatIngredientUnit(effectiveUnit, sMax, lang);
            formattedRangeAndUnit =
              fMinStr === fMaxStr ? `${fMinStr} ${unitPlural}` : `${fMinStr} ${sepChar} ${fMaxStr} ${unitPlural}`;
          }

          const isPureNumber =
            /^\d+(?:[.,]\d+)?$/.test(formattedRangeAndUnit) ||
            /^\d+\s*[-–—/]\s*\d+$/.test(formattedRangeAndUnit);

          if (isPureNumber && !cutNoun && sMax > 1) {
            cleanIngWord = pluralizeCulinaryNoun(cleanIngWord, lang);
          }

          const connector = isPureNumber
            ? ' '
            : lang === 'en'
            ? ' '
            : /^(?:de|del|of)\s+/i.test(cutNounPart || cleanIngWord)
            ? ' '
            : ' de ';

          const artPart = article ? `${article} ` : '';
          const replacement = `${artPart}${formattedRangeAndUnit}${connector}${cutNounPart}${oMark}${cleanIngWord}${cMark}`
            .replace(/\s+/g, ' ')
            .trim();

          const tokenKey = `@@SCALED_TK_${tokens.length}@@`;
          tokens.push(`${pSpace}${replacement}`);
          return tokenKey;
        }

        // 4. Escalado individual estándar
        if (factor === 1 && !isRogueMetricConflict) {
          if (usageTracker) usageTracker.set(ingKey, (usageTracker.get(ingKey) || 0) + num);
          return match;
        }

        const finalScaledAmount = computeScaledValue(
          num,
          ing,
          factor,
          isDistributive,
          effBaseServings,
          effTargetServings,
          isRogueMetricConflict,
          effectiveUnit
        );

        if (usageTracker) {
          usageTracker.set(ingKey, (usageTracker.get(ingKey) || 0) + finalScaledAmount);
        }

        const formattedAmountAndUnit = formatCulinaryAmount(
          finalScaledAmount,
          effectiveUnit,
          lang,
          ing.nombre_limpio || ing.nombre_crudo || ingWord
        );

        const isPureNumber =
          /^\d+(?:[.,]\d+)?$/.test(formattedAmountAndUnit) ||
          /^\d+\s+[½¼¾⅓⅔⅛]$/.test(formattedAmountAndUnit) ||
          /^[½¼¾⅓⅔⅛]$/.test(formattedAmountAndUnit) ||
          /^(media|medio|half)$/i.test(formattedAmountAndUnit);

        if (isPureNumber && !cutNoun && finalScaledAmount > 1) {
          cleanIngWord = pluralizeCulinaryNoun(cleanIngWord, lang);
        } else if (isPureNumber && !cutNoun && finalScaledAmount <= 1) {
          const words = cleanIngWord.split(/\s+/);
          const firstWord = words[0];
          const rest = words.slice(1).join(' ');
          const lower = firstWord.toLowerCase();
          if (lang === 'es' && lower.endsWith('s')) {
            let singFirst = lower;
            if (lower.endsWith('ces')) singFirst = lower.slice(0, -3) + 'z';
            else if (lower.endsWith('ones')) singFirst = lower.slice(0, -4) + 'ón';
            else if (lower.endsWith('es')) singFirst = lower.slice(0, -2);
            else singFirst = lower.slice(0, -1);
            cleanIngWord = rest ? `${singFirst} ${rest}` : singFirst;
          }
        }

        const connector = isPureNumber
          ? ' '
          : lang === 'en'
          ? ' '
          : /^(?:de|del|of)\s+/i.test(cutNounPart || cleanIngWord)
          ? ' '
          : ' de ';

        let adjustedArticle = article;
        if (article) {
          const artLower = article.toLowerCase();
          if (lang === 'es') {
            const isFeminineUnit = /^(cucharada|cucharadas|cucharadita|cucharaditas|taza|tazas|pieza|piezas)$/i.test(
              effectiveUnit
            );
            if (isFeminineUnit) {
              adjustedArticle = finalScaledAmount > 1 ? 'las' : 'la';
            } else if (finalScaledAmount > 1) {
              if (artLower === 'el') adjustedArticle = 'los';
              else if (artLower === 'la') adjustedArticle = 'las';
              else if (artLower === 'un') adjustedArticle = 'unos';
              else if (artLower === 'una') adjustedArticle = 'unas';
            } else if (finalScaledAmount <= 1) {
              if (artLower === 'los') adjustedArticle = 'el';
              else if (artLower === 'las') adjustedArticle = 'la';
              else if (artLower === 'unos') adjustedArticle = 'un';
              else if (artLower === 'unas') adjustedArticle = 'una';
            }
          } else {
            if (finalScaledAmount > 1 && (artLower === 'a' || artLower === 'an')) {
              adjustedArticle = '';
            }
          }
        }

        let preParenPart = '';
        if (preParenNumStr && preParenUnitStr) {
          const preParenNum = parseStepQuantity(preParenNumStr);
          if (!isNaN(preParenNum) && preParenNum > 0) {
            const scaledPreParen = preParenNum * (finalScaledAmount / num);
            let formattedPreParen: string;
            if (scaledPreParen <= 20) {
              formattedPreParen = String(Math.max(1, Math.round(scaledPreParen)));
            } else {
              const rounded5 = Math.round(scaledPreParen / 5) * 5;
              formattedPreParen = String(rounded5 === 0 ? Math.round(scaledPreParen) : rounded5);
            }
            preParenPart = ` (${formattedPreParen} ${preParenUnitStr})`;
          }
        }

        let parenPart = '';
        if (parenNumStr && parenUnitStr) {
          const parenNum = parseStepQuantity(parenNumStr);
          if (!isNaN(parenNum) && parenNum > 0) {
            const scaledParen = parenNum * (finalScaledAmount / num);
            let formattedParen: string;
            if (scaledParen <= 20) {
              formattedParen = String(Math.max(1, Math.round(scaledParen)));
            } else {
              const rounded5 = Math.round(scaledParen / 5) * 5;
              formattedParen = String(rounded5 === 0 ? Math.round(scaledParen) : rounded5);
            }
            parenPart = ` (${formattedParen} ${parenUnitStr})`;
          }
        }

        const artPart = adjustedArticle ? `${adjustedArticle} ` : '';
        let replacement: string;
        if (openMarkPre) {
          replacement = `<mark>${artPart}${formattedAmountAndUnit}${preParenPart}${connector}${cutNounPart}${cleanIngWord}${cMark}${parenPart}`
            .replace(/\s+/g, ' ')
            .trim();
        } else {
          replacement = `${artPart}${formattedAmountAndUnit}${preParenPart}${connector}${cutNounPart}${oMark}${cleanIngWord}${cMark}${parenPart}`
            .replace(/\s+/g, ' ')
            .trim();
        }

        const tokenKey = `@@SCALED_TK_${tokens.length}@@`;
        tokens.push(`${pSpace}${replacement}`);
        return tokenKey;
      }
    );

    // Patrón 1b: Cantidades numéricas métricas posfijadas o entre paréntesis tras el ingrediente
    // Ejemplos: "salsa de soja 45 ml", "mantequilla: 20-30 g", "pollo 100 g restantes"
    const patternPostMetric = new RegExp(
      `(^|\\s+|(?<=[^\\p{L}\\p{N}@]))` +
      `(<mark>)?` +
      `(?:\\s*(?:\\b(${CULINARY_CUT_NOUNS})\\b)\\s+(?:de\\s+|del\\s+|of\\s+))?` +
      `(<mark>)?` +
      `(${escapedAlternation})` +
      `(<\\/mark>)?` +
      `(\\s*(?::|,)?\\s*)` +
      `(\\()?\\s*` +
      `(?:(${NUM_PART})\\s*(?:(g|gr|grs|gramos?|grams?|ml|mls|mililitros?|milliliters?|tbsp|tsp|cucharadas?|cucharaditas?)\\s*)?([-–—/]|\\ba\\b|\\bto\\b)\\s*)?` +
      `(${NUM_PART})` +
      `\\s*` +
      `(g|gr|grs|gramos?|grams?|ml|mls|mililitros?|milliliters?|kg|kgs|kilos?|kilogramos?|kilograms?|l|lt|lts|litros?|liters?|tbsp|tsp|cucharadas?|cucharaditas?|tablespoons?|teaspoons?|dientes?|cloves?|piezas?|unidades?|pieces?|units?)` +
      `\\s*(?:(${RESIDUAL_WORDS_PATTERN}))?` +
      `\\s*(\\))?` +
      `(?![\\p{L}\\p{N}])` +
      `(?:\\s+(${RESIDUAL_WORDS_PATTERN}))?`,
      'gui'
    );

    result = result.replace(
      patternPostMetric,
      (
        match,
        prefixSpace,
        openMarkCut,
        cutNoun,
        openMarkIng,
        ingWord,
        closeMark,
        separator,
        openParen,
        minNumStr,
        minUnitStr,
        rangeSep,
        maxNumStr,
        unitStr,
        residualWordInParen,
        closeParen,
        residualWordPost,
        offset,
        fullStr
      ) => {
        const isFrac = isFractionSlash(minNumStr, rangeSep, maxNumStr);
        let isRange = false;
        let num = 0;
        let numMin = 0;
        let numMax = 0;

        if (isFrac) {
          num = parseInt(minNumStr, 10) / parseInt(maxNumStr, 10);
        } else if (minNumStr && rangeSep) {
          numMin = parseStepQuantity(minNumStr);
          numMax = parseStepQuantity(maxNumStr);
          if (!isNaN(numMin) && !isNaN(numMax) && numMin > 0 && numMax > 0) {
            isRange = true;
          } else {
            num = parseStepQuantity(maxNumStr);
          }
        } else {
          num = parseStepQuantity(maxNumStr);
        }

        if (!isRange && (isNaN(num) || num <= 0)) return match;

        if (
          unitStr &&
          /^(min|minuto|minutos|minute|minutes|hora|horas|hour|hours|segundo|segundos|second|seconds|°c|degrees)$/i.test(
            unitStr
          )
        ) {
          return match;
        }

        const textUnitClean = (unitStr || '').toLowerCase().replace(/[.,;:]/g, '').trim();
        const isTextMetric = /^(g|gr|grs|gramos?|grams?|ml|mls|mililitros?|milliliters?|kg|kgs|kilos?|l|lt|litros?)$/i.test(
          textUnitClean
        );

        const isIngSpoon = /^(cucharada|cucharadas|cucharadita|cucharaditas|tbsp|tsp|cda|cdas|cdita|cditas)$/i.test(
          ingUnitClean
        );
        const isTsp = /^(cucharadita|cucharaditas|tsp|cdita|cditas)$/i.test(ingUnitClean);
        const baseQtyForMag = isRange ? numMax : num;
        const spoonMagnitude = (Number(ing.cantidad_escalada) || Number(ing.cantidad) || 0) * (isTsp ? 5 : 15);
        const isMagnitudeOver60 =
          baseQtyForMag > MAX_SPOON_MAGNITUDE ||
          spoonMagnitude > MAX_SPOON_MAGNITUDE ||
          (Number(ing.cantidad_escalada) || 0) > MAX_SPOON_MAGNITUDE;

        const isRogueMetricConflict =
          (isIngSpoonOrCup || isIngCountable) && isTextMetric && (!isIngSpoon || !isMagnitudeOver60);
        let effectiveUnit = isRogueMetricConflict ? ingUnitClean : (textUnitClean || ingUnitClean);

        if (isIngSpoon && isMagnitudeOver60) {
          effectiveUnit = isTextMetric ? textUnitClean : 'g';
        }

        const textAfter = fullStr ? fullStr.slice(offset + match.length) : '';
        const textBefore = fullStr ? fullStr.slice(0, offset) : '';
        const isDistributive =
          DISTRIBUTIVE_AFTER_REGEX.test(textAfter) ||
          DISTRIBUTIVE_BEFORE_REGEX.test(textBefore);

        let cleanIngWord = ingWord;
        if (/\b(dientes?|cloves?)\b/i.test(effectiveUnit) || /\b(dientes?|cloves?)\b/i.test(cleanIngWord)) {
          cleanIngWord = cleanIngWord
            .replace(/^(dientes?|cloves?)\s+(?:de\s+|of\s+)?/i, '')
            .replace(/\s+(?:de\s+|of\s+)?(dientes?|cloves?)$/i, '')
            .trim();
        }

        if (cutNoun && cleanIngWord.toLowerCase().startsWith(cutNoun.toLowerCase())) {
          cleanIngWord = cleanIngWord.slice(cutNoun.length).replace(/^(?:de\s+|del\s+|of\s+)/i, '').trim();
        }
        const cutNounPart = cutNoun ? (lang === 'en' ? `${cutNoun} of ` : `${cutNoun} de `) : '';

        const oMark = (openMarkCut || openMarkIng) ? '<mark>' : '';
        const cMark = closeMark ? '</mark>' : '';
        const pSpace = prefixSpace || '';
        const sep = separator || ' ';

        const isResidual = Boolean(residualWordInParen || residualWordPost);
        if (isResidual) {
          const alreadyUsed = usageTracker ? (usageTracker.get(ingKey) || 0) : 0;
          const totalScaled = Number(ing.cantidad_escalada) || (Number(ing.cantidad) || 0) * factor;
          const hasCertainty = alreadyUsed > 0 && totalScaled > alreadyUsed;

          if (hasCertainty) {
            const residualAmount = totalScaled - alreadyUsed;
            if (usageTracker) usageTracker.set(ingKey, totalScaled);
            const formattedResidual = formatCulinaryAmount(
              residualAmount,
              effectiveUnit,
              lang,
              ing.nombre_limpio || ing.nombre_crudo || ingWord
            );
            const resPart = openParen ? `(${formattedResidual})` : formattedResidual;
            const resWord = lang === 'en' ? 'remaining' : 'restante';
            const replacement = `${oMark}${cutNounPart}${cleanIngWord}${cMark}${sep}${resPart} ${resWord}`;
            const tokenKey = `@@SCALED_TK_${tokens.length}@@`;
            tokens.push(`${pSpace}${replacement}`);
            return tokenKey;
          } else {
            const isFem = isFeminineCulinaryNoun(cleanIngWord);
            const isPlur = cleanIngWord.endsWith('s');
            const restoArticle = isFem ? (isPlur ? 'de las ' : 'de la ') : (isPlur ? 'de los ' : 'del ');
            const qualitativePhrase =
              lang === 'en'
                ? `the rest of the ${cleanIngWord}`
                : `el resto ${restoArticle}${cleanIngWord}`;

            const tokenKey = `@@SCALED_TK_${tokens.length}@@`;
            tokens.push(`${pSpace}${oMark}${qualitativePhrase}${cMark}`);
            return tokenKey;
          }
        }

        if (isRange) {
          const sMinVal = computeScaledValue(
            numMin,
            ing,
            factor,
            isDistributive,
            effBaseServings,
            effTargetServings,
            isRogueMetricConflict,
            effectiveUnit
          );
          const sMaxVal = computeScaledValue(
            numMax,
            ing,
            factor,
            isDistributive,
            effBaseServings,
            effTargetServings,
            isRogueMetricConflict,
            effectiveUnit
          );
          const sMin = Math.min(sMinVal, sMaxVal);
          const sMax = Math.max(sMinVal, sMaxVal);

          if (usageTracker) {
            usageTracker.set(ingKey, (usageTracker.get(ingKey) || 0) + sMax);
          }

          const isMetric = /^(g|gr|grs|gramos?|grams?|ml|mls|mililitros?|milliliters?)$/i.test(effectiveUnit);
          let formattedRangeAndUnit: string;
          const sepChar = rangeSep === 'a' ? 'a' : rangeSep === 'to' ? 'to' : '-';

          if (isMetric) {
            const fMin = sMin <= 20 ? Math.max(1, Math.round(sMin)) : Math.round(sMin / 5) * 5;
            const fMax = sMax <= 20 ? Math.max(1, Math.round(sMax)) : Math.round(sMax / 5) * 5;
            const metricLabel = /ml/i.test(effectiveUnit) ? 'ml' : 'g';
            formattedRangeAndUnit =
              fMin === fMax ? `${fMin} ${metricLabel}` : `${fMin} ${sepChar} ${fMax} ${metricLabel}`;
          } else {
            const fMinStr = formatQuantityNumber(sMin);
            const fMaxStr = formatQuantityNumber(sMax);
            const unitPlural = formatIngredientUnit(effectiveUnit, sMax, lang);
            formattedRangeAndUnit =
              fMinStr === fMaxStr ? `${fMinStr} ${unitPlural}` : `${fMinStr} ${sepChar} ${fMaxStr} ${unitPlural}`;
          }

          let replacement: string;
          if (openParen) {
            replacement = `${oMark}${cutNounPart}${cleanIngWord}${cMark}${sep}(${formattedRangeAndUnit})`;
          } else {
            replacement = `${oMark}${cutNounPart}${cleanIngWord}${cMark}${sep}${formattedRangeAndUnit}`;
          }

          const tokenKey = `@@SCALED_TK_${tokens.length}@@`;
          tokens.push(`${pSpace}${replacement}`);
          return tokenKey;
        }

        if (factor === 1 && !isRogueMetricConflict) {
          if (usageTracker) usageTracker.set(ingKey, (usageTracker.get(ingKey) || 0) + num);
          return match;
        }

        const finalScaledAmount = computeScaledValue(
          num,
          ing,
          factor,
          isDistributive,
          effBaseServings,
          effTargetServings,
          isRogueMetricConflict,
          effectiveUnit
        );

        if (usageTracker) {
          usageTracker.set(ingKey, (usageTracker.get(ingKey) || 0) + finalScaledAmount);
        }

        const formattedAmountAndUnit = formatCulinaryAmount(
          finalScaledAmount,
          effectiveUnit,
          lang,
          ing.nombre_limpio || ing.nombre_crudo || ingWord
        );

        const isPureNumber =
          /^\d+(?:[.,]\d+)?$/.test(formattedAmountAndUnit) ||
          /^\d+\s+[½¼¾⅓⅔⅛]$/.test(formattedAmountAndUnit) ||
          /^[½¼¾⅓⅔⅛]$/.test(formattedAmountAndUnit) ||
          /^(media|medio|half)$/i.test(formattedAmountAndUnit);

        if (isPureNumber && !cutNoun && finalScaledAmount > 1) {
          cleanIngWord = pluralizeCulinaryNoun(cleanIngWord, lang);
        }

        let replacement: string;
        if (openParen) {
          replacement = `${oMark}${cutNounPart}${cleanIngWord}${cMark}${sep}(${formattedAmountAndUnit})`;
        } else {
          replacement = `${oMark}${cutNounPart}${cleanIngWord}${cMark}${sep}${formattedAmountAndUnit}`;
        }

        const tokenKey = `@@SCALED_TK_${tokens.length}@@`;
        tokens.push(`${pSpace}${replacement}`);
        return tokenKey;
      }
    );

    // Patrón 2: Unidades discretas en singular implícito ("el diente de ajo", "un diente de ajo", "the garlic clove")
    const patternImplicitSingular = new RegExp(
      `(^|\\s+|(?<=[^\\p{L}\\p{N}@]))` +
      `(?:(<mark>)\\s*)?` +
      `(el|la|un|una|the|a|an)\\s+` +
      `(?:` +
        `(diente|clove|unidad|pieza|unit|piece)\\s+(?:(?:de|of)\\s+(?:la\\s+|los\\s+|las\\s+|del\\s+|the\\s+)?)?(<mark>)?(${escapedAlternation})(<\\/mark>)?` +
        `|` +
        `(<mark>)?(${escapedAlternation})(<\\/mark>)?\\s+(diente|clove|unidad|pieza|unit|piece)` +
      `)` +
      `(?![\\p{L}\\p{N}])`,
      'gui'
    );

    result = result.replace(
      patternImplicitSingular,
      (
        match,
        prefixSpace,
        openMarkPre,
        article,
        unitWord1,
        openMarkIng1,
        ingWord1,
        closeMark1,
        openMarkIng2,
        ingWord2,
        closeMark2,
        unitWord2
      ) => {
        const unitWord = unitWord1 || unitWord2;
        const ingWord = ingWord1 || ingWord2;
        const isPostUnit = Boolean(unitWord2);

        if (!unitWord || !ingWord) return match;

        const scaledIngQty = Number(ing.cantidad_escalada);
        const effectiveQty = !isNaN(scaledIngQty) && scaledIngQty > 0 ? scaledIngQty : factor;
        if (effectiveQty <= 1) {
          return match;
        }

        const pSpace = prefixSpace || '';
        const uLower = unitWord.toLowerCase();
        let pluralUnit = uLower;
        let pluralArticle = '';

        if (lang === 'en') {
          pluralArticle = article.toLowerCase() === 'the' ? 'the ' : '';
          pluralUnit = uLower === 'clove' ? 'cloves' : uLower === 'piece' ? 'pieces' : 'units';
        } else {
          pluralUnit = uLower === 'diente' ? 'dientes' : uLower === 'pieza' ? 'piezas' : 'unidades';
          pluralArticle =
            article.toLowerCase() === 'la' || article.toLowerCase() === 'una' ? 'las ' : 'los ';
        }

        const formattedNumber = formatQuantityNumber(effectiveQty);
        let cleanIngWord = ingWord
          .replace(/^(dientes?|cloves?)\s+(?:de\s+|of\s+)?/i, '')
          .replace(/\s+(?:de\s+|of\s+)?(dientes?|cloves?)$/i, '')
          .trim();

        const connector = lang === 'en' ? ' ' : ' de ';
        const oMark = openMarkPre ? '<mark>' : (openMarkIng1 || openMarkIng2) ? '<mark>' : '';
        const cMark = (closeMark1 || closeMark2) ? '</mark>' : '';

        let replacement: string;
        if (isPostUnit && lang === 'en') {
          replacement = `${oMark}${pluralArticle}${formattedNumber} ${cleanIngWord} ${pluralUnit}${cMark}`;
        } else {
          replacement = `${oMark}${pluralArticle}${formattedNumber} ${pluralUnit}${connector}${cleanIngWord}${cMark}`;
        }

        replacement = replacement.replace(/\s+/g, ' ').trim();

        const tokenKey = `@@SCALED_TK_${tokens.length}@@`;
        tokens.push(`${pSpace}${replacement}`);
        return tokenKey;
      }
    );

    // Patrón 3: Expresión "media" / "medio" / "half" antes del ingrediente
    const patternHalf = new RegExp(
      `(^|\\s+|(?<=[^\\p{L}\\p{N}@]))` +
      `(?:(<mark>)\\s*)?` +
      `(?:(la|el|una|un|the|a|an)\\s+)?` +
      `(media|medio|half(?:\\s+an?|\\s+a)?)\\s+` +
      `(?:(?:de|of)\\s+)?` +
      `(<mark>)?` +
      `(${escapedAlternation})` +
      `(<\\/mark>)?` +
      `(?![\\p{L}\\p{N}])`,
      'gui'
    );

    result = result.replace(
      patternHalf,
      (match, prefixSpace, openMarkPre, article, _halfWord, openMarkIng, ingWord, closeMark) => {
        const baseIngQty = Number(ing.cantidad) || 0;
        const scaledIngQty = Number(ing.cantidad_escalada);
        let finalScaledAmount: number;

        if (!isNaN(scaledIngQty) && scaledIngQty > 0) {
          if (baseIngQty > 0) {
            finalScaledAmount = scaledIngQty * (0.5 / baseIngQty);
          } else {
            finalScaledAmount = scaledIngQty * 0.5;
          }
        } else {
          finalScaledAmount = 0.5 * factor;
        }

        if (Math.abs(finalScaledAmount - 0.5) <= 0.05) {
          return match;
        }

        const effectiveUnit = (ing.unidad || '').toLowerCase().replace(/[.,;:]/g, '').trim();
        const formattedAmountAndUnit = formatCulinaryAmount(
          finalScaledAmount,
          effectiveUnit,
          lang,
          ing.nombre_limpio || ing.nombre_crudo || ingWord
        );

        let cleanIngWord = ingWord;
        if (/\b(dientes?|cloves?)\b/i.test(effectiveUnit) || /\b(dientes?|cloves?)\b/i.test(cleanIngWord)) {
          cleanIngWord = cleanIngWord
            .replace(/^(dientes?|cloves?)\s+(?:de\s+|of\s+)?/i, '')
            .replace(/\s+(?:de\s+|of\s+)?(dientes?|cloves?)$/i, '')
            .trim();
        }

        if (finalScaledAmount > 1) {
          cleanIngWord = pluralizeCulinaryNoun(cleanIngWord, lang);
        }

        const isPureNumber =
          /^\d+(?:[.,]\d+)?$/.test(formattedAmountAndUnit) ||
          /^\d+\s+[½¼¾⅓⅔⅛]$/.test(formattedAmountAndUnit) ||
          /^[½¼¾⅓⅔⅛]$/.test(formattedAmountAndUnit) ||
          /^(media|medio|half)$/i.test(formattedAmountAndUnit);

        const connector = isPureNumber
          ? ' '
          : lang === 'en'
          ? ' '
          : /^(?:de|del|of)\s+/i.test(cleanIngWord)
          ? ' '
          : ' de ';

        let adjustedArticle = article;
        if (article) {
          const artLower = article.toLowerCase();
          if (lang === 'es') {
            if (finalScaledAmount > 1) {
              if (artLower === 'el') adjustedArticle = 'los';
              else if (artLower === 'la') adjustedArticle = 'las';
              else if (artLower === 'un') adjustedArticle = 'unos';
              else if (artLower === 'una') adjustedArticle = 'unas';
            }
          } else {
            if (finalScaledAmount > 1 && (artLower === 'a' || artLower === 'an')) {
              adjustedArticle = '';
            }
          }
        }

        const pSpace = prefixSpace || '';
        const artPart = adjustedArticle ? `${adjustedArticle} ` : '';

        let replacement: string;
        if (openMarkPre) {
          const cMark = closeMark ? '</mark>' : '';
          replacement = `<mark>${artPart}${formattedAmountAndUnit}${connector}${cleanIngWord}${cMark}`
            .replace(/\s+/g, ' ')
            .trim();
        } else {
          const oMark = openMarkIng ? '<mark>' : '';
          const cMark = closeMark ? '</mark>' : '';
          replacement = `${artPart}${formattedAmountAndUnit}${connector}${oMark}${cleanIngWord}${cMark}`
            .replace(/\s+/g, ' ')
            .trim();
        }

        const tokenKey = `@@SCALED_TK_${tokens.length}@@`;
        tokens.push(`${pSpace}${replacement}`);
        return tokenKey;
      }
    );
  }

  // Restaurar todos los tokens atómicos generados
  result = result.replace(/@@SCALED_TK_(\d+)@@/g, (_, idxStr) => {
    const idx = parseInt(idxStr, 10);
    return tokens[idx] !== undefined ? tokens[idx] : _;
  });

  return sanitizeMarkTags(result);
}

