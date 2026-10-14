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
 * Reemplaza de forma inteligente y reactiva el nombre de un ingrediente en el texto de preparación o pasos.
 * Es agnóstica a etiquetas HTML (<mark> existentes):
 * - Localiza el ingrediente aunque esté envuelto o precedido por etiquetas HTML.
 * - Si el ingrediente ya estaba dentro de un <mark>, actualiza el texto sin anidar etiquetas.
 * - Si estaba en texto plano, lo envuelve en <mark>...</mark> para resaltar el cambio visualmente.
 * - Soporta caracteres acentuados en español (ñ, á, é, í, ó, ú) con límites de palabra Unicode.
 */
export function replaceIngredientInText(text: string, oldName: string, newName: string): string {
  if (!text || !oldName || !newName) return text;

  // Limpiar cualquier etiqueta HTML de los nombres para comparar texto puro
  const cleanOld = oldName.replace(/<\/?[^>]+(>|$)/g, '').trim();
  const cleanNew = newName.replace(/<\/?[^>]+(>|$)/g, '').trim();

  if (!cleanOld || cleanOld.toLowerCase() === cleanNew.toLowerCase()) {
    return text;
  }

  // Generar variantes del nombre original
  const baseVariants = [cleanOld];

  // Equivalencias culinarias comunes (ej: leche <-> bebida vegetal)
  if (/\bleche\b/i.test(cleanOld)) {
    baseVariants.push(cleanOld.replace(/\bleche\b/gi, 'bebida'));
  } else if (/\bbebida\b/i.test(cleanOld)) {
    baseVariants.push(cleanOld.replace(/\bbebida\b/gi, 'leche'));
  }

  // Remover aclaraciones entre paréntesis (ej: "yogur (griego o natural)" -> "yogur")
  const withoutParens = cleanOld.replace(/\s*\([^)]*\)/g, '').trim();
  if (withoutParens && withoutParens.length > 2 && withoutParens.toLowerCase() !== cleanOld.toLowerCase()) {
    baseVariants.push(withoutParens);
  }

  // Remover artículos iniciales si los hay (ej: "la leche de coco" -> "leche de coco")
  const withoutArticle = cleanOld.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '').trim();
  if (withoutArticle && withoutArticle.length > 2 && withoutArticle.toLowerCase() !== cleanOld.toLowerCase()) {
    baseVariants.push(withoutArticle);
  }

  // Simplificar retirando adjetivos secundarios culinarios
  const simplified = cleanOld
    .replace(
      /\b(virgen extra|fresco|fresca|frescos|frescas|seco|seca|secos|secas|crudo|cruda|molido|molida|troceado|troceada|entero|entera|triturado|triturada|en polvo|de cocina|ecológico|ecológica|vegetal)\b/gi,
      ''
    )
    .trim();

  if (simplified && simplified.length > 2 && simplified.toLowerCase() !== cleanOld.toLowerCase()) {
    baseVariants.push(simplified);
  }

  // Variantes de singular y plural
  const allVariants: string[] = [];
  for (const v of baseVariants) {
    allVariants.push(v);
    if (v.toLowerCase().endsWith('s') && v.length > 3) {
      allVariants.push(v.slice(0, -1));
    } else if (!v.toLowerCase().endsWith('s')) {
      allVariants.push(v + 's');
    }
  }

  // Ordenar de mayor a menor longitud para priorizar frases más específicas antes que palabras sueltas
  const sortedVariants = Array.from(new Set(allVariants)).sort((a, b) => b.length - a.length);

  let result = text;
  let replaced = false;

  for (const variant of sortedVariants) {
    const words = variant.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    // Permitir etiquetas HTML intermedias que no sean apertura/cierre de mark
    const wordsPattern = words
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('(?:\\s*<(?!/?mark\\b)[^>]+>\\s*|\\s+)+');

    // Regex con límites Unicode que no confunde letras acentuadas ni caracteres adyacentes < >
    const regex = new RegExp(
      `(?<![\\p{L}\\p{N}])(?:${wordsPattern})(?![\\p{L}\\p{N}])`,
      'gui'
    );

    if (regex.test(result)) {
      result = result.replace(regex, (_match, offset) => {
        const inside = isInsideMark(result, offset);
        if (inside) {
          return cleanNew;
        } else {
          return `<mark>${cleanNew}</mark>`;
        }
      });
      replaced = true;
      break;
    }
  }

  // Limpieza final de seguridad para evitar cualquier doble etiqueta adyacente accidental
  if (replaced) {
    result = result
      .replace(/<mark>\s*<mark>/gi, '<mark>')
      .replace(/<\/mark>\s*<\/mark>/gi, '</mark>');
  }

  return result;
}
