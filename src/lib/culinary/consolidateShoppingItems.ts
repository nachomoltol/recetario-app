import { classifyIngredientAisle } from './aisles';
import { isCanonicalSpiceHerbSaltOrPepper } from '@/lib/gemini/schema';

export interface ScaledShoppingInputItem {
  id?: string;
  receta_id?: string;
  nombre_limpio?: string | null;
  nombre_crudo?: string | null;
  cantidad?: number | string | null;
  cantidad_escalada?: number | string | null;
  unidad?: string | null;
  gramos_calculados?: number | null;
  gramos_escalados?: number | null;
  pasillo_supermercado?: string | null;
  notas?: string | null;
  seccion?: string | null;
  explicacion_culinaria?: string | null;
  recetaTitulo?: string | null;
}

export interface ConsolidatedShoppingBreakdown {
  seccion?: string | null;
  recetaTitulo?: string;
  cantidad: number;
  unidad: string;
}

export interface ConsolidatedShoppingItem {
  key: string;
  sourceIds: string[];
  nombre: string;
  cantidadTotal: number;
  unidad: string;
  gramosTotal: number;
  pasillo_supermercado: string;
  recetasNombres: string[];
  notas: string[];
  desglose: ConsolidatedShoppingBreakdown[];
  explicaciones: string[];
}

export interface CanonicalIngredient {
  key: string;
  displayName: string;
}

/**
 * Lematizador de palabras individuales en español (singularización).
 */
export function lemmatizeSpanishWord(word: string): string {
  const w = word.trim().toLowerCase();
  if (w.length <= 3) return w;

  // Plurales en -ces (nueces -> nuez)
  if (w.endsWith('ces') && w.length > 4) {
    return w.slice(0, -3) + 'z';
  }

  // Plurales en -es con raíz en consonante [lrnd] (limones -> limon, champiñones -> champinon)
  if (w.endsWith('es') && w.length > 4) {
    const root = w.slice(0, -2);
    if (/[lrnd]$/.test(root)) {
      return root;
    }
  }

  // Plurales regulares que terminan en 's' precedida de vocal
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) {
    const beforeS = w.slice(0, -1);
    if (/[aeiou]$/.test(beforeS)) {
      return beforeS;
    }
  }

  return w;
}

/**
 * Tabla estática de equivalencias peso promedio por pieza en gramos para alimentos frescos comunes
 */
export const FRESH_PIECE_WEIGHT_G: Record<string, number> = {
  // Frutas y cítricos
  limon: 100,
  lima: 60,
  naranja: 180,
  manzana: 170,
  pera: 160,
  platano: 120,
  aguacate: 180,

  // Hortalizas y verduras
  cebolla: 150,
  cebolla_morada: 150,
  cebolleta: 60,
  diente_ajo: 5,
  patata: 180,
  boniato: 250,
  zanahoria: 90,
  tomate: 140,
  pimiento: 160,
  pimiento_verde: 140,
  pimiento_rojo: 200,
  calabacin: 250,
  berenjena: 280,
  pepino: 200,
  champinon: 20,

  // Huevos
  huevo: 55,

  // Tomate seco (peso unitario deshidratado aprox 8 g por pieza)
  'tomate seco': 8,
};

export const PREFER_GRAMS_INGREDIENTS = new Set([
  'tomate seco',
  'champinon',
]);

/**
 * Clasificación canónica de especias y condimentos mediante el extractor semántico universal.
 * Evalúa exclusivamente el núcleo rector culinario, evitando falsos positivos como 'mantequilla sin sal'.
 */
export function isPantrySpice(keyOrName: string): boolean {
  if (!keyOrName) return false;
  return isCanonicalSpiceHerbSaltOrPepper(keyOrName, keyOrName);
}

/**
 * Normalización canónica de ingredientes culinarios para la lista de la compra:
 * - Sanea cantidades y formatos embebidos en el nombre.
 * - Elimina cláusulas privativas/calificativas ("sin sal", "con sal") y estados físicos ("en dados", "pomada").
 * - Lematiza singular/plural culinario y aplica sinónimos consolidados.
 */
