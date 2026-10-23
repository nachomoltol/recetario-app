import { ScaledIngredient } from './scaler';
import { formatQuantityNumber } from '@/lib/nutrition/formatQuantity';

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al', 'en', 'con', 'sin', 'por', 'para', 'y', 'o', 'a',
  'cortado', 'cortada', 'picado', 'picada', 'troceado', 'troceada',
  'fresco', 'fresca', 'molido', 'molida', 'virgen', 'extra',
]);

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
    .replace(/\b(virgen extra|fresco|fresca|frescos|frescas|molido|molida|en polvo|triturado|triturada|de cocina)\b/gi, '')
    .trim();
  if (simplified && simplified.length >= 3) {
    variants.add(simplified);
  }

  // Si contiene "dientes de ajo" o similar
  if (clean.includes('ajo')) {
    variants.add('dientes de ajo');
    variants.add('diente de ajo');
    variants.add('ajos');
    variants.add('ajo');
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

/**
 * Parsea una cantidad numérica del texto del paso, soportando enteros,
 * decimales y fracciones simples o compuestas preexistentes (ej: "1/2", "2 ½").
 */
function parseStepQuantity(rawStr: string): number {
  const clean = rawStr.trim();
  if (clean === '½') return 0.5;
  if (clean === '¼') return 0.25;
  if (clean === '¾') return 0.75;

  const mixedUnicode = clean.match(/^(\d+)\s*([½¼¾])$/);
  if (mixedUnicode) {
    const base = parseInt(mixedUnicode[1], 10);
    const frac = mixedUnicode[2] === '½' ? 0.5 : mixedUnicode[2] === '¼' ? 0.25 : 0.75;
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
 * de los pasos de la receta, sincronizándolas con las raciones objetivo seleccionadas.
 */
export function scaleStepQuantities(
  stepText: string,
  scaledIngredients: ScaledIngredient[],
  ratio: number,
  lang: 'es' | 'en' = 'es'
): string {
  if (!stepText || ratio === 1 || !scaledIngredients || scaledIngredients.length === 0) {
    return stepText;
  }

  let result = stepText;

  // Ordenar ingredientes por longitud de nombre descendente (más específicos primero)
  const sortedIngredients = [...scaledIngredients].sort((a, b) => {
    const lenA = (a.nombre_limpio || a.nombre_crudo || '').length;
    const lenB = (b.nombre_limpio || b.nombre_crudo || '').length;
    return lenB - lenA;
  });

  for (const ing of sortedIngredients) {
    const factor = ing.factor_aplicado !== undefined ? ing.factor_aplicado : ratio;
    if (factor === 1) continue;

    const variants = getIngredientSearchVariants(ing.nombre_limpio || ing.nombre_crudo || '');
    if (variants.length === 0) continue;

    // Unir todas las variantes en un patrón de alternancia ordenado por longitud
    const escapedAlternation = variants
      .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    // Patrón 1: Cantidades numéricas métricas o fraccionarias antes del ingrediente
    // Ejemplos: "400g de tomate", "400 g de tomate", "15 ml de aceite", "2 cebollas", "3 dientes de ajo"
    const patternMetric = new RegExp(
      `(^|\\s+)(?:(los|las|el|la|unos|unas)\\s+)?(\\d+(?:\\s+[½¼¾]|\\s+\\d+\\/\\d+)?|[½¼¾]|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?)\\s*(g|gr|grs|gramos?|ml|mls|mililitros?|kg|kgs|kilos?|kilogramos?|l|lt|lts|litros?|tbsp|tsp|cucharadas?|cucharaditas?|dientes?|cloves?|piezas?|unidades?|pieces?|units?)?\\s*(?:\\((?:[^)]*)\\))?\\s*(?:de\\s+(?:la\\s+|los\\s+|las\\s+|del\\s+)?)?(<mark>)?(${escapedAlternation})(<\\/mark>)?`,
      'gi'
    );

    result = result.replace(
      patternMetric,
      (match, prefixSpace, article, numStr, unitStr, openMark, ingWord, closeMark) => {
        const num = parseStepQuantity(numStr);
        if (isNaN(num) || num <= 0) return match;

        // Evitar falsos positivos si es un tiempo o temperatura
        if (unitStr && /^(min|minuto|minutos|hora|horas|segundo|segundos|°c|grados)$/i.test(unitStr)) {
          return match;
        }

        const scaledNum = num * factor;
        const effectiveUnit = (unitStr || ing.unidad || '').toLowerCase().replace(/[.,;:]/g, '').trim();

        let formattedNum: string;

        // A) BARRERA DE ENTRADA INCONDICIONAL: gramos y mililitros
        //    ESTRICTAMENTE PROHIBIDO usar fracciones (ni 1/2, ni 1/3, etc.)
        if (/^(g|gr|grs|gramo|gramos|gram|grams|ml|mls|mililitro|mililitros)$/i.test(effectiveUnit)) {
          if (scaledNum <= 20) {
            formattedNum = String(Math.max(1, Math.round(scaledNum)));
          } else {
            const rounded5 = Math.round(scaledNum / 5) * 5;
            formattedNum = String(rounded5 === 0 ? Math.round(scaledNum) : rounded5);
          }
        }
        // B) BARRERA DE ENTRADA INCONDICIONAL: kilogramos y litros (máx 1 decimal limpio, nunca fracciones)
        else if (/^(kg|kgs|kilo|kilos|kilogramo|kilogramos|l|lt|lts|litro|litros)$/i.test(effectiveUnit)) {
          if (Number.isInteger(scaledNum)) {
            formattedNum = String(scaledNum);
          } else {
            const dec = Math.round(scaledNum * 10) / 10;
            formattedNum = Number.isInteger(dec) ? String(dec) : dec.toFixed(1);
          }
        }
        // C) FRACCIONES EXCLUSIVAS: contables o cucharas/tazas
        else if (/^(cucharadas?|cucharaditas?|tbsp|tsp|tazas?|cups?|vasos?|dientes?|cloves?|piezas?|unidades?|pieces?|units?)$/i.test(effectiveUnit)) {
          formattedNum = formatQuantityNumber(scaledNum);
        }
        // D) Resto de unidades o sin unidad: NUNCA fracciones
        else {
          if (Number.isInteger(scaledNum)) {
            formattedNum = String(scaledNum);
          } else {
            const dec = Math.round(scaledNum * 10) / 10;
            formattedNum = Number.isInteger(dec) ? String(dec) : dec.toFixed(1);
          }
        }

        const pSpace = prefixSpace || '';
        const artPart = article ? `${article} ` : '';
        const deWord = lang === 'en' ? ' ' : ' de ';
        const unitPart = unitStr ? ` ${unitStr}${deWord}` : ' ';
        const oMark = openMark || '';
        const cMark = closeMark || '';

        const body = `${artPart}${formattedNum}${unitPart}${oMark}${ingWord}${cMark}`.replace(/\s+/g, ' ').trim();
        return `${pSpace}${body}`;
      }
    );

    // Patrón 2: Expresión "media" / "medio" / "half" antes del ingrediente
    // Ej: "media cebolla", "medio limón", "half an onion"
    const patternHalf = new RegExp(
      `(^|\\s+)(?:(la|el|una|un)\\s+)?(media|medio|half(?:\\s+an?|\\s+a)?)\\s+(?:de\\s+)?(<mark>)?(${escapedAlternation})(<\\/mark>)?`,
      'gi'
    );

    result = result.replace(
      patternHalf,
      (match, prefixSpace, article, _halfWord, openMark, ingWord, closeMark) => {
        const scaledNum = 0.5 * factor;
        const formattedNum = formatQuantityNumber(scaledNum);
        const oMark = openMark || '';
        const cMark = closeMark || '';

        // Si scaledNum sigue siendo 0.5, mantener expresión
        if (Math.abs(scaledNum - 0.5) <= 0.05) {
          return match;
        }

        const pSpace = prefixSpace || '';
        const artPart = article ? `${article} ` : '';
        const body = `${artPart}${formattedNum} ${oMark}${ingWord}${cMark}`.replace(/\s+/g, ' ').trim();
        return `${pSpace}${body}`;
      }
    );
  }

  return result;
}
