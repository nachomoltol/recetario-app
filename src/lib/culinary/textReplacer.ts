import { formatCulinaryAmount, isFeminineCulinaryNoun } from '@/lib/nutrition/formatQuantity';

/**
 * Palabras genéricas paraguas que NO deben usarse como fallback difuso de 1 palabra
 * cuando el ingrediente original era compuesto (ej. evitar que "aceite de sésamo"
 * reemplace menciones a "aceite de oliva" en los pasos).
 */
const GENERIC_UMBRELLA_WORDS = new Set([
  'aceite', 'oil', 'salsa', 'sauce', 'harina', 'flour', 'leche', 'milk',
  'bebida', 'queso', 'cheese', 'crema', 'cream', 'caldo', 'broth', 'stock',
  'vinagre', 'vinegar', 'polvo', 'powder', 'agua', 'water', 'sal', 'salt',
  'pimienta', 'pepper', 'azucar', 'azúcar', 'sugar', 'semilla', 'semillas',
  'pechuga', 'filete', 'lomo', 'carne', 'pescado', 'pasta', 'pan', 'zumo', 'jugo',
]);

/**
 * Detecta si un índice en el texto se encuentra dentro de un bloque abierto <mark>...</mark>
 */
function isInsideMark(text: string, index: number): boolean {
  const before = text.slice(0, index);
  const marks = before.match(/<\/?mark\b[^>]*>/gi) || [];
  let depth = 0;
  for (const m of marks) {
    if (m.toLowerCase().startsWith('</')) {
      depth = Math.max(0, depth - 1);
    } else {
      depth++;
    }
  }
  return depth > 0;
}

/**
 * Convierte una cadena en una expresión regular agnóstica a tildes/acentos
 * para español (a, e, i, o, u, n).
 */
function toAccentAgnosticRegex(str: string): string {
  return str
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[aáàäâ]/gi, '[aáàäâ]')
    .replace(/[eéèëê]/gi, '[eéèëê]')
    .replace(/[iíìïî]/gi, '[iíìïî]')
    .replace(/[oóòöô]/gi, '[oóòöô]')
    .replace(/[uúùüû]/gi, '[uúùüû]')
    .replace(/[nñ]/gi, '[nñ]');
}

/**
 * Palabras vacías (stop words), artículos, preposiciones y medidas culinarias
 * a omitir para identificar la primera palabra sustantiva de un ingrediente.
 */
const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al', 'en', 'con', 'sin', 'por', 'para', 'y', 'o', 'a',
  'cucharada', 'cucharadas', 'cucharadita', 'cucharaditas',
  'taza', 'tazas', 'vaso', 'vasos', 'pizca', 'pizcas', 'puñado', 'puñados',
  'gramo', 'gramos', 'kilo', 'kilos', 'litro', 'litros', 'ml', 'g', 'kg',
  'bote', 'botes', 'lata', 'latas', 'paquete', 'paquetes',
  'rodaja', 'rodajas', 'loncha', 'lonchas', 'trozo', 'trozos',
  'diente', 'dientes', 'chorrito', 'chorro',
  'virgen', 'extra', 'fresco', 'fresca', 'frescos', 'frescas',
  'seco', 'seca', 'molido', 'molida', 'crudo', 'cruda'
]);

/**
 * Obtiene la primera palabra sustantiva de un nombre de ingrediente compuesto
 * (ej. "arroz bomba" -> "arroz", "cebolla morada" -> "cebolla", "pechuga de pollo" -> "pechuga").
 */
function getFirstSubstantiveWord(name: string): string | null {
  const clean = name
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);

  for (const w of words) {
    const normalized = w.toLowerCase().replace(/[^a-záéíóúñ]/gi, '');
    if (normalized.length >= 3 && !STOP_WORDS.has(normalized)) {
      return normalized;
    }
  }

  return null;
}

/**
 * Reemplaza de forma inteligente y reactiva el nombre de un ingrediente en el texto de preparación o pasos.
 * Características:
 * 1. Agnóstico a mayúsculas/minúsculas y tildes/acentos (Normalización total).
 * 2. Tolerancia a plurales y singulares (ej. tomate <-> tomates).
 * 3. Búsqueda Difusa (Fuzzy Match Fallback): Si el nombre compuesto completo (ej. "arroz bomba")
 *    no aparece textualmente en el paso porque Gemini lo resumió, busca la palabra sustantiva clave (ej. "arroz").
 * 4. Respeto a etiquetas HTML: No anida <mark> si ya estaba resaltado, pero añade <mark> si estaba en texto plano.
 */
