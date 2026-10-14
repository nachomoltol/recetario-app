/**
 * Reemplaza de forma inteligente y reactiva el nombre de un ingrediente en el texto de preparación o pasos.
 * Envuelve el nuevo ingrediente en <mark> para que FormattedText lo resalte automáticamente con estilo terracota/ámbar.
 */
export function replaceIngredientInText(text: string, oldName: string, newName: string): string {
  if (!text || !oldName || !newName) return text;

  // Limpiar etiquetas <mark> existentes para evitar expresiones regulares corruptas
  const cleanOldName = oldName.replace(/<\/?mark>/gi, '').trim();
  const cleanNewName = newName.replace(/<\/?mark>/gi, '').trim();

  if (!cleanOldName || cleanOldName.toLowerCase() === cleanNewName.toLowerCase()) {
    return text;
  }

  // Generar variantes del nombre original (nombre completo, sin adjetivos secundarios comunes, singular/plural)
  const variants = [cleanOldName];
  const simplified = cleanOldName
    .replace(
      /\b(virgen extra|fresco|fresca|frescos|frescas|seco|seca|secos|secas|crudo|cruda|molido|molida|troceado|troceada|entero|entera|triturado|triturada|en polvo|de cocina)\b/gi,
      ''
    )
    .trim();

  if (simplified && simplified.length > 2 && simplified.toLowerCase() !== cleanOldName.toLowerCase()) {
    variants.push(simplified);
  }

  const extendedVariants: string[] = [];
  for (const v of variants) {
    extendedVariants.push(v);
    if (v.toLowerCase().endsWith('s') && v.length > 3) {
      extendedVariants.push(v.slice(0, -1));
    } else if (!v.toLowerCase().endsWith('s')) {
      extendedVariants.push(v + 's');
    }
  }

  // Ordenar de mayor a menor longitud para priorizar frases más específicas antes que palabras sueltas
  const sortedVariants = Array.from(new Set(extendedVariants)).sort((a, b) => b.length - a.length);

  let result = text;
  for (const variant of sortedVariants) {
    const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Coincidencia insensible a mayúsculas/minúsculas respetando límites de palabra (\b)
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, `<mark>${cleanNewName}</mark>`);
      break;
    }
  }

  return result;
}