export function normalizeIngredientKey(rawName: string): CanonicalIngredient {
  if (!rawName) return { key: '', displayName: '' };

  let cleanedOriginal = rawName.trim();

  // Fase A - Sanitización de Entrada:
  // Erradicar cantidades y unidades incrustadas en el nombre del ingrediente
  cleanedOriginal = cleanedOriginal
    .replace(/^(\d+[\d.,/]*\s*(g|gr|grs|gramo|gramos|kg|kgs|kilo|kilos|ml|mls|l|lt|lts|litro|litros|cda|cdas|cdta|cdtas|cucharada|cucharadas|cucharadita|cucharaditas|diente|dientes|unidad|unidades|ud|uds|pieza|piezas|pizca|pizcas|punado|puñado|punados|puñados)?\s*(de\s+)?)/i, '')
    .replace(/^(un|una|unos|unas)\s+(de\s+)?/i, '')
    .trim();

  // Disolución de ingredientes compuestos con sal
  cleanedOriginal = cleanedOriginal
    .replace(/^sal(\s+(fina|marina|de mesa|comun))?\s+(y|con)\s+/i, '')
    .replace(/\s+(y|con)\s+sal(\s+(fina|marina|de mesa|comun))?$/i, '')
    .trim();

  // Limpieza de paréntesis con notas o estados como (pomada), (a temperatura ambiente), (en dados)
  cleanedOriginal = cleanedOriginal
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/\s+(o|u)\s+.*$/i, '')
    .replace(/\b(al gusto|opcional|para decorar|para servir|para acompanar)\b/gi, '')
    .trim();

  // Fase B - Eliminación de modificadores de estado, temperatura y corte para unificación de identidad
  cleanedOriginal = cleanedOriginal
    .replace(/\b(sin|con)\s+(sal|azucar|gluten|lactosa)\b/gi, '')
    .replace(/\b(en\s+dados|en\s+cubos|en\s+trozos|en\s+tiras|en\s+rodajas|en\s+pomada|punto\s+pomada|pomada|a\s+temperatura\s+ambiente|fundid[oa]s?|derretid[oa]s?|ablandad[oa]s?)\b/gi, '')
    .trim();

  // Normalizar tildes, mayúsculas y caracteres diacríticos
  let norm = cleanedOriginal
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // Limpiar caracteres especiales de puntuación
  norm = norm.replace(/[.,;:"'()\[\]{}*!¡?¿/\\-]/g, ' ').replace(/\s+/g, ' ').trim();

  // Erradicar calibres o clases secundarias en huevos y básicos
  norm = norm
    .replace(/\b(tamano|talla|calibre|clase)\s+(xl|l|m|s)\b/gi, '')
    .replace(/\b(xl|l|m|s)\b/gi, '')
    .replace(/\b(frescos?|grandes?|medianos?|pequenos?|camperos?|ecologicos?|blancos?|morenos?)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Fase C - Lematización Adjetival y Compuesta
  const PREPOSITIONS = new Set(['de', 'del', 'al', 'con', 'en']);
  const words = norm.split(' ');
  let wasCompoundLemmatized = false;

  if (words.length >= 2 && words.some((w, idx) => idx > 0 && PREPOSITIONS.has(w))) {
    const head = words[0];
    const singularHead = lemmatizeSpanishWord(head);
    if (singularHead !== head) {
      words[0] = singularHead;
      norm = words.join(' ');
      wasCompoundLemmatized = true;
    }
  } else if (words.length >= 2 && !words.some((w) => PREPOSITIONS.has(w))) {
    const lemmatizedWords = words.map((w) => lemmatizeSpanishWord(w));
    const lemmatizedPhrase = lemmatizedWords.join(' ');
    if (lemmatizedPhrase !== norm) {
      norm = lemmatizedPhrase;
      wasCompoundLemmatized = true;
    }
  }

  // Diccionario de variantes ortográficas y sinónimos directos
  const SYNONYMS: Record<string, { key: string; displayName: string }> = {
    // Mantequilla y lácteos base
    'mantequilla': { key: 'mantequilla', displayName: 'Mantequilla' },
    'mantequillas': { key: 'mantequilla', displayName: 'Mantequilla' },
    'mantequilla con sal': { key: 'mantequilla', displayName: 'Mantequilla' },
    'mantequilla sin sal': { key: 'mantequilla', displayName: 'Mantequilla' },
    'mantequilla pomada': { key: 'mantequilla', displayName: 'Mantequilla' },

    'azucar glass': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar glas': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar impalpable': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar flor': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar lustre': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar en polvo': { key: 'azucar glas', displayName: 'Azúcar glas' },
    'azucar pulverizada': { key: 'azucar glas', displayName: 'Azúcar glas' },

    'azucar': { key: 'azucar', displayName: 'Azúcar' },
    'azucar blanco': { key: 'azucar', displayName: 'Azúcar' },
    'azucar blanca': { key: 'azucar', displayName: 'Azúcar' },
    'azucar comun': { key: 'azucar', displayName: 'Azúcar' },

    'aove': { key: 'aceite de oliva virgen extra', displayName: 'Aceite de oliva virgen extra' },
    'aceite de oliva virgen extra': { key: 'aceite de oliva virgen extra', displayName: 'Aceite de oliva virgen extra' },
    'aceite de oliva': { key: 'aceite de oliva virgen extra', displayName: 'Aceite de oliva virgen extra' },
    'aceite oliva': { key: 'aceite de oliva virgen extra', displayName: 'Aceite de oliva virgen extra' },
    'aceite oliva virgen extra': { key: 'aceite de oliva virgen extra', displayName: 'Aceite de oliva virgen extra' },

    'harina de trigo': { key: 'harina de trigo', displayName: 'Harina de trigo' },
    'harina': { key: 'harina de trigo', displayName: 'Harina de trigo' },
    'harina trigo': { key: 'harina de trigo', displayName: 'Harina de trigo' },
    'harina comun': { key: 'harina de trigo', displayName: 'Harina de trigo' },
    'harina todo uso': { key: 'harina de trigo', displayName: 'Harina de trigo' },
    'harina 000': { key: 'harina de trigo', displayName: 'Harina de trigo' },
    'harina 0000': { key: 'harina de trigo', displayName: 'Harina de trigo' },

    'sal fina': { key: 'sal', displayName: 'Sal fina' },
    'sal marina': { key: 'sal', displayName: 'Sal marina' },
    'sal de mesa': { key: 'sal', displayName: 'Sal de mesa' },
    'sal comun': { key: 'sal', displayName: 'Sal' },
    'sal': { key: 'sal', displayName: 'Sal' },

    'pimienta negra molida': { key: 'pimienta negra', displayName: 'Pimienta negra' },
    'pimienta molida': { key: 'pimienta negra', displayName: 'Pimienta negra' },
    'pimienta negra': { key: 'pimienta negra', displayName: 'Pimienta negra' },
    'pimienta': { key: 'pimienta negra', displayName: 'Pimienta negra' },

    'zumo de limon': { key: 'limon', displayName: 'Limón' },
    'zumo limon': { key: 'limon', displayName: 'Limón' },
    'jugo de limon': { key: 'limon', displayName: 'Limón' },
    'jugo limon': { key: 'limon', displayName: 'Limón' },
    'zumo de lima': { key: 'lima', displayName: 'Lima' },
    'zumo lima': { key: 'lima', displayName: 'Lima' },
    'jugo de lima': { key: 'lima', displayName: 'Lima' },
    'jugo lima': { key: 'lima', displayName: 'Lima' },

    'yogur': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogures': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogur natural': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogures naturales': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogur griego': { key: 'yogur natural', displayName: 'Yogur natural' },
    'yogures griegos': { key: 'yogur natural', displayName: 'Yogur natural' },

    'tomate seco': { key: 'tomate seco', displayName: 'Tomate seco' },
    'tomates secos': { key: 'tomate seco', displayName: 'Tomate seco' },
    'tomates seco': { key: 'tomate seco', displayName: 'Tomate seco' },
    'tomate deshidratado': { key: 'tomate seco', displayName: 'Tomate seco' },
    'tomates deshidratados': { key: 'tomate seco', displayName: 'Tomate seco' },

    'cebolla': { key: 'cebolla', displayName: 'Cebolla' },
    'cebollas': { key: 'cebolla', displayName: 'Cebolla' },
    'diente de ajo': { key: 'diente de ajo', displayName: 'Diente de ajo' },
    'dientes de ajo': { key: 'diente de ajo', displayName: 'Diente de ajo' },
    'ajo': { key: 'diente de ajo', displayName: 'Diente de ajo' },
    'ajos': { key: 'diente de ajo', displayName: 'Diente de ajo' },

    'huevo': { key: 'huevo', displayName: 'Huevo' },
    'huevos': { key: 'huevo', displayName: 'Huevo' },
  };

  if (SYNONYMS[norm]) {
    return SYNONYMS[norm];
  }

  const lemmaKey = lemmatizeSpanishWord(norm);

  let displayName = cleanedOriginal.trim();
  if (wasCompoundLemmatized || lemmaKey !== norm) {
    displayName = lemmaKey.charAt(0).toUpperCase() + lemmaKey.slice(1);
  } else {
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  }

  return {
    key: lemmaKey,
    displayName,
  };
}

/**
 * Redondeo y homogeneización estricta para la lista de la compra.
 */
export function roundShoppingListAmount(amount: number, unidad?: string | null): number {
  if (!amount || amount <= 0 || isNaN(amount)) return 0;
  const u = String(unidad || '').toLowerCase().replace(/[.,;:]/g, '').trim();

  // 1. Gramos y mililitros
  if (/^(g|gr|grs|gramo|gramos|gram|grams|ml|mls|mililitro|mililitros|milliliter|milliliters)$/i.test(u)) {
    if (amount <= 20) return Math.max(1, Math.round(amount));
    const mult5 = Math.round(amount / 5) * 5;
    return mult5 === 0 ? Math.round(amount) : mult5;
  }

  // 2. Kilos y litros
  if (/^(kg|kgs|kilo|kilos|kilogramo|kilogramos|kilogram|kilograms|l|lt|lts|litro|litros|liter|liters)$/i.test(u)) {
    if (Number.isInteger(amount)) return amount;
    return Math.round(amount * 10) / 10;
  }

  // 3. Piezas y unidades contables
  if (
    /^(unidad|unidades|unit|units|pieza|piezas|piece|pieces|huevo|huevos|egg|eggs|diente|dientes|clove|cloves|bote|botes|lata|latas|can|cans|paquete|paquetes|package|packages|jar|jars|sobre|sobres|ud|uds)$/i.test(
      u
    )
  ) {
    return Math.max(1, Math.ceil(amount));
  }

  // 4. Medidas de cuchara / taza
  if (/^(cucharada|cucharadas|cucharadita|cucharaditas|tbsp|tsp|taza|tazas|cup|cups|vaso|vasos)$/i.test(u)) {
    if (amount < 2) {
      const quarter = Math.round(amount * 4) / 4;
      return quarter <= 0 ? 0.25 : quarter;
    }
    return Math.round(amount * 2) / 2;
  }

  return Math.max(1, Math.ceil(amount));
}

/**
 * Normaliza la unidad singular o plural según la cantidad final consolidada.
 */
export function formatShoppingUnitPlural(unidad: string, cantidad: number): string {
  const u = (unidad || 'unidad').trim().toLowerCase();
  if (u === 'unidad' || u === 'unidades' || u === 'ud' || u === 'uds' || u === 'u') {
    return cantidad > 1 ? 'unidades' : 'unidad';
  }
  if (u === 'unit' || u === 'units') {
    return cantidad > 1 ? 'units' : 'unit';
  }
  if (u === 'pieza' || u === 'piezas') {
    return cantidad > 1 ? 'piezas' : 'pieza';
  }
  if (u === 'diente' || u === 'dientes') {
    return cantidad > 1 ? 'dientes' : 'diente';
  }
  if (u === 'lata' || u === 'latas') {
    return cantidad > 1 ? 'latas' : 'lata';
  }
  if (u === 'bote' || u === 'botes') {
    return cantidad > 1 ? 'botes' : 'bote';
  }
  if (u === 'paquete' || u === 'paquetes') {
    return cantidad > 1 ? 'paquetes' : 'paquete';
  }
  if (u === 'cucharada' || u === 'cucharadas') {
    return cantidad > 1 ? 'cucharadas' : 'cucharada';
  }
  if (u === 'cucharadita' || u === 'cucharaditas') {
    return cantidad > 1 ? 'cucharaditas' : 'cucharadita';
  }
  if (u === 'taza' || u === 'tazas') {
    return cantidad > 1 ? 'tazas' : 'taza';
  }
  return u;
}

export interface ConsolidateShoppingOptions {
  defaultRecipeTitle?: string;
}

/**
 * Función Pura de Consolidación Canónica de Ingredientes (Single Source of Truth).
 * Agrupa y suma ingredientes idénticos con unidades compatibles, preservando sourceIds,
 * desglose de fases/secciones y notas.
 */
export function consolidateShoppingItems(
  items: ScaledShoppingInputItem[],
  options?: ConsolidateShoppingOptions
): ConsolidatedShoppingItem[] {
  interface ConsolidatedAcc {
    key: string;
    sourceIds: string[];
    nombre: string;
    rawCantidad: number;
    rawGramos: number;
    unidad: string;
    pasillo_supermercado: string;
    recetasNombres: string[];
    notas: string[];
    desglose: ConsolidatedShoppingBreakdown[];
    explicaciones: string[];
  }

  const consolidated = new Map<string, ConsolidatedAcc>();
  const defaultTitle = options?.defaultRecipeTitle || 'Receta';

  for (const item of items || []) {
    const rawName = (item.nombre_limpio || item.nombre_crudo || '').trim();
    if (!rawName) continue;

    const canon = normalizeIngredientKey(rawName);
    if (!canon.key) continue;

    const uRaw = (item.unidad || 'unidad').trim().toLowerCase();

    // Normalizar unidad base para la clave de agregación
    let canonicalUnitKey = uRaw;
    let unitConversionFactor = 1;

    if (/^(unidad|unidades|unit|units|pieza|piezas|piece|pieces|huevo|huevos|ud|uds|u)$/i.test(uRaw)) {
      canonicalUnitKey = 'unidad';
    } else if (/^(diente|dientes|clove|cloves)$/i.test(uRaw)) {
      canonicalUnitKey = 'diente';
    } else if (/^(bote|botes)$/i.test(uRaw)) {
      canonicalUnitKey = 'bote';
    } else if (/^(lata|latas)$/i.test(uRaw)) {
      canonicalUnitKey = 'lata';
    } else if (/^(paquete|paquetes)$/i.test(uRaw)) {
      canonicalUnitKey = 'paquete';
    } else if (/^(cucharada|cucharadas|tbsp)$/i.test(uRaw)) {
      canonicalUnitKey = 'cucharada';
    } else if (/^(cucharadita|cucharaditas|tsp)$/i.test(uRaw)) {
      canonicalUnitKey = 'cucharadita';
    } else if (/^(taza|tazas|cup|cups)$/i.test(uRaw)) {
      canonicalUnitKey = 'taza';
    } else if (/^(gramo|gramos|gr|grs|g)$/i.test(uRaw)) {
      canonicalUnitKey = 'g';
    } else if (/^(mililitro|mililitros|ml|mls)$/i.test(uRaw)) {
      canonicalUnitKey = 'ml';
    } else if (/^(kilo|kilos|kilogramo|kilogramos|kg|kgs)$/i.test(uRaw)) {
      canonicalUnitKey = 'g';
      unitConversionFactor = 1000;
    } else if (/^(litro|litros|l|lt|lts)$/i.test(uRaw)) {
      canonicalUnitKey = 'ml';
      unitConversionFactor = 1000;
    }

    const rawAmount =
      Number(item.cantidad_escalada !== undefined ? item.cantidad_escalada : item.cantidad) || 0;
    let cant = rawAmount * unitConversionFactor;
    let gramos =
      Number(item.gramos_escalados !== undefined ? item.gramos_escalados : item.gramos_calculados) || 0;

    // 1. Especias y condimentos: marcar como despensa
    if (isPantrySpice(canon.key) || /^(al\s+gusto|a\s+gusto|to\s+taste|c\/n|c\.n\.|cn)$/i.test(uRaw)) {
      canonicalUnitKey = 'despensa';
      cant = 0;
      gramos = 0;
    }
    // 2. Aceite de oliva
    else if (canon.key === 'aceite de oliva virgen extra') {
      canonicalUnitKey = 'botella';
      cant = 1;
      gramos = 0;
    }
    // 3. Ajos
    else if (canon.key === 'diente de ajo') {
      if (canonicalUnitKey === 'unidad' || canonicalUnitKey === 'diente') {
        canonicalUnitKey = 'diente';
      } else if (canonicalUnitKey === 'g') {
        cant = cant / 5;
        canonicalUnitKey = 'diente';
      }
    }
    // 4. Huevos
    else if (canon.key === 'huevo') {
      canonicalUnitKey = 'unidad';
    }
    // 5. Cítricos
    else if (canon.key === 'limon' || canon.key === 'lima') {
      if (canonicalUnitKey === 'ml') {
        cant = cant / 35;
        canonicalUnitKey = 'unidad';
      } else if (canonicalUnitKey === 'g') {
        const pieceWeight = FRESH_PIECE_WEIGHT_G[canon.key] || 100;
        cant = cant / pieceWeight;
        canonicalUnitKey = 'unidad';
      }
    }
    // 6. Yogures
    else if (canon.key === 'yogur natural') {
      if (canonicalUnitKey === 'unidad' || canonicalUnitKey === 'bote' || canonicalUnitKey === 'paquete') {
        cant = cant * 125;
        canonicalUnitKey = 'g';
      }
      if (gramos === 0) {
        gramos = cant;
      }
    }
    // 7. Puente de conversión peso/pieza
    else {
      const pieceWeightG = FRESH_PIECE_WEIGHT_G[canon.key];
      if (pieceWeightG) {
        if (PREFER_GRAMS_INGREDIENTS.has(canon.key)) {
          if (canonicalUnitKey === 'unidad') {
            cant = cant * pieceWeightG;
            canonicalUnitKey = 'g';
          }
          if (gramos === 0) {
            gramos = cant;
          }
        } else {
          if (canonicalUnitKey === 'g') {
            cant = cant / pieceWeightG;
            canonicalUnitKey = 'unidad';
          } else if (canonicalUnitKey === 'unidad') {
            if (gramos === 0) {
              gramos = cant * pieceWeightG;
            }
          }
        }
      }
    }

    const key = `${canon.key}___${canonicalUnitKey}`;
    const pasillo = classifyIngredientAisle(canon.displayName, item.pasillo_supermercado);
    const recetaNombre = item.recetaTitulo || defaultTitle;

    const breakdownItem: ConsolidatedShoppingBreakdown = {
      seccion: item.seccion || null,
      recetaTitulo: recetaNombre,
      cantidad: rawAmount,
      unidad: item.unidad || '',
    };

    if (consolidated.has(key)) {
      const existing = consolidated.get(key)!;
      existing.rawCantidad += cant;
      existing.rawGramos += gramos;
      if (item.id && !existing.sourceIds.includes(item.id)) {
        existing.sourceIds.push(item.id);
      }
      if (!existing.recetasNombres.includes(recetaNombre)) {
        existing.recetasNombres.push(recetaNombre);
      }
      if (item.notas && !existing.notas.includes(item.notas)) {
        existing.notas.push(item.notas);
      }
      if (item.explicacion_culinaria && !existing.explicaciones.includes(item.explicacion_culinaria)) {
        existing.explicaciones.push(item.explicacion_culinaria);
      }
      existing.desglose.push(breakdownItem);
    } else {
      consolidated.set(key, {
        key,
        sourceIds: item.id ? [item.id] : [],
        nombre: canon.displayName,
        rawCantidad: cant,
        rawGramos: gramos,
        unidad: canonicalUnitKey,
        pasillo_supermercado: pasillo,
        recetasNombres: [recetaNombre],
        notas: item.notas ? [item.notas] : [],
        desglose: [breakdownItem],
        explicaciones: item.explicacion_culinaria ? [item.explicacion_culinaria] : [],
      });
    }
  }

  // Transformación final con redondeo comercial
  const result: ConsolidatedShoppingItem[] = [];
  for (const acc of consolidated.values()) {
    if (acc.unidad === 'despensa') {
      const cleanSpiceName = acc.nombre
        .replace(/^(\d+[\d.,/]*\s*(g|gr|grs|gramo|gramos|kg|kgs|ml|mls|l|cda|cdas|cdta|cdtas|cucharada|cucharadas|cucharadita|cucharaditas|diente|unidad|ud)?\s*(de\s+)?)/i, '')
        .trim();
      const finalSpiceName = cleanSpiceName
        ? cleanSpiceName.charAt(0).toUpperCase() + cleanSpiceName.slice(1)
        : acc.nombre;

      result.push({
        key: acc.key,
        sourceIds: acc.sourceIds,
        nombre: finalSpiceName,
        cantidadTotal: 0,
        unidad: 'Comprobar despensa',
        gramosTotal: 0,
        pasillo_supermercado: acc.pasillo_supermercado,
        recetasNombres: acc.recetasNombres,
        notas: acc.notas,
        desglose: acc.desglose,
        explicaciones: acc.explicaciones,
      });
      continue;
    }

    if (acc.unidad === 'botella') {
      result.push({
        key: acc.key,
        sourceIds: acc.sourceIds,
        nombre: acc.nombre,
        cantidadTotal: 1,
        unidad: 'botella (o revisar despensa)',
        gramosTotal: 0,
        pasillo_supermercado: acc.pasillo_supermercado,
        recetasNombres: acc.recetasNombres,
        notas: acc.notas,
        desglose: acc.desglose,
        explicaciones: acc.explicaciones,
      });
      continue;
    }

    let finalUnit = acc.unidad;
    let finalAmount = acc.rawCantidad;

    if (acc.unidad === 'g' && finalAmount >= 1000) {
      const inKg = Math.round((finalAmount / 1000) * 10) / 10;
      if (Number.isInteger(inKg) || (inKg * 10) % 5 === 0) {
        finalAmount = inKg;
        finalUnit = 'kg';
      }
    } else if (acc.unidad === 'ml' && finalAmount >= 1000) {
      const inL = Math.round((finalAmount / 1000) * 10) / 10;
      if (Number.isInteger(inL) || (inL * 10) % 5 === 0) {
        finalAmount = inL;
        finalUnit = 'l';
      }
    }

    const roundedCantidad = roundShoppingListAmount(finalAmount, finalUnit);
    const formattedUnidad = formatShoppingUnitPlural(finalUnit, roundedCantidad);
    const roundedGramos =
      acc.rawGramos <= 20
        ? Math.round(acc.rawGramos)
        : Math.round(acc.rawGramos / 5) * 5;

    result.push({
      key: acc.key,
      sourceIds: acc.sourceIds,
      nombre: acc.nombre,
      cantidadTotal: roundedCantidad,
      unidad: formattedUnidad,
      gramosTotal: roundedGramos,
      pasillo_supermercado: acc.pasillo_supermercado,
      recetasNombres: acc.recetasNombres,
      notas: acc.notas,
      desglose: acc.desglose,
      explicaciones: acc.explicaciones,
    });
  }

  return result.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