export function replaceIngredientInText(text?: string | null, oldName?: string | null, newName?: string | null): string {
  if (!text) return '';
  if (!oldName || !newName) return text;

  try {
    const rawText = typeof text === 'string' ? text : String(text);
    // Limpiar cualquier etiqueta HTML de los nombres para comparar texto puro
    const cleanOld = String(oldName).replace(/<\/?[^>]+(>|$)/g, '').trim();
    const cleanNew = String(newName).replace(/<\/?[^>]+(>|$)/g, '').trim();

    if (!cleanOld || cleanOld.toLowerCase() === cleanNew.toLowerCase()) {
      return rawText;
    }

  // Generar variantes del nombre original completo
  const baseVariants = [cleanOld];

  // Equivalencias culinarias comunes (ej: leche <-> bebida vegetal)
  if (/\bleche\b/i.test(cleanOld)) {
    baseVariants.push(cleanOld.replace(/\bleche\b/gi, 'bebida'));
  } else if (/\bbebida\b/i.test(cleanOld)) {
    baseVariants.push(cleanOld.replace(/\bbebida\b/gi, 'leche'));
  }

  // Remover aclaraciones entre paréntesis (ej: "yogur (griego o natural)" -> "yogur")
  const withoutParens = cleanOld.replace(/\s*\([^)]*\)/g, '').trim();
  if (withoutParens && withoutParens.length >= 3 && withoutParens.toLowerCase() !== cleanOld.toLowerCase()) {
    baseVariants.push(withoutParens);
  }

  // Remover artículos iniciales si los hay (ej: "la leche de coco" -> "leche de coco")
  const withoutArticle = cleanOld.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '').trim();
  if (withoutArticle && withoutArticle.length >= 3 && withoutArticle.toLowerCase() !== cleanOld.toLowerCase()) {
    baseVariants.push(withoutArticle);
  }

  // Simplificar retirando adjetivos secundarios culinarios
  const simplified = cleanOld
    .replace(
      /\b(virgen extra|fresco|fresca|frescos|frescas|seco|seca|secos|secas|crudo|cruda|molido|molida|troceado|troceada|entero|entera|triturado|triturada|en polvo|de cocina|ecológico|ecológica|vegetal)\b/gi,
      ''
    )
    .trim();

  if (simplified && simplified.length >= 3 && simplified.toLowerCase() !== cleanOld.toLowerCase()) {
    baseVariants.push(simplified);
  }

  // Variantes de singular y plural
  const allVariants: string[] = [];
  for (const v of baseVariants) {
    allVariants.push(v);
    if (v.toLowerCase().endsWith('es') && v.length > 4) {
      allVariants.push(v.slice(0, -2));
      allVariants.push(v.slice(0, -1));
    } else if (v.toLowerCase().endsWith('s') && v.length > 3) {
      allVariants.push(v.slice(0, -1));
    } else if (!v.toLowerCase().endsWith('s')) {
      allVariants.push(v + 's');
      allVariants.push(v + 'es');
    }
  }

  // Fallback difuso: primera palabra sustantiva (solo si NO es una palabra genérica paraguas
  // dentro de un ingrediente compuesto, evitando que "aceite de sésamo" pise "aceite de oliva")
  const substantiveWord = getFirstSubstantiveWord(cleanOld);
  const isMultiWordOriginal = cleanOld.split(/\s+/).filter(Boolean).length > 1;
  const fallbackVariants: string[] = [];
  if (
    substantiveWord &&
    !(isMultiWordOriginal && GENERIC_UMBRELLA_WORDS.has(substantiveWord.toLowerCase()))
  ) {
    fallbackVariants.push(substantiveWord);
    if (substantiveWord.endsWith('s')) {
      fallbackVariants.push(substantiveWord.slice(0, -1));
    } else {
      fallbackVariants.push(substantiveWord + 's');
      fallbackVariants.push(substantiveWord + 'es');
    }
  }

  // Función interna para intentar reemplazo con una lista de variantes ordenadas
  function tryReplaceWithVariants(variantsList: string[], inputStr: string): string | null {
    const sorted = Array.from(new Set(variantsList)).sort((a, b) => b.length - a.length);

    for (const variant of sorted) {
      const words = variant.split(/\s+/).filter(Boolean);
      if (words.length === 0) continue;

      // Cada palabra se genera con soporte agnóstico de acentos
      const wordsPattern = words
        .map((w, idx) => {
          const isLast = idx === words.length - 1;
          const agnostic = toAccentAgnosticRegex(w);
          // Si la palabra no termina en s, permitimos tolerancia opcional de plural en la última palabra
          if (isLast && !w.toLowerCase().endsWith('s')) {
            return `${agnostic}(?:s|es)?`;
          }
          return agnostic;
        })
        .join('(?:\\s*<(?!/?mark\\b)[^>]+>\\s*|\\s+)+');

      const regex = new RegExp(
        `(?<![\\p{L}\\p{N}])(?:${wordsPattern})(?![\\p{L}\\p{N}])`,
        'gui'
      );

      if (regex.test(inputStr)) {
        return inputStr.replace(regex, (_match, offset) => {
          const inside = isInsideMark(inputStr, offset);
          if (inside) {
            return cleanNew;
          } else {
            return `<mark>${cleanNew}</mark>`;
          }
        });
      }
    }
    return null;
  }

  // Fase 1: Intentar con variantes completas
  let result = tryReplaceWithVariants(allVariants, text);

  // Fase 2: Fallback difuso con palabra sustantiva (si Fase 1 no encontró coincidencia)
  if (!result && fallbackVariants.length > 0) {
    result = tryReplaceWithVariants(fallbackVariants, text);
  }

  if (!result) {
    return text;
  }

    // Limpieza de seguridad contra etiquetas <mark> duplicadas y ajuste de concordancia de artículo en español
    let cleaned = result
      .replace(/<mark>\s*<mark>/gi, '<mark>')
      .replace(/<\/mark>\s*<\/mark>/gi, '</mark>');

    const isNewFem = isFeminineCulinaryNoun(cleanNew);
    const escapedNew = cleanNew.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (isNewFem) {
      cleaned = cleaned
        .replace(new RegExp(`\\b(el)\\s+(<mark>${escapedNew}<\\/mark>)`, 'gi'), (_m, art, target) =>
          (art === 'El' ? 'La ' : 'la ') + target
        )
        .replace(new RegExp(`\\b(un)\\s+(<mark>${escapedNew}<\\/mark>)`, 'gi'), (_m, art, target) =>
          (art === 'Un' ? 'Una ' : 'una ') + target
        );
    } else {
      cleaned = cleaned
        .replace(new RegExp(`\\b(la)\\s+(<mark>${escapedNew}<\\/mark>)`, 'gi'), (_m, art, target) =>
          (art === 'La' ? 'El ' : 'el ') + target
        )
        .replace(new RegExp(`\\b(una)\\s+(<mark>${escapedNew}<\\/mark>)`, 'gi'), (_m, art, target) =>
          (art === 'Una' ? 'Un ' : 'un ') + target
        );
    }

    return cleaned;
  } catch {
    return text || '';
  }
}

/**
 * Reemplaza un ingrediente en el texto de un paso ajustando además la cantidad y unidad
 * cuando la sustitución cambia la densidad o medida (ej. "30 g de jengibre" -> "1 cucharadita de ralladura de limón").
 */
export function replaceIngredientAndAmountInText(
  text?: string | null,
  oldName?: string | null,
  newName?: string | null,
  options?: {
    oldAmount?: number;
    oldUnit?: string | null;
    newAmount?: number;
    newUnit?: string | null;
    lang?: 'es' | 'en';
    isBaking?: boolean;
  }
): string {
  if (!text) return '';
  if (!oldName || !newName) return text;

  const cleanOld = String(oldName).replace(/<\/?[^>]+(>|$)/g, '').trim();
  const cleanNew = String(newName).replace(/<\/?[^>]+(>|$)/g, '').trim();
  if (!cleanOld || !cleanNew || cleanOld.toLowerCase() === cleanNew.toLowerCase()) {
    return text;
  }

  let working = text;
  const lang = options?.lang || 'es';
  const hasNewMeasure =
    typeof options?.newAmount === 'number' &&
    options.newAmount > 0 &&
    Boolean(options?.newUnit);

  const unitChanged =
    hasNewMeasure &&
    ((options?.oldUnit || '').trim().toLowerCase() !== (options?.newUnit || '').trim().toLowerCase() ||
      (typeof options?.oldAmount === 'number' &&
        Math.abs((options.oldAmount || 0) - (options.newAmount || 0)) > 0.05));

  if (hasNewMeasure && unitChanged) {
    try {
      const formattedNew = formatCulinaryAmount(
        options!.newAmount!,
        options!.newUnit!,
        lang,
        cleanNew,
        Boolean(options?.isBaking)
      );
      const isPureNum =
        /^\d+(?:[.,]\d+)?$/.test(formattedNew) ||
        /^\d+\s+[½¼¾⅓⅔⅛]$/.test(formattedNew) ||
        /^[½¼¾⅓⅔⅛]$/.test(formattedNew) ||
        /^(media|medio|half)$/i.test(formattedNew);
      const connector = isPureNum ? ' ' : lang === 'en' ? ' of ' : ' de ';

      const oldAgnostic = toAccentAgnosticRegex(cleanOld);
      const amountUnitOldRegex = new RegExp(
        `(?:\\b(?:los|las|el|la|unos|unas|the|a|an)\\s+)?` +
        `(?:\\d+(?:[.,]\\d+)?|[½¼¾⅓⅔⅛]|\\d+\\/\\d+)\\s*` +
        `(?:g|gr|grs|gramos?|grams?|kg|kilos?|ml|mls|mililitros?|l|litros?|cucharadas?|cucharaditas?|tbsp|tsp|tazas?|cups?|unidades?|units?|dientes?|cloves?|piezas?|pieces?)\\s+` +
        `(?:(?:de|of)\\s+)?(?:<mark>)?${oldAgnostic}(?:<\\/mark>)?`,
        'gui'
      );

      working = working.replace(
        amountUnitOldRegex,
        `<mark>${formattedNew}${connector}${cleanNew}</mark>`
      );
    } catch {}
  }

  return replaceIngredientInText(working, cleanOld, cleanNew);
}
